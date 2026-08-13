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
