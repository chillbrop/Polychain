"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FolderOpen, ArrowRight, Landmark } from "lucide-react";
import { get } from "@/lib/api-client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatNaira, formatCurrency, formatDate } from "@/lib/utils";
import type { IpoApplication } from "@/types";

export default function MyIpoApplicationsPage() {
  const { data, isLoading } = useQuery<{ applications: IpoApplication[] }>({
    queryKey: ["ipo-my-applications"],
    queryFn: () => get("/ipo/applications"),
  });

  const applications = data?.applications || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-gold">
            <Landmark className="h-4 w-4" /> IPO Centre
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold">My Subscriptions</h1>
          <p className="mt-1 text-sm text-white/50">Track your public offering applications and allocations.</p>
        </div>
        <Link
          href="/ipo"
          className="inline-flex items-center gap-2 self-start rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/70 transition-all hover:border-gold/40 hover:text-gold"
        >
          Browse offerings <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Offering</TableHead>
              <TableHead className="text-right">Shares</TableHead>
              <TableHead className="text-right">Amount (NGN)</TableHead>
              <TableHead className="text-right">Charged (USD)</TableHead>
              <TableHead className="text-right">Allocated</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <TableCell key={j}><div className="h-4 w-16 animate-pulse rounded bg-white/5" /></TableCell>
                ))}
              </TableRow>
            ))}
            {!isLoading && applications.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-14 text-center">
                  <FolderOpen className="mx-auto h-8 w-8 text-white/20" />
                  <p className="mt-3 font-medium">No subscriptions yet</p>
                  <p className="mt-1 text-sm text-white/40">Browse open offerings to make your first IPO subscription.</p>
                  <Link href="/ipo" className="mt-4 inline-block text-sm font-medium text-gold hover:underline">Browse offerings</Link>
                </TableCell>
              </TableRow>
            )}
            {!isLoading && applications.map((app) => (
              <TableRow key={app.id}>
                <TableCell>
                  <Link href={`/ipo/${app.ipo?.slug}`} className="font-medium hover:text-gold">{app.ipo?.name}</Link>
                  <p className="text-xs text-white/40">Ref {app.reference}</p>
                </TableCell>
                <TableCell className="text-right font-mono">{app.shares.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono text-gold">{formatNaira(app.amountNgn)}</TableCell>
                <TableCell className="text-right font-mono text-emerald-400">{formatCurrency(app.amountUsd)}</TableCell>
                <TableCell className="text-right font-mono">{app.allocationShares != null ? app.allocationShares.toLocaleString() : "—"}</TableCell>
                <TableCell className="text-xs text-white/40">{formatDate(app.submittedAt)}</TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge status={app.status} />
                    {app.sandbox && <span className="text-[10px] font-medium uppercase tracking-wide text-amber-400/80">test</span>}
                    {app.refund?.status === "COMPLETED" && (
                      <span className="text-[11px] text-emerald-400">Refunded {formatCurrency(app.refund.amountUsd)}</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}