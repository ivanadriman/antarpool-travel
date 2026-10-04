# Roadmap & Gap Analysis

Assessment of what is missing or unfinished, based on a code review (not an absolute "everything a booking platform could have"). Priorities: **P0** blocks real use, **P1** needed for a solid v1, **P2** nice to have.

## P0 – Required before real customers
- [ ] **Real authentication & RLS** for operators and passengers ([SECURITY.md](SECURITY.md)).
- [ ] **Atomic booking** (RPC/transaction + unique seat constraint) to prevent double booking.
- [ ] **Server-side price calculation** and booking code generation with retry.
- [ ] **Remove default credentials** (`admin`/`antarpool2026`) from code.

## P1 – Functional gaps
- [ ] **Pooling-spot management UI** – spots can only be changed in SQL; operators cannot add cities/routes. (Also no armada-less schedule validation.)
- [ ] **Sync armada edits to schedules in Supabase mode** – `saveArmada` updates only `armadas`; schedules keep a stale `total_seats`/`vehicle_layout` copy (legacy server did sync). Better: drop denormalization and join armada at read time.
- [ ] **Per-date capacity/exceptions** – schedules are daily templates; no way to cancel a single day, add holiday pricing, or close sales cut-off minutes before departure. Passengers can currently book trips whose departure time already passed today.
- [ ] **Payment** – only pay-at-pool. Consider QRIS/e-wallet (Midtrans/Xendit), payment expiry, refunds; `payment_method` is hardcoded.
- [ ] **Notifications** – WhatsApp/SMS/email confirmations and reminders (customer email/phone are collected but unused).
- [ ] **Ticket verification** – QR is rendered, but no scanner/check-in-by-code view for operators.
- [ ] **Passenger identity per seat** – only the booker's name is stored; no per-passenger names/IDs or manifest print for drivers.
- [ ] **Driver/manifest view** – per-trip passenger list, printable.
- [ ] **Cancellation policy** – free cancel at any time before check-in; no cutoff, fees, or reason.
- [ ] **Analytics** – date ranges, per-vehicle occupancy, cancelled-order stats; move to SQL aggregation (currently loads all bookings client-side).
- [ ] **Pagination** for orders and timeline (currently unbounded).
- [ ] **Multi-operator / roles** (admin vs. dispatcher vs. driver) and multi-tenant support if several travel companies will use it.

## P1 – Engineering gaps
- [ ] **Tests**: no frontend tests; `server/test_integration.py` is stale (assumes Senayan/Dipatiukur pools). Add unit tests for `api.js` (mock supabase), seat-map logic, plus an e2e smoke test (Playwright).
- [ ] **Decide on legacy server**: retire `server/` or keep it feature-equal; logic is currently duplicated.
- [ ] **Migrations**: adopt Supabase CLI migrations; make schema script idempotent (policies, publication).
- [ ] **CI**: GitHub Action running lint + build for both apps.
- [ ] **Shared code**: `utils.js`/`supabase.js` copied in two apps; extract an npm workspace package.
- [ ] **Error handling & observability**: replace empty `catch {}`, add user-facing error toasts, error reporting (Sentry), standardize throw vs `{success}` returns.
- [ ] **Refactor `business/src/App.jsx`** (62 KB) into per-tab components and hooks; `client/App.jsx` likewise.
- [ ] **Performance**: N+1 queries in schedule loading → single query with aggregate/RPC or a view `schedule_availability`.
- [ ] **TypeScript** or JSDoc types for the data shapes.
- [ ] **Root docs cleanup**: rewrite or delete outdated root `README.md`/`DOCUMENTATION.md`, replace Vite-template READMEs in `client/` and `business/`, update `deploy/env_templates`.
- [ ] Commit `.env.example` files inside `client/` and `business/`.

## P2 – Product polish
- [ ] i18n (English) alongside Indonesian; accessibility audit (seat map keyboard/ARIA).
- [ ] PWA manifest + offline shell for passengers; installable operator app.
- [ ] Timezone handling (Asia/Jakarta explicit; WIB/WITA/WIT for other cities).
- [ ] Promo codes, round-trip booking, seat-class pricing, loyalty.
- [ ] Rental (car hire) module — the project folder is named "Travel and Rental" but only travel pooling exists.
- [ ] Rating/feedback after trip; driver assignment and trip tracking.
- [ ] Backups/export (CSV of bookings, revenue reports).

## Suggested order of work
1. Supabase Auth + RLS + booking RPC (P0).
2. Pool & route management, armada→schedule sync, departure cutoff (P1 functional).
3. CI + tests + refactor of the two large `App.jsx` files.
4. Notifications and online payment.
5. Docs cleanup (point root README to `docs/`).
