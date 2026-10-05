import { Router } from 'express';
import crypto from 'crypto';
import { dbAll, dbGet, dbRun, withTransaction, upsertCustomer } from '../db.js';
import { requireOperator, verifyJwt } from '../middleware/auth.js';
import { broadcastToBusiness } from '../websocket.js';

export const bookingsRouter = Router();
export const businessBookingsRouter = Router();

// ==========================================
// PASSENGER BOOKING ROUTES (/api/bookings)
// ==========================================

// 1. Create booking (atomic seat allocation)
bookingsRouter.post('/', async (req, res) => {
  try {
    const {
      schedule_id,
      travel_date,
      customer_name,
      customer_phone,
      customer_email,
      customer_city,
      customer_id_card,
      city,
      id_card,
      auth_method,
      seat_numbers
    } = req.body;

    if (!schedule_id || !travel_date || !customer_name || !seat_numbers || seat_numbers.length === 0) {
      return res.status(400).json({ error: 'Missing required booking fields or seats' });
    }

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (travel_date < todayStr) {
      return res.status(400).json({ error: 'Tidak dapat memesan tiket untuk tanggal yang sudah lewat.' });
    }

    const schedule = await dbGet(
      `SELECT s.*, 
              origin.name as origin_name, origin.city as origin_city, origin.address as origin_address,
              dest.name as destination_name, dest.city as destination_city, dest.address as destination_address
       FROM schedules s
       JOIN pooling_spots origin ON s.origin_spot_id = origin.id
       JOIN pooling_spots dest ON s.destination_spot_id = dest.id
       WHERE s.id = ?`,
      [schedule_id]
    );

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    if (travel_date === todayStr && schedule.departure_time) {
      const [depH, depM] = schedule.departure_time.split(':').map(Number);
      const depMinutes = depH * 60 + depM;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      if (currentMinutes >= depMinutes) {
        return res.status(400).json({ error: `Jadwal keberangkatan pukul ${schedule.departure_time} untuk hari ini telah lewat.` });
      }
    }

    const seatsCount = seat_numbers.length;
    const pricePerSeat = schedule.price;
    const totalPrice = pricePerSeat * seatsCount;

    let newBooking;
    try {
      newBooking = await withTransaction(async () => {
        const placeholders = seat_numbers.map(() => '?').join(',');
        const takenRows = await dbAll(
          `SELECT seat_number FROM booking_seats 
           WHERE schedule_id = ? AND travel_date = ? AND status != 'CANCELLED' AND seat_number IN (${placeholders})`,
          [schedule_id, travel_date, ...seat_numbers]
        );

        if (takenRows && takenRows.length > 0) {
          const collisions = takenRows.map((r) => r.seat_number);
          const collisionErr = new Error(`Kursi ${collisions.join(', ')} sudah dipesan oleh penumpang lain. Silakan pilih kursi lain.`);
          collisionErr.statusCode = 409;
          collisionErr.collision = collisions;
          throw collisionErr;
        }

        let bookingCode = '';
        for (let attempt = 0; attempt < 5; attempt++) {
          const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
          const candidateCode = `TRV-${travel_date.replace(/-/g, '').slice(2)}-${randomSuffix}`;
          const exists = await dbGet('SELECT id FROM bookings WHERE booking_code = ?', [candidateCode]);
          if (!exists) {
            bookingCode = candidateCode;
            break;
          }
        }
        if (!bookingCode) {
          bookingCode = `TRV-${travel_date.replace(/-/g, '').slice(2)}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
        }

        const insertResult = await dbRun(
          `INSERT INTO bookings 
           (booking_code, schedule_id, travel_date, customer_name, customer_phone, customer_email, auth_method, seat_numbers, seats_count, price_per_seat, total_price, payment_method, payment_status, booking_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Bayar di Tempat (Pool)', 'PENDING', 'CONFIRMED')`,
          [
            bookingCode,
            schedule_id,
            travel_date,
            customer_name,
            customer_phone || '',
            customer_email || '',
            auth_method || 'phone',
            JSON.stringify(seat_numbers),
            seatsCount,
            pricePerSeat,
            totalPrice
          ]
        );

        const bookingId = insertResult.lastID;

        for (const seat of seat_numbers) {
          await dbRun(
            `INSERT INTO booking_seats (booking_id, schedule_id, travel_date, seat_number, status)
             VALUES (?, ?, ?, ?, 'CONFIRMED')`,
            [bookingId, schedule_id, travel_date, seat]
          );
        }

        await dbRun(
          `INSERT INTO order_timeline_events (booking_id, booking_code, event_type, actor_role, description, details_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            bookingId,
            bookingCode,
            'ORDER_PLACED',
            'CUSTOMER',
            `Pesanan baru dibuat oleh ${customer_name} (${seatsCount} kursi: ${seat_numbers.join(', ')})`,
            JSON.stringify({ seats: seat_numbers, total_price: totalPrice, travel_date, departure_time: schedule.departure_time }),
            new Date().toISOString()
          ]
        );

        return {
          id: bookingId,
          booking_code: bookingCode,
          schedule_id,
          travel_date,
          customer_name,
          customer_phone,
          customer_email,
          seat_numbers,
          seats_count: seatsCount,
          price_per_seat: pricePerSeat,
          total_price: totalPrice,
          payment_method: 'Bayar di Tempat (Pool)',
          payment_status: 'PENDING',
          booking_status: 'CONFIRMED',
          departure_time: schedule.departure_time,
          origin_name: schedule.origin_name,
          origin_city: schedule.origin_city,
          origin_address: schedule.origin_address,
          destination_name: schedule.destination_name,
          destination_city: schedule.destination_city,
          destination_address: schedule.destination_address,
          vehicle_model: schedule.vehicle_model,
          created_at: new Date().toISOString()
        };
      });
    } catch (txErr) {
      if (txErr.statusCode === 409) {
        return res.status(409).json({
          error: txErr.message,
          collision: txErr.collision || seat_numbers
        });
      }
      if (txErr.message && (txErr.message.includes('UNIQUE constraint failed') || txErr.message.includes('constraint'))) {
        return res.status(409).json({
          error: 'Salah satu kursi yang dipilih baru saja dipesan oleh penumpang lain.',
          collision: seat_numbers
        });
      }
      throw txErr;
    }

    if (customer_phone) {
      try {
        await upsertCustomer({
          phone: customer_phone,
          name: customer_name,
          email: customer_email,
          auth_method: auth_method || 'phone',
          city: customer_city || city || '',
          id_card: customer_id_card || id_card || ''
        });
      } catch (custErr) {
        console.error('Failed to upsert customer:', custErr);
      }
    }

    const voiceText = `Pesanan baru dari ${schedule.origin_name} ke ${schedule.destination_name}. Pemesan ${customer_name}, ${seatsCount} kursi, keberangkatan pukul ${schedule.departure_time}.`;

    broadcastToBusiness({
      type: 'NEW_BOOKING',
      booking: newBooking,
      voiceText: voiceText,
      timestamp: Date.now()
    });

    return res.status(201).json(newBooking);
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ error: 'Gagal membuat pesanan', details: err.message });
  }
});

// 2. Lookup booking by code or phone
bookingsRouter.get('/lookup', async (req, res) => {
  try {
    const { code, phone } = req.query;
    let query = `
      SELECT b.*, 
             s.departure_time, s.vehicle_model,
             origin.name as origin_name, origin.city as origin_city, origin.address as origin_address,
             dest.name as destination_name, dest.city as destination_city, dest.address as destination_address
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.id
      JOIN pooling_spots origin ON s.origin_spot_id = origin.id
      JOIN pooling_spots dest ON s.destination_spot_id = dest.id
    `;
    let params = [];

    if (code) {
      query += ` WHERE b.booking_code = ?`;
      params.push(code.trim().toUpperCase());
      const booking = await dbGet(query, params);
      if (!booking) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
      booking.seat_numbers = JSON.parse(booking.seat_numbers);
      return res.json(booking);
    } else if (phone) {
      query += ` WHERE b.customer_phone = ? ORDER BY b.created_at DESC`;
      params.push(phone.trim());
      const bookings = await dbAll(query, params);
      bookings.forEach((b) => {
        try {
          b.seat_numbers = JSON.parse(b.seat_numbers);
        } catch (e) {}
      });
      return res.json(bookings);
    } else {
      return res.status(400).json({ error: 'Harap sertakan code atau phone' });
    }
  } catch (err) {
    console.error('Error looking up booking:', err);
    res.status(500).json({ error: 'Gagal mencari pesanan' });
  }
});

// 3. Cancel Booking
bookingsRouter.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { phone } = req.body;

    const booking = await dbGet('SELECT * FROM bookings WHERE id = ?', [id]);
    if (!booking) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    }

    if (booking.booking_status === 'CANCELLED') {
      return res.status(400).json({ error: 'Pesanan ini sudah dibatalkan sebelumnya' });
    }

    if (booking.booking_status === 'COMPLETED') {
      return res.status(400).json({ error: 'Pesanan yang sudah selesai/check-in tidak dapat dibatalkan' });
    }

    const authHeader = req.headers['authorization'];
    const isOperator = authHeader && authHeader.startsWith('Bearer ') && verifyJwt(authHeader.slice(7).trim())?.role === 'operator';

    if (!isOperator && booking.customer_phone) {
      if (!phone || booking.customer_phone !== phone) {
        return res.status(403).json({ error: 'Nomor telepon tidak sesuai dengan pemesan' });
      }
    }

    await dbRun(
      `UPDATE bookings 
       SET booking_status = 'CANCELLED', payment_status = 'CANCELLED' 
       WHERE id = ?`,
      [id]
    );

    await dbRun(
      `UPDATE booking_seats 
       SET status = 'CANCELLED' 
       WHERE booking_id = ?`,
      [id]
    );

    try {
      await dbRun(
        `INSERT INTO order_timeline_events (booking_id, booking_code, event_type, actor_role, description, details_json)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          booking.id,
          booking.booking_code,
          'ORDER_CANCELLED',
          isOperator ? 'OPERATOR' : 'CUSTOMER',
          isOperator ? 'Pesanan tiket dibatalkan oleh operator pool & kursi dilepaskan' : 'Pesanan tiket dibatalkan secara mandiri oleh pelanggan (Tiket Saya)',
          JSON.stringify({ cancelled_by: isOperator ? 'OPERATOR' : 'CUSTOMER', phone: booking.customer_phone })
        ]
      );
    } catch (timelineErr) {
      console.error('Error logging timeline on cancel:', timelineErr);
    }

    const updated = await dbGet(
      `SELECT b.*, 
              s.departure_time, s.vehicle_model,
              origin.name as origin_name, origin.city as origin_city, origin.address as origin_address,
              dest.name as destination_name, dest.city as destination_city, dest.address as destination_address
       FROM bookings b
       JOIN schedules s ON b.schedule_id = s.id
       JOIN pooling_spots origin ON s.origin_spot_id = origin.id
       JOIN pooling_spots dest ON s.destination_spot_id = dest.id
       WHERE b.id = ?`,
      [id]
    );

    const cancelVoiceText = `Perhatian: Pesanan ${updated.booking_code} atas nama ${updated.customer_name} rute ${updated.origin_name} ke ${updated.destination_name} telah dibatalkan.`;

    broadcastToBusiness({
      type: 'BOOKING_CANCELLED',
      booking: updated,
      voiceText: cancelVoiceText,
      cancelledBy: isOperator ? 'OPERATOR' : 'CUSTOMER',
      timestamp: Date.now()
    });

    res.json({ message: 'Pesanan tiket berhasil dibatalkan', booking: updated });
  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.status(500).json({ error: 'Gagal membatalkan pesanan tiket' });
  }
});

// Helper for status updates
const updateBookingStatusHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status, booking_status } = req.body;

    const updates = [];
    const params = [];

    if (payment_status) {
      updates.push('payment_status = ?');
      params.push(payment_status);
    }
    if (booking_status) {
      updates.push('booking_status = ?');
      params.push(booking_status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    await dbRun(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await dbGet(
      `SELECT b.*, 
              s.departure_time, s.vehicle_model,
              origin.name as origin_name, origin.city as origin_city,
              dest.name as destination_name, dest.city as destination_city
       FROM bookings b
       JOIN schedules s ON b.schedule_id = s.id
       JOIN pooling_spots origin ON s.origin_spot_id = origin.id
       JOIN pooling_spots dest ON s.destination_spot_id = dest.id
       WHERE b.id = ?`,
      [id]
    );
    try {
      updated.seat_numbers = JSON.parse(updated.seat_numbers);
    } catch (e) {}

    const isCancelled = booking_status === 'CANCELLED' || payment_status === 'CANCELLED';

    if (isCancelled) {
      await dbRun("UPDATE booking_seats SET status = 'CANCELLED' WHERE booking_id = ?", [id]);
    }

    try {
      if (isCancelled) {
        await dbRun(
          `INSERT INTO order_timeline_events (booking_id, booking_code, event_type, actor_role, description, details_json)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            updated.id,
            updated.booking_code,
            'ORDER_CANCELLED',
            'OPERATOR',
            `Pesanan tiket dibatalkan oleh operator pool & kursi dilepaskan`,
            JSON.stringify({ cancelled_by: 'OPERATOR' })
          ]
        );
      } else if (payment_status === 'PAID' && booking_status !== 'COMPLETED') {
        await dbRun(
          `INSERT INTO order_timeline_events (booking_id, booking_code, event_type, actor_role, description, details_json)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            updated.id,
            updated.booking_code,
            'PAYMENT_RECEIVED',
            'OPERATOR',
            `Pembayaran senilai Rp ${updated.total_price.toLocaleString('id-ID')} berhasil diverifikasi di pool`,
            JSON.stringify({ total_price: updated.total_price })
          ]
        );
      } else if (booking_status === 'COMPLETED') {
        await dbRun(
          `INSERT INTO order_timeline_events (booking_id, booking_code, event_type, actor_role, description, details_json)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            updated.id,
            updated.booking_code,
            'PASSENGER_CHECKED_IN',
            'OPERATOR',
            `Penumpang telah check-in dan naik ke armada travel`,
            null
          ]
        );
      }
    } catch (timelineErr) {
      console.error('Error logging timeline on status update:', timelineErr);
    }

    if (isCancelled) {
      const cancelVoiceText = `Pesanan ${updated.booking_code} atas nama ${updated.customer_name} telah dibatalkan oleh operator pool. Kursi telah dilepaskan.`;
      broadcastToBusiness({
        type: 'BOOKING_CANCELLED',
        booking: updated,
        voiceText: cancelVoiceText,
        cancelledBy: 'OPERATOR',
        timestamp: Date.now()
      });
    } else {
      broadcastToBusiness({
        type: 'BOOKING_UPDATED',
        booking: updated
      });
    }

    res.json(updated);
  } catch (err) {
    console.error('Error updating booking status:', err);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
};

bookingsRouter.patch('/:id/status', requireOperator, updateBookingStatusHandler);

// ==========================================
// OPERATOR BOOKING ROUTES (/api/business/bookings)
// ==========================================

businessBookingsRouter.use(requireOperator);

businessBookingsRouter.get('/', async (req, res) => {
  try {
    const { date, status, payment_status } = req.query;
    let query = `
      SELECT b.*, 
             s.departure_time, s.vehicle_model,
             origin.name as origin_name, origin.city as origin_city,
             dest.name as destination_name, dest.city as destination_city
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.id
      JOIN pooling_spots origin ON s.origin_spot_id = origin.id
      JOIN pooling_spots dest ON s.destination_spot_id = dest.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += ` AND b.travel_date = ?`;
      params.push(date);
    }
    if (status) {
      query += ` AND b.booking_status = ?`;
      params.push(status);
    }
    if (payment_status) {
      query += ` AND b.payment_status = ?`;
      params.push(payment_status);
    }

    query += ` ORDER BY b.created_at DESC`;

    const bookings = await dbAll(query, params);
    bookings.forEach((b) => {
      try {
        b.seat_numbers = JSON.parse(b.seat_numbers);
      } catch (e) {}
    });

    res.json(bookings);
  } catch (err) {
    console.error('Error fetching business bookings:', err);
    res.status(500).json({ error: 'Failed to fetch bookings for business' });
  }
});

businessBookingsRouter.patch('/:id/status', updateBookingStatusHandler);
