# إعادة تشغيل سيرفر التطوير بشكل نظيف
# Clean restart of Next.js dev server

Write-Host "Stopping any running Node processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

if (Test-Path ".next\dev\lock") {
    Write-Host "Removing dev lock file..." -ForegroundColor Yellow
    Remove-Item ".next\dev\lock" -Force -ErrorAction SilentlyContinue
}

Write-Host "Starting Next.js dev server..." -ForegroundColor Green
npm run dev
