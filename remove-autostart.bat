@echo off
title I&C Insurance Brokers - Remove Autostart
color 0E

echo ============================================
echo   I&C Insurance Brokers - Remove Autostart
echo ============================================
echo.

set SHORTCUT_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\I&C Insurance.lnk

if exist "%SHORTCUT_PATH%" (
    del "%SHORTCUT_PATH%"
    echo [SUCCESS] Autostart removed successfully!
    echo.
    echo The I^&C Insurance system will no longer start
    echo automatically when Windows boots up.
) else (
    echo [INFO] Autostart shortcut not found.
    echo Nothing to remove.
)

echo.
echo ============================================
echo.
pause

