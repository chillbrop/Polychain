import { Router, Request } from "express";
import { prisma } from "../prisma";
import { config } from "../config";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { accrueProfits } from "./investments";

const router = Router();
router.use(requireAuth);

// Build the base URL from the incoming request so referral links always
// point at the real deployed domain (not a stale NEXT_PUBLIC_SITE_URL
// like http://localhost:3000). Falls back to config.siteUrl.
function requestBaseUrl(req: Request) {
  // Browser requests include Origin, which is the public web app URL even
  // when this API is deployed on a separate service behind a rewrite.
  const origin = req.get("origin");
  if (origin) return origin.replace(/\/+$/, "");
  const host = req.get("x-forwarded-host") || req.get("host");
  if (host) {
    const proto = req.get("x-forwarded-proto") || (req.secure ? "https" : "http");
    return `${proto}://${host}`.replace(/\/+$/, "");
  }
  return config.siteUrl.replace(/\/+$/, "");
}

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
    referralLink: `${requestBaseUrl(req)}/register?ref=${user.referralCode}`,
    referralCode: user.referralCode,
    appName: config.appName,
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
