@echo off
cd /d "%~dp0"
if not exist "main.js" (
    echo Error: main.js missing.
    pause
    exit /b 1
)
if not exist "node_modules\electron" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 exit /b 1
)
call node copy-assets.js
if errorlevel 1 (
    echo Failed to copy bhd-real-estate.html
    pause
    exit /b 1
)
echo Starting BHD Real Estate...
call npm run start
if errorlevel 1 pause & exit /b 1
