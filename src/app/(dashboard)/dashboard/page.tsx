"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  TrendingUp,
  Coins,
  Users,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Gift,
  Sparkles,
  ChevronRight,
  Activity as ActivityIcon,
  CircleDollarSign,
} from "lucide-react";
import { get } from "@/lib/api-client";
import type { DashboardData, Transaction } from "@/types";
import { StatCard } from "@/components/dashboard/stat-card";
import { SkeletonCardGrid, ChartSkeleton, TableSkeleton } from "@/components/shared/skeletons";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, timeAgo, formatPercent } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { RippleButton } from "@/components/shared/ripple-button";

const txIcons: Record<string, React.ReactNode> = {
  DEPOSIT: <ArrowDownLeft className="h-4 w-4 text-emerald-400" />,
  WITHDRAWAL: <ArrowUpRight className="h-4 w-4 text-amber-400" />,
  PROFIT: <Gift className="h-4 w-4 text-gold" />,
  REFERRAL_COMMISSION: <Users className="h-4 w-4 text-sky-400" />,
  INVESTMENT: <TrendingUp className="h-4 w-4 text-violet-400" />,
  BONUS: <Sparkles className="h-4 w-4 text-gold" />,
};

function TransactionRow({ tx }: { tx: Transaction }) {
  const isCredit = tx.type === "DEPOSIT" || tx.type === "PROFIT" || tx.type === "REFERRAL_COMMISSION" || tx.type === "BONUS";
  return (
    <div className="flex items-center gap-4 border-b border-white/[0.04] px-5 py-4 last:border-0">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.05]">
        {txIcons[tx.type] || <CircleDollarSign className="h-4 w-4 text-white/40" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white/85">{tx.description}</p>
        <p className="text-xs text-white/40">
          {tx.reference} · {timeAgo(tx.createdAt)}
        </p>
      </div>
      <div className="text-right">
        <p className={`font-mono text-sm font-semibold ${isCredit ? "text-emerald-400" : "text-white/70"}`}>
          {isCredit ? "+" : ""}
          {formatCurrency(tx.amount)}
        </p>
        <StatusBadge status={tx.status} />
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => get("/user/dashboard"),
    refetchInterval: 45000,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="h-8 w-64 rounded-lg bg-white/5 animate-pulse" />
          <div className="flex gap-3">
            <div className="h-11 w-36 rounded-xl bg-white/5 animate-pulse" />
            <div className="h-11 w-36 rounded-xl bg-white/5 animate-pulse" />
          </div>
        </div>
        <SkeletonCardGrid count={4} />
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  const { user, activeInvestments, activeCount, totalEarnings, referralCount, recentTransactions, activities, plans } = data;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">
            Welcome back, {user.firstName || user.username} 👋
          </h1>
          <p className="mt-1 text-sm text-white/50">Here's what's happening with your portfolio today.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/wallet?tab=deposit">
            <RippleButton className="gold-btn inline-flex h-11 items-center rounded-xl px-5 text-sm">
              <Plus className="h-4 w-4" />
              Deposit
            </RippleButton>
          </Link>
          <Link href="/investments">
            <RippleButton className="inline-flex h-11 items-center rounded-xl border border-white/15 bg-white/[0.04] px-5 text-sm text-white hover:border-gold/40">
              <TrendingUp className="h-4 w-4 text-gold" />
              Invest
            </RippleButton>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Wallet Balance"
          value={formatCurrency(user.walletBalance)}
          icon={<Wallet className="h-5 w-5" />}
          color="gold"
          trend="Available for investing"
          delay={0}
        />
        <StatCard
          label="Profit Balance"
          value={formatCurrency(user.profitBalance)}
          icon={<Coins className="h-5 w-5" />}
          color="emerald"
          trend="Earned so far"
          delay={0.06}
        />
        <StatCard
          label="Active Investments"
          value={formatCurrency(activeInvestments)}
          icon={<TrendingUp className="h-5 w-5" />}
          color="sky"
          trend={`${activeCount} active plan${activeCount === 1 ? "" : "s"}`}
          delay={0.12}
        />
        <StatCard
          label="Total Earnings"
          value={formatCurrency(totalEarnings)}
          icon={<CircleDollarSign className="h-5 w-5" />}
          color="violet"
          trend={`${referralCount} referral${referralCount === 1 ? "" : "s"}`}
          trendLabel="invited"
          delay={0.18}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div>
              <h3 className="font-display font-semibold">Available Plans</h3>
              <p className="text-xs text-white/40">Lock in your daily return today</p>
            </div>
            <Link href="/investments" className="flex items-center gap-1 text-sm text-gold hover:underline">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            {plans.slice(0, 4).map((plan, i) => (
              <Link key={plan.id} href={`/investments?plan=${plan.id}`} className="group rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 transition-all hover:border-gold/40 hover:bg-gold/[0.04]">
                <div className="flex items-center justify-between">
                  <p className="font-display font-semibold">{plan.name}</p>
                  {plan.popular && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">POPULAR</span>}
                </div>
                <p className="mt-2 font-display text-xl font-bold text-gradient-gold">
                  {plan.dailyReturn.toFixed(2)}% <span className="text-xs font-normal text-white/40">daily</span>
                </p>
                <p className="mt-1 text-xs text-white/40">
                  {formatCurrency(plan.minAmount)} – {formatCurrency(plan.maxAmount)} · {plan.durationDays} days
                </p>
              </Link>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <h3 className="font-display font-semibold">Recent Activity</h3>
            <ActivityIcon className="h-4 w-4 text-white/30" />
          </div>
          <div className="divide-y divide-white/[0.04] px-6">
            {(activities ?? []).length === 0 && <p className="py-8 text-center text-sm text-white/40">No activity yet</p>}
            {(activities ?? []).slice(0, 6).map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/10">
                  <Sparkles className="h-3.5 w-3.5 text-gold" />
                </div>
                <p className="flex-1 text-sm text-white/70">{a.action}</p>
                <span className="text-xs text-white/30">{timeAgo(a.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div>
            <h3 className="font-display font-semibold">Recent Transactions</h3>
            <p className="text-xs text-white/40">Your latest wallet activity</p>
          </div>
          <Link href="/wallet" className="flex items-center gap-1 text-sm text-gold hover:underline">
            Full history <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="max-h-[440px] overflow-y-auto">
          {(recentTransactions ?? []).length === 0 && <p className="py-10 text-center text-sm text-white/40">No transactions yet — make your first deposit to get started.</p>}
          {(recentTransactions ?? []).slice(0, 8).map((tx) => (
            <TransactionRow key={tx.id} tx={tx} />
          ))}
        </div>
      </div>
    </div>
  );
}
