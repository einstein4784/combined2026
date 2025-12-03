@echo off
echo Starting I&C Insurance Brokers Management System...
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd server && npm start"

timeout /t 3 /nobreak >nul

echo Starting Frontend Development Server...
start "Frontend Server" cmd /k "cd Admin && npx gulp"

echo.
echo System is starting...
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Default Login:
echo Username: admin
echo Password: admin123
echo.
pause


