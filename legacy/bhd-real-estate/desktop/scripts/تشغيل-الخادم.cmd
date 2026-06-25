@echo off
chcp 65001 >nul
set ROOT=%~dp0..\
cd /d "%ROOT%server"

if not exist .env (
    copy .env.example .env >nul 2>&1
    node "%ROOT%tools\ensure-server-cloud-env.js" 2>nul
)

echo تشغيل BHD Real Estate على http://localhost:3789/
findstr /B "CLOUD_API_URL=" .env >nul 2>&1
if %ERRORLEVEL%==0 (
    echo السحابة: مربوطة عبر CLOUD_API_URL
) else (
    echo تلميح: شغّل إعداد-مسار-A.cmd أو أضف CLOUD_API_URL في server\.env
)
echo.
npm start
