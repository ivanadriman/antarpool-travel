# API Reference

The frontend applications access data through unified adapter interfaces (`client/src/api.js` and `business/src/api.js`). Depending on the target configured, calls are routed to Supabase Cloud or the production Node.js Express server.

## Data Layer Interface (`src/api.js`)

### Passenger Client (`client/src/api.js`)
| Method | Arguments | Returns | Description |
|---|---|---|---|
| `getSpots()` | None | `Promise<Spot[]>` | Fetches all active pooling terminals |
| `getSchedules(...)` | `(originId, destId, date)` | `Promise<Schedule[]>` | Fetches routes with remaining seats count and booked seat IDs |
| `createBooking(...)` | `({ schedule_id, travel_date, customer_name, customer_phone, customer_email, customer_city, customer_id_card, auth_method, seat_numbers })` | `Promise<Booking>` | Reserves seats atomically. Throws on collision with 409 status |
| `lookupBookings(...)` | `({ phone, code })` | `Promise<Booking[]>` | Queries passenger bookings by phone number or booking code |
| `cancelBooking(...)` | `(bookingId, phone)` | `Promise<Booking>` | Cancels booking and immediately releases seats |
| `updateProfile(...)` | `(profileData)` | `Promise<Customer>` | Registers or updates passenger profile (name, phone, email, city, id_card/NIK) |

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
| `getCustomers()` | None | `Promise<Customer[]>` | Retrieves customer directory with enriched CRM stats (Protected, with hybrid fallback) |
| `getCustomerBookings(...)` | `(phone)` | `Promise<Booking[]>` | Retrieves full ticket booking history for a customer (Protected) |
| `updateCustomer(...)` | `(id, customerData)` | `Promise<{ success: true, customer: Customer, notice?: string }>` | Updates customer VIP status, blacklist flag, and notes (Protected) |

---

## Production REST API Endpoints (`server/src/routes/`)

Base URL: `http://localhost:5000` (or configured `VITE_API_URL`).

### 1. Authentication (`server/src/routes/auth.js`)
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
#### `GET /api/spots` (`server/src/routes/spots.js`)
Returns active pooling terminals.

#### `GET /api/schedules?origin={id}&destination={id}&date={YYYY-MM-DD}` (`server/src/routes/schedules.js`)
Returns matching trips for the date, computing remaining seats in real time.

#### `POST /api/bookings` (`server/src/routes/bookings.js`)
Atomically creates a booking.
- **Request Body:**
  ```json
  {
    "schedule_id": 1,
    "travel_date": "2026-11-20",
    "customer_name": "Rian Pratama",
    "customer_phone": "081234567890",
    "customer_email": "rian@example.com",
    "customer_city": "Surabaya",
    "customer_id_card": "3578012345678901",
    "auth_method": "phone",
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

#### `GET /api/bookings/lookup?phone={number}&code={code}` (`server/src/routes/bookings.js`)
Search bookings by phone or code.

#### `POST /api/bookings/:id/cancel` (`server/src/routes/bookings.js`)
- **Request Body:** `{ "phone": "081234567890" }`
- **Security:** Requires matching customer phone or valid operator bearer token.
- **Response `200 OK`:** Marks order cancelled and frees seats in `booking_seats`.

#### `POST /api/customers/profile` (`server/src/routes/customers.js`)
Registers or updates passenger profile data upon login or profile editing.
- **Request Body:**
  ```json
  {
    "phone": "081234567890",
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "city": "Surabaya",
    "id_card": "3578012345678901",
    "auth_method": "phone"
  }
  ```
- **Validation:**
  - Phone: Verified Indonesian format (`08...` or `62...`, 10–15 digits).
  - NIK: Validated for exactly 16 digits (if provided).
- **Response `200 OK`:** Enriched customer profile record.

### 3. Protected Operator Endpoints
*Requires header: `Authorization: Bearer <token>` (Returns `401` if token is missing or invalid).*

- **`GET /api/business/bookings`** (`routes/bookings.js`) – Filter orders by date, payment status, booking status.
- **`PATCH /api/business/bookings/:id/status`** (`routes/bookings.js`) – Update payment (`PAID`) and trip completion state (`COMPLETED`).
- **`GET /api/business/schedules?date=YYYY-MM-DD`** (`routes/schedules.js`) – Live seat availability per trip.
- **`POST /api/business/schedules`** / **`PUT /api/business/schedules/:id`** / **`DELETE /api/business/schedules/:id`** (`routes/schedules.js`) – Schedule timetable management.
- **`POST /api/armadas`** / **`PUT /api/armadas/:id`** / **`DELETE /api/armadas/:id`** (`routes/armadas.js`) – Fleet vehicle and seat layout editor (updates automatically sync to linked schedules).
- **`GET /api/business/analytics`** (`routes/analytics.js`) – Revenue, booking counts, top routes.
- **`GET /api/business/timeline`** (`routes/timeline.js`) – Order life-cycle audit trail.
- **`GET /api/business/customers`** (`routes/customers.js`) – Customer CRM directory with aggregated trips, completed/cancelled counts, and total spend.
- **`GET /api/business/customers/:phone/bookings`** (`routes/customers.js`) – Full booking history for a specific customer phone number.
- **`PUT /api/business/customers/:id`** (`routes/customers.js`) – Update customer VIP status (`is_vip`), blacklist flag (`is_blacklisted`), and operator notes (`notes`).

---

## Real-Time Messaging & Voice Alerts

### Production WebSocket (`ws://localhost:5000`)
- **Engine:** Modular hub in `server/src/websocket.js`.
- **Events Broadcasted:**
  - `NEW_BOOKING`: Dispatched on new order creation. Contains `booking` object and `voiceText` in Indonesian for speech synthesis.
  - `BOOKING_CANCELLED`: Dispatched when an order is cancelled.
  - `BOOKING_UPDATED`: Dispatched when status changes (payment verified, checked in).

### Demo Supabase Realtime
Subscribes to `postgres_changes` on `bookings` table via the `business_orders_realtime` channel, announcing new bookings and cancellations in Indonesian.
