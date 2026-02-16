# تشغيل سيرفر التطوير - BHD-OM
# إذا واجهت مشكلة "Unable to acquire lock" أو "Port in use"، هذا السكربت يحل المشكلة

Write-Host "جاري التحقق من العمليات القديمة..." -ForegroundColor Cyan

# إيقاف أي عملية Next.js على المنفذ 3000
$port3000 = netstat -ano | findstr ":3000.*LISTENING"
if ($port3000) {
    $pid = ($port3000 -split '\s+')[-1]
    if ($pid -match '^\d+$') {
        Write-Host "إيقاف العملية $pid التي تستخدم المنفذ 3000..." -ForegroundColor Yellow
        taskkill /F /PID $pid 2>$null
        Start-Sleep -Seconds 2
    }
}

# إزالة ملف القفل إن وجد
$lockPath = Join-Path $PSScriptRoot "..\.next\dev\lock"
if (Test-Path $lockPath) {
    Write-Host "إزالة ملف القفل..." -ForegroundColor Yellow
    Remove-Item $lockPath -Force
}

Write-Host "تشغيل السيرفر..." -ForegroundColor Green
Set-Location (Join-Path $PSScriptRoot "..")
npm run dev
