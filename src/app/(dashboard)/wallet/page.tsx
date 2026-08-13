"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import {
  Copy,
  Check,
  Loader2,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet as WalletIcon,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { get, post } from "@/lib/api-client";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDateTime, truncateMiddle, cn } from "@/lib/utils";
import type { Currency, DepositRequest, Transaction, User, Withdrawal } from "@/types";

const currencyMeta: Record<string, { label: string; symbol: string }> = {
  USDT_TRC20: { label: "USDT (TRC-20)", symbol: "USDT" },
  BTC: { label: "Bitcoin", symbol: "BTC" },
  ETH: { label: "Ethereum", symbol: "ETH" },
};

interface WalletSummary {
  user: User;
  deposits: DepositRequest[];
  withdrawals: Withdrawal[];
  walletAddresses: Record<string, string>;
}

export default function WalletPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "deposit" ? "deposit" : searchParams.get("tab") === "withdraw" ? "withdraw" : "overview";
  const [tab, setTab] = useState(initialTab);
  const queryClient = useQueryClient();
  const verifiedReference = useRef<string | null>(null);

  const { data, isLoading } = useQuery<WalletSummary>({
    queryKey: ["wallet"],
    queryFn: () => get("/wallet/summary"),
    refetchInterval: 30000,
  });

  useEffect(() => {
    const reference = searchParams.get("reference");
    if (searchParams.get("payment") !== "paystack" || !reference || verifiedReference.current === reference) return;
    verifiedReference.current = reference;
    void post<{ creditedAmount: number }>("/payments/paystack/verify", { reference })
      .then((result) => {
        toast({ title: "Payment confirmed", description: `${formatCurrency(result.creditedAmount)} was added to your wallet.`, variant: "success" });
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
        window.history.replaceState({}, "", "/wallet?tab=paystack");
      })
      .catch((error) => toast({ title: "Payment not confirmed yet", description: (error as Error).message, variant: "destructive" }));
  }, [searchParams, queryClient]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-44 rounded-2xl bg-white/5 animate-pulse" />
          <div className="h-44 rounded-2xl bg-white/5 animate-pulse" />
        </div>
        <div className="h-72 rounded-2xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  const user = data!.user;
  const total = user.walletBalance + user.profitBalance;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Wallet</h1>
        <p className="mt-1 text-sm text-white/50">Deposit, withdraw and track your funds in one place.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card p-6">
          <p className="flex items-center gap-2 text-sm text-white/50"><WalletIcon className="h-4 w-4 text-gold" /> Available balance</p>
          <p className="mt-2 font-display text-2xl font-bold">{formatCurrency(user.walletBalance)}</p>
          <p className="mt-1 text-xs text-emerald-400">Ready to invest</p>
        </div>
        <div className="glass-card p-6">
          <p className="flex items-center gap-2 text-sm text-white/50"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Profit balance</p>
          <p className="mt-2 font-display text-2xl font-bold">{formatCurrency(user.profitBalance)}</p>
          <p className="mt-1 text-xs text-white/40">Earnings ready to withdraw</p>
        </div>
        <div className="glass-card p-6">
          <p className="flex items-center gap-2 text-sm text-white/50"><Clock className="h-4 w-4 text-sky-400" /> Total deposited</p>
          <p className="mt-2 font-display text-2xl font-bold">{formatCurrency(user.totalDeposited)}</p>
          <p className="mt-1 text-xs text-white/40">Lifetime</p>
        </div>
        <div className="glass-card p-6">
          <p className="flex items-center gap-2 text-sm text-white/50">Total withdrawn</p>
          <p className="mt-2 font-display text-2xl font-bold">{formatCurrency(user.totalWithdrawn)}</p>
          <p className="mt-1 text-xs text-white/40">Lifetime</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deposit">Crypto deposit</TabsTrigger>
          <TabsTrigger value="paystack">Paystack</TabsTrigger>
          <TabsTrigger value="mpesa">M-Pesa</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <WalletHistory deposits={data!.deposits} withdrawals={data!.withdrawals} />
        </TabsContent>

        <TabsContent value="deposit">
          <DepositForm addresses={data!.walletAddresses} onDone={() => queryClient.invalidateQueries({ queryKey: ["wallet"] })} />
        </TabsContent>

        <TabsContent value="paystack">
          <PaystackDepositForm />
        </TabsContent>

        <TabsContent value="mpesa">
          <MpesaDepositForm />
        </TabsContent>

        <TabsContent value="withdraw">
          <WithdrawForm user={user} onDone={() => queryClient.invalidateQueries({ queryKey: ["wallet"] })} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PaystackDepositForm() {
  const [amount, setAmount] = useState("");
  const mutation = useMutation({
    mutationFn: () => post<{ authorizationUrl: string }>("/payments/paystack/initialize", { amount: Number(amount) }),
    onSuccess: (payment) => window.location.assign(payment.authorizationUrl),
    onError: (error) => toast({ title: "Could not start Paystack", description: (error as Error).message, variant: "destructive" }),
  });

  return (
    <div className="glass-card mx-auto max-w-xl space-y-5 p-8">
      <div>
        <h3 className="font-display text-lg font-semibold">Fund with Paystack</h3>
        <p className="mt-1 text-sm text-white/45">Pay by card, bank transfer, or supported Paystack payment methods. You will be redirected to secure checkout.</p>
      </div>
      <div>
        <label className="mb-1.5 block text-sm text-white/60">Wallet credit (USD)</label>
        <input className="input-dark" type="number" min="1" step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} />
      </div>
      <Button variant="gold" className="w-full" disabled={!Number(amount) || mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {mutation.isPending ? "Opening checkout..." : "Continue to Paystack"}
      </Button>
      <p className="text-center text-xs text-white/30">The final NGN amount and credited USD value are locked using the configured exchange rate before checkout opens.</p>
    </div>
  );
}

function MpesaDepositForm() {
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [started, setStarted] = useState<{ amount: number; currency: string; creditedAmount: number; paybill?: string; accountReference?: string } | null>(null);
  const mutation = useMutation({
    mutationFn: () => post<{ amount: number; currency: string; creditedAmount: number; paybill?: string; accountReference?: string; message: string }>("/payments/mpesa/stk-push", { amount: Number(amount), phone }),
    onSuccess: (payment) => {
      setStarted(payment);
      toast({ title: "M-Pesa prompt sent", description: payment.message, variant: "success" });
    },
    onError: (error) => toast({ title: "Could not start M-Pesa", description: (error as Error).message, variant: "destructive" }),
  });

  return (
    <div className="glass-card mx-auto max-w-xl space-y-5 p-8">
      <div>
        <h3 className="font-display text-lg font-semibold">Fund with M-Pesa</h3>
        <p className="mt-1 text-sm text-white/45">Enter a Kenyan M-Pesa number and approve the secure STK prompt on your phone.</p>
      </div>
      <div className="rounded-xl border border-gold/25 bg-gold/[0.06] p-4 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-gold">Paybill details</p>
        <p className="mt-2 text-white/80">
          Paybill: <span className="font-mono font-semibold text-white">247247</span>
        </p>
        <p className="mt-1 text-white/80">
          Account: <span className="font-mono font-semibold text-white">0795911898</span>
        </p>
        <p className="mt-2 text-xs text-white/40">The STK prompt on your phone will show this Paybill and account. Confirm it to complete the deposit.</p>
      </div>
      <div>
        <label className="mb-1.5 block text-sm text-white/60">Wallet credit (USD)</label>
        <input className="input-dark" type="number" min="1" step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm text-white/60">M-Pesa phone number</label>
        <input className="input-dark" inputMode="tel" placeholder="0712 345 678" value={phone} onChange={(event) => setPhone(event.target.value)} />
      </div>
      <Button variant="gold" className="w-full" disabled={!Number(amount) || !phone.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {mutation.isPending ? "Sending prompt..." : "Send M-Pesa prompt"}
      </Button>
      {started && <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-sm text-emerald-200">Pay {started.amount} {started.currency} on your phone. After confirmation, {formatCurrency(started.creditedAmount)} will be credited automatically.</p>}
    </div>
  );
}

function DepositForm({ addresses, onDone }: { addresses: Record<string, string>; onDone: () => void }) {
  const [currency, setCurrency] = useState<Currency>("USDT_TRC20");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const meta = currencyMeta[currency];
  const address = addresses[currency] || "";

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const mutation = useMutation({
    mutationFn: () => post("/wallet/deposit", { amount: parseFloat(amount), currency, txHash: txHash || undefined }),
    onSuccess: (data) => {
      toast({ title: "Deposit request created", description: (data as { message?: string }).message || "Send your funds to the address shown.", variant: "success" });
      setAmount("");
      setTxHash("");
      onDone();
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (error) => toast({ title: "Deposit failed", description: (error as Error).message, variant: "destructive" }),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="glass-card space-y-5 p-8">
        <div>
          <label className="mb-1.5 block text-sm text-white/60">Select cryptocurrency</label>
          <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(currencyMeta).map(([key, m]) => (
                <SelectItem key={key} value={key}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-white/60">Amount</label>
          <div className="relative">
            <input className="input-dark pr-16" type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gold">{meta.symbol}</span>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-white/60">Transaction hash (optional)</label>
          <input className="input-dark font-mono" placeholder="Paste txid after sending" value={txHash} onChange={(e) => setTxHash(e.target.value)} />
        </div>

        <Button variant="gold" className="w-full" disabled={!parseFloat(amount) || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {mutation.isPending ? "Creating request..." : "Create Deposit Request"}
        </Button>

        <p className="text-center text-xs leading-relaxed text-white/30">
          Deposits are credited to your wallet once confirmed on the {meta.label} network. Minimum deposit: $10.
        </p>
      </div>

      <div className="glass-card flex flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-white/50">Send {meta.symbol} to this address</p>
        <div className="mt-6 rounded-2xl border border-gold/30 bg-white p-4">
          <QRCodeSVG value={address} size={180} bgColor="#ffffff" fgColor="#0A1A33" level="M" />
        </div>
        <div className="mt-6 flex w-full max-w-md items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <code className="flex-1 break-all font-mono text-xs text-white/70">{address}</code>
          <button onClick={copyAddress} className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-gold-gradient px-3 text-xs font-semibold text-navy-dark">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="mt-4 text-xs text-white/30">Only send {meta.symbol} to this address. Other assets may be lost permanently.</p>
      </div>
    </div>
  );
}

function WithdrawForm({ user, onDone }: { user: User; onDone: () => void }) {
  const [currency, setCurrency] = useState<Currency>("USDT_TRC20");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const queryClient = useQueryClient();

  const numeric = parseFloat(amount) || 0;
  const max = Math.max(user.walletBalance, user.profitBalance);

  const mutation = useMutation({
    mutationFn: () => post("/wallet/withdraw", { amount: numeric, currency, address }),
    onSuccess: (data) => {
      toast({ title: "Withdrawal requested", description: (data as { message?: string }).message || "Your withdrawal is being processed.", variant: "success" });
      setAmount("");
      setAddress("");
      onDone();
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (error) => toast({ title: "Withdrawal failed", description: (error as Error).message, variant: "destructive" }),
  });

  const fee = numeric ? Math.max(1, numeric * 0.02) : 0;

  return (
    <div className="glass-card mx-auto max-w-xl space-y-5 p-8">
      <div>
        <label className="mb-1.5 block text-sm text-white/60">Select cryptocurrency</label>
        <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(currencyMeta).map(([key, m]) => (
              <SelectItem key={key} value={key}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm text-white/60">Amount</label>
          <button onClick={() => setAmount(String(max))} className="text-xs text-gold hover:underline">Max: {formatCurrency(max)}</button>
        </div>
        <div className="relative">
          <input className="input-dark pr-16" type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gold">{currencyMeta[currency].symbol}</span>
        </div>
        {numeric > 0 && (
          <p className="mt-1.5 text-xs text-white/40">Network fee: {formatCurrency(fee)} · You'll receive {formatCurrency(Math.max(0, numeric - fee))}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm text-white/60">Destination wallet address</label>
        <input className="input-dark font-mono" placeholder={`Enter ${currencyMeta[currency].symbol} address`} value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>

      <Button
        variant="gold"
        className="w-full"
        disabled={!numeric || numeric < 10 || address.length < 10 || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpFromLine className="h-4 w-4" />}
        {mutation.isPending ? "Processing..." : "Request Withdrawal"}
      </Button>

      <p className="text-center text-xs text-white/30">
        Withdrawals are reviewed by our compliance team and sent shortly after approval. Minimum: $10.
      </p>
    </div>
  );
}

function WalletHistory({ deposits, withdrawals }: { deposits: DepositRequest[]; withdrawals: Withdrawal[] }) {
  const [view, setView] = useState<"deposits" | "withdrawals">("deposits");
  const rows = view === "deposits" ? deposits : withdrawals;

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
        <h3 className="font-display font-semibold">Transaction History</h3>
        <div className="flex gap-1 rounded-lg bg-white/[0.05] p-1">
          {(["deposits", "withdrawals"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium capitalize transition-all",
                view === v ? "bg-gold-gradient text-navy-dark" : "text-white/50 hover:text-white"
              )}
            >
              {v === "deposits" ? <ArrowDownToLine className="h-3.5 w-3.5" /> : <ArrowUpFromLine className="h-3.5 w-3.5" />}
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {rows.length === 0 && <p className="py-10 text-center text-sm text-white/40">No {view} yet.</p>}
        {rows.map((row) => {
          const isDeposit = view === "deposits";
          return (
            <div key={row.id} className="flex items-center gap-4 px-6 py-4">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", isDeposit ? "bg-emerald-400/15" : "bg-amber-400/15")}>
                {isDeposit ? <ArrowDownToLine className="h-4 w-4 text-emerald-400" /> : <ArrowUpFromLine className="h-4 w-4 text-amber-400" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{isDeposit ? "Deposit" : "Withdrawal"}</p>
                <p className="text-xs text-white/40">
                  {currencyMeta[row.currency]?.label} · {formatDateTime(row.createdAt)}
                </p>
                {!isDeposit && <p className="text-xs text-white/40 font-mono">{truncateMiddle((row as Withdrawal).address)}</p>}
              </div>
              <div className="text-right">
                <p className={cn("font-mono text-sm font-semibold", isDeposit ? "text-emerald-400" : "text-amber-400")}>
                  {isDeposit ? "+" : "-"}{formatCurrency(row.amount)}
                </p>
                <StatusBadge status={row.status} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
