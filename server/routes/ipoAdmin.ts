import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireAdmin, AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/error";
import { paginate, generateReference } from "../utils/helpers";
import {
  applyAutoStatus,
  allocateShares,
  applicationAllocationStatus,
  refundAmountForApplication,
  round2,
  serializeApplication,
  serializeIpo,
} from "../utils/ipo";
import { decryptSecret, maskSecret } from "../utils/crypto";
import { can } from "../utils/rbac";
import { ipoAllocationResultEmail, ipoRefundProcessedEmail, notifyAdmins, sendMail } from "../utils/mail";

const router = Router();
router.use(requireAuth, requireAdmin);

function permit(permission: "IPO_MANAGE" | "IPO_KYC" | "IPO_ALLOCATE" | "IPO_REFUND" | "IPO_VIEW") {
  return (req: AuthRequest, res: { status(code: number): { json(body: unknown): unknown } }, next: () => void) => {
    if (!can(req.role, permission)) {
      return res.status(403).json({ error: "You do not have permission for this action" });
    }
    next();
  };
}

async function log(req: AuthRequest, action: string, entity?: string, entityId?: string, details?: unknown) {
  await prisma.auditLog.create({
    data: { userId: req.userId, action, entity, entityId, details: details as object | undefined, ip: req.ip },
  });
}

function routeId(req: AuthRequest): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

const ipoBodySchema = z.object({
  body: z.object({
    name: z.string().min(2),
    slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
    issuer: z.string().min(2),
    ticker: z.string().optional(),
    exchange: z.string().optional(),
    logoUrl: z.string().url().optional().or(z.literal("")),
    tagline: z.string().min(3),
    overview: z.string().min(20),
    keyFacts: z.array(z.object({ label: z.string(), value: z.union([z.string(), z.number()]) })).optional(),
    riskDisclaimers: z.string().min(10).optional(),
    pricePerShare: z.number().positive(),
    totalShares: z.number().positive(),
    minimumShares: z.number().int().positive().optional(),
    maximumShares: z.number().int().positive().optional(),
    greenshoePct: z.number().min(0).max(100).optional(),
    feePct: z.number().min(0).max(50).optional(),
    currency: z.string().min(2).optional(),
    openDate: z.string().datetime().optional().nullable(),
    closeDate: z.string().datetime().optional().nullable(),
    allotmentDate: z.string().datetime().optional().nullable(),
    listingDate: z.string().datetime().optional().nullable(),
    status: z.enum(["DRAFT", "UPCOMING", "OPEN", "CLOSING_SOON", "CLOSED", "ALLOCATION_PENDING", "ALLOCATION_COMPLETED", "LISTED", "COMPLETED"]).optional(),
    published: z.boolean().optional(),
    sandbox: z.boolean().optional(),
  }),
});

function toDate(value?: string | null): Date | null {
  return value ? new Date(value) : null;
}

router.get("/", async (_req, res) => {
  const ipos = await prisma.ipo.findMany({ orderBy: { createdAt: "desc" } });
  const enriched = await Promise.all(
    ipos.map(async (ipo) => {
      const next = applyAutoStatus(ipo);
      if (next !== ipo.status) {
        await prisma.ipo.update({ where: { id: ipo.id }, data: { status: next as never } });
        ipo.status = next as never;
      }
      const [applications, paid] = await Promise.all([
        prisma.ipoApplication.count({ where: { ipoId: ipo.id } }),
prisma.ipoApplication.aggregate({ where: { ipoId: ipo.id, status: { in: ["PAID", "UNDER_REVIEW", "SUBMITTED_TO_ISSUER", "ALLOCATED", "PARTIALLY_ALLOCATED", "NOT_ALLOCATED", "REFUND_PENDING", "REFUNDED", "COMPLETED"] } }, _sum: { amountNgn: true, shares: true }, _count: true }),
      ]);
      return { ...serializeIpo(ipo), applicationsCount: applications, paidNgn: paid._sum.amountNgn ?? 0, paidShares: paid._sum.shares ?? 0 };
    }),
  );
  res.json({ ipos: enriched });
});

