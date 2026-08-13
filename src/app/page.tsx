"use client";

import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api-client";
import type { HomeData } from "@/types";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Plans } from "@/components/landing/plans";
import { WhyChoose } from "@/components/landing/why-choose";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Advantages } from "@/components/landing/advantages";
import { ReferralProgram } from "@/components/landing/referral-program";
import { Calculator } from "@/components/landing/calculator";
import { LiveTicker } from "@/components/landing/live-ticker";
import { Testimonials } from "@/components/landing/testimonials";
import { FAQ } from "@/components/landing/faq";
import { Newsletter } from "@/components/landing/newsletter";
import { Contact } from "@/components/landing/contact";
import { Footer } from "@/components/landing/footer";
import { Skeleton } from "@/components/ui/skeleton";

function LandingFallback() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container pt-40">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <Skeleton className="mx-auto h-6 w-52" />
          <Skeleton className="mx-auto h-16 w-4/5" />
          <Skeleton className="mx-auto h-5 w-2/3" />
          <div className="flex justify-center gap-4 pt-4">
            <Skeleton className="h-12 w-40" />
            <Skeleton className="h-12 w-48" />
          </div>
        </div>
        <div className="mx-auto mt-20 grid max-w-4xl grid-cols-3 gap-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { data, isLoading, isError } = useQuery<HomeData>({
    queryKey: ["home"],
    queryFn: () => get("/public/home"),
  });

  if (isLoading) return <LandingFallback />;

  const plans = data?.plans || [];
  const deposits = data?.recentDeposits || [];
  const withdrawals = data?.recentWithdrawals || [];

  const tickerDeposits = deposits.map((d) => ({ username: d.user.username, amount: d.amount, updatedAt: d.updatedAt, currency: d.currency }));
  const tickerWithdrawals = withdrawals.map((w) => ({ username: w.user.username, amount: w.amount, updatedAt: w.updatedAt, currency: w.currency }));

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />
      <main>
        <Hero />
        <WhyChoose />
        {plans.length > 0 && <Plans plans={plans} />}
        <HowItWorks />
        <Advantages />
        <ReferralProgram />
        {plans.length > 0 && <Calculator plans={plans} />}
        <LiveTicker deposits={tickerDeposits} withdrawals={tickerWithdrawals} />
        <Testimonials />
        <FAQ />
        <Newsletter />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
