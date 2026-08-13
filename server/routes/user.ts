import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { validate } from "../middleware/error";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { sanitizeUser } from "../utils/helpers";

const router = Router();
router.use(requireAuth);

router.get("/dashboard", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const [user, activeInvestments, activeCount, recentTransactions, notifications, referrals, activities, plans] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.investment.aggregate({ where: { userId, status: "ACTIVE" }, _sum: { amount: true } }),
    prisma.investment.count({ where: { userId, status: "ACTIVE" } }),
    prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.notification.findMany({ where: { userId, read: false }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.user.count({ where: { referredById: userId } }),
    prisma.activity.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.investmentPlan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  const totalEarnings = await prisma.transaction.aggregate({
    where: { userId, type: { in: ["PROFIT", "REFERRAL_COMMISSION", "BONUS"] } },
    _sum: { amount: true },
  });

  res.json({
    user: sanitizeUser(user!),
    activeInvestments: activeInvestments._sum.amount ?? 0,
    activeCount,
    totalEarnings: totalEarnings._sum.amount ?? 0,
    recentTransactions,
    notifications,
    referralCount: referrals,
    activities,
    plans,
  });
});

router.get("/transactions", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { page = "1", perPage = "20", type, status } = req.query;
  const where: Record<string, unknown> = { userId };
  if (type) where.type = type;
  if (status) where.status = status;
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({ where, orderBy: { createdAt: "desc" }, skip: (Number(page) - 1) * Number(perPage), take: Number(perPage) }),
    prisma.transaction.count({ where }),
  ]);
  res.json({ transactions, total, page: Number(page), totalPages: Math.ceil(total / Number(perPage)) });
});

router.get("/notifications", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const notifications = await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 });
  res.json({ notifications });
});

router.post("/notifications/read", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { id } = req.body ?? {};
  if (id) {
    await prisma.notification.updateMany({ where: { userId, id }, data: { read: true } });
  } else {
    await prisma.notification.updateMany({ where: { userId }, data: { read: true } });
  }
  res.json({ ok: true });
});

router.get("/activities", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const activities = await prisma.activity.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 30 });
  res.json({ activities });
});

const profileSchema = z.object({
  body: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    country: z.string().optional(),
  }),
});

router.patch("/profile", validate(profileSchema), async (req: AuthRequest, res) => {
  const { firstName, lastName, phone, country } = req.body;
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { firstName, lastName, phone, country },
  });
  res.json({ user: sanitizeUser(user) });
});

router.get("/tickets", async (req: AuthRequest, res) => {
  const tickets = await prisma.ticket.findMany({
    where: { userId: req.userId },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  res.json({ tickets });
});

const ticketSchema = z.object({
  body: z.object({
    subject: z.string().min(5),
    category: z.string().min(2),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    message: z.string().min(10),
  }),
});

router.post("/tickets", validate(ticketSchema), async (req: AuthRequest, res) => {
  const { subject, category, priority, message } = req.body;
  const ticket = await prisma.ticket.create({
    data: {
      userId: req.userId!,
      subject,
      category,
      priority,
      messages: { create: { message, senderId: req.userId, senderRole: "USER" } },
    },
    include: { messages: true },
  });
  await prisma.activity.create({ data: { userId: req.userId!, action: "Opened support ticket" } });
  res.status(201).json({ ticket });
});

const replySchema = z.object({
  body: z.object({ message: z.string().min(1) }),
});

router.post("/tickets/:id/reply", validate(replySchema), async (req: AuthRequest, res) => {
  const ticket = await prisma.ticket.findFirst({ where: { id: Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, userId: req.userId } });
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  const message = await prisma.ticketMessage.create({
    data: { ticketId: ticket.id, senderId: req.userId, senderRole: "USER", message: req.body.message },
  });
  await prisma.ticket.update({ where: { id: ticket.id }, data: { status: "OPEN" } });
  res.json({ message });
});

const kycSchema = z.object({
  body: z.object({ type: z.string().min(2), documentUrl: z.string().min(5) }),
});

router.post("/kyc", validate(kycSchema), async (req: AuthRequest, res) => {
  await prisma.kycDocument.create({
    data: { userId: req.userId!, type: req.body.type, documentUrl: req.body.documentUrl, status: "PENDING" },
  });
  await prisma.user.update({ where: { id: req.userId }, data: { kycStatus: "PENDING" } });
  res.status(201).json({ ok: true, message: "KYC documents submitted for review" });
});

const walletSchema = z.object({
  body: z.object({
    currency: z.enum(["USDT_TRC20", "BTC", "ETH"]),
    address: z.string().min(10),
    label: z.string().optional(),
  }),
});

router.post("/wallets", validate(walletSchema), async (req: AuthRequest, res) => {
  const { currency, address, label } = req.body;
  const existing = await prisma.wallet.findFirst({ where: { userId: req.userId, currency } });
  if (existing) {
    return res.status(409).json({ error: "A wallet for that currency already exists" });
  }
  const wallet = await prisma.wallet.create({ data: { userId: req.userId!, currency, address, label } });
  res.status(201).json({ wallet });
});

router.delete("/wallets/:id", async (req: AuthRequest, res) => {
  const wallet = await prisma.wallet.findFirst({ where: { id: Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, userId: req.userId } });
  if (!wallet) return res.status(404).json({ error: "Wallet not found" });
  await prisma.wallet.delete({ where: { id: wallet.id } });
  res.json({ ok: true });
});

const prefsSchema = z.object({
  body: z.object({
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    marketingEmails: z.boolean().optional(),
  }),
});

router.patch("/preferences", validate(prefsSchema), async (req: AuthRequest, res) => {
  const prefs = await prisma.siteSetting.upsert({
    where: { key: `prefs:${req.userId}` },
    create: { key: `prefs:${req.userId}`, value: JSON.stringify(req.body) },
    update: { value: JSON.stringify(req.body) },
  });
  res.json({ ok: true, prefs });
});

export default router;
