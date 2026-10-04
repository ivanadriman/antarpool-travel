import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const testDbPath = path.resolve(__dirname, 'contract_test.db');
const TEST_PORT = 5098;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProcess = null;
let operatorToken = null;

// Helper to wait for server to listen
async function waitForServer(url, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/spots`);
      if (res.ok) return true;
    } catch (e) {
      // wait and retry
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server failed to start at ${url} within ${timeoutMs}ms`);
}

test.before(async () => {
  // Clean up existing test db if any
  if (fs.existsSync(testDbPath)) {
    try { fs.unlinkSync(testDbPath); } catch (e) {}
  }

  // Start test server instance
  serverProcess = spawn('node', ['src/server.js'], {
    cwd: path.resolve(rootDir, 'server'),
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      DATABASE_PATH: testDbPath,
      OPERATOR_USER: 'admin',
      OPERATOR_PASS: 'antarpool2026',
      JWT_SECRET: 'test-secret-key-for-contracts-12345678'
    },
    stdio: 'ignore'
  });

  await waitForServer(BASE_URL);
});

test.after(() => {
  if (serverProcess) {
    serverProcess.kill();
  }
  // Try clean up test db file after slight delay
  setTimeout(() => {
    try { if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath); } catch (e) {}
  }, 500);
});

test('1. Spots endpoint returns seeded terminal pooling spots', async () => {
  const res = await fetch(`${BASE_URL}/api/spots`);
  assert.equal(res.status, 200);
  const spots = await res.json();
  assert.ok(Array.isArray(spots));
  assert.ok(spots.length >= 2, 'Should have at least 2 spots');
  const names = spots.map((s) => s.name);
  assert.ok(names.includes('Pool Surabaya'), 'Should include Pool Surabaya');
  assert.ok(names.includes('Pool Malang'), 'Should include Pool Malang');
});

test('2. Operator authentication succeeds with valid credentials and rejects invalid', async () => {
  // Invalid password
  const failRes = await fetch(`${BASE_URL}/api/business/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'wrongpassword' })
  });
  assert.equal(failRes.status, 401);

  // Valid password
  const okRes = await fetch(`${BASE_URL}/api/business/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'antarpool2026' })
  });
  assert.equal(okRes.status, 200);
  const data = await okRes.json();
  assert.equal(data.success, true);
  assert.ok(data.token, 'Should return JWT token');
  operatorToken = data.token;
});

test('3. Protected business routes return 401 without valid operator token', async () => {
  const unauthRes = await fetch(`${BASE_URL}/api/business/bookings`);
  assert.equal(unauthRes.status, 401);

  const authRes = await fetch(`${BASE_URL}/api/business/bookings`, {
    headers: { Authorization: `Bearer ${operatorToken}` }
  });
  assert.equal(authRes.status, 200);
});

