"use client";

import { AuthGuard } from "@/components/dashboard/auth-guard";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen">
        <DashboardSidebar />
        <div className="lg:pl-72">
          <DashboardTopbar />
          <main className="px-4 py-8 sm:px-6 lg:px-10">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
