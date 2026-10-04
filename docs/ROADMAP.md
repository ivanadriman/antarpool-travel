# Roadmap & Gap Analysis

Assessment of what is missing or unfinished, based on a code review and the architectural hardening refactor. Priorities: **P0** blocks real commercial operations, **P1** needed for a solid v1, **P2** nice to have.

---

## ✅ Completed Hardening (refactor/hardening)

The following core gaps were resolved in the hardening phase:
- [x] **Monorepo Workspaces & Shared Package:** Root `package.json` with npm workspaces (`client`, `business`, `server`, `shared`) and extracted `@antarpool/shared` package for IDR currency and Indonesian date formatters.
- [x] **Dynamic Adapter Pattern:** Uniform adapter architecture (`client/src/adapters/` and `business/src/adapters/`) allowing either Supabase (Demo target) or Express REST (Production target) selected via `VITE_BACKEND`.
- [x] **Atomic Double-Booking Prevention (REST):** Added `booking_seats` table with partial unique index `UNIQUE(schedule_id, travel_date, seat_number) WHERE status != 'CANCELLED'`, serial async lock mutex, and WAL mode in SQLite. Verified with a 10-parallel-request concurrency test (1 win, 9 rejected with 409).
- [x] **Server-Side Price Calculation & Codes (REST):** Server calculates total price directly from schedule data and generates collision-resistant booking codes (`AP-XXXXXX`).
- [x] **Operator Authentication & Route Protection (REST):** Stateless HMAC-SHA256 JWT tokens issued via `POST /api/business/login` and enforced by `requireOperator` middleware on all administrative endpoints.
- [x] **Armada Fleet Layout Synchronization:** Updating an armada automatically syncs layout, model, and seat count across all linked schedules in both Express and Supabase business adapters.
- [x] **Contract & Concurrency Test Suite:** Integrated Node.js test runner (`tests/contract.test.js`) testing schedule listings, booking validation, concurrency races, cancellation seat release, armada sync, and auth gates.
- [x] **Architectural Documentation Suite:** Created `docs/` containing `ARCHITECTURE.md`, `DEVELOPMENT.md`, `DATABASE.md`, `API_REFERENCE.md`, `SECURITY.md`, `DEPLOYMENT.md`, `TESTING.md`, `DECISIONS.md`, and `USER_GUIDE.md`.
- [x] **Client App Users Management (Pelanggan CRM):** Dedicated CRM tab in Business App with passenger search, auth method badges, KPI cards, VIP tagging, blacklist / no-show flags, operator notes, 1-click WhatsApp direct chat link, and booking history modal. Supported in both REST (SQLite) and Supabase adapters.

---

## 🔴 P0 – Required Before Real Commercial Customers

- [ ] **Passenger Real Verification (SMS/WhatsApp OTP):** Replace the simulated OTP modal (`AuthModal.jsx`) with a real provider (e.g. Twilio Verify, Fonnte, or Supabase Phone Auth) to verify passenger mobile numbers before ticket generation.
- [ ] **Payment Gateway Integration:** Integrate a modern Indonesian payment gateway (Midtrans or Xendit) for QRIS, Virtual Accounts (BCA, Mandiri, BRI), and e-Wallets (GoPay, OVO, ShopeePay) with automated payment confirmation webhooks.
- [ ] **Production Secret Management:** Ensure production deployments set non-default values for `OPERATOR_PASSWORD` and `JWT_SECRET` via environment variables or secret vaults.
- [ ] **Supabase RPC for Production Parity (If using Supabase in Production):** If deploying Supabase for real production instead of the Express REST server, implement a Postgres PL/pgSQL function (`create_booking_atomic`) to lock rows and prevent race conditions within Supabase transactions.

---

## 🟡 P1 – Functional Gaps

- [ ] **Pooling-Spot & Route Management UI:** Allow operators to dynamically add/edit city routes and pickup spots from the Business dashboard rather than editing database seed tables.
- [ ] **Per-Date Capacity & Schedule Overrides:** Add capability to cancel trips on specific dates (e.g., vehicle maintenance, national holidays) or adjust prices per date without altering the weekly template.
- [ ] **Ticket Scanner & Check-in View:** Implement a dedicated QR scanner view in the Business dashboard using the device camera (`html5-qrcode`) to instantly check-in arriving passengers.
- [ ] **Passenger Manifest & Printable Run-Sheet:** Provide a driver view or printable passenger manifest listing passenger names, seats, and payment status per departure.
- [ ] **Passenger Names Per Seat:** Allow reserving bookers to supply individual passenger names/IDs when booking multiple seats.
- [ ] **Automated WhatsApp / Email Confirmations:** Send instant booking confirmation tickets and departure reminders to passenger contact numbers.
- [ ] **Cancellation Window & Fees:** Implement business rules for ticket cancellations (e.g., free cancellation up to 2 hours before departure; no self-cancellation after cutoff).
- [ ] **Server-Side Pagination & Date Filtering:** Add SQL pagination to orders and timeline logs to ensure performant loading as booking records grow.
- [ ] **Multi-Operator Roles:** Add role-based access control (Admin, Dispatcher, Driver) for multi-branch bus operations.

---

## 🟡 P1 – Engineering Gaps

- [ ] **Refactor `business/src/App.jsx` (62 KB):** Break down the large single-file operator app into modular tab components (`OrdersTab`, `SchedulesTab`, `ArmadasTab`, `AnalyticsTab`) and custom hooks.
- [ ] **Refactor `client/src/App.jsx`:** Modularize passenger search, seat selection, and booking review flows.
- [ ] **End-to-End Testing (Playwright/Cypress):** Add automated browser tests simulating a complete passenger booking and operator check-in journey.
- [ ] **Database Backup & Disaster Recovery Automation:** Implement automated daily SQLite snapshots (using `sqlite3 .backup`) or Supabase automated backups with off-site storage.
- [ ] **TypeScript Migration:** Introduce TypeScript definitions for core data entities (`Booking`, `Schedule`, `Armada`, `PoolingSpot`).

---

## 🟢 P2 – Product Polish

- [ ] **Multilingual Support (i18n):** Add English UI support alongside Indonesian (`id-ID`).
- [ ] **Progressive Web App (PWA):** Add service workers and web app manifests for home screen installation on passenger and driver mobile devices.
- [ ] **Car Rental Module:** Implement private car rental booking (with or without driver) to complement travel pooling.
- [ ] **Promo Codes & Loyalty Points:** Add discount voucher redemption and repeat passenger perks.
- [ ] **Post-Trip Review & Driver Rating:** Collect passenger feedback after trips are completed.

---

## 📋 Suggested Next Milestones

1. **Milestone 1:** Refactor large `business/src/App.jsx` and `client/src/App.jsx` into smaller, maintainable component trees.
2. **Milestone 2:** Implement Pooling-Spot & Route Management UI in the business dashboard.
3. **Milestone 3:** Integrate Midtrans/Xendit Sandbox for automated QRIS payments.
4. **Milestone 4:** Add real WhatsApp OTP and automated ticket delivery.
