# Security Posture

> [!CAUTION]
> The system is a **prototype**. Anyone who opens the deployed sites can read and modify all data using the public anon key. Do not handle real customer data or publicize the URLs until the P0 items below are done.

## Current weaknesses

| # | Issue | Where | Impact |
|---|---|---|---|
| 1 | RLS policies are `USING (true)` for all operations | `deploy/supabase_schema.sql` | Anyone with the anon key (visible in the JS bundle) can read all bookings (names, phones, emails), edit prices, delete schedules/bookings |
| 2 | Operator login is a client-side string compare with credentials in env vars baked into the bundle | `business/src/components/LoginGate.jsx` | Password readable by anyone; auth bypass by setting the localStorage key `antarpool_operator_auth` |
| 3 | Passenger auth is simulated (any 4-digit OTP; Google not integrated) | `client/src/components/AuthModal.jsx` | Anyone can claim any phone number and view/cancel its tickets |
| 4 | `lookupBookings` / `cancelBooking` have no ownership check | `client/src/api.js` | Booking IDs/codes/phones are enough to read/cancel anyone's ticket |
| 5 | Seat collision check is read-then-insert (not atomic) | `createBooking` | Double booking under concurrency |
| 6 | Booking code uses `Math.random` (4 chars) with no collision retry | `createBooking` | Collisions → insert fails (UNIQUE) ; codes guessable |
| 7 | Price is read client-side and sent with insert | `createBooking` | Tampering possible (`price_per_seat`, `total_price` are client-supplied) |
| 8 | Legacy Express server has no auth, permissive CORS configuration, no rate limiting | `server/src/server.js` | Same exposure as above |
| 9 | Personal data (name/phone/email) stored plain, no retention/consent policy | DB | Indonesian PDP Law (UU 27/2022) obligations apply for production |

## Target design (recommended)
1. **Operators:** Supabase Auth (email/password) with an `operators` table or a JWT `role` claim. RLS: operators get full access; `anon` gets read-only on `pooling_spots`, active `schedules`, and nothing else.
2. **Passengers:** Supabase Auth phone OTP (via Twilio/other provider) or email magic link. `bookings.user_id = auth.uid()`; RLS lets users read/cancel only own rows.
3. **Booking creation via a Postgres function (RPC)** or Edge Function: inside one transaction, check seat availability (`SELECT … FOR UPDATE` or a unique index on a `booking_seats(schedule_id, travel_date, seat)` table), read price server-side, insert booking + timeline event, return code from a secure generator.
4. **Timeline events** written by DB triggers instead of the client.
5. Move analytics aggregation to SQL views/RPC (avoids downloading every booking).
6. Remove `VITE_OPERATOR_*` once Auth is in place; never put service-role keys in any `VITE_*` var.

## Secrets handling
- `.env` files are git-ignored; keep it so. The anon key is *public by design* — security must come from RLS.
- Rotate the anon/service keys in Supabase if they were ever committed.
