const API_BASE = import.meta.env.VITE_API_URL || '';

// 1. Fetch pooling spots
export async function getSpots() {
  const res = await fetch(`${API_BASE}/api/spots`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal memuat pooling spots');
  }
  return res.json();
}

// 2. Fetch schedules with remaining seats
export async function getSchedules(originId, destId, travelDate) {
  const res = await fetch(`${API_BASE}/api/schedules?origin=${originId}&destination=${destId}&date=${travelDate}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal memuat jadwal perjalanan');
  }
  return res.json();
}

// 3. Create booking with collision safety
export async function createBooking(payload) {
  const res = await fetch(`${API_BASE}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Gagal memesan tiket');
  }
  return data;
}

// 4. Lookup my bookings
export async function lookupBookings({ phone, code }) {
  const param = phone ? `phone=${encodeURIComponent(phone)}` : `code=${encodeURIComponent(code || '')}`;
  const res = await fetch(`${API_BASE}/api/bookings/lookup?${param}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal mencari tiket');
  }
  return res.json();
}

// 5. Cancel booking
export async function cancelBooking(bookingId, phone) {
  const res = await fetch(`${API_BASE}/api/bookings/${bookingId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Gagal membatalkan tiket');
  }
  return data;
}
