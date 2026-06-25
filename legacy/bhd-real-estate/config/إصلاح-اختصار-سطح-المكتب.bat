@echo off
chcp 65001 >nul
title إصلاح اختصار BHD / Fix BHD shortcut
echo جاري إنشاء اختصار سطح المكتب...
echo Creating desktop shortcut...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\desktop\create-desktop-shortcut.ps1"
if errorlevel 1 (
    echo فشل إنشاء الاختصار. / Failed to create shortcut.
    pause
    exit /b 1
)
echo.
echo تم. ابحث عن «BHD Real Estate» أو «BHD عقود الإيجار» على سطح المكتب.
echo Done. Look for the shortcut on your desktop.
pause
