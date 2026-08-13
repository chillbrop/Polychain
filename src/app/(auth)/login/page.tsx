"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import { post } from "@/lib/api-client";
import { toast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from "@/stores/auth-store";
import { AuthShell } from "@/components/auth/auth-shell";
import type { User } from "@/types";

const schema = z.object({
  identifier: z.string().min(3, "Enter your email or username"),
  password: z.string().min(1, "Enter your password"),
  remember: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { remember: true },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => post<{ user: User; message: string }>("/auth/login", values),
    onSuccess: (data) => {
      setUser(data.user);
      toast({ title: "Welcome back", description: data.message || "Signed in successfully.", variant: "success" });
      router.push(data.user.role === "ADMIN" ? "/admin" : "/dashboard");
    },
    onError: (error) => {
      toast({ title: "Sign in failed", description: (error as Error).message, variant: "destructive" });
    },
  });

  return (
    <AuthShell title="Welcome back">
      <div className="glass-card p-8">
        <h1 className="font-display text-2xl font-bold">Welcome back</h1>
        <p className="mt-1.5 text-sm text-white/50">
          New to Polychain Capital?{" "}
          <Link href="/register" className="font-medium text-gold hover:underline">
            Create an account
          </Link>
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <div>
            <label className="mb-1.5 block text-sm text-white/60">Email or username</label>
            <input
              className="input-dark"
              placeholder="you@email.com"
              autoComplete="username"
              {...register("identifier")}
            />
            {errors.identifier && <p className="mt-1 text-xs text-red-400">{errors.identifier.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-white/60">Password</label>
            <div className="relative">
              <input
                className="input-dark pr-12"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-white/60">
              <Checkbox {...register("remember")} />
              Remember me
            </label>
            <Link href="/forgot-password" className="text-sm font-medium text-gold hover:underline">
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="gold-btn inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {mutation.isPending ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
