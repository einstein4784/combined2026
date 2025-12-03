@echo off
title IC Insurance Brokers - Remove Autostart
color 0E

echo ============================================
echo   IC Insurance Brokers - Remove Autostart
echo ============================================
echo.

set "SHORTCUT_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\IC Insurance.lnk"

if exist "%SHORTCUT_PATH%" (
    del "%SHORTCUT_PATH%"
    echo [SUCCESS] Autostart removed successfully!
    echo.
    echo The IC Insurance system will no longer start
    echo automatically when Windows boots up.
) else (
    echo [INFO] Autostart shortcut not found.
    echo Nothing to remove.
)

echo.
echo ============================================
echo.
pause
