import nodemailer from "nodemailer";
import { config } from "../config";

const transporter = nodemailer.createTransport({
  host: config.smtp.host || "smtp.example.com",
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: config.smtp.user
    ? { user: config.smtp.user, pass: config.smtp.pass }
    : undefined,
});

export const mailConfigured = Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);

export async function sendMail(to: string, subject: string, html: string) {
  if (!mailConfigured) {
    console.log(`[mail:dev] To=${to} Subject="${subject}"`);
    return { dev: true, preview: html };
  }
  return transporter.sendMail({
    from: config.mailFrom,
    to,
    subject,
    html,
  });
}

export function verificationEmail(name: string, url: string) {
  return {
    subject: "Verify your Polychain Capital email",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0A1A33;border-radius:16px;color:#fff">
        <h2 style="color:#F4B400;margin:0 0 8px">Polychain Capital</h2>
        <h3 style="margin:0 0 16px">Welcome, ${name}!</h3>
        <p style="color:#cbd5e1;line-height:1.6">Confirm your email address to activate your account and start investing smarter.</p>
        <a href="${url}" style="display:inline-block;background:#F4B400;color:#060F1F;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;margin:16px 0">Verify Email</a>
        <p style="color:#64748b;font-size:12px">If the button doesn't work, copy this link: ${url}</p>
      </div>`,
  };
}

export function resetEmail(name: string, url: string) {
  return {
    subject: "Reset your Polychain Capital password",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0A1A33;border-radius:16px;color:#fff">
        <h2 style="color:#F4B400;margin:0 0 8px">Polychain Capital</h2>
        <h3 style="margin:0 0 16px">Hi ${name},</h3>
        <p style="color:#cbd5e1;line-height:1.6">We received a request to reset your password. This link expires in 30 minutes.</p>
        <a href="${url}" style="display:inline-block;background:#F4B400;color:#060F1F;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;margin:16px 0">Reset Password</a>
        <p style="color:#64748b;font-size:12px">If you didn't request this, you can safely ignore this email.</p>
      </div>`,
  };
}

export function paymentReceivedEmail(
  username: string,
  email: string,
  amount: number,
  currency: string,
  activeInvestments: Array<{ planName: string; amount: number; endDate: string; profitEarned: number }>,
) {
  const investmentRows = activeInvestments.length
    ? activeInvestments
        .map(
          (inv) =>
            `<tr style="border-bottom:1px solid rgba(255,255,255,0.06)">
              <td style="padding:8px 12px;color:#cbd5e1">${inv.planName}</td>
              <td style="padding:8px 12px;color:#cbd5e1;text-align:right">$${inv.amount.toFixed(2)}</td>
              <td style="padding:8px 12px;color:#cbd5e1;text-align:right">$${inv.profitEarned.toFixed(2)}</td>
              <td style="padding:8px 12px;color:#cbd5e1;text-align:right">${new Date(inv.endDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</td>
            </tr>`,
        )
        .join("")
    : `<tr><td colspan="4" style="padding:12px;color:#64748b;text-align:center">No active investments</td></tr>`;

  return {
    subject: `💰 Payment Received — $${amount.toFixed(2)} from ${username}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#0A1A33;border-radius:16px;color:#fff">
        <h2 style="color:#F4B400;margin:0 0 8px">Polychain Capital</h2>
        <h3 style="margin:0 0 16px">Payment Received</h3>
        <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);border-radius:12px;padding:16px;margin-bottom:20px">
          <p style="margin:0;color:#6ee7b7;font-size:13px">Amount</p>
          <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#fff">$${amount.toFixed(2)} <span style="font-size:14px;color:#6ee7b7">${currency}</span></p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <tr><td style="padding:6px 0;color:#64748b">Username</td><td style="padding:6px 0;color:#fff;text-align:right">${username}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Email</td><td style="padding:6px 0;color:#fff;text-align:right">${email}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Currency</td><td style="padding:6px 0;color:#fff;text-align:right">${currency}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Date</td><td style="padding:6px 0;color:#fff;text-align:right">${new Date().toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td></tr>
        </table>
        <h4 style="margin:0 0 10px;color:#F4B400;font-size:14px">Active Investments</h4>
        <table style="width:100%;border-collapse:collapse;background:rgba(255,255,255,0.03);border-radius:8px;overflow:hidden">
          <thead>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.1)">
              <th style="padding:8px 12px;color:#64748b;font-size:12px;text-align:left">Plan</th>
              <th style="padding:8px 12px;color:#64748b;font-size:12px;text-align:right">Amount</th>
              <th style="padding:8px 12px;color:#64748b;font-size:12px;text-align:right">Profit</th>
              <th style="padding:8px 12px;color:#64748b;font-size:12px;text-align:right">Ends</th>
            </tr>
          </thead>
          <tbody>${investmentRows}</tbody>
        </table>
      </div>`,
  };
}

