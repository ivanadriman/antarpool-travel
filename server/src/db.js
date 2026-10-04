import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(__dirname, '../travel.db');

const db = new sqlite3.Database(dbPath);

// Promisified helpers
export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

class AsyncLock {
  constructor() {
    this._queue = [];
    this._locked = false;
  }
  async acquire() {
    if (!this._locked) {
      this._locked = true;
      return;
    }
    await new Promise((resolve) => this._queue.push(resolve));
  }
  release() {
    if (this._queue.length > 0) {
      const next = this._queue.shift();
      next();
    } else {
      this._locked = false;
    }
  }
}

const txLock = new AsyncLock();

export async function withTransaction(callback) {
  await txLock.acquire();
  try {
    await dbRun('BEGIN IMMEDIATE');
    try {
      const result = await callback();
      await dbRun('COMMIT');
      return result;
    } catch (err) {
      try { await dbRun('ROLLBACK'); } catch (rbErr) {}
      throw err;
    }
  } finally {
    txLock.release();
  }
}

export async function initDb() {
  // Optimize SQLite for high concurrency and robust queueing
  try {
    await dbRun('PRAGMA journal_mode = WAL');
    await dbRun('PRAGMA busy_timeout = 10000');
  } catch (e) {}

  // 1. Pooling spots table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS pooling_spots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT,
      landmark TEXT,
      is_active INTEGER DEFAULT 1
    )
  `);

  // 2. Armadas (Vehicles with custom layouts) table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS armadas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      license_plate TEXT,
      rows_count INTEGER NOT NULL,
      cols_count INTEGER NOT NULL,
      layout_json TEXT NOT NULL, -- JSON grid of cells: seat, aisle, driver, empty
      total_seats INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Schedules table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      origin_spot_id INTEGER NOT NULL,
      destination_spot_id INTEGER NOT NULL,
      departure_time TEXT NOT NULL,
      price INTEGER NOT NULL,
      total_seats INTEGER DEFAULT 10,
      armada_id INTEGER,
      vehicle_model TEXT DEFAULT 'Toyota HiAce Premio',
      vehicle_layout TEXT DEFAULT 'hiace_10',
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (origin_spot_id) REFERENCES pooling_spots(id),
      FOREIGN KEY (destination_spot_id) REFERENCES pooling_spots(id),
      FOREIGN KEY (armada_id) REFERENCES armadas(id)
    )
  `);

  // Ensure armada_id column exists if table was created in an earlier migration
  const scheduleColumns = await dbAll('PRAGMA table_info(schedules)');
  const hasArmadaId = scheduleColumns.some((c) => c.name === 'armada_id');
  if (!hasArmadaId) {
    await dbRun('ALTER TABLE schedules ADD COLUMN armada_id INTEGER');
  }

  // 4. Bookings table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_code TEXT UNIQUE NOT NULL,
      schedule_id INTEGER NOT NULL,
      travel_date TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      customer_email TEXT,
      auth_method TEXT DEFAULT 'phone',
      seat_numbers TEXT NOT NULL,
      seats_count INTEGER NOT NULL,
      price_per_seat INTEGER NOT NULL,
      total_price INTEGER NOT NULL,
      payment_method TEXT DEFAULT 'Bayar di Tempat (Pool)',
      payment_status TEXT DEFAULT 'PENDING',
      booking_status TEXT DEFAULT 'CONFIRMED',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (schedule_id) REFERENCES schedules(id)
    )
  `);

  // 5. Order Timeline Events table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS order_timeline_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      booking_code TEXT NOT NULL,
      event_type TEXT NOT NULL, -- 'ORDER_PLACED', 'PAYMENT_RECEIVED', 'PASSENGER_CHECKED_IN', 'ORDER_CANCELLED'
      actor_role TEXT NOT NULL DEFAULT 'CUSTOMER', -- 'CUSTOMER', 'OPERATOR', 'SYSTEM'
      description TEXT NOT NULL,
      details_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id)
    )
  `);

  // 6. Booking Seats table (Atomic Seat Reservations & Collision Prevention)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS booking_seats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      schedule_id INTEGER NOT NULL,
      travel_date TEXT NOT NULL,
      seat_number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'CONFIRMED', -- 'CONFIRMED', 'CANCELLED'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    )
  `);

  await dbRun(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_seat
    ON booking_seats(schedule_id, travel_date, seat_number)
    WHERE status != 'CANCELLED'
  `);

  // Backfill existing bookings into booking_seats if empty
  const seatsCount = await dbGet('SELECT COUNT(*) as count FROM booking_seats');
  if (seatsCount && seatsCount.count === 0) {
    const existingBookings = await dbAll('SELECT id, schedule_id, travel_date, seat_numbers, booking_status FROM bookings');
    for (const b of existingBookings) {
      try {
        const sList = typeof b.seat_numbers === 'string' ? JSON.parse(b.seat_numbers) : b.seat_numbers;
        if (Array.isArray(sList)) {
          for (const s of sList) {
            await dbRun(
              `INSERT OR IGNORE INTO booking_seats (booking_id, schedule_id, travel_date, seat_number, status)
               VALUES (?, ?, ?, ?, ?)`,
              [b.id, b.schedule_id, b.travel_date, s, b.booking_status]
            );
          }
        }
      } catch (e) {}
    }
  }

  // 7. Customers table (Client App Users CRM)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      auth_method TEXT DEFAULT 'phone',
      is_vip INTEGER DEFAULT 0,
      is_blacklisted INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(`
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)
  `);

  // Backfill existing bookings into customers if empty
  const customersCount = await dbGet('SELECT COUNT(*) as count FROM customers');
  if (customersCount && customersCount.count === 0) {
    const existingBookings = await dbAll(
      `SELECT customer_name, customer_phone, customer_email, auth_method, MIN(created_at) as first_seen
       FROM bookings
       WHERE customer_phone IS NOT NULL AND customer_phone != ''
       GROUP BY customer_phone`
    );
    for (const b of existingBookings) {
      await dbRun(
        `INSERT OR IGNORE INTO customers (phone, name, email, auth_method, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [b.customer_phone, b.customer_name, b.customer_email || '', b.auth_method || 'phone', b.first_seen, b.first_seen]
      );
    }
  }

  // Backfill existing bookings into timeline if timeline is empty
  const timelineCount = await dbGet('SELECT COUNT(*) as count FROM order_timeline_events');
  if (timelineCount.count === 0) {
    const existingBookings = await dbAll('SELECT * FROM bookings ORDER BY created_at ASC');
    for (const b of existingBookings) {
      // 1. Creation event
      await dbRun(
        `INSERT INTO order_timeline_events (booking_id, booking_code, event_type, actor_role, description, details_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          b.id,
          b.booking_code,
          'ORDER_PLACED',
          'CUSTOMER',
          `Pesanan dibuat oleh ${b.customer_name} (${b.seats_count} kursi)`,
          JSON.stringify({ seats: b.seat_numbers, total_price: b.total_price }),
          b.created_at
        ]
      );

      // 2. If Paid
      if (b.payment_status === 'PAID') {
        await dbRun(
          `INSERT INTO order_timeline_events (booking_id, booking_code, event_type, actor_role, description, details_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            b.id,
            b.booking_code,
            'PAYMENT_RECEIVED',
            'OPERATOR',
            `Pembayaran tunai/QRIS diterima di pool`,
            JSON.stringify({ total_price: b.total_price }),
            b.created_at
          ]
        );
      }

      // 3. If Completed
      if (b.booking_status === 'COMPLETED') {
        await dbRun(
          `INSERT INTO order_timeline_events (booking_id, booking_code, event_type, actor_role, description, details_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            b.id,
            b.booking_code,
            'PASSENGER_CHECKED_IN',
            'OPERATOR',
            `Penumpang check-in ke armada`,
            null,
            b.created_at
          ]
        );
      }

      // 4. If Cancelled
      if (b.booking_status === 'CANCELLED' || b.payment_status === 'CANCELLED') {
        await dbRun(
          `INSERT INTO order_timeline_events (booking_id, booking_code, event_type, actor_role, description, details_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            b.id,
            b.booking_code,
            'ORDER_CANCELLED',
            'SYSTEM',
            `Pesanan tiket dibatalkan & kursi dilepaskan`,
            null,
            b.created_at
          ]
        );
      }
    }
  }

  // Seed default armadas if empty
  const armadasCount = await dbGet('SELECT COUNT(*) as count FROM armadas');
  if (armadasCount.count === 0) {
    // 1. Toyota HiAce Premio (4 rows, 3 cols: 10 passenger seats)
    // Row 0: [Driver, Empty, 1A]
    // Row 1: [2A, Aisle, 2B]
    // Row 2: [3A, Aisle, 3B]
    // Row 3: [4A, 4B, 4C]
    const hiacePremioLayout = [
      [
        { type: 'driver', label: 'Supir' },
        { type: 'empty', label: '' },
        { type: 'seat', label: '1A' }
      ],
      [
        { type: 'seat', label: '2A' },
        { type: 'aisle', label: 'Lorong' },
        { type: 'seat', label: '2B' }
      ],
      [
        { type: 'seat', label: '3A' },
        { type: 'aisle', label: 'Lorong' },
        { type: 'seat', label: '3B' }
      ],
      [
        { type: 'seat', label: '4A' },
        { type: 'seat', label: '4B' },
        { type: 'seat', label: '4C' }
      ]
    ];

    // 2. Toyota Innova Reborn (3 rows, 3 cols: 6 passenger seats)
    // Row 0: [Driver, Empty, 1A]
    // Row 1: [2A, Aisle, 2B]
    // Row 2: [3A, 3B, 3C]
    const innovaLayout = [
      [
        { type: 'driver', label: 'Supir' },
        { type: 'empty', label: '' },
        { type: 'seat', label: '1A' }
      ],
      [
        { type: 'seat', label: '2A' },
        { type: 'aisle', label: 'Lorong' },
        { type: 'seat', label: '2B' }
      ],
      [
        { type: 'seat', label: '3A' },
        { type: 'seat', label: '3B' },
        { type: 'seat', label: '3C' }
      ]
    ];

    await dbRun(
      `INSERT INTO armadas (name, license_plate, rows_count, cols_count, layout_json, total_seats)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Toyota HiAce Premio (10 Seat)', 'L 7788 AB', 4, 3, JSON.stringify(hiacePremioLayout), 8]
    );

    await dbRun(
      `INSERT INTO armadas (name, license_plate, rows_count, cols_count, layout_json, total_seats)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Toyota Innova Reborn (6 Seat)', 'N 1234 XY', 3, 3, JSON.stringify(innovaLayout), 6]
    );
  }

  // Check if pooling spots need seeding
  const existingSpots = await dbAll('SELECT * FROM pooling_spots');
  if (existingSpots.length === 0) {
    const spotSurabaya = await dbRun(
      'INSERT INTO pooling_spots (name, city, address, phone, landmark) VALUES (?, ?, ?, ?, ?)',
      ['Pool Surabaya', 'Surabaya', 'Jl. Basuki Rahmat No. 12, Tegalsari, Surabaya', '+62 811-3000-001', 'Dekat Tunjungan Plaza']
    );

    const spotMalang = await dbRun(
      'INSERT INTO pooling_spots (name, city, address, phone, landmark) VALUES (?, ?, ?, ?, ?)',
      ['Pool Malang', 'Malang', 'Jl. Ijen No. 45, Klojen, Malang', '+62 811-3000-002', 'Dekat Bundaran Simpang Balapan']
    );

    const surabayaId = spotSurabaya.lastID;
    const malangId = spotMalang.lastID;

    const armadas = await dbAll('SELECT * FROM armadas');
    const defaultArmada = armadas[0] || null;

    const sampleSchedules = [
      { origin: surabayaId, dest: malangId, time: '06:00', price: 95000 },
      { origin: surabayaId, dest: malangId, time: '08:30', price: 100000 },
      { origin: surabayaId, dest: malangId, time: '11:00', price: 95000 },
      { origin: surabayaId, dest: malangId, time: '14:00', price: 95000 },
      { origin: surabayaId, dest: malangId, time: '16:30', price: 110000 },
      { origin: surabayaId, dest: malangId, time: '19:00', price: 110000 },
      { origin: surabayaId, dest: malangId, time: '21:30', price: 100000 },

      { origin: malangId, dest: surabayaId, time: '05:30', price: 95000 },
      { origin: malangId, dest: surabayaId, time: '08:00', price: 100000 },
      { origin: malangId, dest: surabayaId, time: '10:30', price: 95000 },
      { origin: malangId, dest: surabayaId, time: '13:30', price: 95000 },
      { origin: malangId, dest: surabayaId, time: '16:00', price: 110000 },
      { origin: malangId, dest: surabayaId, time: '18:30', price: 110000 },
      { origin: malangId, dest: surabayaId, time: '21:00', price: 100000 }
    ];

    for (const sc of sampleSchedules) {
      await dbRun(
        `INSERT INTO schedules 
         (origin_spot_id, destination_spot_id, departure_time, price, total_seats, armada_id, vehicle_model, vehicle_layout, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          sc.origin, 
          sc.dest, 
          sc.time, 
          sc.price, 
          defaultArmada ? defaultArmada.total_seats : 10,
          defaultArmada ? defaultArmada.id : null,
          defaultArmada ? defaultArmada.name : 'Toyota HiAce Premio',
          defaultArmada ? defaultArmada.layout_json : 'hiace_10'
        ]
      );
    }
  }
}

