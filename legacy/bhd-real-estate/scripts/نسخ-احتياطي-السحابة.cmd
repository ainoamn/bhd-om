@echo off
chcp 65001 >nul
set ROOT=%~dp0..\
cd /d "%ROOT%apps\api"
echo نسخ احتياطي PostgreSQL...
call npm run backup:pg
if %ERRORLEVEL% neq 0 (
    echo فشل — تأكد أن PostgreSQL يعمل و DATABASE_URL في apps\api\.env
    exit /b 1
)
echo تم الحفظ في مجلد backups\
