"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Rocket, ShieldAlert, Coins, Users, Send, RefreshCw, FileText, Trash2, DollarSign, BadgePercent, CircleDollarSign,
} from "lucide-react";
import Link from "next/link";
import { get, post, patch, del } from "@/lib/api-client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Pagination } from "@/components/shared/pagination";
import { formatNaira, formatUSD, formatCompactNgn, formatDate } from "@/lib/utils";
import type { Ipo, IpoApplication, IpoRefund, IpoInvestorProfile, IpoDocument, IpoStatus, IpoApplicationStatus } from "@/types";

const IPO_STATUSES: IpoStatus[] = ["DRAFT", "UPCOMING", "OPEN", "CLOSING_SOON", "CLOSED", "ALLOCATION_PENDING", "ALLOCATION_COMPLETED", "LISTED", "COMPLETED"];
const APP_STATUSES: IpoApplicationStatus[] = ["PAID", "UNDER_REVIEW", "SUBMITTED_TO_ISSUER", "ALLOCATED", "PARTIALLY_ALLOCATED", "NOT_ALLOCATED", "COMPLETED"];
const DOC_TYPES = ["PROSPECTUS", "FINANCIALS", "UPLOAD", "NOTICE", "RESULT"] as const;

export default function AdminIpoDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="space-y-6">
      <Link href="/admin/ipo" className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-gold">
        <ArrowLeft className="h-4 w-4" /> All offerings
      </Link>
      <IpoDetailRouter id={id} />
    </div>
  );
}

