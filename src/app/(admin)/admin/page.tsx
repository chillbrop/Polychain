"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  Activity,
  Clock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { get } from "@/lib/api-client";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCompact, formatCurrency, formatDateTime } from "@/lib/utils";
import { SkeletonCardGrid, ChartSkeleton } from "@/components/shared/skeletons";

interface AdminDashboard {
  stats: {
    users: number;
    totalUsers: number;
    verifiedUsers: number;
    totalDeposited: number;
    totalWithdrawn: number;
    totalInvested: number;
    totalInvestments: number;
    activeInvestments: number;
    activePlans: number;
    openTickets: number;
  };
  recentUsers: Array<{ id: string; username: string; email: string; createdAt: string; totalDeposited: number }>;
  recentDeposits: Array<{ id: string; amount: number; status: string; createdAt: string; user: { username: string } }>;
  recentWithdrawals: Array<{ id: string; amount: number; status: string; createdAt: string; user: { username: string } }>;
  chartData: Array<{ label: string; deposits: number; volume: number }>;
}

export default function AdminOverview() {
  const { data, isLoading } = useQuery<AdminDashboard>({
    queryKey: ["admin-dashboard"],
    queryFn: () => get("/admin/dashboard"),
    refetchInterval: 30000,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <SkeletonCardGrid count={4} />
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  const { stats } = data;
  const pieData = [
    { name: "Deposited", value: stats.totalDeposited },
    { name: "Invested", value: stats.totalInvested },
    { name: "Withdrawn", value: stats.totalWithdrawn },
  ];
  const pieColors = ["#F4B400", "#38BDF8", "#34D399"];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Platform Analytics</h1>
        <p className="mt-1 text-sm text-white/50">Real-time overview of the Polychain Capital platform.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Users" value={stats.users.toLocaleString()} icon={<Users className="h-5 w-5" />} color="sky" trend={`${stats.verifiedUsers.toLocaleString()} verified`} delay={0} />
        <StatCard label="Total Deposits" value={formatCompact(stats.totalDeposited)} icon={<ArrowDownToLine className="h-5 w-5" />} color="gold" trend="all time" delay={0.06} />
        <StatCard label="Total Withdrawals" value={formatCompact(stats.totalWithdrawn)} icon={<ArrowUpFromLine className="h-5 w-5" />} color="emerald" trend="all time" delay={0.12} />
        <StatCard label="Under Management" value={formatCompact(stats.totalInvested)} icon={<TrendingUp className="h-5 w-5" />} color="violet" trend={`${stats.activeInvestments.toLocaleString()} active`} delay={0.18} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold">Deposit Volume</h3>
              <p className="text-xs text-white/40">Last 30 days</p>
            </div>
            <Activity className="h-5 w-5 text-gold" />
          </div>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <defs>
                  <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F4B400" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#F4B400" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "#0A1A33", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 13 }}
                  formatter={(value: number | string) => formatCurrency(Number(value))}
                />
                <Area type="monotone" dataKey="volume" stroke="#F4B400" strokeWidth={2.5} fill="url(#goldFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-display font-semibold">Capital Flow</h3>
          <p className="text-xs text-white/40">Deposited vs invested vs withdrawn</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={pieColors[i]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#0A1A33", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}
                  formatter={(value: number | string) => formatCurrency(Number(value))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-2">
            {pieData.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-white/60">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: pieColors[i] }} />
                  {p.name}
                </span>
                <span className="font-mono font-medium">{formatCompact(p.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <h3 className="font-display font-semibold">New Users</h3>
            <Users className="h-4 w-4 text-white/30" />
          </div>
          <div className="divide-y divide-white/[0.04]">
            {data.recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium">{u.username}</p>
                  <p className="text-xs text-white/40">{u.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/40">{formatDateTime(u.createdAt)}</p>
                  <p className="font-mono text-xs font-semibold text-gold">{formatCurrency(u.totalDeposited)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <h3 className="font-display font-semibold">Pending Deposits</h3>
            <Clock className="h-4 w-4 text-white/30" />
          </div>
          <div className="divide-y divide-white/[0.04]">
            {data.recentDeposits.length === 0 && <p className="py-8 text-center text-sm text-white/40">No pending deposits</p>}
            {data.recentDeposits.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium">{d.user.username}</p>
                  <p className="text-xs text-white/40">{formatDateTime(d.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold text-gold">{formatCurrency(d.amount)}</p>
                  <StatusBadge status={d.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <h3 className="font-display font-semibold">Pending Withdrawals</h3>
            <Clock className="h-4 w-4 text-white/30" />
          </div>
          <div className="divide-y divide-white/[0.04]">
            {data.recentWithdrawals.length === 0 && <p className="py-8 text-center text-sm text-white/40">No pending withdrawals</p>}
            {data.recentWithdrawals.map((w) => (
              <div key={w.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium">{w.user.username}</p>
                  <p className="text-xs text-white/40">{formatDateTime(w.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold text-amber-400">{formatCurrency(w.amount)}</p>
                  <StatusBadge status={w.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
