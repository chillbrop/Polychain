import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { validate } from "../middleware/error";
import { requireAuth, requireAdmin, AuthRequest } from "../middleware/auth";
import { sanitizeUser, paginate } from "../utils/helpers";
import { accrueProfits } from "./investments";

const router = Router();
router.use(requireAuth, requireAdmin);

async function log(req: AuthRequest, action: string, entity?: string, entityId?: string, details?: unknown) {
  await prisma.auditLog.create({
    data: { userId: req.userId, action, entity, entityId, details: details as object | undefined, ip: req.ip },
  });
}

function routeId(req: AuthRequest): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

router.get("/dashboard", async (req: AuthRequest, res) => {
  const [users, totalUsers, verifiedUsers, depositsAgg, withdrawalsAgg, investmentsAgg, activeInvestments, plans, recentUsers, recentDeposits, recentWithdrawals, ticketsOpen, chartData] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count(),
    prisma.user.count({ where: { emailVerified: true } }),
    prisma.depositRequest.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
    prisma.withdrawal.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
    prisma.investment.aggregate({ _sum: { amount: true }, _count: true }),
    prisma.investment.count({ where: { status: "ACTIVE" } }),
    prisma.investmentPlan.count({ where: { active: true } }),
    prisma.user.findMany({ where: { role: "USER" }, orderBy: { createdAt: "desc" }, take: 6, select: { id: true, username: true, email: true, createdAt: true, totalDeposited: true } }),
    prisma.depositRequest.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 6, include: { user: { select: { username: true, email: true } } } }),
    prisma.withdrawal.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 6, include: { user: { select: { username: true, email: true } } } }),
    prisma.ticket.count({ where: { status: { in: ["OPEN", "PENDING"] } } }),
    prisma.$queryRaw`
      SELECT to_char(date_trunc('day', "createdAt"), 'Mon DD') AS label,
             COUNT(*)::int AS deposits,
             COALESCE(SUM(CASE WHEN status='COMPLETED' THEN amount ELSE 0 END), 0)::float AS volume
      FROM "DepositRequest"
      WHERE "createdAt" > now() - interval '30 days'
      GROUP BY 1 ORDER BY 1
    `,
  ]);

  res.json({
    stats: {
      users,
      totalUsers,
      verifiedUsers,
      totalDeposited: depositsAgg._sum.amount ?? 0,
      totalWithdrawn: withdrawalsAgg._sum.amount ?? 0,
      totalInvested: investmentsAgg._sum.amount ?? 0,
      totalInvestments: investmentsAgg._count,
      activeInvestments,
      activePlans: plans,
      openTickets: ticketsOpen,
    },
    recentUsers,
    recentDeposits,
    recentWithdrawals,
    chartData,
  });
});

router.get("/users", async (req, res) => {
  const { page = "1", perPage = "20", search, status, role } = req.query;
  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { username: { contains: search as string, mode: "insensitive" } },
      { email: { contains: search as string, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;
  if (role) where.role = role;
  const pg = paginate(Number(page), Number(perPage), await prisma.user.count({ where }));
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: pg.skip,
    take: pg.perPage,
    include: { _count: { select: { referrals: true, investments: true, depositRequests: true } } },
  });
  res.json({ users: users.map(sanitizeUser as never), ...pg });
});

router.get("/users/:id", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: routeId(req) },
    include: {
      wallets: true,
      investments: { include: { plan: true }, orderBy: { createdAt: "desc" } },
      transactions: { orderBy: { createdAt: "desc" }, take: 50 },
      depositRequests: { orderBy: { createdAt: "desc" } },
      withdrawals: { orderBy: { createdAt: "desc" } },
      referrals: { select: { id: true, username: true, email: true, createdAt: true, totalInvested: true } },
      kycDocuments: true,
    },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: sanitizeUser(user) });
});

