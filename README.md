# Trailhead — Outdoor Gear App

Recommends outdoor gear by **review quality** and scans **multiple retailers for the best price**. Built with Next.js (App Router) and modern, strict TypeScript.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run typecheck  # tsc --noEmit, strict mode
npm test           # unit tests for the recommendation + price engines
npm run build      # production build
```

## How it works

The app is built around two pure, framework-free engines and one swappable data layer.

### 1. Recommendation engine — `src/domain/recommend.ts`

Sorting by raw average rating is misleading: a product with a single 5★ review
would beat one with 4.7★ across 2,000 reviews. Instead we use a **Bayesian
average** that pulls low-volume products toward a global prior until they earn
enough reviews to prove themselves (the same idea behind IMDb's Top 250). Score
= adjusted rating + a small bonus for how far the best price sits below MSRP.
Tuning knobs live in `DEFAULT_OPTIONS`.

### 2. Price scanner — `src/domain/prices.ts`

For each product it compares every offer by **landed cost** (item + shipping),
ignores out-of-stock offers when choosing the winner, and reports savings vs.
both the priciest seller and MSRP.

### 3. Data layer — `src/data/`

Everything depends on the `DataSource` interface (`src/data/source.ts`), never on
a concrete source. Today `getDataSource()` returns `MockDataSource` (seed data in
`src/data/mock/seed.ts`). To go live, implement `DataSource` against a real
source and switch on an env var in `src/data/index.ts` — **no other code changes**.

## Project structure

```
src/
  app/                     Next.js App Router (UI + JSON API)
    page.tsx               Home: ranked recommendations with category filter
    product/[id]/page.tsx  Product detail: price-comparison table + reviews
    api/                   GET /api/recommendations, GET /api/products/:id
  domain/                  Pure engines + types (unit-tested)
  data/                    DataSource interface, factory, mock adapter
  lib/                     Formatting + UI helpers
```

## Going live with real data

Implement `DataSource` for a real provider. Good options:

- **Amazon Product Advertising API** — prices + review counts (requires an
  affiliate account). Also enables affiliate revenue on the "Buy" links.
- **Retailer affiliate feeds / APIs** — REI, Backcountry, Best Buy, etc.
- **A scraping service** — flexible but fragile; isolate it behind the adapter so
  the rest of the app never knows.

Each adapter just maps the provider's response into the `Product` / `PriceOffer`
/ `ReviewSummary` shapes in `src/domain/types.ts`.
