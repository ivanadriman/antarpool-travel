import { Router } from 'express';
import { dbAll } from '../db.js';
import { requireOperator } from '../middleware/auth.js';

const router = Router();
router.use(requireOperator);

// GET /api/business/timeline
router.get('/', async (req, res) => {
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

export default router;
