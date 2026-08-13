"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, UserPlus, Loader2, MailCheck, Check, Copy } from "lucide-react";
import { post } from "@/lib/api-client";
import { toast } from "@/components/ui/use-toast";
import { AuthShell } from "@/components/auth/auth-shell";
import type { User } from "@/types";

const schema = z
  .object({
    email: z.string().email("Enter a valid email"),
    username: z.string().min(3, "At least 3 characters").max(24).regex(/^[a-zA-Z0-9_.]+$/, "Letters, numbers, _ and . only"),
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

type FormValues = z.infer<typeof schema>;

function RegisterForm() {
  const searchParams = useSearchParams();
  const referral = searchParams.get("ref") || "";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [verifyUrl, setVerifyUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", email: "", password: "", confirmPassword: "" },
  });

  const copyVerifyLink = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this verification link:", verifyUrl);
    }
  };

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      post<{ user: User; message: string; devVerificationUrl?: string }>("/auth/register", {
        email: values.email,
        username: values.username,
        password: values.password,
        confirmPassword: values.confirmPassword,
        referralCode: referral || undefined,
      }),
    onSuccess: (data) => {
      toast({ title: "Account created", description: data.message || "Check your inbox to verify your email.", variant: "success" });
      setVerifyUrl(data.devVerificationUrl || "");
      setRegistered(true);
    },
    onError: (error) => {
      toast({ title: "Registration failed", description: (error as Error).message, variant: "destructive" });
    },
  });

  if (registered) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15 text-emerald-400">
          <MailCheck className="h-8 w-8" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold">Check your inbox</h1>
        <p className="mt-2 text-sm text-white/50">
          We sent a verification link to your email. Verify to unlock investing, then sign in to your new account.
        </p>
        {verifyUrl && (
          <div className="mt-5 rounded-xl border border-gold/25 bg-gold/[0.06] p-4 text-left">
            <p className="text-xs font-medium text-gold">No email configured — use this link to verify now:</p>
            <div className="mt-2 flex items-center gap-2">
              <input readOnly value={verifyUrl} className="input-dark min-w-0 flex-1 font-mono text-xs" />
              <button type="button" onClick={copyVerifyLink} className="gold-btn inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs" aria-label="Copy verification link">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <a href={verifyUrl} className="mt-3 inline-block text-xs font-medium text-gold underline underline-offset-2 hover:text-gold/80">
              Open verification page →
            </a>
          </div>
        )}
        <Link href="/login" className="gold-btn mt-6 inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm">
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-card p-8">
      <h1 className="font-display text-2xl font-bold">Create your account</h1>
      <p className="mt-1.5 text-sm text-white/50">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-gold hover:underline">
          Sign in
        </Link>
      </p>
      {referral && (
        <p className="mt-4 rounded-lg border border-gold/25 bg-gold/10 px-3 py-2 text-xs text-gold">
          Referral code applied: <span className="font-mono font-bold">{referral}</span>
        </p>
      )}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-white/60">Username</label>
            <input className="input-dark" placeholder="nova_investor" autoComplete="username" {...register("username")} />
            {errors.username && <p className="mt-1 text-xs text-red-400">{errors.username.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-white/60">Email</label>
            <input className="input-dark" placeholder="you@email.com" type="email" autoComplete="email" {...register("email")} />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-white/60">Password</label>
          <div className="relative">
            <input
              className="input-dark pr-12"
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              {...register("password")}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white" aria-label="Toggle password">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-white/60">Confirm password</label>
          <div className="relative">
            <input
              className="input-dark pr-12"
              type={showConfirm ? "text" : "password"}
              placeholder="Repeat your password"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white" aria-label="Toggle password">
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword.message}</p>}
        </div>

        <button type="submit" className="gold-btn inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          {mutation.isPending ? "Creating account..." : "Create Account"}
        </button>

        <p className="text-center text-xs leading-relaxed text-white/30">
          By creating an account you agree to our{" "}
          <a href="#" className="underline hover:text-gold">Terms of Service</a> and{" "}
          <a href="#" className="underline hover:text-gold">Privacy Policy</a>.
        </p>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <AuthShell title="Create your account">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