export function investmentCreatedEmail(
  username: string,
  email: string,
  planName: string,
  amount: number,
  dailyReturn: number,
  durationDays: number,
  endDate: string,
) {
  return {
    subject: `📦 New Investment — ${planName} by ${username}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0A1A33;border-radius:16px;color:#fff">
        <h2 style="color:#F4B400;margin:0 0 8px">Polychain Capital</h2>
        <h3 style="margin:0 0 16px">New Investment Created</h3>
        <div style="background:rgba(244,180,0,0.08);border:1px solid rgba(244,180,0,0.25);border-radius:12px;padding:16px;margin-bottom:20px">
          <p style="margin:0;color:#F4B400;font-size:13px">${planName}</p>
          <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#fff">$${amount.toFixed(2)}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <tr><td style="padding:6px 0;color:#64748b">Username</td><td style="padding:6px 0;color:#fff;text-align:right">${username}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Email</td><td style="padding:6px 0;color:#fff;text-align:right">${email}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Daily Return</td><td style="padding:6px 0;color:#10b981;text-align:right;font-weight:600">${dailyReturn}%</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Duration</td><td style="padding:6px 0;color:#fff;text-align:right">${durationDays} days</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Total Return</td><td style="padding:6px 0;color:#F4B400;text-align:right;font-weight:600">$${(amount * dailyReturn * durationDays / 100).toFixed(2)}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Starts</td><td style="padding:6px 0;color:#fff;text-align:right">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Ends</td><td style="padding:6px 0;color:#F4B400;text-align:right;font-weight:600">${new Date(endDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</td></tr>
        </table>
      </div>`,
  };
}

export function investmentExpiryReminderEmail(
  expiringInvestments: Array<{
    username: string;
    email: string;
    planName: string;
    amount: number;
    profitEarned: number;
    endDate: string;
  }>,
) {
  const rows = expiringInvestments
    .map(
      (inv) =>
        `<tr style="border-bottom:1px solid rgba(255,255,255,0.06)">
          <td style="padding:10px 12px;color:#cbd5e1">${inv.username}</td>
          <td style="padding:10px 12px;color:#cbd5e1">${inv.email}</td>
          <td style="padding:10px 12px;color:#cbd5e1">${inv.planName}</td>
          <td style="padding:10px 12px;color:#F4B400;text-align:right;font-weight:600">$${inv.amount.toFixed(2)}</td>
          <td style="padding:10px 12px;color:#10b981;text-align:right">$${inv.profitEarned.toFixed(2)}</td>
          <td style="padding:10px 12px;color:#f87171;text-align:right">Tomorrow</td>
        </tr>`,
    )
    .join("");

  return {
    subject: `⏰ Investment Expiry Reminder — ${expiringInvestments.length} investment(s) ending tomorrow`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:32px;background:#0A1A33;border-radius:16px;color:#fff">
        <h2 style="color:#F4B400;margin:0 0 8px">Polychain Capital</h2>
        <h3 style="margin:0 0 6px">Investment Expiry Reminder</h3>
        <p style="color:#94a3b8;margin:0 0 20px;font-size:14px">The following investments expire tomorrow. Contact the users to arrange renewal or payout.</p>
        <table style="width:100%;border-collapse:collapse;background:rgba(255,255,255,0.03);border-radius:8px;overflow:hidden">
          <thead>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.1)">
              <th style="padding:10px 12px;color:#64748b;font-size:12px;text-align:left">User</th>
              <th style="padding:10px 12px;color:#64748b;font-size:12px;text-align:left">Email</th>
              <th style="padding:10px 12px;color:#64748b;font-size:12px;text-align:left">Plan</th>
              <th style="padding:10px 12px;color:#64748b;font-size:12px;text-align:right">Invested</th>
              <th style="padding:10px 12px;color:#64748b;font-size:12px;text-align:right">Profit Earned</th>
              <th style="padding:10px 12px;color:#64748b;font-size:12px;text-align:right">Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#64748b;font-size:12px;margin:20px 0 0">This is an automated daily reminder from Polychain Capital.</p>
      </div>`,
  };
}

export async function notifyAdmins(subject: string, html: string) {
  const results = await Promise.allSettled(
    config.adminNotifyEmails.map((email: string) => sendMail(email, subject, html)),
  );
  const failures = results.filter((r: PromiseSettledResult<unknown>) => r.status === "rejected");
  if (failures.length) {
    console.error(`[mail] Failed to send to ${failures.length} admin(s):`, failures.map((f) => (f as PromiseRejectedResult).reason));
  }
  return results;
}

function ipoShell(title: string, body: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#0A1A33;border-radius:16px;color:#fff">
      <h2 style="color:#F4B400;margin:0 0 8px">Polychain Capital</h2>
      <h3 style="margin:0 0 16px">${title}</h3>
      ${body}
      <p style="color:#64748b;font-size:12px;margin:24px 0 0">This is an automated message from Polychain Capital.</p>
    </div>`;
}

