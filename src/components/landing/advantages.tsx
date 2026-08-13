"use client";

import { Fingerprint, KeyRound, Scale, Timer } from "lucide-react";
import { Reveal } from "@/components/shared/reveal";
import { AnimatedCounter } from "@/components/shared/animated-counter";

const advantages = [
  {
    icon: Fingerprint,
    title: "Audited Smart Contracts",
    description: "Our yield contracts are independently audited quarterly and published for full transparency.",
  },
  {
    icon: KeyRound,
    title: "Self-Custody Option",
    description: "Advanced investors can keep their principal in their own wallet while earning via our vault.",
  },
  {
    icon: Scale,
    title: "Regulation-Ready",
    description: "Built with compliance in mind — KYC/AML tooling and full transaction records out of the box.",
  },
  {
    icon: Timer,
    title: "24/7 Liquidity",
    description: "Our liquidity desk maintains deep reserves so withdrawals process fast, day or night.",
  },
];

export function Advantages() {
  return (
    <section className="relative overflow-hidden py-24">
      <div className="absolute inset-0 bg-navy-gradient opacity-60" />
      <div className="container relative">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">Company Advantages</p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
              The <span className="text-gradient-gold">Polychain Capital</span> edge
            </h2>
            <p className="mt-4 text-white/60">
              We operate with institutional discipline. Every system, from treasury management to
              support, is engineered around one promise: your money works as hard as you do.
            </p>

            <div className="mt-8 flex flex-wrap gap-8">
              <div>
                <p className="font-display text-3xl font-bold text-gradient-gold">
                  <AnimatedCounter prefix="$" value={520000} suffix="+" />
                </p>
                <p className="mt-1 text-sm text-white/50">Total investor payouts</p>
              </div>
              <div>
                <p className="font-display text-3xl font-bold text-white">
                  <AnimatedCounter value={12800} suffix="+" />
                </p>
                <p className="mt-1 text-sm text-white/50">Active investors</p>
              </div>
              <div>
                <p className="font-display text-3xl font-bold text-white">
                  <AnimatedCounter value={99.9} decimals={1} suffix="%" />
                </p>
                <p className="mt-1 text-sm text-white/50">Uptime</p>
              </div>
            </div>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2">
            {advantages.map(({ icon: Icon, title, description }, i) => (
              <Reveal key={title} delay={i * 0.08}>
                <div className="glass-card h-full p-6 transition-all duration-300 hover:border-gold/30">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-gold">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-white/50">{description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