router.get("/investor-profiles", async (req, res) => {
  const { page = "1", perPage = "20", status, search } = req.query;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { fullName: { contains: search as string, mode: "insensitive" } },
      { user: { is: { email: { contains: search as string, mode: "insensitive" } } } },
    ];
  }
  const pg = paginate(Number(page), Number(perPage), await prisma.ipoInvestorProfile.count({ where }));
  const profiles = await prisma.ipoInvestorProfile.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: pg.skip,
    take: pg.perPage,
    include: { user: { select: { username: true, email: true, createdAt: true } } },
  });
  res.json({
    profiles: profiles.map((p) => ({
      ...p,
      bvnCipher: undefined,
      accountCipher: undefined,
      idCipher: undefined,
      bvnLast4: p.bvnCipher ? maskSecret(decryptSecret(p.bvnCipher)) : null,
      accountLast4: p.accountCipher ? maskSecret(decryptSecret(p.accountCipher)) : null,
      idNumberDecrypted: p.idCipher ? decryptSecret(p.idCipher) : null,
    })),
    ...pg,
  });
});

const profileReviewSchema = z.object({ body: z.object({ action: z.enum(["APPROVE", "REJECT"]), note: z.string().optional() }) });

router.patch("/investor-profiles/:id/review", requireAuth, permit("IPO_KYC"), validate(profileReviewSchema), async (req: AuthRequest, res) => {
  const profile = await prisma.ipoInvestorProfile.findUnique({ where: { id: routeId(req) } });
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const status = req.body.action === "APPROVE" ? "APPROVED" : "REJECTED";
  await prisma.$transaction([
    prisma.ipoInvestorProfile.update({ where: { id: profile.id }, data: { status, adminNote: req.body.note, reviewedBy: req.userId, reviewedAt: new Date() } }),
    prisma.user.update({ where: { id: profile.userId }, data: { kycStatus: status } }),
    prisma.notification.create({
      data: {
        userId: profile.userId,
        title: status === "APPROVED" ? "IPO verification approved" : "IPO verification rejected",
        message: status === "APPROVED" ? "Your investor verification was approved. You can now subscribe to IPO offerings." : `Your investor verification was not approved. ${req.body.note ? `Reason: ${req.body.note}` : ""}`,
        type: status === "APPROVED" ? "success" : "error",
      },
    }),
  ]);
  await log(req, status === "APPROVED" ? "APPROVE_IPO_KYC" : "REJECT_IPO_KYC", "IpoInvestorProfile", profile.id, { note: req.body.note });
  res.json({ ok: true });
});

