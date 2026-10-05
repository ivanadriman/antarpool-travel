import { Router } from 'express';
import { dbAll, dbGet, dbRun } from '../db.js';
import { requireOperator } from '../middleware/auth.js';

export const schedulesRouter = Router();
export const businessSchedulesRouter = Router();

// ==========================================
// PASSENGER SCHEDULES ROUTES (/api/schedules)
// ==========================================

// 1. Search schedules with seat availability
schedulesRouter.get('/', async (req, res) => {
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
    console.error('Error fetching schedules:', err);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// 2. Get single schedule details
schedulesRouter.get('/:id', async (req, res) => {
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
    console.error('Error fetching schedule details:', err);
    res.status(500).json({ error: 'Failed to fetch schedule details' });
  }
});

// ==========================================
// OPERATOR SCHEDULES ROUTES (/api/business/schedules)
// ==========================================

businessSchedulesRouter.use(requireOperator);

businessSchedulesRouter.get('/', async (req, res) => {
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
    console.error('Error fetching business schedules:', err);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

businessSchedulesRouter.post('/', async (req, res) => {
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
    console.error('Error adding schedule:', err);
    res.status(500).json({ error: 'Failed to add schedule' });
  }
});

businessSchedulesRouter.put('/:id', async (req, res) => {
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
    console.error('Error updating schedule:', err);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

businessSchedulesRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await dbGet('SELECT * FROM schedules WHERE id = ?', [id]);
    if (!schedule) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan' });
    }

    const activeBookings = await dbGet(
      `SELECT COUNT(*) as count FROM bookings WHERE schedule_id = ? AND booking_status != 'CANCELLED'`,
      [id]
    );

    if (activeBookings && activeBookings.count > 0) {
      return res.status(400).json({ 
        error: `Tidak dapat menghapus jadwal karena masih ada ${activeBookings.count} pesanan aktif. Silakan batalkan pesanan tersebut terlebih dahulu atau ubah status jadwal menjadi Non-Aktif.` 
      });
    }

    await dbRun('DELETE FROM bookings WHERE schedule_id = ?', [id]);
    await dbRun('DELETE FROM schedules WHERE id = ?', [id]);

    res.json({ message: 'Jadwal berhasil dihapus' });
  } catch (err) {
    console.error('Error deleting schedule:', err);
    res.status(500).json({ error: `Gagal menghapus jadwal: ${err.message}` });
  }
});
