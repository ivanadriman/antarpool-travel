# Security Posture & Hardening

This document assesses the system's security architecture, detailing implemented protections for the Production target and outlining remaining measures for high-scale enterprise readiness.

## Security Status Matrix

| # | Vulnerability / Concern | Status in Production Target (`server/`) | Status in Demo Target (`supabase`) |
|---|---|---|---|
| 1 | **Double-Booking Race Condition** | **RESOLVED:** Enforced via `booking_seats` table, DB partial unique index `WHERE status != 'CANCELLED'`, and `withTransaction` serialized locking. | **RESOLVED:** Schema updated with `booking_seats` table and partial unique index. |
| 2 | **Operator Authentication & Access Control** | **RESOLVED:** Server issues signed HMAC-SHA256 JWTs via `POST /api/business/login`. All business and armada write endpoints protected with `requireOperator` middleware. | Kept as client-side gate by design (demo only with throwaway data). |
| 3 | **Client-Side Price Tampering** | **RESOLVED:** Server ignores any client-supplied prices and strictly computes total price from `schedule.price` inside the transaction. | Validated in data adapter. |
| 4 | **Booking Code Predictability & Collisions** | **RESOLVED:** Cryptographically generated via `crypto.randomBytes(3)` with collision retry loop. | Random hex generation. |
| 5 | **Booking Past Trips / Cutoff** | **RESOLVED:** Server rejects bookings if travel date is in past or departure time has passed today. | Validated in data adapter. |
| 6 | **Unauthorized Ticket Cancellation** | **RESOLVED:** `POST /api/bookings/:id/cancel` strictly verifies matching passenger phone number or valid operator bearer token. | Basic lookup check. |
| 7 | **Database Access Control (RLS)** | N/A (Server accesses SQLite directly with no public DB port exposed). | Open RLS policies for prototype simplicity. Must tighten before putting real user data in Supabase. |
| 8 | **Passenger Identity (Real OTP)** | **DEFERRED:** Phone number stored per session; real SMS/WhatsApp OTP (Twilio/Fonnte) scheduled for Phase 5. | Simulated OTP modal. |

## Production Authentication Details

The Node.js server implements standard stateless JWT authentication:
- **Algorithm:** HMAC-SHA256 (`HS256`).
- **Token Expiry:** 12 hours (43,200 seconds).
- **Transport:** HTTP `Authorization: Bearer <token>` header.
- **WebSocket Security:** Connection query param `?token=<token>`.

### Changing Operator Credentials in Production
In `server/.env` (or environment variables on your hosting provider):
```env
OPERATOR_USER=custom_operator_name
OPERATOR_PASS=strong_unpredictable_password_here
JWT_SECRET=a_very_long_cryptographically_secure_random_string_64_characters
```

## Checklist Before Live Production

- [x] Atomic seat reservations with unique database index.
- [x] Server-side price calculation and code generation.
- [x] Operator endpoints protected behind JWT authentication.
- [x] Past departure time booking prevention.
- [ ] Change default `JWT_SECRET` and `OPERATOR_PASS` in production `.env`.
- [ ] Integrate SMS or WhatsApp gateway for real passenger phone OTP (UU PDP compliance).
- [ ] Set up HTTPS / SSL on custom domain (required for secure cookies / Bearer headers in transit).
- [ ] Attach persistent disk or volume to container so `travel.db` is preserved across restarts.
