# 🌐 Step-by-Step Online Deployment Guide

Welcome! This guide walks you through deploying your **AntarPool Travel & Rental** platform completely free of charge using:
1. **GitHub** (source code repository)
2. **Render** (backend API + real-time WebSocket + persistent SQLite database)
3. **Netlify** (Client Passenger App + Business Operator Dashboard)

---

## 📋 Overview of What Will Be Live

| Component | Hosted On | URL Example |
|---|---|---|
| **Backend API + WebSocket** | Render | `https://antarpool-api.onrender.com` |
| **Client App (Passenger)** | Netlify | `https://antarpool-travel.netlify.app` |
| **Business App (Operator)** | Netlify | `https://antarpool-operator.netlify.app` |

---

## 🔒 Business App Security (Already Configured)
Before anyone can view or manage bookings, schedules, armadas, or revenue in the Business App, they will see a **Login Gate**.
- **Default Username:** `admin`
- **Default Password:** `antarpool2026`
*(You can customize these later in Netlify Environment Variables using `VITE_OPERATOR_USER` and `VITE_OPERATOR_PASS`)*

---

## 🚀 STEP 1: Push Your Project to GitHub

1. Open your browser and go to [github.com](https://github.com).
2. Click **New Repository**:
   - Repository name: `antarpool-travel` (or any name you prefer)
   - Visibility: **Public** or **Private** (both work with Render & Netlify free tiers)
   - Do **NOT** check "Add a README file" (we already have our project ready).
   - Click **Create repository**.
3. Open a terminal or PowerShell in your project folder (`Car - Travel and Rental`) and run:
   ```bash
   git init
   git add .
   git commit -m "feat: complete antarpool travel platform with auth and deployment readiness"
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/antarpool-travel.git
   git push -u origin main
   ```
   *(Replace `YOUR_GITHUB_USERNAME` and repo name with yours)*

---

## 🖥️ STEP 2: Deploy Backend to Render (with Persistent Disk)

1. Sign up or log in to [render.com](https://render.com) using your GitHub account.
2. In your Render Dashboard, click **New +** → select **Web Service**.
3. Choose **Build and deploy from a Git repository** → select your `antarpool-travel` repository.
4. Fill in the service configuration:
   - **Name:** `antarpool-api` (or any unique name)
   - **Region:** Choose Singapore (`Southeast Asia`) for fastest response in Indonesia.
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan Type:** **Free**
5. **Attach Persistent Storage (CRITICAL for SQLite Database):**
   - Scroll down to **Disks** → click **Add Disk**.
   - Name: `travel-db-storage`
   - Mount Path: `/data`
   - Size: `1 GB` (Free)
6. **Set Environment Variables:**
   - Scroll to **Environment Variables** → click **Add Environment Variable**:
     - Key: `DATABASE_PATH` | Value: `/data/travel.db`
7. Click **Create Web Service**.
8. Wait 1–2 minutes for the build to finish. Once it says **Live**, copy your Render URL at the top:
   > 📌 *Example Render URL:* `https://antarpool-api.onrender.com`

---

## 📱 STEP 3: Deploy Client App (Passenger) to Netlify

1. Sign up or log in to [netlify.com](https://netlify.com) using your GitHub account.
2. In the Netlify Dashboard, click **Add new site** → select **Import an existing project**.
3. Choose **GitHub** and select your `antarpool-travel` repository.
4. Configure Build settings:
   - **Site name:** e.g. `antarpool-travel`
   - **Base directory:** `client`
   - **Build command:** `npm run build`
   - **Publish directory:** `client/dist`
5. **Add Environment Variable:**
   - Click **Add environment variables** (or go to Site configuration → Environment variables):
     - Key: `VITE_API_URL`
     - Value: `https://antarpool-api.onrender.com` *(paste your Render URL from Step 2, no trailing slash)*
6. Click **Deploy antarpool-travel**.
7. Once deployed, Netlify will give you a public URL (e.g. `https://antarpool-travel.netlify.app`).

---

## 🏢 STEP 4: Deploy Business App (Operator) to Netlify

1. In your Netlify Dashboard, click **Add new site** → **Import an existing project** again.
2. Choose **GitHub** and pick the **same repository** (`antarpool-travel`).
3. Configure Build settings for the Business App:
   - **Site name:** e.g. `antarpool-operator`
   - **Base directory:** `business`
   - **Build command:** `npm run build`
   - **Publish directory:** `business/dist`
4. **Add Environment Variables:**
   - Key: `VITE_API_URL` | Value: `https://antarpool-api.onrender.com` *(your Render URL)*
   - *(Optional)* Key: `VITE_OPERATOR_USER` | Value: `your_username`
   - *(Optional)* Key: `VITE_OPERATOR_PASS` | Value: `your_secure_password`
5. Click **Deploy antarpool-operator**.
6. Netlify will generate your operator link (e.g. `https://antarpool-operator.netlify.app`).

---

## 🔗 STEP 5: Final Check & CORS Sync

1. Go back to your [Render Dashboard](https://dashboard.render.com).
2. Open your `antarpool-api` service → go to **Environment Variables**.
3. Add or update:
   - `CLIENT_URL` = `https://antarpool-travel.netlify.app` *(your actual Client Netlify URL)*
   - `BUSINESS_URL` = `https://antarpool-operator.netlify.app` *(your actual Business Netlify URL)*
4. Click **Save Changes** (Render will auto-deploy the update).

---

## ✅ Live Verification Checklist

- [ ] **Client App:** Open the client Netlify link on your phone/PC. The routes (Pool Surabaya, Pool Malang) and departure times should load.
- [ ] **Seat Booking:** Select a seat and complete booking. A digital boarding pass with your booking code should appear.
- [ ] **Business App Login:** Open the business Netlify link. You should see the **Operator Login Gate**. Try logging in with `admin` / `antarpool2026`.
- [ ] **Live Notification:** When a new booking is placed on the client app, the business dashboard should chime and announce the order in real time.
- [ ] **Database Persistence:** Restart the Render service. Your previous orders, seeded armadas, and schedules remain intact!