router.post("/", requireAuth, permit("IPO_MANAGE"), validate(ipoBodySchema), async (req: AuthRequest, res) => {
  const { slug, openDate, closeDate, allotmentDate, listingDate, ...rest } = req.body;
  const data: Record<string, unknown> = { ...rest };
  if (openDate) data.openDate = toDate(openDate);
  else if (openDate === null) data.openDate = null;
  if (closeDate) data.closeDate = toDate(closeDate);
  else if (closeDate === null) data.closeDate = null;
  if (allotmentDate) data.allotmentDate = toDate(allotmentDate);
  if (listingDate) data.listingDate = toDate(listingDate);
  if (data.status === undefined || data.status === "DRAFT") data.status = "DRAFT";
  if (data.published === undefined) data.published = false;
  if (data.sandbox === undefined) data.sandbox = true;
  const ipo = await prisma.ipo.create({
    data: { ...data, slug: slug || data.name!.toString().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") } as never,
  });
  await log(req, "CREATE_IPO", "Ipo", ipo.id, { name: ipo.name });
  res.status(201).json({ ipo: serializeIpo(ipo) });
});

const settingsSchema = z.object({ body: z.object({ sandbox: z.boolean() }) });

router.patch("/settings", requireAuth, permit("IPO_MANAGE"), validate(settingsSchema), async (req: AuthRequest, res) => {
  await prisma.siteSetting.upsert({
    where: { key: "ipoSandbox" },
    create: { key: "ipoSandbox", value: String(req.body.sandbox) },
    update: { value: String(req.body.sandbox) },
  });
  await log(req, "UPDATE_IPO_SANDBOX", "SiteSetting", "ipoSandbox", { sandbox: req.body.sandbox });
  res.json({ ok: true, sandbox: req.body.sandbox });
});

router.patch("/:id", requireAuth, permit("IPO_MANAGE"), validate(z.object({ body: ipoBodySchema.shape.body.partial() })), async (req: AuthRequest, res) => {
  const { openDate, closeDate, allotmentDate, listingDate, ...rest } = req.body;
  const data: Record<string, unknown> = { ...rest };
  if (openDate !== undefined) data.openDate = openDate ? toDate(openDate) : null;
  if (closeDate !== undefined) data.closeDate = closeDate ? toDate(closeDate) : null;
  if (allotmentDate !== undefined) data.allotmentDate = allotmentDate ? toDate(allotmentDate) : null;
  if (listingDate !== undefined) data.listingDate = listingDate ? toDate(listingDate) : null;
  const ipo = await prisma.ipo.update({ where: { id: routeId(req) }, data: data as never });
  await log(req, "UPDATE_IPO", "Ipo", ipo.id, data);
  res.json({ ipo: serializeIpo(ipo) });
});

router.post("/:id/publish", requireAuth, permit("IPO_MANAGE"), async (req: AuthRequest, res) => {
  const ipo = await prisma.ipo.findUnique({ where: { id: routeId(req) } });
  if (!ipo) return res.status(404).json({ error: "IPO not found" });
  const next = applyAutoStatus({ ...ipo, published: true });
  const updated = await prisma.ipo.update({ where: { id: ipo.id }, data: { published: true, status: next as never } });
  await log(req, "PUBLISH_IPO", "Ipo", updated.id);
  res.json({ ipo: serializeIpo(updated) });
});

router.patch("/:id/status", requireAuth, permit("IPO_MANAGE"), validate(z.object({ body: z.object({ status: z.enum(["DRAFT", "UPCOMING", "OPEN", "CLOSING_SOON", "CLOSED", "ALLOCATION_PENDING", "ALLOCATION_COMPLETED", "LISTED", "COMPLETED"]) }) })), async (req: AuthRequest, res) => {
  const ipo = await prisma.ipo.update({ where: { id: routeId(req) }, data: { status: req.body.status } });
  await log(req, "UPDATE_IPO_STATUS", "Ipo", ipo.id, { status: req.body.status });
  res.json({ ipo: serializeIpo(ipo) });
});

router.get("/refunds", async (req, res) => {
  const { page = "1", perPage = "20", status, ipoId } = req.query;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (ipoId) where.ipoId = ipoId;
  const pg = paginate(Number(page), Number(perPage), await prisma.ipoRefund.count({ where }));
  const refunds = await prisma.ipoRefund.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: pg.skip,
    take: pg.perPage,
    include: { user: { select: { username: true, email: true } }, ipo: { select: { name: true } }, application: { select: { reference: true, shares: true, allocationShares: true } } },
  });
  res.json({ refunds, ...pg });
});

router.get("/:id", async (req, res) => {
  const id = routeId(req);
  const ipo = await prisma.ipo.findUnique({ where: { id }, include: { documents: true } });
  if (!ipo) return res.status(404).json({ error: "IPO not found" });
  const [agg, refunds] = await Promise.all([
    prisma.ipoApplication.aggregate({
      where: { ipoId: id, status: { in: ["PAID", "UNDER_REVIEW", "SUBMITTED_TO_ISSUER", "ALLOCATED", "PARTIALLY_ALLOCATED", "NOT_ALLOCATED", "REFUND_PENDING", "REFUNDED", "COMPLETED"] } },
      _sum: { amountNgn: true, shares: true },
      _count: true,
    }),
    prisma.ipoRefund.aggregate({ where: { ipoId: id }, _sum: { amountUsd: true }, _count: true }),
  ]);
  res.json({ ipo: serializeIpo(ipo), stats: { paidNgn: agg._sum.amountNgn ?? 0, paidShares: agg._sum.shares ?? 0, paidApplications: agg._count, refunds: refunds._count, refundedUsd: refunds._sum.amountUsd ?? 0 } });
});

router.get("/:id/applications", async (req, res) => {
  const { page = "1", perPage = "20", status, search } = req.query;
  const ipoId = routeId(req);
  const where: Record<string, unknown> = { ipoId };
  if (status) where.status = status;
  if (search) where.user = { is: { OR: [{ username: { contains: search as string, mode: "insensitive" } }, { email: { contains: search as string, mode: "insensitive" } }] } };
  const pg = paginate(Number(page), Number(perPage), await prisma.ipoApplication.count({ where }));
  const applications = await prisma.ipoApplication.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: pg.skip,
    take: pg.perPage,
    include: { user: { select: { username: true, email: true } }, refund: true },
  });
  res.json({ applications: applications.map((a) => ({ ...serializeApplication(a), user: a.user, refund: a.refund })), ...pg });
});

