"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ShieldCheck, BarChart3, Headphones } from "lucide-react";
import { Logo } from "@/components/shared/logo";

const highlights = [
  {
    icon: ShieldCheck,
    title: "Protected by design",
    description: "Encrypted sessions, optional 2FA and continuous fraud monitoring.",
  },
  {
    icon: BarChart3,
    title: "Transparent yields",
    description: "Every rate, duration and return published before you invest.",
  },
  {
    icon: Headphones,
    title: "Support that answers",
    description: "A real specialist is one message away, 24 hours a day.",
  },
];

export function AuthShell({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="relative flex min-h-screen">
      <div className="hidden w-[44%] flex-col justify-between border-r border-white/[0.06] bg-navy-gradient p-10 lg:flex">
        <div className="relative">
          <div className="absolute -inset-10 bg-hero-glow" />
          <Link href="/" className="relative inline-flex" aria-label="Polychain Capital home">
            <Logo />
          </Link>
        </div>

        <div className="relative">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-sm font-display text-3xl font-bold leading-snug"
          >
            Your wealth should <span className="text-gradient-gold">work while you sleep.</span>
          </motion.h2>
          <div className="mt-10 space-y-6">
            {highlights.map(({ icon: Icon, title: t, description }, i) => (
              <motion.div
                key={t}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-start gap-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{t}</p>
                  <p className="mt-0.5 text-sm text-white/50">{description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/30">© {new Date().getFullYear()} Polychain Capital. All rights reserved.</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-gold lg:hidden">
            <ChevronLeft className="h-4 w-4" />
            Back to home
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {title && (
              <h1 className="mb-8 font-display text-2xl font-bold lg:hidden">{title}</h1>
            )}
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
