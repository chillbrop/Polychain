"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, MailX } from "lucide-react";
import { post } from "@/lib/api-client";
import { AuthShell } from "@/components/auth/auth-shell";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: () => post<{ message: string }>("/auth/verify-email", { token }),
    onSuccess: (data) => {
      setState("success");
      setMessage(data.message || "Email verified successfully.");
    },
    onError: (error) => {
      setState("error");
      setMessage((error as Error).message);
    },
  });

  useEffect(() => {
    if (token) mutation.mutate();
    else {
      setState("error");
      setMessage("No verification token found in the link.");
    }
  }, [token]);

  return (
    <div className="glass-card p-8 text-center">
      {state === "loading" && (
        <>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/10 text-gold">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold">Verifying your email</h1>
          <p className="mt-2 text-sm text-white/50">Just a moment...</p>
        </>
      )}

      {state === "success" && (
        <>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15 text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold">Email verified!</h1>
          <p className="mt-2 text-sm text-white/50">{message}</p>
          <Link href="/login" className="gold-btn mt-6 inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm">
            Continue to Login
          </Link>
        </>
      )}

      {state === "error" && (
        <>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/15 text-red-400">
            <MailX className="h-8 w-8" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold">Verification failed</h1>
          <p className="mt-2 text-sm text-white/50">{message}</p>
          <Link href="/login" className="gold-btn mt-6 inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm">
            Back to Login
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <AuthShell title="Verify email">
      <Suspense>
        <VerifyContent />
      </Suspense>
    </AuthShell>
  );
}