router.patch("/applications/:id/status", requireAuth, permit("IPO_MANAGE"), validate(z.object({ body: z.object({ status: z.enum(["UNDER_REVIEW", "SUBMITTED_TO_ISSUER", "ALLOCATED", "PARTIALLY_ALLOCATED", "NOT_ALLOCATED", "COMPLETED"]) }) })), async (req: AuthRequest, res) => {
  const id = req.params.id;
  const appId = Array.isArray(id) ? id[0] : id;
  const app = await prisma.ipoApplication.findUnique({ where: { id: appId } });
  if (!app) return res.status(404).json({ error: "Application not found" });
  const updated = await prisma.ipoApplication.update({ where: { id: appId }, data: { status: req.body.status } });
  await log(req, "UPDATE_IPO_APPLICATION_STATUS", "IpoApplication", appId, { status: req.body.status });
  res.json({ application: serializeApplication(updated) });
});

const allocateSchema = z.object({
  body: z.object({
    ratePct: z.number().min(0).max(100).optional(),
    allocations: z.array(z.object({ reference: z.string().min(1), shares: z.number().int().min(0) })).optional(),
  }),
});

router.post("/:id/allocate", requireAuth, permit("IPO_ALLOCATE"), validate(allocateSchema), async (req: AuthRequest, res) => {
  const ipo = await prisma.ipo.findUnique({ where: { id: routeId(req) } });
  if (!ipo) return res.status(404).json({ error: "IPO not found" });
  const eligible = await prisma.ipoApplication.findMany({
    where: { ipoId: ipo.id, status: { in: ["PAID", "UNDER_REVIEW", "SUBMITTED_TO_ISSUER", "PAYMENT_PENDING"] } },
    include: { user: true },
  });
  if (eligible.length === 0) return res.status(400).json({ error: "No eligible paid applications found for allocation" });

  const importMap = new Map<string, number>();
  if (req.body.allocations) {
    for (const row of req.body.allocations) importMap.set(row.reference, row.shares);
  }

  const allocatedDate = new Date();
  const results: Array<{ reference: string; username: string; requested: number; allocated: number; statusTag: string }> = [];

  await prisma.$transaction(async (tx) => {
    for (const app of eligible) {
      let allocated = req.body.ratePct !== undefined ? allocateShares(app.shares, req.body.ratePct) : importMap.get(app.reference) ?? 0;
      if (!importMap.has(app.reference) && req.body.ratePct === undefined) allocated = 0;
      if (allocated > app.shares) allocated = app.shares;
      const statusTag = applicationAllocationStatus(app.shares, allocated);
      const allocationRate = app.shares > 0 ? (allocated / app.shares) * 100 : 0;
      const allocatedAmountNgn = round2(allocated * app.pricePerShare);
      await tx.ipoApplication.update({
        where: { id: app.id },
        data: { status: statusTag, allocationShares: allocated, allocationRate, allocatedAmountNgn, allocatedAt: allocatedDate },
      });
      results.push({ reference: app.reference, username: app.user.username, requested: app.shares, allocated, statusTag });
    }
    await tx.ipo.update({ where: { id: ipo.id }, data: { status: "ALLOCATION_COMPLETED", allotmentDate: allocatedDate } });
  });

  await log(req, "RUN_IPO_ALLOCATION", "Ipo", ipo.id, { ratePct: req.body.ratePct, importedRows: req.body.allocations?.length ?? 0, applications: eligible.length });

  const mailed: Promise<unknown>[] = [];
  for (const r of results) {
    const app = eligible.find((a) => a.reference === r.reference);
    if (!app) continue;
    const { subject, html } = ipoAllocationResultEmail({
      username: app.user.username,
      email: app.user.email,
      ipoName: ipo.name,
      requestedShares: r.requested,
      allocatedShares: r.allocated,
    });
    mailed.push(sendMail(app.user.email, subject, html).catch(() => undefined));
  }
  await Promise.allSettled(mailed);
  notifyAdmins(`${ipo.name} allocation`, `Allocation completed for <b>${ipo.name}</b> — ${results.length} application(s) processed.`).catch(() => undefined);

  res.json({
    totalProcessed: results.length,
    allocatedSharesTotal: results.reduce((s, r) => s + r.allocated, 0),
    notAllocated: results.filter((r) => r.statusTag === "NOT_ALLOCATED").length,
    partial: results.filter((r) => r.statusTag === "PARTIALLY_ALLOCATED").length,
    full: results.filter((r) => r.statusTag === "ALLOCATED").length,
    message: "Run refunds to return money to unallocated investors.",
  });
});

