"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronDown, LogOut, UserCircle, Settings } from "lucide-react";
import { get, post } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, initials, timeAgo } from "@/lib/utils";
import type { Notification } from "@/types";

export function DashboardTopbar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data } = useQuery<{ notifications: Notification[] }>({
    queryKey: ["notifications"],
    queryFn: () => get("/user/notifications"),
    enabled: Boolean(user),
    refetchInterval: 60000,
  });

  const unread = data?.notifications.filter((n) => !n.read) ?? [];

  const readMutation = useMutation({
    mutationFn: () => post("/user/notifications/read"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => post("/auth/logout"),
    onSuccess: () => {
      logout();
      toast({ title: "Signed out", description: "See you soon.", variant: "success" });
      router.push("/login");
    },
  });

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-white/[0.06] bg-[#030507]/80 px-6 py-4 backdrop-blur-xl lg:px-10">
      <div className="hidden lg:block">
        <h2 className="font-display text-lg font-semibold">Dashboard</h2>
        <p className="text-xs text-white/40">{formatDateTime(new Date().toISOString())}</p>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] transition-colors hover:border-gold/40" aria-label="Notifications">
              <Bell className="h-5 w-5 text-white/70" />
              {unread.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-gradient px-1 text-[10px] font-bold text-navy-dark">
                  {unread.length}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              {unread.length > 0 && (
                <button onClick={() => readMutation.mutate()} className="text-xs font-normal text-gold hover:underline">
                  Mark all read
                </button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto">
              {(data?.notifications ?? []).slice(0, 8).map((n) => (
                <div key={n.id} className={`px-3 py-3 ${n.read ? "opacity-50" : ""}`}>
                  <div className="flex items-start gap-3">
                    <Badge variant={n.type === "success" ? "success" : n.type === "error" ? "destructive" : "gold"}>
                      {n.type}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white/90">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-white/50">{n.message}</p>
                      <p className="mt-1 text-[10px] text-white/30">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {(data?.notifications ?? []).length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-white/40">You're all caught up</p>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] py-1.5 pl-1.5 pr-3 transition-colors hover:border-gold/40">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{initials(user?.username || "U")}</AvatarFallback>
              </Avatar>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium leading-tight">{user?.username}</span>
                <span className="block text-[11px] text-white/40">{user?.role === "ADMIN" ? "Administrator" : "Investor"}</span>
              </span>
              <ChevronDown className="hidden h-4 w-4 text-white/40 sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span>{user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user?.username}</span>
              <span className="text-xs font-normal text-white/40">{user?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <UserCircle /> My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/profile#security">
                <Settings /> Security
              </Link>
            </DropdownMenuItem>
            {user?.role === "ADMIN" && (
              <DropdownMenuItem asChild>
                <Link href="/admin">Admin Panel</Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logoutMutation.mutate()} className="text-red-400">
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
