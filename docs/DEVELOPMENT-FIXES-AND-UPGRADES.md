# سجل الإصلاحات والترقيات

هذا الملف مرجع دائم للإصلاحات والتحسينات التقنية المهمة في المشروع، مع حالة التنفيذ وما تبقى.

## الهدف

- منع عودة "بيانات شبح" بعد التصفير الكامل.
- توحيد مسار البيانات ليكون `server-first` في صفحات الإدارة والحساب.
- تقليل الاعتماد على `localStorage` كمصدر حقيقة للبيانات التشغيلية.

## ما تم تنفيذه (منجز)

### 24) تعزيز server-first في إعدادات الواجهة + Pagination للاشتراكات
- في `siteSettings` و `dashboardSettings` تم تقليل/إلغاء fallback المحلي كمصدر قراءة، واعتماد الخادم كمصدر الحقيقة مع إبقاء localStorage فقط للكتابة والأحداث بين التبويبات.
- إضافة pagination إلى `GET /api/subscriptions` عبر `limit/offset` مع headers:
  - `X-Total-Count`
  - `X-Limit`
  - `X-Offset`
- الأثر: تقليل احتمالية ظهور إعدادات محلية قديمة، وتحسين جاهزية قوائم الاشتراكات الكبيرة.

### 23) توحيد repository layer لإعدادات `AppSetting`
- تم اعتماد `lib/server/repositories/appSettingsRepo.ts` كطبقة موحدة لقراءة/كتابة إعدادات JSON في `AppSetting`.
- تم تطبيق ذلك على كل مسارات `app/api/settings/*` بحيث أصبحت كل عمليات `GET/POST` تمر عبر repository بدل تكرار منطق Prisma/JSON.
- تم أيضاً توحيد تخزين/قراءة `subscription_refunds` (ضمن مسارات الاشتراكات) عبر نفس الـ repository.

### 15) بدء ترحيل العقود إلى قاعدة البيانات (DB-backed contracts API)
- إضافة مسارات API جديدة للعقود:
  - `GET/POST /api/contracts`
  - `GET/PATCH /api/contracts/[id]`
- التخزين الحالي للعقد أصبح عبر قاعدة البيانات باستخدام صفوف `bookingStorage` (حقول `contractId`, `contractStage`, `contractData`) كمخزن انتقالي موحد.
- هذه الخطوة تنقل CRUD العقود تدريجياً من الاعتماد المحلي إلى مسار API/DB بدون كسر الصفحات الحالية.

### 16) جسر انتقالي (Bridge) بين المحلي وقاعدة البيانات
- في `lib/data/contracts.ts`:
  - إضافة `syncContractToServer` لمزامنة أي إنشاء/تحديث عقد تلقائياً إلى `/api/contracts`.
  - إضافة `mergeContractsFromServer` لدمج عقود الخادم في المخزن المحلي الانتقالي.
- النتيجة: العقود لم تعد محصورة في `localStorage`، وأصبحت تملك مصدر بيانات مركزي على الخادم.

### 17) ربط صفحات العقود بمصدر DB
- `app/[locale]/admin/contracts/page.tsx`:
  - تحميل العقود من `/api/contracts` ودمجها قبل العرض.
- `app/[locale]/admin/contracts/[id]/page.tsx`:
  - جلب العقد بالمعرف من `/api/contracts/[id]` ودمجه محلياً عند الفتح.
- هذا يضمن أن شاشة الإدارة وتفاصيل العقد تقرأ من بيانات الخادم عند توفرها.

### 18) تعزيز ترحيل الحجوزات إلى DB (مزامنة تلقائية عند التعديل)
- في `lib/data/bookings.ts` تم إضافة مزامنة تلقائية إلى `/api/bookings` عند:
  - إنشاء حجز `createBooking`
  - تغيير حالة الحجز `updateBookingStatus`
  - تحديث بيانات الحجز `updateBooking`
