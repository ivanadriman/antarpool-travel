# User Guide

The apps are in Indonesian; Indonesian labels are shown in *italics*.

## Passengers (Client app)

### 1. Sign In & Manage Profile
1. Open the app and sign in (*Masuk*) with phone (OTP), email, or Google, and enter your name.
   > Prototype note: OTP verification is simulated — any code of 4+ digits (e.g. `1234`) is accepted; Google login is simulated for demonstration.
2. Click on the **Profil** button in the top navigation bar to view and update your passenger details:
   - **Nama Lengkap:** Your registered name.
   - **Kota Domisili:** Domicile city (e.g. *Surabaya*, *Malang*, *Sidoarjo*).
   - **Nomor NIK:** 16-digit Indonesian National ID Card number for travel manifest compliance.
   - Click *Simpan Profil* to persist your data across upcoming bookings.

### 2. Book a Ticket
1. Choose **departure pool** (*Pool Keberangkatan*) first, then **destination** (*Pool Kedatangan*) and the **date**. Past dates are blocked.
2. Pick a departure time. Cards show vehicle and remaining seats; *Penuh* = sold out.
3. Tap seats on the cabin map (grey = taken, blue = your selection). The total price updates live.
4. Confirm. You pay **at the departure pool** when you arrive (*Bayar di Tempat*).
5. You receive a digital boarding pass (*Ticket Pass*) with booking code (`TRV-…`) and QR code.

### 3. Manage Tickets
- Open **Tiket Saya** to see your tickets (found by your phone number).
- Status labels: *Menunggu Bayar di Pool* (not yet paid), *Sudah Lunas* (paid), *Dibatalkan* (cancelled).
- **Cancel:** from the list or the boarding pass, any time before check-in. Seats are released immediately; nothing is charged.

---

## Operators (Business app)

### 1. Sign In
Use the operator username/password configured by your administrator (default for fresh installs: `admin` / `antarpool2026`). "Ingat Saya" keeps you signed in on this device.

### 2. Connection & Database Indicator
Click the connection pill in the top header (next to the AntarPool logo) to inspect backend status:
- 🟢 **Supabase Cloud Live:** Connected directly to Supabase with the active `customers` CRM table.
- 🟡 **Supabase (Mode Fallback):** Supabase connected, but the `customers` SQL migration has not yet been executed in your Supabase project. The app automatically synthesizes CRM profiles from historical bookings. Click *Panduan Setup SQL Supabase* to copy the SQL snippet.
- 🟢 **Live WebSocket:** Connected to the production Node.js Express server with real-time WebSocket synchronization.

### 3. Voice Alerts
Click **Uji Notifikasi** once after opening the page so the browser allows sound. You will hear a chime and an Indonesian voice announcement for each new or cancelled order. Use the speaker toggle to mute. Works best in Chrome/Edge with an Indonesian system voice installed.

### 4. Daily Workflow
1. **Pesanan Masuk (Orders):** Filter by date, payment status, trip status.
   - *Terima Bayar di Pool* – when the passenger pays at the counter.
   - *Check-in Armada* – when the passenger boards (marks the order completed).
   - *Batalkan* – cancel (releases seats immediately; asks for confirmation).
2. **Jadwal & Tarif (Schedules):** Add/edit trips (route, time, price, vehicle), toggle active, adjust fares. Use the date picker to see remaining seats for a given day (*10 Kursi (Sisa 7)*). A schedule with active bookings cannot be deleted — cancel the bookings or deactivate the schedule instead.
3. **Manajemen Armada (Fleet):** Create vehicle models. Choose rows × columns, then click cells to cycle *Kursi → Lorong → Kosong → Supir*. Seats are auto-labelled (1A, 2B …). Assign the vehicle when creating a schedule. Changes to an armada automatically synchronize all linked schedules.
4. **Pelanggan (Customers CRM):** Manage registered passenger profiles and contacts.
   - *Pencarian & Filter:* Cari berdasarkan nama, nomor HP/WhatsApp, email, kota domisili, atau NIK; filter berdasarkan segmen (*VIP*, *Pernah Batal*, *Terblokir*).
   - *Hubungi via WhatsApp:* Tombol langsung 1-klik untuk membuka percakapan WhatsApp dengan penumpang untuk koordinasi penjemputan atau pengumuman keterlambatan.
   - *Status VIP & No-Show:* Tandai penumpang istimewa (*VIP*) atau tandai penumpang bermasalah (*No-Show / Terblokir*).
   - *Catatan Operator:* Simpan catatan preferensi penumpang (misal: "Suka duduk depan", "Bawa koper besar"). Saving displays an instant confirmation notice.
   - *Kelola & Riwayat:* Buka riwayat lengkap tiket dan status pembayaran penumpang tersebut.
5. **Timeline:** Audit trail of every order event (who did what, when).
6. **Statistik:** Paid vs. pending revenue, passenger count, top 5 routes, busiest hours (excludes cancelled orders).

---

### Troubleshooting for Operators
| Symptom | Fix |
|---|---|
| No sound | Click the sound test button; unmute; check tab/system volume and browser autoplay settings |
| Status shows *Terputus…* | Check internet; the page reconnects automatically — otherwise reload |
| Passenger can't find ticket | They must search with the exact phone number used when booking; you can search by booking code |
| Seats still blocked after a cancel | Reload the schedule; cancelled bookings free seats immediately |
| Notice: Mode Fallback Aktif | Open the connection indicator and run the SQL migration script in your Supabase SQL editor |
