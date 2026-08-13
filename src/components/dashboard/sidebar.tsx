"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Users,
  UserCircle,
  LifeBuoy,
  LogOut,
  Settings,
  X,
  Home,
  Menu,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { post } from "@/lib/api-client";
import { useToast } from "@/components/ui/use-toast";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/investments", label: "Investments", icon: TrendingUp },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/referrals", label: "Referrals", icon: Users },
  { href: "/profile", label: "Profile", icon: UserCircle },
  { href: "/support", label: "Support", icon: LifeBuoy },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await post("/auth/logout");
    } catch {
      // session already gone
    }
    logout();
    toast({ title: "Signed out", description: "See you soon.", variant: "success" });
    router.push("/login");
  };

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
        <Link href="/" aria-label="Polychain Capital home">
          <Logo />
        </Link>
        <button className="text-white/50 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-white/30">Menu</p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active ? "bg-gold-gradient text-navy-dark shadow-glow-sm" : "text-white/55 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-navy-dark" : "text-white/40 group-hover:text-gold")} />
              {label}
            </Link>
          );
        })}

        {user?.role === "ADMIN" && (
          <>
            <p className="px-3 pb-2 pt-6 text-[11px] font-semibold uppercase tracking-widest text-white/30">Administration</p>
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                pathname.startsWith("/admin")
                  ? "bg-gold-gradient text-navy-dark shadow-glow-sm"
                  : "text-white/55 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              <Settings className="h-5 w-5 text-white/40 group-hover:text-gold" />
              Admin Panel
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-white/[0.06] px-4 py-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/55 transition-all hover:bg-white/[0.06] hover:text-white"
        >
          <Home className="h-5 w-5 text-white/40" />
          Back to site
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400/80 transition-all hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-white/[0.06] bg-navy-dark/80 backdrop-blur-xl lg:block">
        {content}
      </aside>

      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-navy-dark/90 backdrop-blur lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-white/70" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 w-72 border-r border-white/[0.06] bg-navy-dark lg:hidden"
            >
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
