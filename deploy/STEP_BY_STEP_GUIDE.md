# 🌐 Step-by-Step Online Deployment Guide (100% Free - NO Credit Card)

Welcome! This guide walks you through deploying your **AntarPool Travel & Rental** platform completely free of charge with **ZERO credit card required** using:
1. **GitHub** (source code repository)
2. **Zeabur** (backend API + real-time WebSocket server — **No Credit Card Required**)
3. **Netlify** (Client Passenger App + Business Operator Dashboard — **No Credit Card Required**)

---

## 📋 Overview of What Will Be Live

| Component | Hosted On | URL Example |
|---|---|---|
| **Backend API + WebSocket** | Zeabur | `https://antarpool-api.zeabur.app` |
| **Client App (Passenger)** | Netlify | `https://antarpool-travel.netlify.app` |
| **Business App (Operator)** | Netlify | `https://antarpool-operator.netlify.app` |

---

## 🔒 Business App Security (Already Active)
The Business App is already protected by an **Operator Login Gate**:
- **Default Username:** `admin`
- **Default Password:** `antarpool2026`
*(Customizable via Netlify Environment Variables `VITE_OPERATOR_USER` and `VITE_OPERATOR_PASS`)*

---

## 🚀 STEP 1: Commit and Push Your Project to GitHub

1. Open your browser and go to [github.com](https://github.com).
2. Create a new repository:
   - Name: `antarpool-travel` (or any name)
   - Visibility: **Public** or **Private** (both work)
   - Do **NOT** check "Add a README file"
   - Click **Create repository**.
3. In your project root folder (`Car - Travel and Rental`), run:
   ```bash
   git init
   git add .
   git commit -m "feat: complete antarpool travel platform with auth and zeabur deployment"
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/antarpool-travel.git
   git push -u origin main
   ```
   *(Replace with your actual GitHub username and repository link)*

---

## 🖥️ STEP 2: Deploy Backend to Zeabur (NO Credit Card)

1. Open [zeabur.com](https://zeabur.com) and click **Login** → select **Continue with GitHub**.
2. Click **Create Project** (select a region close to Indonesia, like Singapore / Asia).
3. Click **Deploy New Service** → select **GitHub**.
4. Choose your repository: `antarpool-travel`.
5. Under configuration:
   - Select directory: `server`
   - Zeabur will automatically detect **Node.js** and start deploying.
6. Once deployed, click on your service card → go to **Networking** (or **Domains**).
7. Click **Generate Domain** to get a free public domain (e.g. `antarpool-api.zeabur.app`).
8. Copy your full backend URL:
   > 📌 *Example URL:* `https://antarpool-api.zeabur.app`

---

## 📱 STEP 3: Deploy Client App (Passenger) to Netlify

1. Go to [netlify.com](https://netlify.com) and sign in with GitHub (No card needed).
2. Click **Add new site** → select **Import an existing project**.
3. Select **GitHub** → choose your `antarpool-travel` repository.
4. Set Build Settings:
   - **Base directory:** `client`
   - **Build command:** `npm run build`
   - **Publish directory:** `client/dist`
5. **Add Environment Variable:**
   - Click **Add environment variables**:
     - Key: `VITE_API_URL`
     - Value: `https://antarpool-api.zeabur.app` *(paste your Zeabur URL from Step 2, NO trailing slash)*
6. Click **Deploy antarpool-travel**.
7. Netlify gives you a live link (e.g. `https://antarpool-travel.netlify.app`).

---

## 🏢 STEP 4: Deploy Business App (Operator) to Netlify

1. In Netlify, click **Add new site** → **Import an existing project** again.
2. Select **GitHub** → choose the same `antarpool-travel` repository.
3. Set Build Settings:
   - **Base directory:** `business`
   - **Build command:** `npm run build`
   - **Publish directory:** `business/dist`
4. **Add Environment Variables:**
   - Key: `VITE_API_URL` | Value: `https://antarpool-api.zeabur.app` *(your Zeabur URL)*
   - *(Optional)* Key: `VITE_OPERATOR_USER` | Value: `admin`
   - *(Optional)* Key: `VITE_OPERATOR_PASS` | Value: `antarpool2026`
5. Click **Deploy antarpool-operator**.
6. Netlify gives you your live operator link (e.g. `https://antarpool-operator.netlify.app`).

---

## 🔗 STEP 5: Add Frontend URLs to Zeabur Environment (CORS)

1. Return to your [Zeabur Dashboard](https://dash.zeabur.com).
2. Click your project → click your `server` service card → go to **Variables** (or **Environment**).
3. Add:
   - `CLIENT_URL` = `https://antarpool-travel.netlify.app` *(your Client Netlify URL)*
   - `BUSINESS_URL` = `https://antarpool-operator.netlify.app` *(your Business Netlify URL)*
4. Zeabur will automatically reload in a few seconds.

---

## ✅ Live Verification Checklist

- [ ] **Client App:** Open the client Netlify link on your phone/PC. Routes (Pool Surabaya, Pool Malang) and departure times should load.
- [ ] **Booking Flow:** Pick a seat and book. The boarding pass with your booking code should appear.
- [ ] **Business App Security:** Open the operator Netlify link. The Login Gate appears. Log in with `admin` / `antarpool2026`.
- [ ] **Live Voice Notification:** Place a new booking from the passenger app. The operator dashboard chimes and speaks the announcement in real time!
