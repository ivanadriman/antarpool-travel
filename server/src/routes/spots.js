import { Router } from 'express';
import { dbAll } from '../db.js';

const router = Router();

// GET /api/spots
router.get('/', async (req, res) => {
  try {
    const spots = await dbAll('SELECT * FROM pooling_spots WHERE is_active = 1 ORDER BY city, name');
    res.json(spots);
  } catch (err) {
    console.error('Error fetching pooling spots:', err);
    res.status(500).json({ error: 'Failed to fetch pooling spots' });
  }
});

export default router;
