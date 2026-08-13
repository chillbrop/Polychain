import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  mailFrom: process.env.MAIL_FROM || "Polychain Capital <no-reply@polychaincapital.example>",
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
  adminEmail: process.env.ADMIN_EMAIL || "admin@polychaincapital.example",
  adminPassword: process.env.ADMIN_PASSWORD || "Admin@12345",
  wallets: {
    USDT_TRC20: process.env.USDT_TRC20_ADDRESS || "TUNh5ZqN8hVPF6x9rKh3HcvbQz6Y9pPj2X",
    BTC: process.env.BTC_ADDRESS || "bc1q5rzl3hvlkqvxlp6q9hnysd3zfkpkvt7w2l0kaf",
    ETH: process.env.ETH_ADDRESS || "0x5F4f7f9C2fB3e5a9C6b1aE8f9a4B3c2D1e0F9a8b",
  },
  referralBonusPct: 10,
  dailyAccrualEnabled: true,
  payments: {
    paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || "",
    paystackCurrency: process.env.PAYSTACK_CURRENCY || "NGN",
    paystackUsdRate: parseFloat(process.env.PAYSTACK_USD_RATE || "0"),
    mpesaConsumerKey: process.env.MPESA_CONSUMER_KEY || "",
    mpesaConsumerSecret: process.env.MPESA_CONSUMER_SECRET || "",
    mpesaShortCode: process.env.MPESA_SHORT_CODE || "",
    mpesaAccountReference: process.env.MPESA_ACCOUNT_REFERENCE || "0795911898",
    mpesaPasskey: process.env.MPESA_PASSKEY || "",
    mpesaCallbackUrl: process.env.MPESA_CALLBACK_URL || "",
    mpesaBaseUrl: process.env.MPESA_BASE_URL || "https://sandbox.safaricom.co.ke",
    mpesaUsdRate: parseFloat(process.env.MPESA_USD_RATE || "0"),
  },
};
