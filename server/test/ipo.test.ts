import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DAY_MS,
  deriveIpoStatus,
  applyAutoStatus,
  canSubscribe,
  calculateIpoAmount,
  usdFromNgn,
  allocateShares,
  applicationAllocationStatus,
  refundAmountForApplication,
  round2,
} from "../utils/ipo";
import type { Ipo as PrismaIpo } from "@prisma/client";

function ipo(overrides: Partial<{ published: boolean; openDate: Date | null; closeDate: Date | null; status: PrismaIpo["status"] }> = {}) {
  return {
    published: overrides.published ?? true,
    openDate: overrides.openDate ?? new Date("2026-09-14T00:00:00Z"),
    closeDate: overrides.closeDate ?? new Date("2026-10-13T23:59:00Z"),
    allotmentDate: null,
    listingDate: null,
    status: overrides.status ?? "OPEN",
  } as const;
}

describe("status engine", () => {
  it("unpublished is always DRAFT", () => {
    assert.equal(deriveIpoStatus(ipo({ published: false, status: "OPEN" })), "DRAFT");
  });

  it("missing dates means UPCOMING", () => {
    assert.equal(deriveIpoStatus(ipo({ openDate: null, closeDate: null })), "UPCOMING");
  });

  it("before openDate is UPCOMING", () => {
    const open = ipo();
    const now = new Date(open.openDate!.getTime() - DAY_MS);
    assert.equal(deriveIpoStatus(open, now), "UPCOMING");
  });

  it("during the offer is OPEN", () => {
    assert.equal(deriveIpoStatus(ipo(), new Date("2026-09-20T12:00:00Z")), "OPEN");
  });

  it("within 7 days of close is CLOSING_SOON", () => {
    const now = new Date("2026-10-11T12:00:00Z");
    assert.equal(deriveIpoStatus(ipo(), now), "CLOSING_SOON");
  });

  it("after closeDate is CLOSED", () => {
    const now = new Date("2026-10-14T00:00:00Z");
    assert.equal(deriveIpoStatus(ipo(), now), "CLOSED");
  });

  it("applyAutoStatus only moves forward along the auto ladder", () => {
    assert.equal(applyAutoStatus(ipo({ status: "UPCOMING" }), new Date("2026-09-20T12:00:00Z")), "OPEN");
    assert.equal(applyAutoStatus(ipo({ status: "CLOSED" }), new Date("2026-09-20T12:00:00Z")), "CLOSED");
    assert.equal(applyAutoStatus(ipo({ status: "ALLOCATION_COMPLETED" }), new Date()), "ALLOCATION_COMPLETED");
    assert.equal(applyAutoStatus(ipo({ status: "DRAFT", published: false })), "DRAFT");
  });

  it("canSubscribe only for OPEN / CLOSING_SOON", () => {
    assert.equal(canSubscribe("OPEN"), true);
    assert.equal(canSubscribe("CLOSING_SOON"), true);
    assert.equal(canSubscribe("UPCOMING"), false);
    assert.equal(canSubscribe("CLOSED"), false);
    assert.equal(canSubscribe("ALLOCATION_COMPLETED"), false);
  });
});

describe("amount math", () => {
  it("Dangote minimum: 10 shares × ₦525 with 0% fee", () => {
    const amount = calculateIpoAmount(10, 525, 0);
    assert.equal(amount.grossNgn, 5250);
    assert.equal(amount.feeNgn, 0);
    assert.equal(amount.totalNgn, 5250);
  });

  it("applies fee percentage and rounds to 2dp", () => {
    const amount = calculateIpoAmount(3, 100.25, 5);
    assert.equal(amount.grossNgn, 300.75);
    assert.equal(amount.feeNgn, 15.04);
    assert.equal(amount.totalNgn, 315.79);
  });

  it("rejects invalid inputs", () => {
    assert.throws(() => calculateIpoAmount(0, 100), /positive/);
    assert.throws(() => calculateIpoAmount(100, -5), /positive/);
  });

  it("converts NGN to USD at the configured rate", () => {
    assert.equal(usdFromNgn(5250, 1550), 3.39);
    assert.throws(() => usdFromNgn(100, 0), /rate/);
  });

  it("round2 uses banker-safe epsilon rounding", () => {
    assert.equal(round2(10.005), 10.01);
    assert.equal(round2(5), 5);
  });
});

describe("allocation math", () => {
  it("allocateShares floors to whole shares", () => {
    assert.equal(allocateShares(100, 50), 50);
    assert.equal(allocateShares(3, 50), 1);
    assert.equal(allocateShares(100, 0), 0);
    assert.equal(allocateShares(100, 130), 100);
    assert.equal(allocateShares(0, 50), 0);
  });

  it("classifies full / partial / none", () => {
    assert.equal(applicationAllocationStatus(100, 100), "ALLOCATED");
    assert.equal(applicationAllocationStatus(100, 50), "PARTIALLY_ALLOCATED");
    assert.equal(applicationAllocationStatus(100, 0), "NOT_ALLOCATED");
  });

  it("refund equals full amount when nothing allocated", () => {
    const refund = refundAmountForApplication({ shares: 100, amountUsd: 33.87, amountNgn: 52500, allocationShares: 0 });
    assert.equal(refund.amountUsd, 33.87);
    assert.equal(refund.amountNgn, 52500);
  });

  it("refund is zero when fully allocated", () => {
    const refund = refundAmountForApplication({ shares: 100, amountUsd: 33.87, amountNgn: 52500, allocationShares: 100 });
    assert.equal(refund.amountUsd, 0);
    assert.equal(refund.amountNgn, 0);
  });

  it("partial refund is pro-rata to the unallocated remainder", () => {
    const refund = refundAmountForApplication({ shares: 100, amountUsd: 33.87, amountNgn: 52500, allocationShares: 40 });
    assert.equal(refund.amountUsd, 20.32);
    assert.equal(refund.amountNgn, 31500);
  });
});