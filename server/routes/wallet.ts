import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { config } from "../config";
import { validate } from "../middleware/error";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { generateReference } from "../utils/helpers";

const router = Router();
router.use(requireAuth);

router.get("/summary", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const [user, deposits, withdrawals] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, include: { wallets: true } }),
    prisma.depositRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.withdrawal.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  res.json({ user: user && { ...user, passwordHash: undefined, twoFactorSecret: undefined }, deposits, withdrawals, walletAddresses: config.wallets });
});

const depositSchema = z.object({
  body: z.object({
    amount: z.number().positive("Deposit amount must be positive").max(1000000),
    currency: z.enum(["USDT_TRC20", "BTC", "ETH"]).default("USDT_TRC20"),
    txHash: z.string().optional(),
  }),
});

router.post("/deposit", validate(depositSchema), async (req: AuthRequest, res) => {
  const { amount, currency, txHash } = req.body;
  const deposit = await prisma.depositRequest.create({
    data: { userId: req.userId!, amount, currency, txHash, status: "PENDING" },
  });
  await prisma.activity.create({ data: { userId: req.userId!, action: `Submitted $${amount} deposit request` } });
  res.status(201).json({ deposit, address: config.wallets[currency as keyof typeof config.wallets], message: "Deposit request submitted. Send the funds to the wallet address shown and it will be credited once confirmed." });
});

const withdrawSchema = z.object({
  body: z.object({
    amount: z.number().positive("Withdrawal amount must be positive"),
    currency: z.enum(["USDT_TRC20", "BTC", "ETH"]).default("USDT_TRC20"),
    address: z.string().min(10, "Enter a valid wallet address"),
  }),
});

router.post("/withdraw", validate(withdrawSchema), async (req: AuthRequest, res) => {
  const { amount, currency, address } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "User not found" });

  if (amount < 10) return res.status(400).json({ error: "Minimum withdrawal is $10" });

  const fee = Math.max(1, amount * 0.02);
  const total = amount + fee;
  if (user.profitBalance < total && user.walletBalance < total) {
    return res.status(400).json({ error: "Insufficient balance for this withdrawal" });
  }

  const useProfit = user.profitBalance >= total;
  const withdrawal = await prisma.$transaction(async (tx) => {
    const w = await tx.withdrawal.create({
      data: { userId: user.id, amount, fee, currency, address, status: "PENDING" },
    });
    if (useProfit) {
      await tx.user.update({ where: { id: user.id }, data: { profitBalance: { decrement: total } } });
    } else {
      await tx.user.update({ where: { id: user.id }, data: { walletBalance: { decrement: total } } });
    }
    await tx.transaction.create({
      data: {
        userId: user.id,
        type: "WITHDRAWAL",
        amount: -amount,
        fee,
        status: "PENDING",
        description: `Withdrawal to ${address.slice(0, 8)}...`,
        reference: generateReference("WDR"),
      },
    });
    await tx.activity.create({ data: { userId: user.id, action: `Requested withdrawal of $${amount}` } });
    return w;
  });

  res.status(201).json({ withdrawal, message: "Withdrawal request submitted for processing." });
});

router.get("/history", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const [transactions, deposits, withdrawals] = await Promise.all([
    prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.depositRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.withdrawal.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  res.json({ transactions, deposits, withdrawals });
});

export default router;
