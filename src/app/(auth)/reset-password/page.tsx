"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { post } from "@/lib/api-client";
import { toast } from "@/components/ui/use-toast";
import { AuthShell } from "@/components/auth/auth-shell";

const schema = z
  .object({
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

type FormValues = z.infer<typeof schema>;

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      post("/auth/reset-password", { token, password: values.password, confirmPassword: values.confirmPassword }),
    onSuccess: () => {
      toast({ title: "Password updated", description: "You can now sign in with your new password.", variant: "success" });
      setDone(true);
    },
    onError: (error) => toast({ title: "Reset failed", description: (error as Error).message, variant: "destructive" }),
  });

  if (done) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15 text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold">Password updated</h1>
        <p className="mt-2 text-sm text-white/50">Your password has been reset successfully.</p>
        <Link href="/login" className="gold-btn mt-6 inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-card p-8">
      <h1 className="font-display text-2xl font-bold">Set a new password</h1>
      <p className="mt-1.5 text-sm text-white/50">Choose a strong password you haven't used before.</p>
      <form className="mt-8 space-y-5" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        <div>
          <label className="mb-1.5 block text-sm text-white/60">New password</label>
          <div className="relative">
            <input
              className="input-dark pr-12"
              type={show ? "text" : "password"}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              {...register("password")}
            />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white" aria-label="Toggle password">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-white/60">Confirm password</label>
          <input className="input-dark" type="password" placeholder="Repeat your password" autoComplete="new-password" {...register("confirmPassword")} />
          {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword.message}</p>}
        </div>
        <button type="submit" className="gold-btn inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          {mutation.isPending ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Reset password">
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
