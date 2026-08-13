"use client";

import { UserPlus, Wallet, TrendingUp, Coins } from "lucide-react";
import { Reveal } from "@/components/shared/reveal";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Create Your Account",
    description: "Sign up in under a minute. Secure your profile with 2FA and complete a quick KYC.",
  },
  {
    icon: Wallet,
    step: "02",
    title: "Fund Your Wallet",
    description: "Deposit USDT, BTC or ETH. Transfers are confirmed automatically within minutes.",
  },
  {
    icon: TrendingUp,
    step: "03",
    title: "Select a Plan",
    description: "Choose the plan that matches your goals. Lock in your daily return and duration.",
  },
  {
    icon: Coins,
    step: "04",
    title: "Earn Daily",
    description: "Profits accrue 24/7 and hit your balance automatically. Withdraw whenever you like.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">How It Works</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
            Four steps to <span className="text-gradient-gold">passive income</span>
          </h2>
          <p className="mt-4 text-white/50">
            Getting started on Polychain Capital takes minutes. Earning takes care of itself.
          </p>
        </Reveal>

        <div className="relative mt-16 grid gap-8 md:grid-cols-4">
          <div className="absolute left-0 right-0 top-10 hidden h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent md:block" />
          {steps.map(({ icon: Icon, step, title, description }, i) => (
            <Reveal key={step} delay={i * 0.1}>
              <div className="relative flex flex-col items-center text-center">
                <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-gold/30 bg-navy-gradient shadow-glow-sm">
                  <Icon className="h-8 w-8 text-gold" />
                  <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-gold-gradient font-display text-xs font-bold text-navy-dark">
                    {step.slice(1)}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
                <p className="mt-2 max-w-[240px] text-sm leading-relaxed text-white/50">{description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
