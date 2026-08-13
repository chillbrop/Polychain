# Polychain Capital

Premium cryptocurrency investment platform — dark, glassmorphic UI with a gold accent. Next.js 15 frontend, Express REST API, PostgreSQL with Prisma, JWT + cookie auth, and a full admin console.

## Features

- **Investor dashboard** — real-time balances (wallet + profit), active investments, profit accrual chart, activity feed
- **Investment plans** — daily profit accrual (server-side cron-style on-read), plan selection, returns calculator
- **Wallet** — deposit request with live wallet addresses + QR, withdrawals with 2% fee (min $10), full history
- **Referrals** — unique code + link, 10% commission tracking
- **Support tickets** — user ↔ admin threaded chat
- **KYC & profile** — verification status, saved wallets, notification preferences
- **Admin console** — analytics, user management, deposit/withdrawal review, plan CRUD, investments, tickets, reports, site settings (key/value), audit log
- **Landing page** — hero, live activity ticker, calculator, testimonials, FAQ, newsletter, contact

## Tech Stack

| Layer    | Stack |
|----------|-------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion, Recharts, React Query, Zustand, Radix UI |
| Backend  | Express 4, TypeScript (`tsx`) |
| DB       | PostgreSQL, Prisma ORM |
| Auth     | JWT access + refresh, httpOnly cookies, bcrypt, refresh-token rotation |

## Quick Start

Requirements: Node 18+, PostgreSQL 14+ running locally.

```bash
npm install

# 1. Configure environment
cp .env.example .env
# edit DATABASE_URL, JWT secrets, ADMIN_EMAIL/PASSWORD, and wallet addresses

# 2. Create the schema and seed demo data
npm run db:setup

# 3. Run both processes (two terminals)
npm run dev:server   # Express API on :4000 (auto-seeds plans + admin on boot)
npm run dev          # Next.js app on :3000
```

Open http://localhost:3000

### Demo accounts (from seed)

| Role  | Login                          | Password        |
|-------|--------------------------------|-----------------|
| Admin | `admin@polychaincapital.example`       | `Admin@12345`   |
| User  | `grace@example.com` / `liam@example.com` | `Password123!` |

The admin account is also created automatically by the server bootstrap if it doesn't exist.

## Scripts

| Command             | Description                              |
|---------------------|------------------------------------------|
| `npm run dev`       | Next.js dev server (:3000)               |
| `npm run dev:server`| Express API with watch (:4000)           |
| `npm run build`     | Prisma generate + production Next build  |
| `npm run start`     | Serve production build                   |
| `npm run server`    | Run Express API once                     |
| `npm run db:setup`  | `prisma db push` + seed demo data        |
| `npm run prisma:migrate` | Create a new Prisma migration        |
| `npm run lint`      | Next lint                               |

## Configuration (.env)

Key variables — see `.env.example` for all.

| Variable                 | Purpose                                  |
|--------------------------|------------------------------------------|
| `DATABASE_URL`           | PostgreSQL connection string             |
| `JWT_SECRET`             | Access-token signing secret              |
| `JWT_REFRESH_SECRET`     | Refresh-token signing secret             |
| `NEXT_PUBLIC_API_URL`    | API base URL used by the browser         |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Bootstrapped admin credentials    |
| `USDT_TRC20_ADDRESS`, `BTC_ADDRESS`, `ETH_ADDRESS` | Deposit collection wallets |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Email transport (leave blank to log emails in dev) |
| `PAYSTACK_SECRET_KEY` | Paystack server secret key (test or live) |
| `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` | Safaricom Daraja app credentials |
| `MPESA_SHORT_CODE` / `MPESA_PASSKEY` / `MPESA_CALLBACK_URL` | M-Pesa STK Push configuration |

### Payments

The wallet supports Paystack checkout and Safaricom Daraja M-Pesa STK Push deposits. Set the provider credentials in `.env`, then set `paystackUsdRate` and `mpesaUsdRate` in **Admin → Site Settings**. Rates are native currency units per USD wallet credit and are stored on every payment, so later rate changes do not alter historical credits.

Paystack deposits are credited only after the server verifies the provider transaction. M-Pesa deposits are credited only when Daraja sends a successful STK callback to the configured public HTTPS callback URL.

After deploying this update, apply the new `Payment` table with `npx prisma db push` (or create and deploy a Prisma migration in your production workflow).

In development, `next.config.mjs` rewrites `/api/:path*` to `http://localhost:4000`, so the frontend talks to the API through the same origin.

## Project Structure

```
├── prisma/
│   ├── schema.prisma          # Data model
│   └── seed.ts                # Demo data
├── server/
│   ├── index.ts               # Express bootstrap
│   ├── config.ts              # env config
│   ├── middleware/            # auth (JWT/cookie), error handling
│   ├── routes/                # auth, user, wallet, investments, referrals, public, admin
│   └── utils/                 # jwt, mail, helpers, bootstrap seeding
└── src/
    ├── app/                   # Next.js app router
    │   ├── (auth)/            # login, register, verify, password reset
    │   ├── (dashboard)/       # dashboard, investments, wallet, referrals, profile, support
    │   ├── (admin)/           # admin console (all pages)
    │   └── page.tsx           # landing page
    ├── components/            # UI kit + shared + landing + dashboard + admin
    ├── lib/                   # api-client, utils
    └── stores/                # auth (zustand), ui state
```

## Deployment

1. Build the frontend: `npm run build`
2. Serve the API: `npm run server` (or `start:prod` with Node strip-types)
3. Serve the app: `npm run start`
4. Set `COOKIE_SECURE=true` and `NEXT_PUBLIC_API_URL` to your API origin behind HTTPS.

See `docs/API.md` for the full REST API reference and `Dockerfile` / `docker-compose.yml` for a containerized setup.

## License

Proprietary.
# Polychain
