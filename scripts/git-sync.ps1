# مزامنة سريعة مع GitHub - تشغيل قبل الانتقال لجهاز آخر
# Quick sync with GitHub - run before switching computers

$msg = if ($args[0]) { $args[0] } else { "تحديثات الجلسة - " + (Get-Date -Format "yyyy-MM-dd HH:mm") }
git add -A
$status = git status --short
if ($status) {
  git commit -m $msg
  git push origin master
  Write-Host "تم الرفع بنجاح." -ForegroundColor Green
} else {
  Write-Host "لا توجد تغييرات للرفع." -ForegroundColor Yellow
}
