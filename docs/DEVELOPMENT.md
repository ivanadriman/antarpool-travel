# Developer Guide

## Prerequisites
- Node.js 18+ (tested on 24), npm 10+
- A Supabase project (free tier) for Supabase mode, **or** nothing extra for legacy mode
- Python 3 (only for the legacy integration script)

## Environment variables

Both `client/` and `business/` read Vite env vars from a local `.env` (git-ignored; create it yourself).

| Variable | App | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | both | Supabase project URL. With the anon key, enables Supabase mode |
| `VITE_SUPABASE_ANON_KEY` | both | Supabase anon/public key |
| `VITE_OPERATOR_USER` | business | Operator username (default `admin`) |
| `VITE_OPERATOR_PASS` | business | Operator password (default `antarpool2026`) |
| `VITE_API_URL` | both | Base URL of legacy Express server; empty = same origin (dev proxy to `:5000`) |

Template: `deploy/env_templates/supabase.env.example`. The `backend.env.example`, `client.env.example`, `business.env.example` templates are for the abandoned Render/Zeabur legacy deployment.

> [!WARNING]
> `VITE_*` values are embedded in the public JS bundle. `VITE_OPERATOR_PASS` is therefore **visible to anyone** — see [SECURITY.md](SECURITY.md).

## Setup & run

### Supabase mode
1. Create a Supabase project, run [`deploy/supabase_schema.sql`](../deploy/supabase_schema.sql) in the SQL editor (creates tables, enables realtime, RLS policies, seeds Surabaya/Malang data).
2. Create `client/.env` and `business/.env` with the two Supabase vars.
3. ```bash
   cd client   && npm install && npm run dev   # http://localhost:5173
   cd business && npm install && npm run dev   # http://localhost:5174
   ```
   The schema script is **not idempotent** for policies/publication (`CREATE POLICY` / `ALTER PUBLICATION ... ADD TABLE` fail on re-run). To reset: drop the tables, then re-run.

### Legacy mode (no Supabase vars set)
```bash
cd server && npm install && npm run dev        # :5000, creates/seeds travel.db
cd client && npm install && npm run dev        # proxies /api -> :5000
cd business && npm install && npm run dev
```
`start_all.bat` (Windows) launches all three. Delete `server/travel.db` to reseed. Note that `db.js` seed data and `test_integration.py` are inconsistent (see ROADMAP).

## Scripts
| Where | Command | Notes |
|---|---|---|
| client / business | `npm run dev` / `build` / `preview` | Vite |
| client / business | `npm run lint` | oxlint |
| `deploy/check_ready.bat` | | Builds both apps; run before pushing |
| `server/` | `npm start` / `npm run dev` | Legacy API |

There is **no automated test suite** for the frontends.

## Conventions
- UI language is **Indonesian**; code/identifiers are English. Keep user-facing strings in Indonesian.
- Money: integer IDR; format with `formatIDR()`. Dates: `YYYY-MM-DD` strings (`travel_date`), times `HH:MM` strings (`departure_time`). No timezone handling – local wall-clock.
- `is_active` columns are integers `0/1`, not booleans.
- `seat_numbers` is JSONB (an array); legacy SQLite stores a JSON string – the data layer handles both (`typeof === 'string' → JSON.parse`).
- Every `api.js` function must keep the dual-mode shape (Supabase branch + fetch fallback) and return the same flattened fields (`origin_name`, `destination_city`, `departure_time`, …) that the UI expects.
- `utils.js`, `supabase.js` are duplicated between apps; keep them in sync (or extract a shared package).

## Common tasks
- **Add a column:** update `deploy/supabase_schema.sql`, write an `ALTER TABLE` migration for existing projects (none exist yet), update `api.js` in both modes, `server/src/db.js` if legacy matters, and [DATABASE.md](DATABASE.md).
- **Add an operator tab:** add to the tab list in `business/src/App.jsx`, add API function in `business/src/api.js`, subscribe to realtime if it must stay live.
- **Change booking rules:** `client/src/api.js → createBooking` (and `server.js POST /api/bookings` for legacy).
- **New vehicle template:** use the Armada tab (no code needed).

## Known gotchas
- `Promise.all` per-schedule queries in `getSchedules`/`getBusinessSchedules` cause N+1 requests.
- Many `catch (e) {}` blocks silently swallow errors (timeline writes, JSON parsing).
- `business/src/App.jsx` is ~62 KB / single file; consider splitting per tab before adding features.
- Operator filter semantic: `cancelBooking` sets both `payment_status` and `booking_status` to `CANCELLED`.
- The status label "Live WebSocket Aktif" is shown in Supabase mode too (it is Supabase Realtime).
