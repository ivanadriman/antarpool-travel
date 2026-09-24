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

export async function initDb() {
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

export default db;
