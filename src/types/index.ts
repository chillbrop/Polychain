export type Role = "USER" | "ADMIN" | "SUPER_ADMIN" | "IPO_MANAGER" | "COMPLIANCE_OFFICER" | "FINANCE_OFFICER" | "CUSTOMER_SUPPORT";
export type AccountStatus = "ACTIVE" | "SUSPENDED" | "VERIFYING";
export type KycStatus = "PENDING" | "APPROVED" | "REJECTED" | "NOT_SUBMITTED";
export type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "REFERRAL_COMMISSION" | "BONUS" | "INVESTMENT" | "PROFIT" | "IPO_SUBSCRIPTION" | "IPO_REFUND";
export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED" | "PROCESSING" | "REJECTED";
export type InvestmentStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";
export type WithdrawalStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "REJECTED" | "CANCELLED";
export type TicketStatus = "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
export type Currency = "USDT_TRC20" | "BTC" | "ETH" | "BANK";

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  country?: string | null;
  avatarUrl?: string | null;
  role: Role;
  status: AccountStatus;
  kycStatus: KycStatus;
  twoFactor: boolean;
  emailVerified: boolean;
  referralCode: string;
  referredById?: string | null;
  walletBalance: number;
  profitBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalInvested: number;
  totalReferralEarnings: number;
  wallets?: Wallet[];
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  id: string;
  currency: Currency;
  address: string;
  label?: string | null;
  isDefault: boolean;
}

export interface InvestmentPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  dailyReturn: number;
  durationDays: number;
  totalReturn: number;
  features: string[];
  popular: boolean;
  active: boolean;
  icon: string;
  color: string;
  sortOrder: number;
}

export interface Investment {
  id: string;
  userId: string;
  planId: string;
  plan: InvestmentPlan;
  amount: number;
  dailyReturn: number;
  durationDays: number;
  totalReturn: number;
  status: InvestmentStatus;
  profitEarned: number;
  startDate: string;
  endDate: string;
  lastAccruedAt?: string | null;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  fee: number;
  status: TransactionStatus;
  description: string;
  reference: string;
  currency: Currency;
  balanceAfter?: number | null;
  createdAt: string;
}

export interface DepositRequest {
  id: string;
  amount: number;
  currency: Currency;
  txHash?: string | null;
  network?: string | null;
  status: TransactionStatus;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Withdrawal {
  id: string;
  amount: number;
  fee: number;
  currency: Currency;
  address: string;
  status: WithdrawalStatus;
  note?: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface Activity {
  id: string;
  action: string;
  metadata?: unknown;
  createdAt: string;
}

export interface Ticket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  messages?: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  senderId?: string | null;
  senderRole: Role;
  message: string;
  createdAt: string;
}

export interface HomeData {
  plans: InvestmentPlan[];
  stats: { totalUsers: number; totalDeposited: number; totalWithdrawn: number };
  recentDeposits: Array<{ user: { username: string }; amount: number; updatedAt: string; currency: string }>;
  recentWithdrawals: Array<{ user: { username: string }; amount: number; updatedAt: string; currency: string }>;
  banners: Array<{ id: string; title: string; subtitle?: string | null; link?: string | null }>;
  settings: Record<string, string>;
}

export interface DashboardData {
  user: User;
  activeInvestments: number;
  activeCount: number;
  totalEarnings: number;
  recentTransactions: Transaction[];
  notifications: Notification[];
  referralCount: number;
  activities: Activity[];
  plans: InvestmentPlan[];
}

export interface Paginated<T> {
  data?: never;
  items?: T[];
}

export type IpoStatus =
  | "DRAFT" | "UPCOMING" | "OPEN" | "CLOSING_SOON" | "CLOSED"
  | "ALLOCATION_PENDING" | "ALLOCATION_COMPLETED" | "LISTED" | "COMPLETED";

export type IpoApplicationStatus =
  | "SUBMITTED" | "PAYMENT_PENDING" | "PAID" | "UNDER_REVIEW" | "SUBMITTED_TO_ISSUER"
  | "ALLOCATED" | "PARTIALLY_ALLOCATED" | "NOT_ALLOCATED"
  | "REFUND_PENDING" | "REFUNDED" | "COMPLETED";

export type IpoRefundStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type IpoDocumentType = "PROSPECTUS" | "FINANCIALS" | "UPLOAD" | "NOTICE" | "RESULT";

export interface IpoKeyFact {
  label: string;
  value: string | number;
}

export interface Ipo {
  id: string;
  slug: string;
  name: string;
  issuer: string;
  ticker?: string | null;
  exchange?: string | null;
  logoUrl?: string | null;
  tagline: string;
  overview: string;
  keyFacts: IpoKeyFact[];
  riskDisclaimers?: string;
  pricePerShare: number;
  totalShares: number;
  minimumShares: number;
  maximumShares?: number | null;
  greenshoePct: number;
  feePct: number;
  currency: string;
  openDate?: string | null;
  closeDate?: string | null;
  allotmentDate?: string | null;
  listingDate?: string | null;
  status: IpoStatus;
  published: boolean;
  sandbox: boolean;
  applicationsCount?: number;
  paidNgn?: number;
  paidShares?: number;
  demandShares?: number;
  subscriptionRatePct?: number;
  createdAt: string;
  updatedAt: string;
}

export interface IpoDocument {
  id: string;
  ipoId: string;
  title: string;
  type: IpoDocumentType;
  url: string;
  description?: string | null;
  published: boolean;
  publishedAt?: string | null;
  createdAt: string;
}

export interface IpoRefund {
  id: string;
  applicationId: string;
  reference: string;
  amountNgn: number;
  amountUsd: number;
  exchangeRate: number;
  reason: string;
  status: IpoRefundStatus;
  note?: string | null;
  processedAt?: string | null;
  createdAt: string;
  user?: { username: string; email: string };
  ipo?: { name: string };
  application?: { reference: string; shares: number; allocationShares?: number | null };
}

export interface IpoApplication {
  id: string;
  ipoId: string;
  reference: string;
  shares: number;
  pricePerShare: number;
  amountNgn: number;
  feeNgn: number;
  exchangeRate: number;
  amountUsd: number;
  status: IpoApplicationStatus;
  sandbox: boolean;
  allocationShares?: number | null;
  allocationRate?: number | null;
  allocatedAmountNgn?: number | null;
  transactionRef?: string | null;
  submittedAt: string;
  paidAt?: string | null;
  allocatedAt?: string | null;
  refundedAt?: string | null;
  createdAt: string;
  ipo?: Ipo;
  user?: { username: string; email: string };
  refund?: IpoRefund | null;
}

export interface IpoInvestorProfile {
  id: string;
  userId: string;
  fullName: string;
  dob?: string | null;
  gender?: string | null;
  nationality: string;
  residencyCountry: string;
  city?: string | null;
  address?: string | null;
  bankName: string;
  accountName?: string | null;
  cscsChn?: string | null;
  idType?: string | null;
  idDocumentUrl?: string | null;
  bvnLast4?: string | null;
  accountLast4?: string | null;
  status: KycStatus;
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { username: string; email: string; createdAt: string };
}
