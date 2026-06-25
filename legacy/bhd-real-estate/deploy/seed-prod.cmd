@echo off
chcp 65001 >nul
set ROOT=%~dp0
cd /d "%ROOT%deploy"

if not exist .env.prod (
    echo أنشئ deploy\.env.prod أولاً — انظر docs\PRODUCTION_DEPLOY.md
    exit /b 1
)

docker compose -f docker-compose.prod.yml --env-file .env.prod exec api npm run db:seed
echo.
echo Seed OK. غيّر كلمة مرور المدير بعد أول دخول.
