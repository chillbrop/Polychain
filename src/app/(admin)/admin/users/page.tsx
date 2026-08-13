"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, UserCog, Eye } from "lucide-react";
import { get, patch } from "@/lib/api-client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate, initials } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

interface UserRow {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  kycStatus: string;
  walletBalance: number;
  profitBalance: number;
  totalDeposited: number;
  createdAt: string;
  _count: { referrals: number; investments: number; depositRequests: number };
}

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [selected, setSelected] = useState<UserRow | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page, search, status],
    queryFn: () =>
      get<{ users: UserRow[]; total: number; totalPages: number; page: number }>("/admin/users", {
        page: String(page),
        perPage: "15",
        search: search || undefined,
        status: status || undefined,
      }),
  });

  const users = data?.users || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              className="input-dark pl-10"
              placeholder="Search by username or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="sm:w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="VERIFYING">Verifying</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-white/40">{data?.total ?? 0} users</p>
      </div>

      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>KYC</TableHead>
              <TableHead className="text-right">Wallet</TableHead>
              <TableHead className="text-right">Deposited</TableHead>
              <TableHead className="text-right">Referrals</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 w-16 rounded bg-white/5 animate-pulse" /></TableCell>
                  ))}
                </TableRow>
              ))
            )}
            {!isLoading && users.length === 0 && (
              <TableRow><TableCell colSpan={9} className="py-12 text-center text-white/40">No users found</TableCell></TableRow>
            )}
            {!isLoading && users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{initials(u.username)}</AvatarFallback></Avatar>
                    <div>
                      <p className="text-sm font-medium">{u.username}</p>
                      <p className="text-xs text-white/40">{u.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell><Badge variant={u.role === "ADMIN" ? "gold" : "secondary"}>{u.role}</Badge></TableCell>
                <TableCell><StatusBadge status={u.status} /></TableCell>
                <TableCell><StatusBadge status={u.kycStatus} /></TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(u.walletBalance)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(u.totalDeposited)}</TableCell>
                <TableCell className="text-right">{u._count.referrals}</TableCell>
                <TableCell className="text-xs text-white/40">{formatDate(u.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="iconSm" onClick={() => setSelected(u)} aria-label="View user">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="border-t border-white/[0.06] p-4">
          <Pagination page={page} totalPages={data?.totalPages || 1} onPageChange={setPage} />
        </div>
      </div>

      {selected && (
        <UserDetailDialog
          user={selected}
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
          onUpdated={() => queryClient.invalidateQueries({ queryKey: ["admin-users"] })}
        />
      )}
    </div>
  );
}

function UserDetailDialog({ user, open, onClose, onUpdated }: { user: UserRow; open: boolean; onClose: () => void; onUpdated: () => void }) {
  const queryClient = useQueryClient();

  const updateUser = async (data: Record<string, unknown>, message: string) => {
    try {
      await patch(`/admin/users/${user.id}`, data);
      toast({ title: "Updated", description: message, variant: "success" });
      onUpdated();
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    } catch (e) {
      toast({ title: "Update failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <UserCog className="h-5 w-5 text-gold" />
            {user.username}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-xs text-white/40">Wallet</p>
              <p className="mt-1 font-mono font-semibold text-gold">{formatCurrency(user.walletBalance)}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-xs text-white/40">Profit</p>
              <p className="mt-1 font-mono font-semibold text-emerald-400">{formatCurrency(user.profitBalance)}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-xs text-white/40">Investments</p>
              <p className="mt-1 font-display font-semibold">{user._count.investments}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div>
                <p className="font-medium">Account status</p>
                <p className="text-xs text-white/40">Currently <StatusBadge status={user.status} /></p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="success" disabled={user.status === "ACTIVE"} onClick={() => updateUser({ status: "ACTIVE" }, "Account activated")}>
                  Activate
                </Button>
                <Button size="sm" variant="destructive" disabled={user.status === "SUSPENDED"} onClick={() => updateUser({ status: "SUSPENDED" }, "Account suspended")}>
                  Suspend
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div>
                <p className="font-medium">KYC verification</p>
                <p className="text-xs text-white/40">Currently <StatusBadge status={user.kycStatus} /></p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="success" disabled={user.kycStatus === "APPROVED"} onClick={() => updateUser({ kycStatus: "APPROVED" }, "KYC approved")}>
                  Approve
                </Button>
                <Button size="sm" variant="destructive" disabled={user.kycStatus === "REJECTED"} onClick={() => updateUser({ kycStatus: "REJECTED" }, "KYC rejected")}>
                  Reject
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
