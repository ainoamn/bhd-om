@echo off
chcp 65001 >nul
set ROOT=%~dp0..\
cd /d "%ROOT%deploy"

if not exist .env.prod (
    echo إنشاء deploy\.env.prod من المثال...
    copy .env.prod.example .env.prod
    echo.
    echo عدّل deploy\.env.prod:
    echo   - DOMAIN
    echo   - POSTGRES_PASSWORD
    echo   - JWT_ACCESS_SECRET / JWT_REFRESH_SECRET
    echo.
    echo لتوليد أسرار: node tools\generate-jwt-secrets.js
    pause
    exit /b 1
)

echo.
echo ═══════════════════════════════════════
echo   BHD — إنتاج (Docker + HTTPS)
echo ═══════════════════════════════════════
echo.

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
if %ERRORLEVEL% neq 0 (
    echo فشل — تأكد أن Docker Desktop يعمل.
    exit /b 1
)

echo.
echo بعد التشغيل:
echo   1) seed أول مرة: docker compose -f docker-compose.prod.yml --env-file .env.prod exec api npm run db:seed
echo   2) هجرة البيانات من جهازكم: هجرة-السحابة.cmd ...
echo   3) افتح https://YOUR_DOMAIN
echo.
