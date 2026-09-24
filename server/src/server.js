import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { initDb, dbAll, dbGet, dbRun } from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.CLIENT_URL,
  process.env.BUSINESS_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    // Allow Netlify preview and custom deploy domains
    if (origin.endsWith('.netlify.app') || origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive fallback to prevent breaking deployments
  },
  credentials: true
}));
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Track active business sockets for real-time order alerts
const businessClients = new Set();

wss.on('connection', (ws, req) => {
  console.log('New WebSocket client connected');
  businessClients.add(ws);

  ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Connected to Travel Live Notification Server' }));

  ws.on('close', () => {
    businessClients.delete(ws);
    console.log('WebSocket client disconnected');
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    businessClients.delete(ws);
  });
});

// Broadcast helper
function broadcastToBusiness(payload) {
  const data = JSON.stringify(payload);
  for (const client of businessClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

// ------------------- API ROUTES ------------------- //

// 1. Get all active pooling spots
app.get('/api/spots', async (req, res) => {
  try {
    const spots = await dbAll('SELECT * FROM pooling_spots WHERE is_active = 1 ORDER BY city, name');
    res.json(spots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch pooling spots' });
  }
});

// 2. Search schedules with seat availability
// Query params: origin, destination, date
app.get('/api/schedules', async (req, res) => {
  try {
    const { origin, destination, date } = req.query;
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required' });
    }

    const travelDate = date || new Date().toISOString().split('T')[0];

    const query = `
      SELECT 
        s.*,
        origin.name as origin_name,
        origin.city as origin_city,
        origin.address as origin_address,
        dest.name as destination_name,
        dest.city as destination_city,
        dest.address as destination_address
      FROM schedules s
      JOIN pooling_spots origin ON s.origin_spot_id = origin.id
      JOIN pooling_spots dest ON s.destination_spot_id = dest.id
      WHERE s.origin_spot_id = ? AND s.destination_spot_id = ? AND s.is_active = 1
      ORDER BY s.departure_time ASC
    `;

    const schedules = await dbAll(query, [origin, destination]);

    // For each schedule, find booked seats for the specified travelDate
    const enriched = await Promise.all(
      schedules.map(async (sch) => {
        const bookings = await dbAll(
          `SELECT seat_numbers FROM bookings 
           WHERE schedule_id = ? AND travel_date = ? AND booking_status != 'CANCELLED'`,
          [sch.id, travelDate]
        );

        let bookedSeats = [];
        bookings.forEach((b) => {
          try {
            const seats = JSON.parse(b.seat_numbers);
            if (Array.isArray(seats)) bookedSeats.push(...seats);
          } catch (e) {}
        });

        const availableSeatsCount = Math.max(0, sch.total_seats - bookedSeats.length);

        return {
          ...sch,
          travel_date: travelDate,
          booked_seats: bookedSeats,
          available_seats_count: availableSeatsCount,
          is_sold_out: availableSeatsCount === 0
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// 3. Get single schedule details with live seat state
app.get('/api/schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    const travelDate = date || new Date().toISOString().split('T')[0];

    const sch = await dbGet(
      `SELECT 
        s.*,
        origin.name as origin_name, origin.city as origin_city, origin.address as origin_address,
        dest.name as destination_name, dest.city as destination_city, dest.address as destination_address
       FROM schedules s
       JOIN pooling_spots origin ON s.origin_spot_id = origin.id
       JOIN pooling_spots dest ON s.destination_spot_id = dest.id
       WHERE s.id = ?`,
      [id]
    );

    if (!sch) return res.status(404).json({ error: 'Schedule not found' });

    const bookings = await dbAll(
      `SELECT seat_numbers FROM bookings 
       WHERE schedule_id = ? AND travel_date = ? AND booking_status != 'CANCELLED'`,
      [id, travelDate]
    );

    let bookedSeats = [];
    bookings.forEach((b) => {
      try {
        const seats = JSON.parse(b.seat_numbers);
        if (Array.isArray(seats)) bookedSeats.push(...seats);
      } catch (e) {}
    });

    res.json({
      ...sch,
      travel_date: travelDate,
      booked_seats: bookedSeats,
      available_seats_count: Math.max(0, sch.total_seats - bookedSeats.length)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch schedule details' });
  }
});

// 4. Create Booking (Client endpoint)
app.post('/api/bookings', async (req, res) => {
  try {
    const {
      schedule_id,
      travel_date,
      customer_name,
      customer_phone,
      customer_email,
      auth_method,
      seat_numbers // Array of seat strings e.g. ["1A", "1B"]
    } = req.body;

    if (!schedule_id || !travel_date || !customer_name || !seat_numbers || seat_numbers.length === 0) {
      return res.status(400).json({ error: 'Missing required booking fields or seats' });
    }

    // Get schedule info
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

    // Check if any requested seat is already booked for this schedule & date
    const existingBookings = await dbAll(
      `SELECT seat_numbers FROM bookings 
       WHERE schedule_id = ? AND travel_date = ? AND booking_status != 'CANCELLED'`,
      [schedule_id, travel_date]
    );

    const alreadyTaken = new Set();
    existingBookings.forEach((b) => {
      try {
        const sList = JSON.parse(b.seat_numbers);
        sList.forEach((s) => alreadyTaken.add(s));
      } catch (e) {}
    });

    const collision = seat_numbers.filter((s) => alreadyTaken.has(s));
    if (collision.length > 0) {
      return res.status(409).json({
        error: `Kursi ${collision.join(', ')} sudah dipesan oleh penumpang lain. Silakan pilih kursi lain.`,
        collision
      });
    }

    const seatsCount = seat_numbers.length;
    const pricePerSeat = schedule.price;
    const totalPrice = pricePerSeat * seatsCount;

    // Generate unique booking code e.g. TRV-2609-XXXX
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const bookingCode = `TRV-${travel_date.replace(/-/g, '').slice(2)}-${randomSuffix}`;

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

    const newBooking = {
      id: insertResult.lastID,
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

    // Log to order timeline
    try {
      await dbRun(
        `INSERT INTO order_timeline_events (booking_id, booking_code, event_type, actor_role, description, details_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          newBooking.id,
          bookingCode,
          'ORDER_PLACED',
          'CUSTOMER',
          `Pesanan baru dibuat oleh ${customer_name} (${seatsCount} kursi: ${seat_numbers.join(', ')})`,
          JSON.stringify({ seats: seat_numbers, total_price: totalPrice, travel_date, departure_time: schedule.departure_time }),
          newBooking.created_at
        ]
      );
    } catch (timelineErr) {
      console.error('Error logging timeline for new order:', timelineErr);
    }

    // Broadcast in real-time to all connected business admin tabs with voice payload in Indonesian
    const voiceText = `Pesanan baru dari ${schedule.origin_name} ke ${schedule.destination_name}. Pemesan ${customer_name}, ${seatsCount} kursi, keberangkatan pukul ${schedule.departure_time}.`;

    broadcastToBusiness({
      type: 'NEW_BOOKING',
      booking: newBooking,
      voiceText: voiceText,
      timestamp: Date.now()
    });

    res.status(201).json(newBooking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal membuat pesanan' });
  }
});

// 5. Get Booking by Code or Phone
app.get('/api/bookings/lookup', async (req, res) => {
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
    console.error(err);
    res.status(500).json({ error: 'Gagal mencari pesanan' });
  }
});

// 5b. Client: Cancel Booking
app.post('/api/bookings/:id/cancel', async (req, res) => {
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

    // Optional ownership verification if phone provided
    if (phone && booking.customer_phone && booking.customer_phone !== phone) {
      return res.status(403).json({ error: 'Nomor telepon tidak sesuai dengan pemesan' });
    }

    await dbRun(
      `UPDATE bookings 
       SET booking_status = 'CANCELLED', payment_status = 'CANCELLED' 
       WHERE id = ?`,
      [id]
    );

    // Log timeline event for cancellation by customer
    try {
      await dbRun(
        `INSERT INTO order_timeline_events (booking_id, booking_code, event_type, actor_role, description, details_json)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          booking.id,
          booking.booking_code,
          'ORDER_CANCELLED',
          'CUSTOMER',
          `Pesanan tiket dibatalkan secara mandiri oleh pelanggan (Tiket Saya)`,
          JSON.stringify({ cancelled_by: 'CUSTOMER', phone: booking.customer_phone })
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

    // Cancellation voice announcement: say no duplicate 'Pool'
    const cancelVoiceText = `Perhatian: Pesanan ${updated.booking_code} atas nama ${updated.customer_name} rute ${updated.origin_name} ke ${updated.destination_name} telah dibatalkan.`;

    // Broadcast update to Business app so operator, timeline, and schedules auto-refresh
    broadcastToBusiness({
      type: 'BOOKING_CANCELLED',
      booking: updated,
      voiceText: cancelVoiceText,
      cancelledBy: 'CUSTOMER',
      timestamp: Date.now()
    });

    res.json({ message: 'Pesanan tiket berhasil dibatalkan', booking: updated });
  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.status(500).json({ error: 'Gagal membatalkan pesanan tiket' });
  }
});

// 6. BUSINESS: Get all bookings (with filters)
app.get('/api/business/bookings', async (req, res) => {
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
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bookings for business' });
  }
});

// 7. BUSINESS: Update booking status (e.g. mark as PAID on arrival, or check-in)
app.patch('/api/business/bookings/:id/status', async (req, res) => {
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

    // Log timeline event
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
    console.error(err);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

// 8. BUSINESS: Schedule Management (List, Add, Update price/time/seats, Delete)
app.get('/api/business/schedules', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const query = `
      SELECT 
        s.*,
        origin.name as origin_name, origin.city as origin_city,
        dest.name as destination_name, dest.city as destination_city,
        a.name as armada_name, a.license_plate as armada_plate
      FROM schedules s
      JOIN pooling_spots origin ON s.origin_spot_id = origin.id
      JOIN pooling_spots dest ON s.destination_spot_id = dest.id
      LEFT JOIN armadas a ON s.armada_id = a.id
      ORDER BY origin.city, s.departure_time ASC
    `;
    const schedules = await dbAll(query);

    // Calculate booked and remaining seats for targetDate
    const enriched = await Promise.all(
      schedules.map(async (sch) => {
        const bookings = await dbAll(
          `SELECT seat_numbers FROM bookings 
           WHERE schedule_id = ? AND travel_date = ? AND booking_status != 'CANCELLED'`,
          [sch.id, targetDate]
        );

        let bookedCount = 0;
        bookings.forEach((b) => {
          try {
            const seats = JSON.parse(b.seat_numbers);
            if (Array.isArray(seats)) bookedCount += seats.length;
          } catch (e) {}
        });

        const remainingSeats = Math.max(0, sch.total_seats - bookedCount);

        return {
          ...sch,
          filter_date: targetDate,
          booked_seats_count: bookedCount,
          remaining_seats: remainingSeats
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

app.post('/api/business/schedules', async (req, res) => {
  try {
    const {
      origin_spot_id,
      destination_spot_id,
      departure_time,
      price,
      total_seats,
      armada_id,
      vehicle_model,
      vehicle_layout
    } = req.body;

    if (!origin_spot_id || !destination_spot_id || !departure_time || !price) {
      return res.status(400).json({ error: 'Missing required schedule fields' });
    }

    const result = await dbRun(
      `INSERT INTO schedules 
       (origin_spot_id, destination_spot_id, departure_time, price, total_seats, armada_id, vehicle_model, vehicle_layout, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        origin_spot_id,
        destination_spot_id,
        departure_time,
        price,
        total_seats || 10,
        armada_id || null,
        vehicle_model || 'Toyota HiAce Premio',
        typeof vehicle_layout === 'object' ? JSON.stringify(vehicle_layout) : (vehicle_layout || 'hiace_10')
      ]
    );

    res.status(201).json({ id: result.lastID, message: 'Jadwal berhasil ditambahkan' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add schedule' });
  }
});

app.put('/api/business/schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { departure_time, price, total_seats, armada_id, vehicle_model, vehicle_layout, is_active } = req.body;

    const layoutStr = vehicle_layout ? (typeof vehicle_layout === 'object' ? JSON.stringify(vehicle_layout) : vehicle_layout) : null;

    await dbRun(
      `UPDATE schedules 
       SET departure_time = COALESCE(?, departure_time),
           price = COALESCE(?, price),
           total_seats = COALESCE(?, total_seats),
           armada_id = COALESCE(?, armada_id),
           vehicle_model = COALESCE(?, vehicle_model),
           vehicle_layout = COALESCE(?, vehicle_layout),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [departure_time, price, total_seats, armada_id, vehicle_model, layoutStr, is_active, id]
    );

    res.json({ message: 'Jadwal berhasil diperbarui' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

app.delete('/api/business/schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if schedule exists
    const schedule = await dbGet('SELECT * FROM schedules WHERE id = ?', [id]);
    if (!schedule) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan' });
    }

    // Check if schedule has active bookings
    const activeBookings = await dbGet(
      `SELECT COUNT(*) as count FROM bookings WHERE schedule_id = ? AND booking_status != 'CANCELLED'`,
      [id]
    );

    if (activeBookings && activeBookings.count > 0) {
      return res.status(400).json({ 
        error: `Tidak dapat menghapus jadwal karena masih ada ${activeBookings.count} pesanan aktif. Silakan batalkan pesanan tersebut terlebih dahulu atau ubah status jadwal menjadi Non-Aktif.` 
      });
    }

    // Clean up any cancelled bookings associated with this schedule
    await dbRun('DELETE FROM bookings WHERE schedule_id = ?', [id]);
    // Delete the schedule
    await dbRun('DELETE FROM schedules WHERE id = ?', [id]);

    res.json({ message: 'Jadwal berhasil dihapus' });
  } catch (err) {
    console.error('Error deleting schedule:', err);
    res.status(500).json({ error: `Gagal menghapus jadwal: ${err.message}` });
  }
});

// 9. BUSINESS: Armada Management (List, Add, Delete)
app.get('/api/armadas', async (req, res) => {
  try {
    const armadas = await dbAll('SELECT * FROM armadas ORDER BY id DESC');
    res.json(armadas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch armadas' });
  }
});

app.post('/api/armadas', async (req, res) => {
  try {
    const { name, license_plate, rows_count, cols_count, layout_json, total_seats } = req.body;
    if (!name || !rows_count || !cols_count || !layout_json) {
      return res.status(400).json({ error: 'Semua data armada dan denah kursi wajib diisi' });
    }

    const result = await dbRun(
      `INSERT INTO armadas (name, license_plate, rows_count, cols_count, layout_json, total_seats, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        name.trim(),
        license_plate ? license_plate.trim() : '',
        Number(rows_count),
        Number(cols_count),
        typeof layout_json === 'string' ? layout_json : JSON.stringify(layout_json),
        Number(total_seats)
      ]
    );

    res.status(201).json({ id: result.lastID, message: 'Armada berhasil ditambahkan' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menambahkan armada' });
  }
});

app.put('/api/armadas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, license_plate, rows_count, cols_count, layout_json, total_seats } = req.body;

    if (!name || !rows_count || !cols_count || !layout_json) {
      return res.status(400).json({ error: 'Semua data armada dan denah kursi wajib diisi' });
    }

    const layoutStr = typeof layout_json === 'string' ? layout_json : JSON.stringify(layout_json);

    await dbRun(
      `UPDATE armadas 
       SET name = ?, license_plate = ?, rows_count = ?, cols_count = ?, layout_json = ?, total_seats = ?
       WHERE id = ?`,
      [
        name.trim(),
        license_plate ? license_plate.trim() : '',
        Number(rows_count),
        Number(cols_count),
        layoutStr,
        Number(total_seats),
        id
      ]
    );

    // Also update cached vehicle_model, total_seats, and vehicle_layout on schedules using this armada
    await dbRun(
      `UPDATE schedules 
       SET vehicle_model = ?, total_seats = ?, vehicle_layout = ?
       WHERE armada_id = ?`,
      [name.trim(), Number(total_seats), layoutStr, id]
    );

    res.json({ message: 'Armada berhasil diperbarui' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memperbarui armada' });
  }
});

app.delete('/api/armadas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Check if armada is in use in active schedules
    const inUse = await dbGet('SELECT COUNT(*) as count FROM schedules WHERE armada_id = ?', [id]);
    if (inUse && inUse.count > 0) {
      // Soft deactivate or delete
      await dbRun('UPDATE schedules SET armada_id = NULL WHERE armada_id = ?', [id]);
    }

    await dbRun('DELETE FROM armadas WHERE id = ?', [id]);
    res.json({ message: 'Armada berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menghapus armada' });
  }
});

// 10. BUSINESS: Statistics and Dashboard Analytics
app.get('/api/business/analytics', async (req, res) => {
  try {
    // Total bookings
    const totalBookingsRow = await dbGet("SELECT COUNT(*) as count FROM bookings WHERE booking_status != 'CANCELLED'");
    // Total revenue (paid)
    const paidRevenueRow = await dbGet("SELECT SUM(total_price) as sum FROM bookings WHERE payment_status = 'PAID'");
    // Pending revenue (to be paid on arrival)
    const pendingRevenueRow = await dbGet("SELECT SUM(total_price) as sum FROM bookings WHERE payment_status = 'PENDING' AND booking_status != 'CANCELLED'");
    // Total passengers
    const totalSeatsRow = await dbGet("SELECT SUM(seats_count) as sum FROM bookings WHERE booking_status != 'CANCELLED'");
    
    // Top routes
    const topRoutes = await dbAll(`
      SELECT 
        origin.name || ' -> ' || dest.name as route_name,
        COUNT(b.id) as booking_count,
        SUM(b.total_price) as total_amount
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.id
      JOIN pooling_spots origin ON s.origin_spot_id = origin.id
      JOIN pooling_spots dest ON s.destination_spot_id = dest.id
      WHERE b.booking_status != 'CANCELLED'
      GROUP BY route_name
      ORDER BY booking_count DESC
      LIMIT 5
    `);

    // Departure time breakdown
    const timeDistribution = await dbAll(`
      SELECT 
        s.departure_time,
        COUNT(b.id) as booking_count,
        SUM(b.seats_count) as seats_booked
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.id
      WHERE b.booking_status != 'CANCELLED'
      GROUP BY s.departure_time
      ORDER BY s.departure_time ASC
    `);

    // Recent 10 bookings
    const recentBookings = await dbAll(`
      SELECT 
        b.booking_code, b.customer_name, b.travel_date, b.seats_count, b.total_price, b.payment_status, b.created_at,
        origin.name as origin_name, dest.name as destination_name, s.departure_time
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.id
      JOIN pooling_spots origin ON s.origin_spot_id = origin.id
      JOIN pooling_spots dest ON s.destination_spot_id = dest.id
      ORDER BY b.created_at DESC
      LIMIT 10
    `);

    res.json({
      total_bookings: totalBookingsRow.count || 0,
      paid_revenue: paidRevenueRow.sum || 0,
      pending_revenue: pendingRevenueRow.sum || 0,
      total_passengers: totalSeatsRow.sum || 0,
      top_routes: topRoutes,
      time_distribution: timeDistribution,
      recent_bookings: recentBookings
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

// 12. BUSINESS: Order Timeline Events
app.get('/api/business/timeline', async (req, res) => {
  try {
    const { booking_code, event_type, date } = req.query;

    let query = `
      SELECT 
        e.*,
        b.customer_name,
        b.customer_phone,
        b.travel_date,
        b.total_price,
        b.seats_count,
        b.booking_status as current_booking_status,
        b.payment_status as current_payment_status,
        s.departure_time,
        origin.name as origin_name,
        dest.name as destination_name
      FROM order_timeline_events e
      JOIN bookings b ON e.booking_id = b.id
      JOIN schedules s ON b.schedule_id = s.id
      JOIN pooling_spots origin ON s.origin_spot_id = origin.id
      JOIN pooling_spots dest ON s.destination_spot_id = dest.id
      WHERE 1=1
    `;
    const params = [];

    if (booking_code) {
      query += ` AND (e.booking_code LIKE ? OR b.customer_name LIKE ?)`;
      params.push(`%${booking_code.trim()}%`, `%${booking_code.trim()}%`);
    }

    if (event_type) {
      query += ` AND e.event_type = ?`;
      params.push(event_type);
    }

    if (date) {
      query += ` AND DATE(e.created_at) = ?`;
      params.push(date);
    }

    query += ` ORDER BY e.created_at DESC, e.id DESC LIMIT 100`;

    const events = await dbAll(query, params);
    res.json(events);
  } catch (err) {
    console.error('Error fetching order timeline:', err);
    res.status(500).json({ error: 'Failed to fetch order timeline events' });
  }
});

// Initialize database then start server
initDb().then(() => {
  server.listen(PORT, () => {
    console.log(`Travel & Pooling Backend Server running on http://localhost:${PORT}`);
    console.log(`WebSocket server ready for Business alerts`);
  });
});
