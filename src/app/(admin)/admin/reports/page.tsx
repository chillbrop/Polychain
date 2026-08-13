"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowUpFromLine, TrendingUp, Users, Coins } from "lucide-react";
import { get } from "@/lib/api-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ReportData {
  summary: { totalDeposits: number; totalWithdrawals: number; totalInvested: number; totalCommissions: number; newUsers: number; days: number };
  deposits: Array<{ id: string; amount: number; status: string; createdAt: string; user: { username: string } }>;
  withdrawals: Array<{ id: string; amount: number; status: string; createdAt: string; user: { username: string } }>;
  investments: Array<{ id: string; amount: number; createdAt: string; user: { username: string }; plan: { name: string } }>;
  newUsers: Array<{ id: string; username: string; email: string; createdAt: string }>;
  commissions: Array<{ id: string; amount: number; createdAt: string }>;
}

export default function AdminReportsPage() {
  const [days, setDays] = useState("30");

  const { data, isLoading } = useQuery<ReportData>({
    queryKey: ["admin-reports", days],
    queryFn: () => get("/admin/reports", { days }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-white/40">Financial report for the last {days} days</p>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Deposits" value={isLoading ? "…" : formatCurrency(data?.summary.totalDeposits ?? 0)} icon={<ArrowDownToLine className="h-5 w-5" />} />
        <StatCard label="Withdrawals" value={isLoading ? "…" : formatCurrency(data?.summary.totalWithdrawals ?? 0)} icon={<ArrowUpFromLine className="h-5 w-5" />} color="emerald" />
        <StatCard label="Invested" value={isLoading ? "…" : formatCurrency(data?.summary.totalInvested ?? 0)} icon={<TrendingUp className="h-5 w-5" />} color="violet" />
        <StatCard label="Commissions" value={isLoading ? "…" : formatCurrency(data?.summary.totalCommissions ?? 0)} icon={<Coins className="h-5 w-5" />} color="sky" />
        <StatCard label="New Users" value={isLoading ? "…" : String(data?.summary.newUsers ?? 0)} icon={<Users className="h-5 w-5" />} />
      </div>

      <Tabs defaultValue="deposits">
        <TabsList>
          <TabsTrigger value="deposits">Deposits</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          <TabsTrigger value="investments">Investments</TabsTrigger>
          <TabsTrigger value="users">New Users</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
        </TabsList>

        <TabsContent value="deposits">
          <ReportTable
            columns={["User", "Amount", "Status", "Date"]}
            rows={data?.deposits.map((d) => [d.user.username, formatCurrency(d.amount), d.status, formatDate(d.createdAt)]) ?? []}
            loading={isLoading}
          />
        </TabsContent>
        <TabsContent value="withdrawals">
          <ReportTable
            columns={["User", "Amount", "Status", "Date"]}
            rows={data?.withdrawals.map((w) => [w.user.username, formatCurrency(w.amount), w.status, formatDate(w.createdAt)]) ?? []}
            loading={isLoading}
          />
        </TabsContent>
        <TabsContent value="investments">
          <ReportTable
            columns={["User", "Plan", "Amount", "Date"]}
            rows={data?.investments.map((i) => [i.user.username, i.plan.name, formatCurrency(i.amount), formatDate(i.createdAt)]) ?? []}
            loading={isLoading}
          />
        </TabsContent>
        <TabsContent value="users">
          <ReportTable
            columns={["Username", "Email", "Date"]}
            rows={data?.newUsers.map((u) => [u.username, u.email, formatDate(u.createdAt)]) ?? []}
            loading={isLoading}
          />
        </TabsContent>
        <TabsContent value="commissions">
          <ReportTable
            columns={["Amount", "Date"]}
            rows={data?.commissions.map((c) => [formatCurrency(c.amount), formatDate(c.createdAt)]) ?? []}
            loading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportTable({ columns, rows, loading }: { columns: string[]; rows: string[][]; loading: boolean }) {
  return (
    <div className="glass-card mt-4 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>{columns.map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {loading && Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>{columns.map((_, j) => <TableCell key={j}><div className="h-4 w-20 rounded bg-white/5 animate-pulse" /></TableCell>)}</TableRow>
          ))}
          {!loading && rows.length === 0 && <TableRow><TableCell colSpan={columns.length} className="py-12 text-center text-white/40">No records in this period</TableCell></TableRow>}
          {!loading && rows.map((row, i) => (
            <TableRow key={i}>{row.map((cell, j) => (
              <TableCell key={j} className={j === 1 && columns[j] !== "Date" ? "font-mono" : undefined}>{cell}</TableCell>
            ))}</TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
