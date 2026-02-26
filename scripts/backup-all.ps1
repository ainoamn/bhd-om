# نسخ احتياطي كامل قبل التحديث
# يشمل: قاعدة البيانات + مجلد النسخ الاحتياطي (للنسخ من الواجهة لاحقاً)

param(
    [string]$BackupDir = "backups"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$DestDir = Join-Path $ProjectRoot $BackupDir
$SessionDir = Join-Path $DestDir $Timestamp

New-Item -ItemType Directory -Force -Path $SessionDir | Out-Null

# نسخ قاعدة البيانات
$DbPath = Join-Path $ProjectRoot "prisma\dev.db"
if (Test-Path $DbPath) {
    Copy-Item $DbPath (Join-Path $SessionDir "dev.db") -Force
    Write-Host "[OK] نسخ قاعدة البيانات: dev.db"
} else {
    Write-Host "[تحذير] لا يوجد prisma\dev.db"
}

# إنشاء ملف README للجلسة
@"
# نسخ احتياطي بتاريخ $Timestamp

## الخطوات التالية للمستخدم

1. افتح التطبيق في المتصفح: /admin/backup
2. اضغط "تصدير نسخة احتياطية" لحفظ بيانات localStorage
3. احفظ الملف في هذا المجلد أو في مكان آمن

الملفات المنسوخة:
- dev.db: قاعدة بيانات المستخدمين والعقود (Prisma)
"@ | Out-File (Join-Path $SessionDir "README.txt") -Encoding utf8

Write-Host ""
Write-Host "تم إنشاء النسخة الاحتياطية في: $SessionDir"
Write-Host "تذكّر: تصدير من /admin/backup أيضاً لنسخ بيانات المتصفح."
Write-Host ""
