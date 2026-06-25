@echo off
chcp 65001 >nul
title BHD Real Estate — Desktop App
cd /d "%~dp0..\desktop"
if not exist "node_modules\electron" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo Failed to install. Install Node.js from https://nodejs.org
        pause
        exit /b 1
    )
)
call node copy-assets.js
if errorlevel 1 pause & exit /b 1
call npm start
if errorlevel 1 pause & exit /b 1
