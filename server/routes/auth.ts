import { Router, Request } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "../prisma";
import { config } from "../config";
import { validate } from "../middleware/error";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { generateReferralCode, sanitizeUser } from "../utils/helpers";
import { sendMail, verificationEmail, resetEmail, mailConfigured } from "../utils/mail";

const router = Router();

function requestOrigin(req: Request) {
  const host = req.get("x-forwarded-host") || req.get("host");
  if (host) {
    const proto = req.get("x-forwarded-proto") || (req.secure ? "https" : "http");
    return `${proto}://${host}`;
  }
  return config.siteUrl.replace(/\/+$/, "");
}

const registerSchema = z.object({
  body: z.object({
    email: z.string().email("Enter a valid email address"),
    username: z.string().min(3, "Username must be at least 3 characters").max(24).regex(/^[a-zA-Z0-9_.]+$/, "Letters, numbers, underscore, dot only"),
    password: z.string().min(8, "Password must be at least 8 characters").max(100),
    confirmPassword: z.string(),
    referralCode: z.string().optional(),
  }).refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] }),
});

router.post("/register", validate(registerSchema), async (req, res) => {
  const { email, username, password, referralCode } = req.body;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    return res.status(409).json({ error: existing.email === email ? "Email already registered" : "Username already taken" });
  }

  let referredBy: string | undefined;
  if (referralCode) {
    const referrer = await prisma.user.findUnique({ where: { referralCode: referralCode.toUpperCase() } });
    if (referrer) referredBy = referrer.id;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      username,
      passwordHash,
      referredById: referredBy,
      referralCode: generateReferralCode(),
    },
  });

  const token = randomBytes(32).toString("hex");
  await prisma.emailVerificationToken.create({
    data: { userId: user.id, token, expiresAt: new Date(Date.now() + 24 * 3600 * 1000) },
  });
  const url = `${requestOrigin(req)}/verify?token=${token}`;
  const mail = verificationEmail(username, url);
  await sendMail(user.email, mail.subject, mail.html);

  const accessToken = signAccessToken({ userId: user.id, role: user.role, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id, role: user.role, email: user.email });
  await prisma.refreshToken.create({
    data: { userId: user.id, token: randomBytes(48).toString("hex"), expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000) },
  });

  res.cookie("nv_access", accessToken, { httpOnly: true, secure: config.cookieSecure, sameSite: "lax", maxAge: 7 * 24 * 3600 * 1000 });
  res.status(201).json({
    user: sanitizeUser(user),
    message: "Account created. Check your email to verify your account.",
    ...(mailConfigured ? {} : { devVerificationUrl: url }),
  });
});

const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(3),
    password: z.string().min(1),
    remember: z.boolean().optional(),
    twoFactorCode: z.string().optional(),
  }),
});

router.post("/login", validate(loginSchema), async (req, res) => {
  const { identifier, password } = req.body;
  const cleanedIdentifier = String(identifier || "").trim();
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: cleanedIdentifier.toLowerCase() }, { username: cleanedIdentifier }] },
  });

  const fail = () => res.status(401).json({ error: "Invalid email/username or password" });
  if (!user) return fail();

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    await prisma.loginAttempt.create({ data: { userId: user.id, success: false, ip: req.ip, userAgent: req.get("user-agent") } });
    return fail();
  }

  if (user.status === "SUSPENDED") {
    return res.status(403).json({ error: "This account has been suspended. Contact support." });
  }

  await prisma.loginAttempt.create({ data: { userId: user.id, success: true, ip: req.ip, userAgent: req.get("user-agent") } });

  const accessToken = signAccessToken({ userId: user.id, role: user.role, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id, role: user.role, email: user.email });
  const stored = randomBytes(48).toString("hex");
  await prisma.refreshToken.create({
    data: { userId: user.id, token: stored, expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000) },
  });

  res.cookie("nv_access", accessToken, { httpOnly: true, secure: config.cookieSecure, sameSite: "lax", maxAge: 7 * 24 * 3600 * 1000 });
  res.cookie("nv_refresh", stored, { httpOnly: true, secure: config.cookieSecure, sameSite: "lax", maxAge: 30 * 24 * 3600 * 1000 });

  res.json({
    user: sanitizeUser(user),
    requiresTwoFactor: false,
    message: user.emailVerified ? "Welcome back" : "Please verify your email to unlock all features",
  });
});

