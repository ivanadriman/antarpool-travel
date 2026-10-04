# 🚗 AntarPool Travel & Rental Platform

A full-stack, real-time travel pooling platform designed for inter-city shuttle services in Indonesia (routes: Surabaya ⇄ Malang). It features two responsive web applications:
- **Client App (`client/`)**: Passenger booking portal with interactive seat layout picker, digital boarding pass with QR, and ticket self-cancellation.
- **Business App (`business/`)**: Operator management dashboard with live order timelines, Indonesian voice announcements (`id-ID`), interactive fleet cabin layout builder, and business analytics.

---

## 📚 Documentation Hub

The complete, active technical documentation is maintained in the [`docs/`](docs/) directory:

- 📐 **[Architecture & Dual Targets](docs/ARCHITECTURE.md)**: Details on the Demo (Supabase) vs Production (Express + SQLite) operational split and dynamic adapter pattern.
- 📋 **[Architecture Decision Records](docs/DECISIONS.md)**: ADRs on operational split, dynamic adapters, atomic double-booking prevention, and JWT authentication.
- 💻 **[Development Guide](docs/DEVELOPMENT.md)**: Monorepo workspace setup, environment variables, commands, and conventions.
- 🗄️ **[Database Schema](docs/DATABASE.md)**: Tables, `booking_seats` atomic locking, partial unique indexes, and RLS policies.
- 🔌 **[API Reference](docs/API_REFERENCE.md)**: Front-end data contract, REST endpoints, and JWT authentication.
- 🧪 **[Testing Guide](docs/TESTING.md)**: Contract tests, 10-parallel-request concurrency verification, and test execution.
- 🔒 **[Security Policy](docs/SECURITY.md)**: Operator access control, vulnerability status matrix, and production hardening checklist.
- 🚀 **[Deployment Guide](docs/DEPLOYMENT.md)**: Deployment steps for Vercel (Demo) and VPS with persistent storage (Production).
- 🗺️ **[Roadmap & Backlog](docs/ROADMAP.md)**: Completed hardening milestones and prioritized future backlog.
- 👥 **[User Guide](docs/USER_GUIDE.md)**: Operational guide for passengers and dispatchers.

> [!NOTE]
> The root [`DOCUMENTATION.md`](DOCUMENTATION.md) is preserved as the initial prototype specification. For current architecture and configuration, always refer to [`docs/`](docs/).

---

## 🏗️ System Architecture & Dual Operational Targets

AntarPool supports two operational targets configured via the `VITE_BACKEND` environment variable using an **Adapter Pattern**:

```
                          ┌───────────────────────────┐
                          │   Client / Business UI    │
                          └─────────────┬─────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
              [ Supabase Adapter ]             [ REST Adapter ]
                         │                             │
                         ▼                             ▼
              Demo Target (Vercel)          Production Target (VPS)
            - Direct Supabase queries     - Express REST API (Port 5000)
            - Realtime channel updates    - SQLite with WAL & Async Mutex
            - Zero-cost prototype         - Atomic booking in booking_seats
                                          - Server-side price calculation
                                          - HMAC-SHA256 JWT Operator Auth
```

1. **Demo Target (`VITE_BACKEND=supabase`)**:
   - Zero-cost deployment on Vercel + Supabase free tier.
   - Ideal for client presentations, design reviews, and portfolio demonstration.
2. **Production Target (`VITE_BACKEND=rest`)**:
   - Maintained Node.js Express server + SQLite with Write-Ahead Logging (`WAL`).
   - Atomic seat booking backed by `booking_seats` table and partial unique indexes (`WHERE status != 'CANCELLED'`).
   - Server-side pricing computation and collision-resistant booking code generation.
   - Stateless HMAC-SHA256 JWT authentication for operator endpoints.

---

## 📁 Repository Structure

```
Car - Travel and Rental/
├── client/                     # Passenger Booking Web App (Port 5173)
│   ├── src/
│   │   ├── adapters/          # Supabase & REST backend adapters
│   │   ├── components/        # InteractiveSeatMap, TicketPass, AuthModal
│   │   ├── api.js             # Dynamic backend dispatcher
│   │   └── App.jsx            # Booking flow & 'Tiket Saya' drawer
├── business/                   # Operator & Admin Dashboard (Port 5174)
│   ├── src/
│   │   ├── adapters/          # Supabase & REST backend adapters
│   │   ├── components/        # ArmadaModal, ScheduleModal, LoginGate
│   │   ├── api.js             # Dynamic backend dispatcher
│   │   ├── voiceNotifier.js   # Web Audio chime + SpeechSynthesis (id-ID)
│   │   └── App.jsx            # Orders, Schedules, Armadas, Analytics
├── server/                     # Production REST Backend (Port 5000)
│   ├── src/
│   │   ├── db.js              # SQLite schema, WAL pragma, async mutex
│   │   └── server.js          # Express API, JWT auth, atomic booking
│   ├── travel.db              # SQLite database file
│   └── test_integration.py    # Python integration test script
├── shared/                     # Shared Monorepo Package (@antarpool/shared)
│   └── src/index.js           # IDR currency & Indonesian date formatters
├── tests/                      # Automated Contract & Concurrency Tests
│   └── contract.test.js       # Node.js contract & race condition test suite
├── deploy/                     # Deployment configs, SQL schemas & env templates
├── docs/                       # Complete documentation suite
└── package.json                # Monorepo workspaces root configuration
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+ (tested on Node.js 20/22)
- npm 9+

### Installation
Install dependencies across all workspace packages from the root:
```bash
npm install
```

### Running Tests
Run the comprehensive contract and concurrency test suite:
```bash
npm test
```
*This validates schedule retrieval, seat reservation constraints, 10-parallel-request race conditions, cancellation seat recycling, armada layout syncing, and operator authorization.*

### Running in Development

#### Option A: Production Mode (Local Express Server + SQLite)
```bash
# 1. Start the backend server (Port 5000)
npm run start:server

# 2. In separate terminals, start passenger and operator apps
npm run dev:client
npm run dev:business
```

#### Option B: Demo Mode (Direct Supabase)
Ensure `client/.env` and `business/.env` contain your Supabase credentials:
```bash
npm run dev:client
npm run dev:business
```

Or run all services simultaneously using `start_all.bat` on Windows.

---

## 🔐 Operator Access

When running against the Production REST backend, the Business dashboard is protected by an operator login gate:
- Default Operator Password: `antarpool2026`
- Configurable via `OPERATOR_PASSWORD` environment variable in `server/.env`.
