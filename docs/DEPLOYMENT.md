# Deployment Guide

AntarPool supports two deployment workflows depending on your targeted environment.

## 1. Demo Target (100% Free - Supabase + Vercel / Netlify)

Designed for rapid showcasing without maintaining a server.
- **Detailed Step-by-Step Guide:** Refer to [`deploy/STEP_BY_STEP_GUIDE.md`](../deploy/STEP_BY_STEP_GUIDE.md).
- **Client App Deployment:**
  - Build command: `npm run build`
  - Output directory: `dist`
  - Environment variables:
    ```env
    VITE_BACKEND=supabase
    VITE_SUPABASE_URL=https://your-project.supabase.co
    VITE_SUPABASE_ANON_KEY=your-anon-key
    ```
- **Business App Deployment:**
  - Same environment variables as client app.

---

## 2. Production Target (Self-Hosted Node.js Server + VPS / Container)

Recommended when running real passenger operations with payment gateways and persistent data.

### Architecture
- **Backend Service:** Node.js Express server (`server/src/server.js`) hosted on a VPS (DigitalOcean, Hetzner, AWS EC2, Railway, or Render with persistent volume).
- **Database:** SQLite (`server/travel.db`) on a persistent volume, or PostgreSQL.
- **Frontend Apps:** Deployed to Vercel, Netlify, Cloudflare Pages, or static Nginx.

### Server Environment Variables (`server/.env`)
```env
PORT=5000
OPERATOR_USER=operator_admin
OPERATOR_PASS=YourStrongPasswordHere!
JWT_SECRET=super_secret_jwt_key_64_characters_min
CLIENT_URL=https://travel.yourdomain.com
BUSINESS_URL=https://admin.yourdomain.com
DATABASE_PATH=/var/data/travel.db
```

> [!IMPORTANT]
> If deploying SQLite to a container platform like Railway or Render, ensure you mount a **persistent volume** to `/var/data/` (or the folder containing `travel.db`). Without a persistent volume, database changes will be wiped on container restart or redeploy.

### Frontend Environment Variables (`client/.env` and `business/.env`)
```env
VITE_BACKEND=rest
VITE_API_URL=https://api.yourdomain.com
```

---

## Pre-Deployment Verification

Before pushing code to production or deploying:
```bash
# 1. Run compiler check
deploy\check_ready.bat

# 2. Run automated contract & concurrency test suite
npm test
```

Expected output:
```
✔ 1. Spots endpoint returns seeded terminal pooling spots
✔ 2. Operator authentication succeeds with valid credentials and rejects invalid
✔ 3. Protected business routes return 401 without valid operator token
✔ 4. Atomic booking creation, seat collision prevention, and concurrency check
✔ 5. Armada update automatically synchronizes schedule layout and capacity
✔ 6. Analytics report reflects active and pending totals
ℹ pass 6
ℹ fail 0
```
