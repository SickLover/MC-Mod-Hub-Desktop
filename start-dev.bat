@echo off
chcp 65001 >nul
:: Switch to script directory
cd /d "%~dp0"

:: Try global node first
where node >nul 2>nul
if %errorlevel% equ 0 goto :run

:: Fallback: portable Node.js
set "PORTABLE=%TEMP%\node-v22.14.0-win-x64"
if exist "%PORTABLE%\node.exe" (
    set "PATH=%PORTABLE%;%PATH%"
    echo [OK] Portable Node detected
    goto :run
)

echo [ERROR] Node.js not found. Please install Node.js or place portable version at %PORTABLE%
pause
exit /b 1

:run
echo Starting MC Mod Hub...
node start-dev.js
pause
