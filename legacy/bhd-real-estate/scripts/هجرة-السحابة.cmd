@echo off
chcp 65001 >nul
set ROOT=%~dp0..\
cd /d "%ROOT%apps\api"

if "%~1"=="" (
    echo.
    echo الاستخدام:
    echo   هجرة-السحابة.cmd --dry-run
    echo   هجرة-السحابة.cmd --db "C:\path\rental.db" --data-dir "C:\path\BHD-Real-Estate"
    echo.
    echo تأكد أن API يعمل وأن db:deploy و db:seed تم تنفيذهما.
    exit /b 1
)

set DB=
set DATADIR=
set DRY=
set SLUG=bhd-demo

:parse
if "%~1"=="" goto run
if /i "%~1"=="--db" (
    set DB=%~2
    shift
    shift
    goto parse
)
if /i "%~1"=="--data-dir" (
    set DATADIR=%~2
    shift
    shift
    goto parse
)
if /i "%~1"=="--company-slug" (
    set SLUG=%~2
    shift
    shift
    goto parse
)
if /i "%~1"=="--dry-run" (
    set DRY=--dry-run
    shift
    goto parse
)
shift
goto parse

:run
if "%DB%"=="" (
    if exist "%USERPROFILE%\BHD International Dropbox\BHD International team folder\BHD\rental.db" (
        set DB=%USERPROFILE%\BHD International Dropbox\BHD International team folder\BHD\rental.db
    ) else if exist "%ROOT%data\rental.db" (
        set DB=%ROOT%data\rental.db
    ) else (
        echo خطأ: حدد --db مسار rental.db
        exit /b 1
    )
)

echo.
echo ═══════════════════════════════════════
echo   هجرة BHD إلى السحابة
echo ═══════════════════════════════════════
echo DB:      %DB%
echo Company: %SLUG%
if not "%DATADIR%"=="" echo Files:   %DATADIR%
if not "%DRY%"=="" echo Mode:    dry-run
echo.

if not "%DATADIR%"=="" (
    call npm run migrate:all -- --db "%DB%" --data-dir "%DATADIR%" --company-slug %SLUG% %DRY%
) else (
    call npm run migrate:kv -- --db "%DB%" --company-slug %SLUG% %DRY%
)

echo.
echo تم. للتحقق: npm run verify:stack
echo.