- هذا يقلل احتمالات انفصال حالة الحجز بين المتصفح وقاعدة البيانات، ويقرب النظام من نمط DB-first بالكامل.

### 19) تعزيز ترحيل دفتر العناوين إلى DB (مزامنة تلقائية)
- في `lib/data/addressBook.ts` تم تفعيل مزامنة تلقائية إلى `/api/address-book` عند:
  - إنشاء جهة اتصال `createContact`
  - تحديث جهة اتصال `updateContact`
  - أرشفة/استعادة جهة الاتصال `archiveContact` و`restoreContact`
- هذا يضمن أن تغييرات الحسابات/العناوين لا تبقى محلية فقط، وتنتقل فوراً إلى قاعدة البيانات.

### 20) نقل إعدادات بنكية/قوالب/طباعة إلى DB-first
- إضافة APIs جديدة لحفظ/قراءة الإعدادات من `AppSetting`:
  - `GET/POST /api/settings/bank-accounts`
  - `GET/POST /api/settings/document-templates`
  - `GET/POST /api/settings/print-options`
- تحديث طبقات البيانات التالية لتصبح DB-first مع fallback محلي انتقالي:
  - `lib/data/bankAccounts.ts`
  - `lib/data/documentTemplates.ts`
  - `lib/data/printOptions.ts`
- السلوك الجديد:
  - Hydration من الخادم عند أول تحميل.
  - أي تعديل محلي يتزامن تلقائياً إلى API.

### 21) نقل إعدادات الرؤية والإعلانات وصلاحيات تصنيفات الدفتر إلى DB-first
- إضافة APIs جديدة:
  - `GET/POST /api/settings/site-visibility`
  - `GET/POST /api/settings/ads`
  - `GET/POST /api/settings/contact-category-permissions`
- تحديث الطبقات المحلية:
  - `lib/data/siteSettings.ts`
  - `lib/data/ads.ts`
  - `lib/data/contactCategoryPermissions.ts`
- السلوك الجديد:
  - تحميل تفضيلات الخادم عند أول قراءة.
  - مزامنة أي تعديل محلي مباشرة إلى DB.

### 22) تعزيز مسار المحاسبة نحو DB-first (المستندات)
- في `lib/data/accounting.ts`:
  - إضافة Hydration للمستندات من `/api/accounting/documents` عند أول قراءة.
  - إضافة مزامنة تلقائية عند إنشاء مستند (`POST /api/accounting/documents`).
  - إضافة مزامنة تحديثات حرجة:
    - تحديث `contactId` عبر `PATCH /api/accounting/documents/[id]`.
    - اعتماد المستند عبر `POST /api/accounting/documents/[id]/approve`.
    - إلغاء المستند عبر `POST /api/accounting/documents/[id]/cancel`.
- النتيجة: تقليل الاعتماد التشغيلي على نسخة المستندات المحلية، ورفع اتساق المحاسبة بين الأجهزة.

### 23) نقل إعدادات السنة المالية المحاسبية إلى DB-first
- إضافة API جديد:
  - `GET/POST /api/settings/accounting-fiscal`
- تحديث `lib/data/accounting.ts`:
  - Hydration لإعدادات السنة المالية من الخادم عند أول قراءة.
  - مزامنة تلقائية لأي تعديل في `saveFiscalSettings` إلى قاعدة البيانات.

### 24) تعزيز DB-first لدليل الحسابات والقيود اليومية
- توسيع `app/api/accounting/accounts/route.ts` بإضافة `POST` (صلاحية `ACCOUNT_EDIT`) لإنشاء/تحديث حسابات دليل الحسابات من الواجهة.
- تحديث `lib/data/accounting.ts`:
  - Hydration لدليل الحسابات من `/api/accounting/accounts`.
  - Hydration للقيود اليومية من `/api/accounting/journal`.
  - مزامنة إنشاء/تحديث الحسابات إلى API.
  - مزامنة إنشاء القيد إلى `/api/accounting/journal`.
  - مزامنة تغيير حالة القيد (اعتماد/إلغاء) إلى endpoints المناسبة.

