param(
  [Parameter(Mandatory = $true)]
  [string]$SourceRoot
)

$ErrorActionPreference = 'Stop'
$kimReview = Join-Path $SourceRoot 'bhd-review'
$kimArch = Join-Path $SourceRoot 'archive-and-encryption'
$dst = Split-Path $PSScriptRoot -Parent

function Copy-KimiFile([string]$rel) {
  foreach ($base in @($kimReview, $kimArch)) {
    $p = Join-Path $base $rel
    if (Test-Path -LiteralPath $p) {
      $target = Join-Path $dst $rel
      $dir = Split-Path $target -Parent
      if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
      Copy-Item -LiteralPath $p -Destination $target -Force
      return $rel
    }
  }
  return $null
}

$files = @(
  'lib/security.ts','lib/api-guard.ts','lib/rate-limit.ts','lib/pagination.ts',
  'lib/encryption/index.ts','lib/archive/index.ts',
  'package.json','.env.example','AFTER_FIX_GUIDE.md','CHANGELOG_SECURITY_PERFORMANCE.md',
  'prisma/schema.prisma',
  'prisma/migrations/20250706000000_add_archive_encryption_audit/migration.sql',
  'app/error.tsx','app/global-error.tsx','app/loading.tsx',
  'app/api/archive/route.ts','app/api/archive/restore/route.ts',
  'app/api/cron/auto-archive/route.ts',
  'app/api/accounting/accounts/route.ts','app/api/accounting/audit/route.ts',
  'app/api/accounting/periods/route.ts',
  'app/api/media/route.ts','app/api/upload/route.ts',
  'app/api/upload/company/route.ts','app/api/upload/booking-documents/route.ts',
  'app/api/upload/accounting/route.ts',
  'components/admin/SecurityMonitor.tsx','app/api/admin/plans/route.ts',
  'components/home/HeroOman.tsx','components/home/StatsBar.tsx',
  'components/home/WhyChooseUs.tsx','components/home/OmanGallery.tsx',
  'components/home/CtaSection.tsx'
)

$copied = @()
foreach ($f in $files) {
  $r = Copy-KimiFile $f
  if ($r) { $copied += $r; Write-Host "OK $r" }
}

# Oman images
$omanSrc = Join-Path $kimReview 'public\images\oman'
$omanDst = Join-Path $dst 'public\images\oman'
if (Test-Path -LiteralPath $omanSrc) {
  New-Item -ItemType Directory -Path $omanDst -Force | Out-Null
  Get-ChildItem -LiteralPath $omanSrc -File | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $omanDst $_.Name) -Force
    $copied += "public/images/oman/$($_.Name)"
    Write-Host "IMG $($_.Name)"
  }
}

$docsDst = Join-Path $dst 'docs\kimi-review'
New-Item -ItemType Directory -Path $docsDst -Force | Out-Null
@('architecture_review_report.md','performance_review_report.md','security_review_report.md','plan.md') | ForEach-Object {
  $s = Join-Path $SourceRoot $_
  if (Test-Path -LiteralPath $s) { Copy-Item -LiteralPath $s -Destination (Join-Path $docsDst $_) -Force; Write-Host "DOC $_" }
}
Get-ChildItem -LiteralPath $SourceRoot -Filter '*.md' -File | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $docsDst $_.Name) -Force
  Write-Host "DOC $($_.Name)"
}

Write-Host "DONE copied $($copied.Count)"
