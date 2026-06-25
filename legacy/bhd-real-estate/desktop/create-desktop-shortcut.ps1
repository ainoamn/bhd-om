# إنشاء اختصار BHD Real Estate على سطح المكتب / Create desktop shortcut
$desk = [Environment]::GetFolderPath('Desktop')
$projectRoot = Split-Path -Parent $PSScriptRoot
$launchers = @(
    (Join-Path $projectRoot 'start-desktop.bat'),
    (Join-Path $projectRoot 'تشغيل-التطبيق-المكتبي.bat'),
    (Join-Path $PSScriptRoot 'تشغيل-التطبيق.cmd')
)
$bat = $launchers | Where-Object { Test-Path $_ } | Select-Object -First 1
$names = @('BHD Real Estate.lnk', 'BHD عقود الإيجار.lnk')
$appIcon = Join-Path $PSScriptRoot 'app-icon.png'
$electronExe = Join-Path $PSScriptRoot 'node_modules\electron\dist\electron.exe'
$icon = if (Test-Path $appIcon) { "$appIcon,0" }
    elseif (Test-Path $electronExe) { "$electronExe,0" }
    else { "$bat,0" }

if (-not (Test-Path $bat)) {
    Write-Error "Missing launcher: $bat"
    exit 1
}

$w = New-Object -ComObject WScript.Shell
foreach ($name in $names) {
    $lnk = Join-Path $desk $name
    $s = $w.CreateShortcut($lnk)
    $s.TargetPath = $bat
    $s.WorkingDirectory = $projectRoot
    $s.Description = 'BHD Real Estate - نظام إدارة العقارات / Property Management'
    $s.IconLocation = $icon
    $s.WindowStyle = 1
    $s.Save()
    Write-Host "Created shortcut: $lnk"
}
