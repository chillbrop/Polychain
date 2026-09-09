import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/error";
import { generateReference } from "../utils/helpers";
import {
  applyAutoStatus,
  calculateIpoAmount,
  canSubscribe,
  serializeApplication,
  serializeIpo,
  usdFromNgn,
} from "../utils/ipo";
import { encryptSecret, decryptSecret, maskSecret } from "../utils/crypto";
import { ipoNewApplicationEmail, ipoPaidEmail, notifyAdmins, sendMail } from "../utils/mail";

const router = Router();

async function getNgnUsdRate(): Promise<number> {
  const setting = await prisma.siteSetting.findUnique({ where: { key: "paystackUsdRate" } });
  const rate = setting ? Number(setting.value) : 0;
  if (Number.isFinite(rate) && rate > 0) return rate;
  const envRate = Number(process.env.PAYSTACK_USD_RATE || "0");
  if (Number.isFinite(envRate) && envRate > 0) return envRate;
  throw new Error("The NGN/USD exchange rate is not configured. Ask an administrator to set paystackUsdRate.");
}

async function refreshAndLoad(slug: string, publishedOnly = true) {
  const ipo = await prisma.ipo.findUnique({ where: { slug } });
  if (!ipo || (publishedOnly && !ipo.published)) return null;
  const next = applyAutoStatus(ipo);
  if (next !== ipo.status) {
    const updated = await prisma.ipo.update({ where: { id: ipo.id }, data: { status: next as never } });
    return updated;
  }
  return ipo;
}

router.get("/", async (_req, res) => {
  const [ipos, rawSetting] = await Promise.all([
    prisma.ipo.findMany({ where: { published: true }, orderBy: { openDate: "asc" }, include: { documents: { where: { published: true }, select: { id: true, title: true, type: true } } } }),
    prisma.siteSetting.findUnique({ where: { key: "ipoSandbox" } }),
  ]);
  const refreshed = await Promise.all(
    ipos.map(async (ipo) => {
      const next = applyAutoStatus(ipo);
      if (next !== ipo.status) {
        await prisma.ipo.update({ where: { id: ipo.id }, data: { status: next as never } });
        ipo.status = next as never;
      }
      const demand = await prisma.ipoApplication.aggregate({
        where: { ipoId: ipo.id, status: { in: ["PAID", "UNDER_REVIEW", "SUBMITTED_TO_ISSUER", "ALLOCATED", "PARTIALLY_ALLOCATED", "NOT_ALLOCATED", "REFUND_PENDING", "REFUNDED", "COMPLETED"] } },
        _sum: { shares: true },
      });
      return { ...serializeIpo(ipo), applicationsCount: demand._sum.shares ?? 0 };
    }),
  );
  res.json({ ipos: refreshed, sandboxMode: rawSetting?.value === "true" });
});

router.get("/profile", requireAuth, async (req: AuthRequest, res) => {
  const profile = await prisma.ipoInvestorProfile.findUnique({ where: { userId: req.userId! } });
  if (!profile) return res.json({ profile: null });
  res.json({
    profile: {
      ...profile,
      bvnLast4: profile.bvnCipher ? maskSecret(decryptSecret(profile.bvnCipher)) : null,
      accountLast4: profile.accountCipher ? maskSecret(decryptSecret(profile.accountCipher)) : null,
      bvnCipher: undefined,
      accountCipher: undefined,
      idCipher: undefined,
    },
  });
});

const profileSchema = z.object({
  body: z.object({
    fullName: z.string().min(3),
    dob: z.string().optional(),
    gender: z.string().optional(),
    nationality: z.string().min(2),
    residencyCountry: z.string().min(2),
    city: z.string().optional(),
    address: z.string().optional(),
    bvn: z.string().regex(/^\d{11}$/, "BVN must be exactly 11 digits").optional(),
    bankName: z.string().min(2),
    accountNumber: z.string().regex(/^\d{10}$/, "Account number must be exactly 10 digits").optional(),
    accountName: z.string().min(2).optional(),
    cscsChn: z.string().optional(),
    idType: z.string().optional(),
    idNumber: z.string().min(4).optional(),
    idDocumentUrl: z.string().url("Enter a valid document URL").optional(),
  }),
});