router.post("/:id/refunds", requireAuth, permit("IPO_REFUND"), async (req: AuthRequest, res) => {
  const ipo = await prisma.ipo.findUnique({ where: { id: routeId(req) } });
  if (!ipo) return res.status(404).json({ error: "IPO not found" });
  const apps = await prisma.ipoApplication.findMany({
    where: { ipoId: ipo.id, status: { in: ["NOT_ALLOCATED", "PARTIALLY_ALLOCATED"] }, refund: null },
    include: { refund: true },
  });
  const now = new Date();
  let created = 0;
  for (const app of apps) {
    const refund = refundAmountForApplication(app);
    if (refund.amountUsd <= 0) continue;
    await prisma.ipoRefund.create({
      data: {
        applicationId: app.id,
        ipoId: ipo.id,
        userId: app.userId,
        reference: generateReference("IPOR"),
        amountNgn: refund.amountNgn,
        amountUsd: refund.amountUsd,
        exchangeRate: app.exchangeRate,
        reason: app.status === "PARTIALLY_ALLOCATED" ? "PARTIAL" : "NOT_ALLOCATED",
        status: "PENDING",
      },
    });
    await prisma.ipoApplication.update({ where: { id: app.id }, data: { status: "REFUND_PENDING" } });
    created += 1;
  }
  await log(req, "CREATE_IPO_REFUNDS", "Ipo", ipo.id, { created, at: now.toISOString() });
  res.json({ created, message: `${created} refund(s) created. Process them to return funds to investor wallets.` });
});

router.post("/refunds/:id/process", requireAuth, permit("IPO_REFUND"), async (req: AuthRequest, res) => {
  const id = req.params.id;
  const refundId = Array.isArray(id) ? id[0] : id;
  const refund = await prisma.ipoRefund.findUnique({
    where: { id: refundId },
    include: { user: true, ipo: true, application: true },
  });
  if (!refund) return res.status(404).json({ error: "Refund not found" });
  if (refund.status === "COMPLETED") return res.status(409).json({ error: "Refund already processed" });
  if (!["PENDING", "PROCESSING"].includes(refund.status)) return res.status(409).json({ error: "Refund is not processable" });

  const isSandbox = refund.ipo.sandbox;
  await prisma.$transaction(async (tx) => {
    await tx.ipoRefund.update({ where: { id: refund.id }, data: { status: "PROCESSING" } });
    if (!isSandbox) {
      await tx.user.update({ where: { id: refund.userId }, data: { walletBalance: { increment: refund.amountUsd } } });
      await tx.transaction.create({
        data: {
          userId: refund.userId,
          type: "IPO_REFUND",
          amount: refund.amountUsd,
          status: "COMPLETED",
          description: `Refund for ${refund.ipo.name} IPO (${refund.application.reference})`,
          reference: refund.reference,
          currency: "USDT_TRC20",
          metadata: { ipoId: refund.ipoId, applicationId: refund.applicationId, reason: refund.reason },
        },
      });
    }
    await tx.ipoRefund.update({
      where: { id: refund.id },
      data: { status: "COMPLETED", processedById: req.userId, processedAt: new Date() },
    });
    await tx.ipoApplication.update({ where: { id: refund.applicationId }, data: { status: "REFUNDED", refundedAt: new Date() } });
    await tx.notification.create({
      data: {
        userId: refund.userId,
        title: isSandbox ? "IPO refund recorded (TEST MODE)" : "IPO refund processed",
        message: isSandbox
          ? `TEST MODE: a refund of $${refund.amountUsd.toFixed(2)} for ${refund.ipo.name} was recorded without crediting your wallet.`
          : `$${refund.amountUsd.toFixed(2)} was refunded to your wallet for ${refund.ipo.name}.`,
        type: isSandbox ? "info" : "success",
      },
    });
  });

  await log(req, "PROCESS_IPO_REFUND", "IpoRefund", refund.id, { amountUsd: refund.amountUsd });
  const { subject, html } = ipoRefundProcessedEmail({
    username: refund.user.username,
    email: refund.user.email,
    ipoName: refund.ipo.name,
    amountUsd: refund.amountUsd,
    reference: refund.reference,
  });
  sendMail(refund.user.email, subject, html).catch(() => undefined);
  res.json({ ok: true, message: isSandbox ? "TEST MODE: refund recorded without crediting the wallet." : `$${refund.amountUsd.toFixed(2)} returned to the investor's wallet.` });
});

