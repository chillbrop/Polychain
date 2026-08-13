"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Check, X, Loader2 } from "lucide-react";
import { get, post } from "@/lib/api-client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDateTime, truncateMiddle } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

interface DepositRow {
  id: string;
  amount: number;
  currency: string;
  txHash?: string | null;
  status: string;
  createdAt: string;
  user: { username: string; email: string };
}

export default function AdminDepositsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [reviewing, setReviewing] = useState<{ id: string; action: "APPROVE" | "REJECT" } | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-deposits", page, status, search],
    queryFn: () =>
      get<{ deposits: DepositRow[]; total: number; totalPages: number }>("/admin/deposits", {
        page: String(page),
        perPage: "15",
        status: status || undefined,
        search: search || undefined,
      }),
  });

  const [pendingAction, setPendingAction] = useState(false);

  const review = async (id: string, action: "APPROVE" | "REJECT") => {
    setPendingAction(true);
    try {
      await post(`/admin/deposits/${id}/review`, { action });
      toast({ title: action === "APPROVE" ? "Deposit approved" : "Deposit rejected", variant: action === "APPROVE" ? "success" : "warning" });
      queryClient.invalidateQueries({ queryKey: ["admin-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setReviewing(null);
    } catch (e) {
      toast({ title: "Action failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setPendingAction(false);
    }
  };

  const deposits = data?.deposits || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input className="input-dark pl-10" placeholder="Search by username..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="sm:w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-white/40">{data?.total ?? 0} deposits</p>
      </div>

      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>TX Hash</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><div className="h-4 w-16 rounded bg-white/5 animate-pulse" /></TableCell>)}</TableRow>
            ))}
            {!isLoading && deposits.length === 0 && <TableRow><TableCell colSpan={7} className="py-12 text-center text-white/40">No deposits found</TableCell></TableRow>}
            {!isLoading && deposits.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <p className="font-medium">{d.user.username}</p>
                  <p className="text-xs text-white/40">{d.user.email}</p>
                </TableCell>
                <TableCell className="text-right font-mono font-semibold text-gold">{formatCurrency(d.amount)}</TableCell>
                <TableCell className="text-xs">{d.currency.replace("_", " ")}</TableCell>
                <TableCell className="font-mono text-xs text-white/40">{d.txHash ? truncateMiddle(d.txHash, 10, 8) : "—"}</TableCell>
                <TableCell className="text-xs text-white/40">{formatDateTime(d.createdAt)}</TableCell>
                <TableCell><StatusBadge status={d.status} /></TableCell>
                <TableCell className="text-right">
                  {d.status === "PENDING" ? (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="success" onClick={() => setReviewing({ id: d.id, action: "APPROVE" })}>
                        <Check className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setReviewing({ id: d.id, action: "REJECT" })}>
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  ) : <span className="text-xs text-white/30">—</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="border-t border-white/[0.06] p-4">
          <Pagination page={page} totalPages={data?.totalPages || 1} onPageChange={setPage} />
        </div>
      </div>

      <Dialog open={Boolean(reviewing)} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm {reviewing?.action === "APPROVE" ? "approval" : "rejection"}</DialogTitle>
            <DialogDescription>
              This will {reviewing?.action === "APPROVE" ? "credit the deposit to the user's wallet balance" : "mark the deposit as rejected and notify the user"}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setReviewing(null)} disabled={pendingAction}>Cancel</Button>
            <Button
              variant={reviewing?.action === "APPROVE" ? "success" : "destructive"}
              disabled={pendingAction}
              onClick={() => reviewing && review(reviewing.id, reviewing.action)}
            >
              {pendingAction && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm {reviewing?.action === "APPROVE" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
