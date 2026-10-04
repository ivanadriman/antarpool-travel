# AntarPool Travel – Documentation Index

AntarPool is an inter-city shuttle ("travel pooling") booking platform for Indonesia (prototype routes: Surabaya ⇄ Malang). Passengers book seats and pay at the pool on arrival. Operators manage orders, fleet and schedules, and get voice announcements for new orders.

| Document | Audience | Contents |
|---|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Developers | The two runtime modes (Supabase vs. legacy Express), data flow, code map |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Developers | Setup, env vars, running, conventions, common tasks, known gotchas |
| [DATABASE.md](DATABASE.md) | Developers | Tables, columns, JSON shapes, status values, RLS, realtime |
| [API_REFERENCE.md](API_REFERENCE.md) | Developers | Data-layer functions (`api.js`) and legacy REST endpoints |
| [USER_GUIDE.md](USER_GUIDE.md) | Passengers & operators | How to book/cancel tickets; how to run daily operations |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Maintainers | Deploy checklist, env matrix, post-deploy verification |
| [SECURITY.md](SECURITY.md) | Maintainers | Current security posture and what must change before production |
| [ROADMAP.md](ROADMAP.md) | Everyone continuing the project | Gap analysis: what is missing/unfinished, prioritized |

## Status at a glance

- **Working:** passenger booking flow, dynamic seat maps, ticket pass with QR, self-cancel, operator order management, schedules, fleet layout editor, order timeline, analytics, voice alerts, Supabase realtime.
- **Prototype-grade (not production-safe):** authentication (simulated OTP, client-side operator password), open database policies, no payment gateway, race-prone seat booking.
- **Stale material:** root [`DOCUMENTATION.md`](../DOCUMENTATION.md) and [`README.md`](../README.md) describe the original Express + SQLite design; the app has since moved to Supabase (see ARCHITECTURE.md). `deploy/env_templates/` is also outdated (Render/Zeabur era). The documents in this folder are the current source of truth.

## Other existing docs
- [`deploy/STEP_BY_STEP_GUIDE.md`](../deploy/STEP_BY_STEP_GUIDE.md) – click-through Supabase + Vercel setup (still accurate).
- `client/README.md`, `business/README.md` – unmodified Vite template text; ignore.