router.post("/profile", requireAuth, validate(profileSchema), async (req: AuthRequest, res) => {
  const { bvn, accountNumber, idNumber, ...rest } = req.body;
  const encrypted: Record<string, string> = {};
  if (bvn) {
    encrypted.bvnCipher = encryptSecret(bvn);
    encrypted.bvnLast4 = bvn.slice(-4);
  }
  if (accountNumber) encrypted.accountCipher = encryptSecret(accountNumber);
  if (idNumber) encrypted.idCipher = encryptSecret(idNumber);

  const profile = await prisma.ipoInvestorProfile.upsert({
    where: { userId: req.userId! },
    update: { ...rest, ...encrypted, status: "PENDING" },
    create: { userId: req.userId!, ...rest, ...encrypted, status: "PENDING" },
  });
  await prisma.$transaction([
    prisma.user.update({ where: { id: req.userId! }, data: { kycStatus: "PENDING" } }),
    prisma.notification.create({ data: { userId: req.userId!, title: "IPO verification submitted", message: "Your investor verification is under review by our compliance team.", type: "info" } }),
  ]);
  res.status(201).json({ profile });
});

router.get("/applications", requireAuth, async (req: AuthRequest, res) => {
  const apps = await prisma.ipoApplication.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "desc" },
    include: { ipo: true, refund: true },
  });
  res.json({ applications: apps.map((a) => ({ ...serializeApplication(a), ipo: serializeIpo(a.ipo), refund: a.refund })) });
});

router.get("/applications/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const app = await prisma.ipoApplication.findFirst({
    where: { id, userId: req.userId! },
    include: { ipo: true, refund: true },
  });
  if (!app) return res.status(404).json({ error: "Application not found" });
  res.json({ application: { ...serializeApplication(app), ipo: serializeIpo(app.ipo), refund: app.refund } });
});

const paySchema = z.object({ body: z.object({}).optional() });

router.post("/subscriptions/:id/pay", requireAuth, validate(paySchema), async (req: AuthRequest, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const app = await prisma.ipoApplication.findFirst({
    where: { id, userId: req.userId! },
    include: { ipo: true, user: true },
  });
  if (!app) return res.status(404).json({ error: "Application not found" });
  if (!["SUBMITTED", "PAYMENT_PENDING"].includes(app.status)) {
    return res.status(409).json({ error: "Application cannot be paid for in its current state" });
  }
  const ipo = await refreshAndLoad(app.ipo.slug);
  if (!ipo || !canSubscribe(ipo.status)) {
    return res.status(409).json({ error: "This offering is no longer open for subscription" });
  }

  const isSandbox = app.ipo.sandbox;
  if (!isSandbox) {
    const user = await prisma.user.findUnique({ where: { id: app.userId } });
    if (!user || user.walletBalance < app.amountUsd) {
      return res.status(400).json({ error: `Insufficient wallet balance. You need $${app.amountUsd.toFixed(2)} to complete this subscription. Please deposit funds first.` });
    }
  }

  const paidResult = await prisma.$transaction(async (tx) => {
    await tx.ipoApplication.update({ where: { id: app.id }, data: { status: "PAYMENT_PENDING" } });
    const transactionRef = generateReference("IPOP");
    await tx.ipoApplication.update({
      where: { id: app.id },
      data: { status: "PAID", paidAt: new Date(), transactionRef, sandbox: isSandbox },
    });
    if (!isSandbox) {
      await tx.user.update({ where: { id: app.userId }, data: { walletBalance: { decrement: app.amountUsd } } });
      await tx.transaction.create({
        data: {
          userId: app.userId,
          type: "IPO_SUBSCRIPTION",
          amount: -app.amountUsd,
          status: "COMPLETED",
          description: `IPO subscription: ${app.shares} shares in ${app.ipo.name}`,
          reference: transactionRef,
          currency: "USDT_TRC20",
          metadata: { ipoId: app.ipoId, applicationId: app.id, shares: app.shares, amountNgn: app.amountNgn },
        },
      });
      await tx.activity.create({ data: { userId: app.userId, action: `Subscribed to ${app.ipo.name} IPO (${app.shares} shares)` } });
    }
    await tx.notification.create({
      data: {
        userId: app.userId,
        title: isSandbox ? "IPO subscription recorded (TEST MODE)" : "IPO subscription paid",
        message: `Your subscription for ${app.shares.toLocaleString()} shares in ${app.ipo.name} ${isSandbox ? "was recorded in test mode" : `was paid ($${app.amountUsd.toFixed(2)})`}.`,
        type: isSandbox ? "info" : "success",
      },
    });
    return transactionRef;
  });

  const { subject, html } = ipoPaidEmail({
    username: app.user.username,
    email: app.user.email,
    ipoName: app.ipo.name,
    shares: app.shares,
    amountUsd: app.amountUsd,
    reference: app.reference,
  });
  sendMail(app.user.email, subject, html).catch(() => undefined);
  notifyAdmins(subject, html).catch((err) => console.error("[mail] IPO paid notification failed", err));
  void paidResult;
  res.json({
    ok: true,
    application: serializeApplication({ ...app, status: "PAID", paidAt: new Date(), transactionRef: paidResult }),
    sandbox: isSandbox,
    message: isSandbox
      ? "TEST MODE: this subscription was recorded without debiting your wallet. Flip sandbox mode off before collecting real payments."
      : `Subscription confirmed. $${app.amountUsd.toFixed(2)} was deducted from your wallet.`,
  });
});

