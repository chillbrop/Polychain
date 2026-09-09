import type { Ipo, IpoApplication } from "@prisma/client";

export const DAY_MS = 24 * 3600 * 1000;
export const CLOSING_SOON_WINDOW_MS = 7 * DAY_MS;

export const OPEN_STATUSES = ["OPEN", "CLOSING_SOON"] as const;
export const SUBSCRIPTABLE_IPO_STATUSES = new Set<string>(OPEN_STATUSES);

export type IpoSnapshot = Pick<
  Ipo,
  "status" | "openDate" | "closeDate" | "allotmentDate" | "listingDate" | "published"
>;

export function deriveIpoStatus(
  ipo: IpoSnapshot,
  now: Date = new Date(),
): "UPCOMING" | "OPEN" | "CLOSING_SOON" | "CLOSED" | "DRAFT" {
  if (!ipo.published) return "DRAFT";
  if (!ipo.openDate || !ipo.closeDate) return "UPCOMING";
  if (now < ipo.openDate) return "UPCOMING";
  if (ipo.closeDate.getTime() - now.getTime() <= CLOSING_SOON_WINDOW_MS && now <= ipo.closeDate) {
    return "CLOSING_SOON";
  }
  if (now <= ipo.closeDate) return "OPEN";
  return "CLOSED";
}

const AUTO_DRIVEN = new Set(["DRAFT", "UPCOMING", "OPEN", "CLOSING_SOON", "CLOSED"]);
const MANUAL_ONLY = new Set([
  "ALLOCATION_PENDING",
  "ALLOCATION_COMPLETED",
  "LISTED",
  "COMPLETED",
]);

export function applyAutoStatus(ipo: IpoSnapshot, now: Date = new Date()): string {
  if (!AUTO_DRIVEN.has(ipo.status)) return ipo.status;
  const derived = deriveIpoStatus(ipo, now);
  if (MANUAL_ONLY.has(ipo.status)) return ipo.status;
  const order = ["DRAFT", "UPCOMING", "OPEN", "CLOSING_SOON", "CLOSED"];
  return order.indexOf(derived) > order.indexOf(ipo.status) ? derived : ipo.status;
}

export function canSubscribe(status: string): boolean {
  return SUBSCRIPTABLE_IPO_STATUSES.has(status);
}

export interface IpoAmountBreakdown {
  grossNgn: number;
  feeNgn: number;
  totalNgn: number;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateIpoAmount(shares: number, pricePerShare: number, feePct = 0): IpoAmountBreakdown {
  if (!Number.isFinite(shares) || shares <= 0) throw new Error("Shares must be a positive number");
  if (!Number.isFinite(pricePerShare) || pricePerShare <= 0) throw new Error("Price per share must be a positive number");
  const grossNgn = round2(shares * pricePerShare);
  const feeNgn = round2((grossNgn * feePct) / 100);
  return { grossNgn, feeNgn, totalNgn: round2(grossNgn + feeNgn) };
}

export function usdFromNgn(ngnAmount: number, rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("Exchange rate must be a positive number");
  return round2(ngnAmount / rate);
}

export function allocateShares(requested: number, ratePct: number): number {
  if (!Number.isFinite(requested) || requested <= 0) return 0;
  const pct = Math.max(0, Math.min(100, ratePct));
  return Math.floor((requested * pct) / 100);
}

export function applicationAllocationStatus(requested: number, allocated: number):
  | "ALLOCATED"
  | "PARTIALLY_ALLOCATED"
  | "NOT_ALLOCATED" {
  if (allocated <= 0) return "NOT_ALLOCATED";
  if (allocated >= requested) return "ALLOCATED";
  return "PARTIALLY_ALLOCATED";
}

export function refundAmountForApplication(app: {
  shares: number;
  amountUsd: number;
  amountNgn: number;
  allocationShares: number | null;
}): { amountUsd: number; amountNgn: number } {
  const allocated = app.allocationShares ?? 0;
  if (allocated <= 0) return { amountUsd: app.amountUsd, amountNgn: app.amountNgn };
  if (allocated >= app.shares) return { amountUsd: 0, amountNgn: 0 };
  const ratio = allocated / app.shares;
  return {
    amountUsd: round2(app.amountUsd * (1 - ratio)),
    amountNgn: round2(app.amountNgn * (1 - ratio)),
  };
}

export function serializeIpo(ipo: Ipo) {
  let keyFacts: Array<{ label: string; value: string | number }> = [];
  try {
    keyFacts = Array.isArray(ipo.keyFacts) ? (ipo.keyFacts as typeof keyFacts) : [];
  } catch {
    keyFacts = [];
  }
  return {
    ...ipo,
    pricePerShare: Number(ipo.pricePerShare),
    totalShares: Number(ipo.totalShares),
    keyFacts,
  };
}

export function serializeApplication(app: IpoApplication) {
  return {
    ...app,
    amountNgn: Number(app.amountNgn),
    amountUsd: Number(app.amountUsd),
    feeNgn: Number(app.feeNgn),
  };
}