"use client";

import { useMemo, useState } from "react";
import { Slider } from "@radix-ui/react-slider";
import { Calculator as CalculatorIcon, TrendingUp } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Reveal } from "@/components/shared/reveal";
import { formatCurrency } from "@/lib/utils";
import type { InvestmentPlan } from "@/types";

export function Calculator({ plans }: { plans: InvestmentPlan[] }) {
  const [selected, setSelected] = useState(plans[0]?.id || "");
  const [amount, setAmount] = useState(1000);

  const plan = plans.find((p) => p.id === selected) || plans[0];

  const dailyRate = plan ? plan.totalReturn / plan.durationDays : 0;

  const chartData = useMemo(() => {
    if (!plan) return [];
    const data: Array<{ day: number; balance: number; profit: number }> = [];
    let balance = amount;
    for (let day = 1; day <= plan.durationDays; day += Math.max(1, Math.floor(plan.durationDays / 10))) {
      balance += amount * (dailyRate / 100);
      data.push({ day, balance: Math.round(balance), profit: Math.round(balance - amount) });
    }
    if (data[data.length - 1]?.day !== plan.durationDays) {
      balance = amount * (1 + plan.totalReturn / 100);
      data.push({ day: plan.durationDays, balance: Math.round(balance), profit: Math.round(balance - amount) });
    }
    return data;
  }, [plan, amount, dailyRate]);

  if (!plan) return null;

  const dailyProfit = amount * (dailyRate / 100);
  const totalProfit = amount * (plan.totalReturn / 100);

  return (
    <section id="calculator" className="relative py-24">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">Profit Calculator</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
            See your <span className="text-gradient-gold">returns before</span> you invest
          </h2>
          <p className="mt-4 text-white/50">
            Drag the slider and pick a plan to project your earnings, day by day.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="glass-card mx-auto mt-14 grid max-w-5xl gap-10 p-8 lg:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-white/60">Investment plan</label>
              <div className="mt-3 flex flex-wrap gap-2">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p.id)}
                    className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                      p.id === plan.id
                        ? "border-gold bg-gold/10 text-gold shadow-glow-sm"
                        : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              <div className="mt-8">
                <div className="flex items-end justify-between">
                  <label className="text-sm font-medium text-white/60">Investment amount</label>
                  <span className="font-display text-2xl font-bold text-gradient-gold">
                    {formatCurrency(amount)}
                  </span>
                </div>
                <Slider
                  value={[amount]}
                  min={Math.min(plan.minAmount, 100)}
                  max={Math.max(plan.maxAmount, 50000)}
                  step={50}
                  onValueChange={(val) => setAmount(val[0])}
                  className="relative mt-4 flex h-6 w-full touch-none items-center"
                  aria-label="Investment amount"
                />
                <div className="mt-2 flex justify-between text-xs text-white/30">
                  <span>{formatCurrency(Math.min(plan.minAmount, 100))}</span>
                  <span>{formatCurrency(Math.max(plan.maxAmount, 50000))}</span>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="flex items-center gap-1.5 text-xs text-white/40">
                    <CalculatorIcon className="h-3.5 w-3.5" />
                    Daily profit
                  </p>
                  <p className="mt-1.5 font-display text-xl font-bold text-gold">{formatCurrency(dailyProfit)}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="flex items-center gap-1.5 text-xs text-white/40">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Total return
                  </p>
                  <p className="mt-1.5 font-display text-xl font-bold text-emerald-400">{formatCurrency(totalProfit)}</p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-gold/20 bg-gold/[0.05] p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Daily rate</span>
                  <span className="font-semibold text-gold">{dailyRate.toFixed(2)}%</span>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-white/50">Duration</span>
                  <span className="font-semibold text-white">{plan.durationDays} days</span>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-white/50">Maturity value</span>
                  <span className="font-semibold text-emerald-400">{formatCurrency(amount + totalProfit)}</span>
                </div>
              </div>
            </div>

            <div className="flex min-h-[320px] flex-col">
              <p className="text-sm font-medium text-white/60">Projected growth curve</p>
              <div className="mt-4 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                    <Tooltip
                      contentStyle={{
                        background: "#0A1A33",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 12,
                        fontSize: 13,
                      }}
                      labelStyle={{ color: "rgba(255,255,255,0.5)" }}
                      formatter={(value: number | string, name: string) => [
                        formatCurrency(Number(value)),
                        name === "balance" ? "Balance" : "Profit",
                      ]}
                    />
                    <Line type="monotone" dataKey="balance" stroke="#F4B400" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="profit" stroke="#34D399" strokeWidth={2} dot={false} strokeDasharray="6 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex justify-center gap-6 text-xs text-white/40">
                <span className="flex items-center gap-2">
                  <span className="h-0.5 w-4 bg-gold" /> Balance
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-0.5 w-4 bg-emerald-400" /> Profit
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