### 25) دفعة شاملة إضافية: نقل مخازن تشغيل متبقية إلى DB-first
- إضافة APIs إعدادات جديدة:
  - `GET/POST /api/settings/company-data`
  - `GET/POST /api/settings/property-landlords`
  - `GET/POST /api/settings/booking-documents`
  - `GET/POST /api/settings/booking-checks`
  - `GET/POST /api/settings/contract-checks`
- تحديث طبقات البيانات:
  - `lib/data/companyData.ts`
  - `lib/data/propertyLandlords.ts`
  - `lib/data/bookingDocuments.ts`
  - `lib/data/bookingChecks.ts`
  - `lib/data/contractChecks.ts`
  - `lib/data/dashboardSettings.ts` (Hydration تلقائي من الخادم عند أول قراءة)
- إضافة كذلك:
  - `GET/POST /api/settings/booking-terms`
  - تحديث `lib/data/bookingTerms.ts` إلى Hydration + Sync تلقائي مع الخادم.
  - `GET/POST /api/settings/property-overrides`
  - تحديث `lib/data/properties.ts` لمزامنة `property_overrides` مع قاعدة البيانات.

### 26) توحيد سجل الروابط في دفتر العناوين على server-first
- في `lib/data/contactLinks.ts` تمت إضافة دوال server-first مباشرة من قائمة حجوزات الخادم:
  - `getContactLinkedBookingsFromServerBookings`
  - `getContactLinkedContractsFromServerBookings`
  - `getContactLinkedBookingDocumentsFromServerBookings`
- في `app/[locale]/admin/address-book/page.tsx`:
  - إزالة منطق الربط المحلي المكرر داخل الصفحة.
  - استخدام دوال `contactLinks` الجديدة لكل من العرض والطباعة.
- النتيجة: توحيد أكبر لمسار بيانات الربط على مصدر الخادم وتقليل fallback المحلي.

### 27) دقة أعلى لمؤشر المطالبات المالية (Address Book)
- تحديث دوال server-first في `lib/data/contactLinks.ts` لدعم مستندات محاسبية خادمة (`serverDocuments`) عند احتساب `hasFinancialClaims`.
- تحديث `app/[locale]/admin/address-book/page.tsx`:
  - جلب `/api/accounting/documents` على الواجهة.
  - تمرير المستندات لدوال الربط بحيث تظهر حالة المطالبات المالية بدقة (PENDING/DRAFT) بدل القيمة الثابتة.

### 28) تقليل الاعتماد المحلي في صفحة إدارة البيانات
- في `app/[locale]/admin/data/page.tsx` تم تعطيل النسخ الاحتياطي/الاستيراد المحلي (`localStorage`) في الواجهة.
- أصبح المسار المعتمد افتراضياً للنسخ والاستعادة هو خادم قاعدة البيانات (`/api/admin/data/backup` و`/api/admin/data/restore`).
- الهدف: منع إعادة إدخال بيانات محلية قديمة بعد التحول إلى DB-first.

### 31) تنظيف طبقة backup المحلية بعد التحول للخادم
- في `lib/data/backup.ts` تم إزالة وظائف النسخ/الاستعادة المحلية (`exportBackup`, `importBackup`, `downloadBackup`) بعد تعطيلها من الواجهة.
- الإبقاء فقط على وظائف التصفير التشغيلي المحلي اللازمة لعزل الكاش أثناء الانتقال.
- النتيجة: تقليل مخاطر إعادة إدخال snapshots محلية قديمة وتوحيد مسار النسخ على خادم DB.

### 29) مزامنة انتقالية شاملة للبيانات المحلية القديمة (مرة واحدة)
- في `lib/data/bookings.ts`:
  - إضافة مزامنة bulk لمرة واحدة (`syncAllBookingsToServerOnce`) لرفع الحجوزات المحلية القديمة إلى `/api/bookings`.
