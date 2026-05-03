# CCT Claims Intelligence Platform

This repo now contains:

- The existing React frontend under `src/`
- A standalone backend API under `server/`
- A Supabase/Postgres schema under `supabase/schema.sql`

## Backend API

Run the API locally:

```bash
npm run api:dev
```

Production-style start:

```bash
npm run api:start
```

Typecheck the backend:

```bash
npm run typecheck:server
```

### Endpoints

`GET /api/search?mode=imei&query=VALUE`

- Checks the local persisted store first
- Returns cached data if `last_fetched_at` is under 24 hours old
- Otherwise calls the mock insurer APIs, normalizes claims, deduplicates them, persists them, and returns the unified payload

Example response:

```json
{
  "device": {
    "imei": "356789012345678",
    "device_name": "Samsung Galaxy S23"
  },
  "claims": [
    {
      "id": "uuid",
      "date_of_loss": "2026-02-11T00:00:00.000Z",
      "claim_amount": 12500,
      "outcome": "APPROVED",
      "reason": "Screen and frame damaged after a vehicle break-in.",
      "insurer": "Alpha Insurance",
      "source": "alpha-api"
    }
  ]
}
```

`GET /api/claims`

- Returns all claims joined with device metadata for the device database view

### Implementation notes

- Mock external providers live in `server/src/integrations/insurerClients.ts`
- Normalization and outcome/currency cleanup live in `server/src/services/normalizationService.ts`
- Route handling lives in `server/src/routes/router.ts`
- Persistence currently uses a JSON-backed repository at `server/data/cct-db.json` so the backend works immediately in this repo
- The production database schema for Supabase/Postgres is in `supabase/schema.sql`

### Environment variables

- `PORT` defaults to `8787`
- `PORT_SEARCH_LIMIT` defaults to `20`
- `DB_PROVIDER` defaults to `file`
- `CACHE_TTL_HOURS` defaults to `24`
- `CCT_DB_FILE` defaults to `server/data/cct-db.json`
- `SUPABASE_URL` or `VITE_SUPABASE_URL` can point to your Supabase project
- `SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY` can hold your publishable key
- `DATABASE_URL` can hold your direct Postgres connection string
- `RATE_LIMIT_WINDOW_MS` defaults to `60000`
- `RATE_LIMIT_MAX_REQUESTS` defaults to `60`

Example local setup:

```bash
cp .env.example .env
```

The backend currently still persists to the JSON file store by default. The Supabase/Postgres variables are now available in config so you can wire the live database connection without committing credentials into source.