export function ipoNewApplicationEmail(
  args: {
    username: string;
    email: string;
    ipoName: string;
    shares: number;
    amountNgn: number;
  },
  toAdmin: boolean,
) {
  const { username, email, ipoName, shares, amountNgn } = args;
  const body = `
    <div style="background:rgba(244,180,0,0.08);border:1px solid rgba(244,180,0,0.25);border-radius:12px;padding:16px;margin-bottom:20px">
      <p style="margin:0;color:#F4B400;font-size:13px">${ipoName}</p>
      <p style="margin:4px 0 0;font-size:26px;font-weight:700;color:#fff">${shares.toLocaleString()} shares</p>
      <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#F4B400">₦${amountNgn.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <tr><td style="padding:6px 0;color:#64748b">Applicant</td><td style="padding:6px 0;color:#fff;text-align:right">${username}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Email</td><td style="padding:6px 0;color:#fff;text-align:right">${email}</td></tr>
    </table>`;
  return {
    subject: toAdmin ? `📋 New IPO Subscription — ${ipoName} by ${username}` : `IPO Subscription Received — ${ipoName}`,
    html: ipoShell("IPO Subscription" + (toAdmin ? " (Admin)" : ""), body),
  };
}

export function ipoPaidEmail(args: {
  username: string;
  email: string;
  ipoName: string;
  shares: number;
  amountUsd: number;
  reference: string;
}) {
  const { username, email, ipoName, shares, amountUsd, reference } = args;
  const body = `
    <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);border-radius:12px;padding:16px;margin-bottom:20px">
      <p style="margin:0;color:#6ee7b7;font-size:13px">${ipoName} · ${shares.toLocaleString()} shares</p>
      <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#fff">$${amountUsd.toFixed(2)} <span style="font-size:14px;color:#6ee7b7">USD</span></p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <tr><td style="padding:6px 0;color:#64748b">Applicant</td><td style="padding:6px 0;color:#fff;text-align:right">${username} (${email})</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Reference</td><td style="padding:6px 0;color:#F4B400;text-align:right;font-weight:600">${reference}</td></tr>
    </table>`;
  return { subject: `✅ IPO Subscription Paid — ${ipoName} by ${username}`, html: ipoShell("IPO Payment Confirmed", body) };
}

export function ipoAllocationResultEmail(args: {
  username: string;
  email: string;
  ipoName: string;
  requestedShares: number;
  allocatedShares: number;
}) {
  const { username, email, ipoName, requestedShares, allocatedShares } = args;
  const statusLabel = allocatedShares === 0 ? "Not Allocated" : allocatedShares >= requestedShares ? "Fully Allocated" : "Partially Allocated";
  const body = `
    <div style="background:rgba(244,180,0,0.08);border:1px solid rgba(244,180,0,0.25);border-radius:12px;padding:16px;margin-bottom:20px">
      <p style="margin:0;color:#94a3b8;font-size:13px">${ipoName}</p>
      <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#fff">${statusLabel}</p>
      <p style="margin:8px 0 0;color:#cbd5e1;font-size:14px">Requested ${requestedShares.toLocaleString()} · Allocated <span style="color:#F4B400;font-weight:700">${allocatedShares.toLocaleString()}</span> shares</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <tr><td style="padding:6px 0;color:#64748b">Applicant</td><td style="padding:6px 0;color:#fff;text-align:right">${username} (${email})</td></tr>
    </table>`;
  return { subject: `📊 IPO Allocation Result — ${ipoName}`, html: ipoShell("IPO Allocation", body) };
}

export function ipoRefundProcessedEmail(args: {
  username: string;
  email: string;
  ipoName: string;
  amountUsd: number;
  reference: string;
}) {
  const { username, email, ipoName, amountUsd, reference } = args;
  const body = `
    <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);border-radius:12px;padding:16px;margin-bottom:20px">
      <p style="margin:0;color:#6ee7b7;font-size:13px">${ipoName} refund</p>
      <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#fff">$${amountUsd.toFixed(2)} <span style="font-size:14px;color:#6ee7b7">USD</span></p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <tr><td style="padding:6px 0;color:#64748b">Applicant</td><td style="padding:6px 0;color:#fff;text-align:right">${username} (${email})</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Reference</td><td style="padding:6px 0;color:#F4B400;text-align:right;font-weight:600">${reference}</td></tr>
    </table>`;
  return { subject: `💸 IPO Refund Processed — ${ipoName}`, html: ipoShell("IPO Refund Confirmed", body) };
}