- في `lib/data/addressBook.ts`:
  - إضافة مزامنة bulk لمرة واحدة (`syncAllContactsToServerOnce`) لرفع جهات الاتصال المحلية القديمة إلى `/api/address-book`.
- الهدف: منع بقاء بيانات تاريخية محلية غير مرفوعة أثناء الانتقال إلى DB-first.

### 30) استكمال المزامنة الانتقالية لباقي السجلات المحلية
- في `lib/data/contracts.ts`:
  - تفعيل مزامنة bulk لمرة واحدة للعقود المحلية القديمة عند أول قراءة.
- في:
  - `lib/data/bookingDocuments.ts`
  - `lib/data/bookingChecks.ts`
  - `lib/data/contractChecks.ts`
  تم تفعيل مزامنة bulk لمرة واحدة عند أول قراءة لرفع أي بيانات محلية متبقية إلى APIs الإعدادات.

### 32) إغلاق المسارات الحرجة: Hydration تلقائي من الخادم
- إضافة Hydration server-first عند أول قراءة في:
  - `lib/data/bookings.ts` عبر `/api/bookings`
  - `lib/data/contracts.ts` عبر `/api/contracts`
  - `lib/data/addressBook.ts` عبر `/api/address-book`
- النتيجة: الصفحات الحرجة لا تعتمد فقط على localStorage، وتلتقط أحدث نسخة خادمية تلقائياً.

### 33) نقل طلبات إلغاء الحجوزات إلى DB-first
- إضافة API:
  - `GET/POST /api/settings/booking-cancellation-requests`
- تحديث `lib/data/bookings.ts` لمسار `booking_cancellation_requests`:
  - Hydration من الخادم عند أول قراءة.
  - Sync عند الحفظ.
  - Bulk sync انتقالي لمرة واحدة للبيانات المحلية القديمة.

### 34) Pagination عملي للمسارات الإدارية الكبيرة
- إضافة دعم `limit/offset` مع headers (`X-Total-Count`, `X-Limit`, `X-Offset`) في:
  - `GET /api/bookings`
  - `GET /api/contracts`
  - `GET /api/admin/users`
- الهدف: تجهيز القوائم الكبيرة للإدارة لنمط صفحات/تحميل جزئي بدل تحميل كامل دائم.

### 35) تحسين بنيوي: Repository موحد لإعدادات AppSetting
- إضافة:
  - `lib/server/repositories/appSettingsRepo.ts`
    - `getJsonSetting`
    - `upsertJsonSetting`
- بدء استخدامه في routes:
  - `app/api/settings/property-overrides/route.ts`
  - `app/api/settings/booking-terms/route.ts`
  - `app/api/settings/company-data/route.ts`

### 36) تأسيس E2E للسيناريوهات الحرجة
- إضافة إطار Playwright:
  - dev dependency: `@playwright/test`
  - `playwright.config.ts`
  - script: `npm run test:e2e`
- إضافة اختبار حرِج:
  - `tests/e2e/critical-flows.spec.ts`
  - يغطي reset/logout وعدم ظهور stale data (مشروط بمتغيرات بيئة E2E).
- السلوك الجديد:
  - Hydration تلقائي عند أول قراءة.
  - مزامنة مباشرة لأي تعديل محلي إلى قاعدة البيانات عبر API.

### 1) الأمان والجلسة بعد التصفير
- إبطال جلسة المستخدم المحذوف عبر تحقق دوري في `jwt` داخل `lib/auth.ts`.
- إضافة عزل بيانات الجلسة المحلية بين المستخدمين في `components/AuthSessionLocalIsolation.tsx`.
- تنظيف بقايا الانتحال المحلية (`userSession`, `mockNextAuthSession`, `isSwitchingUser`) عند عدم التطابق.

### 2) PIN تصفير البيانات
- تعيين PIN افتراضي لتصفير البيانات وحفظه بشكل مشفر.
- إضافة API لتغيير PIN (`/api/admin/data/change-pin`) مع تحقق (الحالي + الجديد + التأكيد).
- ربط واجهة `admin/data` بهذا المسار.

