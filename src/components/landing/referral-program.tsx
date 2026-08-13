"use client";

import { motion } from "framer-motion";
import { Users, Gift, Link2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Reveal } from "@/components/shared/reveal";
import { AnimatedCounter } from "@/components/shared/animated-counter";

export function ReferralProgram() {
  const [copied, setCopied] = useState(false);
  const demoLink = "https://polychaincapital.example/register?ref=NV9F2KQX";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(demoLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section id="referrals" className="relative overflow-hidden py-24">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_50%_50%,rgba(244,180,0,0.06),transparent)]" />
      <div className="container relative">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">Referral Program</p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
              Grow your network, <span className="text-gradient-gold">earn forever</span>
            </h2>
            <p className="mt-4 text-white/60">
              Invite friends to Polychain Capital and earn a 10% commission on every investment they make.
              No caps, no expiry — your referral income compounds with their growth.
            </p>

            <div className="mt-8 flex flex-wrap gap-8">
              <div>
                <p className="font-display text-3xl font-bold text-gradient-gold">
                  <AnimatedCounter value={10} suffix="%" />
                </p>
                <p className="mt-1 text-sm text-white/50">Commission rate</p>
              </div>
              <div>
                <p className="font-display text-3xl font-bold text-white">
                  <AnimatedCounter value={4820} suffix="+" />
                </p>
                <p className="mt-1 text-sm text-white/50">Referrals rewarded</p>
              </div>
              <div>
                <p className="font-display text-3xl font-bold text-white">
                  <AnimatedCounter prefix="$" value={98000} suffix="+" />
                </p>
                <p className="mt-1 text-sm text-white/50">Referral bonuses paid</p>
              </div>
            </div>

            <div className="glass-card mt-8 flex items-center gap-3 p-4">
              <Link2 className="h-5 w-5 shrink-0 text-gold" />
              <code className="flex-1 truncate font-mono text-sm text-white/70">{demoLink}</code>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={copy}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-gold-gradient px-3 text-xs font-semibold text-navy-dark"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </motion.button>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="relative mx-auto max-w-md">
              <div className="absolute -inset-6 rounded-3xl bg-gold-gradient opacity-10 blur-2xl" />
              <div className="relative glass-card p-8">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/10 text-gold">
                    <Users className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold">Your referral tree</h3>
                    <p className="text-sm text-white/50">Track every level, live</p>
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  {[
                    { name: "You", level: "Level 0", amount: "+$1,240.00", depth: 0 },
                    { name: "Direct referrals", level: "Level 1 · 10%", amount: "+$890.00", depth: 1 },
                    { name: "Network referrals", level: "Level 2 · 5%", amount: "+$350.00", depth: 2 },
                  ].map(({ name, level, amount, depth }) => (
                    <div
                      key={name}
                      className="relative flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4"
                      style={{ marginLeft: depth * 28 }}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-gradient border border-gold/30">
                        <Gift className="h-4 w-4 text-gold" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{name}</p>
                        <p className="text-xs text-white/40">{level}</p>
                      </div>
                      <span className="font-mono text-sm font-semibold text-emerald-400">{amount}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 border-t border-white/[0.06] pt-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Lifetime referral earnings</span>
                    <span className="font-display font-bold text-gradient-gold">$2,480.00</span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
