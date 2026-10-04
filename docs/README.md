# AntarPool Travel – Documentation Index

AntarPool is an inter-city shuttle ("travel pooling") booking platform for Indonesia (prototype routes: Surabaya ⇄ Malang). Passengers book seats and pay at the pool on arrival. Operators manage orders, fleet and schedules, and receive Indonesian voice announcements for new orders.

---

## 📚 Documentation Index

| Document | Audience | Contents |
|---|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Developers & Architects | Dual-target operational split (Demo vs. Production), adapter design, data flow, code map |
| [DECISIONS.md](DECISIONS.md) | Developers & Architects | Architecture Decision Records (ADRs): targets, adapters, concurrency locking, JWT auth |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Developers | Monorepo workspaces, environment variables, run commands, gotchas |
| [DATABASE.md](DATABASE.md) | Developers & DBAs | Database schemas (SQLite & Supabase), `booking_seats` table, partial unique indexes, RLS |
| [API_REFERENCE.md](API_REFERENCE.md) | Developers | Front-end `api.js` contract, REST endpoints, and JWT authentication |
| [TESTING.md](TESTING.md) | QA & Developers | Contract testing suite, 10-parallel-request concurrency tests, test runner instructions |
| [USER_GUIDE.md](USER_GUIDE.md) | Passengers & Operators | How to book and cancel tickets; how operators manage trips and fleet layouts |
| [DEPLOYMENT.md](DEPLOYMENT.md) | DevOps & Maintainers | Deployment guides for Vercel (Demo) and VPS/Node.js with persistent disk (Production) |
| [SECURITY.md](SECURITY.md) | Security & DevOps | Security posture, operator JWT authentication, and pre-production hardening checklist |
| [ROADMAP.md](ROADMAP.md) | Project Managers & Devs | Completed hardening milestones and prioritized future backlog (P0, P1, P2) |

---

## 🔍 System Status at a Glance

- **Dual-Target Operational Support:**
  - **Demo Target (`VITE_BACKEND=supabase`):** Zero-cost deployment on Vercel backed by Supabase with live realtime order subscriptions.
  - **Production Target (`VITE_BACKEND=rest`):** Custom Node.js Express server + SQLite with WAL mode, atomic seat locking, server-side pricing, and JWT operator authentication.
- **Atomic Concurrency Protection:** `booking_seats` table with partial unique index `UNIQUE(schedule_id, travel_date, seat_number) WHERE status != 'CANCELLED'`. Tested and verified under simultaneous parallel load.
- **Operator Access Control:** Stateless HMAC-SHA256 JWT tokens protecting administrative endpoints.
- **Frontend Monorepo:** Clean npm workspace structure (`client`, `business`, `server`, `shared`) with unified formatting utilities in `@antarpool/shared`.
- **Primary Source of Truth:** All files in this `docs/` folder represent the active architecture. Root [`DOCUMENTATION.md`](../DOCUMENTATION.md) and [`README.md`](../README.md) describe the original initial prototype design.
