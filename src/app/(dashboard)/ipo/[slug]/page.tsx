"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Landmark,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Loader2,
  Database,
  Banknote,
  TrendingUp,
  Users,
  Circle,
  Clock,
} from "lucide-react";
import { get, post } from "@/lib/api-client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/status-badge";
import { Progress } from "@/components/ui/progress";
import { formatNaira, formatUSD, formatDate, formatCompactNgn, cn } from "@/lib/utils";
import type { Ipo, IpoApplication, IpoDocument, IpoInvestorProfile, KycStatus, IpoStatus } from "@/types";

interface IpoDetailResponse {
  ipo: Ipo;
  documents: IpoDocument[];
  applicationsCount: number;
  demandShares: number;
  subscriptionRatePct: number;
  myApplication: IpoApplication | null;
  sandboxMode: boolean;
}

interface QuoteResponse {
  quote: { shares: number; grossNgn: number; feeNgn: number; totalNgn: number; amountUsd: number; rate: number } | null;
  validationError: string | null;
  walletBalance: number;
  minimumShares: number;
  maximumShares: number | null;
  pricePerShare: number;
  feePct: number;
  sandbox: boolean;
}

interface ProfileResponse {
  profile: IpoInvestorProfile | null;
}

function naira(v: number, d = 2) {
  return formatNaira(v, d);
}
function usd(v: number) {
  return formatUSD(v);
}

const STEPS = ["Shares", "Verification", "Review", "Confirm"] as const;

