/**
 * نسخ bhd-real-estate.html (وأيقونة إن وُجدت) إلى desktop قبل البناء
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const destHtml = path.join(__dirname, 'bhd-real-estate.html');
const srcHtml = path.join(root, 'bhd-real-estate.html');

if (!fs.existsSync(srcHtml)) {
    console.error('Missing:', srcHtml);
    process.exit(1);
}
fs.copyFileSync(srcHtml, destHtml);
console.log('Copied', srcHtml, '->', destHtml);

const logoSrc = path.join(root, 'BHD_Logo_04.png');
const logoDest = path.join(__dirname, 'app-icon.png');
if (fs.existsSync(logoSrc)) {
    fs.copyFileSync(logoSrc, logoDest);
    console.log('Copied logo -> app-icon.png');
}
