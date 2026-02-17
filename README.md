# Easy Earn

Easy Earn is a modern **Get Paid To** website built with Next.js, Prisma, and PostgreSQL (Vercel-ready).

## Included Features

- Full auth system: signup, signin, signout, secure cookie sessions, password hashing.
- Protected app pages: `dashboard`, `earn`, `store`, `levels`, `referrals`, `settings`.
- Main logged-in dashboard with:
  - USD wallet and lifetime stats
  - level system (`+1 level` per `$5` lifetime earned, starts at level `0`)
  - level rewards claiming + Level-Up Case opening (claim keys, then open case)
  - VIP at level `10` and VIP+ at level `25`
  - transaction history
  - live activity feed (polling API)
  - side popup chat visible on all signed-in pages
- New-user incentive:
  - instant `$1.00` sign-up bonus credited at registration
- Earn page with fully functioning claim/cooldown tasks (offerwalls can be added later).
- Store/withdrawal system:
  - branded payout catalog (PayPal + major gift cards)
  - fixed amount picks per brand (most: `$5/$10/$25/$50/$100`)
  - currency display selector for `US/USD`, `AUS/AUD`, `UK/GBP` with live FX fallback
  - admin-managed workflow: `PENDING -> APPROVED -> SENT` or `CANCELED`
  - admins can attach gift card `CODE` on send, users can open redemption details to view code
  - email notification sent on processed withdrawal when Resend is configured
- Referral system:
  - unique referral code/link for each user
  - active referral tracking (withdrawal in last 14 days)
  - 5% referrer bonus on every completed referral withdrawal
  - CS2-style case opening unlock at 10 active referrals
  - 24-hour cooldown per case opening
  - fixed odds:
    - `$0.10` = 30%
    - `$0.25` = 30%
    - `$0.50` = 27%
    - `$1.00` = 8%
    - `$2.50` = 4%
    - `$5.00` = 0.8%
    - `$10.00` = 0.2%
- Promo codes:
  - redeem promo code from referrals page at any level
  - VIP (level 10+) users can create funded promo codes
  - creator can set audience, max uses, and minimum level requirement
- Chat rules:
  - chat is viewable by all signed-in users from a right-side popup
  - typing unlocks at level `1`
  - 5-second cooldown per message
  - anonymous mode support (`Hidden` name + hidden chat profile stats)
- Complaint system:
  - users can submit complaints from dashboard
  - admins can resolve/reopen complaints in real time
- Admin portal:
  - dedicated admin login (`/admin/signin`)
  - live offers completed feed
  - live withdrawal management
  - VIP+ (level 25+) withdrawal priority queue
  - user moderation (activate, mute, terminate)
- Settings:
  - update display name
  - toggle anonymous chat profile
  - email verification flow
  - change password
  - permanent account deletion

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- Prisma 6 + PostgreSQL
- bcryptjs + server-side validation with zod

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Ensure env vars exist in `.env` (copy from `.env.example`):

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
DEFAULT_ADMIN_EMAIL="admin@example.com"
DEFAULT_ADMIN_PASSWORD="change-this-before-production"
DEFAULT_ADMIN_NAME="Easy Earn Admin"
DEFAULT_ADMIN_REFERRAL_CODE="EASY"
RESEND_API_KEY="re_xxx"
RESEND_FROM="Easy Earn <no-reply@yourdomain.com>"
```

3. Create/update database schema:

```bash
npm run prisma:push
```

4. Start dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Vercel Deployment (Required Setup)

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Add environment variables in Vercel Project Settings:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_APP_URL`
- `DEFAULT_ADMIN_EMAIL`
- `DEFAULT_ADMIN_PASSWORD`
- `DEFAULT_ADMIN_NAME`
- `DEFAULT_ADMIN_REFERRAL_CODE`
- `RESEND_API_KEY`
- `RESEND_FROM`

4. Deploy.

`vercel.json` is included and runs `npm run vercel-build`, which executes:

- `prisma generate`
- `prisma migrate deploy`
- `next build`

This ensures your hosted PostgreSQL schema is synced during deployment.

## Admin Access

- Admin login page: `http://localhost:3000/admin/signin`
- Default admin credentials are read from `.env` (`DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`)
- If `DEFAULT_ADMIN_EMAIL` or `DEFAULT_ADMIN_PASSWORD` is empty, no default admin account is auto-created.

## Useful Commands

```bash
npm run lint
npm run build
npm run prisma:generate
npm run prisma:push
npm run prisma:studio
```

## Offerwall Integration Later

When you add offerwalls, point their callbacks/claim actions into the same wallet transaction flow used in `/api/earn` so levels, balance, and withdrawal eligibility remain consistent.
