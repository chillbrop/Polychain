export type Role = "USER" | "ADMIN";
export type AccountStatus = "ACTIVE" | "SUSPENDED" | "VERIFYING";
export type KycStatus = "PENDING" | "APPROVED" | "REJECTED" | "NOT_SUBMITTED";
export type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "REFERRAL_COMMISSION" | "BONUS" | "INVESTMENT" | "PROFIT";
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
