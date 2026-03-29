# تشغيل npm run build مع تسجيل البداية/النهاية وتدوير السجلات
# يطابق أسلوب ain-oman-web: مجلد tools/.../logs + ملف بختم زمني + الاحتفاظ بآخر N ملف

$ErrorActionPreference = 'Continue'
. "$PSScriptRoot\config.ps1"

$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$logFile = Join-Path $LogDir "build-$timestamp.log"

function Write-LogLine {
  param([string]$Message)
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
  Add-Content -Path $logFile -Value $line -Encoding utf8
  Write-Host $line
}

Write-Host ''
Write-Host '========== بدء عملية البناء ==========' -ForegroundColor Cyan
Write-Host "المشروع: $ProjectRoot" -ForegroundColor Gray
Write-Host "ملف السجل: $logFile" -ForegroundColor Gray
Write-Host ''

Write-LogLine '========== BUILD START =========='
Write-LogLine "ProjectRoot=$ProjectRoot"
Write-LogLine "Node=$(node -v 2>$null)"
Write-LogLine "Npm=$(npm -v 2>$null)"

Set-Location $ProjectRoot

Invoke-BuildLogRotation -Directory $LogDir -Keep $MaxBuildLogFiles

# مخرجات للشاشة وللملف دون مسح الترويسة
npm run build 2>&1 | Tee-Object -FilePath $logFile -Append

$buildExit = 0
if ($null -ne $global:LASTEXITCODE -and $global:LASTEXITCODE -ne 0) {
  $buildExit = $global:LASTEXITCODE
} elseif ($null -ne $LASTEXITCODE -and $LASTEXITCODE -ne 0) {
  $buildExit = $LASTEXITCODE
}

# في PowerShell 5 أنبوب Tee-Object قد لا يُحدّث LASTEXITCODE؛ رجوع إلى نص المخرجات
if ($buildExit -eq 0) {
  $tail = Get-Content -Path $logFile -Tail 80 -ErrorAction SilentlyContinue | Out-String
  if ($tail -match 'ELIFECYCLE|Failed to compile|Command failed with exit code [1-9]') {
    $buildExit = 1
  }
}

Write-Host ''
if ($buildExit -eq 0) {
  Write-LogLine '========== BUILD END — نجاح (exit 0) =========='
  Write-Host '========== انتهاء البناء — نجاح ==========' -ForegroundColor Green
} else {
  Write-LogLine "========== BUILD END — فشل (exit $buildExit) =========="
  Write-Host "========== انتهاء البناء — فشل (رمز $buildExit) ==========" -ForegroundColor Red
  Write-Host "راجع السجل: $logFile" -ForegroundColor Yellow
}

Invoke-BuildLogRotation -Directory $LogDir -Keep $MaxBuildLogFiles

Write-Host ''
exit $buildExit
