import { supabase, isSupabaseConfigured } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || '';

// 1. Fetch bookings with filters
export async function getBusinessBookings({ date, status, payment_status }) {
  if (isSupabaseConfigured) {
    let query = supabase
      .from('bookings')
      .select(`
        *,
        schedule:schedules!schedule_id (
          departure_time, vehicle_model,
          origin:pooling_spots!origin_spot_id(name, city),
          destination:pooling_spots!destination_spot_id(name, city)
        )
      `)
      .order('created_at', { ascending: false });

    if (date) query = query.eq('travel_date', date);
    if (status) query = query.eq('booking_status', status);
    if (payment_status) query = query.eq('payment_status', payment_status);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((b) => ({
      ...b,
      departure_time: b.schedule?.departure_time,
      vehicle_model: b.schedule?.vehicle_model,
      origin_name: b.schedule?.origin?.name,
      origin_city: b.schedule?.origin?.city,
      destination_name: b.schedule?.destination?.name,
      destination_city: b.schedule?.destination?.city
    }));
  }

  let url = `${API_BASE}/api/business/bookings?`;
  if (date) url += `date=${date}&`;
  if (payment_status) url += `payment_status=${payment_status}&`;
  if (status) url += `status=${status}&`;
  const res = await fetch(url);
  return res.json();
}

// 2. Fetch armadas
export async function getArmadas() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('armadas')
      .select('*')
      .order('id', { ascending: false });
    if (error) throw error;
    return data || [];
  }
  const res = await fetch(`${API_BASE}/api/armadas`);
  return res.json();
}

// 3. Fetch spots
export async function getSpots() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('pooling_spots')
      .select('*')
      .eq('is_active', 1)
      .order('city')
      .order('name');
    if (error) throw error;
    return data || [];
  }
  const res = await fetch(`${API_BASE}/api/spots`);
  return res.json();
}

// 4. Fetch schedules with seat counts
export async function getBusinessSchedules(targetDate) {
  if (isSupabaseConfigured) {
    const { data: schedules, error } = await supabase
      .from('schedules')
      .select(`
        *,
        origin:pooling_spots!origin_spot_id(name, city),
        destination:pooling_spots!destination_spot_id(name, city),
        armada:armadas(name, license_plate)
      `)
      .order('departure_time', { ascending: true });

    if (error) throw error;

    const enriched = await Promise.all(
      (schedules || []).map(async (sch) => {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('seat_numbers')
          .eq('schedule_id', sch.id)
          .eq('travel_date', targetDate)
          .neq('booking_status', 'CANCELLED');

        let bookedCount = 0;
        (bookings || []).forEach((b) => {
          let seats = b.seat_numbers;
          if (typeof seats === 'string') {
            try { seats = JSON.parse(seats); } catch (e) {}
          }
          if (Array.isArray(seats)) bookedCount += seats.length;
        });

        return {
          ...sch,
          origin_name: sch.origin?.name,
          origin_city: sch.origin?.city,
          destination_name: sch.destination?.name,
          destination_city: sch.destination?.city,
          armada_name: sch.armada?.name,
          armada_plate: sch.armada?.license_plate,
          filter_date: targetDate,
          booked_seats_count: bookedCount,
          remaining_seats: Math.max(0, (sch.total_seats || 10) - bookedCount)
        };
      })
    );

    return enriched;
  }

  const res = await fetch(`${API_BASE}/api/business/schedules?date=${targetDate}`);
  return res.json();
}