const documentSchema = z.object({
  body: z.object({
    ipoId: z.string().min(1),
    title: z.string().min(2),
    type: z.enum(["PROSPECTUS", "FINANCIALS", "UPLOAD", "NOTICE", "RESULT"]).default("UPLOAD"),
    url: z.string().url("Enter a valid document URL"),
    description: z.string().optional(),
    published: z.boolean().optional(),
  }),
});

router.get("/:id/documents", async (req, res) => {
  const documents = await prisma.ipoDocument.findMany({ where: { ipoId: routeId(req) }, orderBy: { createdAt: "desc" } });
  res.json({ documents });
});

router.post("/documents", requireAuth, permit("IPO_MANAGE"), validate(documentSchema), async (req: AuthRequest, res) => {
  const document = await prisma.ipoDocument.create({
    data: { ...req.body, publishedAt: req.body.published === false ? null : new Date() },
  });
  await log(req, "CREATE_IPO_DOCUMENT", "IpoDocument", document.id, { title: document.title });
  res.status(201).json({ document });
});

const documentPatchSchema = z.object({ body: z.object({ title: z.string().min(2).optional(), type: z.enum(["PROSPECTUS", "FINANCIALS", "UPLOAD", "NOTICE", "RESULT"]).optional(), url: z.string().url().optional(), description: z.string().optional(), published: z.boolean().optional() }) });

function documentId(req: AuthRequest): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

router.patch("/documents/:id", requireAuth, permit("IPO_MANAGE"), validate(documentPatchSchema), async (req: AuthRequest, res) => {
  const document = await prisma.ipoDocument.update({
    where: { id: documentId(req) },
    data: { ...req.body, publishedAt: req.body.published === true ? new Date() : undefined },
  });
  await log(req, "UPDATE_IPO_DOCUMENT", "IpoDocument", document.id);
  res.json({ document });
});

router.delete("/documents/:id", requireAuth, permit("IPO_MANAGE"), async (req: AuthRequest, res) => {
  await prisma.ipoDocument.delete({ where: { id: documentId(req) } });
  await log(req, "DELETE_IPO_DOCUMENT", "IpoDocument", documentId(req));
  res.json({ ok: true });
});

router.get("/:id/stats", async (req, res) => {
  const ipo = await prisma.ipo.findUnique({ where: { id: routeId(req) } });
  if (!ipo) return res.status(404).json({ error: "IPO not found" });
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [total, paidAgg, byStatus, daily] = await Promise.all([
    prisma.ipoApplication.count({ where: { ipoId: ipo.id } }),
    prisma.ipoApplication.aggregate({ where: { ipoId: ipo.id, status: { in: ["PAID", "UNDER_REVIEW", "SUBMITTED_TO_ISSUER", "ALLOCATED", "PARTIALLY_ALLOCATED", "NOT_ALLOCATED", "REFUND_PENDING", "REFUNDED", "COMPLETED"] } }, _sum: { amountNgn: true, shares: true }, _count: true }),
    prisma.ipoApplication.groupBy({ by: ["status"], where: { ipoId: ipo.id }, _count: true }),
    prisma.$queryRaw`
      SELECT to_char(date_trunc('day', "createdAt"), 'Mon DD') AS label,
             COUNT(*)::int AS applications,
             COALESCE(SUM(CASE WHEN status IN ('PAID','UNDER_REVIEW','SUBMITTED_TO_ISSUER','ALLOCATED','PARTIALLY_ALLOCATED','NOT_ALLOCATED','REFUND_PENDING','REFUNDED','COMPLETED') THEN "amountNgn" ELSE 0 END), 0)::float AS raisedNgn
      FROM "IpoApplication"
      WHERE "ipoId" = ${ipo.id} AND "createdAt" > ${since}
      GROUP BY 1 ORDER BY 1
    `,
  ]);
  const oversubscription = ipo.totalShares > 0 ? ((paidAgg._sum.shares ?? 0) / ipo.totalShares) * 100 : 0;
  res.json({
    stats: {
      applications: total,
      paidApplications: paidAgg._count,
      paidShares: paidAgg._sum.shares ?? 0,
      raisedNgn: paidAgg._sum.amountNgn ?? 0,
      oversubscriptionPct: oversubscription,
      totalShares: ipo.totalShares,
    },
    byStatus,
    daily,
  });
});

export default router;