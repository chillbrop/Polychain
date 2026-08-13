"use client";

import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { post } from "@/lib/api-client";
import { toast } from "@/components/ui/use-toast";
import { Reveal } from "@/components/shared/reveal";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const mutation = useMutation({
    mutationFn: () => post("/public/newsletter", { email }),
    onSuccess: (data) => {
      toast({ title: "Subscribed", description: (data as { message?: string })?.message || "Welcome aboard!", variant: "success" });
      setEmail("");
    },
    onError: () => toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" }),
  });

  return (
    <section className="py-16">
      <div className="container">
        <Reveal>
          <div className="glass-card relative overflow-hidden p-10 text-center sm:p-14">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_0%,rgba(244,180,0,0.1),transparent)]" />
            <div className="relative">
              <CheckCircle2 className="mx-auto h-10 w-10 text-gold" />
              <h2 className="mt-4 font-display text-2xl font-bold sm:text-3xl">
                Get market insights & platform updates
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-white/50">
                Join 12,000+ subscribers receiving weekly yield insights, security tips and exclusive offers.
              </p>
              <form
                className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!email.includes("@")) {
                    toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "warning" });
                    return;
                  }
                  mutation.mutate();
                }}
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="input-dark"
                  aria-label="Email address"
                />
                <button type="submit" className="gold-btn inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-6 text-sm">
                  <Send className="h-4 w-4" />
                  {mutation.isPending ? "Subscribing..." : "Subscribe"}
                </button>
              </form>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
