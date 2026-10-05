import express from 'express';
import http from 'http';
import cors from 'cors';
import { PORT } from './config/env.js';
import { initDb } from './db.js';
import { setupWebSocket } from './websocket.js';

import authRouter from './routes/auth.js';
import spotsRouter from './routes/spots.js';
import { schedulesRouter, businessSchedulesRouter } from './routes/schedules.js';
import armadasRouter from './routes/armadas.js';
import { bookingsRouter, businessBookingsRouter } from './routes/bookings.js';
import { clientCustomersRouter, businessCustomersRouter } from './routes/customers.js';
import analyticsRouter from './routes/analytics.js';
import timelineRouter from './routes/timeline.js';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.CLIENT_URL,
  process.env.BUSINESS_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    if (origin.endsWith('.netlify.app') || origin.endsWith('.zeabur.app') || origin.endsWith('.koyeb.app') || origin.endsWith('.onrender.com') || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// Mount Modular Route Handlers
app.use('/api/business', authRouter);
app.use('/api/spots', spotsRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/business/schedules', businessSchedulesRouter);
app.use('/api/armadas', armadasRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/business/bookings', businessBookingsRouter);
app.use('/api/customers', clientCustomersRouter);
app.use('/api/business/customers', businessCustomersRouter);
app.use('/api/business/analytics', analyticsRouter);
app.use('/api/business/timeline', timelineRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'antarpool-travel-api', timestamp: Date.now() });
});

// Setup HTTP server & WebSocket notification engine
const server = http.createServer(app);
setupWebSocket(server);

// Initialize database then start server
initDb().then(() => {
  server.listen(PORT, () => {
    console.log(`Travel & Pooling Backend Server running on http://localhost:${PORT}`);
    console.log(`WebSocket server ready for Business alerts`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

export default app;
