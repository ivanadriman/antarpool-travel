@echo off
echo ===================================================
echo   Starting Car Travel & Rental Platform Servers...
echo ===================================================

start "Travel Backend (Port 5000)" cmd /k "cd server && npm run dev"
start "Travel Client Web App (Port 5173)" cmd /k "cd client && npm run dev"
start "Travel Business Web App (Port 5174)" cmd /k "cd business && npm run dev"

echo.
echo All 3 servers are running!
echo You can now open the apps yourself using:
echo  1. "Client App (Passenger).url"   (http://localhost:5173)
echo  2. "Business App (Operator).url"  (http://localhost:5174)
echo.
timeout /t 5
