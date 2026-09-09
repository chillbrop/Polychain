"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Landmark,
  ShieldAlert,
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
} from "lucide-react";
import { get, post } from "@/lib/api-client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatNaira, formatUSD, formatDate, cn } from "@/lib/utils";
import type { Ipo, IpoApplication, IpoDocument, IpoInvestorProfile, KycStatus } from "@/types";

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
      setStep(2);
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
      toast({ title: paid.sandbox ? "Recorded in TEST MODE" : "Subscription confirmed", description: paid.message, variant: paid.sandbox ? "default" : "success" });
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
                {ipo.sandbox && (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                    <ShieldAlert className="h-3 w-3" /> Test offering
                  </span>
                )}
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

      {ipo.sandbox && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            <span className="font-semibold">This offering is in test mode.</span> Subscriptions are recorded and simulated — your
            wallet is <span className="font-semibold">not</span> debited and no money moves.
          </p>
        </div>
      )}

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
                      Review <ChevronRight className="h-4 w-4" />
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
                      <Button variant="gold" onClick={fetchQuote}>Review <ChevronRight className="h-4 w-4" /></Button>
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
                      {quote.sandbox && <span className="mt-1 block text-xs opacity-70">Test offering — no real wallet debit.</span>}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                    <Button variant="gold" onClick={confirmSubscribe} disabled={submitting}>
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      Confirm & {quote.sandbox ? "record" : "pay"}
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
          <h2 className="font-display text-xl font-bold">{app.sandbox ? "Subscription recorded (TEST MODE)" : "You're subscribed"} — {ipo.name}</h2>
          <p className="mt-1 text-sm text-white/50">
            {app.sandbox
              ? "Because this offering is in test mode, no amount was charged and no wallet was debited."
              : `$${app.amountUsd.toFixed(2)} was deducted from your wallet for ${app.shares.toLocaleString()} shares.`}
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