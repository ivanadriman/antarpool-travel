# Architecture Decision Records (ADRs)

This document records the architectural and design decisions made for **AntarPool Travel**, explaining the context, alternatives considered, chosen approach, and consequences.

---

## ADR 001: Dual Operational Target Split (Demo vs. Production)

### Status
**Accepted** (2026-10-04)

### Context
AntarPool began as a full-stack Node.js + Express + SQLite monolith. Later, a direct-client Supabase migration was drafted to allow free, zero-config hosting on Vercel without maintaining a running VPS or paying for backend servers. However, deploying directly to Supabase with client-side table queries created significant operational risks:
- Open Row-Level Security (RLS) allowed client-side updates to booking statuses and prices.
- Double-booking race conditions could occur without server-side mutexes or atomic database functions.
- The user expressed a desire to keep the custom Express server for actual production hosting, while keeping the Supabase build for lightweight demonstration and Vercel prototype preview.

### Decision
Support **two first-class operational targets** rather than retiring either stack:
1. **Demo Target (`supabase`):** Designed for zero-cost hosting on Vercel + Supabase free tier. Optimized for visual evaluation and interactive click-throughs.
2. **Production Target (`rest`):** Designed for real operations with custom Express server, SQLite with Write-Ahead Logging (WAL), atomic reservation transactions, server-calculated pricing, and JWT operator authentication.

### Consequences
- **Pros:** Preserves zero-friction preview on Vercel while providing an uncompromised path for real commercial deployment.
- **Cons:** Any new feature (e.g. adding a new table or booking parameter) must be maintained in both adapters. Mitigated by strict contract testing (`tests/contract.test.js`).

---

## ADR 002: Dynamic Adapter Pattern for Client & Business Apps

### Status
**Accepted** (2026-10-04)

### Context
Maintaining two separate source trees for the frontend applications (`client-supabase/`, `client-rest/`) would result in massive code duplication, divergent styling, and maintenance headaches.

### Decision
Implement an **Adapter Pattern** with uniform data contracts:
- `client/src/adapters/supabaseAdapter.js` & `client/src/adapters/restAdapter.js`
- `business/src/adapters/supabaseAdapter.js` & `business/src/adapters/restAdapter.js`
- `client/src/api.js` and `business/src/api.js` act as dynamic dispatchers driven by the environment variable `VITE_BACKEND`:
  - When `VITE_BACKEND=rest`, REST adapters communicate with the Express server.
  - When `VITE_BACKEND=supabase` (or when Supabase URL/key are present and `VITE_BACKEND` is unspecified), Supabase adapters communicate directly with Supabase.

### Consequences
- **Pros:** A single codebase for passenger and business dashboards; zero UI duplication; seamless environment switching at build time.
- **Cons:** Adapters must strictly adhere to the same method signatures and return shapes (`{ success, data, error }`).

---

## ADR 003: Atomic Double-Booking Prevention via `booking_seats` Table and SQLite Mutex

### Status
**Accepted** (2026-10-04)

### Context
In travel pooling, seats are stored as arrays or comma-delimited strings (e.g. `["1A", "1B"]`). Without transactional isolation, two passengers submitting simultaneous requests for the same seat would both succeed because query-level reads check availability before either write commits. Furthermore, SQLite in default rollback journal mode can encounter database lock conflicts under concurrent async requests in Node.js.

### Decision
1. **Dedicated Seat Mapping Table (`booking_seats`):**
   - Columns: `id`, `booking_id`, `schedule_id`, `travel_date`, `seat_number`, `status`, `created_at`.
   - Partial Unique Index:
     ```sql
     CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_seat
     ON booking_seats (schedule_id, travel_date, seat_number)
     WHERE status != 'CANCELLED';
     ```
2. **SQLite Write-Ahead Logging (WAL) & Mutex (`withTransaction`):**
   - Configured `PRAGMA journal_mode = WAL;` and `PRAGMA busy_timeout = 10000;`.
   - Wrapped critical write operations inside an `AsyncLock` mutex in `server/src/db.js` so async transactions execute serially and atomically without `SQLITE_BUSY` or overlapping `BEGIN IMMEDIATE` errors.
3. **Seat Release upon Cancellation:**
   - When a booking is cancelled, linked rows in `booking_seats` are updated to `status = 'CANCELLED'`, immediately freeing the seat for subsequent reservations while preserving audit history.

### Consequences
- **Pros:** Concurrency-tested double booking prevention: 10 simultaneous requests for the same seat result in exactly 1 success (201 Created) and 9 rejections (409 Conflict).
- **Cons:** Requires SQLite on persistent disk in production (cannot run on ephemeral serverless containers without external storage).

---

## ADR 004: Stateless HMAC-SHA256 JWT Authentication for Operators

### Status
**Accepted** (2026-10-04)

### Context
The prototype stored operator credentials and state client-side in `localStorage` (`antarpool_operator_authed = true`). Any user could open DevTools or bypass the login modal and access administrative endpoints (creating schedules, deleting armadas, modifying orders).

### Decision
1. Implemented standard HMAC-SHA256 token generation and verification using Node.js built-in `crypto` (zero extra dependencies).
2. Added `POST /api/business/login` endpoint issuing 12-hour signed JWT tokens upon valid password verification against `OPERATOR_PASSWORD` (defaults to `antarpool2026`, configurable via environment variable).
3. Created `requireOperator` Express middleware protecting all `/api/business/*` and `/api/armadas*` write operations.
4. Integrated `LoginGate.jsx` and `business/src/adapters/restAdapter.js` to store and attach the Bearer token to all administrative requests.

### Consequences
- **Pros:** Secures all write operations on the production server without requiring external auth infrastructure.
- **Cons:** Token revocation prior to expiration requires a secret rotation or token blacklist table if granular revocation is needed in the future.

---

## ADR 005: Denormalized Fleet Layout Synchronization Across Linked Schedules

### Status
**Accepted** (2026-10-04)

### Context
The `schedules` table stores `vehicle_layout`, `vehicle_model`, and `total_seats` directly for rapid query performance. However, when an operator edited an armada layout in the fleet management tab, schedules previously created with that armada retained stale seat layouts, causing visual mismatches in passenger seat pickers.

### Decision
Both the Express REST backend (`server/src/server.js`) and the Supabase Business Adapter (`business/src/adapters/supabaseAdapter.js`) now cascade updates: whenever an armada is updated via `saveArmada`, all schedules matching that armada's ID or name are automatically updated to match the new `vehicle_layout`, `vehicle_model`, and `total_seats`.

### Consequences
- **Pros:** Passengers immediately see updated seat layouts without requiring manual schedule deletion and re-creation.
- **Cons:** Cascade writes update multiple rows; mitigated by indexing on `schedules(armada_id)` and infrequent fleet edits.
