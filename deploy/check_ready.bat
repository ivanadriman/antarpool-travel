@echo off
echo ===================================================
echo   AntarPool Travel - Deployment Readiness Check
echo ===================================================
echo.

echo 1. Testing Client build...
cd ..\client
call npm.cmd run build
if %errorlevel% neq 0 (
    echo [ERROR] Client build failed!
    pause
    exit /b %errorlevel%
)
echo [OK] Client build succeeded!
echo.

echo 2. Testing Business build...
cd ..\business
call npm.cmd run build
if %errorlevel% neq 0 (
    echo [ERROR] Business build failed!
    pause
    exit /b %errorlevel%
)
echo [OK] Business build succeeded!
echo.

echo 3. Running Automated Contract & Concurrency Tests...
cd ..
call npm.cmd test
if %errorlevel% neq 0 (
    echo [ERROR] Contract test suite failed!
    pause
    exit /b %errorlevel%
)
echo [OK] All contract tests passed!
echo.

echo ===================================================
echo   All builds and tests passed! Ready to push.
echo ===================================================
pause
