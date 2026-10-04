# Developer Guide

## Prerequisites
- Node.js 18+ (tested on v24), npm 10+
- A Supabase project (free tier) for the Demo target, **or** zero external dependencies for the Production target
- Python 3 (optional, for running `server/test_integration.py`)

## Environment Variables

Both `client/` and `business/` read environment variables at startup/build time from their respective `.env` files.

| Variable | Target | Purpose |
|---|---|---|
| `VITE_BACKEND` | both | Explicitly set adapter: `'supabase'` or `'rest'` |
| `VITE_SUPABASE_URL` | demo | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | demo | Supabase anon/public API key |
| `VITE_API_URL` | production | Base URL of the Node.js Express server (e.g. `http://localhost:5000` or `https://api.yourdomain.com`) |
| `VITE_OPERATOR_USER` | demo | Fallback operator username for demo login gate (default: `admin`) |
| `VITE_OPERATOR_PASS` | demo | Fallback operator password for demo login gate (default: `antarpool2026`) |
| `JWT_SECRET` | server (env) | Cryptographic secret for signing operator JWT tokens |
| `OPERATOR_USER` | server (env) | Operator username checked during `POST /api/business/login` |
| `OPERATOR_PASS` | server (env) | Operator password checked during `POST /api/business/login` |

Templates:
- Demo (Supabase): [`deploy/env_templates/demo.env.example`](../deploy/env_templates/demo.env.example)
- Production (Express REST): [`deploy/env_templates/production.env.example`](../deploy/env_templates/production.env.example)

## Setup & Running

### Running the Production Target (Express + REST Server)
1. Start the server (runs on port 5000 with local SQLite database):
   ```bash
   cd server && npm install && npm run dev
   ```
2. In separate terminals, start the passenger and operator apps (they will automatically detect and connect to port 5000):
   ```bash
   cd client && npm install && npm run dev      # http://localhost:5173
   cd business && npm install && npm run dev    # http://localhost:5174
   ```
   *(Windows shortcut: double-click `start_all.bat` to launch all three concurrently).*

### Running the Demo Target (Supabase Serverless)
1. Create a Supabase project and execute [`deploy/supabase_schema.sql`](../deploy/supabase_schema.sql) in the SQL Editor.
2. In `client/.env` and `business/.env`, set:
   ```env
   VITE_BACKEND=supabase
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Run `npm run dev` in `client/` and `business/`.

## Monorepo Scripts & Testing

The root [`package.json`](../package.json) coordinates all subpackages via npm workspaces:

| Command | Purpose |
|---|---|
| `npm test` | Runs the automated contract and concurrency test suite (`tests/contract.test.js`) |
| `npm run build` | Builds production bundles for both client and business apps |
| `npm run lint` | Runs `oxlint` across both client and business apps |
| `deploy\check_ready.bat` | Verification script that compiles both apps before deployment |
| `python server/test_integration.py` | Python REST integration test script |

## Architecture & Code Conventions
- **Language:** UI user-facing strings are in Indonesian; internal variables, comments, and schemas are in English.
- **Currency & Dates:** Integer IDR for money (formatted with `formatIDR()`); `YYYY-MM-DD` string for travel dates; `HH:MM` for departure times.
- **Unified Adapter Contracts:** Any new method added to `client/src/api.js` or `business/src/api.js` must be implemented in both `supabaseAdapter.js` and `restAdapter.js`.
- **Error Handling:** Adapter functions throw descriptive `Error(message)` instances on failure.
- **Database Concurrency:** All operations that write to bookings and seats on the server must be wrapped in `withTransaction(async () => { ... })` to preserve concurrency guarantees.
