"use client";

import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Mail, Phone, MapPin, ShieldCheck, Twitter, Linkedin, Send } from "lucide-react";

const sections = [
  {
    title: "Platform",
    links: [
      { label: "Investment Plans", href: "#plans" },
      { label: "Profit Calculator", href: "#calculator" },
      { label: "Referral Program", href: "#referrals" },
      { label: "FAQ", href: "#faq" },
      { label: "Live Activity", href: "#" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Login", href: "/login" },
      { label: "Create Account", href: "/register" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Forgot Password", href: "/forgot-password" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "#" },
      { label: "Privacy Policy", href: "#" },
      { label: "Risk Disclosure", href: "#" },
      { label: "AML Policy", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-navy-dark/60 pt-16">
      <div className="container">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/50">
              Polychain Capital is a premium digital asset investment platform empowering investors worldwide
              to grow their wealth through transparent, secure, high-yield strategies.
            </p>
            <div className="mt-6 flex gap-3">
              {[Twitter, Linkedin, Send].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/60 transition-all hover:border-gold/40 hover:text-gold"
                  aria-label="Social link"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {sections.map((section) => (
            <div key={section.title}>
              <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-white/80">
                {section.title}
              </h4>
              <ul className="mt-5 space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/50 transition-colors hover:text-gold"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-4 border-t border-white/[0.06] py-8 text-sm text-white/50 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gold" />
            support@polychaincapital.example
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gold" />
            +1 (413) 515-3418
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gold" />
            One Financial District, Victoria Island, Lagos
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] py-6 sm:flex-row">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Polychain Capital. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Secured with 256-bit encryption
          </div>
        </div>

        <p className="border-t border-white/[0.06] py-6 text-center text-[11px] leading-relaxed text-white/30">
          Risk warning: Digital asset investments carry risk, including the possible loss of principal.
          Past performance does not guarantee future results. Polychain Capital does not provide financial advice;
          always do your own research before investing.
        </p>
      </div>
    </footer>
  );
}
