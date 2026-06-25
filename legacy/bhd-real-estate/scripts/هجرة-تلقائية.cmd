@echo off
chcp 65001 >nul
set ROOT=%~dp0..\
cd /d "%ROOT%apps\api"
echo اختيار أفضل rental.db للهجرة...
call npm run pick:db
echo.
set /p GO=تشغيل الهجرة الآن؟ (y/N): 
if /i not "%GO%"=="y" exit /b 0
cd /d "%ROOT%"
for /f "delims=" %%F in ('node tools\pick-best-rental-db.js ^| findstr /R "^  C:"') do (
    set DB=%%F
    goto migrate
)
echo لم يُعثر على rental.db
exit /b 1
:migrate
set DB=%DB:~2%
echo هجرة من: %DB%
cd apps\api
call npm run migrate:kv -- --db "%DB%" --company-slug bhd-demo
call npm run backup:pg
