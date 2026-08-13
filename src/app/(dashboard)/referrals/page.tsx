"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Users, Gift, TrendingUp, Link2, Send } from "lucide-react";
import { get } from "@/lib/api-client";
import { toast } from "@/components/ui/use-toast";
import { StatCard } from "@/components/dashboard/stat-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate, initials } from "@/lib/utils";
import { SkeletonCardGrid } from "@/components/shared/skeletons";

interface ReferralsData {
  referralLink: string;
  referralCode: string;
  totalReferrals: number;
  activeReferrals: number;
  totalCommission: number;
  referralBonusPct: number;
  referrals: Array<{
    id: string;
    username: string;
    email: string;
    avatarUrl?: string | null;
    createdAt: string;
    totalInvested: number;
    kycStatus: string;
  }>;
  transactions: Array<{
    id: string;
    amount: number;
    description: string;
    createdAt: string;
    status: string;
  }>;
}

export default function ReferralsPage() {
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<ReferralsData>({
    queryKey: ["referrals"],
    queryFn: () => get("/referrals"),
    refetchInterval: 30000,
  });

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Copied", description: `${label} copied to clipboard.`, variant: "success" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 rounded-lg bg-white/5 animate-pulse" />
        <SkeletonCardGrid count={4} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Referral Program</h1>
        <p className="mt-1 text-sm text-white/50">Invite friends and earn {data.referralBonusPct}% on every investment they make.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Referrals" value={data.totalReferrals} icon={<Users className="h-5 w-5" />} color="sky" delay={0} />
        <StatCard label="Active Referrals" value={data.activeReferrals} icon={<Gift className="h-5 w-5" />} color="emerald" delay={0.06} />
        <StatCard label="Commission Earned" value={formatCurrency(data.totalCommission)} icon={<TrendingUp className="h-5 w-5" />} color="gold" delay={0.12} />
        <StatCard label="Commission Rate" value={`${data.referralBonusPct}%`} icon={<Link2 className="h-5 w-5" />} color="violet" delay={0.18} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass-card space-y-5 p-8 lg:col-span-2">
          <div>
            <h3 className="font-display font-semibold">Your referral link</h3>
            <p className="mt-1 text-sm text-white/40">Share this link — commissions are credited instantly and forever.</p>
          </div>

          <div className="rounded-xl border border-gold/20 bg-gold/[0.05] p-4">
            <label className="text-xs text-white/40">Referral code</label>
            <div className="mt-1.5 flex items-center gap-3">
              <code className="flex-1 font-mono text-lg font-bold text-gold">{data.referralCode}</code>
              <button onClick={() => copy(data.referralCode, "Referral code")} className="flex h-9 items-center gap-1.5 rounded-lg border border-white/15 px-3 text-xs font-medium hover:border-gold/40">
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                Copy
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-white/40">Full referral link</label>
            <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <code className="flex-1 break-all font-mono text-xs text-white/60">{data.referralLink}</code>
              <button onClick={() => copy(data.referralLink, "Referral link")} className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-gold-gradient px-3 text-xs font-semibold text-navy-dark">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <button className="inline-flex items-center gap-2 text-sm text-gold hover:underline">
            <Send className="h-4 w-4" />
            Share via email or social
          </button>
        </div>

        <div className="glass-card p-8">
          <h3 className="font-display font-semibold">How it works</h3>
          <ol className="mt-5 space-y-4">
            {[
              "Share your unique link with friends.",
              "They sign up and start investing.",
              "You instantly earn 10% of their investment.",
              "Repeat — no caps, no expiration.",
            ].map((step, i) => (
              <li key={step} className="flex items-start gap-3 text-sm text-white/60">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-bold text-gold">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
            <p className="text-xs text-emerald-300">Pro tip: referrals who upgrade to paid plans earn you commission on every single plan.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card overflow-hidden">
          <div className="border-b border-white/[0.06] px-6 py-4">
            <h3 className="font-display font-semibold">Your Referrals</h3>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {data.referrals.length === 0 && <p className="py-10 text-center text-sm text-white/40">No referrals yet — share your link to get started.</p>}
            {data.referrals.map((r) => (
              <div key={r.id} className="flex items-center gap-4 px-6 py-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{initials(r.username)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{r.username}</p>
                  <p className="text-xs text-white/40">Joined {formatDate(r.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold text-white/70">{formatCurrency(r.totalInvested)}</p>
                  <StatusBadge status={r.totalInvested > 0 ? "APPROVED" : "NOT_SUBMITTED"} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="border-b border-white/[0.06] px-6 py-4">
            <h3 className="font-display font-semibold">Commission History</h3>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {data.transactions.length === 0 && <p className="py-10 text-center text-sm text-white/40">No commissions yet.</p>}
            {data.transactions.map((t) => (
              <div key={t.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-400/15">
                  <Gift className="h-4 w-4 text-sky-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white/80">{t.description}</p>
                  <p className="text-xs text-white/40">{formatDate(t.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold text-emerald-400">+{formatCurrency(t.amount)}</p>
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