const subscribeSchema = z.object({ body: z.object({ shares: z.number().int().positive() }) });

router.post("/:slug/subscriptions", requireAuth, validate(subscribeSchema), async (req: AuthRequest, res) => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const shares = req.body.shares as number;
  const ipo = await refreshAndLoad(slug);
  if (!ipo) return res.status(404).json({ error: "IPO offering not found" });
  if (!canSubscribe(ipo.status)) return res.status(409).json({ error: "This offering is not open for subscription" });
  const [profile, existing] = await Promise.all([
    prisma.ipoInvestorProfile.findUnique({ where: { userId: req.userId! } }),
    prisma.ipoApplication.findUnique({ where: { userId_ipoId: { userId: req.userId!, ipoId: ipo.id } } }),
  ]);
  if (!profile || profile.status !== "APPROVED") {
    return res.status(403).json({ error: "Your IPO investor verification must be approved before subscribing. Complete your KYC profile." });
  }
  if (existing) return res.status(409).json({ error: "You already have a subscription for this offering" });
  if (shares < ipo.minimumShares) return res.status(400).json({ error: `Minimum subscription is ${ipo.minimumShares} shares` });
  if (ipo.maximumShares && shares > ipo.maximumShares) return res.status(400).json({ error: `Maximum subscription is ${ipo.maximumShares.toLocaleString()} shares per investor` });

  let rate: number;
  let amountUsd: number;
  try {
    rate = await getNgnUsdRate();
    amountUsd = usdFromNgn(calculateIpoAmount(shares, ipo.pricePerShare, ipo.feePct).totalNgn, rate);
  } catch (error) {
    return res.status(503).json({ error: (error as Error).message });
  }
  const pricing = calculateIpoAmount(shares, ipo.pricePerShare, ipo.feePct);

  const app = await prisma.ipoApplication.create({
    data: {
      ipoId: ipo.id,
      userId: req.userId!,
      reference: generateReference("IPO"),
      shares,
      pricePerShare: ipo.pricePerShare,
      amountNgn: pricing.totalNgn,
      feeNgn: pricing.feeNgn,
      exchangeRate: rate,
      amountUsd,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
    include: { ipo: true },
  });

  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  const emailData = { username: user?.username ?? "", email: user?.email ?? "", ipoName: ipo.name, shares, amountNgn: pricing.totalNgn };
  const userEmail = ipoNewApplicationEmail(emailData, false);
  if (user) sendMail(user.email, userEmail.subject, userEmail.html).catch(() => undefined);
  const adminEmail = ipoNewApplicationEmail(emailData, true);
  notifyAdmins(adminEmail.subject, adminEmail.html).catch((err) => console.error("[mail] IPO subscription notification failed", err));

  res.status(201).json({ application: { ...serializeApplication(app), ipo: serializeIpo(app.ipo) }, countdown: "Pay now to complete your subscription." });
});

