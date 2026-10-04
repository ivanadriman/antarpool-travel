# User Guide

The apps are in Indonesian; Indonesian labels are shown in *italics*.

## Passengers (Client app)

### Book a ticket
1. Open the app and sign in (*Masuk*) with phone (OTP), email, or Google, and enter your name.
   > Prototype note: OTP verification is simulated — any code of 4+ digits (e.g. `1234`) is accepted; Google login is not real.
2. Choose **departure pool** (*Pool Keberangkatan*) first, then **destination** (*Pool Kedatangan*) and the **date**. Past dates are blocked.
3. Pick a departure time. Cards show vehicle and remaining seats; *Penuh* = sold out.
4. Tap seats on the cabin map (grey = taken). The total price updates live.
5. Confirm. You pay **at the departure pool** when you arrive (*Bayar di Tempat*).
6. You receive a boarding pass with booking code (`TRV-…`) and QR code.

### Manage tickets
- Open **Tiket Saya** to see your tickets (found by your phone number).
- Status labels: *Menunggu Bayar di Pool* (not yet paid), *Sudah Lunas* (paid), *Dibatalkan* (cancelled).
- **Cancel:** from the list or the boarding pass, any time before check-in. Seats are released immediately; nothing is charged.

## Operators (Business app)

### Sign in
Use the operator username/password configured by your administrator (default for fresh installs: `admin` / `antarpool2026` — **change it**). "Remember me" keeps you signed in on this device.

### Voice alerts
Click **Uji Notifikasi Suara** once after opening the page so the browser allows sound. You will hear a chime and an Indonesian announcement for each new or cancelled order. Use the speaker toggle to mute. Works best in Chrome/Edge with an Indonesian system voice installed.

### Daily workflow
1. **Pesanan (Orders):** filter by date, payment status, trip status.
   - *Terima Bayar* – when the passenger pays at the counter.
   - *Check-in* – when the passenger boards (marks the order completed).
   - *Batalkan* – cancel (releases seats; asks for confirmation).
2. **Jadwal & Tarif (Schedules):** add/edit trips (route, time, price, vehicle), toggle active, adjust fares. Use the date picker to see remaining seats for a given day (*10 Kursi (Sisa 7)*). A schedule with active bookings cannot be deleted — cancel the bookings or deactivate the schedule instead.
3. **Manajemen Armada (Fleet):** create vehicles. Choose rows × columns, then click cells to cycle *Kursi → Lorong → Kosong → Supir*. Seats are auto-labelled (1A, 2B …). Assign the vehicle when creating a schedule.
4. **Timeline:** audit trail of every order event (who did what, when); search by code/name/phone.
5. **Statistik & Laporan:** paid vs. pending revenue, passenger count, top 5 routes, busiest hours (excludes cancelled orders; all-time, no date range).

### Troubleshooting for operators
| Symptom | Fix |
|---|---|
| No sound | Click the sound test button; unmute; check tab/system volume and browser autoplay settings |
| Status shows *Terputus…* | Check internet; the page reconnects automatically — otherwise reload |
| Passenger can't find ticket | They must search with the exact phone number used when booking; you can search by booking code |
| Seats still blocked after a cancel | Reload the schedule; cancelled bookings free seats immediately |
