import { supabase } from '../supabase';

// 1. Fetch bookings with filters
export async function getBusinessBookings({ date, status, payment_status } = {}) {
  if (!supabase) throw new Error('Supabase client is not configured');
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

// 2. Fetch armadas
export async function getArmadas() {
  if (!supabase) throw new Error('Supabase client is not configured');
  const { data, error } = await supabase
    .from('armadas')
    .select('*')
    .order('id', { ascending: false });
  if (error) throw error;
  return data || [];
}

// 3. Fetch spots
export async function getSpots() {
  if (!supabase) throw new Error('Supabase client is not configured');
  const { data, error } = await supabase
    .from('pooling_spots')
    .select('*')
    .eq('is_active', 1)
    .order('city')
    .order('name');
  if (error) throw error;
  return data || [];
}

// 4. Fetch schedules with seat counts
export async function getBusinessSchedules(targetDate) {
  if (!supabase) throw new Error('Supabase client is not configured');
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

// 5. Update booking status
export async function updateBookingStatus(bookingId, paymentStatus, bookingStatus) {
  if (!supabase) throw new Error('Supabase client is not configured');
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
      await supabase
        .from('booking_seats')
        .update({ status: 'CANCELLED' })
        .eq('booking_id', bookingId);

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

// 6. Save schedule (Add / Edit)
export async function saveSchedule(schData) {
  if (!supabase) throw new Error('Supabase client is not configured');
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
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('schedules').insert([payload]);
    if (error) throw new Error(error.message);
  }
  return { success: true };
}

// 7. Delete schedule
export async function deleteSchedule(scheduleId) {
  if (!supabase) throw new Error('Supabase client is not configured');
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

// 8. Save armada (with schedule layout sync)
export async function saveArmada(armadaData) {
  if (!supabase) throw new Error('Supabase client is not configured');
  const layoutParsed = typeof armadaData.layout_json === 'string'
    ? JSON.parse(armadaData.layout_json)
    : armadaData.layout_json;

  const payload = {
    name: armadaData.name.trim(),
    license_plate: armadaData.license_plate ? armadaData.license_plate.trim() : '',
    rows_count: Number(armadaData.rows_count),
    cols_count: Number(armadaData.cols_count),
    layout_json: layoutParsed,
    total_seats: Number(armadaData.total_seats),
    is_active: 1
  };

  if (armadaData.id) {
    const { error } = await supabase.from('armadas').update(payload).eq('id', armadaData.id);
    if (error) throw new Error(error.message);

    // Sync updated armada layout, capacity, and model to all schedules assigned to this armada
    try {
      await supabase
        .from('schedules')
        .update({
          total_seats: Number(armadaData.total_seats),
          vehicle_layout: layoutParsed,
          vehicle_model: armadaData.name.trim()
        })
        .eq('armada_id', armadaData.id);
    } catch (syncErr) {
      console.warn('Failed to sync updated armada to schedules:', syncErr);
    }
  } else {
    const { error } = await supabase.from('armadas').insert([payload]);
    if (error) throw new Error(error.message);
  }
  return { success: true };
}

// 9. Delete armada
export async function deleteArmada(armadaId) {
  if (!supabase) throw new Error('Supabase client is not configured');
  const { error } = await supabase.from('armadas').delete().eq('id', armadaId);
  if (error) throw error;
  return { success: true };
}

// 10. Fetch timeline
export async function getTimeline() {
  if (!supabase) throw new Error('Supabase client is not configured');
  const { data, error } = await supabase
    .from('order_timeline_events')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// 11. Fetch analytics
export async function getAnalytics() {
  if (!supabase) throw new Error('Supabase client is not configured');
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

// 12. Fetch customers directory (CRM)
export async function getCustomers() {
  if (!supabase) return [];

  // Try fetching from customers table
  const { data: dbCustomers } = await supabase
    .from('customers')
    .select('*')
    .order('is_vip', { ascending: false });

  // Also fetch bookings to calculate aggregate metrics
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, booking_code, travel_date, customer_phone, customer_name, customer_email, auth_method, total_price, payment_status, booking_status');

  const bookingsByPhone = {};
  (bookings || []).forEach((b) => {
    if (!b.customer_phone) return;
    if (!bookingsByPhone[b.customer_phone]) {
      bookingsByPhone[b.customer_phone] = [];
    }
    bookingsByPhone[b.customer_phone].push(b);
  });

  // If customers table has data, enrich it
  if (dbCustomers && dbCustomers.length > 0) {
    return dbCustomers.map((c) => {
      const cBookings = bookingsByPhone[c.phone] || [];
      const total_trips = cBookings.length;
      const completed_trips = cBookings.filter((b) => b.booking_status !== 'CANCELLED').length;
      const cancelled_trips = cBookings.filter((b) => b.booking_status === 'CANCELLED').length;
      const total_spent = cBookings
        .filter((b) => b.booking_status !== 'CANCELLED' && b.payment_status === 'PAID')
        .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
      const last_travel_date = cBookings.reduce((max, b) => (!max || b.travel_date > max ? b.travel_date : max), null);

      return {
        ...c,
        total_trips,
        completed_trips,
        cancelled_trips,
        total_spent,
        last_travel_date
      };
    });
  }

  // Fallback: If customers table is empty, derive from bookings
  const derived = Object.entries(bookingsByPhone).map(([phone, bList], index) => {
    const first = bList[0];
    const total_trips = bList.length;
    const completed_trips = bList.filter((b) => b.booking_status !== 'CANCELLED').length;
    const cancelled_trips = bList.filter((b) => b.booking_status === 'CANCELLED').length;
    const total_spent = bList
      .filter((b) => b.booking_status !== 'CANCELLED' && b.payment_status === 'PAID')
      .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
    const last_travel_date = bList.reduce((max, b) => (!max || b.travel_date > max ? b.travel_date : max), null);

    return {
      id: index + 1,
      phone,
      name: first.customer_name || 'Pelanggan',
      email: first.customer_email || '',
      auth_method: first.auth_method || 'phone',
      is_vip: false,
      is_blacklisted: false,
      notes: '',
      total_trips,
      completed_trips,
      cancelled_trips,
      total_spent,
      last_travel_date,
      created_at: first.created_at || new Date().toISOString()
    };
  });

  return derived;
}

// 13. Fetch single customer booking history
export async function getCustomerBookings(phone) {
  if (!supabase || !phone) return [];
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, booking_code, schedule_id, travel_date, customer_name, customer_phone,
      seat_numbers, seats_count, price_per_seat, total_price, payment_method,
      payment_status, booking_status, created_at,
      schedule:schedules!schedule_id(
        departure_time, vehicle_model,
        origin:pooling_spots!origin_spot_id(name, city),
        destination:pooling_spots!destination_spot_id(name, city)
      )
    `)
    .eq('customer_phone', phone)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching customer bookings from Supabase:', error);
    return [];
  }

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

// 14. Update customer record (VIP, Blacklist, Notes)
export async function updateCustomer(id, customerData) {
  if (!supabase) return { success: false, error: 'Supabase client not initialized' };

  const { data, error } = await supabase
    .from('customers')
    .update({
      ...customerData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating customer in Supabase:', error);
    return { success: false, error: error.message };
  }

  return { success: true, customer: data };
}

