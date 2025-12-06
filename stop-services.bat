@echo off
title I&C Insurance Brokers - Stop Services
color 0C

echo ============================================
echo   I&C Insurance Brokers - Stop Services
echo ============================================
echo.

echo [INFO] Stopping all Node.js processes...
taskkill /F /IM node.exe >nul 2>nul

echo.
echo [SUCCESS] All services stopped.
echo.
pause



