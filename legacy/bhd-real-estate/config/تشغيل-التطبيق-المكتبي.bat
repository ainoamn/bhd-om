@echo off
chcp 65001 >nul
title BHD Real Estate — تشغيل التطبيق المكتبي
cd /d "%~dp0..\desktop"
if not exist "main.js" (
    echo خطأ: مجلد desktop غير موجود أو ناقص. / Error: desktop folder missing.
    pause
    exit /b 1
)
if not exist "node_modules\electron" (
    echo Installing dependencies... / تثبيت المتطلبات...
    call npm install
    if errorlevel 1 (
        echo Failed to install. Install Node.js from https://nodejs.org
        echo فشل التثبيت. ثبّت Node.js من https://nodejs.org
        pause
        exit /b 1
    )
)
echo Updating app files... / تحديث ملفات التطبيق...
call node copy-assets.js
if errorlevel 1 (
    echo Failed to copy bhd-real-estate.html / فشل نسخ ملف التطبيق
    pause
    exit /b 1
)
echo Starting BHD Real Estate desktop app...
echo جاري تشغيل تطبيق BHD المكتبي...
call npm start
if errorlevel 1 (
    echo.
    echo التطبيق توقف بخطأ. / The app exited with an error.
    pause
    exit /b 1
)
