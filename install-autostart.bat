@echo off
title IC Insurance Brokers - Install Autostart
color 0B

echo ============================================
echo   IC Insurance Brokers - Autostart Setup
echo ============================================
echo.

:: Create a shortcut in the Startup folder
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_NAME=IC Insurance.lnk"
set "TARGET_PATH=C:\IandC\Drezoc_v2.0\start-services.bat"
set "WORKING_DIR=C:\IandC\Drezoc_v2.0"

echo [INFO] Creating startup shortcut...
echo.

:: Use PowerShell to create the shortcut (single line)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%STARTUP_FOLDER%\%SHORTCUT_NAME%'); $s.TargetPath = '%TARGET_PATH%'; $s.WorkingDirectory = '%WORKING_DIR%'; $s.Save()"

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Autostart installed successfully!
    echo.
    echo The IC Insurance system will now start automatically
    echo when Windows boots up.
    echo.
    echo Shortcut location:
    echo %STARTUP_FOLDER%\%SHORTCUT_NAME%
) else (
    echo [ERROR] Failed to create startup shortcut.
)

echo.
echo ============================================
echo.
pause
