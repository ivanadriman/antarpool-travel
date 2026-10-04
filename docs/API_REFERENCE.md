# API Reference

The frontend applications access data through unified adapter interfaces (`client/src/api.js` and `business/src/api.js`). Depending on the target configured, calls are routed to Supabase or the production Node.js Express server.

## Data Layer Interface (`src/api.js`)

### Passenger Client (`client/src/api.js`)
| Method | Arguments | Returns | Description |
|---|---|---|---|
| `getSpots()` | None | `Promise<Spot[]>` | Fetches all active pooling terminals |
| `getSchedules(...)` | `(originId, destId, date)` | `Promise<Schedule[]>` | Fetches routes with remaining seats count and booked seat IDs |
| `createBooking(...)` | `({ schedule_id, travel_date, customer_name, customer_phone, customer_email, auth_method, seat_numbers })` | `Promise<Booking>` | Reserves seats atomically. Throws on collision with 409 status |
| `lookupBookings(...)` | `({ phone, code })` | `Promise<Booking[]>` | Queries passenger bookings by phone number or booking code |
| `cancelBooking(...)` | `(bookingId, phone)` | `Promise<Booking>` | Cancels booking and immediately releases seats |

### Operator Dashboard (`business/src/api.js`)
| Method | Arguments | Returns | Description |
|---|---|---|---|
| `getBusinessBookings(...)` | `({ date, status, payment_status })` | `Promise<Booking[]>` | Filtered bookings list (Protected) |
| `getBusinessSchedules(...)` | `(targetDate)` | `Promise<Schedule[]>` | All schedules with live seat counts for the date (Protected) |
| `updateBookingStatus(...)` | `(id, payment_status, booking_status)` | `Promise<Booking>` | Marks orders as PAID, COMPLETED, or CANCELLED (Protected) |
| `saveSchedule(...)` | `(scheduleData)` | `Promise<{ success: true }>` | Creates or updates trip schedule (Protected) |
| `deleteSchedule(...)` | `(scheduleId)` | `Promise<{ success: true }>` | Deletes schedule if no active orders exist (Protected) |
| `getArmadas()` | None | `Promise<Armada[]>` | Retrieves registered fleet vehicles and cabin layouts |
| `saveArmada(...)` | `(armadaData)` | `Promise<{ success: true }>` | Saves armada layout and synchronizes linked schedules (Protected) |
| `deleteArmada(...)` | `(armadaId)` | `Promise<{ success: true }>` | Deletes fleet vehicle (Protected) |
| `getTimeline()` | None | `Promise<TimelineEvent[]>` | Retrieves real-time audit trail events (Protected) |
| `getAnalytics()` | None | `Promise<AnalyticsSummary>` | Summary statistics and top routes (Protected) |

---

## Production REST API Endpoints (`server/src/server.js`)

Base URL: `http://localhost:5000` (or configured `VITE_API_URL`).

### 1. Authentication
#### `POST /api/business/login`
- **Request Body:** `{ "username": "admin", "password": "..." }`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "username": "admin", "role": "operator" }
  }
  ```
- **Response `401 Unauthorized`:** `{ "error": "Username atau password operator salah." }`

### 2. Public Passenger Endpoints
#### `GET /api/spots`
Returns active pooling terminals.

#### `GET /api/schedules?origin={id}&destination={id}&date={YYYY-MM-DD}`
Returns matching trips for the date, computing remaining seats in real time.

#### `POST /api/bookings`
Atomically creates a booking.
- **Request Body:**
  ```json
  {
    "schedule_id": 1,
    "travel_date": "2026-11-20",
    "customer_name": "Rian Pratama",
    "customer_phone": "081234567890",
    "seat_numbers": ["1A", "2A"]
  }
  ```
- **Response `201 Created`:** Booking details with generated `booking_code` (e.g. `TRV-261120-A4B2`).
- **Response `400 Bad Request`:** Travel date is in the past, or departure time has passed today.
- **Response `409 Conflict`:**
  ```json
  {
    "error": "Kursi 1A sudah dipesan oleh penumpang lain. Silakan pilih kursi lain.",
    "collision": ["1A"]
  }
  ```

#### `GET /api/bookings/lookup?phone={number}&code={code}`
Search bookings by phone or code.

#### `POST /api/bookings/:id/cancel`
- **Request Body:** `{ "phone": "081234567890" }`
- **Security:** Requires matching customer phone or valid operator bearer token.
- **Response `200 OK`:** Marks order cancelled and frees seats in `booking_seats`.

### 3. Protected Operator Endpoints
*Requires header: `Authorization: Bearer <token>` (Returns `401` if token is missing or invalid).*

- **`GET /api/business/bookings`** – Filter orders by date, status, payment status.
- **`PATCH /api/business/bookings/:id/status`** – Update payment and boarding state.
- **`GET /api/business/schedules?date=YYYY-MM-DD`** – Live seat availability per trip.
- **`POST /api/business/schedules`** / **`PUT /api/business/schedules/:id`** / **`DELETE /api/business/schedules/:id`** – Schedule management.
- **`POST /api/armadas`** / **`PUT /api/armadas/:id`** / **`DELETE /api/armadas/:id`** – Fleet management (updates automatically sync to linked schedules).
- **`GET /api/business/analytics`** – Revenue, booking counts, top routes.
- **`GET /api/business/timeline`** – Order life-cycle audit trail.

---

## Real-Time Messaging & Voice Alerts

### Production WebSocket (`ws://localhost:5000`)
- **Connection:** `ws://localhost:5000?token=<operator_token>`
- **Events Broadcasted:**
  - `NEW_BOOKING`: Dispatched on new order creation. Contains `booking` object and `voiceText` in Indonesian for speech synthesis.
  - `BOOKING_CANCELLED`: Dispatched when an order is cancelled.
  - `BOOKING_UPDATED`: Dispatched when status changes (payment verified, checked in).

### Demo Supabase Realtime
Subscribes to `postgres_changes` on `bookings`, `schedules`, and `order_timeline_events` via the `business_orders_realtime` channel.
