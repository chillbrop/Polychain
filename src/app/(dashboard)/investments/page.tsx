"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, Loader2, TrendingUp, History, Rocket, Diamond, Landmark, Crown, CalendarDays, Coins } from "lucide-react";
import { get, post } from "@/lib/api-client";
import type { Investment, InvestmentPlan } from "@/types";
import { formatCurrency, formatDate, formatPercent, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { toast } from "@/components/ui/use-toast";
import { SkeletonCardGrid } from "@/components/shared/skeletons";

const planIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Rocket,
  TrendingUp,
  Diamond,
  Landmark,
};

interface InvestmentsData {
  plans: InvestmentPlan[];
  investments: Investment[];
  active: Investment[];
  completed: Investment[];
}

function InvestDialog({ plan, open, onOpenChange }: { plan: InvestmentPlan | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [preset, setPreset] = useState<number | null>(null);

  const numeric = parseFloat(amount) || 0;
  const dailyRate = plan ? plan.totalReturn / plan.durationDays : 0;
  const dailyProfit = numeric * (dailyRate / 100);
  const totalProfit = numeric * (plan?.totalReturn || 0) / 100;

  const mutation = useMutation({
    mutationFn: () => post("/investments", { planId: plan?.id, amount: numeric }),
    onSuccess: (data) => {
      toast({ title: "Investment started", description: (data as { message?: string }).message || "Your investment is now active.", variant: "success" });
      onOpenChange(false);
      setAmount("");
      setPreset(null);
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (error) => toast({ title: "Investment failed", description: (error as Error).message, variant: "destructive" }),
  });

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invest in {plan.name}</DialogTitle>
          <DialogDescription>
            {formatCurrency(plan.minAmount)} – {formatCurrency(plan.maxAmount)} · {plan.dailyReturn.toFixed(2)}% daily · {plan.durationDays} days
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm text-white/60">Amount (USD)</label>
            <input
              className="input-dark"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setPreset(null);
              }}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {[plan.minAmount, Math.round(plan.minAmount * 5), Math.round(plan.minAmount * 10), plan.maxAmount].filter((v, i, arr) => arr.indexOf(v) === i).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setAmount(String(p));
                    setPreset(p);
                  }}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                    preset === p ? "border-gold bg-gold/10 text-gold" : "border-white/10 text-white/50 hover:border-white/25"
                  )}
                >
                  ${p.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
            <div>
              <p className="flex items-center gap-1 text-xs text-white/40"><Coins className="h-3 w-3" /> Daily profit</p>
              <p className="mt-1 font-display text-sm font-bold text-gold">{formatCurrency(dailyProfit)}</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs text-white/40"><TrendingUp className="h-3 w-3" /> Total return</p>
              <p className="mt-1 font-display text-sm font-bold text-emerald-400">{formatCurrency(totalProfit)}</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs text-white/40"><CalendarDays className="h-3 w-3" /> Maturity</p>
              <p className="mt-1 font-display text-sm font-bold text-white">{formatCurrency(numeric + totalProfit)}</p>
            </div>
          </div>

          <Button
            variant="gold"
            className="w-full"
            disabled={!numeric || numeric < plan.minAmount || numeric > plan.maxAmount || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {numeric < plan.minAmount ? `Minimum ${formatCurrency(plan.minAmount)}` : numeric > plan.maxAmount ? `Maximum ${formatCurrency(plan.maxAmount)}` : "Confirm Investment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlanCard({ plan, onInvest }: { plan: InvestmentPlan; onInvest: (p: InvestmentPlan) => void }) {
  const Icon = planIcons[plan.icon] || TrendingUp;
  const dailyRate = plan.totalReturn / plan.durationDays;

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={cn(
        "relative flex h-full flex-col rounded-2xl border p-6 transition-colors",
        plan.popular ? "border-gold/40 bg-gradient-to-b from-gold/[0.08] to-transparent" : "border-white/[0.08] bg-white/[0.03] hover:border-gold/30"
      )}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-4 flex items-center gap-1 rounded-full bg-gold-gradient px-3 py-0.5 text-[10px] font-bold text-navy-dark">
          <Crown className="h-3 w-3" /> POPULAR
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${plan.color}1a`, color: plan.color }}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-display font-semibold">{plan.name}</h3>
          <p className="text-xs text-white/40">{plan.durationDays} days</p>
        </div>
      </div>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="font-display text-2xl font-bold">{plan.dailyReturn.toFixed(2)}%</span>
        <span className="text-xs text-white/40">/ day</span>
      </div>
      <div className="mt-3 space-y-1.5 text-xs text-white/50">
        <p>Total return: <span className="font-semibold text-white">{formatPercent(plan.totalReturn)}</span></p>
        <p>Range: <span className="font-semibold text-white">{formatCurrency(plan.minAmount)} – {formatCurrency(plan.maxAmount)}</span></p>
      </div>
      <div className="mt-4 flex-1 space-y-1.5 border-t border-white/[0.06] pt-4">
        {plan.features.slice(0, 3).map((f) => (
          <p key={f} className="flex items-center gap-2 text-xs text-white/60">
            <Check className="h-3.5 w-3.5 text-gold" /> {f}
          </p>
        ))}
      </div>
      <button
        onClick={() => onInvest(plan)}
        className={cn(
          "mt-5 h-10 w-full rounded-xl text-sm font-medium transition-all",
          plan.popular ? "gold-btn" : "border border-white/15 bg-white/[0.04] text-white hover:border-gold/40"
        )}
      >
        Invest Now
      </button>
    </motion.div>
  );
}

function InvestmentCard({ investment }: { investment: Investment }) {
  const { plan, amount, profitEarned, totalReturn, status, startDate, endDate } = investment;
  const progress = Math.min(100, (profitEarned / totalReturn) * 100);
  const remaining = Math.max(0, (new Date(endDate).getTime() - Date.now()) / (24 * 3600 * 1000));

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${plan.color}1a`, color: plan.color }}>
              {(() => { const I = planIcons[plan.icon] || TrendingUp; return <I className="h-5 w-5" />; })()}
            </div>
            <div>
              <p className="font-display text-sm font-semibold">{plan.name}</p>
              <p className="text-xs text-white/40">Started {formatDate(startDate)}</p>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-white/40">Invested</p>
            <p className="mt-0.5 font-display text-sm font-bold">{formatCurrency(amount)}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Earned</p>
            <p className="mt-0.5 font-display text-sm font-bold text-emerald-400">{formatCurrency(profitEarned)}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Expected</p>
            <p className="mt-0.5 font-display text-sm font-bold text-gold">{formatCurrency(totalReturn)}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>Return progress</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <Progress value={progress} className="mt-1.5" />
        </div>

        {status === "ACTIVE" && (
          <p className="mt-3 text-xs text-white/40">
            {remaining > 0 ? `${Math.ceil(remaining)} days remaining` : "Finalizing payout..."} · ends {formatDate(endDate)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function InvestmentsPage() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get("plan") || "";
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = useQuery<InvestmentsData>({
    queryKey: ["investments"],
    queryFn: () => get("/investments"),
    refetchInterval: 30000,
  });

  const plans = useMemo(() => {
    if (!data?.plans || !preselected) return data?.plans || [];
    const found = data.plans.find((p) => p.id === preselected);
    if (found) {
      return [found, ...data.plans.filter((p) => p.id !== preselected)];
    }
    return data.plans;
  }, [data, preselected]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded-lg bg-white/5 animate-pulse" />
          <div className="h-4 w-80 rounded bg-white/5 animate-pulse" />
        </div>
        <SkeletonCardGrid count={4} />
      </div>
    );
  }

  const active = data?.active || [];
  const completed = data?.completed || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Investments</h1>
        <p className="mt-1 text-sm text-white/50">Choose a plan and start earning daily profits.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {(plans || []).map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onInvest={(p) => {
              setSelectedPlan(p);
              setDialogOpen(true);
            }}
          />
        ))}
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          {active.length === 0 ? (
            <div className="glass-card flex flex-col items-center gap-3 py-16 text-center">
              <History className="h-10 w-10 text-white/20" />
              <p className="font-display font-semibold">No active investments</p>
              <p className="text-sm text-white/40">Pick a plan above to get your money working.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {active.map((inv) => <InvestmentCard key={inv.id} investment={inv} />)}
            </div>
          )}
        </TabsContent>
        <TabsContent value="completed">
          {completed.length === 0 ? (
            <div className="glass-card flex flex-col items-center gap-3 py-16 text-center">
              <History className="h-10 w-10 text-white/20" />
              <p className="font-display font-semibold">No completed investments yet</p>
              <p className="text-sm text-white/40">Your finished plans will appear here with full profit history.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {completed.map((inv) => <InvestmentCard key={inv.id} investment={inv} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <InvestDialog plan={selectedPlan} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
