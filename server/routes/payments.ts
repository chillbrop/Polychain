import { createHmac, timingSafeEqual } from "crypto";
import { Router, Request, Response } from "express";
import { z } from "zod";
import { config } from "../config";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/error";
import { prisma } from "../prisma";
import { generateReference } from "../utils/helpers";

const router = Router();

type PaymentRecord = {
  id: string;
  userId: string;
  reference: string;
  provider: "PAYSTACK" | "MPESA";
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
  amount: number;
  currency: string;
  exchangeRate: number;
  creditedAmount: number;
};

function paymentConfigurationError(provider: "Paystack" | "M-Pesa") {
  return { error: `${provider} is not configured. Ask an administrator to add the required payment environment variables.` };
}

function requireRate(rate: number) {
  return Number.isFinite(rate) && rate > 0;
}

async function configuredRate(settingKey: string, environmentFallback: number) {
  const setting = await prisma.siteSetting.findUnique({ where: { key: settingKey } });
  const rate = setting ? Number(setting.value) : environmentFallback;
  return requireRate(rate) ? rate : null;
}

async function creditPayment(payment: PaymentRecord, metadata?: object) {
  if (payment.status === "COMPLETED") return false;

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "COMPLETED", paidAt: new Date(), ...(metadata ? { metadata } : {}) },
    });
    if (claimed.count === 0) return false;

    await tx.user.update({
      where: { id: payment.userId },
      data: {
        walletBalance: { increment: payment.creditedAmount },
        totalDeposited: { increment: payment.creditedAmount },
      },
    });
    await tx.transaction.create({
      data: {
        userId: payment.userId,
        type: "DEPOSIT",
        amount: payment.creditedAmount,
        status: "COMPLETED",
        description: `${payment.provider === "PAYSTACK" ? "Paystack" : "M-Pesa"} payment (${payment.amount} ${payment.currency})`,
        reference: payment.reference,
        metadata: {
          provider: payment.provider,
          nativeAmount: payment.amount,
          nativeCurrency: payment.currency,
          exchangeRate: payment.exchangeRate,
        },
      },
    });
    await tx.notification.create({
      data: {
        userId: payment.userId,
        title: "Payment confirmed",
        message: `Your payment was confirmed and $${payment.creditedAmount.toFixed(2)} was added to your wallet.`,
        type: "success",
      },
    });
    await tx.activity.create({ data: { userId: payment.userId, action: `Completed ${payment.provider === "PAYSTACK" ? "Paystack" : "M-Pesa"} deposit` } });
    return true;
  });
}

