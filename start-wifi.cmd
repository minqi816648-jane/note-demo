@echo off
REM note-demo WiFi one-click launcher
REM Cleans stale Metro, detects LAN IP, starts Metro, prints/auto-connects URL
REM Usage:
REM   start-wifi.cmd          start Metro and print connection URL
REM   start-wifi.cmd adb      also auto-connect the USB phone via adb
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================================
echo  note-demo WiFi launcher
echo ============================================================
echo.

echo [1/4] Cleaning stale Metro processes...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":8081" ^| findstr "LISTENING"') do taskkill /PID %%P /F >nul 2>&1
taskkill /IM node.exe /F >nul 2>&1
ping -n 3 127.0.0.1 >nul
echo        done.

echo [2/4] Detecting LAN IP...
set "IP="
for /f %%A in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1).IPAddress"') do set "IP=%%A"
if "!IP!"=="" (
    echo        [ERROR] cannot detect LAN IP, please check WiFi.
    set "IP=192.168.1.100"
)
echo        IP = !IP!

echo [3/4] Starting Metro (LAN mode) in a new window...
start "note-demo Metro" cmd /k "set NODE_OPTIONS=--max-old-space-size=4096 && set EXPO_USE_METRO_WORKSPACE_ROOT=1 && call node_modules\.bin\expo.cmd start --lan"
echo        Metro launched. Keep that window open.

echo        waiting for Metro to be ready...
set "READY=0"
for /l %%i in (1,1,30) do (
    ping -n 2 127.0.0.1 >nul
    netstat -ano | findstr ":8081" | findstr "LISTENING" >nul 2>&1 && set "READY=1"
    if "!READY!"=="1" goto :ready
)
:ready
if "!READY!"=="1" (
    echo        Metro ready on port 8081.
) else (
    echo        [WARNING] Metro not detected within 30s, check the Metro window.
)

echo.
echo ============================================================
echo  Connection URL (phone and PC on the same WiFi):
echo.
echo      http://!IP!:8081
echo.
echo  On the phone:
echo    A. Open app - dev-launcher - Connect and type the URL above
echo    B. If USB connected, rerun: start-wifi.cmd adb  (auto connect)
echo ============================================================
echo.

if /i "%~1"=="adb" (
    echo [4/4] Auto-connecting phone via adb...
    where adb >nul 2>&1
    if errorlevel 1 (
        set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
    ) else (
        set "ADB=adb"
    )
    "!ADB!" reverse tcp:8081 tcp:8081 >nul 2>&1
    echo        adb reverse set (fallback), launching app...
    "!ADB!" shell am force-stop com.anonymous.notedemo >nul 2>&1
    "!ADB!" shell am start -a android.intent.action.VIEW -d "note-demo://expo-development-client/?url=http%%3A%%2F%%2F!IP!%%3A8081" com.anonymous.notedemo >nul 2>&1
    echo        done, check the phone.
)

echo.
echo  To quit, close the "note-demo Metro" window.
endlocal
