@echo off
chcp 65001 >nul
set ROOT=%~dp0..\
cd /d "%ROOT%"

echo.
echo ═══════════════════════════════════════
echo   BHD — تشغيل للفريق (شبكة محلية)
echo ═══════════════════════════════════════
echo.

call "%ROOT%scripts\تشغيل-السحابة.cmd"
if %ERRORLEVEL% neq 0 (
    echo تحذير: تحقق من Docker
)

node "%ROOT%tools\enable-lan-access.js"

echo.
echo تشغيل الواجهة للشبكة المحلية...
cd /d "%ROOT%server"
start "BHD Web" cmd /k npm start

echo.
echo شارك الرابط أعلاه مع الموظفين.
echo للتفاصيل: docs\TEAM_TESTING.md
echo.
