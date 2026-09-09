"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Plus, ShieldAlert, Rocket, ArrowRight } from "lucide-react";
import { get, post, patch } from "@/lib/api-client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatNaira, formatDate, formatCompactNgn } from "@/lib/utils";
import type { Ipo } from "@/types";

interface AdminIpoListResponse {
  ipos: Array<Ipo & { paidNgn?: number; paidShares?: number }>;
}

const IPO_STATUSES = ["DRAFT", "UPCOMING", "OPEN", "CLOSING_SOON", "CLOSED", "ALLOCATION_PENDING", "ALLOCATION_COMPLETED", "LISTED", "COMPLETED"];

export default function AdminIpoPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery<AdminIpoListResponse>({
    queryKey: ["admin-ipo-list"],
    queryFn: () => get("/admin/ipo"),
  });

  const ipos = data?.ipos || [];

  const mutate = (keys: string[]) => {
    keys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
  };

  const setField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const createIpo = async () => {
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        slug: form.slug || form.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        issuer: form.issuer,
        ticker: form.ticker || undefined,
        exchange: form.exchange || undefined,
        tagline: form.tagline,
        overview: form.overview,
        pricePerShare: Number(form.pricePerShare),
        totalShares: Number(form.totalShares),
        minimumShares: Number(form.minimumShares || 10),
        maximumShares: form.maximumShares ? Number(form.maximumShares) : null,
        greenshoePct: Number(form.greenshoePct || 0),
        feePct: Number(form.feePct || 0),
        openDate: form.openDate ? new Date(form.openDate).toISOString() : null,
        closeDate: form.closeDate ? new Date(form.closeDate).toISOString() : null,
      };
      await post("/admin/ipo", body);
      toast({ title: "IPO created", description: `${form.name} was created as a draft.`, variant: "success" });
      setOpen(false);
      setForm({});
      mutate(["admin-ipo-list"]);
    } catch (e) {
      toast({ title: "Could not create IPO", description: (e as Error).message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const publishIpo = async (id: string) => {
    try {
      await post(`/admin/ipo/${id}/publish`, {});
      toast({ title: "Published", description: "Offering is now visible to investors.", variant: "success" });
      mutate(["admin-ipo-list"]);
    } catch (e) {
      toast({ title: "Publish failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const toggleSandbox = async (ipo: Ipo) => {
    try {
      const updated = await patch<{ ipo: Ipo }>(`/admin/ipo/${ipo.id}`, { sandbox: !ipo.sandbox });
      toast({
        title: "Sandbox mode updated",
        description: `${updated.ipo.name} is now ${updated.ipo.sandbox ? "in test mode" : "LIVE"}. ${updated.ipo.sandbox ? "Payments are simulated." : "Subscriptions debit real wallet balances."}`,
        variant: "success",
      });
      mutate(["admin-ipo-list"]);
    } catch (e) {
      toast({ title: "Update failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-gold">
            <Landmark className="h-4 w-4" /> Primary Market
          </p>
          <h1 className="font-display text-2xl font-bold">IPO Offerings</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="gold"><Plus className="h-4 w-4" /> New IPO</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create IPO offering</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>Name</Label><Input className="mt-1" value={form.name || ""} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. Dangote Petroleum Refinery IPO" /></div>
                <div><Label>Slug</Label><Input className="mt-1" value={form.slug || ""} onChange={(e) => setField("slug", e.target.value)} placeholder="auto-generated" /></div>
                <div><Label>Issuer</Label><Input className="mt-1" value={form.issuer || ""} onChange={(e) => setField("issuer", e.target.value)} /></div>
                <div><Label>Ticker (optional)</Label><Input className="mt-1" value={form.ticker || ""} onChange={(e) => setField("ticker", e.target.value)} /></div>
                <div><Label>Exchange (optional)</Label><Input className="mt-1" value={form.exchange || ""} onChange={(e) => setField("exchange", e.target.value)} /></div>
              </div>
              <div><Label>Tagline</Label><Input className="mt-1" value={form.tagline || ""} onChange={(e) => setField("tagline", e.target.value)} /></div>
              <div><Label>Overview</Label><Textarea className="mt-1" rows={4} value={form.overview || ""} onChange={(e) => setField("overview", e.target.value)} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>Price per share ({form.currency || "NGN"})</Label><Input className="mt-1" type="number" value={form.pricePerShare || ""} onChange={(e) => setField("pricePerShare", e.target.value)} /></div>
                <div><Label>Total shares</Label><Input className="mt-1" type="number" value={form.totalShares || ""} onChange={(e) => setField("totalShares", e.target.value)} /></div>
                <div><Label>Minimum shares</Label><Input className="mt-1" type="number" value={form.minimumShares || "10"} onChange={(e) => setField("minimumShares", e.target.value)} /></div>
                <div><Label>Maximum shares (optional)</Label><Input className="mt-1" type="number" value={form.maximumShares || ""} onChange={(e) => setField("maximumShares", e.target.value)} /></div>
                <div><Label>Greenshoe %</Label><Input className="mt-1" type="number" value={form.greenshoePct || "0"} onChange={(e) => setField("greenshoePct", e.target.value)} /></div>
                <div><Label>Fee %</Label><Input className="mt-1" type="number" value={form.feePct || "0"} onChange={(e) => setField("feePct", e.target.value)} /></div>
                <div><Label>Opens</Label><Input className="mt-1" type="datetime-local" value={form.openDate || ""} onChange={(e) => setField("openDate", e.target.value)} /></div>
                <div><Label>Closes</Label><Input className="mt-1" type="datetime-local" value={form.closeDate || ""} onChange={(e) => setField("closeDate", e.target.value)} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="gold" onClick={createIpo} disabled={creating}>{creating ? "Creating…" : "Create draft"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Offering</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Offer period</TableHead>
              <TableHead className="text-right">Applications</TableHead>
              <TableHead className="text-right">Paid (NGN)</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><div className="h-4 w-16 animate-pulse rounded bg-white/5" /></TableCell>)}</TableRow>
            ))}
            {!isLoading && ipos.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-12 text-center text-white/40">No IPO offerings yet. Create one to get started.</TableCell></TableRow>
            )}
            {ipos.map((ipo) => (
              <TableRow key={ipo.id}>
                <TableCell>
                  <Link href={`/admin/ipo/${ipo.id}`} className="font-medium hover:text-gold">{ipo.name}</Link>
                  <p className="text-xs text-white/40">{ipo.issuer} · {ipo.pricePerShare.toLocaleString()} {ipo.currency}</p>
                </TableCell>
                <TableCell><StatusBadge status={ipo.status} /></TableCell>
                <TableCell className="text-xs text-white/40">
                  {ipo.openDate ? formatDate(ipo.openDate) : "—"} → {ipo.closeDate ? formatDate(ipo.closeDate) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono">{(ipo as AdminIpoListResponse["ipos"][number]).paidShares?.toLocaleString() ?? 0}</TableCell>
                <TableCell className="text-right font-mono text-gold">{formatCompactNgn((ipo as AdminIpoListResponse["ipos"][number]).paidNgn ?? 0)}</TableCell>
                <TableCell>
                  {ipo.sandbox ? (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                      <ShieldAlert className="h-3 w-3" /> Test
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                      <Rocket className="h-3 w-3" /> Live
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    {!ipo.published && (
                      <Button size="sm" variant="gold" onClick={() => publishIpo(ipo.id)}>Publish</Button>
                    )}
                    <Button size="sm" variant={ipo.sandbox ? "success" : "outline"} onClick={() => toggleSandbox(ipo)}>
                      {ipo.sandbox ? "Go live" : "Test mode"}
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/admin/ipo/${ipo.id}`} className="inline-flex items-center gap-1">Manage <ArrowRight className="h-3.5 w-3.5" /></Link>
                    </Button>
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