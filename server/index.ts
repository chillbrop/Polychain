import express, { Request } from "express";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import { prisma } from "./prisma";
import { errorHandler, notFound } from "./middleware/error";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import investmentRoutes from "./routes/investments";
import walletRoutes from "./routes/wallet";
import referralRoutes from "./routes/referrals";
import publicRoutes from "./routes/public";
import adminRoutes from "./routes/admin";
import paymentRoutes from "./routes/payments";
import { seedPlans, ensureAdmin } from "./utils/bootstrap";

const app = express();

app.set("trust proxy", true);
app.use(compression());
app.use(cors({ origin: config.siteUrl, credentials: true }));
app.use(express.json({
  limit: "10mb",
  verify: (req, _res, buffer) => {
    (req as Request & { rawBody?: Buffer }).rawBody = buffer;
  },
}));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth", rateLimit({ windowMs: 10 * 60 * 1000, max: 50 }));
app.use(limiter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "Polychain Capital API", time: new Date().toISOString() });
});

app.use("/api/public", publicRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/investments", investmentRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  await prisma.$connect();
  await seedPlans();
  await ensureAdmin();
  app.listen(config.port, () => {
    console.log(`Polychain Capital API running on http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
