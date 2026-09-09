export const ADMIN_ROLES = [
  "ADMIN",
  "SUPER_ADMIN",
  "IPO_MANAGER",
  "COMPLIANCE_OFFICER",
  "FINANCE_OFFICER",
  "CUSTOMER_SUPPORT",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export function isAdminRole(role?: string | null): boolean {
  return Boolean(role && (ADMIN_ROLES as readonly string[]).includes(role));
}