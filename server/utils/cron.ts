import { prisma } from "../prisma";
import { accrueAllProfits } from "../routes/investments";
import { investmentExpiryReminderEmail, notifyAdmins } from "./mail";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function checkInvestmentExpiry() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + MS_PER_DAY);

  const expiring = await prisma.investment.findMany({
    where: {
      status: "ACTIVE",
      endDate: { gte: now, lte: tomorrow },
    },
    include: { plan: true, user: { select: { username: true, email: true } } },
  });

  if (expiring.length === 0) return;

  const data = expiring.map((inv) => ({
    username: inv.user.username,
    email: inv.user.email,
    planName: inv.plan.name,
    amount: inv.amount,
    profitEarned: inv.profitEarned,
    endDate: inv.endDate.toISOString(),
  }));

  const { subject, html } = investmentExpiryReminderEmail(data);
  await notifyAdmins(subject, html);
  console.log(`[cron] Sent expiry reminder for ${expiring.length} investment(s)`);
}

function msUntilNext8AM() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(8, 0, 0, 0);
  if (next <= now) next.setTime(next.getTime() + MS_PER_DAY);
  return next.getTime() - now.getTime();
}

export function startCronJobs() {
  async function run() {
    try {
      const accrual = await accrueAllProfits();
      if (accrual.processed > 0) {
        console.log(`[cron] Accrued profits for ${accrual.processed} investment(s), ${accrual.completed} completed`);
      }
    } catch (err) {
      console.error("[cron] Profit accrual failed:", err);
    }
    try {
      await checkInvestmentExpiry();
    } catch (err) {
      console.error("[cron] Expiry check failed:", err);
    }
  }

  setTimeout(async () => {
    await run();
    setInterval(run, MS_PER_DAY);
  }, msUntilNext8AM());

  console.log(`[cron] Expiry reminder scheduled — first run in ${Math.round(msUntilNext8AM() / 3600000)}h`);
}
