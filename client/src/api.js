import { supabase, isSupabaseConfigured } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || '';

// 1. Fetch pooling spots
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

// 2. Fetch schedules with remaining seats
export async function getSchedules(originId, destId, travelDate) {
  if (isSupabaseConfigured) {
    const { data: schedules, error } = await supabase
      .from('schedules')
      .select(`
        *,
        origin:pooling_spots!origin_spot_id(name, city, address),
        destination:pooling_spots!destination_spot_id(name, city, address),
        armada:armadas(name, license_plate)
      `)
      .eq('origin_spot_id', originId)
      .eq('destination_spot_id', destId)
      .eq('is_active', 1)
      .order('departure_time', { ascending: true });

    if (error) throw error;

    // For each schedule, find booked seats on travelDate
    const enriched = await Promise.all(
      (schedules || []).map(async (sch) => {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('seat_numbers')
          .eq('schedule_id', sch.id)
          .eq('travel_date', travelDate)
          .neq('booking_status', 'CANCELLED');

        let bookedSeats = [];
        (bookings || []).forEach((b) => {
          let seats = b.seat_numbers;
          if (typeof seats === 'string') {
            try { seats = JSON.parse(seats); } catch (e) {}
          }
          if (Array.isArray(seats)) bookedSeats.push(...seats);
        });

        const availableCount = Math.max(0, (sch.total_seats || 10) - bookedSeats.length);

        return {
          ...sch,
          origin_name: sch.origin?.name,
          origin_city: sch.origin?.city,
          origin_address: sch.origin?.address,
          destination_name: sch.destination?.name,
          destination_city: sch.destination?.city,
          destination_address: sch.destination?.address,
          travel_date: travelDate,
          booked_seats: bookedSeats,
          available_seats_count: availableCount,
          is_sold_out: availableCount === 0
        };
      })
    );

    return enriched;
  }

  const res = await fetch(`${API_BASE}/api/schedules?origin=${originId}&destination=${destId}&date=${travelDate}`);
  return res.json();
}

// 3. Create booking with collision safety
export async function createBooking(payload) {
  const { schedule_id, travel_date, customer_name, customer_phone, customer_email, auth_method, seat_numbers } = payload;

  if (isSupabaseConfigured) {
    // Check if seats already taken
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('seat_numbers')
      .eq('schedule_id', schedule_id)
      .eq('travel_date', travel_date)
      .neq('booking_status', 'CANCELLED');

    const alreadyTaken = new Set();
    (existingBookings || []).forEach((b) => {
      let seats = b.seat_numbers;
      if (typeof seats === 'string') {
        try { seats = JSON.parse(seats); } catch (e) {}
      }
      if (Array.isArray(seats)) seats.forEach((s) => alreadyTaken.add(s));
    });

    const collision = seat_numbers.filter((s) => alreadyTaken.has(s));
    if (collision.length > 0) {
      throw new Error(`Kursi ${collision.join(', ')} sudah dipesan oleh penumpang lain.`);
    }

    // Get schedule details for ticket pass & pricing
    const { data: sch } = await supabase
      .from('schedules')
      .select(`
        *,
        origin:pooling_spots!origin_spot_id(name, city, address),
        destination:pooling_spots!destination_spot_id(name, city, address)
      `)
      .eq('id', schedule_id)
      .single();

    const pricePerSeat = sch?.price || 95000;
    const seatsCount = seat_numbers.length;
    const totalPrice = pricePerSeat * seatsCount;

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const bookingCode = `TRV-${travel_date.replace(/-/g, '').slice(2)}-${randomSuffix}`;

    const newBooking = {
      booking_code: bookingCode,
      schedule_id,
      travel_date,
      customer_name,
      customer_phone: customer_phone || '',
      customer_email: customer_email || '',
      auth_method: auth_method || 'phone',
      seat_numbers,
      seats_count: seatsCount,
      price_per_seat: pricePerSeat,
      total_price: totalPrice,
      payment_method: 'Bayar di Tempat (Pool)',
      payment_status: 'PENDING',
      booking_status: 'CONFIRMED'
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('bookings')
      .insert([newBooking])
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Log timeline
    try {
      await supabase.from('order_timeline_events').insert([{
        booking_id: inserted.id,
        booking_code: bookingCode,
        event_type: 'ORDER_PLACED',
        actor_role: 'CUSTOMER',
        description: `Pesanan baru dibuat oleh ${customer_name} (${seatsCount} kursi: ${seat_numbers.join(', ')})`,
        details_json: { seats: seat_numbers, total_price: totalPrice, travel_date, departure_time: sch?.departure_time }
      }]);
    } catch (e) {}

    return {
      ...inserted,
      departure_time: sch?.departure_time,
      origin_name: sch?.origin?.name,
      origin_city: sch?.origin?.city,
      origin_address: sch?.origin?.address,
      destination_name: sch?.destination?.name,
      destination_city: sch?.destination?.city,
      destination_address: sch?.destination?.address,
      vehicle_model: sch?.vehicle_model
    };
  }

  const res = await fetch(`${API_BASE}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memesan tiket');
  return data;
}

// 4. Lookup my bookings
export async function lookupBookings({ phone, code }) {
  if (isSupabaseConfigured) {
    let query = supabase
      .from('bookings')
      .select(`
        *,
        schedule:schedules!schedule_id (
          departure_time, vehicle_model,
          origin:pooling_spots!origin_spot_id(name, city, address),
          destination:pooling_spots!destination_spot_id(name, city, address)
        )
      `)
      .order('created_at', { ascending: false });

    if (phone) query = query.eq('customer_phone', phone);
    if (code) query = query.eq('booking_code', code.toUpperCase());

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((b) => ({
      ...b,
      departure_time: b.schedule?.departure_time,
      vehicle_model: b.schedule?.vehicle_model,
      origin_name: b.schedule?.origin?.name,
      origin_city: b.schedule?.origin?.city,
      origin_address: b.schedule?.origin?.address,
      destination_name: b.schedule?.destination?.name,
      destination_city: b.schedule?.destination?.city,
      destination_address: b.schedule?.destination?.address
    }));
  }

  const param = phone ? `phone=${encodeURIComponent(phone)}` : `code=${encodeURIComponent(code || '')}`;
  const res = await fetch(`${API_BASE}/api/bookings/lookup?${param}`);
  return res.json();
}

// 5. Cancel booking
export async function cancelBooking(bookingId, phone) {
  if (isSupabaseConfigured) {
    const { data: updated, error } = await supabase
      .from('bookings')
      .update({ booking_status: 'CANCELLED', payment_status: 'CANCELLED' })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;

    try {
      await supabase.from('order_timeline_events').insert([{
        booking_id: bookingId,
        booking_code: updated.booking_code,
        event_type: 'ORDER_CANCELLED',
        actor_role: 'CUSTOMER',
        description: `Pesanan tiket dibatalkan secara mandiri oleh pelanggan (Tiket Saya)`
      }]);
    } catch (e) {}

    return updated;
  }

  const res = await fetch(`${API_BASE}/api/bookings/${bookingId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal membatalkan tiket');
  return data;
}
