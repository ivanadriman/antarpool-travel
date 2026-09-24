# 🚗 Car Travel & Rental Platform (Travel Pooling)

A full-stack, real-time travel pooling platform consisting of two responsive web applications (**Client App** for passengers and **Business App** for operators) connected to a shared backend and SQLite database with real-time WebSocket order broadcasting, custom vehicle fleet layout builder, and Indonesian Text-to-Speech voice alerts.

---

## 📖 Complete Documentation
For full technical specifications, architecture diagrams, database schema, API reference, and troubleshooting guides, refer to:
👉 **[DOCUMENTATION.md](file:///c:/Users/kiris/OneDrive/Documents/AI%20Projects/Car%20-%20Travel%20and%20Rental/DOCUMENTATION.md)**

---

## 📁 Architecture & Subfolder Structure

```
Car - Travel and Rental/
├── client/                     # Passenger Booking Web App (Port 5173)
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthModal.jsx          # Login via Phone (OTP), Email, Google + Name
│   │   │   ├── InteractiveSeatMap.jsx # Dynamic vehicle seat layout engine
│   │   │   └── TicketPass.jsx         # Digital Boarding Pass with QR & directions
│   │   ├── App.jsx                    # Main booking flow & 'Tiket Saya' history
│   │   └── utils.js                   # IDR currency & Indonesian date helpers
│   ├── package.json
│   └── vite.config.js
│
├── business/                   # Operator & Admin Dashboard (Port 5174)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ScheduleModal.jsx      # Schedule creator with Armada picker
│   │   │   └── ArmadaModal.jsx        # Interactive cabin layout editor (Rows x Cols)
│   │   ├── App.jsx                    # Tabs: Orders, Schedules, Armadas, Analytics
│   │   ├── voiceNotifier.js           # Web Audio chime + SpeechSynthesis (id-ID)
│   │   └── utils.js                   # IDR formatters
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Shared Backend & SQLite Database (Port 5000)
│   ├── src/
│   │   ├── db.js               # Database schema, migrations & prototype seeder
│   │   └── server.js           # Express REST API + WebSocket Server
│   ├── travel.db               # SQLite database file
│   ├── test_integration.py     # Automated test script
│   └── package.json
│
├── start_all.bat               # 1-Click launcher starting all 3 servers
├── Client App (Passenger).url  # Browser shortcut to http://localhost:5173
├── Business App (Operator).url # Browser shortcut to http://localhost:5174
├── DOCUMENTATION.md            # Comprehensive project documentation
└── README.md                   # Quick overview
```

---

## 🚀 Running the Applications

### 1-Click Launcher (Windows)
Double click **`start_all.bat`** in the project folder to start all 3 server windows.

### Manual Terminal Commands
```bash
# 1. Backend Server (Port 5000)
cd server
npm start

# 2. Client Web App (Port 5173)
cd client
cmd /c "npm run dev"

# 3. Business Web App (Port 5174)
cd business
cmd /c "npm run dev"
```

---

## 🌟 Key Features

### 👤 Client Application (`client/` - Port 5173)
- **Authentication**: Sign in using Phone Number, Email, or Google Account with full name entry.
- **Pooling Spots**: Preloaded with **Pool Surabaya** and **Pool Malang** for prototype testing.
- **Live Schedules**: Real-time departure times, pricing in IDR (`Rp`), and remaining seats with sold-out warnings.
- **Dynamic Vehicle Seat Map**: Automatically renders the exact cabin layout configured by the operator for that vehicle. Passengers pick specific seats (e.g. 1A, 2B) with instant total price recalculation.
- **Pay on Arrival**: Notice confirming payment is made when arriving at the departure pool without upfront deposit.
- **Digital Boarding Pass**: Generated ticket pass with unique booking code, QR code for on-site scanning, and route directions.
- **Tiket Saya**: History drawer to access previous and active travel passes.

### 🏢 Business Application (`business/` - Port 5174)
- **Indonesian Voice Notifications (`id-ID`)**: Hands-free real-time audio announcements using the Web Speech API and harmonic audio chime:
  > *"Pesanan baru dari Pool Surabaya ke Malang. Pemesan Rian Pratama, 2 kursi, keberangkatan pukul 08:30"*
- **Order Management**: Receive bookings via WebSockets. Actions:
  - **Terima Bayar di Pool**: Mark payment as paid upon customer arrival.
  - **Check-in Armada**: Check passenger into vehicle.
  - **Batalkan Pesanan**: Cancel booking and release seats.
- **Manajemen Armada (Fleet & Custom Layout Editor)**:
  - Add vehicles by specifying dimensions (e.g., 2-7 rows × 2-5 columns).
  - Interactive click editor to set cell types: **Kursi (Seat)**, **Supir (Driver)**, **Lorong (Aisle)**, and **Kosong (Empty)**.
  - Remove armada option with safety checks.
- **Jadwal & Tarif Management**: Create and edit trips with the **Armada Option Picker** that automatically binds the vehicle's model, capacity, and seat layout.
- **Statistik & Laporan Dashboard**:
  - Revenue breakdown: Paid Revenue (`PAID`) vs Pending Revenue (`PENDING`).
  - Total Booking volume and passengers count.
  - Top performing routes and hourly booking density.
