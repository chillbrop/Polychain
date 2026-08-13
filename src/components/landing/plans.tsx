"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Rocket, TrendingUp, Diamond, Landmark, Crown } from "lucide-react";
import type { InvestmentPlan } from "@/types";
import { cn, formatCurrency } from "@/lib/utils";
import { Reveal } from "@/components/shared/reveal";
import { RippleButton } from "@/components/shared/ripple-button";
import { useAuthStore } from "@/stores/auth-store";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Rocket,
  TrendingUp,
  Diamond,
  Landmark,
};

function PlanCard({ plan }: { plan: InvestmentPlan }) {
  const Icon = iconMap[plan.icon] || TrendingUp;
  const dailyReturn = plan.totalReturn / plan.durationDays;
  const { user } = useAuthStore();

  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={cn(
        "relative flex h-full flex-col rounded-2xl border p-7 transition-colors",
        plan.popular
          ? "border-gold/40 bg-gradient-to-b from-gold/[0.08] to-transparent shadow-glow-sm"
          : "border-white/[0.08] bg-white/[0.03] hover:border-gold/30"
      )}
    >
      {plan.popular && (
        <div className="absolute -top-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-gold-gradient px-4 py-1 text-xs font-bold text-navy-dark shadow-glow-sm">
          <Crown className="h-3.5 w-3.5" />
          Most Popular
        </div>
      )}

      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${plan.color}1a`, color: plan.color }}
      >
        <Icon className="h-6 w-6" />
      </div>

      <h3 className="mt-5 font-display text-xl font-bold">{plan.name}</h3>
      <p className="mt-1.5 min-h-[40px] text-sm text-white/50">{plan.description}</p>

      <div className="mt-6 flex items-end gap-2">
        <span className="font-display text-4xl font-bold">
          {formatCurrency(plan.minAmount)}
        </span>
        <span className="mb-1.5 text-sm text-white/40">minimum</span>
      </div>

      <div className="mt-6 space-y-2.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/50">Daily return</span>
          <span className="font-semibold text-gold">{dailyReturn.toFixed(2)}%</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/50">Total return</span>
          <span className="font-semibold text-white">{plan.totalReturn.toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/50">Duration</span>
          <span className="font-semibold text-white">{plan.durationDays} days</span>
        </div>
      </div>

      <div className="mt-6 flex-1 space-y-2.5 border-t border-white/[0.06] pt-5">
        {plan.features.slice(0, 5).map((feature) => (
          <div key={feature} className="flex items-start gap-2.5 text-sm text-white/70">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            {feature}
          </div>
        ))}
      </div>

      <Link href={user ? `/investments?plan=${plan.id}` : "/register"} className="mt-7 block">
        <RippleButton
          className={cn(
            "h-11 w-full rounded-xl text-sm",
            plan.popular ? "gold-btn" : "border border-white/15 bg-white/[0.04] text-white hover:border-gold/40"
          )}
        >
          Invest Now
        </RippleButton>
      </Link>
    </motion.div>
  );
}

export function Plans({ plans }: { plans: InvestmentPlan[] }) {
  return (
    <section id="plans" className="relative py-24">
      <div className="absolute inset-x-0 top-0 mx-auto h-px max-w-3xl bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">Investment Plans</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
            Choose your <span className="text-gradient-gold">growth tier</span>
          </h2>
          <p className="mt-4 text-white/50">
            From your first step to institutional scale — every plan is built for compounding,
            transparency and daily profits.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan, i) => (
            <Reveal key={plan.id} delay={i * 0.08} className="h-full">
              <PlanCard plan={plan} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
