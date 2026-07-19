# خطة تقسيم ملف bhd-real-estate.html (72,626 سطر)

## الهيكل الحالي
```
bhd-real-estate.html (72,626 سطر)
├── <style>      السطور 7-5911    (~5,900 سطر CSS)
├── <script>     السطور 5915-5946  (~30 سطر JS مبكر)
├── <body>       السطور 5948-60631 (~54,700 سطر HTML)
│   ├── appTopNav         شريط التنقل العلوي
│   ├── dashboard         لوحة التحكم
│   ├── unitsSection      إدارة الوحدات
│   ├── contractsSection  العقود
│   ├── reservationsSection  الحجوزات
│   ├── accountingSection  المحاسبة
│   ├── addressbookSection دفتر العناوين
│   ├── maintenanceSection الصيانة
│   ├── notificationsSection التنبيهات
│   └── documentViewer    عارض المستندات
└── <script>     السطور 60632-72624 (~12,000 سطر JS رئيسي)
    ├── utils & helpers
    ├── data management
    ├── dashboard logic
    ├── units logic
    ├── contracts logic
    ├── reservations logic
    ├── accounting logic
    ├── addressbook logic
    ├── maintenance logic
    ├── notifications logic
    ├── print & export
    └── init & boot
```

## الهيكل المقترح (12 ملف)
```
legacy/bhd-real-estate/
├── index.html                    هيكل الصفحة + ربط الملفات (50 سطر)
├── css/
│   └── main.css                  كل الـ CSS (5,900 سطر)
├── js/
│   ├── app-shell.js              JS المبكر (30 سطر)
│   ├── utils.js                  أدوات مساعدة + constants
│   ├── data-store.js             إدارة البيانات (localStorage, import/export)
│   ├── dashboard.js              لوحة التحكم
│   ├── units.js                  إدارة الوحدات
│   ├── contracts.js              إدارة العقود
│   ├── reservations.js           إدارة الحجوزات
│   ├── accounting.js             المحاسبة
│   ├── addressbook.js            دفتر العناوين
│   ├── maintenance.js            الصيانة
│   ├── notifications.js          التنبيهات
│   ├── document-viewer.js        عارض المستندات
│   ├── print-export.js           الطباعة والتصدير
│   └── app-main.js               init + boot + ربط الأحداث
└── modules/
    ├── dashboard.html            HTML لوحة التحكم
    ├── units.html                HTML الوحدات
    ├── contracts.html            HTML العقود
    ├── reservations.html         HTML الحجوزات
    ├── accounting.html           HTML المحاسبة
    ├── addressbook.html          HTML دفتر العناوين
    ├── maintenance.html          HTML الصيانة
    └── notifications.html        HTML التنبيهات
```

## خطة التنفيذ

### المرحلة 1: استخراج CSS (سهل)
- استخراج السطور 7-5911 إلى `css/main.css`

### المرحلة 2: استخراج JS المبكر (سهل)
- استخراج السطور 5915-5946 إلى `js/app-shell.js`

### المرحلة 3: استخراج JS الرئيسي (متوسط)
- استخراج السطور 60632-72624
- تقسيمه إلى 10 ملفات حسب الوظيفة

### المرحلة 4: تقسيم HTML (متوسط)
- تقسيم السطور 5948-60631 حسب التبويبات

### المرحلة 5: بناء index.html (سهل)
- ربط كل الملفات
- التأكد من عمل جميع الروابط

### المرحلة 6: تحديث route.ts
- تحديث مسار قراءة الملفات

## القواعد
- لا تُحذف أي كود
- الحفاظ على جميع الـ IDs والـ classes
- الحفاظ على جميع أحداث onclick
- اختبار كل قسم بعد التقسيم
