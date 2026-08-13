"use client";

import { ShieldCheck, Zap, BarChart3, Users, Globe2, Headphones, Lock } from "lucide-react";
import { Reveal } from "@/components/shared/reveal";

const features = [
  {
    icon: ShieldCheck,
    title: "Enterprise-Grade Security",
    description: "256-bit encryption, cold-storage custody and continuous monitoring protect every asset you entrust to Polychain Capital.",
  },
  {
    icon: Zap,
    title: "Instant Daily Payouts",
    description: "Profits accrue every single day and are credited automatically. No waiting, no forms, no friction.",
  },
  {
    icon: BarChart3,
    title: "Transparent Returns",
    description: "Every plan shows its exact daily rate, duration and total return before you commit a single dollar.",
  },
  {
    icon: Users,
    title: "Powerful Referral Engine",
    description: "Earn up to 10% commission on every investment your referrals make — a self-funding acquisition engine.",
  },
  {
    icon: Globe2,
    title: "Global & Accessible",
    description: "Invest from anywhere in the world with USDT, Bitcoin or Ethereum. No bank accounts required.",
  },
  {
    icon: Headphones,
    title: "24/7 Dedicated Support",
    description: "Real humans, around the clock. Our specialists resolve issues in minutes, not business days.",
  },
];

export function WhyChoose() {
  return (
    <section className="relative py-24">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">Why Polychain Capital</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
            Built for investors who <span className="text-gradient-gold">expect more</span>
          </h2>
          <p className="mt-4 text-white/50">
            We combine the discipline of institutional finance with the freedom of decentralized assets.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }, i) => (
            <Reveal key={title} delay={i * 0.06}>
              <div className="group glass-card h-full p-7 transition-all duration-300 hover:border-gold/30 hover:shadow-card-hover">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10 text-gold transition-transform duration-300 group-hover:scale-110">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
