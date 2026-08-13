import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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

function ref(prefix: string, n: number) {
  return `${prefix}${Math.random().toString(36).slice(2, 8).toUpperCase()}${n}`;
}

async function main() {
  const existingPlans = await prisma.investmentPlan.count();
  if (existingPlans === 0) {
    await prisma.investmentPlan.createMany({ data: plans });
    console.log("[seed] Seeded investment plans");
  }

  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || "admin@polychaincapital.example" },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || "admin@polychaincapital.example",
      username: "admin",
      passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || "Admin@12345", 12),
      firstName: "Polychain",
      lastName: "Admin",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
      kycStatus: "APPROVED",
      referralCode: "PCADMIN",
    },
  });
  console.log(`[seed] Admin ready: ${admin.email}`);

  const demoEmails = ["grace@example.com", "liam@example.com", "sofia@example.com", "omar@example.com"];
  const demo = await prisma.user.findMany({ where: { email: { in: demoEmails } }, select: { id: true } });
  if (demo.length > 0) {
    await prisma.user.deleteMany({ where: { email: { in: demoEmails } } });
    console.log(`[seed] Removed ${demo.length} existing demo users for a clean reseed`);
  }

  const hash = await bcrypt.hash("Password123!", 12);
  const demoUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: "grace@example.com",
        username: "grace",
        passwordHash: hash,
        firstName: "Grace",
        lastName: "Okafor",
        country: "Nigeria",
        phone: "+2348012345678",
        emailVerified: true,
        kycStatus: "APPROVED",
        referralCode: "NVGRACE",
        walletBalance: 1250,
        profitBalance: 430,
        totalDeposited: 3000,
        totalInvested: 2000,
        totalReferralEarnings: 120,
      },
    }),
    prisma.user.create({
      data: {
        email: "liam@example.com",
        username: "liam",
        passwordHash: hash,
        firstName: "Liam",
        lastName: "Chen",
        country: "United States",
        emailVerified: true,
        kycStatus: "APPROVED",
        referralCode: "NVLIAM",
        walletBalance: 840,
        profitBalance: 90,
        totalDeposited: 1500,
        totalInvested: 1000,
        referredById: undefined,
        totalReferralEarnings: 45,
      },
    }),
    prisma.user.create({
      data: {
        email: "sofia@example.com",
        username: "sofia",
        passwordHash: hash,
        firstName: "Sofia",
        lastName: "Marques",
        country: "Brazil",
        emailVerified: false,
        kycStatus: "NOT_SUBMITTED",
        referralCode: "NVSOFIA",
        walletBalance: 0,
        profitBalance: 0,
        totalDeposited: 0,
        totalInvested: 0,
      },
    }),
    prisma.user.create({
      data: {
        email: "omar@example.com",
        username: "omar",
        passwordHash: hash,
        firstName: "Omar",
        lastName: "Hassan",
        country: "Egypt",
        emailVerified: true,
        kycStatus: "PENDING",
        referralCode: "NVOMAR",
        walletBalance: 320,
        profitBalance: 15,
        totalDeposited: 500,
        totalInvested: 0,
      },
    }),
  ]);

  const [grace, liam] = demoUsers;
  const growthPlan = await prisma.investmentPlan.findFirst({ where: { slug: "growth" } });
  const starterPlan = await prisma.investmentPlan.findFirst({ where: { slug: "starter" } });

  if (growthPlan && starterPlan) {
    const now = Date.now();
    const days = 24 * 3600 * 1000;

    const graceInv = await prisma.investment.create({
      data: {
        userId: grace.id,
        planId: growthPlan.id,
        amount: 2000,
        dailyReturn: growthPlan.dailyReturn,
        durationDays: growthPlan.durationDays,
        totalReturn: growthPlan.totalReturn,
        status: "ACTIVE",
        profitEarned: 260,
        startDate: new Date(now - 13 * days),
        endDate: new Date(now + 7 * days),
        lastAccruedAt: new Date(now - days),
      },
    });

    const liamInv = await prisma.investment.create({
      data: {
        userId: liam.id,
        planId: starterPlan.id,
        amount: 1000,
        dailyReturn: starterPlan.dailyReturn,
        durationDays: starterPlan.durationDays,
        totalReturn: starterPlan.totalReturn,
        status: "COMPLETED",
        profitEarned: 225,
        startDate: new Date(now - 20 * days),
        endDate: new Date(now - 5 * days),
        lastAccruedAt: new Date(now - 5 * days),
      },
    });

    await prisma.depositRequest.createMany({
      data: [
        { userId: grace.id, amount: 2000, currency: "USDT_TRC20", status: "COMPLETED", txHash: `TX${ref("", 1)}`, createdAt: new Date(now - 13 * days), updatedAt: new Date(now - 13 * days) },
        { userId: grace.id, amount: 1000, currency: "BTC", status: "COMPLETED", txHash: `TX${ref("", 2)}`, createdAt: new Date(now - 30 * days), updatedAt: new Date(now - 30 * days) },
        { userId: liam.id, amount: 1500, currency: "USDT_TRC20", status: "COMPLETED", txHash: `TX${ref("", 3)}`, createdAt: new Date(now - 25 * days), updatedAt: new Date(now - 25 * days) },
        { userId: liam.id, amount: 500, currency: "ETH", status: "PENDING", txHash: `TX${ref("", 4)}`, createdAt: new Date(now - 1 * days), updatedAt: new Date(now - 1 * days) },
        { userId: admin.id, amount: 50000, currency: "USDT_TRC20", status: "COMPLETED", txHash: `TX${ref("", 5)}`, createdAt: new Date(now - 2 * days), updatedAt: new Date(now - 1 * days) },
      ],
    });

    await prisma.withdrawal.createMany({
      data: [
        { userId: grace.id, amount: 200, fee: 4, currency: "USDT_TRC20", address: "TUNh5ZqN8hVPF6x9rKh3HcvbQz6Y9pPj2X", status: "COMPLETED", createdAt: new Date(now - 6 * days) },
        { userId: grace.id, amount: 120, fee: 2.4, currency: "BTC", address: "bc1q5rzl3hvlkqvxlp6q9hnysd3zfkpkvt7w2l0kaf", status: "PENDING", createdAt: new Date(now - 0.2 * days) },
        { userId: liam.id, amount: 80, fee: 1.6, currency: "USDT_TRC20", address: "TUNh5ZqN8hVPF6x9rKh3HcvbQz6Y9pPj2X", status: "COMPLETED", createdAt: new Date(now - 3 * days) },
      ],
    });

    await prisma.transaction.createMany({
      data: [
        { userId: grace.id, type: "DEPOSIT", amount: 2000, status: "COMPLETED", description: "Deposit via USDT_TRC20", reference: ref("DPS", 1), createdAt: new Date(now - 13 * days) },
        { userId: grace.id, type: "INVESTMENT", amount: 2000, status: "COMPLETED", description: "Growth plan investment", reference: ref("INV", 2), createdAt: new Date(now - 13 * days) },
        { userId: grace.id, type: "PROFIT", amount: 260, status: "COMPLETED", description: "Accrued daily profits", reference: ref("PRF", 3), createdAt: new Date(now - 1 * days) },
        { userId: grace.id, type: "REFERRAL_COMMISSION", amount: 45, status: "COMPLETED", description: "Referral commission from liam", reference: ref("RFR", 4), createdAt: new Date(now - 4 * days) },
        { userId: grace.id, type: "WITHDRAWAL", amount: 200, fee: 4, status: "COMPLETED", description: "Withdrawal to USDT_TRC20", reference: ref("WDR", 5), createdAt: new Date(now - 6 * days) },
        { userId: liam.id, type: "DEPOSIT", amount: 1500, status: "COMPLETED", description: "Deposit via USDT_TRC20", reference: ref("DPS", 6), createdAt: new Date(now - 25 * days) },
        { userId: liam.id, type: "INVESTMENT", amount: 1000, status: "COMPLETED", description: "Starter plan investment", reference: ref("INV", 7), createdAt: new Date(now - 20 * days) },
      ],
    });

    await prisma.notification.createMany({
      data: [
        { userId: grace.id, title: "Deposit confirmed", message: "Your deposit of $2,000.00 has been confirmed.", type: "success", createdAt: new Date(now - 13 * days) },
        { userId: grace.id, title: "Daily profit accrued", message: "$20.00 was added to your profit balance today.", type: "info", createdAt: new Date(now - 1 * days) },
        { userId: liam.id, title: "Investment matured", message: "Your Starter investment completed and returned $1,225.00.", type: "success", createdAt: new Date(now - 5 * days) },
      ],
    });

    await prisma.ticket.create({
      data: {
        userId: grace.id,
        subject: "Verification of bank withdrawal",
        category: "Withdrawal",
        priority: "MEDIUM",
        status: "PENDING",
        messages: {
          create: [
            { senderRole: "USER", senderId: grace.id, message: "Hi, I'd like to confirm the status of my recent bank withdrawal request." },
            { senderRole: "ADMIN", senderId: admin.id, message: "Hi Grace, your request is being processed and will be completed within 24 hours." },
          ],
        },
      },
    });

    await prisma.activity.createMany({
      data: [
        { userId: grace.id, action: "Invested $2,000 in Growth", createdAt: new Date(now - 13 * days) },
        { userId: grace.id, action: "Submitted a withdrawal request", createdAt: new Date(now - 0.2 * days) },
        { userId: liam.id, action: "Completed Starter investment", createdAt: new Date(now - 5 * days) },
      ],
    });

    await prisma.siteSetting.createMany({
      data: [
        { key: "siteName", value: "Polychain Capital" },
        { key: "supportEmail", value: "support@polychaincapital.example" },
        { key: "minWithdraw", value: "10" },
        { key: "referralBonusPct", value: "10" },
        { key: "paystackUsdRate", value: process.env.PAYSTACK_USD_RATE || "0" },
        { key: "mpesaUsdRate", value: process.env.MPESA_USD_RATE || "0" },
      ],
      skipDuplicates: true,
    });

    void graceInv;
    void liamInv;
    console.log(`[seed] Created demo users: grace, liam, sofia, omar (password: Password123!)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
