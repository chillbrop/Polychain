"use client";

import { usePathname } from "next/navigation";
import { AuthGuard } from "@/components/dashboard/auth-guard";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { ShieldCheck } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const pathname = usePathname();

  const title =
    pathname === "/admin" ? "Analytics"
    : pathname.includes("/users") ? "User Management"
    : pathname.includes("/deposits") ? "Deposit Approvals"
    : pathname.includes("/withdrawals") ? "Withdrawal Approvals"
    : pathname.includes("/investments") ? "Investment Management"
    : pathname.includes("/plans") ? "Investment Plans"
    : pathname.includes("/tickets") ? "Support Tickets"
    : pathname.includes("/reports") ? "Reports"
    : pathname.includes("/settings") ? "Site Settings"
    : pathname.includes("/audit") ? "Audit Logs"
    : "Admin";

  return (
    <AuthGuard requireAdmin>
      <div className="min-h-screen">
        <AdminSidebar />
        <div className="lg:pl-72">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-white/[0.06] bg-[#030507]/80 px-6 py-4 backdrop-blur-xl lg:px-10">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-gold">
                <ShieldCheck className="h-4 w-4" /> Admin Panel
              </p>
              <h2 className="font-display text-lg font-semibold">{title}</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] py-1.5 pl-1.5 pr-4 sm:flex">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{initials(user?.username || "A")}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-xs font-medium leading-tight">{user?.username}</p>
                  <p className="text-[10px] text-gold">Administrator</p>
                </div>
              </div>
            </div>
          </header>
          <main className="px-4 py-8 sm:px-6 lg:px-10">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
