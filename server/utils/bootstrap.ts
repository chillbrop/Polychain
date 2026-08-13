import bcrypt from "bcryptjs";
import { prisma } from "../prisma";
import { config } from "../config";

export async function seedPlans() {
  const count = await prisma.investmentPlan.count();
  if (count > 0) return;

  const plans = [
    {
      name: "Starter",
      slug: "starter",
      description: "Begin your Polychain Capital journey with a low-risk entry point.",
      minAmount: 25,
      maxAmount: 499,
      dailyReturn: 1.5,
      durationDays: 15,
      totalReturn: 22.5,
      features: ["Daily profit accrual", "Instant principal return", "Standard support", "Referral rewards"],
      popular: false,
      icon: "Rocket",
      color: "#38BDF8",
      sortOrder: 1,
    },
    {
      name: "Growth",
      slug: "growth",
      description: "Balanced growth plan for steady, compounding returns.",
      minAmount: 500,
      maxAmount: 4999,
      dailyReturn: 2.0,
      durationDays: 20,
      totalReturn: 40,
      features: ["Daily profit accrual", "Compounding option", "Priority support", "Referral rewards", "Loyalty bonus"],
      popular: true,
      icon: "TrendingUp",
      color: "#F4B400",
      sortOrder: 2,
    },
    {
      name: "Pro",
      slug: "pro",
      description: "Serious capital for serious investors. Maximum returns.",
      minAmount: 5000,
      maxAmount: 49999,
      dailyReturn: 2.5,
      durationDays: 30,
      totalReturn: 75,
      features: ["Daily profit accrual", "Compounding option", "Dedicated account manager", "VIP support", "Referral rewards", "Withdrawal priority"],
      popular: false,
      icon: "Diamond",
      color: "#A78BFA",
      sortOrder: 3,
    },
    {
      name: "Institutional",
      slug: "institutional",
      description: "Tailored strategies for funds and institutional partners.",
      minAmount: 50000,
      maxAmount: 1000000,
      dailyReturn: 3.0,
      durationDays: 30,
      totalReturn: 90,
      features: ["Daily profit accrual", "Custom strategies", "Dedicated account manager", "VIP support", "Referral rewards", "Quarterly reporting", "API access"],
      popular: false,
      icon: "Landmark",
      color: "#34D399",
      sortOrder: 4,
    },
  ];

  await prisma.investmentPlan.createMany({ data: plans });
  console.log("[bootstrap] Seeded investment plans");
}

export async function ensureAdmin() {
  const existing = await prisma.user.findUnique({ where: { email: config.adminEmail } });
  if (existing) return;

  const passwordHash = await bcrypt.hash(config.adminPassword, 12);
  await prisma.user.create({
    data: {
      email: config.adminEmail,
      username: "admin",
      passwordHash,
      firstName: "Polychain",
      lastName: "Admin",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
      kycStatus: "APPROVED",
      referralCode: `NVADMIN${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      walletBalance: 0,
    },
  });
  console.log(`[bootstrap] Created admin account ${config.adminEmail}`);
}
