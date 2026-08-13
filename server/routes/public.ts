import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { config } from "../config";
import { validate } from "../middleware/error";
import { generateReference } from "../utils/helpers";

const router = Router();

router.get("/home", async (_req, res) => {
  const [plans, totalUsers, totalDeposited, totalWithdrawn, recentDeposits, recentWithdrawals, banners, settings] = await Promise.all([
    prisma.investmentPlan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.user.count({ where: { emailVerified: true } }),
    prisma.depositRequest.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
    prisma.withdrawal.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
    prisma.depositRequest.findMany({
      where: { status: "COMPLETED" },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { user: { select: { username: true } } },
    }),
    prisma.withdrawal.findMany({
      where: { status: "COMPLETED" },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { user: { select: { username: true } } },
    }),
    prisma.banner.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.siteSetting.findMany(),
  ]);

  const settingMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  res.json({
    plans,
    stats: {
      totalUsers,
      totalDeposited: totalDeposited._sum.amount ?? 0,
      totalWithdrawn: totalWithdrawn._sum.amount ?? 0,
    },
    recentDeposits,
    recentWithdrawals,
    banners,
    settings: settingMap,
  });
});

const newsletterSchema = z.object({ body: z.object({ email: z.string().email() }) });

router.post("/newsletter", validate(newsletterSchema), async (req, res) => {
  const { email } = req.body;
  await prisma.siteSetting.upsert({
    where: { key: `subscriber:${email}` },
    create: { key: `subscriber:${email}`, value: "subscribed" },
    update: { value: "subscribed" },
  });
  res.json({ ok: true, message: "Subscribed to Polychain Capital updates. Welcome aboard!" });
});

const contactSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    subject: z.string().min(3),
    message: z.string().min(10),
  }),
});

router.post("/contact", validate(contactSchema), async (req, res) => {
  const { name, email, subject, message } = req.body;
  const ticket = await prisma.ticket.create({
    data: {
      subject: `[Contact] ${subject}`,
      category: "Contact",
      messages: { create: { message, senderRole: "USER", senderId: null } },
      user: {
        connectOrCreate: {
          where: { email: email.toLowerCase() },
          create: {
            email: email.toLowerCase(),
            username: `guest_${Date.now().toString(36)}`,
            passwordHash: "$2a$12$invalidguest",
            referralCode: `NVGUEST${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          },
        },
      },
    },
  });
  res.status(201).json({ ok: true, message: "Message received. Our team will respond within 24 hours.", ticketId: ticket.id });
});

router.get("/plans", async (_req, res) => {
  const plans = await prisma.investmentPlan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  res.json({ plans });
});

export default router;
