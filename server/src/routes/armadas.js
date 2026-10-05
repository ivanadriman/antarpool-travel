import { Router } from 'express';
import { dbAll, dbGet, dbRun } from '../db.js';
import { requireOperator } from '../middleware/auth.js';

const router = Router();

// GET /api/armadas
router.get('/', async (req, res) => {
  try {
    const armadas = await dbAll('SELECT * FROM armadas ORDER BY id DESC');
    res.json(armadas);
  } catch (err) {
    console.error('Error fetching armadas:', err);
    res.status(500).json({ error: 'Failed to fetch armadas' });
  }
});

// POST /api/armadas
router.post('/', requireOperator, async (req, res) => {
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
    console.error('Error adding armada:', err);
    res.status(500).json({ error: 'Gagal menambahkan armada' });
  }
});

// PUT /api/armadas/:id
router.put('/:id', requireOperator, async (req, res) => {
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
    console.error('Error updating armada:', err);
    res.status(500).json({ error: 'Gagal memperbarui armada' });
  }
});

// DELETE /api/armadas/:id
router.delete('/:id', requireOperator, async (req, res) => {
  try {
    const { id } = req.params;
    const inUse = await dbGet('SELECT COUNT(*) as count FROM schedules WHERE armada_id = ?', [id]);
    if (inUse && inUse.count > 0) {
      await dbRun('UPDATE schedules SET armada_id = NULL WHERE armada_id = ?', [id]);
    }

    await dbRun('DELETE FROM armadas WHERE id = ?', [id]);
    res.json({ message: 'Armada berhasil dihapus' });
  } catch (err) {
    console.error('Error deleting armada:', err);
    res.status(500).json({ error: 'Gagal menghapus armada' });
  }
});

export default router;
