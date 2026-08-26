# Gear IQ — Outdoor Gear App

Recommends outdoor gear by **review quality** and scans **multiple retailers for the best price**.
Built with Next.js (App Router) and modern, strict TypeScript.

🔗 **Live demo:** https://gear-iq-app.vercel.app

## Getting started

Requires **Node.js 18.18+** (20+ recommended) and npm.

```bash
npm install
npm run dev        # http://localhost:3000
```

The app runs out of the box on **mock seed data** — no API keys required, so `npm run dev` just
works after install.

Other scripts:

```bash
npm run typecheck  # tsc --noEmit, strict mode
npm test           # unit tests for the recommendation + price engines
npm run build      # production build
npm start          # serve the production build
```

## Accounts & favorites (database setup)

The login/account and favorites features use a local **SQLite** database (via **Prisma**) and
**Auth.js**. Browsing works without this, but to enable accounts:

```bash
# 1. Create the local SQLite database and tables
npx prisma migrate dev

# 2. Generate a session-signing secret (writes AUTH_SECRET to .env.local)
npx auth secret
```

`DATABASE_URL="file:./dev.db"` is already set in `.env` (non-secret, committed); the database file
(`prisma/dev.db`) is gitignored. Then sign up at `/signup` and favorite any product.

## Running on live data (optional)

By default the app uses mock data. To pull real products and prices from Google Shopping via
[SerpAPI](https://serpapi.com) (free tier: 100 searches/month, instant signup):

```bash
cp .env.example .env.local
```

Then set in `.env.local`:

```bash
DATA_SOURCE=serpapi
SERPAPI_KEY=your_key_here
```

Restart the dev server. `.env.local` is gitignored — never commit real keys. If a live source fails
or hits its quota, the app automatically falls back to mock data instead of erroring.

See [`.env.example`](.env.example) for all supported modes (`mock`, `serpapi`, `rainforest`,
`avantlink`, `live`) and their keys.

## How it works

The app is built around two pure, framework-free engines and one swappable data layer.

### 1. Recommendation engine — `src/domain/recommend.ts`

Sorting by raw average rating is misleading: a product with a single 5★ review would beat one with
4.7★ across 2,000 reviews. Instead we use a **Bayesian average** that pulls low-volume products
toward a global prior until they earn enough reviews to prove themselves (the same idea behind
IMDb's Top 250). Score = adjusted rating + a small bonus for how far the best price sits below MSRP.
Tuning knobs live in `DEFAULT_OPTIONS`.

### 2. Price scanner — `src/domain/prices.ts`

For each product it compares every offer by **landed cost** (item + shipping), ignores out-of-stock
offers when choosing the winner, and reports savings vs. both the priciest seller and MSRP.

### 3. Data layer — `src/data/`

Everything depends on the `DataSource` interface (`src/data/source.ts`), never on a concrete source.
`getDataSource()` (`src/data/index.ts`) builds the active source from the `DATA_SOURCE` env var and
composes it with two wrappers, using the **decorator pattern**:

- **`CachingDataSource`** (`src/data/cache.ts`) — in-memory TTL cache, layered with Next.js's fetch
  cache to stay within free API limits.
- **`FallbackDataSource`** — if the live source throws (quota, network), it silently serves mock
  data so the app degrades gracefully instead of erroring.

Adapters implementing the interface: **mock** (seed data, default), **serpapi** (live Google
Shopping), plus **rainforest** (Amazon) and **avantlink** (REI/Backcountry/Sierra) which are built
but optional. Adding a source means implementing one interface — no other code changes.

### SerpAPI adapter — `src/data/serpapi/index.ts`

Uses two Google Shopping endpoints: a cheap `google_shopping` search for listings and free-text
search, and the richer `google_immersive_product` endpoint (called only on the detail page) for
per-seller prices and direct retailer links.

### Accounts & favorites — `src/auth.ts`, `src/app/api/favorites/`

Email/password authentication via **Auth.js** (JWT sessions, bcrypt-hashed passwords) backed by a
**Prisma** database. Favorites are auth-guarded API routes (`GET`/`POST`/`DELETE` at
`/api/favorites`) that store a snapshot of the product (name, image, price at save time), so the
favorites page renders with zero external API calls. Schema:
[`prisma/schema.prisma`](prisma/schema.prisma).

## Features

- **Ranked recommendations** by Bayesian-weighted review quality.
- **Free-text search** — find anything on Google Shopping, even outside the fixed categories.
- **Multi-retailer price comparison** with direct "Buy" links, sorted by landed cost.
- **Product images** on tiles and detail pages, with graceful placeholders.
- **Streaming UI** — server components with skeleton loading states so navigation feels instant.
- **User accounts & favorites** — email/password auth (Auth.js) with a Prisma/SQLite database; save products to your account.

## Project structure

```
src/
  app/                     Next.js App Router (UI + JSON API)
    page.tsx               Home: ranked recommendations, category filter, search
    product/[id]/page.tsx  Product detail: price-comparison table + reviews
    login/ signup/         Auth pages
    favorites/             "My favorites" page
    api/                   recommendations, products, auth, signup, favorites
  domain/                  Pure engines + types (unit-tested)
    types.ts               Core model: Product, PriceOffer, ReviewSummary
    recommend.ts           Bayesian ranking engine
    prices.ts              Best-landed-price scanner
  data/                    DataSource interface + implementations
    source.ts              The interface (the swappable seam)
    index.ts               Factory: builds the source from env vars
    cache.ts               TTL caching wrapper
    mock/                  Seed data (default, no keys)
    serpapi/               Live Google Shopping adapter
    rainforest/            Amazon adapter (optional)
    avantlink/             REI/Backcountry/Sierra adapter (optional)
    merged/                Merges multiple sources
  lib/                     Formatting, UI helpers, Prisma client, favorites queries
  components/              Client components (FavoriteButton, AuthNav, SignOutButton)
  auth.ts                  Auth.js config (Credentials provider, JWT sessions)
prisma/
  schema.prisma            Database schema (User, Favorite)
  migrations/              Version-controlled SQL migrations
```

## Deployment

Deployed on [Vercel](https://vercel.com). To run live data in production, set `DATA_SOURCE=serpapi`
and `SERPAPI_KEY` under **Project → Settings → Environment Variables**, then redeploy (env var
changes only take effect on a new deployment).

The accounts feature uses SQLite locally; for production, switch the Prisma datasource to
`postgresql`, point `DATABASE_URL` at a hosted Postgres (e.g. Vercel Postgres or Neon), set
`AUTH_SECRET`, and run `npx prisma migrate deploy`.

## Tech stack

Next.js 15 (App Router, React 19 server components) · TypeScript (strict) · SerpAPI for live data ·
**Auth.js** for authentication · **Prisma** ORM with SQLite (dev) / Postgres (prod) · deployed on
Vercel. The recommendation and pricing logic is hand-written and framework-agnostic.
