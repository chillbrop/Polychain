"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ShieldCheck, LogIn } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { RippleButton } from "@/components/shared/ripple-button";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const links = [
  { href: "#plans", label: "Plans" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#calculator", label: "Calculator" },
  { href: "#referrals", label: "Referrals" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuthStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "bg-[#030507]/85 backdrop-blur-xl border-b border-white/[0.06] py-3" : "bg-transparent py-5"
      )}
    >
      <nav className="container flex items-center justify-between">
        <Link href="/" aria-label="Polychain Capital home">
          <Logo />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <RippleButton
              className="gold-btn h-10 rounded-xl px-5 text-sm"
              onClick={() => (window.location.href = "/dashboard")}
            >
              Dashboard
            </RippleButton>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <LogIn className="h-4 w-4" />
                Login
              </Link>
              <Link
                href="/register"
                className="gold-btn inline-flex h-10 items-center rounded-xl px-5 text-sm"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] lg:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b border-white/[0.06] bg-[#030507]/95 backdrop-blur-xl lg:hidden"
          >
            <div className="container flex flex-col gap-1 py-4">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-3 flex gap-3 border-t border-white/[0.06] pt-4">
                {user ? (
                  <Link
                    href="/dashboard"
                    className="gold-btn inline-flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-white/15 text-sm font-medium"
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      className="gold-btn inline-flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