const userUpdateSchema = z.object({
  body: z.object({
    status: z.enum(["ACTIVE", "SUSPENDED", "VERIFYING"]).optional(),
    kycStatus: z.enum(["PENDING", "APPROVED", "REJECTED", "NOT_SUBMITTED"]).optional(),
    role: z.enum(["USER", "ADMIN"]).optional(),
    walletBalance: z.number().optional(),
    profitBalance: z.number().optional(),
  }),
});

router.patch("/users/:id", validate(userUpdateSchema), async (req: AuthRequest, res) => {
  const { status, kycStatus, role, walletBalance, profitBalance } = req.body;
  const data: Record<string, unknown> = {};
  if (status !== undefined) data.status = status;
  if (kycStatus !== undefined) data.kycStatus = kycStatus;
  if (role !== undefined) data.role = role;
  if (walletBalance !== undefined) data.walletBalance = walletBalance;
  if (profitBalance !== undefined) data.profitBalance = profitBalance;
  const user = await prisma.user.update({ where: { id: routeId(req) }, data });
  await log(req, "UPDATE_USER", "User", user.id, data);
  res.json({ user: sanitizeUser(user) });
});

router.get("/deposits", async (req, res) => {
  const { page = "1", perPage = "20", status, search } = req.query;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) where.user = { username: { contains: search as string, mode: "insensitive" } };
  const pg = paginate(Number(page), Number(perPage), await prisma.depositRequest.count({ where }));
  const deposits = await prisma.depositRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: pg.skip,
    take: pg.perPage,
    include: { user: { select: { username: true, email: true } } },
  });
  res.json({ deposits, ...pg });
});

const depositActionSchema = z.object({
  body: z.object({ action: z.enum(["APPROVE", "REJECT"]), note: z.string().optional() }),
});

router.post("/deposits/:id/review", validate(depositActionSchema), async (req: AuthRequest, res) => {
  const { action, note } = req.body;
  const deposit = await prisma.depositRequest.findUnique({ where: { id: routeId(req) }, include: { user: true } });
  if (!deposit) return res.status(404).json({ error: "Deposit not found" });
  if (deposit.status !== "PENDING") return res.status(400).json({ error: "Deposit already reviewed" });

  if (action === "APPROVE") {
    await prisma.$transaction([
      prisma.depositRequest.update({ where: { id: deposit.id }, data: { status: "COMPLETED", reviewedBy: req.userId, reviewedAt: new Date(), note } }),
      prisma.user.update({ where: { id: deposit.userId }, data: { walletBalance: { increment: deposit.amount }, totalDeposited: { increment: deposit.amount } } }),
      prisma.transaction.create({
        data: {
          userId: deposit.userId,
          type: "DEPOSIT",
          amount: deposit.amount,
          status: "COMPLETED",
          description: `Deposit via ${deposit.currency}`,
          reference: `DPS${deposit.id.slice(-8).toUpperCase()}`,
          currency: deposit.currency,
        },
      }),
      prisma.notification.create({
        data: { userId: deposit.userId, title: "Deposit confirmed", message: `Your deposit of $${deposit.amount.toFixed(2)} has been confirmed and credited to your wallet.`, type: "success" },
      }),
    ]);
    await log(req, "APPROVE_DEPOSIT", "DepositRequest", deposit.id, { amount: deposit.amount });
  } else {
    await prisma.$transaction([
      prisma.depositRequest.update({ where: { id: deposit.id }, data: { status: "REJECTED", reviewedBy: req.userId, reviewedAt: new Date(), note } }),
      prisma.notification.create({
        data: { userId: deposit.userId, title: "Deposit rejected", message: `Your deposit request of $${deposit.amount.toFixed(2)} was not approved. ${note ? `Reason: ${note}` : ""}`, type: "error" },
      }),
    ]);
    await log(req, "REJECT_DEPOSIT", "DepositRequest", deposit.id, { amount: deposit.amount, note });
  }
  res.json({ ok: true });
});

