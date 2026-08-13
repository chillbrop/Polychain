"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, LifeBuoy, MessageSquare, Plus, Send } from "lucide-react";
import { get, post } from "@/lib/api-client";
import { toast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { Ticket } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

const ticketSchema = z.object({
  subject: z.string().min(5, "Subject too short"),
  category: z.string().min(2),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  message: z.string().min(10, "Please describe your issue (min 10 characters)"),
});

const replySchema = z.object({ message: z.string().min(1, "Message required") });

export default function SupportPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");

  const { data, isLoading } = useQuery<{ tickets: Ticket[] }>({
    queryKey: ["tickets"],
    queryFn: () => get("/user/tickets"),
  });

  const createForm = useForm<z.infer<typeof ticketSchema>>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { subject: "", category: "General", priority: "MEDIUM", message: "" },
  });

  const createMutation = useMutation({
    mutationFn: (values: z.infer<typeof ticketSchema>) => post("/user/tickets", values),
    onSuccess: () => {
      toast({ title: "Ticket created", description: "Our team will respond shortly.", variant: "success" });
      setCreateOpen(false);
      createForm.reset();
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (error) => toast({ title: "Failed to create ticket", description: (error as Error).message, variant: "destructive" }),
  });

  const replyMutation = useMutation({
    mutationFn: (message: string) => post(`/user/tickets/${activeTicket?.id}/reply`, { message }),
    onSuccess: () => {
      toast({ title: "Reply sent", variant: "success" });
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (error) => toast({ title: "Failed to send", description: (error as Error).message, variant: "destructive" }),
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Support Center</h1>
          <p className="mt-1 text-sm text-white/50">Our specialists respond 24/7 — average reply time under 5 minutes.</p>
        </div>
        <Button variant="gold" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Ticket
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (data?.tickets ?? []).length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/10">
            <LifeBuoy className="h-8 w-8 text-gold" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold">No support tickets</h3>
            <p className="mt-1 text-sm text-white/40">Need help? Create a ticket and we'll take it from there.</p>
          </div>
          <Button variant="gold" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Open a Ticket
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {(data?.tickets ?? []).map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => setActiveTicket(ticket)}
              className="glass-card p-6 text-left transition-all hover:border-gold/30 hover:shadow-card-hover"
            >
              <div className="flex items-center justify-between">
                <StatusBadge status={ticket.status} />
                <span className="text-xs text-white/30">{formatDateTime(ticket.updatedAt)}</span>
              </div>
              <h3 className="mt-4 font-display font-semibold">{ticket.subject}</h3>
              <p className="mt-1 text-xs text-white/40">
                {ticket.category} · Priority: {ticket.priority} · {ticket.messages?.length || 0} message{(ticket.messages?.length || 0) === 1 ? "" : "s"}
              </p>
            </button>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a support ticket</DialogTitle>
            <DialogDescription>Describe your issue and our team will get back to you.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))}>
            <div>
              <label className="mb-1.5 block text-sm text-white/60">Subject</label>
              <input className="input-dark" placeholder="Brief summary" {...createForm.register("subject")} />
              {createForm.formState.errors.subject && <p className="mt-1 text-xs text-red-400">{createForm.formState.errors.subject.message}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Category</label>
                <Select value={createForm.watch("category")} onValueChange={(v) => createForm.setValue("category", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["General", "Deposit", "Withdrawal", "Investment", "KYC", "Security", "Bug Report"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Priority</label>
                <Select value={createForm.watch("priority")} onValueChange={(v) => createForm.setValue("priority", v as "LOW" | "MEDIUM" | "HIGH" | "URGENT")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-white/60">Message</label>
              <textarea className="input-dark min-h-[120px]" placeholder="Describe your issue in detail" {...createForm.register("message")} />
              {createForm.formState.errors.message && <p className="mt-1 text-xs text-red-400">{createForm.formState.errors.message.message}</p>}
            </div>
            <Button variant="gold" type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Ticket
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(activeTicket)} onOpenChange={(o) => !o && setActiveTicket(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{activeTicket?.subject}</DialogTitle>
            <DialogDescription>
              {activeTicket?.category} · <StatusBadge status={activeTicket?.status || "OPEN"} />
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[420px] space-y-4 overflow-y-auto">
            {activeTicket?.messages?.map((m) => {
              const isAdmin = m.senderRole === "ADMIN";
              return (
                <div key={m.id} className={`flex items-start gap-3 ${isAdmin ? "flex-row-reverse" : ""}`}>
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{isAdmin ? "NV" : initials(user?.username || "U")}</AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[75%] rounded-2xl border p-4 ${isAdmin ? "border-gold/30 bg-gold/[0.06]" : "border-white/10 bg-white/[0.04]"}`}>
                    <p className="text-xs text-white/40">{isAdmin ? "Polychain Capital Support" : "You"} · {formatDateTime(m.createdAt)}</p>
                    <p className="mt-1.5 text-sm text-white/80">{m.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {activeTicket && activeTicket.status !== "CLOSED" && (
            <div className="flex items-center gap-3 border-t border-white/[0.06] pt-4">
              <input className="input-dark flex-1" placeholder="Type your reply..." value={reply} onChange={(e) => setReply(e.target.value)} />
              <Button
                variant="gold"
                size="icon"
                disabled={!reply.trim() || replyMutation.isPending}
                onClick={() => replyMutation.mutate(reply.trim())}
                aria-label="Send reply"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
