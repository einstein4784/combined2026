@echo off
title I&C Insurance Brokers - Service Launcher
color 0A

echo ============================================
echo   I&C Insurance Brokers - Service Startup
echo   Powered by Solace-Systems
echo ============================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [INFO] Starting services...
echo.

:: Start Backend Server
echo [1/2] Starting Backend API Server...
cd /d "C:\IandC\Drezoc_v2.0\server"
start "I&C Backend Server" cmd /k "node server.js"
timeout /t 3 /nobreak >nul

:: Start Frontend Server
echo [2/2] Starting Frontend Web Server...
cd /d "C:\IandC\Drezoc_v2.0\Admin\dist"
start "I&C Frontend Server" cmd /k "npx http-server -p 8000 -c-1"
timeout /t 2 /nobreak >nul

echo.
echo ============================================
echo   All services started successfully!
echo ============================================
echo.
echo   Backend API:  http://localhost:3001
echo   Frontend:     http://localhost:8000
echo.
echo   Login Page:   http://localhost:8000/pages-login.html
echo.
echo ============================================
echo.

:: Open the browser to the login page
echo [INFO] Opening browser...
timeout /t 2 /nobreak >nul
start http://localhost:8000/pages-login.html

echo.
echo Press any key to close this window...
echo (Services will continue running in background)
pause >nul