router.get("/:slug", async (req: AuthRequest, res) => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const ipo = await refreshAndLoad(slug);
  if (!ipo) return res.status(404).json({ error: "IPO offering not found" });
  const [documents, applications, paidDemand, sandboxSetting] = await Promise.all([
    prisma.ipoDocument.findMany({ where: { ipoId: ipo.id, published: true }, orderBy: { createdAt: "desc" } }),
    prisma.ipoApplication.findMany({ where: { ipoId: ipo.id, status: { in: ["PAID", "UNDER_REVIEW", "SUBMITTED_TO_ISSUER", "ALLOCATED", "PARTIALLY_ALLOCATED", "NOT_ALLOCATED", "REFUND_PENDING", "REFUNDED", "COMPLETED"] } } }),
    prisma.ipoApplication.aggregate({ where: { ipoId: ipo.id, status: { in: ["PAID", "UNDER_REVIEW", "SUBMITTED_TO_ISSUER", "ALLOCATED", "PARTIALLY_ALLOCATED"] } }, _sum: { shares: true } }),
    prisma.siteSetting.findUnique({ where: { key: "ipoSandbox" } }),
  ]);
  let myApplication: Awaited<ReturnType<typeof prisma.ipoApplication.findUnique>> | null = null;
  if (req.userId) myApplication = await prisma.ipoApplication.findUnique({ where: { userId_ipoId: { userId: req.userId, ipoId: ipo.id } } });

  res.json({
    ipo: serializeIpo(ipo),
    documents,
    applicationsCount: applications.length,
    demandShares: paidDemand._sum.shares ?? 0,
    subscriptionRatePct: ipo.totalShares > 0 ? ((paidDemand._sum.shares ?? 0) / ipo.totalShares) * 100 : 0,
    myApplication: myApplication ? serializeApplication(myApplication) : null,
    sandboxMode: sandboxSetting?.value === "true",
  });
});

router.get("/:slug/quote", requireAuth, validate(z.object({ query: z.object({ shares: z.string().regex(/^\d+$/).optional() }) })), async (req: AuthRequest, res) => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const ipo = await refreshAndLoad(slug);
  if (!ipo) return res.status(404).json({ error: "IPO offering not found" });
  const shares = Number(req.query.shares || 0);
  if (shares <= 0) return res.json({ quote: null, minimumShares: ipo.minimumShares, maximumShares: ipo.maximumShares, pricePerShare: ipo.pricePerShare, feePct: ipo.feePct });

  let validationError: string | null = null;
  if (shares < ipo.minimumShares) validationError = `Minimum subscription is ${ipo.minimumShares} shares`;
  if (ipo.maximumShares && shares > ipo.maximumShares) validationError = `Maximum subscription is ${ipo.maximumShares.toLocaleString()} shares per investor`;

  try {
    const rate = await getNgnUsdRate();
    const pricing = calculateIpoAmount(shares, ipo.pricePerShare, ipo.feePct);
    const amountUsd = usdFromNgn(pricing.totalNgn, rate);
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    res.json({
      quote: { shares, ...pricing, amountUsd, rate },
      validationError,
      walletBalance: user?.walletBalance ?? 0,
      minimumShares: ipo.minimumShares,
      maximumShares: ipo.maximumShares,
      pricePerShare: ipo.pricePerShare,
      feePct: ipo.feePct,
      sandbox: ipo.sandbox,
    });
  } catch (error) {
    res.status(503).json({ error: (error as Error).message });
  }
});
export default router;