router.get("/withdrawals", async (req, res) => {
  const { page = "1", perPage = "20", status, search } = req.query;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) where.user = { username: { contains: search as string, mode: "insensitive" } };
  const pg = paginate(Number(page), Number(perPage), await prisma.withdrawal.count({ where }));
  const withdrawals = await prisma.withdrawal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: pg.skip,
    take: pg.perPage,
    include: { user: { select: { username: true, email: true } } },
  });
  res.json({ withdrawals, ...pg });
});

const withdrawalActionSchema = z.object({
  body: z.object({ action: z.enum(["APPROVE", "REJECT"]), note: z.string().optional() }),
});

router.post("/withdrawals/:id/review", validate(withdrawalActionSchema), async (req: AuthRequest, res) => {
  const { action, note } = req.body;
  const withdrawal = await prisma.withdrawal.findUnique({ where: { id: routeId(req) } });
  if (!withdrawal) return res.status(404).json({ error: "Withdrawal not found" });
  if (!["PENDING", "PROCESSING"].includes(withdrawal.status)) {
    return res.status(400).json({ error: "Withdrawal already reviewed" });
  }

  if (action === "APPROVE") {
    await prisma.$transaction([
      prisma.withdrawal.update({ where: { id: withdrawal.id }, data: { status: "COMPLETED", reviewedBy: req.userId, reviewedAt: new Date(), note } }),
      prisma.user.update({ where: { id: withdrawal.userId }, data: { totalWithdrawn: { increment: withdrawal.amount } } }),
      prisma.transaction.updateMany({
        where: { userId: withdrawal.userId, type: "WITHDRAWAL", createdAt: { gte: new Date(Date.now() - 60000) } },
        data: { status: "COMPLETED" },
      }),
      prisma.notification.create({
        data: { userId: withdrawal.userId, title: "Withdrawal sent", message: `Your withdrawal of $${withdrawal.amount.toFixed(2)} has been sent to ${withdrawal.address}.`, type: "success" },
      }),
    ]);
    await log(req, "APPROVE_WITHDRAWAL", "Withdrawal", withdrawal.id, { amount: withdrawal.amount });
  } else {
    const refundTotal = withdrawal.amount + withdrawal.fee;
    await prisma.$transaction([
      prisma.withdrawal.update({ where: { id: withdrawal.id }, data: { status: "REJECTED", reviewedBy: req.userId, reviewedAt: new Date(), note } }),
      prisma.user.update({ where: { id: withdrawal.userId }, data: { profitBalance: { increment: refundTotal } } }),
      prisma.notification.create({
        data: { userId: withdrawal.userId, title: "Withdrawal rejected", message: `Your withdrawal request of $${withdrawal.amount.toFixed(2)} was rejected. ${note ? `Reason: ${note}` : ""}`, type: "error" },
      }),
    ]);
    await log(req, "REJECT_WITHDRAWAL", "Withdrawal", withdrawal.id, { amount: withdrawal.amount, note });
  }
  res.json({ ok: true });
});

router.get("/investments", async (req, res) => {
  await accrueProfits((req as AuthRequest).userId!);
  const { page = "1", perPage = "20", status } = req.query;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  const pg = paginate(Number(page), Number(perPage), await prisma.investment.count({ where }));
  const investments = await prisma.investment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: pg.skip,
    take: pg.perPage,
    include: { user: { select: { username: true, email: true } }, plan: true },
  });
  res.json({ investments, ...pg });
});

router.get("/plans", async (_req, res) => {
  const plans = await prisma.investmentPlan.findMany({ orderBy: { sortOrder: "asc" } });
  res.json({ plans });
});

const planSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    slug: z.string().min(2).optional(),
    description: z.string().min(5),
    minAmount: z.number().positive(),
    maxAmount: z.number().positive(),
    dailyReturn: z.number().positive(),
    durationDays: z.number().int().positive(),
    totalReturn: z.number().positive(),
    features: z.array(z.string()),
    popular: z.boolean().optional(),
    active: z.boolean().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    sortOrder: z.number().optional(),
  }),
});

