"use client";

import { Star, Quote } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { Reveal } from "@/components/shared/reveal";

const testimonials = [
  {
    name: "Amara Osei",
    role: "Growth Plan · 8 months",
    rating: 5,
    text: "I started with the Growth plan in January and my returns have been credited daily like clockwork. The dashboard makes it effortless to track everything. This is the most professional platform I've used.",
  },
  {
    name: "Daniel Reyes",
    role: "Pro Plan · 1 year",
    rating: 5,
    text: "Withdrew my first $2,000 in under an hour. The 24/7 support actually responds in minutes. Polychain Capital's transparency about rates and durations sold me immediately.",
  },
  {
    name: "Maya Lindqvist",
    role: "Institutional · 6 months",
    rating: 5,
    text: "As a fund manager, diligence matters. Polychain Capital's quarterly reports, audited contracts and dedicated manager exceeded every check on our list. Our allocation has grown 40% net.",
  },
  {
    name: "Samuel Adeyemi",
    role: "Starter Plan · 3 months",
    rating: 5,
    text: "Being able to start with just $25 was perfect for testing the waters. Now I've moved up to Growth and the referral earnings fund my weekly coffee habit. Highly recommend.",
  },
  {
    name: "Lena Moreau",
    role: "Growth Plan · 5 months",
    rating: 5,
    text: "The calculator was spot-on to the dollar. I knew exactly what to expect before investing a cent. That kind of honesty is rare — Polychain Capital earns its premium feel.",
  },
  {
    name: "Tunde Bakare",
    role: "Pro Plan · 9 months",
    rating: 4,
    text: "Consistent daily payouts, clean UI and withdrawals that actually process fast. I only wish I'd found this platform earlier.",
  },
];

export function Testimonials() {
  return (
    <section className="relative py-24">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">Testimonials</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
            Investors <span className="text-gradient-gold">love</span> Polychain Capital
          </h2>
          <p className="mt-4 text-white/50">
            Real stories from investors growing their wealth with us every day.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map(({ name, role, rating, text }, i) => (
            <Reveal key={name} delay={i * 0.07}>
              <div className="glass-card relative h-full p-7 transition-all duration-300 hover:border-gold/30 hover:shadow-card-hover">
                <Quote className="absolute right-6 top-6 h-8 w-8 text-gold/15" />
                <div className="flex gap-1">
                  {Array.from({ length: rating }).map((_, s) => (
                    <Star key={s} className="h-4 w-4 fill-gold text-gold" />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-white/70">"{text}"</p>
                <div className="mt-6 flex items-center gap-3 border-t border-white/[0.06] pt-5">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{initials(name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{name}</p>
                    <p className="text-xs text-white/40">{role}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