export default function IpoDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<IpoDetailResponse>({
    queryKey: ["ipo-detail", slug],
    queryFn: () => get(`/ipo/${slug}`),
    refetchInterval: 60000,
  });
  const { data: profileData } = useQuery<ProfileResponse>({
    queryKey: ["ipo-profile"],
    queryFn: () => get("/ipo/profile"),
  });

  const ipo = data?.ipo;
  const app = data?.myApplication;

  const [step, setStep] = useState(0);
  const [shares, setShares] = useState("");
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paidApp, setPaidApp] = useState<IpoApplication | null>(null);
  const [profileForm, setProfileForm] = useState<Record<string, string>>({
    fullName: "",
    dob: "",
    gender: "",
    nationality: "Nigeria",
    residencyCountry: "Nigeria",
    city: "",
    address: "",
    bvn: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
    cscsChn: "",
    idType: "NIN",
    idNumber: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const numericShares = Number(shares || 0);
  const profile = profileData?.profile ?? null;

  const canApply = useMemo(() => {
    if (!ipo) return false;
    return ["OPEN", "CLOSING_SOON"].includes(ipo.status) && !app && !paidApp;
  }, [ipo, app, paidApp]);

  if (isLoading || !ipo) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-40 animate-pulse rounded bg-white/5" />
        <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
        <div className="grid gap-6 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const fetchQuote = async () => {
    if (!numericShares || numericShares <= 0) {
      toast({ title: "Enter shares", description: "Enter how many shares you want to subscribe to.", variant: "destructive" });
      return;
    }
    try {
      const q = await get<QuoteResponse>(`/ipo/${slug}/quote`, { shares: String(numericShares) });
      setQuote(q);
      if (q.validationError) {
        toast({ title: "Invalid quantity", description: q.validationError, variant: "destructive" });
        return;
      }

      // An approved investor can finish from Review. If funds are insufficient,
      // keep the quote visible so they know exactly what needs to be deposited.
      if (profile?.status === "APPROVED" && (q.sandbox || q.walletBalance >= q.quote!.amountUsd)) {
        await confirmSubscribe();
        return;
      }
      setStep(profile?.status === "APPROVED" ? 2 : 1);
    } catch (e) {
      toast({ title: "Quote unavailable", description: (e as Error).message, variant: "destructive" });
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await post("/ipo/profile", profileForm);
      await queryClient.invalidateQueries({ queryKey: ["ipo-profile"] });
      toast({ title: "Verification submitted", description: "Your details are under review. You can return to subscribe once approved.", variant: "success" });
      setStep(1);
    } catch (e) {
      toast({ title: "Could not save profile", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const confirmSubscribe = async () => {
    setSubmitting(true);
    try {
      const created = await post<{ application: IpoApplication }>(`/ipo/${slug}/subscriptions`, { shares: numericShares });
      const paid = await post<{ ok: boolean; sandbox: boolean; message: string; application: IpoApplication }>(`/ipo/subscriptions/${created.application.id}/pay`, {});
      setPaidApp(paid.application);
      toast({ title: "Subscription confirmed", description: "Your subscription was paid and recorded.", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["ipo-detail", slug] });
      setStep(3);
    } catch (e) {
      toast({ title: "Subscription failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const verifyStatus: KycStatus = profile?.status ?? "NOT_SUBMITTED";
  const wizardClosed = !canApply;

  return (
    <div className="space-y-8">
      <Link href="/ipo" className="inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-gold">
        <ChevronLeft className="h-4 w-4" /> All offerings
      </Link>

      <div className="glass-card overflow-hidden">
        <div className="border-b border-white/[0.06] bg-gold/[0.04] p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <Landmark className="h-6 w-6 text-gold" />
                <StatusBadge status={ipo.status} />
              </div>
              <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">{ipo.name}</h1>
              <p className="mt-1 text-sm text-white/50">
                {ipo.issuer} · {ipo.ticker ? `${ipo.ticker} · ` : ""}
                {ipo.exchange || "NGX"}
              </p>
            </div>
            <div className="rounded-2xl border border-gold/25 bg-gold/[0.08] px-5 py-4 text-right">
              <p className="text-[11px] uppercase tracking-wider text-white/40">Price per share</p>
              <p className="font-mono text-3xl font-bold text-gold">{naira(ipo.pricePerShare, 0)}</p>
              <p className="mt-1 text-xs text-white/40">{ipo.currency === "NGN" ? "priced in Nigerian Naira" : ipo.currency}</p>
            </div>
          </div>

          <p className="mt-5 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-white/70">{ipo.tagline}</p>
        </div>

        <div className="grid grid-cols-2 gap-px bg-white/[0.06] sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Offer size", value: `${ipo.totalShares.toLocaleString()} shares` },
            { label: "Minimum subscription", value: `${ipo.minimumShares} shares (${naira(ipo.minimumShares * ipo.pricePerShare, 0)})` },
            { label: "Offer period", value: ipo.openDate ? `${formatDate(ipo.openDate)} — ${formatDate(ipo.closeDate!)}` : "Pending" },
            { label: "Over-allotment", value: `${ipo.greenshoePct}%` },
            { label: "Demand so far", value: `${(ipo.demandShares ?? 0).toLocaleString()} shares` },
            { label: "Subscription progress", value: `${(ipo.subscriptionRatePct ?? 0).toFixed(2)}% of offer` },
          ].map((f) => (
            <div key={f.label} className="bg-background p-4">
              <p className="text-[11px] uppercase tracking-wider text-white/35">{f.label}</p>
              <p className="mt-1 text-sm font-semibold">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      <ProgressPanel
        totalShares={ipo.totalShares}
        demandShares={ipo.demandShares ?? 0}
        pricePerShare={ipo.pricePerShare}
        applicationsCount={data?.applicationsCount ?? 0}
        closeDate={ipo.closeDate}
        status={ipo.status}
      />

      {paidApp ? (
        <SuccessPanel app={paidApp} ipo={ipo} />
      ) : app ? (
        <ApplicationPanel app={app} ipo={ipo} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="glass-card flex flex-col items-start gap-6 p-6 lg:col-span-2">
            <div className="flex items-center gap-2 text-gold">
              <Database className="h-5 w-5" />
              <h2 className="font-display text-lg font-semibold">Subscribe</h2>
            </div>

            {!["OPEN", "CLOSING_SOON"].includes(ipo.status) && (
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/60">
                <Lock className="mt-0.5 h-5 w-5 shrink-0 text-white/40" />
                <p>This offering is not open for subscription. {ipo.status === "UPCOMING" && ipo.openDate ? `It opens on ${formatDate(ipo.openDate)}.` : ""}</p>
              </div>
            )}

            {/* Steps */}
            <div className="flex w-full items-center gap-2">
              {STEPS.map((s, i) => (
                <div key={s} className="flex flex-1 flex-col gap-1.5">
                  <div className={cn("h-1 rounded-full", i <= step ? "bg-gold" : "bg-white/10")} />
                  <span className={cn("text-[11px] font-medium", i <= step ? "text-gold" : "text-white/35")}>{s}</span>
                </div>
              ))}
            </div>

            <div className="w-full space-y-5">
              {!wizardClosed && step === 0 && (
                <>
                  <div>
                    <Label htmlFor="shares">Number of shares</Label>
                    <Input
                      id="shares"
                      type="number"
                      min={ipo.minimumShares}
                      value={shares}
                      onChange={(e) => setShares(e.target.value)}
                      placeholder={`Minimum ${ipo.minimumShares} shares`}
                      className="mt-2"
                    />
                    <p className="mt-2 text-xs text-white/40">
                      {numericShares > 0 ? `Estimated total: ${naira(ipo.pricePerShare * numericShares, 0)} at ${naira(ipo.pricePerShare, 0)}/share` : `At ${naira(ipo.pricePerShare, 0)} per share.`}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Link href="/ipo" className="text-sm text-white/50 hover:text-gold">Cancel</Link>
                    <Button variant="gold" onClick={fetchQuote}>
                      Review & buy <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}

              {!wizardClosed && step === 1 && (
                <div className="space-y-5">
                  {profile && verifyStatus === "APPROVED" ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-200">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-semibold">Verification approved — {profile.fullName}</p>
                        <p className="mt-0.5 text-xs text-emerald-200/70">
                          Your investor profile is approved. Proceed to review your quote.
                        </p>
                      </div>
                    </div>
                  ) : profile && verifyStatus === "PENDING" ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-gold/25 bg-gold/[0.08] p-4 text-sm text-gold">
                      <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin" />
                      <div>
                        <p className="font-semibold">Verification under review</p>
                        <p className="mt-0.5 text-xs text-gold/70">
                          Your investor details are being reviewed by our compliance team. You can subscribe as soon as you are approved.
                        </p>
                      </div>
                    </div>
                  ) : profile && verifyStatus === "REJECTED" ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-semibold">Verification rejected</p>
                        <p className="mt-0.5 text-xs text-red-200/70">
                          {profile.adminNote || "Please update your investor details to continue."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-white/60">
                      Complete your investor verification once to unlock IPO subscriptions. Your BVN and account number are
                      encrypted at rest and never shown in full.
                    </p>
                  )}

                  {(verifyStatus === "NOT_SUBMITTED" || verifyStatus === "REJECTED") && (
                    <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <Label>Full legal name</Label>
                          <Input className="mt-1" value={profileForm.fullName} onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })} placeholder="e.g. Grace Okafor" />
                        </div>
                        <div>
                          <Label>Date of birth</Label>
                          <Input type="date" className="mt-1" value={profileForm.dob} onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })} />
                        </div>
                        <div>
                          <Label>Gender</Label>
                          <select className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none focus:border-gold/60" value={profileForm.gender} onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}>
                            <option value="">Select</option>
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <Label>Nationality</Label>
                          <Input className="mt-1" value={profileForm.nationality} onChange={(e) => setProfileForm({ ...profileForm, nationality: e.target.value })} placeholder="Nigeria" />
                        </div>
                        <div>
                          <Label>Country of residence</Label>
                          <Input className="mt-1" value={profileForm.residencyCountry} onChange={(e) => setProfileForm({ ...profileForm, residencyCountry: e.target.value })} placeholder="Nigeria" />
                        </div>
                        <div className="sm:col-span-2">
                          <Label>City / address</Label>
                          <Input className="mt-1" value={profileForm.city} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} placeholder="City" />
                        </div>
                        <div className="sm:col-span-2">
                          <Label>BVN</Label>
                          <Input className="mt-1" maxLength={11} inputMode="numeric" value={profileForm.bvn} onChange={(e) => setProfileForm({ ...profileForm, bvn: e.target.value.replace(/\D/g, "") })} placeholder="11-digit BVN" />
                        </div>
                        <div>
                          <Label>Bank name</Label>
                          <Input className="mt-1" value={profileForm.bankName} onChange={(e) => setProfileForm({ ...profileForm, bankName: e.target.value })} placeholder="GTBank" />
                        </div>
                        <div>
                          <Label>Account number</Label>
                          <Input className="mt-1" maxLength={10} inputMode="numeric" value={profileForm.accountNumber} onChange={(e) => setProfileForm({ ...profileForm, accountNumber: e.target.value.replace(/\D/g, "") })} placeholder="10-digit account" />
                        </div>
                        <div>
                          <Label>Account name (optional)</Label>
                          <Input className="mt-1" value={profileForm.accountName} onChange={(e) => setProfileForm({ ...profileForm, accountName: e.target.value })} />
                        </div>
                        <div>
                          <Label>CSCS CHN (optional)</Label>
                          <Input className="mt-1" value={profileForm.cscsChn} onChange={(e) => setProfileForm({ ...profileForm, cscsChn: e.target.value })} placeholder="e.g. CHN1002345" />
                        </div>
                        <div>
                          <Label>ID type</Label>
                          <select className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none focus:border-gold/60" value={profileForm.idType} onChange={(e) => setProfileForm({ ...profileForm, idType: e.target.value })}>
                            <option value="NIN">NIN</option>
                            <option value="Passport">Passport</option>
                            <option value="Voter's Card">Voter&apos;s Card</option>
                            <option value="Driver's License">Driver&apos;s License</option>
                          </select>
                        </div>
                        <div>
                          <Label>ID number</Label>
                          <Input className="mt-1" value={profileForm.idNumber} onChange={(e) => setProfileForm({ ...profileForm, idNumber: e.target.value })} />
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <Button variant="ghost" onClick={() => { setStep(0); setQuote(null); }}>Back</Button>
                        <Button variant="gold" onClick={saveProfile} disabled={savingProfile}>
                          {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                          Save & verify
                        </Button>
                      </div>
                    </div>
                  )}

                  {verifyStatus === "APPROVED" && (
                    <div className="flex justify-between">
                      <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
                      <Button variant="gold" onClick={fetchQuote}>Review & buy <ChevronRight className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
              )}

              {!wizardClosed && step === 2 && quote?.quote && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-gold/25 bg-gold/[0.06] p-5">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm"><span className="text-white/50">Shares</span><span className="font-semibold">{quote.quote.shares.toLocaleString()} × {naira(quote.pricePerShare, 0)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-white/50">Subtotal {ipo.currency}</span><span className="font-mono">{naira(quote.quote.grossNgn)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-white/50">Processing fee ({quote.feePct}%)</span><span className="font-mono">{naira(quote.quote.feeNgn)}</span></div>
                      <div className="flex justify-between border-t border-white/10 pt-3 text-sm"><span className="text-white/60">Total {ipo.currency}</span><span className="font-mono font-bold text-gold">{naira(quote.quote.totalNgn)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-white/50">Wallet charge (USD @ {quote.quote.rate.toFixed(2)} {ipo.currency}/USD)</span><span className="font-mono font-bold text-emerald-400">{usd(quote.quote.amountUsd)}</span></div>
                    </div>
                  </div>
                  <div className={cn("flex items-start gap-3 rounded-2xl border p-4 text-sm", quote.walletBalance >= quote.quote.amountUsd ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : "border-red-400/25 bg-red-400/10 text-red-200")}>
                    {quote.walletBalance >= quote.quote.amountUsd ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />}
                    <p>
                      Wallet balance: <span className="font-mono font-semibold">{usd(quote.walletBalance)}</span>
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                    <Button variant="gold" onClick={confirmSubscribe} disabled={submitting || (!quote.sandbox && quote.walletBalance < quote.quote.amountUsd)}>
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      {quote.walletBalance < quote.quote.amountUsd && !quote.sandbox ? "Insufficient balance" : "Confirm & pay"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <InfoPanel ipo={ipo} documents={data?.documents ?? []} />
        </div>
      )}
    </div>
  );
}

function SuccessPanel({ app, ipo }: { app: IpoApplication; ipo: Ipo }) {
  return (
    <div className="glass-card p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-400">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <div>
          <h2 className="font-display text-xl font-bold">You're subscribed — {ipo.name}</h2>
          <p className="mt-1 text-sm text-white/50">
            ${app.amountUsd.toFixed(2)} was deducted from your wallet for {app.shares.toLocaleString()} shares.
          </p>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Reference", value: app.reference },
          { label: "Shares", value: app.shares.toLocaleString() },
          { label: "Amount (NGN)", value: naira(app.amountNgn) },
          { label: "Status", value: app.status, isBadge: true },
        ].map((f) => (
          <div key={f.label} className="rounded-xl bg-white/[0.04] p-4">
            <p className="text-[11px] uppercase tracking-wider text-white/35">{f.label}</p>
            {f.isBadge ? <div className="mt-1"><StatusBadge status={f.value} /></div> : <p className="mt-1 font-mono text-sm font-semibold">{f.value}</p>}
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/ipo/applications">My subscriptions</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/ipo">Browse offerings</Link>
        </Button>
      </div>
    </div>
  );
}

function ApplicationPanel({ app, ipo }: { app: IpoApplication; ipo: Ipo }) {
  return (
    <div className="glass-card p-8">
      <div className="flex items-center gap-3">
        <Banknote className="h-6 w-6 text-gold" />
        <h2 className="font-display text-lg font-semibold">Your subscription — {ipo.name}</h2>
        <StatusBadge status={app.status} />
      </div>
      <p className="mt-2 text-sm text-white/50">
        Reference <span className="font-mono text-gold">{app.reference}</span>. Allocation will be communicated once the offer closes and shares are allotted.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Shares requested", value: app.shares.toLocaleString() },
          { label: "Amount (NGN)", value: naira(app.amountNgn) },
          { label: "Amount charged (USD)", value: usd(app.amountUsd) },
          { label: "Submitted", value: formatDate(app.submittedAt) },
        ].map((f) => (
          <div key={f.label} className="rounded-xl bg-white/[0.04] p-4">
            <p className="text-[11px] uppercase tracking-wider text-white/35">{f.label}</p>
            <p className="mt-1 font-mono text-sm font-semibold">{f.value}</p>
          </div>
        ))}
      </div>
      <SubscriptionTracker app={app} ipo={ipo} />
      {app.allocationShares != null && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-gold/25 bg-gold/[0.06] p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
          <p>
            Allocation result: <span className="font-semibold">{app.allocatedAmountNgn != null ? naira(app.allocatedAmountNgn) : app.allocationShares.toLocaleString()} of {app.shares.toLocaleString()} shares</span>
            {app.refund?.status === "COMPLETED" && <span className="mt-1 block text-emerald-400">Refund of {usd(app.refund.amountUsd)} was returned to your wallet.</span>}
          </p>
        </div>
      )}
    </div>
  );
}

function InfoPanel({ ipo, documents }: { ipo: Ipo; documents: IpoDocument[] }) {
  return (
    <div className="space-y-6">
      {ipo.keyFacts.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-display font-semibold">Key facts</h3>
          <div className="mt-4 space-y-3">
            {ipo.keyFacts.map((f) => (
              <div key={f.label} className="flex items-center justify-between gap-3 border-b border-white/[0.05] pb-2 text-sm last:border-0">
                <span className="text-white/45">{f.label}</span>
                <span className="text-right font-medium">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {documents.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gold" />
            <h3 className="font-display font-semibold">Documents</h3>
          </div>
          <div className="mt-4 space-y-2.5">
            {documents.map((doc) => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm transition-colors hover:border-gold/40"
              >
                <span>
                  <span className="font-medium">{doc.title}</span>
                  {doc.description && <span className="mt-0.5 block text-xs text-white/40">{doc.description}</span>}
                </span>
                <FileText className="h-4 w-4 text-gold" />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card p-6">
        <h3 className="flex items-center gap-2 font-display font-semibold">
          <AlertTriangle className="h-5 w-5 text-amber-400" /> Important
        </h3>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/55">{ipo.riskDisclaimers}</p>
        <p className="mt-4 flex items-center gap-2 text-xs text-white/35">
          <Calendar className="h-4 w-4" /> Offer window: {ipo.openDate ? formatDate(ipo.openDate) : "—"} to {ipo.closeDate ? formatDate(ipo.closeDate) : "—"}
        </p>
      </div>
    </div>
  );
}

function ProgressPanel({
  totalShares,
  demandShares,
  pricePerShare,
  applicationsCount,
  closeDate,
  status,
}: {
  totalShares: number;
  demandShares: number;
  pricePerShare: number;
  applicationsCount: number;
  closeDate: string | null | undefined;
  status: IpoStatus;
}) {
  const ratePct = totalShares > 0 ? Math.min(100, (demandShares / totalShares) * 100) : 0;
  const raised = demandShares * pricePerShare;
  const offer = totalShares * pricePerShare;
  const remaining = Math.max(0, totalShares - demandShares);
  const daysLeft = closeDate ? Math.max(0, Math.ceil((new Date(closeDate).getTime() - Date.now()) / 86400000)) : null;
  const closed = status === "CLOSED" || status === "ALLOCATION_PENDING" || status === "ALLOCATION_COMPLETED" || status === "LISTED" || status === "COMPLETED";

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06] p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/[0.12] text-gold">
            <TrendingUp className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold">Subscription progress</h2>
            <p className="text-xs text-white/40">Track demand for this offering in real time.</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-bold text-gold">{ratePct.toFixed(2)}%</p>
          <p className="text-xs text-white/40">of the offer subscribed</p>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <Progress value={ratePct} className="h-3" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white/[0.04] p-4">
            <p className="text-[11px] uppercase tracking-wider text-white/35">IPO balance raised</p>
            <p className="mt-1 font-mono text-lg font-semibold text-gold">{formatCompactNgn(raised)}</p>
            <p className="text-xs text-white/40">of {formatCompactNgn(offer)} offer</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-4">
            <p className="text-[11px] uppercase tracking-wider text-white/35">Shares subscribed</p>
            <p className="mt-1 font-mono text-lg font-semibold">{demandShares.toLocaleString()}</p>
            <p className="text-xs text-white/40">of {totalShares.toLocaleString()} available</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-4">
            <p className="text-[11px] uppercase tracking-wider text-white/35">Applications</p>
            <p className="mt-1 font-mono text-lg font-semibold">{applicationsCount.toLocaleString()}</p>
            <p className="flex items-center gap-1 text-xs text-white/40"><Users className="h-3 w-3" /> investors so far</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-4">
            <p className="text-[11px] uppercase tracking-wider text-white/35">Available to subscribe</p>
            <p className="mt-1 font-mono text-lg font-semibold">{remaining.toLocaleString()}</p>
            <p className="text-xs text-white/40">shares remaining</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
          {closed ? (
            <span className="rounded-lg border border-gold/25 bg-gold/[0.06] px-2.5 py-1 font-medium text-gold">This offering is now closed</span>
          ) : daysLeft !== null ? (
            <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 font-medium">
              <Clock className="mr-1 inline h-3.5 w-3.5 text-gold" />
              {daysLeft === 0 ? "Closes today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left to subscribe`}
            </span>
          ) : null}
          {closeDate && <span>Offer closes {formatDate(closeDate)}.</span>}
        </div>
      </div>
    </div>
  );
}

function SubscriptionTracker({ app, ipo }: { app: IpoApplication; ipo: Ipo }) {
  const milestones = [
    { key: "submitted", label: "Subscription submitted", desc: "Your application was received." },
    { key: "paid", label: "Payment confirmed", desc: "The subscription amount was deducted from your wallet." },
    { key: "review", label: "Under issuer review", desc: "Your application has been passed to the issuer for vetting." },
    { key: "allocation", label: "Allocation", desc: "Shares are allotted once the offer closes." },
    { key: "completed", label: "Refund / completion", desc: "Excess funds are refunded or the subscription is completed." },
  ];

  const status = app.status;
  let done = 0;
  let active: number | null = null;
  if (status === "SUBMITTED" || status === "PAYMENT_PENDING") {
    done = 1;
    active = 1;
  } else if (status === "PAID") {
    done = 2;
    active = 2;
  } else if (status === "UNDER_REVIEW" || status === "SUBMITTED_TO_ISSUER") {
    done = 3;
    active = 3;
  } else if (status === "ALLOCATED" || status === "PARTIALLY_ALLOCATED" || status === "NOT_ALLOCATED" || status === "REFUND_PENDING") {
    done = 4;
    active = 4;
  } else {
    done = 5;
    active = null;
  }

  const allocationDetail =
    status === "ALLOCATED" || status === "PARTIALLY_ALLOCATED" || status === "NOT_ALLOCATED"
      ? `${app.allocationShares?.toLocaleString() ?? 0} of ${app.shares.toLocaleString()} shares allotted`
      : null;
  const refundDetail = status === "REFUNDED" || status === "REFUND_PENDING" ? `₦${(app.amountNgn - (app.allocatedAmountNgn ?? 0)).toLocaleString()} excess` : null;

  return (
    <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-gold" />
        <h3 className="font-display font-semibold">Track your subscription</h3>
      </div>
      <p className="mt-1 text-xs text-white/40">Your application for {ipo.name} is moving through these stages.</p>

      <ol className="mt-5 space-y-0">
        {milestones.map((m, i) => {
          const state = i < done ? "done" : i === active ? "active" : "pending";
          return (
            <li key={m.key} className="relative flex gap-3 pb-5 last:pb-0">
              {i < milestones.length - 1 && (
                <span
                  className={cn(
                    "absolute left-[11px] top-6 h-[calc(100%-16px)] w-px",
                    i < done ? "bg-gold/50" : "bg-white/10",
                  )}
                />
              )}
              <span className="mt-0.5 shrink-0">
                {state === "done" ? (
                  <CheckCircle2 className="h-[22px] w-[22px] text-gold" />
                ) : state === "active" ? (
                  <Loader2 className="h-[22px] w-[22px] animate-spin text-gold" />
                ) : (
                  <Circle className="h-[22px] w-[22px] text-white/25" />
                )}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={cn("text-sm font-medium", state === "pending" ? "text-white/35" : "text-white/85")}>{m.label}</p>
                  {i === active && <StatusBadge status={status} />}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-white/40">
                  {state === "done" && allocationDetail && i === 3 ? allocationDetail : state === "done" && refundDetail && i === 4 ? refundDetail : i === active ? m.desc : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
