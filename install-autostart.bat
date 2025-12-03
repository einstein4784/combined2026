@echo off
title I&C Insurance Brokers - Install Autostart
color 0B

echo ============================================
echo   I&C Insurance Brokers - Autostart Setup
echo ============================================
echo.

:: Create a shortcut in the Startup folder
set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_PATH=%STARTUP_FOLDER%\I&C Insurance.lnk
set TARGET_PATH=C:\IandC\Drezoc_v2.0\start-services.bat

echo [INFO] Creating startup shortcut...
echo.

:: Use PowerShell to create the shortcut
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT_PATH%'); $Shortcut.TargetPath = '%TARGET_PATH%'; $Shortcut.WorkingDirectory = 'C:\IandC\Drezoc_v2.0'; $Shortcut.Description = 'I&C Insurance Brokers - Auto Start Services'; $Shortcut.Save()"

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Autostart installed successfully!
    echo.
    echo The I^&C Insurance system will now start automatically
    echo when Windows boots up.
    echo.
    echo Shortcut location:
    echo %SHORTCUT_PATH%
) else (
    echo [ERROR] Failed to create startup shortcut.
    echo Please run this script as Administrator.
)

echo.
echo ============================================
echo.
pause

