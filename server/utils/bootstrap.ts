import bcrypt from "bcryptjs";
import { prisma } from "../prisma";
import { config } from "../config";
import { applyAutoStatus } from "./ipo";

export async function seedIpoOffering() {
  const existing = await prisma.ipo.findUnique({ where: { slug: "dangote-refinery-ipo" } });
  if (existing) {
    const next = applyAutoStatus(existing);
    if (next !== existing.status) {
      await prisma.ipo.update({ where: { id: existing.id }, data: { status: next as never } });
    }
    const sandbox = await prisma.siteSetting.findUnique({ where: { key: "ipoSandbox" } });
    if (!sandbox) {
      await prisma.siteSetting.create({ data: { key: "ipoSandbox", value: String(config.ipo.sandboxByDefault) } });
    }
    return;
  }

  const sandbox = config.ipo.sandboxByDefault;
  const draft = {
    slug: "dangote-refinery-ipo",
    name: "Dangote Petroleum Refinery IPO",
    issuer: "Dangote Refinery & Petrochemicals FZE",
    ticker: "DANREF",
    exchange: "Nigerian Exchange Ltd (NGX)",
    logoUrl: "",
    tagline: "Own a stake in Africa's largest single-train crude oil refinery.",
    overview:
      "Dangote Petroleum Refinery & Petrochemicals FZE operates a 650,000 barrels-per-day integrated refinery and petrochemical plant. This initial public offering offers retail investors in Nigeria the opportunity to subscribe to ordinary shares in one of the most significant industrial projects in sub-Saharan Africa.\n\nSubscription amounts are priced in Nigerian Naira and charged to your Polychain Capital wallet in US dollars at the prevailing platform rate. A minimum subscription of 10 shares (₦5,250) applies. Allocation of shares may be scaled in the event of oversubscription and any unallocated amounts are refunded in full.",
    keyFacts: [
      { label: "Price per share", value: "₦525" },
      { label: "Total offering size", value: "4,100,000,000 shares" },
      { label: "Minimum investment", value: "10 shares (₦5,250)" },
      { label: "Offer period", value: "Sep 14 – Oct 13, 2026" },
      { label: "Over-allotment (greenshoe)", value: "30%" },
      { label: "Settlement / listing", value: "NGX (expected)" },
    ],
    riskDisclaimers:
      "Investing in an initial public offering involves significant risk. Share prices may fall as well as rise and past performance is not a guide to future returns. Allocation of shares is not guaranteed and oversubscribed offers may be scaled or pro-rated. This page is for information only and does not constitute an offer, solicitation, or investment advice. Figures shown must be verified against the official prospectus before any real-money decision.",
    pricePerShare: 525,
    totalShares: 4_100_000_000,
    minimumShares: 10,
    maximumShares: null,
    greenshoePct: 30,
    feePct: 0,
    currency: "NGN",
    openDate: new Date("2026-09-14T09:00:00Z"),
    closeDate: new Date("2026-10-13T17:00:00Z"),
    allotmentDate: null,
    listingDate: null,
    published: true,
    sandbox,
  };
  const created = await prisma.ipo.create({ data: draft as never, include: { applications: { take: 1 } } });
  const status = applyAutoStatus(created);
  await prisma.ipo.update({ where: { id: created.id }, data: { status: status as never } });
  await prisma.siteSetting.create({ data: { key: "ipoSandbox", value: String(sandbox) } });
  console.log(`[bootstrap] Seeded Dangote Refinery IPO (id ${created.id}, sandbox=${sandbox})`);
}

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