async function verifyPaystack(reference: string) {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${config.payments.paystackSecretKey}` },
  });
  const result = await response.json() as { status?: boolean; message?: string; data?: { status?: string; amount?: number; currency?: string; reference?: string } };
  if (!response.ok || !result.status || !result.data) {
    throw new Error(result.message || "Unable to verify the Paystack payment");
  }
  return result.data;
}

router.post("/paystack/webhook", async (req: Request & { rawBody?: Buffer }, res: Response) => {
  const signature = req.get("x-paystack-signature") || "";
  const body = req.rawBody;
  if (!body || !config.payments.paystackSecretKey || !signature) return res.status(400).json({ error: "Invalid webhook" });
  const expected = createHmac("sha512", config.payments.paystackSecretKey).update(body).digest("hex");
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

  const event = req.body as { event?: string; data?: { reference?: string } };
  if (event.event !== "charge.success" || !event.data?.reference) return res.sendStatus(200);

  try {
    const payment = await prisma.payment.findUnique({ where: { reference: event.data.reference } });
    if (!payment || payment.provider !== "PAYSTACK") return res.sendStatus(200);
    const verified = await verifyPaystack(payment.reference);
    if (verified.status !== "success" || verified.amount !== Math.round(payment.amount * 100) || verified.currency !== payment.currency) {
      return res.status(400).json({ error: "Payment verification did not match the expected amount" });
    }
    await creditPayment(payment, { paystackReference: verified.reference, verifiedBy: "webhook" });
    return res.sendStatus(200);
  } catch (error) {
    console.error("[payments] Paystack webhook failed", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
});

const usdAmountSchema = z.object({ body: z.object({ amount: z.number().positive().max(1_000_000) }) });

router.post("/paystack/initialize", requireAuth, validate(usdAmountSchema), async (req: AuthRequest, res) => {
  const settings = config.payments;
  const exchangeRate = await configuredRate("paystackUsdRate", settings.paystackUsdRate);
  if (!settings.paystackSecretKey || !exchangeRate) {
    return res.status(503).json(paymentConfigurationError("Paystack"));
  }
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const nativeAmount = Math.round(req.body.amount * exchangeRate * 100) / 100;
  const creditedAmount = nativeAmount / exchangeRate;
  const reference = generateReference("PSK");
  const payment = await prisma.payment.create({
    data: { userId: user.id, provider: "PAYSTACK", reference, amount: nativeAmount, currency: settings.paystackCurrency, exchangeRate, creditedAmount },
  });

  try {
    const callbackUrl = `${config.siteUrl}/wallet?payment=paystack&reference=${encodeURIComponent(reference)}`;
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${settings.paystackSecretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, amount: Math.round(nativeAmount * 100), currency: settings.paystackCurrency, reference, callback_url: callbackUrl, metadata: JSON.stringify({ paymentId: payment.id, userId: user.id }) }),
    });
    const result = await response.json() as { status?: boolean; message?: string; data?: { authorization_url?: string } };
    if (!response.ok || !result.status || !result.data?.authorization_url) throw new Error(result.message || "Could not start Paystack checkout");
    res.status(201).json({ reference, authorizationUrl: result.data.authorization_url, amount: nativeAmount, currency: settings.paystackCurrency, creditedAmount });
  } catch (error) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    res.status(502).json({ error: error instanceof Error ? error.message : "Could not start Paystack checkout" });
  }
});

router.post("/paystack/verify", requireAuth, validate(z.object({ body: z.object({ reference: z.string().min(6) }) })), async (req: AuthRequest, res) => {
  const payment = await prisma.payment.findFirst({ where: { reference: req.body.reference, userId: req.userId, provider: "PAYSTACK" } });
  if (!payment) return res.status(404).json({ error: "Payment not found" });
  if (payment.status === "COMPLETED") return res.json({ ok: true, creditedAmount: payment.creditedAmount, alreadyCompleted: true });

  try {
    const verified = await verifyPaystack(payment.reference);
    if (verified.status !== "success") return res.status(409).json({ error: "Payment has not completed yet" });
    if (verified.amount !== Math.round(payment.amount * 100) || verified.currency !== payment.currency) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED", metadata: { reason: "Verification amount or currency mismatch" } } });
      return res.status(400).json({ error: "Payment amount or currency did not match" });
    }
    await creditPayment(payment, { paystackReference: verified.reference, verifiedBy: "client" });
    res.json({ ok: true, creditedAmount: payment.creditedAmount });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "Unable to verify Paystack payment" });
  }
});

function normalizeKenyanPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  throw new Error("Enter a valid Kenyan M-Pesa number (for example, 0712 345 678)");
}

async function getMpesaAccessToken() {
  const { mpesaBaseUrl, mpesaConsumerKey, mpesaConsumerSecret } = config.payments;
  const credentials = Buffer.from(`${mpesaConsumerKey}:${mpesaConsumerSecret}`).toString("base64");
  const response = await fetch(`${mpesaBaseUrl.replace(/\/+$/, "")}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  const result = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !result.access_token) throw new Error(result.error_description || "Unable to authenticate with M-Pesa");
  return result.access_token;
}

