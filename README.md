# DealsBotTracker

A personal deal-finding and price-tracking application. It continuously
scans configured sources for products, calculates a realistic **market
price** from multiple independent listings, and only surfaces something as
a "deal" when the current price is genuinely below that market price — not
just because a retailer slapped a "SALE" label on it.

Built as a single self-hosted app: Next.js (frontend + API), PostgreSQL
(data), Redis + BullMQ (background scanner), and a standalone worker
process. Mobile-first, installable as a PWA, dark/light mode, with email,
Telegram, browser push, and WhatsApp notifications.

Ships in **Demo Mode**: a realistic South African product catalogue with
simulated multi-source pricing, so the whole app — dashboard, deals, price
history, notifications, watchlist — works immediately, before you connect
any real retailer.

---

## 1. Installation (Docker — recommended)

You need [Docker](https://docs.docker.com/get-docker/) installed. Nothing
else.

```bash
# 1. Get the project
git clone <this-repo-url> dealsbottracker
cd dealsbottracker

# 2. Configure it
cp .env.example .env
# Open .env in any text editor and set:
#   - AUTH_SECRET   (run: openssl rand -base64 32)
#   - ADMIN_EMAIL / ADMIN_PASSWORD (this is YOUR login for the app)
# Everything else is optional — see "Environment variables" below.

# 3. Start everything (Postgres, Redis, app, background worker)
docker compose up -d

# 4. Open the app
# Visit http://localhost:3000 and sign in with the ADMIN_EMAIL/ADMIN_PASSWORD
# you set in .env. Demo deals are populated automatically on first boot.
```

That's it — no manual database setup, no separate services to configure.
`docker compose up -d` builds the app image and the worker image, starts
Postgres and Redis with healthchecks, runs database migrations, seeds demo
data, and starts the web app and background scanner.

To stop: `docker compose down` (add `-v` to also delete the database).

### Installing without Docker

If you'd rather run it directly (useful for development):

```bash
npm install
cp .env.example .env   # point DATABASE_URL/REDIS_URL at your own Postgres/Redis
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm run build && npm run start   # the web app, on :3000
npm run worker:start             # the background scanner, in a second terminal
```

---

## 2. Environment variables

Everything lives in `.env` (copy `.env.example` to get started). Nothing is
ever hard-coded in source — secrets and API keys are always read from
environment variables.

| Variable | Required? | What it's for | Where to get it |
|---|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string | Provided automatically by `docker-compose.yml` |
| `REDIS_URL` | Yes | Redis connection for the background scanner queue | Provided automatically by `docker-compose.yml` |
| `AUTH_SECRET` | Yes | Signs your login session cookie | Generate with `openssl rand -base64 32` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Yes | Your login credentials for the app | You choose these |
| `APP_URL` | Yes | Base URL used in notification links | `http://localhost:3000`, or your real domain |
| `DEMO_MODE` | No | `true` seeds realistic sample data on first boot | — |
| `SMTP_HOST`/`PORT`/`USER`/`PASSWORD`/`FROM`, `NOTIFY_EMAIL_TO` | No | Email notifications | Any SMTP provider (Gmail App Password, SendGrid, Mailgun, etc.) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | No | Telegram notifications | Message **@BotFather** on Telegram to create a bot and get a token; message your bot once, then visit `https://api.telegram.org/bot<token>/getUpdates` to find your chat id |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | No | Browser push notifications | Generate with `npx web-push generate-vapid-keys` |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `TWILIO_WHATSAPP_TO` | No | WhatsApp notifications (via Twilio's official WhatsApp Business API) | [twilio.com](https://www.twilio.com) — enable WhatsApp on a Twilio number |
| `ANTHROPIC_API_KEY` | No | AI-generated one-sentence deal explanations (falls back to a rule-based sentence if unset) | [console.anthropic.com](https://console.anthropic.com) |
| `EXAMPLE_RETAILER_API_KEY` | No | Template for adding one real retailer's official API | The retailer's developer program |

**Every notification channel is optional and independently toggleable** —
leave a channel's variables blank and it simply won't send until you fill
them in (from Settings you can also enable/disable each channel).

---

## 3. What's actually running

| Component | Technology | Role |
|---|---|---|
| Web app | Next.js 14 (App Router, TypeScript) | Dashboard, deal pages, settings, REST API |
| Database | PostgreSQL 16 + Prisma ORM | Products, listings, price history, deals, watchlist, logs |
| Queue / scheduler | Redis + BullMQ | Runs scans on a per-source repeating schedule |
| Worker | Node.js (`worker/index.ts`) | Executes scans, computes market prices, detects deals, sends notifications |
| Frontend | React, Tailwind CSS, Recharts | Mobile-first UI, installable PWA, dark/light mode |

Both the worker's scheduled scans and the "Scan now" button in Settings run
the **exact same pipeline** (`src/lib/pipeline/scanSource.ts`), so behaviour
is identical either way.

---

## 4. How the market price is calculated

This is the core of the app (`src/lib/engines/marketPrice.ts`). Given
prices from multiple independent listings of the *same exact product*:

1. Drop invalid (zero/negative) prices.
2. Remove statistical outliers using the IQR method, so one absurdly cheap
   or expensive listing can't distort the result.
3. Compute the median and a 10%-trimmed mean of what's left.
4. Compute a **reliability-weighted median**, weighting each source by a
   configurable trust score (0–1) — a source you've marked more reliable
   pulls the market price toward its number more strongly.
5. Blend the weighted median (60%) with the trimmed mean (40%) into the
   final market price.

The price being evaluated as a candidate deal is **never** included in this
calculation — market price always comes from independent sources.

## 5. How product matching works

`src/lib/engines/productMatching.ts` parses each listing's raw title into
concrete attributes — storage, RAM, colour, condition, connectivity
(Wi-Fi/Cellular), SIM type (single/dual) — and builds a canonical key from
all of them. Two listings are only ever treated as "the same product" when
**every** attribute matches exactly. A 256GB phone is never compared
against a 512GB one; new is never compared against refurbished. Missing
attributes lower a numeric "match confidence" score instead of being
silently ignored, and low-confidence matches are excluded from deal
detection entirely (`src/lib/engines/falseDealFilters.ts`).

## 6. How the deal score works

`src/lib/engines/dealScoring.ts` produces a deterministic 0–100 score from:
percentage below market (largest single factor), number of independent
sources backing the market price, seller rating, proximity to the all-time
low, condition/warranty, and stock availability. Tiers (configurable in
Settings): **Exceptional ≥ 90, Excellent ≥ 75, Good ≥ 60**, anything lower
is never notified (but still visible if you search for it). An optional AI
step (`src/lib/engines/aiExplain.ts`) can turn the same numbers into one
plain-English sentence for the deal detail page — it only *describes* a
decision the deterministic engine already made; it never decides whether
something is a deal.

## 7. False-deal protection & deduplication

Before anything becomes a "Deal", `checkFalseDeal()` verifies the price is
genuinely below market, in stock, and confidently matched — and flags (or
blocks) membership-only pricing, coupon-dependent pricing, financing
pricing, bundles, implausible >75% "discounts" (almost always pricing
errors), and vague/misleading titles. When the same product is found on
multiple sources, they're grouped under **one** Deal (the cheapest in-stock
listing is the headline price), with every other seller still listed on the
deal detail page — so you get one notification, not five.

---

## 8. Using the app

- **Dashboard** — today's best deal, new deals, exceptional-deal count,
  scanner status, next scan time.
- **Deals** — every active deal, filterable by category/brand/tier/
  condition, sortable by score/discount/savings/price/recency.
- **Deal detail** — price history chart, market-price sources, why it
  qualifies, other sellers, original listing link.
- **Search** — across deals, products, sources, and your watchlist.
- **Watchlist** — add a product, brand, category, or keyword, and set an
  OR-combined condition (price below X, OR ≥Y% below market, OR score ≥Z).
  A match notifies you even if it wouldn't otherwise clear the global
  thresholds.
- **Settings** — deal-score thresholds, minimum discount %, notification
  channels (with a "send test notification" button), currency/country,
  per-source scan frequency and enable/disable, sign out.
- **System status** (private) — database health, per-source scan status,
  recent scan runs, products/prices/deals/notifications tracked, recent
  errors.

### Adding a watchlist entry

Settings aren't required — go to **Watchlist → + Add**, choose a type
(Product/Brand/Category/Keyword), type your query, and optionally set a
price limit, minimum discount %, and/or minimum deal score. Any one
condition being met is enough to notify you.

### Adding a new retailer/data source

Every source is a self-contained adapter implementing the same interface
(`src/lib/sources/types.ts`) — the scanner, matching, pricing, and
notification pipeline never need to change. To add a real one:

1. Copy `src/lib/sources/exampleApiAdapter.ts` to a new file.
2. Implement `fetchListings()` against that retailer/marketplace's
   **official, permitted** API, feed, or affiliate program — this project
   deliberately does not build scrapers that bypass CAPTCHAs, logins, or
   anti-bot protections.
3. Add any API key it needs to `.env` (never hard-code it).
4. Register the adapter in `src/lib/sources/registry.ts`.
5. It immediately shows up in Settings → Data Sources with its own
   enable/disable toggle and scan frequency.

---

## 9. Backing up and updating

**Back up the database:**
```bash
docker compose exec postgres pg_dump -U dealbot dealsbottracker > backup.sql
```

**Restore:**
```bash
docker compose exec -T postgres psql -U dealbot dealsbottracker < backup.sql
```

**Update to a newer version of the app:**
```bash
git pull
docker compose up -d --build   # rebuilds images; migrations run automatically on start
```

---

## 10. Troubleshooting

| Problem | Fix |
|---|---|
| Can't log in | Check `ADMIN_EMAIL`/`ADMIN_PASSWORD` in `.env`, then restart (`docker compose restart app`). The account is created automatically the first time you log in with those values. |
| No deals showing | Set `DEMO_MODE=true` and restart, or press "Scan now" in Settings → Data Sources. |
| Notifications not sending | Settings → Notification Channels → "Send test notification" shows the exact error (e.g. missing SMTP credentials). |
| `docker compose up` fails on ports 5432/6379/3000 | Something else on your machine is already using those ports — stop it, or edit the `ports:` section of `docker-compose.yml`. |
| Worker not scanning | Check `docker compose logs worker` — it needs Redis and Postgres both reachable, which the compose file's healthchecks enforce at startup. |
| Prices look stale | Each source has its own scan frequency (Settings → Data Sources); high-priority sources default to every 10 minutes, others every 30. |

---

## 11. Testing

```bash
npm test          # unit tests for every scoring/matching/dedup engine,
                   # plus an integration test that runs the real scan
                   # pipeline against Postgres
npm run typecheck
npm run build
```

---

## 12. Project structure

```
prisma/            Database schema, migrations, demo-mode seed script
src/app/            Next.js pages + REST API routes
src/components/     UI components (deal cards, charts, nav, filters)
src/lib/engines/    Market price, product matching, deal scoring, dedup,
                    false-deal filters, watchlist/alert-rule matching
src/lib/sources/    Source adapter interface, demo adapter, adapter registry
src/lib/notifications/  Email, Telegram, Web Push, WhatsApp + dispatcher
src/lib/pipeline/   The scan pipeline shared by the worker and "Scan now"
worker/             Standalone background worker (BullMQ scheduler)
tests/              Vitest unit + integration tests
docker/             Dockerfiles for the app and the worker
```

---

## 13. What's not included (and why)

- **Real retailer scrapers.** Only official/permitted integrations are
  built (see `exampleApiAdapter.ts`) — this project does not bypass
  CAPTCHAs, logins, or anti-bot protection. Demo Mode fills the gap until
  you plug in real, permitted sources.
- **Android/iOS native apps.** The app is a fully installable PWA (works
  offline-shell, has an app icon, push notifications) which covers "use it
  like a mobile app" without a separate native build pipeline. A future
  wrapper (Capacitor/Expo) would sit on top of the same API without
  changes to the backend.
