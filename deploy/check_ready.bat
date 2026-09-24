@echo off
echo ===================================================
echo   AntarPool Travel - Deployment Readiness Check
echo ===================================================
echo.

echo 1. Testing Client build...
cd ..\client
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Client build failed!
    pause
    exit /b %errorlevel%
)
echo [OK] Client build succeeded!
echo.

echo 2. Testing Business build...
cd ..\business
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Business build failed!
    pause
    exit /b %errorlevel%
)
echo [OK] Business build succeeded!
echo.

echo ===================================================
echo   All builds passed! Ready to push to GitHub.
echo ===================================================
cd ..
pause