router.post("/mpesa/stk-push", requireAuth, validate(z.object({ body: z.object({ amount: z.number().positive().max(1_000_000), phone: z.string().min(9) }) })), async (req: AuthRequest, res) => {
  const settings = config.payments;
  const exchangeRate = await configuredRate("mpesaUsdRate", settings.mpesaUsdRate);
  if (!settings.mpesaConsumerKey || !settings.mpesaConsumerSecret || !settings.mpesaShortCode || !settings.mpesaPasskey || !settings.mpesaCallbackUrl || !exchangeRate) {
    return res.status(503).json(paymentConfigurationError("M-Pesa"));
  }
  let phone: string;
  try { phone = normalizeKenyanPhone(req.body.phone); } catch (error) { return res.status(400).json({ error: (error as Error).message }); }

  const nativeAmount = Math.max(1, Math.round(req.body.amount * exchangeRate));
  const creditedAmount = nativeAmount / exchangeRate;
  const reference = generateReference("MPS");
  const payment = await prisma.payment.create({
    data: { userId: req.userId!, provider: "MPESA", reference, amount: nativeAmount, currency: "KES", exchangeRate, creditedAmount, phone },
  });

  try {
    const token = await getMpesaAccessToken();
    const now = new Date();
    const timestamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}${String(now.getUTCHours()).padStart(2, "0")}${String(now.getUTCMinutes()).padStart(2, "0")}${String(now.getUTCSeconds()).padStart(2, "0")}`;
    const password = Buffer.from(`${settings.mpesaShortCode}${settings.mpesaPasskey}${timestamp}`).toString("base64");
    const response = await fetch(`${settings.mpesaBaseUrl.replace(/\/+$/, "")}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ BusinessShortCode: settings.mpesaShortCode, Password: password, Timestamp: timestamp, TransactionType: "CustomerPayBillOnline", Amount: nativeAmount, PartyA: phone, PartyB: settings.mpesaShortCode, PhoneNumber: phone, CallBackURL: settings.mpesaCallbackUrl, AccountReference: settings.mpesaAccountReference, TransactionDesc: "Polychain Capital wallet deposit" }),
    });
    const result = await response.json() as { ResponseCode?: string; ResponseDescription?: string; CheckoutRequestID?: string; MerchantRequestID?: string; errorMessage?: string };
    if (!response.ok || result.ResponseCode !== "0" || !result.CheckoutRequestID) throw new Error(result.errorMessage || result.ResponseDescription || "M-Pesa could not start the payment prompt");
    await prisma.payment.update({ where: { id: payment.id }, data: { providerReference: result.CheckoutRequestID, metadata: { merchantRequestId: result.MerchantRequestID } } });
    res.status(201).json({ reference, checkoutRequestId: result.CheckoutRequestID, amount: nativeAmount, currency: "KES", creditedAmount, paybill: settings.mpesaShortCode, accountReference: settings.mpesaAccountReference, message: `Confirm the prompt on your phone. The payment is charged to Paybill ${settings.mpesaShortCode}, account ${settings.mpesaAccountReference}.` });
  } catch (error) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    res.status(502).json({ error: error instanceof Error ? error.message : "Could not start M-Pesa payment" });
  }
});

router.post("/mpesa/callback", async (req, res) => {
  const callback = req.body?.Body?.stkCallback as { CheckoutRequestID?: string; ResultCode?: number; ResultDesc?: string; CallbackMetadata?: { Item?: Array<{ Name?: string; Value?: string | number }> } } | undefined;
  if (!callback?.CheckoutRequestID) return res.status(400).json({ error: "Invalid M-Pesa callback" });
  const payment = await prisma.payment.findFirst({ where: { provider: "MPESA", providerReference: callback.CheckoutRequestID } });
  if (!payment || payment.status === "COMPLETED") return res.json({ ResultCode: 0, ResultDesc: "Accepted" });

  const items = callback.CallbackMetadata?.Item ?? [];
  const nativeAmount = Number(items.find((item) => item.Name === "Amount")?.Value);
  const receipt = items.find((item) => item.Name === "MpesaReceiptNumber")?.Value;
  if (callback.ResultCode === 0 && nativeAmount === payment.amount) {
    await creditPayment(payment, { mpesaReceipt: receipt, resultDescription: callback.ResultDesc, callback: req.body });
  } else {
    await prisma.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "FAILED", metadata: { resultCode: callback.ResultCode, resultDescription: callback.ResultDesc, callback: req.body } } });
  }
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

router.get("/history", requireAuth, async (req: AuthRequest, res) => {
  const payments = await prisma.payment.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "desc" }, take: 50 });
  res.json({ payments });
});

export default router;
