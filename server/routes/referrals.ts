import { Router } from "express";
import { prisma } from "../prisma";
import { config } from "../config";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { accrueProfits } from "./investments";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const [referrals, referralTransactions, allTransactions] = await Promise.all([
    prisma.user.findMany({
      where: { referredById: userId },
      select: { id: true, username: true, email: true, avatarUrl: true, createdAt: true, totalInvested: true, kycStatus: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.transaction.findMany({
      where: { userId, type: "REFERRAL_COMMISSION" },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.transaction.findMany({ where: { userId, type: "REFERRAL_COMMISSION" }, select: { amount: true } }),
  ]);

  const totalCommission = allTransactions.reduce((sum, t) => sum + t.amount, 0);

  res.json({
    referralLink: `${config.siteUrl}/register?ref=${user.referralCode}`,
    referralCode: user.referralCode,
    totalReferrals: referrals.length,
    activeReferrals: referrals.filter((r) => r.totalInvested > 0).length,
    totalCommission,
    referralBonusPct: config.referralBonusPct,
    referrals,
    transactions: referralTransactions,
  });
});

router.post("/notify-invite", async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "User not found" });
  await prisma.activity.create({ data: { userId: user.id, action: `Copied referral link ${user.referralCode}` } });
  res.json({ ok: true });
});

export default router;
