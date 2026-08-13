"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Bitcoin,
  Gauge,
  TrendingUp,
  Coins,
  Rocket,
  Lock,
} from "lucide-react";
import { RippleButton } from "@/components/shared/ripple-button";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { useAuthStore } from "@/stores/auth-store";

const floatingIcons = [
  { Icon: Bitcoin, className: "left-[8%] top-[30%]", delay: 0 },
  { Icon: TrendingUp, className: "right-[10%] top-[24%]", delay: 0.8 },
  { Icon: Coins, className: "left-[16%] bottom-[18%]", delay: 1.6 },
  { Icon: Rocket, className: "right-[18%] bottom-[26%]", delay: 2.4 },
  { Icon: Gauge, className: "left-[40%] top-[16%]", delay: 3.2 },
];

const trustItems = [
  { icon: ShieldCheck, label: "Bank-grade security" },
  { icon: Lock, label: "Non-custodial smart contracts" },
];

export function Hero() {
  const { user } = useAuthStore();
  return (
    <section className="relative overflow-hidden pb-24 pt-40">
      <div className="absolute inset-0 bg-hero-glow" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_20%,rgba(244,180,0,0.08),transparent)]" />

      {floatingIcons.map(({ Icon, className, delay }, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 + delay * 0.4, duration: 0.6 }}
          className={`pointer-events-none absolute hidden animate-float lg:block ${className}`}
          style={{ animationDelay: `${delay}s` }}
        >
          <div className="glass flex h-14 w-14 items-center justify-center rounded-2xl">
            <Icon className="h-6 w-6 text-gold" />
          </div>
        </motion.div>
      ))}

      <div className="container relative text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-4 py-1.5 text-sm text-gold"
        >
          <Sparkles className="h-4 w-4" />
          Trusted by investors in 40+ countries
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto max-w-4xl font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl"
        >
          Invest Smarter.
          <br />
          <span className="text-gradient-gold">Grow Faster.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-white/60"
        >
          Polychain Capital turns idle digital assets into a compounding growth engine. Secure, transparent
          and engineered for the modern investor — from your first dollar to your next million.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link href={user ? "/investments" : "/register"}>
            <RippleButton className="gold-btn h-13 rounded-xl px-8 py-3.5 text-base">
              Start Investing
              <ArrowRight className="h-5 w-5" />
            </RippleButton>
          </Link>
          <Link
            href="#plans"
            className="inline-flex h-13 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-8 py-3.5 text-base font-medium transition-all hover:border-gold/40 hover:bg-white/[0.08]"
          >
            View Investment Plans
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-6"
        >
          {trustItems.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm text-white/50">
              <Icon className="h-4 w-4 text-emerald-400" />
              {label}
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55 }}
          className="glass-card mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-8 p-8 sm:grid-cols-3"
        >
          <div>
            <p className="text-sm text-white/50">Total Paid Out</p>
            <p className="mt-2 font-display text-3xl font-bold text-gradient-gold">
              <AnimatedCounter prefix="$" value={520000} suffix="+" />
            </p>
            <p className="mt-1 text-xs text-emerald-400">and counting</p>
          </div>
          <div className="sm:border-x sm:border-white/[0.06]">
            <p className="text-sm text-white/50">Active Investors</p>
            <p className="mt-2 font-display text-3xl font-bold text-white">
              <AnimatedCounter value={12800} suffix="+" />
            </p>
            <p className="mt-1 text-xs text-white/40">growing daily</p>
          </div>
          <div>
            <p className="text-sm text-white/50">Daily Payout Rate</p>
            <p className="mt-2 font-display text-3xl font-bold text-gradient-gold">
              <AnimatedCounter value={3.0} decimals={1} suffix="%" />
            </p>
            <p className="mt-1 text-xs text-white/40">up to 90% total return</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
