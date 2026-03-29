# إعدادات سجلات البناء — يُحمَّل من run-build.ps1
# يطابق فكرة ain-oman-web: مجلد logs ثابت + ملفات بختم زمني

if (-not $PSScriptRoot) {
  $PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
}

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$LogDir = Join-Path $ProjectRoot 'tools\build\logs'
# احتفظ بآخر N ملف build-*.log (بعد كل بناء يُنظَّف الفائض)
$MaxBuildLogFiles = 20

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Invoke-BuildLogRotation {
  param(
    [string]$Directory,
    [int]$Keep = 20
  )
  if (-not (Test-Path $Directory)) { return }
  $files = Get-ChildItem -Path $Directory -Filter 'build-*.log' -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending
  if ($null -eq $files -or $files.Count -le $Keep) { return }
  $files | Select-Object -Skip $Keep | Remove-Item -Force -ErrorAction SilentlyContinue
}
