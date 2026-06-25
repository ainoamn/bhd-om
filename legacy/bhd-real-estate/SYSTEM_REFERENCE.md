# مرجع النظام / System Reference

## 1. الهدف / Purpose

هذا النظام عبارة عن ملف واجهة واحد رئيسي اسمه `bhd-real-estate.html` (BHD Real Estate) يعمل كنظام إدارة عقود ووحدات وعقارات وملاك، ويجمع بين:

- لوحة المعلومات التشغيلية / Operational dashboard
- شاشة العقود والمستندات / Contracts and documents workspace
- نوافذ تحليل وتفاصيل / Insight and detail modals
- حفظ محلي ومزامنة اختيارية / Local persistence with optional local API sync

## 2. الملفات الأساسية / Core Files

- `bhd-real-estate.html`
  - الملف الرئيسي الذي يحتوي الواجهة والمنطق والبيانات المحلية.
- `.cursor/rules/bilingual-future-changes.mdc`
  - قاعدة دائمة: أي تطوير جديد في الواجهة يكون بالعربية والإنجليزية.

## 3. أوضاع التشغيل / Runtime Modes

يعتمد النظام على باراميترات الرابط:

- `?mode=dashboard`
  - لوحة المعلومات والتشغيل والإحصائيات.
- `?mode=contracts`
  - شاشة العقود والنماذج والطباعة.
- `?viewer=1`
  - وضع عرض/طباعة مبني على `payloadKey`.

الدوال الأساسية:

- `initializeMode()`
  - يحدد وضع التشغيل الأولي.
- `setWorkspaceMode(mode)`
  - ينتقل بين `dashboard` و `contracts`.
- `renderDocument(index)`
  - يعرض المستند الحالي في وضع العقود.
- `openDashboardInsight(mode)`
  - يفتح نوافذ التحليل في لوحة المعلومات.

## 4. الوحدات الوظيفية / Functional Modules

### أ. العقارات / Properties

بيانات العقار الكاملة تحفظ داخل:

- `buildingProfiles`

وتشمل حاليًا:

- نوع المبنى
- رقم المبنى
- رقم القطعة
- رقم المجمع
- نوع استعمال الأرض
- أرقام العدادات الرئيسية
- المحافظة / الولاية / المنطقة
- الطوابق والوحدات

الدوال المهمة:

- `collectBuildingProfileForm()`
- `getEditableBuildingProfile(name)`
- `renderBuildingEditor(profile)`
- `renderBuildingProfileSummary(buildingName)`
- `openBuildingEditor(name)`
- `saveDashboardAux()`

### ب. الوحدات / Units

الوحدات تأتي من ثلاثة مصادر:

1. بيانات جاهزة داخل `unitsDataset`
2. بيانات مستوردة عبر Excel داخل `importedUnitsData`
3. وحدات ناتجة من تعريف العقارات داخل `managedUnitsData`

الدالة المركزية:

- `getUnitsData()`

أي صيانة تخص عرض الوحدات أو الحالات أو العدادات يجب أن تبدأ من هذه الدالة.

### ج. الملاك / Owners

قائمة الأسماء الأساسية تحفظ داخل:

- `ownersList`

بيانات المالك التفصيلية تحفظ داخل:

- `ownerProfiles`

والربط بين المالك والمباني يحفظ داخل:

- `ownerBuildingMap`

الدوال المهمة:

- `getEditableOwnerProfile(name)`
- `renderOwnerEditor(profile)`
- `renderOwnerProfileSummary(ownerName)`
- `openOwnerEditor(name)`
- `saveOwnerFromDashboard()`

### د. الحجوزات والإخلاء / Reservations and Evictions

تحفظ في:

- `unitReservations`
- `evictionRequests`

وتستخدم داخل لوحة المعلومات وتقارير التشغيل.

## 5. تدفق الصفحات / Page Relationships

### من لوحة المعلومات / From Dashboard