test('4. Atomic booking creation, seat collision prevention, and concurrency check', async () => {
  // Find route between spots
  const spotsRes = await fetch(`${BASE_URL}/api/spots`);
  const spots = await spotsRes.json();
  const surabaya = spots.find((s) => s.city === 'Surabaya');
  const malang = spots.find((s) => s.city === 'Malang');

  const futureDate = '2026-11-20';
  const schRes = await fetch(`${BASE_URL}/api/schedules?origin=${surabaya.id}&destination=${malang.id}&date=${futureDate}`);
  const schedules = await schRes.json();
  assert.ok(schedules.length > 0, 'Should have schedules');
  const targetSch = schedules[0];

  // A. Create first booking for seat 1A
  const bookRes1 = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      schedule_id: targetSch.id,
      travel_date: futureDate,
      customer_name: 'Penumpang Satu',
      customer_phone: '081234567890',
      seat_numbers: ['1A']
    })
  });
  assert.equal(bookRes1.status, 201);
  const booking1 = await bookRes1.json();
  assert.ok(booking1.booking_code.startsWith('TRV-'), 'Valid booking code format');
  assert.deepEqual(booking1.seat_numbers, ['1A']);
  assert.equal(booking1.total_price, targetSch.price * 1);

  // B. Collision check: Attempt to book seat 1A again -> MUST FAIL WITH 409
  const bookRes2 = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      schedule_id: targetSch.id,
      travel_date: futureDate,
      customer_name: 'Penumpang Dua',
      customer_phone: '081299998888',
      seat_numbers: ['1A']
    })
  });
  assert.equal(bookRes2.status, 409, 'Collision must return 409 Conflict');

  // C. Concurrency test: 10 parallel requests for seat 2A -> EXACTLY ONE MUST SUCCEED
  const concurrentPromises = Array.from({ length: 10 }).map((_, i) =>
    fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schedule_id: targetSch.id,
        travel_date: futureDate,
        customer_name: `Concurrent User ${i}`,
        customer_phone: `0811000000${i}`,
        seat_numbers: ['2A']
      })
    })
  );

  const results = await Promise.all(concurrentPromises);
  const statusCounts = results.map((r) => r.status);
  const successCount = statusCounts.filter((s) => s === 201).length;
  const conflictCount = statusCounts.filter((s) => s === 409).length;

  assert.equal(successCount, 1, 'Exactly one concurrent request must claim seat 2A');
  assert.equal(conflictCount, 9, 'All remaining 9 concurrent requests must receive 409 Conflict');

  // D. Ticket cancellation releases seat
  const cancelRes = await fetch(`${BASE_URL}/api/bookings/${booking1.id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '081234567890' })
  });
  assert.equal(cancelRes.status, 200);

  // E. Seat 1A is now available to be booked again
  const rebookRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      schedule_id: targetSch.id,
      travel_date: futureDate,
      customer_name: 'Penumpang Rebook',
      customer_phone: '081211112222',
      seat_numbers: ['1A']
    })
  });
  assert.equal(rebookRes.status, 201, 'Released seat must be rebookable');
});

test('5. Armada update automatically synchronizes schedule layout and capacity', async () => {
  // Get armadas
  const armadasRes = await fetch(`${BASE_URL}/api/armadas`);
  const armadas = await armadasRes.json();
  assert.ok(armadas.length > 0);
  const targetArmada = armadas[0];

  const newLayout = [
    [{ type: 'driver', label: 'Supir' }, { type: 'empty', label: '' }, { type: 'seat', label: '1A' }],
    [{ type: 'seat', label: '2A' }, { type: 'aisle', label: 'Lorong' }, { type: 'seat', label: '2B' }]
  ];
  const newSeats = 3;

  const updateRes = await fetch(`${BASE_URL}/api/armadas/${targetArmada.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${operatorToken}`
    },
    body: JSON.stringify({
      name: 'Toyota HiAce Modified Test',
      license_plate: targetArmada.license_plate,
      rows_count: 2,
      cols_count: 3,
      layout_json: newLayout,
      total_seats: newSeats
    })
  });
  assert.equal(updateRes.status, 200);

  // Verify schedules using this armada now have updated model and total seats
  const schRes = await fetch(`${BASE_URL}/api/business/schedules?date=2026-11-20`, {
    headers: { Authorization: `Bearer ${operatorToken}` }
  });
  const schedules = await schRes.json();
  const linkedSchedules = schedules.filter((s) => s.armada_id === targetArmada.id);
  for (const sch of linkedSchedules) {
    assert.equal(sch.vehicle_model, 'Toyota HiAce Modified Test');
    assert.equal(sch.total_seats, 3);
  }
});

test('6. Analytics report reflects active and pending totals', async () => {
  const analyticsRes = await fetch(`${BASE_URL}/api/business/analytics`, {
    headers: { Authorization: `Bearer ${operatorToken}` }
  });
  assert.equal(analyticsRes.status, 200);
  const stats = await analyticsRes.json();
  assert.ok(stats.total_bookings > 0);
  assert.ok(typeof stats.pending_revenue === 'number');
  assert.ok(Array.isArray(stats.top_routes));
});
