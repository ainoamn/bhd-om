# Apply Kimi (1) package and push to GitHub
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$source = 'C:\Users\ameed\Downloads\Kimi_Agent_تصحيح شامل (1)'

Set-Location $root
& "$PSScriptRoot\apply-kimi-update.ps1" -SourceRoot $source

$docs = Join-Path $root 'docs\kimi-review'
New-Item -ItemType Directory -Path $docs -Force | Out-Null
@('architecture_review_report.md','performance_review_report.md','security_review_report.md','plan.md') | ForEach-Object {
  $s = Join-Path $source $_
  if (Test-Path -LiteralPath $s) { Copy-Item -LiteralPath $s -Destination (Join-Path $docs $_) -Force }
}
Get-ChildItem -LiteralPath $source -Filter '*.md' -File | Where-Object { $_.Name -match '[^\x00-\x7F]' } | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $docs $_.Name) -Force
}

git add -A
git status
git commit -m @"
Apply Kimi Agent security, archive, and encryption updates.

Integrate comprehensive fixes from Kimi review package with API guards, rate limiting, and Prisma migrations.
"@ 
git push origin master