// ==========================================
// CUSTOMER CRM & MANAGEMENT HELPERS
// ==========================================

export const upsertCustomer = async ({ phone, name, email, auth_method }) => {
  if (!phone) return null;
  const existing = await dbGet('SELECT id FROM customers WHERE phone = ?', [phone]);
  if (existing) {
    await dbRun(
      `UPDATE customers 
       SET name = COALESCE(NULLIF(?, ''), name),
           email = COALESCE(NULLIF(?, ''), email),
           auth_method = COALESCE(NULLIF(?, ''), auth_method),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name || null, email || null, auth_method || null, existing.id]
    );
    return existing.id;
  } else {
    const res = await dbRun(
      `INSERT INTO customers (phone, name, email, auth_method)
       VALUES (?, ?, ?, ?)`,
      [phone, name || 'Pelanggan', email || '', auth_method || 'phone']
    );
    return res.lastID;
  }
};

export const getEnrichedCustomers = async () => {
  const rows = await dbAll(`
    SELECT 
      c.id, c.phone, c.name, c.email, c.auth_method, c.is_vip, c.is_blacklisted, c.notes, c.created_at, c.updated_at,
      COUNT(b.id) as total_trips,
      SUM(CASE WHEN b.booking_status != 'CANCELLED' THEN 1 ELSE 0 END) as completed_trips,
      SUM(CASE WHEN b.booking_status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_trips,
      COALESCE(SUM(CASE WHEN b.booking_status != 'CANCELLED' AND b.payment_status = 'PAID' THEN b.total_price ELSE 0 END), 0) as total_spent,
      MAX(b.travel_date) as last_travel_date
    FROM customers c
    LEFT JOIN bookings b ON c.phone = b.customer_phone
    GROUP BY c.id
    ORDER BY c.is_vip DESC, total_trips DESC, c.updated_at DESC
  `);
  return rows;
};

export const getCustomerBookings = async (phone) => {
  if (!phone) return [];
  return await dbAll(`
    SELECT 
      b.id, b.booking_code, b.schedule_id, b.travel_date, b.customer_name, b.customer_phone,
      b.seat_numbers, b.seats_count, b.price_per_seat, b.total_price, b.payment_method,
      b.payment_status, b.booking_status, b.created_at,
      s.departure_time, s.vehicle_model,
      origin.name as origin_name, origin.city as origin_city,
      dest.name as destination_name, dest.city as destination_city
    FROM bookings b
    LEFT JOIN schedules s ON b.schedule_id = s.id
    LEFT JOIN pooling_spots origin ON s.origin_spot_id = origin.id
    LEFT JOIN pooling_spots dest ON s.destination_spot_id = dest.id
    WHERE b.customer_phone = ?
    ORDER BY b.created_at DESC
  `, [phone]);
};

export const updateCustomerRecord = async (id, { name, email, is_vip, is_blacklisted, notes }) => {
  const fields = [];
  const params = [];
  if (name !== undefined) { fields.push('name = ?'); params.push(name); }
  if (email !== undefined) { fields.push('email = ?'); params.push(email); }
  if (is_vip !== undefined) { fields.push('is_vip = ?'); params.push(is_vip ? 1 : 0); }
  if (is_blacklisted !== undefined) { fields.push('is_blacklisted = ?'); params.push(is_blacklisted ? 1 : 0); }
  if (notes !== undefined) { fields.push('notes = ?'); params.push(notes); }
  fields.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  await dbRun(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`, params);
  return await dbGet('SELECT * FROM customers WHERE id = ?', [id]);
};

export default db;
