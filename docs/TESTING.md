# Testing Guide

AntarPool includes automated contract tests and concurrency verification to guarantee that seat collision prevention, access control, and data contracts remain bulletproof across changes.

## 1. Automated Contract & Concurrency Tests (`tests/contract.test.js`)

The test suite runs on Node.js's native test runner (`node:test` and `node:assert/strict`) with zero external dependencies.

### Running the Test Suite
From the project root:
```bash
npm test
```
*(Or directly: `node --test tests/contract.test.js`)*

### What the Suite Verifies

| Test Case | Verification Logic |
|---|---|
| **1. Spots Endpoint** | Verifies `GET /api/spots` returns terminal pooling hubs (`Pool Surabaya`, `Pool Malang`) with valid structure. |
| **2. Operator Authentication** | Verifies `POST /api/business/login` rejects wrong passwords with `401` and returns signed JWT tokens on valid credentials. |
| **3. Access Control Protection** | Confirms `/api/business/bookings` returns `401 Unauthorized` without a token and `200 OK` with `Authorization: Bearer <token>`. |
| **4. Atomic Booking & Concurrency** | • Books seat `1A` (status 201).<br>• Attempts duplicate booking on seat `1A` (status 409).<br>• **Parallel Concurrency Test:** Fires 10 simultaneous requests for seat `2A` — **exactly one** claims the seat (201), and all 9 others receive `409 Conflict`.<br>• Cancels ticket and confirms seat `1A` is released and rebookable. |
| **5. Armada Synchronizer** | Updates armada model and grid layout; verifies that all linked schedules automatically receive updated `vehicle_model`, `total_seats`, and `vehicle_layout`. |
| **6. Business Analytics** | Verifies `/api/business/analytics` calculates revenue, passenger counts, and top route density. |

### How Test Isolation Works
When `tests/contract.test.js` runs:
1. It launches a dedicated, ephemeral test server on port `5098`.
2. It assigns an isolated test database file (`tests/contract_test.db`).
3. Upon completion, the server process is killed and the temporary database is cleaned up.

---

## 2. Python Integration Test (`server/test_integration.py`)

A standalone script to verify the REST API from Python:
```bash
# Ensure the backend server is running on port 5000:
python server/test_integration.py
```
Output:
```
1. Spots count: 2
Testing route: Pool Surabaya (id=1) -> Pool Malang (id=2)
2. Schedules count: 7, Price: Rp 95,000, Available Seats: 8
3. Booking created successfully!
   Code: TRV-261120-XXXX
   Seats: ['3A', '3B']
   Total: Rp 190,000
   Payment: Bayar di Tempat (Pool) (PENDING)
5. Analytics updated:
   Total Bookings: 1
   Pending Revenue: Rp 190,000
   Top Route: Pool Surabaya -> Pool Malang (1 orders)
```

---

## 3. Pre-Commit / Build Verification

Run before pushing or making major changes:
```cmd
deploy\check_ready.bat
```
This tests production builds of both `client/` and `business/` and alerts on any syntax, Tailwind, or bundling regressions.