- عدد المباني -> قائمة المباني -> فتح مبنى -> بيانات العقار + الوحدات
- عدد الملاك -> قائمة الملاك -> تفاصيل مالك -> المباني المرتبطة
- عدد الوحدات -> قائمة الوحدات -> تفاصيل الوحدة
- المؤجرة / الشاغرة / المحجوزة -> قوائم مفلترة -> تفاصيل الوحدة
- الإيجارات الشهرية والسنوية -> حسب المبنى -> حسب الوحدة
- انتهاء العقود -> قائمة العقود القريبة -> تفاصيل الوحدة
- الإخلاء -> حسب المبنى -> الوحدات -> تفاصيل الوحدة

### من تفاصيل الوحدة / From Unit Details

النظام يعتمد على بيانات `getUnitsData()`، لذلك أي خطأ في إظهار الوحدة غالبًا سببه:

- تعريف ناقص في `managedUnitsData`
- أو تعارض بين `importedUnitsData` و `unitsDataset`
- أو نقص في ربط المبنى/الوحدة عند الفتح

## 6. الحفظ والمزامنة / Persistence and Sync

### Local Storage Keys

من أهم المفاتيح:

- `bhd_contract_full`
- `bhd_buildings_list`
- `bhd_owners_list`
- `bhd_file_registry`
- `bhd_unit_reservations`
- `bhd_eviction_requests`
- `bhd_owner_building_map`
- `bhd_building_profiles`
- `bhd_owner_profiles`
- `bhd_managed_units`

### دوال الحفظ

- `saveAllData()`
  - حفظ البيانات العامة للعقد وبعض القوائم.
- `saveDashboardAux()`
  - حفظ بيانات اللوحة المساعدة مثل العقارات والملاك والربط والحجوزات.
- `persistReferenceData()`
  - تحديث القوائم المرجعية ثم إعادة الرسم.

### المزامنة المحلية

إذا كانت واجهة `bhdApiAvailable` فعالة:

- `syncBhdKvToServer()`
- `pullBhdKvFromServer()`

## 7. الاستيراد والتصدير / Import and Export

### JSON

- `exportDataFile()`
- `importDataFile(file)`

### Excel

- بيانات النظام العامة عبر `exportSystemDataTemplate()` و `importSystemDataTemplate(file)`
- بيانات الملاك عبر:
  - `exportOwnersToExcel()`
  - `importOwnersFromExcel(file)`

## 8. قواعد التطوير القادمة / Future Development Rules

- أي تطوير جديد من الآن فصاعدًا يجب أن يكون ثنائي اللغة عربي/إنجليزي.
- عند إضافة شاشة جديدة:
  - حدد هل تتبع `dashboard` أو `contracts`
  - أضف نقطة الدخول بوضوح
  - اربط الحفظ مع `localStorage`
  - راعِ عدم كسر `payload` الخاص بوضع `viewer`
- عند إضافة كيان جديد:
  - عرف مخزن البيانات
  - عرف دوال الجمع/الحفظ/العرض
  - عرف كيف يدخل في التصدير والاستيراد

## 9. خطوات الصيانة / Maintenance Checklist

عند تعديل النظام مستقبلاً:

1. ابدأ من تحديد الجزء المتأثر:
   - عقارات
   - ملاك
   - وحدات
   - عقود
   - تقارير
2. راجع هل التعديل يحتاج:
   - حفظ محلي
   - مزامنة
   - تصدير/استيراد
   - تحديث ملخصات لوحة المعلومات
3. إذا أضفت حقولًا جديدة:
   - أضفها إلى نموذج الإدخال
   - أضفها إلى ملخص العرض
   - أضفها إلى التخزين
   - أضفها إلى الاستيراد/التصدير إذا لزم
4. بعد كل تعديل جوهري:
   - افحص الواجهة
   - افحص اللِنت
   - افحص أن التنقل بين النوافذ لم ينكسر

## 10. عناصر ما زالت مرشحة للتطوير / Recommended Future Work

- نظام ترجمة كامل لكل النظام القديم، وليس فقط الإضافات الجديدة
- فصل JavaScript عن HTML إلى ملفات مستقلة
- فصل النماذج والوحدات والمنطق إلى طبقات أو Modules
- إضافة رفع ملفات حقيقي منظم للمرفقات الأخرى
- إضافة اختبارات تحقق أساسية لسلامة البيانات
