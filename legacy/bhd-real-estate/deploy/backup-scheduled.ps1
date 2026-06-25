# نسخ احتياطي مجدول — Windows Task Scheduler
# إنشاء مهمة يومية:
#   schtasks /Create /TN "BHD Cloud Backup" /TR "powershell -ExecutionPolicy Bypass -File \"%ROOT%deploy\backup-scheduled.ps1\"" /SC DAILY /ST 02:00

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ApiDir = Join-Path $Root 'apps\api'
$LogDir = Join-Path $Root 'backups\logs'
$Stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$LogFile = Join-Path $LogDir 'backup.log'

try {
    Push-Location $ApiDir
    $out = npm run backup:pg 2>&1
    Add-Content -Path $LogFile -Value "[$Stamp] OK`n$out"
    Write-Host $out
} catch {
    Add-Content -Path $LogFile -Value "[$Stamp] FAIL: $_"
    Write-Error $_
    exit 1
} finally {
    Pop-Location
}

# احتفظ بآخر 14 نسخة
$BackupDir = Join-Path $Root 'backups'
if (Test-Path $BackupDir) {
    Get-ChildItem $BackupDir -Filter 'bhd-cloud-*.sql' |
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip 14 |
        ForEach-Object { Remove-Item $_.FullName -Force }
}
