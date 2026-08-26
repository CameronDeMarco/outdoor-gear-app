# Gear IQ — Outdoor Gear App

Recommends outdoor gear by **review quality** and scans **multiple retailers for the best price**.
Built with Next.js (App Router) and modern, strict TypeScript.

## 🔗 Try it live

### **https://geariq-853959061296.us-central1.run.app**

Deployed on **Google Cloud Run**. No setup — just open it and:

- Browse **ranked recommendations** (sorted by review quality, not raw stars).
- **Search** for any gear — "running shoes", "trekking poles" — even outside the fixed categories.
- Open a product to see a **multi-retailer price comparison** with direct buy links.
- **Create an account** to save products to your favorites.

## How it's deployed

The live app runs as a container on **Cloud Run**, backed by **Cloud SQL for PostgreSQL**, with
secrets in **Secret Manager** and the image built by **Cloud Build** into **Artifact Registry**.
Full deploy steps are in [Deployment](#deployment-google-cloud-run) below.

## Running it locally (optional)

You don't need any of this to use the app — it's live at the link above. But to run it yourself:

Requires **Node.js 18.18+** (20+ recommended) and npm.

```bash
npm install
npm run dev        # http://localhost:3000
```

**Browsing works out of the box** on mock seed data — no API keys or database required.

Two optional extras:

- **Live product data** — to pull real prices from Google Shopping via
  [SerpAPI](https://serpapi.com) (free tier: 100 searches/month), add to `.env.local`:
  ```bash
  DATA_SOURCE=serpapi
  SERPAPI_KEY=your_key_here
  ```
- **Accounts & favorites locally** — these features need a **PostgreSQL** database and an
  `AUTH_SECRET`. The live app uses Cloud SQL; to run them locally, point `DATABASE_URL` (in `.env`)
  at any Postgres — a local instance, or your Cloud SQL instance via the
  [Cloud SQL Auth Proxy](https://cloud.google.com/sql/docs/postgres/sql-proxy) — generate a secret
  with `npx auth secret`, then run `npx prisma migrate dev`.

Other scripts:

```bash
npm run typecheck  # tsc --noEmit, strict mode
npm test           # unit tests for the recommendation + price engines
npm run build      # production build
```

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
**Prisma/PostgreSQL** database. Favorites are auth-guarded API routes (`GET`/`POST`/`DELETE` at
`/api/favorites`) that store a snapshot of the product (name, image, price at save time), so the
favorites page renders with zero external API calls. Schema:
[`prisma/schema.prisma`](prisma/schema.prisma).

## Features

- **Ranked recommendations** by Bayesian-weighted review quality.
- **Free-text search** — find anything on Google Shopping, even outside the fixed categories.
- **Multi-retailer price comparison** with direct "Buy" links, sorted by landed cost.
- **Product images** on tiles and detail pages, with graceful placeholders.
- **Streaming UI** — server components with skeleton loading states so navigation feels instant.
- **User accounts & favorites** — email/password auth (Auth.js) with a Prisma/PostgreSQL database.

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
Dockerfile                 Production container image for Cloud Run
```

## Deployment (Google Cloud Run)

Prerequisites: a Google Cloud project with billing enabled and the `gcloud` CLI. Enable the APIs:

```bash
gcloud services enable run.googleapis.com sqladmin.googleapis.com secretmanager.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

1. **Provision Postgres** — create a Cloud SQL instance, database, and user:

   ```bash
   gcloud sql instances create geariq-db --database-version=POSTGRES_16 --edition=ENTERPRISE --tier=db-f1-micro --region=us-central1
   gcloud sql databases create geariq --instance=geariq-db
   gcloud sql users create geariq_user --instance=geariq-db --password='YOUR_DB_PASSWORD'
   ```

2. **Store secrets** in Secret Manager (`DATABASE_URL`, `AUTH_SECRET`, `SERPAPI_KEY`) and grant the
   Cloud Run runtime service account `roles/secretmanager.secretAccessor` on each. The
   `DATABASE_URL` uses the Cloud SQL socket form:
   `postgresql://geariq_user:PASSWORD@localhost/geariq?host=/cloudsql/PROJECT:REGION:INSTANCE`.

3. **Run migrations** against Cloud SQL via the
   [Cloud SQL Auth Proxy](https://cloud.google.com/sql/docs/postgres/sql-proxy):

   ```bash
   ./cloud-sql-proxy PROJECT:REGION:INSTANCE          # in one terminal
   DATABASE_URL="postgresql://geariq_user:PASSWORD@localhost:5432/geariq" npx prisma migrate deploy
   ```

4. **Build and deploy** (Cloud Build builds the `Dockerfile`, deploys to Cloud Run, and wires up the
   database + secrets):

   ```bash
   gcloud run deploy geariq --source . --region us-central1 --allow-unauthenticated --memory 1Gi \
     --add-cloudsql-instances PROJECT:REGION:INSTANCE \
     --set-secrets DATABASE_URL=DATABASE_URL:latest,AUTH_SECRET=AUTH_SECRET:latest,SERPAPI_KEY=SERPAPI_KEY:latest \
     --set-env-vars DATA_SOURCE=serpapi,AUTH_TRUST_HOST=true
   ```

The deploy prints the public service URL. `--add-cloudsql-instances` mounts the `/cloudsql/...`
socket that `DATABASE_URL` points at, and `--set-secrets` injects the Secret Manager values as
environment variables at runtime.

## Tech stack

Next.js 15 (App Router, React 19 server components) · TypeScript (strict) · **Auth.js** for
authentication · **Prisma** ORM with **PostgreSQL** · **SerpAPI** for live product data · deployed on
**Google Cloud Run** with **Cloud SQL** and **Secret Manager**. The recommendation and pricing logic
is hand-written and framework-agnostic.
