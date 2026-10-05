import { Router } from 'express';
import { dbAll, dbGet } from '../db.js';
import { requireOperator } from '../middleware/auth.js';

const router = Router();
router.use(requireOperator);

// GET /api/business/analytics
router.get('/', async (req, res) => {
  try {
    const totalBookingsRow = await dbGet("SELECT COUNT(*) as count FROM bookings WHERE booking_status != 'CANCELLED'");
    const paidRevenueRow = await dbGet("SELECT SUM(total_price) as sum FROM bookings WHERE payment_status = 'PAID'");
    const pendingRevenueRow = await dbGet("SELECT SUM(total_price) as sum FROM bookings WHERE payment_status = 'PENDING' AND booking_status != 'CANCELLED'");
    const totalSeatsRow = await dbGet("SELECT SUM(seats_count) as sum FROM bookings WHERE booking_status != 'CANCELLED'");

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
      total_bookings: totalBookingsRow?.count || 0,
      paid_revenue: paidRevenueRow?.sum || 0,
      pending_revenue: pendingRevenueRow?.sum || 0,
      total_passengers: totalSeatsRow?.sum || 0,
      top_routes: topRoutes || [],
      time_distribution: timeDistribution || [],
      recent_bookings: recentBookings || []
    });
  } catch (err) {
    console.error('Error generating analytics:', err);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

export default router;
