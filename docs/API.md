# Polychain Capital REST API

Base URL: `http://localhost:4000/api` (dev). All JSON. Protected endpoints require the `nv_access` httpOnly cookie set by login/register (or a `Bearer <token>` header). A 401 on a protected route can be recovered by hitting `POST /auth/refresh`.

Error shape: `{ "error": string }`, or `{ "error": "Validation failed", "details": [{ "path", "message" }] }`.

## Auth

| Method | Path                  | Auth  | Body | Notes |
|--------|-----------------------|-------|------|-------|
| POST   | `/auth/register`      | –     | `email, username, password, confirmPassword, referralCode?` | Creates account + verification email, sets cookies |
| POST   | `/auth/login`         | –     | `identifier` (email or username), `password` | Sets `nv_access` + `nv_refresh` cookies |
| POST   | `/auth/refresh`       | cookie| – | Rotates refresh token, returns fresh access cookie |
| POST   | `/auth/logout`        | ✓     | – | Revokes refresh token, clears cookies |
| GET    | `/auth/me`            | ✓     | – | Current user (sanitized) |
| POST   | `/auth/verify-email`  | –     | `token` | Verify email |
| POST   | `/auth/resend-verification` | – | `email` | Resend verification email |
| POST   | `/auth/forgot-password` | –   | `email` | Sends reset link |
| POST   | `/auth/reset-password` | –    | `token, password, confirmPassword` | Resets password |
| POST   | `/auth/change-password`| ✓    | `currentPassword, newPassword, confirmPassword` | |

## Public

| Method | Path               | Notes |
|--------|--------------------|-------|
| GET    | `/public/home`     | Active plans, totals, recent deposits/withdrawals, banners, site settings |
| GET    | `/public/plans`    | Active investment plans |
| POST   | `/public/newsletter` | `{ email }` |
| POST   | `/public/contact`  | `{ name, email, subject, message }` — creates a ticket for a (possibly guest) user |

## User (auth required)

| Method | Path                         | Body | Notes |
|--------|------------------------------|------|-------|
| GET    | `/user/dashboard`            | –    | Balances, active investments, recent transactions, notifications, plans |
| GET    | `/user/transactions`         | –    | Paginated transaction history |
| GET    | `/user/notifications`        | –    | Unread + recent notifications |
| POST   | `/user/notifications/read`   | –    | Mark all read |
| GET    | `/user/activities`           | –    | Recent activity feed |
| PATCH  | `/user/profile`              | `firstName, lastName, phone, country` | |
| GET    | `/user/tickets`              | –    | User's tickets |
| POST   | `/user/tickets`              | `subject, category, priority, message` | Create ticket |
| POST   | `/user/tickets/:id/reply`    | `{ message }` | Reply to own ticket |
| POST   | `/user/kyc`                  | `{ type, documentUrl }` | Submit KYC doc |
| POST   | `/user/wallets`              | `{ currency, address, label? }` | Add a payout wallet |
| DELETE | `/user/wallets/:id`          | –    | Remove payout wallet |
| PATCH  | `/user/preferences`          | `{ ... }` | Notification preferences (stored in SiteSetting) |

## Wallet

| Method | Path                 | Body | Notes |
|--------|----------------------|------|-------|
| GET    | `/wallet/summary`    | –    | Balances + deposit addresses |
| POST   | `/wallet/deposit`    | `{ amount, currency, txHash? }` | Creates pending deposit, returns wallet address + QR payload |
| POST   | `/wallet/withdraw`   | `{ amount, currency, address }` | 2% fee (min $1), min $10, debits profit balance first |
| GET    | `/wallet/history`    | –    | Deposit + withdrawal history |

## Investments

| Method | Path                  | Body | Notes |
|--------|-----------------------|------|-------|
| GET    | `/investments`        | –    | User investments (triggers profit accrual) |
| POST   | `/investments`        | `{ planId, amount }` | Create investment, debits wallet balance |
| GET    | `/investments/calculator` | – | Plans for the calculator |
| GET    | `/investments/:id`    | –    | Single investment + plan |

Profit accrual (`accrueProfits`) runs on reads for the requesting user: accrued days are credited to `profitBalance`, and matured plans auto-complete and pay the final profit.

