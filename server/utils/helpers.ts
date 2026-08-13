import { nanoid } from "nanoid";

export function generateReference(prefix: string) {
  return `${prefix}${Date.now().toString(36).toUpperCase()}${nanoid(6).toUpperCase()}`;
}

export function generateReferralCode() {
  return `NV${nanoid(8).toUpperCase()}`;
}

export function sanitizeUser(user: {
  passwordHash: string;
  twoFactorSecret: string | null;
  refreshTokens?: unknown;
  verificationTokens?: unknown;
  passwordReset?: unknown;
  loginAttempts?: unknown;
  auditLogs?: unknown;
  [key: string]: unknown;
}) {
  const { passwordHash, twoFactorSecret, ...safe } = user;
  return safe;
}

export function paginate(page: number, perPage: number, total: number) {
  const p = Math.max(1, page);
  const per = Math.min(100, Math.max(1, perPage));
  const totalPages = Math.max(1, Math.ceil(total / per));
  return {
    page: p,
    perPage: per,
    total,
    totalPages,
    skip: (p - 1) * per,
  };
}