// 5. Update booking status
export async function updateBookingStatus(bookingId, paymentStatus, bookingStatus) {
  if (isSupabaseConfigured) {
    const updates = {};
    if (paymentStatus) updates.payment_status = paymentStatus;
    if (bookingStatus) updates.booking_status = bookingStatus;

    const { data: updated, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', bookingId)
      .select(`
        *,
        schedule:schedules!schedule_id (
          departure_time, vehicle_model,
          origin:pooling_spots!origin_spot_id(name, city),
          destination:pooling_spots!destination_spot_id(name, city)
        )
      `)
      .single();

    if (error) throw error;

    // Log timeline
    try {
      const isCancelled = bookingStatus === 'CANCELLED' || paymentStatus === 'CANCELLED';
      if (isCancelled) {
        await supabase.from('order_timeline_events').insert([{
          booking_id: bookingId,
          booking_code: updated.booking_code,
          event_type: 'ORDER_CANCELLED',
          actor_role: 'OPERATOR',
          description: `Pesanan tiket dibatalkan oleh operator pool & kursi dilepaskan`
        }]);
      } else if (paymentStatus === 'PAID') {
        await supabase.from('order_timeline_events').insert([{
          booking_id: bookingId,
          booking_code: updated.booking_code,
          event_type: 'PAYMENT_RECEIVED',
          actor_role: 'OPERATOR',
          description: `Pembayaran senilai Rp ${Number(updated.total_price).toLocaleString('id-ID')} diverifikasi di pool`
        }]);
      } else if (bookingStatus === 'COMPLETED') {
        await supabase.from('order_timeline_events').insert([{
          booking_id: bookingId,
          booking_code: updated.booking_code,
          event_type: 'PASSENGER_CHECKED_IN',
          actor_role: 'OPERATOR',
          description: `Penumpang telah check-in dan naik ke armada travel`
        }]);
      }
    } catch (e) {}

    return {
      ...updated,
      departure_time: updated.schedule?.departure_time,
      vehicle_model: updated.schedule?.vehicle_model,
      origin_name: updated.schedule?.origin?.name,
      origin_city: updated.schedule?.origin?.city,
      destination_name: updated.schedule?.destination?.name,
      destination_city: updated.schedule?.destination?.city
    };
  }

  const res = await fetch(`${API_BASE}/api/business/bookings/${bookingId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payment_status: paymentStatus, booking_status: bookingStatus })
  });
  return res.json();
}

// 6. Save schedule (Add / Edit)
export async function saveSchedule(schData) {
  if (isSupabaseConfigured) {
    const payload = {
      origin_spot_id: schData.origin_spot_id,
      destination_spot_id: schData.destination_spot_id,
      departure_time: schData.departure_time,
      price: schData.price,
      total_seats: schData.total_seats || 10,
      armada_id: schData.armada_id || null,
      vehicle_model: schData.vehicle_model || 'Toyota HiAce Premio',
      vehicle_layout: schData.vehicle_layout || null,
      is_active: schData.is_active ?? 1
    };

    if (schData.id) {
      const { error } = await supabase.from('schedules').update(payload).eq('id', schData.id);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase.from('schedules').insert([payload]);
      if (error) return { success: false, error: error.message };
    }
    return { success: true };
  }

  const res = await fetch(schData.id ? `${API_BASE}/api/business/schedules/${schData.id}` : `${API_BASE}/api/business/schedules`, {
    method: schData.id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(schData)
  });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error };
  return { success: true };
}

// 7. Delete schedule
export async function deleteSchedule(scheduleId) {
  if (isSupabaseConfigured) {
    const { data: activeOrders } = await supabase
      .from('bookings')
      .select('id')
      .eq('schedule_id', scheduleId)
      .neq('booking_status', 'CANCELLED');

    if (activeOrders && activeOrders.length > 0) {
      throw new Error(`Tidak dapat menghapus jadwal karena masih ada ${activeOrders.length} pesanan aktif.`);
    }

    const { error } = await supabase.from('schedules').delete().eq('id', scheduleId);
    if (error) throw error;
    return { success: true };
  }

  const res = await fetch(`${API_BASE}/api/business/schedules/${scheduleId}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

// 8. Save armada
export async function saveArmada(armadaData) {
  if (isSupabaseConfigured) {
    const payload = {
      name: armadaData.name.trim(),
      license_plate: armadaData.license_plate ? armadaData.license_plate.trim() : '',
      rows_count: Number(armadaData.rows_count),
      cols_count: Number(armadaData.cols_count),
      layout_json: typeof armadaData.layout_json === 'string' ? JSON.parse(armadaData.layout_json) : armadaData.layout_json,
      total_seats: Number(armadaData.total_seats),
      is_active: 1
    };

    if (armadaData.id) {
      const { error } = await supabase.from('armadas').update(payload).eq('id', armadaData.id);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase.from('armadas').insert([payload]);
      if (error) return { success: false, error: error.message };
    }
    return { success: true };
  }

  const res = await fetch(armadaData.id ? `${API_BASE}/api/armadas/${armadaData.id}` : `${API_BASE}/api/armadas`, {
    method: armadaData.id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(armadaData)
  });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error };
  return { success: true };
}

// 9. Delete armada
export async function deleteArmada(armadaId) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('armadas').delete().eq('id', armadaId);
    if (error) throw error;
    return { success: true };
  }
  const res = await fetch(`${API_BASE}/api/armadas/${armadaId}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

// 10. Fetch timeline
export async function getTimeline() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('order_timeline_events')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
  const res = await fetch(`${API_BASE}/api/business/timeline`);
  return res.json();
}

// 11. Fetch analytics
export async function getAnalytics() {
  if (isSupabaseConfigured) {
    const { data: bookings } = await supabase
      .from('bookings')
      .select(`
        *,
        schedule:schedules!schedule_id (
          departure_time,
          origin:pooling_spots!origin_spot_id(name),
          destination:pooling_spots!destination_spot_id(name)
        )
      `)
      .neq('booking_status', 'CANCELLED');

    let paidRevenue = 0;
    let pendingRevenue = 0;
    let totalPassengers = 0;
    const routeCounts = {};
    const timeCounts = {};

    (bookings || []).forEach((b) => {
      const price = Number(b.total_price) || 0;
      if (b.payment_status === 'PAID') paidRevenue += price;
      else pendingRevenue += price;
      totalPassengers += Number(b.seats_count) || 1;

      const origin = b.schedule?.origin?.name || 'Asal';
      const dest = b.schedule?.destination?.name || 'Tujuan';
      const rKey = `${origin} -> ${dest}`;
      routeCounts[rKey] = (routeCounts[rKey] || { count: 0, amount: 0 });
      routeCounts[rKey].count += 1;
      routeCounts[rKey].amount += price;

      const tKey = b.schedule?.departure_time || '08:00';
      timeCounts[tKey] = (timeCounts[tKey] || { count: 0, seats: 0 });
      timeCounts[tKey].count += 1;
      timeCounts[tKey].seats += Number(b.seats_count) || 1;
    });

    const topRoutes = Object.entries(routeCounts).map(([route_name, val]) => ({
      route_name,
      booking_count: val.count,
      total_amount: val.amount
    })).sort((a, b) => b.total_amount - a.total_amount).slice(0, 5);

    const timeDist = Object.entries(timeCounts).map(([departure_time, val]) => ({
      departure_time,
      booking_count: val.count,
      seats_booked: val.seats
    })).sort((a, b) => a.departure_time.localeCompare(b.departure_time));

    return {
      total_bookings: (bookings || []).length,
      paid_revenue: paidRevenue,
      pending_revenue: pendingRevenue,
      total_passengers: totalPassengers,
      top_routes: topRoutes,
      time_distribution: timeDist
    };
  }

  const res = await fetch(`${API_BASE}/api/business/analytics`);
  return res.json();
}
