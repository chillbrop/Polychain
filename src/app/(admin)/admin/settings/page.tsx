"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { get, patch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

const defaultKeys = ["siteName", "siteEmail", "supportEmail", "telegram", "whatsapp", "minDeposit", "minWithdraw", "referralBonusPct", "paystackUsdRate", "mpesaUsdRate", "maintenanceMode", "welcomeBonus"];

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [entries, setEntries] = useState<Array<{ key: string; value: string }>>([]);
  const [dirty, setDirty] = useState(false);

  const { data, isLoading } = useQuery<{ settings: Record<string, string> }>({
    queryKey: ["admin-settings"],
    queryFn: () => get("/admin/settings"),
  });

  useEffect(() => {
    if (data?.settings) {
      const existing = Object.entries(data.settings)
        .filter(([key]) => !key.startsWith("prefs:") && !key.startsWith("subscriber:"))
        .map(([key, value]) => ({ key, value }));
      const keys = new Set(existing.map((e) => e.key));
      const merged = [...existing, ...defaultKeys.filter((k) => !keys.has(k)).map((k) => ({ key: k, value: "" }))];
      setEntries(merged);
      setDirty(false);
    }
  }, [data]);

  const update = (i: number, field: "key" | "value", val: string) => {
    setEntries((prev) => prev.map((e, idx) => (idx === i ? { ...e, [field]: val } : e)));
    setDirty(true);
  };

  const remove = (i: number) => {
    setEntries((prev) => prev.filter((_, idx) => idx !== i));
    setDirty(true);
  };

  const add = () => {
    setEntries((prev) => [...prev, { key: "", value: "" }]);
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const body: Record<string, string> = {};
      for (const e of entries) if (e.key.trim()) body[e.key.trim()] = e.value;
      return patch("/admin/settings", body);
    },
    onSuccess: () => {
      toast({ title: "Settings saved", variant: "success" });
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (e) => toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-white/40">Key/value configuration stored in the database.</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={add}><Plus className="h-4 w-4" /> Add field</Button>
          <Button variant="gold" disabled={!dirty || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-[1fr_2fr_auto] gap-3 border-b border-white/[0.06] px-5 py-3 text-xs font-semibold uppercase tracking-widest text-white/40">
          <span>Key</span>
          <span>Value</span>
          <span />
        </div>
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-3 border-b border-white/[0.03] px-5 py-3">
            <div className="h-9 rounded bg-white/5 animate-pulse" />
            <div className="h-9 rounded bg-white/5 animate-pulse" />
          </div>
        ))}
        {!isLoading && entries.map((e, i) => (
          <div key={i} className="grid grid-cols-[1fr_2fr_auto] items-center gap-3 border-b border-white/[0.03] px-5 py-3">
            <input className="input-dark font-mono text-xs" value={e.key} placeholder="setting_key" onChange={(ev) => update(i, "key", ev.target.value)} />
            <input className="input-dark" value={e.value} placeholder="value" onChange={(ev) => update(i, "value", ev.target.value)} />
            <Button variant="ghost" size="iconSm" onClick={() => remove(i)} aria-label="Remove field" className="text-red-400">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {!isLoading && entries.length === 0 && <p className="py-12 text-center text-sm text-white/40">No settings yet — add your first field.</p>}
      </div>

      <div className="rounded-2xl border border-sky-400/20 bg-sky-400/[0.05] p-4 text-sm text-sky-200/80">
        Known keys: <code className="font-mono">siteName, siteEmail, supportEmail, telegram, whatsapp, minDeposit, minWithdraw, referralBonusPct, paystackUsdRate, mpesaUsdRate, maintenanceMode, welcomeBonus</code>. Payment rates are native currency units per USD (for example, NGN/KES per $1) and are locked onto each payment when it starts.
      </div>
    </div>
  );
}
