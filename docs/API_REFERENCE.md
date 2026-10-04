# API Reference

In Supabase mode there is no custom backend; the "API" is the `src/api.js` module in each app. The legacy Express endpoints are listed second.

## Data layer – `client/src/api.js`
| Function | Description |
|---|---|
| `getSpots()` | Active pooling spots, ordered by city/name |
| `getSchedules(originId, destId, travelDate)` | Active schedules for route, enriched with `origin_*`, `destination_*`, `booked_seats[]`, `available_seats_count`, `is_sold_out` |
| `createBooking(payload)` | `payload = {schedule_id, travel_date, customer_name, customer_phone, customer_email, auth_method, seat_numbers[]}`. Throws `Kursi X sudah dipesan…` on collision. Returns booking + route/vehicle fields |
| `lookupBookings({phone, code})` | Bookings by exact phone or uppercase code, newest first |
| `cancelBooking(bookingId, phone)` | Sets both statuses to `CANCELLED`, logs timeline. (`phone` only used by legacy server) |

## Data layer – `business/src/api.js`
| Function | Description |
|---|---|
| `getBusinessBookings({date, status, payment_status})` | Filtered bookings with route/time |
| `getBusinessSchedules(date)` | All schedules (incl. inactive) with `booked_seats_count`, `remaining_seats` for `date` |
| `updateBookingStatus(id, paymentStatus, bookingStatus)` | Partial update + timeline event |
| `saveSchedule(obj)` / `deleteSchedule(id)` | Upsert; delete refuses when active bookings exist |
| `getArmadas()` / `saveArmada(obj)` / `deleteArmada(id)` | Fleet CRUD (`saveArmada` returns `{success, error}`) |
| `getTimeline()` | All timeline events, newest first (no pagination) |
| `getAnalytics()` | `{total_bookings, paid_revenue, pending_revenue, total_passengers, top_routes[5], time_distribution[]}` computed client-side from all non-cancelled bookings |
| `getSpots()` | As above |

Return conventions are inconsistent: some functions **throw**, others **return `{success:false,error}`**. Standardize when refactoring.

## Legacy REST (Express, `server/src/server.js`, port 5000)

Public
- `GET /api/spots`
- `GET /api/schedules?origin&destination&date`
- `GET /api/schedules/:id?date`
- `POST /api/bookings` – body as `createBooking`; broadcasts `NEW_BOOKING` over WS
- `GET /api/bookings/lookup?phone=|code=`
- `POST /api/bookings/:id/cancel` – body `{phone}`; broadcasts `BOOKING_UPDATED`

Operator (no authentication!)
- `GET /api/business/bookings?date&payment_status&status`
- `PATCH /api/business/bookings/:id/status` – `{payment_status?, booking_status?}`
- `GET|POST /api/armadas`, `PUT|DELETE /api/armadas/:id`
- `GET /api/business/schedules?date`, `POST /api/business/schedules`, `PUT|DELETE /api/business/schedules/:id`
- `GET /api/business/analytics`
- `GET /api/business/timeline`

WebSocket messages (`ws://host:5000`): `NEW_BOOKING`, `BOOKING_UPDATED`; the business app announces them via `voiceNotifier.js`.

## Supabase Realtime subscription (business app)
Channel `business_orders_realtime` listens to `postgres_changes` on `bookings` (INSERT → voice "pesanan baru"; UPDATE to cancelled → voice cancellation) and `schedules`/timeline for refresh. Voice requires prior user interaction (autoplay policy); the UI has a "Uji Notifikasi Suara" button.