router.post("/plans", validate(planSchema), async (req: AuthRequest, res) => {
  const plan = await prisma.investmentPlan.create({
    data: {
      ...req.body,
      slug: req.body.slug || req.body.name.toLowerCase().replace(/\s+/g, "-"),
    },
  });
  await log(req, "CREATE_PLAN", "InvestmentPlan", plan.id);
  res.status(201).json({ plan });
});

router.patch("/plans/:id", validate(planSchema.partial()), async (req: AuthRequest, res) => {
  const plan = await prisma.investmentPlan.update({ where: { id: routeId(req) }, data: req.body });
  await log(req, "UPDATE_PLAN", "InvestmentPlan", plan.id, req.body);
  res.json({ plan });
});

router.delete("/plans/:id", async (req: AuthRequest, res) => {
  await prisma.investmentPlan.delete({ where: { id: routeId(req) } });
  await log(req, "DELETE_PLAN", "InvestmentPlan", routeId(req));
  res.json({ ok: true });
});

router.get("/tickets", async (req, res) => {
  const { page = "1", perPage = "20", status } = req.query;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  const pg = paginate(Number(page), Number(perPage), await prisma.ticket.count({ where }));
  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip: pg.skip,
    take: pg.perPage,
    include: { user: { select: { username: true, email: true } }, _count: { select: { messages: true } } },
  });
  res.json({ tickets, ...pg });
});

router.get("/tickets/:id", async (req, res) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: routeId(req) },
    include: { user: { select: { username: true, email: true } }, messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { username: true, role: true } } } } },
  });
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  res.json({ ticket });
});

const ticketReplySchema = z.object({
  body: z.object({ message: z.string().min(1) }),
});

router.post("/tickets/:id/reply", validate(ticketReplySchema), async (req: AuthRequest, res) => {
  const ticket = await prisma.ticket.findUnique({ where: { id: routeId(req) } });
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  const message = await prisma.ticketMessage.create({
    data: { ticketId: ticket.id, senderId: req.userId, senderRole: "ADMIN", message: req.body.message },
  });
  await prisma.ticket.update({ where: { id: ticket.id }, data: { status: "PENDING", updatedAt: new Date() } });
  await prisma.notification.create({
    data: { userId: ticket.userId, title: "Support response", message: `Support replied to your ticket "${ticket.subject}"`, type: "info" },
  });
  await log(req, "REPLY_TICKET", "Ticket", ticket.id);
  res.json({ message });
});

router.post("/tickets/:id/status", validate(z.object({ body: z.object({ status: z.enum(["OPEN", "PENDING", "RESOLVED", "CLOSED"]) }) })), async (req: AuthRequest, res) => {
  await prisma.ticket.update({ where: { id: routeId(req) }, data: { status: req.body.status } });
  await log(req, "UPDATE_TICKET_STATUS", "Ticket", routeId(req), { status: req.body.status });
  res.json({ ok: true });
});

router.get("/referrals", async (req, res) => {
  const { page = "1", perPage = "20" } = req.query;
  const topReferrers = await prisma.user.findMany({
    where: { role: "USER" },
    orderBy: { totalReferralEarnings: "desc" },
    take: 20,
    select: { username: true, email: true, totalReferralEarnings: true, _count: { select: { referrals: true } } },
  });
  const pg = paginate(Number(page), Number(perPage), await prisma.user.count({ where: { referredById: { not: null } } }));
  const referralLinks = await prisma.user.findMany({
    where: { referredById: { not: null } },
    orderBy: { createdAt: "desc" },
    skip: pg.skip,
    take: pg.perPage,
    select: { id: true, username: true, email: true, createdAt: true, totalInvested: true, referredById: true, referredBy: { select: { username: true, email: true } } },
  });
  res.json({ topReferrers, referrals: referralLinks, ...pg });
});

