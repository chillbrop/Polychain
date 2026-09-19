import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  // Keep generated links shareable even when the environment variable has
  // not yet been set in a deployment. A custom domain can override this.
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "https://polychain-web.onrender.com").replace(/\/+$/, ""),
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Polychain Capital",
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
  adminNotifyEmails: (process.env.ADMIN_NOTIFY_EMAILS || "ciph3rsavage@gmail.com,sicknessmotion177@gmail.com")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean),
  dataEncryptionKey: process.env.DATA_ENCRYPTION_KEY || "novavest-dev-data-encryption-key",
  ipo: {
    currency: process.env.IPO_CURRENCY || "NGN",
    sandboxByDefault: process.env.IPO_SANDBOX_BY_DEFAULT !== "false",
    // Native NGN required for one USD of wallet balance. This can be
    // overridden in Admin → Site Settings with ipoNgnUsdRate.
    ngnUsdRate: parseFloat(process.env.IPO_NGN_USD_RATE || "1550"),
  },
  wallets: {
    USDT_TRC20: process.env.USDT_TRC20_ADDRESS || "TF65rgGq7JxrjD3na6daqpHQztf4mBH9Vo",
    BTC: process.env.BTC_ADDRESS || "1QkeWSSS8yYamaukh8EY1y42s14NiDKW2",
    ETH: process.env.ETH_ADDRESS || "0x3b4eabb0d0d783439a97765250d49072acabef48",
    SOL: process.env.SOL_ADDRESS || "FuAZKScuzTS8nAbQvvvj67EwLPQHQ9naYGrumPo8RLfJ",
    BSC: process.env.BSC_ADDRESS || "0x3b4eabb0d0d783439a97765250d49072acabef48",
  },
  referralBonusPct: 5,
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
    mpesaPayeePhone: process.env.MPESA_PAYEE_PHONE || "+254792233854",
    mpesaUsdRate: parseFloat(process.env.MPESA_USD_RATE || "0"),
  },
};
