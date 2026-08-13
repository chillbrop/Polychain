import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { validate } from "../middleware/error";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { generateReference } from "../utils/helpers";

const router = Router();
router.use(requireAuth);

export async function accrueProfits(userId: string) {
  const now = new Date();
  const investments = await prisma.investment.findMany({
    where: { userId, status: "ACTIVE", endDate: { gt: now } },
    include: { plan: true },
  });

  for (const inv of investments) {
    const last = inv.lastAccruedAt ?? inv.startDate;
    const elapsedDays = Math.floor((now.getTime() - new Date(last).getTime()) / (24 * 3600 * 1000));
    if (elapsedDays <= 0) continue;

    const dailyProfit = inv.amount * (inv.dailyReturn / 100);
    const profit = dailyProfit * elapsedDays;
    const newEarned = Math.min(inv.totalReturn, inv.profitEarned + profit);

    await prisma.$transaction([
      prisma.investment.update({
        where: { id: inv.id },
        data: { profitEarned: newEarned, lastAccruedAt: now },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { profitBalance: { increment: newEarned - inv.profitEarned } },
      }),
      prisma.transaction.create({
        data: {
          userId,
          type: "PROFIT",
          amount: newEarned - inv.profitEarned,
          status: "COMPLETED",
          description: `Daily profit from ${inv.plan.name} plan`,
          reference: generateReference("PRF"),
        },
      }),
    ]);

    if (newEarned >= inv.totalReturn) {
      await prisma.$transaction([
        prisma.investment.update({ where: { id: inv.id }, data: { status: "COMPLETED", profitEarned: inv.totalReturn } }),
        prisma.user.update({ where: { id: userId }, data: { profitBalance: { increment: inv.totalReturn - newEarned } } }),
        prisma.transaction.create({
          data: {
            userId,
            type: "PROFIT",
            amount: inv.totalReturn - newEarned,
            status: "COMPLETED",
            description: `Final profit payout from ${inv.plan.name} plan`,
            reference: generateReference("PRF"),
          },
        }),
        prisma.notification.create({
          data: {
            userId,
            title: "Investment completed",
            message: `Your ${inv.plan.name} investment has matured. Total profit of $${inv.totalReturn.toFixed(2)} has been credited.`,
            type: "success",
          },
        }),
      ]);
    }
  }
}

router.get("/", async (req: AuthRequest, res) => {
  await accrueProfits(req.userId!);
  const [plans, investments, active, completed] = await Promise.all([
    prisma.investmentPlan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.investment.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "desc" }, include: { plan: true } }),
    prisma.investment.findMany({ where: { userId: req.userId, status: "ACTIVE" }, include: { plan: true } }),
    prisma.investment.findMany({ where: { userId: req.userId, status: "COMPLETED" }, include: { plan: true } }),
  ]);
  res.json({ plans, investments, active, completed });
});

const investSchema = z.object({
  body: z.object({
    planId: z.string().min(1),
    amount: z.number().positive("Amount must be positive"),
  }),
});

router.post("/", validate(investSchema), async (req: AuthRequest, res) => {
  await accrueProfits(req.userId!);
  const { planId, amount } = req.body;
  const plan = await prisma.investmentPlan.findUnique({ where: { id: planId } });
  if (!plan || !plan.active) return res.status(404).json({ error: "Investment plan not found" });
  if (amount < plan.minAmount || amount > plan.maxAmount) {
    return res.status(400).json({ error: `Amount must be between $${plan.minAmount} and $${plan.maxAmount} for this plan` });
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.walletBalance < amount) {
    return res.status(400).json({ error: "Insufficient wallet balance. Please deposit funds first." });
  }

  const endDate = new Date(Date.now() + plan.durationDays * 24 * 3600 * 1000);
  const investment = await prisma.$transaction(async (tx) => {
    const inv = await tx.investment.create({
      data: {
        userId: user.id,
        planId: plan.id,
        amount,
        dailyReturn: plan.dailyReturn,
        durationDays: plan.durationDays,
        totalReturn: plan.totalReturn,
        startDate: new Date(),
        endDate,
      },
    });
    await tx.user.update({ where: { id: user.id }, data: { walletBalance: { decrement: amount }, totalInvested: { increment: amount } } });
    await tx.transaction.create({
      data: {
        userId: user.id,
        type: "INVESTMENT",
        amount: -amount,
        status: "COMPLETED",
        description: `Invested in ${plan.name} plan`,
        reference: generateReference("INV"),
      },
    });
    await tx.activity.create({ data: { userId: user.id, action: `Invested $${amount} in ${plan.name}` } });
    return inv;
  });

  res.status(201).json({ investment, message: `Investment started. You will earn ${plan.dailyReturn}% daily for ${plan.durationDays} days.` });
});

router.get("/calculator", async (req: AuthRequest, res) => {
  const plans = await prisma.investmentPlan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  res.json({ plans });
});

router.get("/:id", async (req: AuthRequest, res) => {
  await accrueProfits(req.userId!);
  const investment = await prisma.investment.findFirst({
    where: { id: Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, userId: req.userId },
    include: { plan: true },
  });
  if (!investment) return res.status(404).json({ error: "Investment not found" });
  res.json({ investment });
});

export default router;