### 3) تصفير الخادم + تنظيف الكاش المحلي
- بعد نجاح تصفير DB يتم تنظيف الكاش التشغيلي المحلي.
- مسح دفتر العناوين المحلي عند التصفير لمنع إعادة دمج بيانات قديمة.

### 4) تحويل صفحات المستخدم إلى Server-first
- `my-bookings`, `my-contracts`, `my-properties`, `my-invoices`, `my-receipts` تعتمد API الخادم بدل fallback المحلي.
- إضافة `GET /api/me/accounting-documents` للمستندات المحاسبية الخاصة بالمستخدم الحالي.
- توحيد الربط بهوية المستخدم عبر `/api/user/linked-contact`.

### 5) تحويل لوحات Dashboard
- `components/admin/ClientDashboard.tsx`:
  - الحجوزات من `/api/bookings`.
  - الإيصالات/الفواتير من `/api/me/accounting-documents`.
  - اشتقاق العقود من حجوزات الخادم (`contractData`).
- `components/admin/OwnerDashboard.tsx`:
  - `linkedContact` من `/api/user/linked-contact`.
  - إزالة العدادات المحلية للمحاسبة/العقود واعتماد API.

### 6) تحسين Admin Layout
- `app/[locale]/admin/AdminLayoutInner.tsx`:
  - تحديد `contactDashboardType` من `/api/user/linked-contact` بدل قراءة محلية.

### 7) تحسينات إضافية على سيرفر-فرست
- `app/[locale]/admin/contracts/page.tsx`:
  - تحميل الحجوزات من `/api/bookings` بدل `getAllBookings()`.
- `app/[locale]/admin/contracts/[id]/page.tsx`:
  - إزالة قراءة `getAllBookings()` المباشرة.
  - الاعتماد على حجوزات محدثة من API للتوقيعات وحالة العقد.
- `app/[locale]/admin/address-book/page.tsx`:
  - استخدام حجوزات الخادم في الطباعة والروابط (مع fallback احتياطي فقط).
- `app/[locale]/admin/bookings/page.tsx`:
  - جعل تحميل القائمة من `/api/bookings` كمصدر أساسي.
  - تقليل الاعتماد على العقود المحلية في قفل/عرض حالة العقد باستخدام `contractId/contractData/contractStage` القادمة من الخادم.

### 8) لوحة الإدارة العامة (Admin Dashboard)
- إزالة الاعتماد المباشر على `getAllContracts()` المحلي لاحتساب العقود النشطة.
- احتساب العقود النشطة من بيانات الحجوزات القادمة من `/api/bookings` (وجود `contractId` أو `contractData` مع مرحلة غير ملغاة).

### 9) صفحة إدارة العقود (تحسين التوافق مع بيانات الخادم)
- تحديث كشف "الحجوزات الجاهزة لإنشاء عقد" ليتحقق أولاً من وجود عقد على بيانات الحجز في الخادم (`contractId`/`contractData`) قبل إنشاء عقد جديد.
- هذا يمنع تكرار إنشاء عقد محلي لحجز لديه عقد موجود بالفعل على الخادم.

### 10) عرض العقود في إدارة العقود (دمج server + local)
- صفحة `admin/contracts` تعرض الآن قائمة موحّدة مدمجة من:
  - العقود المحلية (`getAllContracts`) لحين إكمال نقل CRUD.
  - العقود القادمة من الحجز على الخادم (`/api/bookings` عبر `contractId/contractData/contractStage`).
- اعتماد الإدارة اليدوية (زر اعتماد الإدارة في حالة DRAFT) يبقى فقط للعقود ذات المصدر المحلي لمنع تنفيذ اعتماد محلي على صفوف مصدرها الخادم.

