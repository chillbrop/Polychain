"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { get } from "@/lib/api-client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

interface AuditRow {
  id: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  createdAt: string;
  user: { username: string; email: string } | null;
}

const actionColors: Record<string, "success" | "warning" | "destructive" | "secondary" | "gold"> = {
  CREATE_USER: "success",
  UPDATE_USER: "warning",
  UPDATE_SETTINGS: "gold",
  CREATE_PLAN: "success",
  UPDATE_PLAN: "warning",
  DELETE_PLAN: "destructive",
  CREATE_BANNER: "success",
  UPDATE_BANNER: "warning",
  DELETE_BANNER: "destructive",
};

export default function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit", page, search],
    queryFn: () =>
      get<{ logs: AuditRow[]; total: number; totalPages: number }>("/admin/audit-logs", {
        page: String(page),
        perPage: "30",
        search: search || undefined,
      }),
  });

  const logs = data?.logs || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); setSearch(input); setPage(1); }}
        >
          <input
            className="input-dark sm:w-72"
            placeholder="Search by action…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button type="submit" variant="gold" size="icon" aria-label="Search logs"><Search className="h-4 w-4" /></Button>
        </form>
        <p className="text-sm text-white/40">{data?.total ?? 0} log entries</p>
      </div>

      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 4 }).map((_, j) => <TableCell key={j}><div className="h-4 w-24 rounded bg-white/5 animate-pulse" /></TableCell>)}</TableRow>
            ))}
            {!isLoading && logs.length === 0 && <TableRow><TableCell colSpan={4} className="py-12 text-center text-white/40">No audit entries found</TableCell></TableRow>}
            {!isLoading && logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell><Badge variant={actionColors[log.action] || "secondary"}>{log.action}</Badge></TableCell>
                <TableCell>
                  <p className="text-sm">{log.user?.username || "System"}</p>
                  <p className="text-xs text-white/40">{log.user?.email || "automated"}</p>
                </TableCell>
                <TableCell className="text-xs text-white/50">
                  {log.targetType}{log.targetId ? <span className="font-mono"> · {log.targetId.slice(0, 8)}</span> : null}
                </TableCell>
                <TableCell className="text-xs text-white/40">{formatDateTime(log.createdAt)}</TableCell>
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
