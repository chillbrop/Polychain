import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, AlertTriangle, Ban, Loader2 } from "lucide-react";
import type { TransactionStatus, WithdrawalStatus, TicketStatus, InvestmentStatus, KycStatus, AccountStatus } from "@/types";

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "secondary" | "gold"; icon?: React.ReactNode }> = {
  COMPLETED: { label: "Completed", variant: "success", icon: <CheckCircle2 className="h-3 w-3" /> },
  APPROVED: { label: "Approved", variant: "success", icon: <CheckCircle2 className="h-3 w-3" /> },
  ACTIVE: { label: "Active", variant: "success", icon: <CheckCircle2 className="h-3 w-3" /> },
  PENDING: { label: "Pending", variant: "warning", icon: <Clock className="h-3 w-3" /> },
  PROCESSING: { label: "Processing", variant: "warning", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  REJECTED: { label: "Rejected", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  FAILED: { label: "Failed", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  CANCELLED: { label: "Cancelled", variant: "secondary", icon: <Ban className="h-3 w-3" /> },
  SUSPENDED: { label: "Suspended", variant: "destructive", icon: <Ban className="h-3 w-3" /> },
  OPEN: { label: "Open", variant: "gold", icon: <AlertTriangle className="h-3 w-3" /> },
  RESOLVED: { label: "Resolved", variant: "success", icon: <CheckCircle2 className="h-3 w-3" /> },
  CLOSED: { label: "Closed", variant: "secondary" },
  NOT_SUBMITTED: { label: "Not Submitted", variant: "secondary" },
  VERIFYING: { label: "Verifying", variant: "warning" },
  LOW: { label: "Low", variant: "secondary" },
  MEDIUM: { label: "Medium", variant: "warning" },
  HIGH: { label: "High", variant: "destructive" },
  URGENT: { label: "Urgent", variant: "destructive" },
  DRAFT: { label: "Draft", variant: "secondary" },
  UPCOMING: { label: "Upcoming", variant: "gold", icon: <Clock className="h-3 w-3" /> },
  CLOSING_SOON: { label: "Closing Soon", variant: "warning", icon: <Loader2 className="h-3 w-3" /> },
  ALLOCATION_PENDING: { label: "Allocation Pending", variant: "warning", icon: <Clock className="h-3 w-3" /> },
  ALLOCATION_COMPLETED: { label: "Allocation Completed", variant: "success", icon: <CheckCircle2 className="h-3 w-3" /> },
  LISTED: { label: "Listed", variant: "success", icon: <CheckCircle2 className="h-3 w-3" /> },
  SUBMITTED: { label: "Submitted", variant: "secondary" },
  PAYMENT_PENDING: { label: "Payment Pending", variant: "warning", icon: <Clock className="h-3 w-3" /> },
  PAID: { label: "Paid", variant: "success", icon: <CheckCircle2 className="h-3 w-3" /> },
  UNDER_REVIEW: { label: "Under Review", variant: "gold", icon: <Loader2 className="h-3 w-3" /> },
  SUBMITTED_TO_ISSUER: { label: "Submitted to Issuer", variant: "gold", icon: <AlertTriangle className="h-3 w-3" /> },
  ALLOCATED: { label: "Allocated", variant: "success", icon: <CheckCircle2 className="h-3 w-3" /> },
  PARTIALLY_ALLOCATED: { label: "Partially Allocated", variant: "warning", icon: <AlertTriangle className="h-3 w-3" /> },
  NOT_ALLOCATED: { label: "Not Allocated", variant: "secondary", icon: <Ban className="h-3 w-3" /> },
  REFUND_PENDING: { label: "Refund Pending", variant: "warning", icon: <Clock className="h-3 w-3" /> },
  REFUNDED: { label: "Refunded", variant: "secondary", icon: <Ban className="h-3 w-3" /> },
};

export function StatusBadge({
  status,
}: {
  status: TransactionStatus | WithdrawalStatus | TicketStatus | InvestmentStatus | KycStatus | AccountStatus | string;
}) {
  const config = statusConfig[status] || { label: status.replace(/_/g, " "), variant: "secondary" as const };
  return (
    <Badge variant={config.variant}>
      {config.icon}
      {config.label}
    </Badge>
  );
}
