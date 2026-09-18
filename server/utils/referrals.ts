import { Prisma } from "@prisma/client";
import { config } from "../config";

/**
 * Credit the account owner who referred a depositor. This is called only from
 * the transaction that confirms a deposit, so the deposit and its commission
 * either both succeed or both roll back.
 */
export async function creditDepositReferralCommission(
  tx: Prisma.TransactionClient,
  depositorId: string,
  depositAmount: number,
  sourceReference: string,
) {
  if (depositAmount <= 0) return false;

  const depositor = await tx.user.findUnique({
    where: { id: depositorId },
    select: { username: true, referredById: true },
  });
  if (!depositor?.referredById || depositor.referredById === depositorId) return false;

  const commission = Number((depositAmount * (config.referralBonusPct / 100)).toFixed(2));
  if (commission <= 0) return false;

  const referrer = await tx.user.findUnique({
    where: { id: depositor.referredById },
    select: { id: true },
  });
  if (!referrer) return false;

  await tx.user.update({
    where: { id: referrer.id },
    data: {
      walletBalance: { increment: commission },
      totalReferralEarnings: { increment: commission },
    },
  });
  await tx.transaction.create({
    data: {
      userId: referrer.id,
      type: "REFERRAL_COMMISSION",
      amount: commission,
      status: "COMPLETED",
      description: `${config.referralBonusPct}% referral commission from ${depositor.username}'s deposit`,
      reference: `RFC-${sourceReference}`,
      metadata: { depositorId, depositAmount, commissionRate: config.referralBonusPct, sourceReference },
    },
  });
  await tx.notification.create({
    data: {
      userId: referrer.id,
      title: "Referral commission received",
      message: `You earned $${commission.toFixed(2)} from ${depositor.username}'s $${depositAmount.toFixed(2)} deposit.`,
      type: "success",
    },
  });
  await tx.activity.create({
    data: { userId: referrer.id, action: `Earned $${commission.toFixed(2)} referral commission from ${depositor.username}` },
  });

  return true;
}