router.post("/refresh", async (req, res) => {
  const token = req.cookies?.nv_refresh;
  if (!token) return res.status(401).json({ error: "No refresh token" });

  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    return res.status(401).json({ error: "Session expired" });
  }
  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user || user.status === "SUSPENDED") return res.status(401).json({ error: "Account unavailable" });

  const accessToken = signAccessToken({ userId: user.id, role: user.role, email: user.email });
  res.cookie("nv_access", accessToken, { httpOnly: true, secure: config.cookieSecure, sameSite: "lax", maxAge: 7 * 24 * 3600 * 1000 });
  res.json({ ok: true });
});

router.post("/logout", requireAuth, async (req: AuthRequest, res) => {
  const token = req.cookies?.nv_refresh;
  if (token) {
    await prisma.refreshToken.updateMany({ where: { token }, data: { revoked: true } });
  }
  res.clearCookie("nv_access");
  res.clearCookie("nv_refresh");
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { wallets: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: sanitizeUser(user) });
});

const verifySchema = z.object({ body: z.object({ token: z.string().min(10) }) });

router.post("/verify-email", validate(verifySchema), async (req, res) => {
  const { token } = req.body;
  const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!record || record.expiresAt < new Date()) {
    return res.status(400).json({ error: "Verification link is invalid or has expired" });
  }
  await prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } });
  await prisma.emailVerificationToken.delete({ where: { id: record.id } });
  res.json({ ok: true, message: "Email verified successfully. You can now invest." });
});

router.post("/resend-verification", validate(z.object({ body: z.object({ email: z.string().email() }) })), async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return res.json({ ok: true });
  await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });
  const token = randomBytes(32).toString("hex");
  await prisma.emailVerificationToken.create({ data: { userId: user.id, token, expiresAt: new Date(Date.now() + 24 * 3600 * 1000) } });
  const url = `${requestOrigin(req)}/verify?token=${token}`;
  const mail = verificationEmail(user.username, url);
  await sendMail(user.email, mail.subject, mail.html);
  res.json({ ok: true, message: "Verification email sent", ...(mailConfigured ? {} : { devVerificationUrl: url }) });
});

const forgotSchema = z.object({ body: z.object({ email: z.string().email() }) });

router.post("/forgot-password", validate(forgotSchema), async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (user) {
    const token = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
    const url = `${requestOrigin(req)}/reset-password?token=${token}`;
    const mail = resetEmail(user.username, url);
    await sendMail(user.email, mail.subject, mail.html);
    if (!mailConfigured) return res.json({ ok: true, message: "If an account exists for that email, a reset link has been sent.", devResetUrl: url });
  }
  res.json({ ok: true, message: "If an account exists for that email, a reset link has been sent." });
});

const resetSchema = z.object({
  body: z.object({
    token: z.string().min(10),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  }).refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] }),
});

router.post("/reset-password", validate(resetSchema), async (req, res) => {
  const { token, password } = req.body;
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.expiresAt < new Date()) {
    return res.status(400).json({ error: "Reset link is invalid or has expired" });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: record.userId }, data: { passwordHash } });
  await prisma.passwordResetToken.delete({ where: { id: record.id } });
  await prisma.refreshToken.updateMany({ where: { userId: record.userId }, data: { revoked: true } });
  res.json({ ok: true, message: "Password updated. You can now sign in." });
});

router.post("/change-password", requireAuth, validate(z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  }),
})), async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "User not found" });
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return res.status(400).json({ error: "Current password is incorrect" });
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  await prisma.refreshToken.updateMany({ where: { userId: user.id }, data: { revoked: true } });
  res.json({ ok: true, message: "Password changed successfully" });
});

export default router;
