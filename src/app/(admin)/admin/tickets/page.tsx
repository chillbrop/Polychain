"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Loader2 } from "lucide-react";
import { get, post } from "@/lib/api-client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDateTime, initials } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

interface TicketRow {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  user: { username: string; email: string };
  _count: { messages: number };
}

interface TicketDetail {
  ticket: {
    id: string;
    subject: string;
    status: string;
    user: { username: string; email: string };
    messages: Array<{ id: string; senderRole: string; message: string; createdAt: string; sender?: { username: string } | null }>;
  };
}

export default function AdminTicketsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tickets", page, status],
    queryFn: () =>
      get<{ tickets: TicketRow[]; total: number; totalPages: number }>("/admin/tickets", {
        page: String(page),
        perPage: "15",
        status: status || undefined,
      }),
  });

  const { data: detail, isLoading: loadingDetail } = useQuery<TicketDetail>({
    queryKey: ["admin-ticket", active],
    queryFn: () => get(`/admin/tickets/${active}`),
    enabled: Boolean(active),
  });

  const replyMutation = useMutation({
    mutationFn: () => post(`/admin/tickets/${active}/reply`, { message: reply }),
    onSuccess: () => {
      toast({ title: "Reply sent", variant: "success" });
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["admin-ticket", active] });
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
    onError: (e) => toast({ title: "Failed to send", description: (e as Error).message, variant: "destructive" }),
  });

  const setStatusMutation = useMutation({
    mutationFn: (s: string) => post(`/admin/tickets/${active}/status`, { status: s }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ticket", active] });
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
  });

  const tickets = data?.tickets || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-white/40">{data?.total ?? 0} tickets</p>
      </div>

      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-center">Messages</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><div className="h-4 w-16 rounded bg-white/5 animate-pulse" /></TableCell>)}</TableRow>
            ))}
            {!isLoading && tickets.length === 0 && <TableRow><TableCell colSpan={7} className="py-12 text-center text-white/40">No tickets found</TableCell></TableRow>}
            {!isLoading && tickets.map((t) => (
              <TableRow key={t.id} className="cursor-pointer" onClick={() => setActive(t.id)}>
                <TableCell className="font-medium">{t.subject}</TableCell>
                <TableCell>
                  <p>{t.user.username}</p>
                  <p className="text-xs text-white/40">{t.user.email}</p>
                </TableCell>
                <TableCell className="text-xs">{t.category}</TableCell>
                <TableCell><StatusBadge status={t.priority} /></TableCell>
                <TableCell className="text-center">{t._count.messages}</TableCell>
                <TableCell className="text-xs text-white/40">{formatDateTime(t.createdAt)}</TableCell>
                <TableCell><StatusBadge status={t.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="border-t border-white/[0.06] p-4">
          <Pagination page={page} totalPages={data?.totalPages || 1} onPageChange={setPage} />
        </div>
      </div>

      <Dialog open={Boolean(active)} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.ticket.subject}</DialogTitle>
            <DialogDescription className="flex items-center gap-3">
              {detail?.ticket.user.username} · <StatusBadge status={detail?.ticket.status || "OPEN"} />
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            {["OPEN", "PENDING", "RESOLVED", "CLOSED"].map((s) => (
              <Button key={s} size="sm" variant={detail?.ticket.status === s ? "gold" : "outline"} onClick={() => setStatusMutation.mutate(s)}>
                {s}
              </Button>
            ))}
          </div>

          <div className="max-h-[360px] space-y-4 overflow-y-auto">
            {loadingDetail && <p className="py-8 text-center text-sm text-white/40">Loading...</p>}
            {detail?.ticket.messages.map((m) => {
              const isAdmin = m.senderRole === "ADMIN";
              return (
                <div key={m.id} className={`flex items-start gap-3 ${isAdmin ? "flex-row-reverse" : ""}`}>
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{isAdmin ? "NV" : initials(m.sender?.username || "U")}</AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[75%] rounded-2xl border p-4 ${isAdmin ? "border-gold/30 bg-gold/[0.06]" : "border-white/10 bg-white/[0.04]"}`}>
                    <p className="text-xs text-white/40">{isAdmin ? "Polychain Capital Support" : m.sender?.username || "User"} · {formatDateTime(m.createdAt)}</p>
                    <p className="mt-1.5 text-sm text-white/80">{m.message}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {detail?.ticket.status !== "CLOSED" && (
            <div className="flex items-center gap-3 border-t border-white/[0.06] pt-4">
              <input className="input-dark flex-1" placeholder="Type your reply..." value={reply} onChange={(e) => setReply(e.target.value)} />
              <Button variant="gold" size="icon" disabled={!reply.trim() || replyMutation.isPending} onClick={() => replyMutation.mutate()} aria-label="Send reply">
                {replyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
