"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { get } from "@/lib/api-client";
import type { User } from "@/types";

export function useSession() {
  const { user, setUser, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user) return;

    get<{ user: User }>("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => logout());
  }, [user, setUser, logout]);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
      router.push("/login");
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [logout, router]);

  return { user, isLoading: !user, isAuthenticated: Boolean(user) };
}
