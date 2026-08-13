"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, Loader2, MailCheck } from "lucide-react";
import { post } from "@/lib/api-client";
import { toast } from "@/components/ui/use-toast";
import { AuthShell } from "@/components/auth/auth-shell";
import { useState } from "react";

const schema = z.object({ email: z.string().email("Enter a valid email") });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => post("/auth/forgot-password", values),
    onSuccess: () => {
      setSent(true);
    },
    onError: (error) => toast({ title: "Something went wrong", description: (error as Error).message, variant: "destructive" }),
  });

  if (sent) {
    return (
      <AuthShell title="Check your email">
        <div className="glass-card p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15 text-emerald-400">
            <MailCheck className="h-8 w-8" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold">Check your email</h1>
          <p className="mt-2 text-sm text-white/50">
            If an account exists for that address, a password reset link has been sent. It expires in 30 minutes.
          </p>
          <Link href="/login" className="gold-btn mt-6 inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm">
            Back to Login
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset password">
      <div className="glass-card p-8">
        <h1 className="font-display text-2xl font-bold">Forgot your password?</h1>
        <p className="mt-1.5 text-sm text-white/50">
          Enter your account email and we'll send you a secure reset link.
        </p>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <div>
            <label className="mb-1.5 block text-sm text-white/60">Email</label>
            <input className="input-dark" placeholder="you@email.com" type="email" autoComplete="email" {...register("email")} />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
          </div>
          <button type="submit" className="gold-btn inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {mutation.isPending ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-white/50">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-gold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
