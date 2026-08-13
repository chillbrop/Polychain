"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api-client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatDate } from "@/lib/utils";

interface InvestmentRow {
  id: string;
  amount: number;
  profitEarned: number;
  totalReturn: number;
  status: string;
  startDate: string;
  endDate: string;
  user: { username: string; email: string };
  plan: { name: string };
}

export default function AdminInvestmentsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-investments", page, status],
    queryFn: () =>
      get<{ investments: InvestmentRow[]; total: number; totalPages: number }>("/admin/investments", {
        page: String(page),
        perPage: "15",
        status: status || undefined,
      }),
  });

  const investments = data?.investments || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-white/40">{data?.total ?? 0} investments</p>
      </div>

      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead className="text-right">Earned</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><div className="h-4 w-16 rounded bg-white/5 animate-pulse" /></TableCell>)}</TableRow>
            ))}
            {!isLoading && investments.length === 0 && <TableRow><TableCell colSpan={7} className="py-12 text-center text-white/40">No investments found</TableCell></TableRow>}
            {!isLoading && investments.map((inv) => {
              const progress = Math.min(100, (inv.profitEarned / inv.totalReturn) * 100);
              return (
                <TableRow key={inv.id}>
                  <TableCell>
                    <p className="font-medium">{inv.user.username}</p>
                    <p className="text-xs text-white/40">{inv.user.email}</p>
                  </TableCell>
                  <TableCell><span className="rounded-lg bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold">{inv.plan.name}</span></TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(inv.amount)}</TableCell>
                  <TableCell className="w-40">
                    <div className="flex items-center gap-2">
                      <Progress value={progress} className="flex-1" />
                      <span className="text-xs text-white/40">{progress.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-emerald-400">{formatCurrency(inv.profitEarned)}</TableCell>
                  <TableCell className="text-xs text-white/40">
                    {formatDate(inv.startDate)} → {formatDate(inv.endDate)}
                  </TableCell>
                  <TableCell><StatusBadge status={inv.status} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="border-t border-white/[0.06] p-4">
          <Pagination page={page} totalPages={data?.totalPages || 1} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}
