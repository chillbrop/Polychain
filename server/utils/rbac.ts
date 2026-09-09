export type AdminPermission =
  | "IPO_MANAGE"
  | "IPO_KYC"
  | "IPO_ALLOCATE"
  | "IPO_REFUND"
  | "IPO_VIEW";

export const ADMIN_ROLES = [
  "ADMIN",
  "SUPER_ADMIN",
  "IPO_MANAGER",
  "COMPLIANCE_OFFICER",
  "FINANCE_OFFICER",
  "CUSTOMER_SUPPORT",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

function isAdminRole(role?: string): role is AdminRole {
  return Boolean(role && (ADMIN_ROLES as readonly string[]).includes(role));
}

export { isAdminRole };

const PERMISSION_MATRIX: Record<AdminPermission, readonly AdminRole[]> = {
  IPO_MANAGE: ["ADMIN", "SUPER_ADMIN", "IPO_MANAGER"],
  IPO_KYC: ["ADMIN", "SUPER_ADMIN", "COMPLIANCE_OFFICER", "CUSTOMER_SUPPORT"],
  IPO_ALLOCATE: ["ADMIN", "SUPER_ADMIN", "IPO_MANAGER", "FINANCE_OFFICER"],
  IPO_REFUND: ["ADMIN", "SUPER_ADMIN", "FINANCE_OFFICER"],
  IPO_VIEW: ADMIN_ROLES,
};

export function can(role: string | undefined, permission: AdminPermission): boolean {
  return isAdminRole(role) && PERMISSION_MATRIX[permission].includes(role);
}