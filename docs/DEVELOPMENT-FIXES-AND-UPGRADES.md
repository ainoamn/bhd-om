# سجل الإصلاحات والترقيات

هذا الملف مرجع دائم للإصلاحات والتحسينات التقنية المهمة في المشروع، مع حالة التنفيذ وما تبقى.

## الهدف

- منع عودة "بيانات شبح" بعد التصفير الكامل.
- توحيد مسار البيانات ليكون `server-first` في صفحات الإدارة والحساب.
- تقليل الاعتماد على `localStorage` كمصدر حقيقة للبيانات التشغيلية.

## ما تم تنفيذه (منجز)

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
- نقل CRUD العقود بالكامل من `lib/data/contracts` (محلي) إلى API/DB.
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

## ملاحظات تشغيل

- عند أي تعديل في مسارات الإدارة الحساسة، شغّل:
  - `npx tsc --noEmit`
  - `npm run build`
- أي إصلاح جديد يُسجل هنا باختصار (ماذا ولماذا والملفات المتأثرة).