function IpoDetailRouter({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery<{ ipo: Ipo; stats: { paidNgn: number; paidShares: number; paidApplications: number; refunds: number; refundedUsd: number } }>({
    queryKey: ["admin-ipo-detail", id],
    queryFn: () => get(`/admin/ipo/${id}`),
    enabled: !!id,
  });

  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-white/[0.03]" />;
  if (error || !data) return <p className="text-white/40">{(error as Error)?.message || "Offering not found"}</p>;

  return (
    <IpoTabs
      id={id}
      ipo={data.ipo}
      stats={data.stats}
      invalidateAll={() => queryClient.invalidateQueries({ queryKey: ["admin-ipo-detail", id], exact: false })}
    />
  );
}

function IpoTabs({ id, ipo, stats, invalidateAll }: { id: string; ipo: Ipo; stats: Record<string, number>; invalidateAll: () => void }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="space-y-6">
      <div className="glass-card flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-white">{ipo.name}</h1>
            <StatusBadge status={ipo.status} />
            {ipo.sandbox ? (
              <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-300"><ShieldAlert className="h-3 w-3" /> Test mode</span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300"><Rocket className="h-3 w-3" /> Live</span>
            )}
          </div>
          <p className="mt-1 text-sm text-white/50">{ipo.issuer} · {ipo.pricePerShare.toLocaleString()} {ipo.currency}/share · {ipo.totalShares.toLocaleString()} shares</p>
          <p className="text-xs text-white/35">{ipo.published ? "Published" : "Unpublished draft"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="gold" onClick={() => setEditing(true)}>Edit offering</Button>
          {ipo.published && <StatusOverride id={id} status={ipo.status} invalidateAll={invalidateAll} />}
          {ipo.sandbox && <SandboxToggle id={id} sandbox={ipo.sandbox} invalidateAll={invalidateAll} />}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Coins className="h-4 w-4" />} label="Paid (raised)" value={formatNaira(stats.paidNgn)} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Paid applications" value={String(stats.paidApplications)} />
        <StatCard icon={<BadgePercent className="h-4 w-4" />} label="Shares subscribed" value={formatCompactNgn(stats.paidShares)} />
        <StatCard icon={<CircleDollarSign className="h-4 w-4" />} label="Refunded (USD)" value={formatUSD(stats.refundedUsd)} />
      </div>

      <Tabs defaultValue="applications">
        <TabsList>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="kyc">KYC reviews</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="refunds">Refunds</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="applications"><ApplicationsTab id={id} /></TabsContent>
        <TabsContent value="kyc"><KycTab /></TabsContent>
        <TabsContent value="allocation"><AllocationTab id={id} /></TabsContent>
        <TabsContent value="refunds"><RefundsTab id={id} /></TabsContent>
        <TabsContent value="documents"><DocumentsTab id={id} /></TabsContent>
        <TabsContent value="analytics"><AnalyticsTab id={id} /></TabsContent>
      </Tabs>

      {editing && <EditDialog id={id} ipo={ipo} onClose={() => setEditing(false)} />}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 text-gold">{icon}<p className="text-xs uppercase tracking-wider text-white/50">{label}</p></div>
      <p className="mt-2 font-mono text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function StatusOverride({ id, status, invalidateAll }: { id: string; status: IpoStatus; invalidateAll: () => void }) {
  const { toast } = useToast();
  const [value, setValue] = useState<IpoStatus>(status);
  useEffect(() => setValue(status), [status]);
  const save = async () => {
    try {
      await patch(`/admin/ipo/${id}/status`, { status: value });
      toast({ title: "Status updated", variant: "success" });
      invalidateAll();
    } catch (e) {
      toast({ title: "Update failed", description: (e as Error).message, variant: "destructive" });
    }
  };
  return (
    <div className="flex items-center gap-1">
      <Select value={value} onValueChange={(v) => setValue(v as IpoStatus)}>
        <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          {IPO_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" onClick={save} disabled={value === status}>Set</Button>
    </div>
  );
}

function SandboxToggle({ id, sandbox, invalidateAll }: { id: string; sandbox: boolean; invalidateAll: () => void }) {
  const { toast } = useToast();
  const toggle = async () => {
    try {
      await patch(`/admin/ipo/${id}`, { sandbox: !sandbox });
      toast({ title: sandbox ? "Now LIVE" : "Now in test mode", description: sandbox ? "Subscriptions will debit real wallet balances." : "Payments are simulated.", variant: "success" });
      invalidateAll();
    } catch (e) {
      toast({ title: "Update failed", description: (e as Error).message, variant: "destructive" });
    }
  };
  return (
    <Button variant={sandbox ? "success" : "outline"} onClick={toggle}>
      {sandbox ? <><Rocket className="h-4 w-4" /> Go live</> : <><ShieldAlert className="h-4 w-4" /> Test mode</>}
    </Button>
  );
}

const useIpoQuery = () => useQueryClient();

function ApplicationsTab({ id }: { id: string }) {
  const { toast } = useToast();
  const queryClient = useIpoQuery();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<{ applications: IpoApplication[]; total: number; totalPages: number }>({
    queryKey: ["admin-ipo-applications", id, page, status, search],
    queryFn: () => get(`/admin/ipo/${id}/applications`, { page: String(page), perPage: "15", status: status || undefined, search: search || undefined }),
  });

  const setAppStatus = async (appId: string, next: IpoApplicationStatus) => {
    try {
      await patch(`/admin/ipo/applications/${appId}/status`, { status: next });
      toast({ title: "Application updated", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["admin-ipo-applications", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-ipo-detail", id] });
    } catch (e) {
      toast({ title: "Update failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="sm:w-48"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {APP_STATUSES.concat(["SUBMITTED", "PAYMENT_PENDING", "REFUND_PENDING", "REFUNDED"] as IpoApplicationStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input placeholder="Search user…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="sm:w-64" />
          <p className="text-sm text-white/40">{data?.total ?? 0} apps</p>
        </div>
      </div>
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="text-right">Shares</TableHead>
              <TableHead className="text-right">Amount (NGN)</TableHead>
              <TableHead className="text-right">Ex. rate</TableHead>
              <TableHead className="text-right">USD</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Change status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><div className="h-4 w-12 animate-pulse rounded bg-white/5" /></TableCell>)}</TableRow>
            ))}
            {!isLoading && (data?.applications || []).length === 0 && <TableRow><TableCell colSpan={8} className="py-12 text-center text-white/40">No applications found</TableCell></TableRow>}
            {!isLoading && (data?.applications || []).map((app) => (
              <TableRow key={app.id}>
                <TableCell className="font-mono text-xs">{app.reference}</TableCell>
                <TableCell>
                  <p className="font-medium">{app.user?.username}</p>
                  <p className="text-xs text-white/40">{app.user?.email}</p>
                </TableCell>
                <TableCell className="text-right font-mono">{app.shares.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono text-gold">{formatCompactNgn(app.amountNgn)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{app.exchangeRate}</TableCell>
                <TableCell className="text-right font-mono">{formatUSD(app.amountUsd)}</TableCell>
                <TableCell><StatusBadge status={app.status} /></TableCell>
                <TableCell>
                  {["ALLOCATED", "PARTIALLY_ALLOCATED", "NOT_ALLOCATED", "REFUNDED"].includes(app.status) ? (
                    <span className="text-xs text-white/30">Locked after allocation</span>
                  ) : (
                    <AppStatusSelect value={app.status} onChange={(v) => setAppStatus(app.id, v)} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="border-t border-white/[0.06] p-4">
          <Pagination page={page} totalPages={data?.totalPages || 1} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}

function AppStatusSelect({ value, onChange }: { value: IpoApplicationStatus; onChange: (v: IpoApplicationStatus) => void }) {
  const options = value === "SUBMITTED" || value === "PAYMENT_PENDING" ? ["PAID", "PAYMENT_PENDING"] : APP_STATUSES.filter((s) => !["ALLOCATED", "PARTIALLY_ALLOCATED", "NOT_ALLOCATED"].includes(s));
  return (
    <Select value={value} onValueChange={(v) => onChange(v as IpoApplicationStatus)}>
      <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {Array.from(new Set([value, ...options])).map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function KycTab() {
  const { toast } = useToast();
  const queryClient = useIpoQuery();
  const [status, setStatus] = useState("PENDING");

  const { data, isLoading } = useQuery<{ profiles: IpoInvestorProfile[]; total: number }>({
    queryKey: ["admin-ipo-profiles", status],
    queryFn: () => get("/admin/ipo/investor-profiles", { status: status || undefined }),
  });

  const review = async (profileId: string, action: "APPROVE" | "REJECT") => {
    try {
      await patch(`/admin/ipo/investor-profiles/${profileId}/review`, { action });
      toast({ title: action === "APPROVE" ? "Investor approved" : "Investor rejected", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["admin-ipo-profiles"] });
    } catch (e) {
      toast({ title: "Review failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="ALL">All</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-white/40">{data?.total ?? 0} profiles</p>
      </div>
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Investor</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>BVN / Account</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>CSCS / CHN</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><div className="h-4 w-12 animate-pulse rounded bg-white/5" /></TableCell>)}</TableRow>
            ))}
            {!isLoading && (data?.profiles || []).length === 0 && <TableRow><TableCell colSpan={7} className="py-12 text-center text-white/40">No investor profiles found</TableCell></TableRow>}
            {!isLoading && (data?.profiles || []).map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.fullName}</TableCell>
                <TableCell className="text-xs text-white/40">{p.user?.email}</TableCell>
                <TableCell className="font-mono text-xs">{p.bvnLast4 || "—"} / {p.accountLast4 || "—"}</TableCell>
                <TableCell className="text-xs">{p.bankName}</TableCell>
                <TableCell className="text-xs">{p.cscsChn || "—"}</TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    {p.status === "PENDING" && (
                      <>
                        <Button size="sm" variant="success" onClick={() => review(p.id, "APPROVE")}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => review(p.id, "REJECT")}>Reject</Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AllocationTab({ id }: { id: string }) {
  const { toast } = useToast();
  const queryClient = useIpoQuery();
  const [mode, setMode] = useState<"uniform" | "import">("uniform");
  const [ratePct, setRatePct] = useState("50");
  const [importText, setImportText] = useState("");
  const [result, setResult] = useState<{ totalProcessed?: number; allocatedSharesTotal?: number; notAllocated?: number; partial?: number; full?: number; message?: string } | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setResult(null);
    setRunning(true);
    try {
      const body = mode === "uniform" ? { ratePct: Number(ratePct) } : {
        allocations: importText.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
          const [reference, shares] = line.split(/[,;]\s*/);
          return { reference: reference.trim(), shares: Number(shares) };
        }),
      };
      const res = await post<typeof result & { message?: string }>(`/admin/ipo/${id}/allocate`, body);
      setResult(res);
      toast({ title: "Allocation completed", description: `${res.totalProcessed} application(s) processed`, variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["admin-ipo-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-ipo-applications", id] });
    } catch (e) {
      toast({ title: "Allocation failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="glass-card p-5">
        <h3 className="font-display font-semibold">Allocation run</h3>
        <p className="mt-1 text-xs text-white/40">Applies to paid applications. Sets the offering to ALLOCATION_COMPLETED and emails investors their result.</p>
        <div className="mt-4 space-y-4">
          <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
            <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="uniform">Uniform rate (%)</SelectItem>
              <SelectItem value="import">Per-reference import</SelectItem>
            </SelectContent>
          </Select>
          {mode === "uniform" ? (
            <div>
              <Label>Allocation rate</Label>
              <div className="mt-1 flex items-center gap-3">
                <Input type="number" min={0} max={100} value={ratePct} onChange={(e) => setRatePct(e.target.value)} className="sm:w-40" />
                <span className="text-sm text-white/40">% of requested shares</span>
              </div>
            </div>
          ) : (
            <div>
              <Label>Per-line: <span className="text-white/40">applicationReference, shares</span></Label>
              <Textarea className="mt-1 font-mono text-xs" rows={6} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={"P0A1K2X9B7W4Q3V, 150\nP0A8C3M6F1T2Q9R, 0"} />
            </div>
          )}
          <Button variant="gold" onClick={run} disabled={running || (mode === "import" && !importText.trim())}>
            <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} /> Run allocation
          </Button>
        </div>
      </div>
      <div className="glass-card p-5">
        <h3 className="font-display font-semibold">Result</h3>
        {!result ? (
          <p className="mt-2 text-sm text-white/40">Run an allocation to see a breakdown here. Afterward, create refunds for not/partially allocated investors.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/[0.04] p-3"><p className="text-xs text-white/40">Processed</p><p className="font-mono text-lg font-semibold">{result.totalProcessed ?? 0}</p></div>
            <div className="rounded-xl bg-white/[0.04] p-3"><p className="text-xs text-white/40">Shares allocated</p><p className="font-mono text-lg font-semibold">{result.allocatedSharesTotal?.toLocaleString() ?? 0}</p></div>
            <div className="rounded-xl bg-emerald-400/10 p-3"><p className="text-xs text-emerald-300/70">Full</p><p className="font-mono text-lg font-semibold">{result.full ?? 0}</p></div>
            <div className="rounded-xl bg-amber-400/10 p-3"><p className="text-xs text-amber-300/70">Partial</p><p className="font-mono text-lg font-semibold">{result.partial ?? 0}</p></div>
            <div className="rounded-xl bg-white/[0.04] p-3"><p className="text-xs text-white/40">Not allocated</p><p className="font-mono text-lg font-semibold">{result.notAllocated ?? 0}</p></div>
            {result.message && <div className="col-span-2 text-xs text-white/50">{result.message}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function RefundsTab({ id }: { id: string }) {
  const { toast } = useToast();
  const queryClient = useIpoQuery();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery<{ refunds: IpoRefund[]; total: number; totalPages: number }>({
    queryKey: ["admin-ipo-refunds", id, page],
    queryFn: () => get("/admin/ipo/refunds", { ipoId: id, page: String(page), perPage: "15" }),
  });

  const createRefunds = async () => {
    setCreating(true);
    try {
      const res = await post<{ created: number; message: string }>(`/admin/ipo/${id}/refunds`, {});
      toast({ title: `${res.created} refund(s) created`, description: res.message, variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["admin-ipo-refunds", id] });
    } catch (e) {
      toast({ title: "Refund creation failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const process = async (refundId: string) => {
    try {
      const res = await post<{ message: string }>(`/admin/ipo/refunds/${refundId}/process`, {});
      toast({ title: "Refund processed", description: res.message, variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["admin-ipo-refunds", id] });
    } catch (e) {
      toast({ title: "Processing failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/50">Create refunds for not/partially allocated investors, then process them to return funds.</p>
        <Button variant="gold" onClick={createRefunds} disabled={creating}><Send className="h-4 w-4" /> {creating ? "Creating…" : "Create refunds"}</Button>
      </div>
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Refund</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Application</TableHead>
              <TableHead className="text-right">Shares</TableHead>
              <TableHead className="text-right">Allocated</TableHead>
              <TableHead className="text-right">Amount (NGN)</TableHead>
              <TableHead className="text-right">USD</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Process</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 10 }).map((_, j) => <TableCell key={j}><div className="h-4 w-12 animate-pulse rounded bg-white/5" /></TableCell>)}</TableRow>
            ))}
            {!isLoading && (data?.refunds || []).length === 0 && <TableRow><TableCell colSpan={10} className="py-12 text-center text-white/40">No refunds yet. Run allocation then create refunds.</TableCell></TableRow>}
            {!isLoading && (data?.refunds || []).map((refund) => (
              <TableRow key={refund.id}>
                <TableCell className="font-mono text-xs">{refund.reference}</TableCell>
                <TableCell className="text-xs">{refund.user?.username || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{refund.application?.reference}</TableCell>
                <TableCell className="text-right font-mono">{refund.application?.shares.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono">{refund.application?.allocationShares?.toLocaleString() ?? "—"}</TableCell>
                <TableCell className="text-right font-mono text-gold">{formatCompactNgn(refund.amountNgn)}</TableCell>
                <TableCell className="text-right font-mono">{formatUSD(refund.amountUsd)}</TableCell>
                <TableCell><span className="text-xs">{refund.reason === "PARTIAL" ? "Partial" : "Not alloc"}</span></TableCell>
                <TableCell><StatusBadge status={refund.status} /></TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    {refund.status === "PENDING" || refund.status === "PROCESSING" ? (
                      <Button size="sm" variant="success" onClick={() => process(refund.id)}>Process</Button>
                    ) : (
                      <span className="text-xs text-white/30">{refund.processedAt ? formatDate(refund.processedAt) : "—"}</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="border-t border-white/[0.06] p-4">
          <Pagination page={page} totalPages={data?.totalPages || 1} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}

function DocumentsTab({ id }: { id: string }) {
  const { toast } = useToast();
  const queryClient = useIpoQuery();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery<{ documents: IpoDocument[] }>({
    queryKey: ["admin-ipo-documents", id],
    queryFn: () => get(`/admin/ipo/${id}/documents`),
  });

  const handle = async () => {
    try {
      await post("/admin/ipo/documents", {
        ipoId: id,
        title: form.title,
        type: form.type || "UPLOAD",
        url: form.url,
        description: form.description || undefined,
      });
      toast({ title: "Document added", variant: "success" });
      setOpen(false);
      setForm({});
      queryClient.invalidateQueries({ queryKey: ["admin-ipo-documents", id] });
    } catch (e) {
      toast({ title: "Could not add document", description: (e as Error).message, variant: "destructive" });
    }
  };

  const togglePublished = async (doc: IpoDocument) => {
    try {
      await patch(`/admin/ipo/documents/${doc.id}`, { published: !doc.published });
      queryClient.invalidateQueries({ queryKey: ["admin-ipo-documents", id] });
    } catch (e) {
      toast({ title: "Update failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const remove = async (doc: IpoDocument) => {
    try {
      await del(`/admin/ipo/documents/${doc.id}`);
      toast({ title: "Document removed", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["admin-ipo-documents", id] });
    } catch (e) {
      toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/50">Prospectus, financials, results and notices shown to investors on the offering page.</p>
        <Button variant="gold" onClick={() => setOpen(true)}><FileText className="h-4 w-4" /> Add document</Button>
      </div>
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><div className="h-4 w-12 animate-pulse rounded bg-white/5" /></TableCell>)}</TableRow>
            ))}
            {!isLoading && (data?.documents || []).length === 0 && <TableRow><TableCell colSpan={6} className="py-12 text-center text-white/40">No documents yet</TableCell></TableRow>}
            {!isLoading && (data?.documents || []).map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">{doc.title}</TableCell>
                <TableCell><span className="rounded-lg bg-gold/10 px-2 py-0.5 text-xs font-medium text-gold">{doc.type}</span></TableCell>
                <TableCell className="max-w-[220px] truncate font-mono text-xs text-white/40">{doc.url}</TableCell>
                <TableCell><StatusBadge status={doc.published ? "ACTIVE" : "DRAFT"} /></TableCell>
                <TableCell className="text-xs text-white/40">{formatDate(doc.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => togglePublished(doc)}>{doc.published ? "Hide" : "Publish"}</Button>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => remove(doc)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input className="mt-1" value={form.title || ""} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Dangote Refinery Prospectus" /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.type || "UPLOAD"} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>URL</Label><Input className="mt-1" value={form.url || ""} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://…" /></div>
            <div><Label>Description (optional)</Label><Textarea className="mt-1" rows={2} value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="gold" onClick={handle}>Add document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnalyticsTab({ id }: { id: string }) {
  const { data } = useQuery<{ stats: { applications: number; paidApplications: number; paidShares: number; raisedNgn: number; oversubscriptionPct: number; totalShares: number }; daily: Array<{ label: string; applications: number; raisedNgn: number }> }>({
    queryKey: ["admin-ipo-stats", id],
    queryFn: () => get(`/admin/ipo/${id}/stats`),
  });

  const maxDaily = useMemo(() => Math.max(1, ...(data?.daily || []).map((d) => d.raisedNgn)), [data?.daily]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="glass-card p-5">
        <h3 className="font-display font-semibold">Demand overview</h3>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/[0.04] p-3"><p className="text-xs text-white/40">Total applications</p><p className="font-mono text-lg font-semibold">{data?.stats.applications ?? 0}</p></div>
          <div className="rounded-xl bg-white/[0.04] p-3"><p className="text-xs text-white/40">Paid applications</p><p className="font-mono text-lg font-semibold">{data?.stats.paidApplications ?? 0}</p></div>
          <div className="rounded-xl bg-white/[0.04] p-3"><p className="text-xs text-white/40">Shares subscribed</p><p className="font-mono text-lg font-semibold">{formatCompactNgn(data?.stats.paidShares ?? 0)}</p></div>
          <div className="rounded-xl bg-white/[0.04] p-3"><p className="text-xs text-white/40">Oversubscription</p><p className="font-mono text-lg font-semibold">{(data?.stats.oversubscriptionPct ?? 0).toFixed(1)}%</p></div>
        </div>
        <div className="mt-4 rounded-xl bg-white/[0.04] p-4">
          <p className="flex items-center gap-2 text-sm text-white/70"><DollarSign className="h-4 w-4 text-gold" /><span className="mr-1">Total raised</span><span className="font-mono font-semibold text-gold">{formatNaira(data?.stats.raisedNgn ?? 0)}</span></p>
        </div>
      </div>
      <div className="glass-card p-5">
        <h3 className="font-display font-semibold">Last 30 days</h3>
        {!data?.daily?.length ? (
          <p className="mt-4 text-sm text-white/40">No activity in the last 30 days.</p>
        ) : (
          <div className="mt-4 flex h-40 items-end gap-1.5">
            {data.daily.map((d) => (
              <div key={d.label} className="group flex flex-1 flex-col items-center gap-1" title={`${d.label}: ₦${d.raisedNgn.toLocaleString()}`}>
                <div className="w-full rounded-t bg-gold-gradient/70 transition-all hover:bg-gold-gradient" style={{ height: `${Math.max(4, (d.raisedNgn / maxDaily) * 100)}%` }} />
                <span className="text-[10px] text-white/30">{d.label.split(" ")[1]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EditDialog({ id, ipo, onClose }: { id: string; ipo: Ipo; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useIpoQuery();
  const [form, setForm] = useState<Record<string, string>>({
    name: ipo.name,
    issuer: ipo.issuer,
    tagline: ipo.tagline,
    overview: ipo.overview,
    pricePerShare: String(ipo.pricePerShare),
    totalShares: String(ipo.totalShares),
    minimumShares: String(ipo.minimumShares),
    maximumShares: ipo.maximumShares ? String(ipo.maximumShares) : "",
    greenshoePct: String(ipo.greenshoePct),
    feePct: String(ipo.feePct),
    openDate: ipo.openDate ? ipo.openDate.slice(0, 16) : "",
    closeDate: ipo.closeDate ? ipo.closeDate.slice(0, 16) : "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await patch(`/admin/ipo/${id}`, {
        name: form.name,
        issuer: form.issuer,
        tagline: form.tagline,
        overview: form.overview,
        pricePerShare: Number(form.pricePerShare),
        totalShares: Number(form.totalShares),
        minimumShares: Number(form.minimumShares),
        maximumShares: form.maximumShares ? Number(form.maximumShares) : null,
        greenshoePct: Number(form.greenshoePct),
        feePct: Number(form.feePct),
        openDate: form.openDate ? new Date(form.openDate).toISOString() : null,
        closeDate: form.closeDate ? new Date(form.closeDate).toISOString() : null,
      });
      toast({ title: "IPO updated", variant: "success" });
      onClose();
      window.location.reload();
    } catch (e) {
      toast({ title: "Update failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit {ipo.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Name</Label><Input className="mt-1" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Issuer</Label><Input className="mt-1" value={form.issuer} onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))} /></div>
          </div>
          <div><Label>Tagline</Label><Input className="mt-1" value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} /></div>
          <div><Label>Overview</Label><Textarea className="mt-1" rows={4} value={form.overview} onChange={(e) => setForm((f) => ({ ...f, overview: e.target.value }))} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Price per share (NGN)</Label><Input className="mt-1" type="number" value={form.pricePerShare} onChange={(e) => setForm((f) => ({ ...f, pricePerShare: e.target.value }))} /></div>
            <div><Label>Total shares</Label><Input className="mt-1" type="number" value={form.totalShares} onChange={(e) => setForm((f) => ({ ...f, totalShares: e.target.value }))} /></div>
            <div><Label>Minimum shares</Label><Input className="mt-1" type="number" value={form.minimumShares} onChange={(e) => setForm((f) => ({ ...f, minimumShares: e.target.value }))} /></div>
            <div><Label>Maximum shares (optional)</Label><Input className="mt-1" type="number" value={form.maximumShares} onChange={(e) => setForm((f) => ({ ...f, maximumShares: e.target.value }))} /></div>
            <div><Label>Greenshoe %</Label><Input className="mt-1" type="number" value={form.greenshoePct} onChange={(e) => setForm((f) => ({ ...f, greenshoePct: e.target.value }))} /></div>
            <div><Label>Fee %</Label><Input className="mt-1" type="number" value={form.feePct} onChange={(e) => setForm((f) => ({ ...f, feePct: e.target.value }))} /></div>
            <div><Label>Opens</Label><Input className="mt-1" type="datetime-local" value={form.openDate} onChange={(e) => setForm((f) => ({ ...f, openDate: e.target.value }))} /></div>
            <div><Label>Closes</Label><Input className="mt-1" type="datetime-local" value={form.closeDate} onChange={(e) => setForm((f) => ({ ...f, closeDate: e.target.value }))} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="gold" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}