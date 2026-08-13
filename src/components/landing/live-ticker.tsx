"use client";

import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Activity } from "lucide-react";
import { formatCurrency, timeAgo, truncateMiddle } from "@/lib/utils";

type Entry = {
  username: string;
  amount: number;
  updatedAt: string;
  currency: string;
  createdAt?: string;
};

function TickerRow({ entry, deposit }: { entry: Entry; deposit: boolean }) {
  const date = entry.updatedAt || entry.createdAt || new Date().toISOString();
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          deposit ? "bg-success/15 text-emerald-400" : "bg-warning/15 text-amber-400"
        }`}
      >
        {deposit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white/80">
          {entry.username} {deposit ? "deposited" : "withdrew"}
        </p>
        <p className="text-xs text-white/40">
          {deposit ? truncateMiddle(entry.currency) : truncateMiddle(entry.currency)} · {timeAgo(date)}
        </p>
      </div>
      <span className={`font-mono text-sm font-semibold ${deposit ? "text-emerald-400" : "text-amber-400"}`}>
        {deposit ? "+" : "-"}{formatCurrency(entry.amount)}
      </span>
    </div>
  );
}

export function LiveTicker({
  deposits,
  withdrawals,
}: {
  deposits: Entry[];
  withdrawals: Entry[];
}) {
  const [tab, setTab] = useState<"deposits" | "withdrawals">("deposits");

  return (
    <section className="py-12">
      <div className="container">
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              Live activity feed
              <Activity className="ml-1 h-4 w-4 text-white/40" />
            </div>
            <div className="flex gap-1 rounded-lg bg-white/[0.05] p-1">
              <button
                onClick={() => setTab("deposits")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  tab === "deposits" ? "bg-gold-gradient text-navy-dark" : "text-white/50 hover:text-white"
                }`}
              >
                Deposits
              </button>
              <button
                onClick={() => setTab("withdrawals")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  tab === "withdrawals" ? "bg-gold-gradient text-navy-dark" : "text-white/50 hover:text-white"
                }`}
              >
                Withdrawals
              </button>
            </div>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {(tab === "deposits" ? deposits : withdrawals).map((entry, i) => (
              <TickerRow key={i} entry={entry} deposit={tab === "deposits"} />
            ))}
            {(tab === "deposits" ? deposits : withdrawals).length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-white/40">No transactions yet — be the first.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
