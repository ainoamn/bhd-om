@echo off
cd /d "%~dp0desktop"
if not exist "main.js" (
    echo Error: desktop folder missing.
    pause
    exit /b 1
)
if not exist "node_modules\electron" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo Failed to install. Get Node.js from https://nodejs.org
        pause
        exit /b 1
    )
)
call node copy-assets.js
if errorlevel 1 (
    echo Failed to copy bhd-real-estate.html
    pause
    exit /b 1
)
call npm start
if errorlevel 1 pause & exit /b 1
