const API_BASE = import.meta.env.VITE_API_URL || '';

function getAuthHeaders() {
  const token = localStorage.getItem('antarpool_operator_token') || sessionStorage.getItem('antarpool_operator_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// 1. Fetch bookings with filters
export async function getBusinessBookings({ date, status, payment_status } = {}) {
  let url = `${API_BASE}/api/business/bookings?`;
  if (date) url += `date=${encodeURIComponent(date)}&`;
  if (payment_status) url += `payment_status=${encodeURIComponent(payment_status)}&`;
  if (status) url += `status=${encodeURIComponent(status)}&`;

  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal memuat pesanan');
  }
  return res.json();
}

// 2. Fetch armadas
export async function getArmadas() {
  const res = await fetch(`${API_BASE}/api/armadas`, { headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal memuat armada');
  }
  return res.json();
}

// 3. Fetch spots
export async function getSpots() {
  const res = await fetch(`${API_BASE}/api/spots`, { headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal memuat pooling spots');
  }
  return res.json();
}

// 4. Fetch schedules with seat counts
export async function getBusinessSchedules(targetDate) {
  const res = await fetch(`${API_BASE}/api/business/schedules?date=${encodeURIComponent(targetDate)}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal memuat jadwal armada');
  }
  return res.json();
}

// 5. Update booking status
export async function updateBookingStatus(bookingId, paymentStatus, bookingStatus) {
  const res = await fetch(`${API_BASE}/api/business/bookings/${bookingId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ payment_status: paymentStatus, booking_status: bookingStatus })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Gagal memperbarui status pesanan');
  }
  return data;
}

// 6. Save schedule (Add / Edit)
export async function saveSchedule(schData) {
  const url = schData.id
    ? `${API_BASE}/api/business/schedules/${schData.id}`
    : `${API_BASE}/api/business/schedules`;
  const method = schData.id ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: getAuthHeaders(),
    body: JSON.stringify(schData)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Gagal menyimpan jadwal');
  }
  return { success: true, ...data };
}

// 7. Delete schedule
export async function deleteSchedule(scheduleId) {
  const res = await fetch(`${API_BASE}/api/business/schedules/${scheduleId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Gagal menghapus jadwal');
  }
  return data;
}

// 8. Save armada
export async function saveArmada(armadaData) {
  const url = armadaData.id
    ? `${API_BASE}/api/armadas/${armadaData.id}`
    : `${API_BASE}/api/armadas`;
  const method = armadaData.id ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: getAuthHeaders(),
    body: JSON.stringify(armadaData)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Gagal menyimpan data armada');
  }
  return { success: true, ...data };
}

// 9. Delete armada
export async function deleteArmada(armadaId) {
  const res = await fetch(`${API_BASE}/api/armadas/${armadaId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Gagal menghapus armada');
  }
  return data;
}

// 10. Fetch timeline
export async function getTimeline() {
  const res = await fetch(`${API_BASE}/api/business/timeline`, { headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal memuat timeline pesanan');
  }
  return res.json();
}

// 11. Fetch analytics
export async function getAnalytics() {
  const res = await fetch(`${API_BASE}/api/business/analytics`, { headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal memuat statistik analitik');
  }
  return res.json();
}

// 12. Fetch customers directory (CRM)
export async function getCustomers() {
  const res = await fetch(`${API_BASE}/api/business/customers`, { headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal memuat data pelanggan');
  }
  const data = await res.json();
  if (Array.isArray(data)) {
    data._source = 'rest';
    data._isFallback = false;
  }
  return data;
}

// 13. Fetch single customer booking history
export async function getCustomerBookings(phone) {
  const res = await fetch(`${API_BASE}/api/business/customers/${encodeURIComponent(phone)}/bookings`, { headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal memuat riwayat tiket pelanggan');
  }
  return res.json();
}

// 14. Update customer record (VIP, Blacklist, Notes)
export async function updateCustomer(id, customerData) {
  const res = await fetch(`${API_BASE}/api/business/customers/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(customerData)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Gagal memperbarui data pelanggan');
  }
  return {
    ...data,
    source: 'rest',
    isFallback: false,
    notice: 'Perubahan profil pelanggan berhasil disimpan ke database SQLite server!'
  };
}

