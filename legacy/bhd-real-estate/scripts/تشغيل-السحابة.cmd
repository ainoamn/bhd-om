@echo off
chcp 65001 >nul
set ROOT=%~dp0..\
cd /d "%ROOT%"

echo.
echo ═══════════════════════════════════════
echo   BHD Cloud — تشغيل API السحابي
echo ═══════════════════════════════════════
echo.

where docker >nul 2>&1
if %ERRORLEVEL%==0 (
    echo [1/4] تشغيل PostgreSQL + API (Docker stack)...
    docker compose -f "%ROOT%deploy\docker-compose.stack.yml" up -d --build
    if %ERRORLEVEL% neq 0 (
        echo تحذير: فشل stack — جرّب docker-compose.dev.yml
        docker compose -f "%ROOT%deploy\docker-compose.dev.yml" up -d
    ) else (
        echo API في Docker: http://localhost:3790/api/v1/health
        echo للواجهة: تشغيل-الخادم.cmd ^(مع CLOUD_API_URL^)
        timeout /t 5 /nobreak >nul
        goto done_docker
    )
) else (
    echo [1/4] Docker غير موجود — تشغيل API محلياً...
)

cd /d "%ROOT%apps\api"
if not exist .env copy .env.example .env

echo [2/4] تثبيت الحزم...
call npm install >nul 2>&1

echo [3/4] تطبيق migrations...
call npm run db:deploy

echo [4/4] تشغيل API محلياً على http://localhost:3790/
echo.
echo للتحقق: npm run verify:stack
node "%ROOT%tools\ensure-server-cloud-env.js"
echo.
npm run dev
exit /b 0

:done_docker
cd /d "%ROOT%apps\api"
if not exist .env copy .env.example .env
call npm run db:deploy >nul 2>&1
call npm run db:seed >nul 2>&1
node "%ROOT%tools\ensure-server-cloud-env.js"
echo.
echo للتحقق: cd apps\api ^&^& npm run verify:stack
echo.