## Referrals

| Method | Path                 | Notes |
|--------|----------------------|-------|
| GET    | `/referrals`         | Referral stats, code, invited users, commissions |
| POST   | `/referrals/notify-invite` | `{ email }` — send an invite to a friend |

## Payments (auth required unless marked otherwise)

| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | `/payments/paystack/initialize` | `{ amount }` | Creates a Paystack checkout for the requested USD wallet credit; returns `authorizationUrl` |
| POST | `/payments/paystack/verify` | `{ reference }` | Verifies the Paystack transaction server-side and credits the wallet exactly once |
| POST | `/payments/paystack/webhook` | – | Public Paystack `charge.success` webhook; SHA-512 signature verified |
| POST | `/payments/mpesa/stk-push` | `{ amount, phone }` | Starts a Daraja M-Pesa STK Push; amount is requested USD wallet credit |
| POST | `/payments/mpesa/callback` | – | Public Daraja callback; credits a matching successful STK payment exactly once |
| GET | `/payments/history` | – | User payment-provider history |

`amount` is a requested USD wallet credit. The provider charge is calculated using the admin-managed `paystackUsdRate` (NGN/USD) or `mpesaUsdRate` (KES/USD) setting; the applied native amount, rate, and credited USD amount are retained with the payment record.

## Admin (requireAuth + requireAdmin)

| Method | Path                        | Notes |
|--------|-----------------------------|-------|
| GET    | `/admin/dashboard`          | Global stats + 30-day volume chart |
| GET    | `/admin/users`              | `?page&perPage&status&search` |
| GET    | `/admin/users/:id`          | User detail with relations |
| PATCH  | `/admin/users/:id`          | `{ status, kycStatus, role, walletBalance, profitBalance }` |
| GET    | `/admin/deposits`           | `?page&perPage&status&search` |
| POST   | `/admin/deposits/:id/review`| `{ action: APPROVE\|REJECT, note? }` |
| GET    | `/admin/withdrawals`        | `?page&perPage&status&search` |
| POST   | `/admin/withdrawals/:id/review` | `{ action, note? }` |
| GET    | `/admin/investments`        | `?page&perPage&status` |
| GET    | `/admin/plans`              | All plans |
| POST   | `/admin/plans`              | `{ name, description, minAmount, maxAmount, dailyReturn, durationDays, totalReturn, features[], popular?, active?, icon?, color?, sortOrder? }` |
| PATCH  | `/admin/plans/:id`          | Partial plan update |
| DELETE | `/admin/plans/:id`          | Delete plan |
| GET    | `/admin/tickets`            | `?page&perPage&status` |
| GET    | `/admin/tickets/:id`        | Ticket with message thread |
| POST   | `/admin/tickets/:id/reply`  | `{ message }` |
| POST   | `/admin/tickets/:id/status` | `{ status: OPEN\|PENDING\|RESOLVED\|CLOSED }` |
| GET    | `/admin/referrals`          | Top referrers + referral links |
| GET    | `/admin/banners`            | List banners |
| POST   | `/admin/banners`            | `{ title, subtitle?, imageUrl?, link?, active?, sortOrder? }` |
| PATCH  | `/admin/banners/:id`        | Partial update |
| DELETE | `/admin/banners/:id`        | Delete banner |
| GET    | `/admin/settings`           | Key/value settings map (excludes `prefs:`/`subscriber:`) |
| PATCH  | `/admin/settings`           | `{ key: value, ... }` upserts each entry |
| GET    | `/admin/reports`            | `?days=30` — summary + deposits/withdrawals/investments/users/commissions |
| GET    | `/admin/audit-logs`         | `?page&perPage&search` |

All admin mutations write to `AuditLog` (action, admin, entity, IP).

## Auth details

- Access token: JWT, expires `JWT_EXPIRES_IN` (default `7d`), cookie `nv_access` (httpOnly, sameSite=lax).
- Refresh token: random 48-byte string stored in DB (rotation + revocation), cookie `nv_refresh`, 30 days.
- Passwords hashed with bcrypt (cost 12).
- Suspended accounts cannot authenticate or access protected routes.
