"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Landmark, FolderOpen, ArrowRight, TrendingUp } from "lucide-react";
import { get } from "@/lib/api-client";
import { StatusBadge } from "@/components/shared/status-badge";
import { SkeletonCardGrid } from "@/components/shared/skeletons";
import { Progress } from "@/components/ui/progress";
import { formatNaira, formatDate } from "@/lib/utils";
import type { Ipo } from "@/types";

interface IpoListResponse {
  ipos: Ipo[];
  sandboxMode: boolean;
}

export default function IpoCentrePage() {
  const { data, isLoading } = useQuery<IpoListResponse>({
    queryKey: ["ipo-list"],
    queryFn: () => get("/ipo"),
    refetchInterval: 60000,
  });

  const ipos = data?.ipos || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-gold">
            <Landmark className="h-4 w-4" /> IPO Centre
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold">Primary Market Offerings</h1>
          <p className="mt-1 text-sm text-white/50">Subscribe to initial public offerings priced in Nigerian Naira.</p>
        </div>
        <Link
          href="/ipo/applications"
          className="inline-flex items-center gap-2 self-start rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/70 transition-all hover:border-gold/40 hover:text-gold"
        >
          <FolderOpen className="h-4 w-4" /> My Subscriptions
        </Link>
      </div>

      {isLoading && <SkeletonCardGrid count={3} />}

      {!isLoading && ipos.length === 0 && (
        <div className="glass-card p-12 text-center">
          <p className="text-lg font-semibold">No offerings right now</p>
          <p className="mt-1 text-sm text-white/40">Check back soon — new public offerings are announced here first.</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {ipos.map((ipo) => (
          <Link
            key={ipo.id}
            href={`/ipo/${ipo.slug}`}
            className="group glass-card flex flex-col gap-5 p-6 transition-all hover:border-gold/40 hover:shadow-glow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold group-hover:text-gold">{ipo.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-white/45">{ipo.tagline}</p>
              </div>
              <StatusBadge status={ipo.status} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-[11px] uppercase tracking-wider text-white/35">Price / share</p>
                <p className="mt-1 font-mono text-lg font-semibold text-gold">{formatNaira(ipo.pricePerShare, 0)}</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-[11px] uppercase tracking-wider text-white/35">Offer size</p>
                <p className="mt-1 font-mono text-lg font-semibold">{ipo.totalShares.toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-[11px] uppercase tracking-wider text-white/35">Minimum</p>
                <p className="mt-1 font-mono text-sm font-semibold">{ipo.minimumShares} shares</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-[11px] uppercase tracking-wider text-white/35">Offer period</p>
                <p className="mt-1 text-xs font-medium text-white/60">
                  {ipo.openDate ? formatDate(ipo.openDate) : "—"} → {ipo.closeDate ? formatDate(ipo.closeDate) : "—"}
                </p>
              </div>
            </div>

            <div className="mt-auto">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-white/45">
                  <TrendingUp className="h-3.5 w-3.5 text-gold" />
                  Subscription progress
                </span>
                <span className="font-mono font-semibold text-gold">
                  {(ipo.subscriptionRatePct ?? 0).toFixed(2)}%
                </span>
              </div>
              <Progress value={Math.min(100, ipo.subscriptionRatePct ?? 0)} className="mt-2 h-2" />
              <p className="mt-2 text-xs text-white/40">
                {ipo.applicationsCount?.toLocaleString() ?? 0} shares subscribed of {ipo.totalShares.toLocaleString()}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
              <span className="text-xs text-white/40">Live demand</span>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gold">
                View & subscribe
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}