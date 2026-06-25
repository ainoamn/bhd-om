@echo off
chcp 65001 >nul
set ROOT=%~dp0..\
cd /d "%ROOT%apps\api"
call npm run preflight
