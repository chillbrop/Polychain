"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { get, post, patch, del } from "@/lib/api-client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import type { InvestmentPlan } from "@/types";

const emptyPlan = {
  name: "",
  description: "",
  minAmount: 100,
  maxAmount: 1000,
  dailyReturn: 1.5,
  durationDays: 15,
  totalReturn: 22.5,
  features: [] as string[],
  popular: false,
  active: true,
  icon: "TrendingUp",
  color: "#F4B400",
  sortOrder: 0,
};

export default function AdminPlansPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<(InvestmentPlan | typeof emptyPlan) | null>(null);
  const [deleting, setDeleting] = useState<InvestmentPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [featuresText, setFeaturesText] = useState("");
  const [deletingLoading, setDeletingLoading] = useState(false);

  const { data, isLoading } = useQuery<{ plans: InvestmentPlan[] }>({
    queryKey: ["admin-plans"],
    queryFn: () => get("/admin/plans"),
  });

  const plans = data?.plans || [];

  const openNew = () => {
    setEditing({ ...emptyPlan });
    setFeaturesText("");
  };

  const openEdit = (plan: InvestmentPlan) => {
    setEditing({ ...plan });
    setFeaturesText(plan.features.join("\n"));
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload = {
        name: editing.name,
        description: editing.description,
        minAmount: editing.minAmount,
        maxAmount: editing.maxAmount,
        dailyReturn: editing.dailyReturn,
        durationDays: editing.durationDays,
        totalReturn: editing.totalReturn,
        features: featuresText.split("\n").map((f) => f.trim()).filter(Boolean),
        popular: editing.popular,
        active: editing.active,
        icon: editing.icon,
        color: editing.color,
        sortOrder: editing.sortOrder,
      };
      if ("id" in editing && editing.id) {
        await patch(`/admin/plans/${editing.id}`, payload);
        toast({ title: "Plan updated", variant: "success" });
      } else {
        await post("/admin/plans", payload);
        toast({ title: "Plan created", variant: "success" });
      }
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (plan: InvestmentPlan) => {
    try {
      await patch(`/admin/plans/${plan.id}`, { active: !plan.active });
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
    } catch (e) {
      toast({ title: "Update failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingLoading(true);
    try {
      await del(`/admin/plans/${deleting.id}`);
      toast({ title: "Plan deleted", variant: "success" });
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
    } catch (e) {
      toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setDeletingLoading(false);
    }
  };

  const updateField = (key: string, value: unknown) => {
    setEditing((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-white/40">{plans.length} plans configured</p>
        <Button variant="gold" onClick={openNew}>
          <Plus className="h-4 w-4" /> New Plan
        </Button>
      </div>

      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan</TableHead>
              <TableHead>Range</TableHead>
              <TableHead className="text-right">Daily</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Popular</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><div className="h-4 w-16 rounded bg-white/5 animate-pulse" /></TableCell>)}</TableRow>
            ))}
            {!isLoading && plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ background: plan.color }} />
                    <div>
                      <p className="font-medium">{plan.name}</p>
                      <p className="text-xs text-white/40">{plan.icon}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{formatCurrency(plan.minAmount)} – {formatCurrency(plan.maxAmount)}</TableCell>
                <TableCell className="text-right font-mono">{formatPercent(plan.dailyReturn)}</TableCell>
                <TableCell className="text-right font-mono text-gold">{formatPercent(plan.totalReturn)}</TableCell>
                <TableCell className="text-right">{plan.durationDays}d</TableCell>
                <TableCell><Switch checked={plan.active} onCheckedChange={() => toggleActive(plan)} aria-label={`Toggle ${plan.name}`} /></TableCell>
                <TableCell><Badge variant={plan.popular ? "gold" : "secondary"}>{plan.popular ? "Yes" : "No"}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="iconSm" onClick={() => openEdit(plan)} aria-label="Edit plan"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="iconSm" onClick={() => setDeleting(plan)} aria-label="Delete plan" className="text-red-400"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing && "id" in editing && editing.id ? "Edit plan" : "Create plan"}</DialogTitle>
            <DialogDescription>Configure the investment plan details and returns.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Name</label>
                <input className="input-dark" value={editing.name} onChange={(e) => updateField("name", e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Icon (lucide name)</label>
                <input className="input-dark" value={editing.icon} onChange={(e) => updateField("icon", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm text-white/60">Description</label>
                <input className="input-dark" value={editing.description} onChange={(e) => updateField("description", e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Min amount ($)</label>
                <input className="input-dark" type="number" value={editing.minAmount} onChange={(e) => updateField("minAmount", Number(e.target.value))} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Max amount ($)</label>
                <input className="input-dark" type="number" value={editing.maxAmount} onChange={(e) => updateField("maxAmount", Number(e.target.value))} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Daily return (%)</label>
                <input className="input-dark" type="number" step="0.01" value={editing.dailyReturn} onChange={(e) => updateField("dailyReturn", Number(e.target.value))} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Total return (%)</label>
                <input className="input-dark" type="number" step="0.1" value={editing.totalReturn} onChange={(e) => updateField("totalReturn", Number(e.target.value))} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Duration (days)</label>
                <input className="input-dark" type="number" value={editing.durationDays} onChange={(e) => updateField("durationDays", Number(e.target.value))} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Accent color</label>
                <input className="input-dark" type="color" value={editing.color} onChange={(e) => updateField("color", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm text-white/60">Features (one per line)</label>
                <textarea className="input-dark min-h-[100px]" value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} />
              </div>
              <div className="flex items-center gap-6 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-white/60">
                  <Switch checked={editing.popular} onCheckedChange={(v) => updateField("popular", v)} />
                  Popular badge
                </label>
                <label className="flex items-center gap-2 text-sm text-white/60">
                  <Switch checked={editing.active} onCheckedChange={(v) => updateField("active", v)} />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm text-white/60">
                  Sort order
                  <input className="input-dark w-20 text-center" type="number" value={editing.sortOrder} onChange={(e) => updateField("sortOrder", Number(e.target.value))} />
                </label>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="gold" disabled={saving || !editing?.name} onClick={save}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete plan?</DialogTitle>
            <DialogDescription>
              This permanently removes the "{deleting?.name}" plan. Existing investments are unaffected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deletingLoading} onClick={confirmDelete}>
              {deletingLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