const bannerSchema = z.object({
  body: z.object({
    title: z.string().min(2),
    subtitle: z.string().optional(),
    imageUrl: z.string().optional(),
    link: z.string().optional(),
    active: z.boolean().optional(),
    sortOrder: z.number().optional(),
  }),
});

router.get("/banners", async (_req, res) => {
  const banners = await prisma.banner.findMany({ orderBy: { sortOrder: "asc" } });
  res.json({ banners });
});

router.post("/banners", validate(bannerSchema), async (req: AuthRequest, res) => {
  const banner = await prisma.banner.create({ data: req.body });
  await log(req, "CREATE_BANNER", "Banner", banner.id);
  res.status(201).json({ banner });
});

router.patch("/banners/:id", validate(bannerSchema.partial()), async (req: AuthRequest, res) => {
  const banner = await prisma.banner.update({ where: { id: routeId(req) }, data: req.body });
  await log(req, "UPDATE_BANNER", "Banner", banner.id);
  res.json({ banner });
});

router.delete("/banners/:id", async (req: AuthRequest, res) => {
  await prisma.banner.delete({ where: { id: routeId(req) } });
  await log(req, "DELETE_BANNER", "Banner", routeId(req));
  res.json({ ok: true });
});

router.get("/settings", async (_req, res) => {
  const settings = await prisma.siteSetting.findMany({ where: { key: { not: { startsWith: "prefs:" } } } });
  res.json({ settings: Object.fromEntries(settings.map((s) => [s.key, s.value])) });
});

const settingsSchema = z.object({ body: z.record(z.string(), z.string()) });

router.patch("/settings", validate(settingsSchema), async (req: AuthRequest, res) => {
  await prisma.$transaction(
    Object.entries(req.body as Record<string, string>).map(([key, value]) =>
      prisma.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } })
    )
  );
  await log(req, "UPDATE_SETTINGS", "SiteSetting", undefined, Object.keys(req.body));
  res.json({ ok: true });
});

router.get("/reports", async (req, res) => {
  const days = Number(req.query.days || 30);
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);

  const [deposits, withdrawals, investments, newUsers, commissions] = await Promise.all([
    prisma.depositRequest.findMany({ where: { createdAt: { gte: since }, status: "COMPLETED" }, include: { user: { select: { username: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.withdrawal.findMany({ where: { createdAt: { gte: since }, status: "COMPLETED" }, include: { user: { select: { username: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.investment.findMany({ where: { createdAt: { gte: since } }, include: { user: { select: { username: true } }, plan: true }, orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({ where: { createdAt: { gte: since }, role: "USER" }, orderBy: { createdAt: "desc" } }),
    prisma.transaction.findMany({ where: { createdAt: { gte: since }, type: "REFERRAL_COMMISSION" }, orderBy: { createdAt: "desc" } }),
  ]);

  const totalDeposits = deposits.reduce((s, d) => s + d.amount, 0);
  const totalWithdrawals = withdrawals.reduce((s, w) => s + w.amount, 0);
  const totalInvested = investments.reduce((s, i) => s + i.amount, 0);
  const totalCommissions = commissions.reduce((s, c) => s + c.amount, 0);

  res.json({
    summary: { totalDeposits, totalWithdrawals, totalInvested, totalCommissions, newUsers: newUsers.length, days },
    deposits,
    withdrawals,
    investments,
    newUsers,
    commissions,
  });
});

router.get("/audit-logs", async (req, res) => {
  const { page = "1", perPage = "30", search } = req.query;
  const where: Record<string, unknown> = {};
  if (search) where.action = { contains: search as string, mode: "insensitive" };
  const pg = paginate(Number(page), Number(perPage), await prisma.auditLog.count({ where }));
  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: pg.skip,
    take: pg.perPage,
    include: { user: { select: { username: true, email: true } } },
  });
  res.json({ logs, ...pg });
});

export default router;