### 11) تشديد صفحة دفتر العناوين ضد fallback المحلي
- في `admin/address-book` تم إلغاء fallback إلى `getContactLinkedBookings/getContactLinkedContracts` عند فشل ربط بيانات الخادم.
- السلوك الجديد: في حالة فشل القراءة/التحليل من بيانات الخادم يتم إرجاع قائمة فارغة بدلاً من سحب بيانات قديمة من المحلي.

### 12) تحسين المحاسبة (مسار المستندات المرتبطة بالحجوزات)
- في `components/admin/AccountingSection.tsx` تم تعديل عرض المستندات المرتبطة بطلب إلغاء الحجز:
  - عند تفعيل مصدر DB (`useDb`) يتم الاشتقاق من `documents` المحمّلة من API.
  - يتم استخدام `searchDocuments` المحلي فقط في مسار non-DB.

## المتبقي (قيد التنفيذ / المرحلة التالية)

### أولوية عالية
- إكمال فصل واجهة العقود نهائياً عن `localStorage` (تحويل دوال القراءة/الكتابة إلى async server-only داخل `lib/server`).
- توحيد مسار مستندات الحجز/العقد بحيث يكون مصدره الخادم بالكامل.

### أولوية متوسطة
- تقليل الـ fallback المحلي في `address-book` أكثر (الإبقاء فقط للحالات الطارئة).
- إضافة اختبارات تكامل لمسارات:
  - `/api/bookings`
  - `/api/user/linked-contact`
  - `/api/me/accounting-documents`

### جودة واستدامة
- إضافة E2E لسيناريو:
  1. تسجيل دخول مستخدم
  2. تصفير كامل
  3. التأكد من تسجيل خروج فوري
  4. عدم ظهور بيانات قديمة في `my-account`/`my-bookings`

## دفعة RBAC الحالية (تقارب مع متطلبات Kimi مع الحفاظ على التوافق)

- إضافة طبقة أدوار موحدة مع تطبيع للأدوار الحالية والجديدة:
  - `lib/auth/roles.ts`
- إضافة مصفوفة صلاحيات مركزية للمسارات:
  - `lib/auth/permissions.ts`
- إضافة حارس API موحد:
  - `lib/auth/guard.ts`
- إضافة مسار تدقيق موحد:
  - `lib/audit.ts`
  - `app/api/audit/log/route.ts`
- تحديث `proxy.ts`:
  - حماية مسارات admin/api الحساسة
  - إعادة التوجيه إلى login عند عدم المصادقة
  - منع الوصول غير المصرح وتسجيل محاولة التدقيق
- تحديث APIs:
  - `app/api/admin/users/route.ts` استخدام guard موحد
  - `app/api/admin/users/create-from-contact/route.ts` استخدام guard + تحقق حدود الاشتراك + تسجيل تدقيق
  - `app/api/admin/properties/route.ts` استخدام guard موحد

### 13) مسارات اشتراك موحدة للتحقق والترقية
- إضافة `POST /api/subscriptions/check`:
  - فحص حدود الموارد (`users`, `properties`) حسب الباقة النشطة.
- إضافة `POST /api/subscriptions/upgrade`:
  - ترقية/تحديث اشتراك مستخدم من لوحة الإدارة (مع تسجيل تدقيق).

### 14) تشديد حماية APIs الحرجة (حجوزات + اشتراكات)
- `app/api/bookings/route.ts`:
  - فرض المصادقة على GET/POST عبر `requireAuth`.
  - إضافة فحص أدوار مسموح بها على POST عبر `requireRoles`.
- `app/api/subscriptions/route.ts`:
  - استبدال فحص التوكن اليدوي بـ guard موحد.
  - السماح فقط لأدوار الإدارة (`ADMIN`, `SUPER_ADMIN`) على GET/POST.

## ملاحظات تشغيل

- عند أي تعديل في مسارات الإدارة الحساسة، شغّل:
  - `npx tsc --noEmit`
  - `npm run build`
- أي إصلاح جديد يُسجل هنا باختصار (ماذا ولماذا والملفات المتأثرة).
