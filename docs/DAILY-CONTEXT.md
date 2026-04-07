# السياق اليومي والمحادثات — يُحدَّث بعد كل جلسة
# Daily Context & Conversation Log

**الغرض:** نسخ ملخص المحادثات والأحداث هنا وتحديثه **بعد كل جلسة** (ويُفضّل مراجعته يومياً). يضمن العمل من أكثر من جهاز عدم تغيّر السياق أو تناقص البرمجة. كل إدخال **مُؤرّخ ومُؤقّت**.

**تعليمات التحديث:** في نهاية كل جلسة، اتبع `docs/SESSION-END.md` وأضف قسماً جديداً أدناه تحت "آخر الأحداث".

---

## آخر الأحداث (الأحدث في الأعلى)

### جلسة 2026-04-07 — بطء لوحة التحكم (10s+)

- **السبب:** `syncPaidBookingsToAccountingDb` كانت تُستدعى **قبل** إرجاع الحجوزات/المحاسبة وتمرّ على كل سجلات الحجز؛ و`PrismaClient` لم يُخزَّن في `globalForPrisma` في الإنتاج فيزيد إعادة الاتصال على كل برد.
- **الإصلاح:** `after()` من `next/server` لتشغيل المزامنة بعد الاستجابة في `GET /api/bookings` و`GET /api/accounting/data` و`getAccountingDataForPage`؛ `globalForPrisma.prisma = prisma` دائماً في `lib/prisma.ts`.

### جلسة 2026-04-07 — دفتر العناوين P2022: إصلاح تلقائي في API

- **السبب:** عمود `linkedUserId` غير مطبّق على بعض قواعد الإنتاج.
- **الإصلاح:** `lib/server/addressBookDbCompat.ts` — عند P2022 يُنفَّذ `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` + فهارس ثم إعادة المحاولة؛ إن فشل DDL يُستخدم استعلام SQL قديم بلا العمود. `GET/POST` ‎`/api/address-book` يستخدمان المساعد.

### جلسة 2026-04-07 — prisma migrate يتصل بـ 127.0.0.1 رغم وجود .env

- **السبب:** ملف `.env` كان محفوظاً بترميز **UTF-16** (مثلاً «Unicode» في Notepad)؛ حزمة `dotenv` لا تملأ `DATABASE_URL` فيظهر الافتراضي المحلي. **الحل:** حفظ `.env` كـ **UTF-8** (في Notepad: حفظ باسم → ترميز UTF-8).
- **الكود:** `prisma.config.ts` يحمّل `.env` صراحةً من مجلد الملف بجانب `import 'dotenv/config'` لتقليل اعتماد مجلد العمل.

### جلسة 2026-04-07 — دفتر العناوين: 500 عام ورسالة «تحقق من الشبكة»

- **المتابعة:** إرجاع `prisma_error` + `prismaCode` لأي `PrismaClientKnownRequestError` غير اتصال/جدول؛ P2022 ضمن `schema_not_deployed` مع P2021؛ الواجهة تعرض الرمز؛ تعطيل إعادة المحاولة عند `prisma_error`؛ تسجيل أخطاء غير Prisma في السجلات.

### جلسة 2026-04-07 — دفتر العناوين 503 بينما check-db «متصل»

- **السبب:** تصنيف أخطاء Prisma كان واسعاً جداً (`PrismaClient` في النص) فخُلط «جدول غير موجود (P2021)» مع «قاعدة غير متصلة»؛ `GET /api/check-db` يشغّل `SELECT 1` فقط ولا يثبت وجود جداول دفتر العناوين.
- **الإصلاح:** `app/api/address-book/route.ts` — `schema_not_deployed` لـ P2021، و`isTransientConnectionFailure` بدل المطابقة العامة؛ الواجهة تعرض رسالة هجرات؛ `useAdminAddressBookContacts` يقرأ `schema_not_deployed` دون إعادة محاولات 5xx عبثية.

### جلسة 2026-04-02 — توثيق قاعدة البيانات في README والدليل التقني

- **الغرض:** توضيح أن المشروع مربوط بـ **PostgreSQL** عبر Prisma (وليس SQLite في الإنتاج)، وربط متغيرات البيئة ومسار «الترقية» من خطة مؤقتة إلى مزود أقوى دون تغيير نوع المحرك.
- **الملفات:** `README.md` — قسم «قاعدة البيانات» ورابط `docs/DATABASE-SETUP-AND-MIGRATION.md`؛ `docs/اقرأني-الدليل-التقني-الشامل.md` — صف في جدول «هرم القراءة» يشير إلى نفس الوثيقة.

### جلسة 2026-04-02 — دفتر العناوين لا يتحدّث بعد حفظ «حسابي» إلا بتحديث صفحة المستخدم

- **السبب:** `emitAddressBookUpdated` يرسل `CustomEvent` فقط في نفس المستند — التبويب الآخر لا يستقبله؛ و`localStorage` لا يطلق `storage` في نفس التبويب عند الحفظ؛ والعودة من «حسابي» عبر Next.js قد لا تعيد جلب القائمة إن بقي المكوّن محمّلاً ببيانات قديمة.
- **الإصلاح:** `emitAddressBookUpdated` يضبط أيضاً `localStorage` بمفتاح `bhd_address_book_revision`؛ صفحة `admin/address-book` تستمع لـ `storage` على هذا المفتاح؛ وتُعاد مزامنة الخادم عند تغيّر `pathname` للعودة إلى مسار دفتر العناوين (تجاوز أول دخول لتفادي جلب مزدوج).

### جلسة 2026-04-02 — تقسيم الاسم الكامل: حذف مقطع وسيط وتفريق «عبد الحميد» بين الثاني والثالث

- **السبب:** `namePartsFromFullName` القديمة كانت تضع `secondName=parts[1]` و`thirdName=parts[2]` وتُسقط `parts[3]` عند خمس كلمات؛ وتفريق كلمة مركّبة في حقلين.
- **الإصلاح:** `lib/server/namePartsFromFullName.ts` — `splitFullNameToParts` / `applySplitFullNameToContactJson` (3+ مقاطع وسطى: الثاني مركّب = ما عدا المقطع قبل العائلة، الثالث = المقطع الأخير قبل العائلة). استخدامها في `ensureAddressBookForUser`، `applyUserIdentityToContactJson` (عند تعارض الأجزاء مع `User.name`)، `syncLinkedAddressBookFromUserUpdate`.

### جلسة 2026-04-02 — تحديث المستخدم لا ينعكس في دفتر العناوين إلا بعد صفحة المستخدم / «في دفتر العناوين»

- **السبب:** `PATCH /api/admin/users/[id]` كان يستدعي `syncLinkedAddressBookFromUserUpdate` فقط — إن لم يُعثر على صف (`findAddressBookRowByUserId` يعيد null) لا يُحدَّث شيء؛ ومسار `linked-contact` GET يستدعي `ensureAddressBookContactForUser` عند غياب الصف فيُنشئ/يحدّث السجل. كما أن JSON لم يخزّن `name` الصريح في بعض المسارات.
- **الإصلاح:** بعد تحديث المستخدم نستدعي **`ensureAddressBookContactForUser`** (نفس منطق الضمان في linked-contact)؛ إضافة **`data.name`** في فروع `ensureAddressBookForUser`؛ **`d.name`** في `syncLinkedAddressBookFromUserUpdate` للاتساق.

### جلسة 2026-04-02 — دفتر العناوين: الجدول كان يقرأ من localStorage وليس من الخادم

- **السبب:** `setContacts` بعد جلب `GET /api/address-book` كان يُحدّث الحالة، لكن **`searchContacts()`** كان يستدعي **`getStored()`** دائماً دون استخدام `contacts` — فعمود الجدول عرض **localStorage** (يختلف بين ملفات Chrome والأجهزة).
- **الإصلاح:** معامل اختياري `source` في `searchContacts`؛ صفحة `admin/address-book` تمرّر **`contacts`**؛ بعد الدمج مع الخادم تُحدَّث القائمة من **`toPersist`** دون استبدال العرض بـ `getAllContacts` بعد `syncBookingContactsToAddressBook`؛ أحداث `storage` وإعادة التحميل بعد الحفظ تستدعي **`refreshAddressBookFromServer`**؛ عمليات محلية (استيراد CSV، دمج تكرار، مزامنة من الحجوزات) تستخدم **`loadDataFromLocal`**.

### جلسة 2026-04-02 — دفتر العناوين يختلف بين متصفحين (بيانات كاملة vs ناقصة)

- **السبب:** `getAllContacts` كان يستدعي `syncAllContactsToServerOnce()` فيرفع **كل** جهات `localStorage` عبر `POST /api/address-book` (يستبدل `data` في DB). متصفح بـ localStorage قديم يفسد بيانات الخادم؛ متصفح آخر يقرأ بعد ذلك نسخة تالفة أو يبقى محلياً مختلفاً.
- **الإصلاح:** إزالة المزامنة الجماعية التلقائية؛ الاعتماد على جلب الدمج في `admin/address-book` و`POST` بعد الحفظ الصريح فقط.

### جلسة 2026-04-02 — عرض الاسم ناقص في دفتر العناوين مقارنة بقائمة المستخدمين

- **السبب:** عند اختلاف دمج الأجزاء عن `User.name` كان يُستدعى `applyNamePartsFromUserFullName` (تقسيم بالمسافات) فيفقد مقاطع من الأسماء الطويلة (مثلاً يظهر «مدرك الرواحي» بدل الاسم الكامل).
- **الإصلاح:** عند وجود أجزاء مخزنة وعدم تطابق الدمج مع `User.name` لا نعيد التقسيم؛ نبقي `data.name = user.name` والعرض يعتمد `getContactDisplayName` لإظهار الاسم الكامل.

### جلسة 2026-04-02 — دفتر العناوين يتحدّث فقط بعد فتح تفاصيل المستخدم

- **السبب:** صفحة المستخدم تستدعي `mergeServerContactIntoLocalStorage` بعد `GET linked-contact` فتزيل الصفوف المكررة لنفس `userId` في `localStorage`؛ صفحة دفتر العناوين كانت تعتمد على `mergeAddressBookApiWithLocal` + `persist` فقط دون هذا الدمج، فبقي صف قديم يغطى على البيانات حتى زيارة صفحة المستخدم.
- **الإصلاح:** بعد `persistAddressBookContactsLocally(toPersist)`، لكل `userId` فريد نأخذ أحدث جهة (`contactRevisionMs`) ونستدعي `mergeServerContactIntoLocalStorage` كما في مسار المستخدم.

### جلسة 2026-04-02 — admin/address-book: بيانات لا تتحدّث مع التحديث

- **السبب:** `persistAddressBookContactsLocally` كان يستدعي `emitAddressBookUpdated` فيعيد تشغيل `useEffect` (serverSyncKey) فيسبب جلباً متكرراً؛ جلب الخلفية في `getStored()` قد يكتمل بعد المزامنة ويدمج قائمة قديمة فوق القائمة الطازجة؛ عدم ضبط `didHydrateContactsFromServer` بعد الحفظ من الصفحة.
- **الإصلاح:** إزالة البث من `persist`؛ تعيين `didHydrateContactsFromServer` عند الحفظ؛ تجاهل دمج جلب الخلفية إذا اكتُملت المزامنة؛ إعادة `didHydrate` عند `clearAddressBookLocalStorage`؛ معامل `_` على طلبات الجلب في صفحة الإدارة.

### جلسة 2026-04-02 — دفتر العناوين يعرض اسماً قديماً رغم «حسابي»

- **السبب:** JSON احتفظ بأجزاء قديمة لا تطابق `User.name`؛ `getContactDisplayName` كان يعرض دمج الأجزاء قبل الحقل `name`؛ `PATCH` حسابي لم يُخزّن `name` في JSON لأن `mergedSafe` وُلِد قبل تعيينه؛ `findAddressBookRowByUserId` قد يعيد صفاً أقدم عند وجود أكثر من صف لنفس المستخدم.
- **الإصلاح:** `applyUserIdentityToContactJson` يضبط `data.name` ويعيد اشتقاق الأجزاء عند اختلافها عن `User.name`؛ `getContactDisplayName` يفضّل `name` عند تعارضه مع دمج الأجزاء؛ `merged.name` قبل `toJsonSafeRecord`؛ اختيار أحدث صف بـ `orderBy updatedAt desc` وترتيب الـ fallback.

### جلسة 2026-04-02 — أجزاء الاسم: لا إعادة تقسيم User.name فوق JSON المحفوظ

- **السبب:** `applyUserIdentityToContactJson` كان يفرّق `user.name` بالمسافات ويكتب فوق `firstName`…`familyName` بعد كل GET (حسابي / مستخدم / دفتر العناوين) رغم أن PATCH يحفظ الأجزاء صحيحة في JSON.
- **الإصلاح:** إن وُجد أي حقل اسم غير فارغ في JSON، لا نُشتق الأجزاء من الاسم الكامل؛ الاحتفاظ بالتقسيم القديم فقط عند غياب الأجزاء (بيانات قديمة).

### جلسة 2026-04-02 — دفتر العناوين: ذاكرة الوحدة النمطية لم تُحمَّل من localStorage

- **السبب:** `contactsStore` كان يبدأ `[]` دون قراءة `bhd_address_book`؛ صفحة الإدارة كانت تستدعي `localStorage.setItem` بعد الدمج دون تحديث `contactsStore`، فـ `rewriteLocalAddressBookDeduped()` قرأ قائمة فارغة وحفظ `[]` فوق القرص.
- **الإصلاح:** `ensureContactsLoadedFromStorageOnce()` في بداية `getStored()`؛ `persistAddressBookContactsLocally()` يحدّث الذاكرة والقرص معاً؛ استبدال `setItem` في صفحة دفتر العناوين؛ منع تكرار جلب الخادم عند `apiList.length === 0`؛ مسار احتياطي في `rewrite` إذا كانت الذاكرة فارغة والقرص فيه صفوف؛ `clearAddressBookLocalStorage` يصفّر الذاكرة ويعيد علم التحميل.

### جلسة 2026-04-02 — دفتر العناوين: إزالة التكرار لا تُفرغ القائمة

- **السبب:** عند تكرار `userId` بين صفوف بلا `id` سليم، كان يُضاف `undefined` إلى مجموعة الحذف ويُزال كل صفوف `id` غير معرّف → بعد `rewriteLocalAddressBookDeduped()` يصبح `localStorage` فارغاً رغم نجاح دمج الـ API.
- **الإصلاح:** لا يُضاف إلى `drop` إلا معرفات نصية غير فارغة؛ الاحتفاظ بأي جهة بلا `id` سليم؛ إذا أصبحت نتيجة الدمج فارغة مع وجود مدخلات، لا يُحفظ ويُسجّل تحذير.

### جلسة 2026-04-02 — دفتر العناوين فارغ للمدير رغم ظهور السجل في صفحة المستخدم

- **السبب المحتمل:** `GET /api/address-book` كان يحذف صفوفاً من DB أثناء القراءة (`deleteMany` للتكرار + `deleteOtherPersonalRowsSamePhone`) — قد يُفرغ الجدول أو يزيل السجل المرتبط بالحساب أثناء تصفح المدير.
- **الإصلاح:** الاستجابة تستخدم دمج التكرار **في الذاكرة** فقط؛ عند كون نتيجة الدمج فارغة مع وجود صفوف نُرجع كل الصفوف مع تحذير في السجل.

### جلسة 2026-04-02 — توثيق: هيكل المشروع وارتباط الصفحات

- **الملفات:** `docs/SITE-SCENARIOS-AND-LINKS.md` — قسم 0 (شجرة `app/[locale]`، مصدر التنقل `adminNav`/`dashboardRoles`، مخطط mermaid)؛ توسيع الجداول (مسارات فرعية، مستخدم، عقار، عقد، مسودات، إلخ). `docs/اقرأني-الدليل-التقني-الشامل.md` — قسم 2.1 جدول المجلدات وربط القائمة.

### جلسة 2026-04-02 — P2022 عمود linkedUserId غير موجود: ensure + upsert SQL خام

- **السبب:** الإنتاج لم يُنفَّذ عليه migration لعمود `linkedUserId`؛ `prisma.addressBookContact.create({ linkedUserId })` يرمي P2022 / «column (not available) does not exist»؛ المسار القديم كان يعيد `create` بدون العمود دون التقاط فشل ذلك بـ `upsertAddressBookContactFallback`.
- **الإصلاح:** `isPrismaSchemaDriftError` + `createAddressBookRowWithoutLinkedUserIdColumn` (إنشاء بدون العمود ثم `upsertAddressBookContactFallback` عند الفشل أو التفرد).

### جلسة 2026-04-02 — إصلاح «Failed to ensure address book» ودفتر العناوين الفارغ (إنتاج)

- **السبب المحتمل:** `findAddressBookRowByUserId` كان ينتهي بـ `findMany` على **كل** صفوف الجدول — على الإنتاج قد يتعطل أو يُرجع خطأ فيُفهم أن الصف غير موجود بعد نجاح `ensure`؛ أو فشل Prisma JSON filter؛ أو `contactId` مكرر نادراً؛ أو حقول `undefined` في JSON.
- **الإصلاح:** استعلام SQL موجّه (`linkedUserId` ثم `data->>'userId'`) قبل المسح الكامل؛ `findAddressBookRowByUserId` لا يرمي (يُسجّل ويُرجع null)؛ `contactId` = `CNT-${randomUUID()}`؛ `sanitizeJsonForPrisma` قبل كل create/update؛ حماية `applyUserIdentityToContactJson` في مسار ensure.

### جلسة 2026-04-02 — ضمان دفتر العناوين: عدم فشل «إضافة لدفتر العناوين» بسبب حذف التكرار

- **السبب المحتمل:** `deleteOtherAddressBookRowsForUser` (SQL خام) قد يرمي خطأ في بيئة معيّنة فيُسقط كامل `ensureAddressBookContactForUser` → 500 «Failed to ensure address book» رغم نجاح إنشاء/تحديث الصف؛ أو فشل استعلام `linkedUserId` بعد P2002.
- **الإصلاح:** لفّ الحذف في `safeDeleteOtherAddressBookRowsForUser` (خطأ غير قاتل + تسجيل)؛ تعزيز مسار P2002 بالرجوع إلى `findAddressBookRowByUserId`؛ `applyUserIdentityToContactJson` يحمي `name` الفارغ؛ مسار `ensure-address-book` يعيد جلب الصف بـ `data.userId` JSON؛ إرجاع `detail` قصير عند 500 وعرضه في واجهة المستخدم.

### جلسة 2026-04-02 — توحيد عرض جهات الاتصال: دفتر العناوين ↔ المستخدم ↔ حسابي

- **السبب:** `GET /api/address-book` كان يعرض JSON المخزَّن مع تحديث الرقم المتسلسل فقط، بينما `linked-contact` يطبّق `applyUserIdentityToContactJson` من جدول `User` — فظهر نقص/تداخل في الأسماء والهاتف والبريد بين الصفحات.
- **الإصلاح:** تطبيق نفس دمج الهوية على كل جهة مربوطة بحساب في `GET /api/address-book`؛ إرجاع `linkedUserId` من مسار المدير؛ تحسين `findContactByUserId` و`mergeServerContactIntoLocalStorage` ليشملا `linkedUserId`.

### جلسة 2026-04-02 — AdminLayoutInner: ESLint + أنواع (جلسة/لوحة)

- **التحقق:** `npx tsc --noEmit` و`eslint` على `AdminLayoutInner.tsx` ناجحان.
- **التعديل:** تعطيل موثّق لـ `react-hooks/set-state-in-effect` (مزامنة NextAuth مع حالة الواجهة)؛ نوع `WindowWithAdminDev` بدل `any`؛ ثابت `ALLOWED_PATHS_FOR_NON_ADMIN`؛ `contactDashboardType` بـ `DashboardType` مع تضييق `linkedCategory`.

### جلسة 2026-04-02 — صفحة المستخدمين: تنبيه «تمت الإضافة» قبل الأسماء عند التحديث

- **السبب:** `requestIdleCallback` قد يُنفَّذ قبل أول رسم للجدول؛ `syncContactsFromUsers` يعمل كمهمة طويلة على الخيط الرئيسي فيُحجب الرسم حتى ينتهي، فيبدو التنبيه الأخضر قبل ظهور الأسماء.
- **الإصلاح:** جدولة المزامنة بعد **إطاري رسم** (`requestAnimationFrame` مزدوج + `setTimeout`) ثم `requestIdleCallback`؛ إلغاء التنبيه التلقائي عند تحميل/تحديث القائمة (مزامنة صامتة في الخلفية).

### جلسة 2026-04-02 — أداء: صفحة المستخدمين والعقارات (تأخير ~3 ث)

- **السبب (المستخدمون):** بعد `GET /api/admin/users` كان يُستدعى `syncContactsFromUsers` **متزامناً** على الخيط الرئيسي — حلقة على مئات المستخدمين مع `createContact` (localStorage + مزامنة) فتأخر `setLoading(false)` وظهور الأسماء.
- **الإصلاح:** جدولة المزامنة عبر `requestIdleCallback` (مع `setTimeout` احتياطي)؛ `GET` يجري `findMany` و`count` بـ `Promise.all` لتقليل زمن الخادم.
- **العقارات:** جلب `/api/admin/properties` يبدأ عند `sessionStatus !== 'unauthenticated'` دون انتظار `session.user`.

### جلسة 2026-04-02 — لوحة التحكم الرئيسية: لا وميض لوحة الأدمن قبل معرفة الدور

- **التحقق:** `npx tsc --noEmit` و`npm run build` ناجحان.
- **الإصلاح:** في `admin/page.tsx` عند `status === 'loading' && !userRole` يُعرض مؤشر تحميل فقط حتى تُعرف الجلسة — يمنع ظهور إحصاءات الأدمن لثوانٍ لحساب عميل/مالك قبل اكتمال `useSession` (مع بقاء جلب الحجوزات في الخلفية).

### جلسة 2026-04-02 — أداء لوحة التحكم: عدم حجب الصفحات عن التصيير + جلب أثناء loading

- **السبب:** `AdminLayoutInner` كان يُعيد شاشة «جاري التحميل» **بدون** `{children}` حتى تكتمل الجلسة، فلا تُركَّب صفحة المسار ولا تُستدعى `useEffect` لجلب البيانات إلا بعد انتهاء الجلسة (تسلسل انتظار). صفحات مثل دفتر العناوين و«حسابي» كانت تتخطى الجلب عند `sessionStatus === 'loading'`. صفحة الاشتراكات كانت تنتظر `isAdmin === true` من `useSession` قبل أي `fetch`.
- **الإصلاح:** إزالة الحاجز ملء الشاشة؛ شريط تحميل خفيف فوق المحتوى + تصيير `children` فوراً؛ تهيئة `sessionFetchSettled` من `sessionStorage` عند وجود تلميح جلسة؛ دفتر العناوين يجلب مع `credentials` دون انتظار `loading`؛ «حسابي» يجرب `linked-contact` قبل توفر `user.id`؛ الاشتراكات تجلب حسب `sessionStatus !== 'unauthenticated'` دون شرط `isAdmin` في الواجهة.

### جلسة 2026-04-02 — أداء: تقليل تأخير التنقل والجلسة (2–8 ث)

- **السبب:** `AuthProviderWrapper` (لوحة الإدارة) كان يضبط `refetchOnWindowFocus={true}` فيلغي إعداد الجذر (`false`) فيُستدعى `/api/auth/session` عند كل تركيز للنافذة؛ استدعاء JWT يعيد التحقق من `User` في DB كل ~30ث فيزيد زمن الاستجابة. شاشة «جاري التحميل» في `AdminLayoutInner` كانت تنتظر حتى **5 ث** كحد أقصى قبل عرض المحتوى.
- **الإصلاح:** مواءمة `SessionProvider` مع الجذر: `refetchOnWindowFocus={false}` و`refetchInterval={5 دقائق}` عند عدم الانتحال؛ `TOKEN_DB_REVALIDATE_SECONDS` من 30 إلى **180**؛ حد أقصى انتظار الجلسة **2 ث** بدل 5.

### جلسة 2026-04-02 — دفتر العناوين: إصلاح ensure + زر «تحديث من المستخدمين» من الخادم

- **السبب:** `ensureAddressBookContactForUser` كان يبتلع الأخطاء؛ إنشاء صف جديد مع `linkedUserId` قد يفشل بـ `P2002` إذا وُجد صف مرتبط سابقاً — فيُرجع المسار «Could not create address book row» رغم وجود البيانات.
- **الإصلاح:** معالجة `P2002` بتحديث الصف الموجود؛ بحث إضافي بـ `findUnique({ linkedUserId })` قبل الإنشاء؛ إعادة رمي الأخطاء غير المتوقعة؛ `findAddressBookRowByUserId` يطابق `userId` في JSON مع `trim`.
- **المسار:** `POST /api/admin/address-book/bulk-ensure-from-users` يضمن الصفوف لكل المستخدمين في DB؛ زر «تحديث من المستخدمين» يستدعيه ثم `setServerSyncKey` لإعادة جلب `/api/address-book` بدل `createContact` المحلي فقط.
- **الصلاحيات:** مسارات `ensure-address-book` و`linked-contact` للمدير عبر `requireAuth` مع `ADMIN` و`SUPER_ADMIN`.

### جلسة 2026-04-02 — دفتر العناوين: فلتر الدور للمدير + تنظيف صفحة المستخدم

- **المشكلة:** تعيين `dashboardType` من `ROLE_TO_DASHBOARD_TYPE[role]` يعطي للمدير `ADMIN` فيُطبَّق `filterContactsByRolePermissions` كأن الدفتر ليس له صلاحية عرض — فيُفرَّغ الجدول حتى يضغط المستخدم «تحديث من المستخدمين» أو يتغيّر السياق.
- **الإصلاح:** دالة `dashboardTypeForAddressBookFilter` تُرجع نوع لوحة فقط لـ `CLIENT` و`OWNER`؛ غير ذلك (مثل `ADMIN`) لا يُصفَّى حسب الدور فيُعرض الكل.
- **تنظيف:** إزالة استيراد `parsePhoneToCountryAndNumber` غير المستخدم من `admin/users/[id]/page.tsx` بعد مسار `ensure-address-book`.

### جلسة 2026-04-02 — توحيد عرض المستخدم ودفتر العناوين + «حسابي» ينتظر الجلسة

- **المشكلة:** صفحة المستخدم في الإدارة تعرض أعلى الصفحة من `User` وأسفلها من JSON دفتر العناوين أو localStorage — فتظهر بيانات مختلفة؛ «حسابي» قد يطلب API قبل اكتمال الجلسة فيُرجع 401.
- **الإصلاح:** `applyUserIdentityToContactJson` يطبّق الاسم/البريد/الهاتف/الرقم من جدول `User` على JSON المُعاد من GET linked-contact (مستخدم حالي + مدير)؛ مسار المدير يستدعي `ensureAddressBookContactForUser` عند غياب الصف؛ صفحة المستخدم تعتمد على الخادم فقط دون `getContactForUser` من المحلي؛ «حسابي» ينتظر `sessionStatus === 'authenticated'`.

### جلسة 2026-04-02 — ملف العميل: أساسي مقابل اكتمال العقد + تسجيل

- **المشكلة:** لافتة «حجوزاتي» و«حسابي» كانت تتطلب حقولاً كاملة (اسم ثانٍ، إنجليزي، جهة عمل، عنوان تفصيلي، هوية) كأنها شرط للتصفح — فيظهر «أكمل البيانات» حتى بعد الحفظ.
- **الحل:** `getContactProfileIssuesBasicAccount` (اسم أول/عائلة، بريد، هاتف) للتنبيه العلوي؛ `getContactProfileIssuesForContractApproval` يبقى لاعتماد/توقيع العقد (عنوان، هوية، إلخ). «حسابي»: حفظ بحد أدنى الاسم والبريد والهاتف؛ عنوان/إنجليزي/جهة عمل بقيم افتراضية عند الحاجة؛ التحقق من المدني/الجواز فقط إذا أدخل المستخدم حقلاً. تسجيل ذاتي: هاتف إجباري 8+ أرقام + منع تكرار الهاتف في API.

### جلسة 2026-04-02 — دفتر العناوين (إدارة): جلب كامل وبدون الاعتماد على «تحديث من المستخدمين»

- **المشكلة:** الجلب كان `limit=200` فيُعرض جزء من السجلات؛ عند فشل API تُفرَّغ القائمة؛ منطق `toSync` كان يمنع رفع جهات لها `userId`؛ فلتر `toPersist` كان يحذف جهات مربوطة قبل وصولها للخادم؛ زر «تحديث من المستخدمين» كان يستدعي `/api/admin/users` بدون `credentials`.
- **الإصلاح:** جلب `/api/address-book` بدون تقطيع (limit=0 افتراضياً)؛ انتظار `sessionStatus`؛ عند فشل الجلب عرض المحلي؛ تصحيح `toSync` وإزالة الفلتر الضار؛ `credentials` + `cache: 'no-store'` للمستخدمين؛ تخطّي من لهم جهة بالفعل بـ `userId`؛ `emitAddressBookUpdated` بعد المزامنة اليدوية.

### جلسة 2026-04-02 — إصلاح حفظ «حسابي» عند غياب عمود linkedUserId في DB

- **الخطأ:** `findUnique` بعد PATCH كان يختار `linkedUserId` — في قاعدة لم تُنفَّذ فيها الهجرة يظهر Prisma «column (not available) does not exist».
- **الإصلاح:** قراءة `contactId` + `data` فقط ثم تعيين `linkedUserId` في الـ JSON من `sub`.

### جلسة 2026-04-02 — مزامنة موحّدة: User ↔ دفتر العناوين من كل مسارات التعديل

- **المطلوب:** تسجيل جديد يظهر في دفتر العناوين؛ تعديل الاسم/البريد/الهاتف من «حسابي» أو دفتر العناوين أو صفحة المستخدم ينعكس في الجميع.
- **ما نُفِّذ:** كان حفظ `/api/address-book` يحدّث JSON فقط دون جدول `User` — أُضيفت `assertUserSyncFromContactAllowed` + `syncUserTableFromAddressBookContact` في `syncUserToAddressBook.ts` وتُستدعى من POST دفتر العناوين والـ bulk بعد الـ upsert؛ تحديث المستخدم من الإدارة يمرّر `role` إلى `syncLinkedAddressBookFromUserUpdate` لضبط `category` (LANDLORD/CLIENT) في الجهة المرتبطة؛ `GET /api/address-book` بـ `no-store`؛ صفحة `admin/users/[id]` تعيد جلب المستخدم عند `ADDRESS_BOOK_UPDATED_EVENT`؛ `GET admin/.../linked-contact` يضمن `id` + `no-store`.

### جلسة 2026-04-02 — حسابي (linked-contact): عدم فقدان البيانات بعد الحفظ وF5

- **السبب:** كاش قصير على `GET /api/user/linked-contact` + غياب صف دفتر العناوين لبعض المستخدمين → استجابة قديمة أو `null` → النموذج يعود فارغاً أو لا يتطابق مع العرض في المستخدم/دفتر العناوين.
- **الإصلاح:** `Cache-Control: private, no-store` لـ GET وPATCH؛ عند عدم وجود صف يُستدعى `ensureAddressBookContactForUser` ثم إعادة الجلب؛ بعد PATCH يُعاد JSON من الصف المحفوظ في DB؛ في «حسابي» تطبيع تواريخ المدني/الجواز عند ملء النموذج من الخادم.

### جلسة 2026-04-02 — مستخدمون: عدم عرض البريد كرقم متسلسل

- **السبب:** مسار احتياطي `buildFallbackUsers` كان يضع البريد في `serialNumber`؛ وعند وجود بريد مخزّن بالخطأ في DB قد يظهر في الواجهة.
- **الإصلاح:** `safeUserSerialForDisplay` و`shortenUserSerial` يتجاهلان النص الذي يحتوي `@`؛ تصحيح fallback الجلسة والحجوزات؛ `ensureUserSerialNumberOrSanitize` في `GET /api/admin/users` حتى لا يسقط الطلب عند فشل مستخدم واحد؛ إصلاح subtitle في `admin/users/[id]`.

### جلسة 2026-04-02 — ترحيل BHD من الموقع (لوحة الإدارة)

- استخراج المنطق إلى `lib/server/migrateSerialsToBhd.ts` واستدعاؤه من السكربت ومن **`POST /api/admin/migrate-serials-bhd`** (ADMIN/SUPER_ADMIN، تأكيد `BHD-MIGRATE` للتنفيذ الفعلي، `maxDuration` 300s).
- صفحة: **`/{locale}/admin/migrate-serials`** — معاينة جافة ثم تنفيذ بعد كتابة التأكيد.

### جلسة 2026-04-02 — ترحيل الأرقام (سكربت) + GitHub Actions

- تشغيل `npm run db:migrate-serials-bhd` محلياً فشل: لا يوجد PostgreSQL على `127.0.0.1:5432` (أو `DATABASE_URL` لا يشير لقاعدة متاحة).
- أُضيف workflow يدوي: `.github/workflows/migrate-serials-bhd.yml` — يشغّل نفس السكربت بعد ضبط Secret `DATABASE_URL` في المستودع وتشغيل **Actions → Migrate serials to BHD → Run workflow**.

### جلسة 2026-04-02 — لوحة الإدارة: أرقام BHD (مستخدمون، عقارات، حجوزات، مشاريع)

- **المستخدمون:** مسار `GET /api/admin/users?role=OWNER` كان يُرجع `serialNumber` من DB دون `ensureUserSerialNumber` — أصلحنا بدمج التأكيد/التوليد لكل صف. عرض الرقم الكامل BHD في الجدول، وجلب القائمة بـ `cache: 'no-store'`.
- **العقارات:** جلب `/api/admin/properties` بـ `no-store` لتفادي بيانات قديمة في المتصفح.
- **الحجوزات:** عمود «رقم الحجز» (`bookingSerial`) في الجدول والعرض المحمول؛ نوع `PropertyBooking` يتضمن الحقل؛ `POST /api/bookings` يولّد الرقم عند الحاجة ويعيده في JSON.
- **المشاريع:** صفحة `admin/projects` تُحمّل من `/api/admin/projects` (قاعدة البيانات + تسلسل BHD) بدل بيانات وهمية من `lib/data/projects`.
- **الرفع:** `git push origin master` — `7d7a51a`.

### جلسة 2026-03-30 — دفعة أداء مباشرة (سرعة التحميل والتنقل)

- **Address Book (أكبر تأثير):**
  - تقليل حجم الجلب من `1000` إلى `200` في `address-book` API calls.
  - استبدال مزامنة عنصر-بعنصر (`await` داخل loop) بمزامنة bulk عبر API جديد:
    - `POST /api/address-book/bulk`
  - إضافة حالة تحميل تدريجية (skeleton) أثناء التحميل الأول.
- **My Bookings polling:**
  - إزالة polling الثابت كل 5 ثوانٍ.
  - اعتماد refresh عند `focus` و`visibilitychange` + polling خفيف كل 60 ثانية كشبكة أمان.
- **Properties page heavy compute:**
  - تقليل الحسابات المتكررة لكل صف عبر `activeBookingKeySet` memoized بدل فحص حجوزات لكل عقار أثناء الرندر.
  - إضافة skeleton لقسم بيانات DB حتى اكتمال الجلب.
- **Session flow (AdminLayoutInner):**
  - تقليل timeout تسوية الجلسة من 60s إلى 5s.
  - تسوية الحالة أسرع عند `unauthenticated`.
- **Loading pages إضافية (progressive UX):**
  - `app/[locale]/admin/address-book/loading.tsx`
  - `app/[locale]/admin/bookings/loading.tsx`
  - `app/[locale]/admin/contracts/loading.tsx`
  - `app/[locale]/admin/properties/loading.tsx`
- **التحقق:** `npm run build` نجح بعد التعديلات.

### جلسة 2026-03-30 — تشغيل المتبقي التشغيلي (E2E + Migration check + Pagination wiring)

- **E2E:** تم تثبيت متصفح Playwright (`npx playwright install chromium`) ثم تشغيل `npm run test:e2e`:
  - النتيجة: الاختبارات تعمل وتنفّذ، لكنها `skipped` بسبب عدم توفر متغيرات اعتماد E2E في البيئة الحالية.
- **Migration Production check:** تشغيل `npx prisma migrate deploy` أعاد `P3005` (قاعدة البيانات الحالية غير فارغة وتحتاج baseline قبل اعتماد migrate deploy).
- **Pagination UI consumption:** ربط استهلاك الواجهات لمسارات pagination الجديدة بإرسال `limit/offset` صراحة في:
  - `admin/properties`, `admin/my-properties`, `admin/my-contracts`
  - `admin/address-book` (address-book + accounting-documents fetch)
  - `lib/data/accounting.ts` (accounts/journal/documents hydration fetches)
- **التحقق:** `npm run -s typecheck --if-present` نجح.

### جلسة 2026-03-30 — دفعة نهائية إغلاق المتبقي (server-first + pagination + e2e + indexes)

- **إغلاق fallback محلي (قراءة):**
  - `lib/data/bookingTerms.ts`
  - `lib/data/propertyLandlords.ts`
  - `lib/data/bookingDocuments.ts`
  - `lib/data/bookingChecks.ts`
  - `lib/data/contractChecks.ts`
  - `lib/data/bookings.ts`
  - `lib/data/contracts.ts`
  - `lib/data/addressBook.ts`
  - `lib/data/accounting.ts` (Fiscal read path)
- **مراجعة شاشات الإدارة الكبيرة:**
  - `app/[locale]/admin/address-book/page.tsx` تم منع fallback العرض المحلي عند فشل API (لمنع ظهور بيانات قديمة).
- **Pagination إضافي للقوائم الكبيرة:**
  - `GET /api/admin/properties`
  - `GET /api/address-book`
  - `GET /api/accounting/documents`
  - `GET /api/accounting/journal`
  - `GET /api/accounting/accounts`
- **E2E:** توسيع `tests/e2e/critical-flows.spec.ts` ليشمل اختبار مسارات الأدوار (حسب توفر متغيرات بيئة E2E).
- **DB Index Review:** إضافة فهارس:
  - `Property(isArchived, createdAt)`
  - `Subscription(endAt)`
  - `SubscriptionChangeRequest(subscriptionId, status)`
- **التحقق:** `npm run -s typecheck --if-present` نجح.

### جلسة 2026-03-30 — دفعة إضافية: إغلاق fallback محلي في طبقات إعدادات متبقية

- **ما تم:** تحويل القراءة إلى `server-first` في ملفات إعدادات إضافية داخل `lib/data`:
  - `bankAccounts.ts`
  - `companyData.ts`
  - `ads.ts`
  - `contactCategoryPermissions.ts`
  - `printOptions.ts`
  - `documentTemplates.ts`
- **التغيير:** عدم استخدام `localStorage` كمرجع قراءة أساسي؛ الاعتماد على مخزن ذاكرة + Hydration من API، مع إبقاء `localStorage` للكتابة/الإشعارات بين التبويبات.
- **التحقق:** `npm run -s typecheck --if-present` نجح.

### جلسة 2026-03-30 — دفعة إضافية: server-first reads + pagination للاشتراكات

- **ما تم:** تقليل اعتماد القراءة من `localStorage` في إعدادات الواجهة:
  - `lib/data/siteSettings.ts`
  - `lib/data/dashboardSettings.ts`
- **التغيير:** القراءة أصبحت تعتمد الخادم كمصدر أساسي، مع إبقاء التخزين المحلي للكتابة/الإشعارات فقط (بدون fallback محلي كمرجع حقيقة).
- **ما تم:** إضافة pagination (`limit/offset`) وعدادات headers في `GET /api/subscriptions`:
  - `X-Total-Count`, `X-Limit`, `X-Offset`
- **التحقق:** `npm run -s typecheck --if-present` نجح.

### جلسة 2026-03-30 — توحيد repository layer لإعدادات AppSetting

- **ما تم:** توحيد جميع مسارات `app/api/settings/*` لتستخدم `lib/server/repositories/appSettingsRepo.ts` بدل تكرار `prisma.appSetting` + `JSON.parse/stringify`.
- **ما تم:** تحديث مسارات الاشتراكات التي تخزن بيانات `subscription_refunds` داخل `AppSetting` لتستخدم نفس الـ repository:
  - `app/api/subscriptions/route.ts`
  - `app/api/subscriptions/refund-done/route.ts`
- **الأثر:** تقليل منطق DB/JSON المكرر، وتثبيت نمط Server-first للإعدادات تمهيداً لتوسعة repository layer لاحقاً (مثل validation, audit, caching).

### جلسة 2026-03-30 — دفعة شاملة DB-first لمخازن محلية إضافية

- **ما تم:** إضافة APIs جديدة:
  - `app/api/settings/company-data/route.ts`
  - `app/api/settings/property-landlords/route.ts`
  - `app/api/settings/booking-documents/route.ts`
  - `app/api/settings/booking-checks/route.ts`
  - `app/api/settings/contract-checks/route.ts`
- **ما تم:** تحديث ملفات البيانات:
  - `lib/data/companyData.ts`
  - `lib/data/propertyLandlords.ts`
  - `lib/data/bookingDocuments.ts`
  - `lib/data/bookingChecks.ts`
  - `lib/data/contractChecks.ts`
  - `lib/data/dashboardSettings.ts` (Hydration تلقائي)
- **الأثر:** نقل إضافي واسع من localStorage-only إلى DB-first في البيانات التشغيلية للموقع.
- **التحقق:** `npx tsc --noEmit` نجح.

### جلسة 2026-03-30 — نقل شروط الحجز/العقد إلى DB-first

- **ما تم:** إنشاء `app/api/settings/booking-terms/route.ts` (`GET/POST`).
- **ما تم:** تحديث `lib/data/bookingTerms.ts` لقراءة أولية من الخادم ومزامنة أي حفظ إلى قاعدة البيانات.
- **التحقق:** `npx tsc --noEmit` نجح.

### جلسة 2026-03-30 — نقل تعديلات حالة/نشر العقارات (Property Overrides) إلى DB-first

- **ما تم:** إنشاء `app/api/settings/property-overrides/route.ts` (`GET/POST`).
- **ما تم:** تحديث `lib/data/properties.ts` لعمل Hydration من الخادم ومزامنة أي تعديل override مباشرة إلى DB.
- **التحقق:** `npx tsc --noEmit` نجح.

### جلسة 2026-03-30 — توحيد ربط دفتر العناوين على server-first

- **ما تم:** إضافة دوال server-first في `lib/data/contactLinks.ts` لاشتقاق الحجوزات/العقود/المستندات المرتبطة من `serverBookings`.
- **ما تم:** تحديث `app/[locale]/admin/address-book/page.tsx` لاستخدام الدوال الجديدة في العرض والطباعة بدل منطق محلي مكرر.
- **التحقق:** `npx tsc --noEmit` نجح.

### جلسة 2026-03-30 — تحسين دقة المطالبات المالية في دفتر العناوين

- **ما تم:** تحديث `contactLinks` server-first لقبول مستندات محاسبة خادمة وحساب `hasFinancialClaims` من حالات `PENDING/DRAFT`.
- **ما تم:** `admin/address-book` أصبح يجلب `/api/accounting/documents` ويمررها لدوال الربط في العرض والطباعة.
- **التحقق:** `npx tsc --noEmit` نجح.

### جلسة 2026-03-30 — تعطيل النسخ المحلي في صفحة إدارة البيانات

- **ما تم:** تحديث `admin/data` لإيقاف خيارات تنزيل/استيراد نسخة `localStorage` من الواجهة.
- **ما تم:** اعتماد النسخ الاحتياطي/الاستعادة من الخادم كمسار افتراضي وحيد.
- **الأثر:** تقليل مخاطر إدخال بيانات متصفح قديمة بعد مسار DB-first.
- **التحقق:** `npx tsc --noEmit` نجح.

### جلسة 2026-03-30 — مزامنة انتقالية مرة واحدة للحجوزات والدفتر

- **ما تم:** في `bookings.ts` إضافة رفع bulk لمرة واحدة لكل الحجوزات المحلية القديمة إلى `/api/bookings`.
- **ما تم:** في `addressBook.ts` إضافة رفع bulk لمرة واحدة لكل جهات الاتصال المحلية القديمة إلى `/api/address-book`.
- **الأثر:** تسريع تنظيف فجوة الانتقال ومنع بقاء بيانات محلية غير مزامنة.
- **التحقق:** `npx tsc --noEmit` نجح.

### جلسة 2026-03-30 — استكمال مزامنة انتقالية للعقود/المستندات/الشيكات

- **ما تم:** إضافة مزامنة bulk لمرة واحدة في:
  - `contracts.ts`
  - `bookingDocuments.ts`
  - `bookingChecks.ts`
  - `contractChecks.ts`
- **الأثر:** رفع تلقائي لبقايا البيانات المحلية القديمة عند أول قراءة حتى بدون تعديل يدوي.
- **التحقق:** `npx tsc --noEmit` نجح.

### جلسة 2026-03-30 — تنظيف backup المحلي بعد التحول إلى DB backup

- **ما تم:** إزالة وظائف النسخ/الاستيراد المحلي من `lib/data/backup.ts` والإبقاء على وظائف التصفير التشغيلي فقط.
- **الأثر:** توحيد مسار النسخ الاحتياطي على الخادم وتقليل مخاطر استعادة بيانات متصفح قديمة.
- **التحقق:** `npx tsc --noEmit` نجح.

### جلسة 2026-03-30 — Hydration خادمي للمسارات الحرجة (bookings/contracts/addressBook)

- **ما تم:** إضافة جلب تلقائي عند أول قراءة من الخادم في:
  - `bookings.ts` (`/api/bookings`)
  - `contracts.ts` (`/api/contracts`)
  - `addressBook.ts` (`/api/address-book`)
- **الأثر:** تقليل الاعتماد على بيانات المتصفح القديمة في أكثر المسارات حساسية.
- **التحقق:** `npx tsc --noEmit` نجح.

### جلسة 2026-03-30 — نقل طلبات إلغاء الحجوزات إلى DB-first

- **ما تم:** إنشاء `app/api/settings/booking-cancellation-requests/route.ts`.
- **ما تم:** تحديث `bookings.ts` لإضافة Hydration + Sync + bulk sync لمرة واحدة لطلبات الإلغاء.
- **التحقق:** `npx tsc --noEmit` نجح.

### جلسة 2026-03-30 — دفعة نهائية مهمة: pagination + repository + e2e baseline

- **ما تم:** إضافة `limit/offset` + headers عدّاد في APIs: `bookings`, `contracts`, `admin/users`.
- **ما تم:** إضافة `appSettingsRepo` كبداية توحيد repository layer وتطبيقه على عدد من مسارات settings.
- **ما تم:** إدخال Playwright وإضافة اختبار E2E أساسي للسيناريوهات الحرجة (`critical-flows.spec.ts`).
- **التحقق:** `npx tsc --noEmit` نجح.

### جلسة 2026-03-30 — تعزيز DB-first للحسابات والقيود اليومية

- **ما تم:** توسيع `app/api/accounting/accounts/route.ts` بإضافة `POST` (بحماية صلاحية `ACCOUNT_EDIT`) لدعم إنشاء/تحديث حسابات دليل الحسابات من الواجهة.
- **ما تم:** تحديث `lib/data/accounting.ts`:
  - Hydration من `/api/accounting/accounts` و`/api/accounting/journal`.
  - مزامنة إنشاء/تحديث الحسابات إلى API.
  - مزامنة إنشاء القيد إلى API.
  - مزامنة حالات اعتماد/إلغاء القيد إلى endpoints المخصصة.
- **التحقق:** `npx tsc --noEmit` نجح.

### جلسة 2026-03-30 — تعزيز المحاسبة نحو DB-first (مستندات المحاسبة)

- **ما تم:** تحديث `lib/data/accounting.ts` لإضافة:
  - Hydration من `/api/accounting/documents` عند أول قراءة.
  - مزامنة إنشاء المستندات إلى API.
  - مزامنة `contactId` عبر PATCH.
  - مزامنة الاعتماد/الإلغاء عبر endpoints المخصصة.
- **الأثر:** اتساق أعلى في بيانات المستندات المحاسبية بين المتصفح وقاعدة البيانات.
- **التحقق:** `npx tsc --noEmit` نجح.

### جلسة 2026-03-30 — نقل إعدادات السنة المالية للمحاسبة إلى DB-first

- **ما تم:** إنشاء `app/api/settings/accounting-fiscal/route.ts` (`GET/POST`).
- **ما تم:** تحديث `lib/data/accounting.ts` ليقرأ إعدادات السنة المالية من الخادم عند أول تحميل، ويُزامن التعديلات تلقائياً.
- **التحقق:** `npx tsc --noEmit` نجح.

### جلسة 2026-03-30 — نقل إعدادات الرؤية والإعلانات وصلاحيات التصنيفات إلى DB-first

- **ما تم:** إضافة APIs جديدة:
  - `app/api/settings/site-visibility/route.ts`
  - `app/api/settings/ads/route.ts`
  - `app/api/settings/contact-category-permissions/route.ts`
- **ما تم:** تحديث طبقات البيانات:
  - `lib/data/siteSettings.ts`
  - `lib/data/ads.ts`
  - `lib/data/contactCategoryPermissions.ts`
- **الأثر:** إعدادات إظهار الصفحات والإعلانات وصلاحيات تصنيفات دفتر العناوين أصبحت تُدار من قاعدة البيانات مع fallback مرحلي محلي.
- **التحقق:** `npx tsc --noEmit` نجح.

### جلسة 2026-03-30 — بدء نقل العقود من localStorage إلى DB (مرحلة تنفيذية)

- **ما تم:** إنشاء API عقود جديدة:
  - `app/api/contracts/route.ts` (`GET/POST`)
  - `app/api/contracts/[id]/route.ts` (`GET/PATCH`)
- **ما تم:** اعتماد `bookingStorage` كطبقة تخزين انتقالية للعقد في DB عبر:
  - `contractId`, `contractStage`, `contractData`.
- **ما تم:** إضافة جسر مزامنة في `lib/data/contracts.ts`:
  - `syncContractToServer` لمزامنة إنشاء/تحديث العقود تلقائياً إلى الخادم.
  - `mergeContractsFromServer` لدمج بيانات الخادم محلياً خلال فترة الانتقال.
- **ما تم:** ربط شاشات العقود بمصدر DB:
  - `admin/contracts` يجلب من `/api/contracts`.
  - `admin/contracts/[id]` يجلب من `/api/contracts/[id]`.
- **التحقق:** `npx tsc --noEmit` نجح.

### جلسة 2026-03-30 — تعزيز مزامنة الحجوزات إلى DB تلقائياً

- **ما تم:** في `lib/data/bookings.ts` إضافة `syncBookingToServer` لمزامنة الحجز إلى `/api/bookings` تلقائياً عند الإنشاء/التعديل/تغيير الحالة.
- **الأثر:** تقليل اعتماد التشغيل على `localStorage` كمرجع منفرد، وتحسين الاتساق الفوري بين واجهات المستخدم وبيانات الخادم.
- **التحقق:** `npx tsc --noEmit` نجح.

### جلسة 2026-03-30 — تعزيز مزامنة دفتر العناوين إلى DB تلقائياً

- **ما تم:** في `lib/data/addressBook.ts` تفعيل مزامنة تلقائية إلى `/api/address-book` بعد إنشاء/تحديث/أرشفة/استعادة أي جهة اتصال.
- **الأثر:** تقليل مخاطر بقاء تغييرات العناوين والحسابات في `localStorage` فقط، ورفع اتساق البيانات بين الأجهزة.
- **التحقق:** `npx tsc --noEmit` نجح.

### جلسة 2026-03-30 — نقل إعدادات الحسابات البنكية/قوالب الوثائق/خيارات الطباعة إلى DB-first

- **ما تم:** إضافة APIs جديدة:
  - `app/api/settings/bank-accounts/route.ts`
  - `app/api/settings/document-templates/route.ts`
  - `app/api/settings/print-options/route.ts`
- **ما تم:** تحديث طبقات البيانات:
  - `lib/data/bankAccounts.ts`
  - `lib/data/documentTemplates.ts`
  - `lib/data/printOptions.ts`
- **الأثر:** هذه الإعدادات أصبحت تُقرأ من قاعدة البيانات عند التحميل الأول وتُزامن تلقائياً إلى الخادم عند أي تعديل.
- **التحقق:** `npx tsc --noEmit` نجح.

### جلسة 2026-03-30 — دفعة RBAC/Guard/Audit متوافقة مع النظام الحالي

- **ما تم:** إضافة ملفات صلاحيات وأدوار مركزية:
  - `lib/auth/roles.ts`
  - `lib/auth/permissions.ts`
  - `lib/auth/guard.ts`
- **ما تم:** إضافة مسار تدقيق موحد:
  - `lib/audit.ts`
  - `app/api/audit/log/route.ts`
- **ما تم:** تحديث `proxy.ts` ليحمي مسارات `admin` و `api/admin` و `api/accounting` مع إعادة توجيه/منع حسب الصلاحيات وتسجيل محاولات الوصول غير المصرح.
- **ما تم:** تحديث APIs التالية لاستخدام guard الموحد:
  - `app/api/admin/users/route.ts`
  - `app/api/admin/users/create-from-contact/route.ts`
  - `app/api/admin/properties/route.ts`
- **التحقق:** `npx tsc --noEmit` نجح.

### جلسة 2026-03-30 — إضافة APIs للتحقق من حدود الاشتراك والترقية

- **ما تم:** إنشاء `POST /api/subscriptions/check` للتحقق من حدود الموارد حسب الباقة.
- **ما تم:** إنشاء `POST /api/subscriptions/upgrade` لترقية اشتراك مستخدم من الإدارة مع تسجيل تدقيق.

### جلسة 2026-03-30 — تشديد حماية مسارات الحجوزات والاشتراكات

- **ما تم:** `api/bookings` أصبح يفرض المصادقة على GET/POST مع فحص أدوار في POST.
- **ما تم:** `api/subscriptions` انتقل إلى guard موحد بدل فحص role اليدوي.
- **التحقق:** `npx tsc --noEmit` نجح بعد التحديث.

### جلسة 2026-03-30 — استكمال التحويل إلى Server-first + توثيق الإصلاحات

- **ما تم:** تحويل إضافي لمسارات الإدارة لتقليل الاعتماد على التخزين المحلي:
  - `admin/page` أصبح يجلب الحجوزات من `/api/bookings` مباشرة.
  - `admin/contracts` و `admin/contracts/[id]` أزيلت منها قراءات `getAllBookings()` المباشرة وتم الاعتماد على بيانات الخادم.
  - `AdminLayoutInner` يحدد `contactDashboardType` من `/api/user/linked-contact`.
  - `ClientDashboard` و `OwnerDashboard` اعتماد عدادات الحجوزات/العقود/الفواتير/الإيصالات على API.
  - `admin/address-book` يستخدم حجوزات الخادم في الطباعة والربط (مع fallback احتياطي).
  - `admin/bookings` تحميل القائمة من `/api/bookings` كمصدر أساسي.
- **ما تم:** إضافة ملف توثيق دائم للإصلاحات والترقيات:
  - `docs/DEVELOPMENT-FIXES-AND-UPGRADES.md`
  - وربطه من `README.md`.
- **التحقق:** `npx tsc --noEmit` و `npm run build` نجحا.
- **Git:** تم رفع دفعة الإصلاحات إلى `master` (commit: `6aaf2f9`) ثم استكمال أعمال إضافية في نفس اليوم.

### جلسة 2026-03-30 — متابعة تلقائية: تقليل اعتماد العقود المحلية داخل الحجوزات واللوحة

- **ما تم:** `admin/bookings` أصبح يعتمد أكثر على بيانات العقد القادمة من الحجز في الخادم (`contractId/contractData/contractStage`) بدلاً من الاعتماد المحلي عند قفل/عرض حالة العقد.
- **ما تم:** `admin/page` (لوحة الإدارة العامة) تم إلغاء الاعتماد المباشر على `getAllContracts()` المحلي لحساب العقود النشطة، والاعتماد على بيانات `/api/bookings`.
- **ما تم:** تحديث `docs/DEVELOPMENT-FIXES-AND-UPGRADES.md` لتعكس الدفعة الجديدة.

### جلسة 2026-03-30 — متابعة تلقائية إضافية: منع تكرار إنشاء عقود من حجوزات لديها عقد خادم

- **ما تم:** في `admin/contracts` تم تحديث منطق "حجوزات جاهزة لإنشاء عقد" ليتحقق من وجود `contractId` أو `contractData` في بيانات الحجز القادمة من الخادم قبل السماح بالإنشاء.
- **النتيجة:** منع إنشاء عقد محلي مكرر لحجز مرتبط بعقد موجود أصلاً على الخادم.

### جلسة 2026-03-30 — متابعة تلقائية إضافية: دمج عرض العقود من الخادم + المحلي

- **ما تم:** في `admin/contracts` تم دمج قائمة العقود المعروضة من مصدرين (local + server من `/api/bookings`) لتقليل فجوة التزامن.
- **ما تم:** زر الاعتماد الإداري في حالة `DRAFT` أصبح يظهر فقط للعقود المحلية (لتجنب اعتماد محلي على صفوف مصدرها الخادم).

### جلسة 2026-03-30 — متابعة تلقائية إضافية: تشديد دفتر العناوين ضد بيانات fallback قديمة

- **ما تم:** `admin/address-book` لم يعد يرجع إلى `getContactLinkedBookings/getContactLinkedContracts` عند خطأ تحليل/تحميل بيانات الخادم.
- **النتيجة:** تقليل احتمالية إعادة عرض بيانات قديمة من المحلي بعد التصفير الكامل.

### جلسة 2026-03-30 — متابعة تلقائية إضافية: تحسين ربط مستندات الإلغاء في المحاسبة

- **ما تم:** في `AccountingSection` عند وضع DB يتم ربط مستندات إلغاء الحجز من قائمة `documents` القادمة من API بدل استدعاء محلي.
- **النتيجة:** اتساق أعلى بين شاشة المحاسبة وبيانات الخادم في سيناريوهات الإلغاء.

### جلسة 2026-03-30 — تشديد ربط contact بالمستخدم (userId-only افتراضياً)

- **ما تم:** تعديل `getContactForUser` في `addressBook.ts` ليكون افتراضياً userId-only، مع خيار `allowLegacyMatch` فقط عند الحاجة الصريحة.
- **ما تم:** تحديث `my-bookings` لاستخدام `/api/user/linked-contact` مباشرة لقياس اكتمال الملف بدل fallback محلي.
- **الملفات:** `lib/data/addressBook.ts`, `app/[locale]/admin/my-bookings/page.tsx`

### جلسة 2026-03-30 — تحويل صفحات حساب العميل إلى Server-first

- **ما تم:** إضافة `GET /api/me/accounting-documents` لقراءة مستندات المحاسبة الخاصة بالمستخدم من قاعدة البيانات عبر `contactId` المرتبط بالمستخدم.
- **ما تم:** تحديث `my-invoices` و `my-receipts` لاستخدام API الجديد بدل `searchDocuments` المحلي.
- **ما تم:** تحديث `my-properties` لإلغاء fallback المحلي `propertyLandlords` والاعتماد على حجوزات الخادم + محفظة عقارات المالك.
- **ما تم:** تحديث `my-contracts` لإلغاء اعتماد العقود المحلية كمسار أساسي واعتماد بيانات الخادم/booking contractData.
- **الملفات:** `app/api/me/accounting-documents/route.ts`, `app/[locale]/admin/my-invoices/page.tsx`, `app/[locale]/admin/my-receipts/page.tsx`, `app/[locale]/admin/my-properties/page.tsx`, `app/[locale]/admin/my-contracts/page.tsx`

### جلسة 2026-03-29 — إضافة robots + sitemap

- **ما تم:** إنشاء `app/robots.ts` و `app/sitemap.ts` لتوليد `robots.txt` و `sitemap.xml` تلقائياً وتحسين SEO التقني (روابط AR/EN + الصفحات العامة + منع فهرسة admin/api).
- **الملفات:** `app/robots.ts`, `app/sitemap.ts`

### جلسة 2026-03-29 — "حجوزاتي" تعتمد الخادم فقط (منع بقايا localStorage)

- **السبب:** صفحة `my-bookings` كانت تسمح fallback محلي (`bhd_property_bookings`) عند نقص/فراغ بيانات الخادم، فيظهر حجز قديم بعد التصفير.
- **ما تم:** جعل مصدر "حجوزاتي" للمستخدمين من `/api/bookings` فقط بعد أول نجاح استدعاء، وإزالة fallback المحلي. وعند رجوع الخادم بقائمة فارغة يتم حذف `bhd_property_bookings` محلياً.
- **الملفات:** `app/[locale]/admin/my-bookings/page.tsx`

### جلسة 2026-03-29 — إبطال الجلسة فور حذف المستخدم بعد التصفير

- **السبب:** الاعتماد على JWT (stateless) يجعل جلسة المستخدم القديمة تستمر مؤقتاً حتى لو حذف الحساب من DB.
- **ما تم:** في `callbacks.jwt` داخل `lib/auth.ts` إضافة تحقق دوري من وجود `token.id` في جدول `User`. عند عدم الوجود: تعيين token منتهي الصلاحية (exp بالماضي) ومسح هوية الجلسة، فيتحول المستخدم إلى unauthenticated عند تحديث الجلسة/الصفحة.
- **الملفات:** `lib/auth.ts`

### جلسة 2026-03-29 — معالجة بقاء بيانات "حسابي" بعد التصفير

- **السبب:** بقاء `userSession` (انتحال قديم) في `localStorage` قد يفرض هوية مستخدم قديم في الواجهة، ومع fallback محلي في `my-account` عبر email/phone قد تُعرض بيانات CNT قديمة.
- **ما تم:** في `AuthSessionLocalIsolation` إزالة userSession/جلسة mock تلقائياً عند عدم تطابقها مع المستخدم الحقيقي authenticated. وفي `my-account` جعل fallback المحلي يعتمد `findContactByUserId` فقط (بدون email/phone) لمنع تسرب بيانات مستخدم سابق.
- **الملفات:** `components/AuthSessionLocalIsolation.tsx`, `app/[locale]/admin/my-account/page.tsx`

### جلسة 2026-03-29 — تصفير الخادم: مسح الحجوزات/العقود المحلية (تضارب نفس البريد)

- **السبب:** الحجوزات تُعرَّف في الواجهة غالباً بمطابقة **البريد/الهاتف** مع سجل الحجز؛ `bhd_property_bookings` في `localStorage` لم يُمس عند تصفير الخادم فقط، فيظهر لمستخدم جديد بنفس الإيميل حجوزات قديمة.
- **ما تم:** `clearClientCachesAfterServerDbReset()` في `backup.ts` = `resetAllOperationalData()` + `clearAddressBookLocalStorage()`؛ تُستدعى بعد نجاح التصفير في `/admin/data` مع تحديث رسالة النجاح.

### جلسة 2026-03-29 — تصفير الخادم: مسح دفتر العناوين المحلي

- **ما تم:** بعد `POST /api/admin/data/reset` كان جدول `AddressBookContact` يُصفَّر لكن `localStorage` (`bhd_address_book`) يبقى فيُعاد دمج المحتوى القديم ورفعه للخادم. أضيف `clearAddressBookLocalStorage()` واستدعاؤها بعد نجاح التصفير في `/admin/data`.
- **الملفات:** `lib/data/addressBook.ts`, `app/[locale]/admin/data/page.tsx`

### جلسة 2026-03-29 — سجلات البناء + تدوير (مثل ain-oman-web)

- **ما تم:** استلهام أسلوب المشروع السابق: سجلات بختم زمني في مجلد ثابت وتقليل العدد. `tools/build/run-build.ps1` يطبع **بداية/نهاية** البناء، يشغّل `npm run build` مع **Tee** إلى `tools/build/logs/build-yyyyMMdd_HHmmss.log`، و`Invoke-BuildLogRotation` يحتفظ بآخر **20** ملف `build-*.log`. أمر npm: `npm run build:log`. المجلد مُستثنى في `.gitignore`.
- **الملفات:** `tools/build/config.ps1`, `tools/build/run-build.ps1`, `package.json`, `.gitignore`

### جلسة 2026-03-29 — رمز تصفير البيانات في DB + تغيير من الواجهة

- **ما تم:** تخزين رمز الحماية كـ bcrypt في `AppSetting` (`admin_data_reset_pin_hash`)؛ الافتراضي `Abdul100189@` عند أول تشغيل أو بعد `executeResetKeepProperties`؛ `POST /api/admin/data/change-pin`؛ قسم في `/admin/data` لتغيير الرمز (حالي + جديد + تأكيد). `ADMIN_DATA_RESET_PIN` اختياري لأول إنشاء فقط.
- **الملفات:** `lib/server/adminDataPin.ts`, `app/api/admin/data/*`, `app/[locale]/admin/data/page.tsx`, `prisma/seed.ts`, `docs/اقرأني-الدليل-التقني-الشامل.md`, `.env.example`

### جلسة 2026-03-29 — الدليل التقني الشامل «اقرأني» + ربط الجلسات

- **ما تم:** إنشاء `docs/اقرأني-الدليل-التقني-الشامل.md` كنقطة دخول للطبقات، الربط، الصيانة، المخاطر، وديون تقنية معروفة؛ تحديث `SESSION-START.md`, `SESSION-END.md`, `SITE-SCENARIOS-AND-LINKS.md`, `README.md`, `.cursor/rules/session-context.mdc` للإشارة إليه.
- **الملفات:** `docs/اقرأني-الدليل-التقني-الشامل.md` والملفات المذكورة أعلاه

### جلسة 2026-03-29 — /admin/data: تصفير الخادم + PIN + نسخ احتياطي/استعادة

- **ما تم:** صفحة `admin/data` تستدعي `POST /api/admin/data/reset` (تنفيذ `executeResetKeepProperties`) مع `ADMIN_DATA_RESET_PIN`؛ `POST /api/admin/data/backup` لتنزيل لقطة JSON؛ `POST /api/admin/data/restore` برفع ملف. منطق مشترك في `lib/server/dataResetKeepProperties.ts` و`dataBackupSnapshot.ts` و`adminDataPin.ts`. `.env.example` يذكر المتغير.
- **الملفات:** `app/[locale]/admin/data/page.tsx`, `app/api/admin/data/*`, `lib/server/*`, `prisma/reset-keep-properties.ts`, `.env.example`

### جلسة 2026-03-29 — سكربت تصفير DB مع الإبقاء على العقارات

- **ما تم:** `prisma/reset-keep-properties.ts` + `npm run db:reset-keep-properties` — يحذف المستخدمين، الحجوزات، دفتر العناوين، سجل الاتصالات، الاشتراكات، المشاريع، المؤسسات، المحاسبة، المحتوى، الإعدادات؛ يُفرّغ مراجع العقار (مالك/منشئ/شركة) ويُبقي صفوف `Property`؛ يعيد خطط الباقات ومستخدم إداري واحد. يتطلب `CONFIRM_RESET=yes`.

### جلسة 2026-03-29 — S1 vs S2 نفس الهاتف: صف «حسابي» يفوز دائماً

- **ما تم:** في `addressBookDedupeShared` تفضيل `linkedUserId` (Prisma) قبل `userId` في JSON عند تكرار الهاتف/المدني. في `mergeAddressBookApiWithLocal` عدم إعادة شبح محلي بنفس هاتف صف API مربوط بحساب. في `GET /api/address-book` بعد الدمج الأول استدعاء `deleteOtherPersonalRowsSamePhone` لكل صف له `linkedUserId` أو `userId` ثم إعادة جلب الصفوف.
- **الملفات:** `lib/data/addressBookDedupeShared.ts`, `lib/data/addressBook.ts`, `app/api/address-book/route.ts`

### جلسة 2026-03-29 — توحيد دفتر الإدارة مع قاعدة البيانات و«حسابي»

- **السبب:** الدمج `mergeAddressBookApiWithLocal` كان يضيف صفاً محلياً بنفس `userId` ومعرف `CNT` مختلف عن صف الخادم، فيظهر للمدير بيانات تختلف عن `/api/user/linked-contact`. كما أن `linkedUserId` من Prisma لم يكن يُمرَّر في GET دفتر العناوين ففقد الدمج المحلي إشارة الصف المرتبط بالحساب.
- **ما تم:** تخطي أي جهة محلية لها `userId` موجود أصلاً في استجابة GET؛ إرجاع `linkedUserId` في `GET/POST` دفتر العناوين؛ `GET/PATCH` linked-contact يضيفان `linkedUserId`؛ في `dedupeContactsList` استخدام `userId` كبديل لـ `linkedUserId` عند غياب العمود في الكائن.
- **الملفات:** `lib/data/addressBook.ts`, `lib/data/addressBookDedupeShared.ts`, `app/api/address-book/route.ts`, `app/api/user/linked-contact/route.ts`

### جلسة 2026-03-29 — دفتر العناوين vs حسابي: منع الشبح والتكرار

- **ما تم:** عند نجاح `GET /api/address-book` لا يُرفع عند التحميل صف موجود في الـ API؛ لا يُعاد إنشاء صف محلي له `userId` غير ظاهر في استجابة الخادم (شبح بعد الدمج/الحذف). بعد الجلب الثاني: تصفية المحلي لإسقاط صفوف `userId` بـ `id` غير موجود في مجموعة معرفات السيرفر (عندما المجموعة غير فارغة). بعد `syncBookingContactsToAddressBook` استدعاء `rewriteLocalAddressBookDeduped()` لدمج التكرار محلياً.
- **الملفات:** `app/[locale]/admin/address-book/page.tsx`, `lib/data/addressBook.ts` (`rewriteLocalAddressBookDeduped`)

### جلسة 2026-03-29 — مزامنة «حسابي» مع دفتر العناوين (الخادم + الدمج)

- **ما تم:** بعد الحفظ من `my-account` يُستدعى `POST /api/address-book` (`syncContactToAddressBookApi`). دمج تحميل دفتر العناوين: `mergeAddressBookApiWithLocal` يختار لكل `id` النسخة الأحدث حسب `updatedAt`، ثم يرفع للخادم أي جهة محلية أحدث من نسخة الـ GET — يمنع استبدال تعديلات العميل بنسخة قديمة من Prisma.
- **الملفات:** `lib/data/addressBook.ts`, `app/[locale]/admin/my-account/page.tsx`, `app/[locale]/admin/address-book/page.tsx`

### جلسة 2026-03-29 — العنوان: إجبار المحافظة والولاية والمنطقة فقط

- **ما تم:** `contactAddressHasUsableContent` يتطلب محافظة + ولاية + منطقة تفصيلية؛ القرية والشارع والمبنى والطابق اختيارية. `OmanContactAddressFields`: تسميات * وإطارات حمراء/خضراء للثلاثة، و(اختياري) للباقي، ونص توضيحي.
- **الملفات:** `lib/data/addressBook.ts`, `components/admin/OmanContactAddressFields.tsx`, `app/[locale]/admin/my-account/page.tsx` (رسالة نقص العنوان)

### جلسة 2026-03-29 — حسابي: إجبارية الاسم الثاني والإنجليزي وجهة العمل + اكتمال الملف للعقود

- **ما تم:** التحقق عند الحفظ عبر `showMissingFieldsAlert` لمجموعة الحقول؛ إلزام الاسم الأول والثاني والعائلة، الاسم (إنجليزي)، جهة العمل؛ الرقم المدني وانتهاؤه للعمانيين والجواز لغيرهم كما سبق. `getPersonalProfileIssues` يضيف `secondName` و`nameEn` و`workplace` لاعتماد العقد.
- **الملفات:** `app/[locale]/admin/my-account/page.tsx`, `lib/data/addressBook.ts`

### جلسة 2026-03-29 — حسابي: إطار أحمر/أخضر للحقول الإجبارية

- **ما تم:** `getRequiredFieldClass` على حقول التعديل (اسم، بريد، هاتف، جنسية، جنس، هوية/جواز حسب الجنسية، قسم العنوان عبر `sectionClassName` + `inputErrorClass`). دعم `button` في `globals.css` لرمز الدولة في `PhoneCountryCodeSelect`. `OmanContactAddressFields` يقبل `sectionClassName` لإطار القسم.
- **الملفات:** `app/[locale]/admin/my-account/page.tsx`, `components/admin/OmanContactAddressFields.tsx`, `app/[locale]/globals.css`

### جلسة 2026-03-29 — دفتر العناوين: توحيد نمط العنوان + نافذة ContactFormModal

- **ما تم:** `contactAddressHasUsableContent` في `addressBook` للتحقق من العنوان (نص كامل أو حقول هيكلية). تنسيق `OmanContactAddressFields`: صف محافظة/ولاية/منطقة/قرية على شاشات عريضة، ثم شارع/مبنى/طابق، وعنوان بصيغة البطاقات كصفحة دفتر العناوين. نافذة المodal في دفتر العناوين `max-w-4xl`. `ContactFormModal` (حجوزات، عقود، مستندات الحجز) تستخدم نفس المكوّن + قائمة الجنسيات + حفظ العنوان الكامل؛ طباعة النموذج تعرض المحافظة والولاية والحقول. تحديثات طفيفة: `my-account`، `contract-terms` لاستخدام التحقق الموحد.
- **الملفات:** `lib/data/addressBook.ts`, `components/admin/OmanContactAddressFields.tsx`, `components/admin/ContactFormModal.tsx`, `app/[locale]/admin/address-book/page.tsx`, `app/[locale]/admin/my-account/page.tsx`, `app/[locale]/properties/[id]/contract-terms/page.tsx`

### جلسة 2026-03-29 — حسابي ودفتر العناوين: جنسيات كاملة + عنوان عمان متسلسل + ترجمة العنوان

- **ما تم:** قائمة `<select>` لجميع الجنسيات من `NATIONALITIES` (قيمة مخزّنة بالعربي). مكوّن `OmanContactAddressFields` يستخدم `omanLocations` كـ PropertyForm (محافظة → ولاية → منطقة/قرية من القائمة → قرية/مكان نصي + شارع/مبنى/طابق)، يولّد «العنوان الكامل (عربي)» تلقائياً مع إمكانية التعديل، وترجمة تلقائية AR↔EN عبر `/api/translate`. تطبيق في `my-account` و`address-book` (شخصي وشركة ومفوضين).
- **الملفات:** `components/admin/OmanContactAddressFields.tsx`, `lib/data/nationalities.ts`, `app/[locale]/admin/my-account/page.tsx`, `app/[locale]/admin/address-book/page.tsx`

### جلسة 2026-03-29 — حسابي: ترجمة تلقائية للاسم الإنجليزي

- **ما تم:** استخدام `TranslateField` لحقل الاسم (إنجليزي) مع زر «ترجمة من العربي» يعتمد `/api/translate` ودمج أجزاء الاسم العربي كمصدر.
- **الملفات:** `app/[locale]/admin/my-account/page.tsx`

### جلسة 2026-03-29 — حجوزاتي: اعتماد العقد بعد اكتمال ملف «حسابي» = سجل العناوين

- **ما تم:** دوال `getContactProfileIssuesForContractApproval` / `isContactProfileCompleteForContractApproval` في `addressBook` (شخصي: بريد وهوية وعنوان وتواريخ صالحة؛ شركة: سجل ومفوضين). في «حجوزاتي» لا يظهر زر المراجعة/الاعتماد الأخضر إلا إذا اكتمل الملف؛ يظهر تنبيه وربط بـ «حسابي» وزر بديل. صفحة «حسابي» توسّعت لحقول دفتر العناوين: عنوان منظم، عنوان إنجليزي، جهة عمل إنجليزي، ملاحظات إنجليزي، وسوم، مع تحقق عند الحفظ؛ تنبيه لحسابات الشركة دون تعديل ذاتي للسجل.
- **الملفات:** `lib/data/addressBook.ts`, `app/[locale]/admin/my-bookings/page.tsx`, `app/[locale]/admin/my-account/page.tsx`

### جلسة 2026-03-29 — contract-review: زر التوقيع + أقسام مرفقات قابلة للطي

- **ما تم:** توحيد مرحلة العرض مع `inferBookingContractStage` (كما في حجوزاتي) عبر `getContractReviewDisplayStage` حتى يظهر زر «متابعة التوقيع والاعتماد» للمشتري/المستأجر أو المالك عندما تكون المرحلة الفعلية منطقية لذلك. اختيار آخر طلب مكتمل يتضمن كل وسائط التوثيق. أقسام «مرفقات التوثيق» (مشتري/مالك) ودفعات البيع والرسوم والشيكات والرسوم/الضرائب الإضافية أصبحت قابلة للطي (`<details>`).
- **الملفات:** `lib/data/bookingContractStage.ts`, `app/[locale]/admin/my-bookings/page.tsx`, `app/[locale]/admin/contract-review/page.tsx`

### جلسة 2026-03-29 — تقليل وميض لوحة التحكم عند التحديث (أدمن / مالك / مستأجر)

- **ما تم:** اعتبار الأدمن «مؤكداً» عندما يكون الدور `ADMIN` والجلسة معروفة من `getSession`/peek حتى لو كان `useSession` ما زال `loading` (كان يُعرض `RoleBasedSidebar` ثم القائمة الكاملة). تعيين `sessionFetchSettled` فوراً عند `authenticated` من `useSession`. توسيع شاشة التحميل عند وجود مستخدم بدون دور محلول أثناء `loading`. استبدال `Suspense fallback={null}` في غلاف لوحة التحكم بمؤشر تحميل بسيط.
- **الملفات:** `app/[locale]/admin/AdminLayoutInner.tsx`, `app/[locale]/admin/AdminLayoutWrapper.tsx`

### جلسة 2026-03-29 — my-bookings: مرحلة صحيحة للمالك بعد توقيع المشتري + تنقل العميل

- **ما تم:** عدم إظهار «بانتظار اعتماد المشتري» للمالك عندما يكون `signatureRequests`/المرحلة على الخادم قد تجاوزت `ADMIN_APPROVED`؛ مسار بلا عقد محلي يُقيَّد بنفس المنطق. بدون صلاحيات باقة، العميل يرى أقسام لوحة العميل الافتراضية كاملة (حجوزاتي، عقودي…).
- **الملفات:** `app/[locale]/admin/my-bookings/page.tsx`, `lib/data/dashboardSettings.ts`

### جلسة 2026-03-29 (مزامنة extra-data → Prisma + تنقل المالك بدون باقة)

- **ما تم:** حفظ «البيانات الإضافية» يستدعي الآن تحديث `ownerId` في Prisma عند تطابق الرقم التسلسلي مع قائمة العقارات (جهة المالك لها `userId` أو بريد يطابق مستخدم OWNER). عند عدم وجود صلاحيات باقة، أقسام لوحة المالك الافتراضية كاملة في الشريط الجانبي. تنبيه في لوحة المالك إن وُجدت عقارات دون حجوزات على الخادم.
- **الملفات:** `components/admin/PropertyExtraDataForm.tsx`, `lib/data/dashboardSettings.ts`, `components/admin/OwnerDashboard.tsx`

### جلسة 2026-03-29 (متابعة) — مالك بدون تطابق بريد/هاتف في العقد

- **ما تم:** إرجاع حجوزات المالك أيضاً عندما يكون **مالك العقار في Prisma** (`Property.ownerId`) والرقم التسلسلي في DB يطابق كتالوج الموقع؛ تحسين مطابقة هاتف المالك (تطبيع 968 كاملاً)؛ لوحة المالك و«عقاري» و«عقودي» تجلب `/api/admin/properties` لبناء مجموعة التسلسلات وتعرض عقارات المحفظة حتى بلا حجز.
- **الملفات:** `lib/data/ownerLandlordMatch.ts`, `app/api/bookings/route.ts`, `components/admin/OwnerDashboard.tsx`, `app/[locale]/admin/my-properties/page.tsx`, `app/[locale]/admin/my-contracts/page.tsx`, `lib/data/contactLinks.ts`

### جلسة 2026-03-29 — ربط لوحة المالك بالحجوزات والعقارات والمهام (USR-C / دور OWNER)

- **ما تم:** تصحيح `GET /api/bookings` ليعيد للمالك الحجوزات حيث يطابق `contractData` (بريد/هاتف المالك) أو سجل الحجز كعميل؛ جلب الحجوزات في لوحة المالك و«عقاري» دون اشتراط `contactId` في دفتر العناوين؛ «حجوزاتي» للمالك تعرض كل حجوزات السيرفر المفلترة؛ «عقودي» تدمج عقوداً مستمدة من حجوزات الخادم؛ مهام التوثيق في `OwnerDashboard` تستخدم نفس منطق المطابقة؛ ملف مشترك `lib/data/ownerLandlordMatch.ts`؛ عنصر تنقل «حجوزات ومهام العقود» للمالك وربط الباقة بـ `myBookings` ضمن صلاحيات العقود/الإيجار.
- **الملفات:** `app/api/bookings/route.ts`, `lib/data/ownerLandlordMatch.ts`, `lib/data/contactLinks.ts`, `components/admin/OwnerDashboard.tsx`, `app/[locale]/admin/my-properties/page.tsx`, `app/[locale]/admin/my-bookings/page.tsx`, `app/[locale]/admin/my-contracts/page.tsx`, `lib/config/dashboardRoles.ts`, `lib/subscriptionPlanToDashboard.ts`, `messages/ar.json`, `messages/en.json`

### جلسة 2026-03-26 — إصلاح وميض «يجب تسجيل الدخول» بعد تحديث الصفحة (لوحة الإدارة/العميل تحت `/admin`)

- **ما تم:** عدم مسح `lastKnownSessionRef` فوراً عند `unauthenticated` (تأخير ~750ms مع إلغاء عند عودة الجلسة) لتفادي نافذة NextAuth القصيرة؛ مسح فوري عند تسجيل الخروج؛ شاشة تحميل بسيطة أثناء `status === 'loading'` بدون جلسة بعدم الانتحال.
- **الملفات:** `app/[locale]/admin/AdminLayoutInner.tsx`

### جلسة 2026-03-18 — نهاية الجلسة: تقسيم إدارة العقود حسب النوع + إصلاح روابط الحجوزات + مستندات دفعات البيع + تحسين INP + توحيد سيناريو الاعتمادات

- **ما تم:**
  - **لوحة التحكم > العقارات:** تحويل «إدارة العقود» إلى روابط منفصلة حسب النوع: إيجار/بيع/استثمار، مع فلترة صفحة العقود عبر `?kind=RENT|SALE|INVESTMENT`.
  - **صفحة العقود:** عرض العقود والحجوزات الجاهزة بحسب نوع العقار (إيجار/بيع/استثمار) وتعديل العناوين والحقول لتناسب النوع (مثل ثمن البيع بدل الإيجار الشهري عند البيع).
  - **الحجوزات (الإدارة):** زر «تعديل من صفحة العقود» صار يفتح **العقد مباشرة** إذا كان موجوداً، أو يفتح صفحة العقود مع `kind` الصحيح بدل افتراضي الإيجار.
  - **عقد البيع — الدفعات:** استبدال `documentRef` بـ **رابط + رفع ملف فعلي** (صورة/PDF) لكل دفعة مع معاينة/فتح، وترحيل تلقائي من `documentRef` القديم إلى `documentUrl`.
  - **عقد البيع — الملخص المالي:** عرض تفاصيل الرسوم لكل طرف (بنود مرقمة) قبل إظهار الإجمالي على المالك/المشتري.
  - **تحسين INP:** تقليل تجمّد واجهة زر «اعتماد مبدئي من الإدارة» عبر فصل العمل الثقيل إلى مهام مؤجلة، مع تعطيل الزر وإظهار حالة «جاري الاعتماد...».
  - **سيناريو الاعتمادات (موحد لكل الأنواع):** أصبح التسلسل واحداً لكل العقود (إيجار/بيع/استثمار):
    - **اعتماد مبدئي (إدارة) → اعتماد العميل (مستأجر/مشتري/مستثمر) → اعتماد المالك → اعتماد نهائي (إدارة)**.
    - وتم عكس ذلك في `admin/my-bookings` عبر حالات واضحة وأزرار «مراجعة واعتماد» للعميل و«اعتماد المالك» عند الدور المناسب.

- **الملفات المُعدّلة:** 
  - `lib/config/adminNav.ts`
  - `messages/ar.json`, `messages/en.json`
  - `app/[locale]/admin/contracts/page.tsx`
  - `app/[locale]/admin/bookings/page.tsx`
  - `app/[locale]/admin/properties/[id]/bookings/page.tsx`
  - `lib/data/contracts.ts`
  - `app/[locale]/admin/contracts/[id]/page.tsx`
  - `app/[locale]/admin/my-bookings/page.tsx`
  - `docs/DAILY-CONTEXT.md`

- **ملاحظات للجلسة القادمة:**
  - عند العمل من جهاز آخر: نفّذ `git pull origin master` ثم راجع هذا الإدخال.
  - إن رغبت: يمكن لاحقاً نقل موافقات العميل/المالك من داخل صفحة العقد إلى واجهة العميل مباشرة (حسب التصميم المطلوب).

### جلسة 2026-03-03 — نهاية اليوم: عقود البيع (ملاحظة، دفعات، رسوم، ملخص)، عقد الاستثمار، إخفاء ملخص الإيجار عن البيع، وسيط من دفتر العناوين

- **ما تم:**
  - **عقد البيع:** بند 4: إضافة حقل ملاحظة (تاريخ البيع ونقل الملكية). بند 5: ثمن البيع + دفعات متعددة (رقم دفعة، مبلغ، ملاحظة، مرجع مستند) مع إضافة/حذف؛ رسوم (سمسرة %، إسكان %، بلدية، إدارية، نقل ملكية، رسوم أخرى) مع اختيار من يدفع (مالك/مشتري)؛ ملخص مالي (إجمالي على المالك، إجمالي على المشتري).
  - **عقد الاستثمار:** نفس شروط عقد الإيجار مع استبدال لفظ «إيجار» بـ«استثمار» و«المستأجر» بـ«المستثمر» في كل التسميات؛ إظهار أقسام التواريخ والمالية والبلدية والشيكات للاستثمار كما الإيجار.
  - **إخفاء ملخص الإيجار عن عقد البيع:** قسمَا «ملخص مالي» و«ملخص الحسابات النهائية» يظهران فقط لعقد الإيجار/الاستثمار (لا يظهران في عقد البيع).
  - **إصلاح بناء:** استبدال `BUYER` بـ`CLIENT` في `setContactCategoryForBooking` لتفادي خطأ النوع في البناء.
  - **الوسيط في عقد البيع:** عند «البيع عن طريق وكيل/سمسار» — اختيار وسيط من دفتر العناوين (قائمة منسدلة)؛ زر «إضافة وسيط في دفتر العناوين» يفتح نافذة منبثقة (ContactFormModal) لإضافة جهة اتصال جديدة ثم ربطها تلقائياً كوسيط؛ حقل `brokerContactId` في العقد.

- **الملفات المُعدّلة:** `lib/data/contracts.ts`, `app/[locale]/admin/contracts/[id]/page.tsx`, `app/[locale]/admin/contracts/page.tsx`.

- **ملاحظات للجلسة القادمة:** المستودع محدث (آخر commit: c4217a4). في البداية نفّذ `git pull origin master`.

---

### جلسة 2026-03-03 — حجوزاتي: عرض «عقد مسودة» وزر إكمال البيانات للحجز المؤكد (بدون الاعتماد على عقد في localStorage)

- **ما تم:** العقود تُخزّن في localStorage فقط — عند فتح العميل «حجوزاتي» من جهاز آخر لا يظهر عقد أنشأه الأدمن. تم تعديل منطق حجوزاتي: عند كون الحجز **مؤكداً** و**الدفع مؤكداً** (أو تأكيد المحاسب) نعرض الحالة «عقد مسودة — بانتظار رفع المستندات» وزر «إكمال البيانات» يفتح صفحة شروط العقد، حتى لو لم يكن العقد موجوداً في localStorage للعميل. وتوسيع `needsToCompleteContractData` لتعيد true لهذه الحالة.

- **الملفات المُعدّلة:** `app/[locale]/admin/my-bookings/page.tsx`.

---

### جلسة 2026-03-03 — طلب بيانات العقد للعميل + حجوزاتي «إكمال البيانات»

- **ما تم:**
  - **صفحة شروط العقد (contract-terms):** إضافة ملاحظة ثابتة للعميل: «الإدارة تطلب منكم إكمال البيانات التالية (البيانات الشخصية، المستندات المطلوبة، وبيانات الشيكات). جميع الحقول المعلمة كـ «مطلوب» إلزامية.» تظهر عند وجود حجز (bookingId أو قائمة عقود).
  - **صفحة حجوزاتي (my-bookings):** عرض «بحاجة إلى إكمال بيانات العقد والمستندات» عندما يكون الحجز يحتاج إكمال بيانات (مثل ما يظهر في صفحة الحجز للإدارة). إضافة عمود «إجراء» مع زر/رابط «إكمال البيانات» يوجّه لصفحة شروط العقد مع bookingId و email/phone.

- **الملفات المُعدّلة:** `app/[locale]/properties/[id]/contract-terms/page.tsx`, `app/[locale]/admin/my-bookings/page.tsx`.

- **أحداث جديدة:** دالة `needsToCompleteContractData` في my-bookings؛ ملاحظة ثابتة على contract-terms للعميل.

---

### جلسة 2026-03-03 — تعزيز: اسحب عند البدء، ارفع عند الانتهاء

- **ما تم:**
  - توضيح في **بداية الجلسة:** تنفيذ `git pull origin master` **دائماً** قبل أي عمل (في SESSION-START، session-context.mdc).
  - توضيح في **نهاية الجلسة:** رفع كل التغييرات **دائماً** (`git add -A`, `git commit`, `git push`) — لا إغلاق دون الرفع (في SESSION-END، session-context.mdc، والـ checklist).
  - تحديث README و SITE-SCENARIOS-AND-LINKS للإشارة إلى ملفات الجلسة؛ إضافة قاعدة `.cursor/rules/session-context.mdc`.

- **الملفات المُعدّلة:** `docs/SESSION-START.md`, `docs/SESSION-END.md`, `docs/DAILY-CONTEXT.md`, `.cursor/rules/session-context.mdc`, `README.md`, `docs/SITE-SCENARIOS-AND-LINKS.md`.

- **ملاحظات للجلسة القادمة:** في البداية: `git pull`. في النهاية: تحديث DAILY-CONTEXT ثم `git add -A` و `git commit` و `git push`.

---

### جلسة 2026-03-03 — إنشاء ملفات بداية/نهاية الجلسة والسياق اليومي

- **ما تم:**
  - إنشاء `docs/SESSION-START.md`: تعليمات بداية الجلسة، الملفات التي يجب قراءتها، معايير البرمجة، والملفات التي تُحدَّث باستمرار.
  - إنشاء `docs/SESSION-END.md`: إجراءات نهاية الجلسة (تحديث DAILY-CONTEXT، مراجعة التغييرات، تحديث الوثائق، رفع Git).
  - إنشاء `docs/DAILY-CONTEXT.md`: ملف السياق اليومي لمحادثات وأحداث المشروع — يُحدَّث بعد كل جلسة مع تاريخ ووقت.
  - طلب المستخدم: نسخ كل ما في المحادثة في ملف محدّث يومياً؛ ملف لبداية الجلسة؛ ملف لنهاية الجلسة؛ بسبب العمل من أكثر من جهاز — الحفاظ على السياق وعدم تناقص البرمجة.

- **الملفات المُعدّلة/الجديدة:**
  - `docs/SESSION-START.md` (جديد)
  - `docs/SESSION-END.md` (جديد)
  - `docs/DAILY-CONTEXT.md` (جديد)
  - `README.md` (سيُحدَّث للإشارة إلى هذه الملفات)

- **أحداث جديدة:**
  - اعتماد نظام جلسات: بداية جلسة (SESSION-START)، نهاية جلسة (SESSION-END)، سياق يومي (DAILY-CONTEXT).

- **ملاحظات للجلسة القادمة:**
  - في بداية أي جلسة جديدة، قراءة `SESSION-START.md` و `DAILY-CONTEXT.md`.
  - في نهاية الجلسة، تنفيذ خطوات `SESSION-END.md` وتحديث هذا الملف (DAILY-CONTEXT) بالتاريخ والوقت والملخص.

---

## قالب للإضافة في نهاية كل جلسة (انسخه واملأه)

```markdown
### جلسة [YYYY-MM-DD] — [وقت البداية]–[وقت النهاية]

- **ما تم:**
- **الملفات المُعدّلة:**
- **أحداث جديدة:**
- **ملاحظات للجلسة القادمة:**
```

---

## مراجع سريعة

| الملف | الاستخدام |
|-------|-----------|
| `docs/SESSION-START.md` | اقرأه في **بداية** كل جلسة — أوامر، تعليمات، ملفات يجب قراءتها |
| `docs/SESSION-END.md` | نفّذه في **نهاية** كل جلسة — تحديث السياق، رفع، توثيق |
| `docs/DAILY-CONTEXT.md` | هذا الملف — يُحدَّث بعد كل جلسة؛ مراجعته في بداية الجلسة التالية |

---

### جلسة 2026-03-30 — تحسين أداء شامل (كل الصفحات + API caching)

- **ما تم:**
  - تنفيذ دفعة شاملة على صفحات الإدارة/الواجهة لإزالة `cache: 'no-store'` من مسارات القراءة العامة.
  - إضافة prefetch مركزي في `AdminLayoutInner` للمسارات الأكثر استخداماً.
  - تقليل polling الثقيل في صفحات العقد/المراجعة إلى نمط event-driven (`focus` + `visibilitychange`) مع fallback كل 60 ثانية.
  - تنفيذ كاش انتقائي آمن على مستوى API للقوائم الكبيرة مع:
    - `Cache-Control: private, max-age=... , stale-while-revalidate=...`
    - `Vary: Cookie, Authorization`
  - تطبيق الكاش الانتقائي على مسارات: الحجوزات، العقود، دفتر العناوين، عقارات الإدارة، linked-contact، مستندات المحاسبة، القيود اليومية، الحسابات، مستندات المستخدم، الاشتراكات.

- **الملفات المُعدّلة:**
  - `app/[locale]/admin/AdminLayoutInner.tsx`
  - `app/[locale]/admin/address-book/page.tsx`
  - `app/[locale]/admin/my-bookings/page.tsx`
  - `app/[locale]/admin/properties/page.tsx`
  - `app/[locale]/admin/contracts/page.tsx`
  - `app/[locale]/admin/contracts/[id]/page.tsx`
  - `app/[locale]/admin/contract-review/page.tsx`
  - `app/[locale]/admin/bookings/page.tsx`
  - `app/[locale]/admin/page.tsx`
  - `app/[locale]/admin/my-account/page.tsx`
  - `app/[locale]/admin/my-contracts/page.tsx`
  - `app/[locale]/admin/my-properties/page.tsx`
  - `app/[locale]/admin/my-invoices/page.tsx`
  - `app/[locale]/admin/my-receipts/page.tsx`
  - `app/[locale]/admin/users/[id]/page.tsx`
  - `app/[locale]/admin/subscriptions/page.tsx`
  - `app/[locale]/subscriptions/page.tsx`
  - `app/[locale]/properties/[id]/contract-terms/page.tsx`
  - `app/api/bookings/route.ts`
  - `app/api/contracts/route.ts`
  - `app/api/address-book/route.ts`
  - `app/api/admin/properties/route.ts`
  - `app/api/user/linked-contact/route.ts`
  - `app/api/accounting/documents/route.ts`
  - `app/api/accounting/journal/route.ts`
  - `app/api/accounting/accounts/route.ts`
  - `app/api/me/accounting-documents/route.ts`
  - `app/api/subscriptions/route.ts`
  - `docs/DEVELOPMENT-FIXES-AND-UPGRADES.md`

- **أحداث جديدة:**
  - إغلاق مراحل الأداء المجدولة (Phase 1-3) بحالة closed.
  - إبقاء `no-store` فقط في المسارات الحساسة المعتمدة على توكن توقيع/تحقق لحظي.

- **ملاحظات للجلسة القادمة:**
  - تنفيذ قياس قبل/بعد عبر المتصفح (Network panel) على صفحات: address-book, bookings, contracts, properties.
  - ضبط `max-age` لكل endpoint حسب نمط تغيّر البيانات الفعلي.

---

### جلسة 2026-04-01 — تنفيذ خطة المراقبة والقياس وضبط الكاش وتثبيت الأداء

- **ما تم:**
  - التحقق: المستودع على `f9b01ab` ثم تطبيق **stabilization**: توحيد قيم `Cache-Control` في `lib/server/httpCacheHeaders.ts` وربطها بجميع مسارات القراءة المعنية.
  - ضبط `max-age` / `stale-while-revalidate` حسب نوع البيانات (حجوزات أقصر، عقارات أطول، دليل حسابات الأطول، اشتراكات أدمن بحذر).
  - موازاة جلب الحجوزات ومستندات المحاسبة في `address-book` دفعة واحدة (`Promise.all`) لتقليل التسلسل الشبكي.
  - إضافة `tests/e2e/perf-navigation.spec.ts` وأمر `npm run test:e2e:perf` لطباعة زمن التحميل وعدد طلبات `/api/*` (يتطلب تشغيل الخادم + متغيرات `E2E_ADMIN_*`).
  - `npm run build` ناجح؛ `playwright test` للـ perf + critical: **skipped** محلياً بدون بيانات E2E (سلوك متوقع).

- **الملفات المُعدّلة/الجديدة:**
  - `lib/server/httpCacheHeaders.ts` (جديد)
  - `app/api/bookings/route.ts`, `app/api/contracts/route.ts`, `app/api/address-book/route.ts`, `app/api/admin/properties/route.ts`, `app/api/user/linked-contact/route.ts`
  - `app/api/accounting/documents/route.ts`, `app/api/accounting/journal/route.ts`, `app/api/accounting/accounts/route.ts`
  - `app/api/me/accounting-documents/route.ts`, `app/api/subscriptions/route.ts`
  - `app/[locale]/admin/address-book/page.tsx`
  - `tests/e2e/perf-navigation.spec.ts`, `package.json`
  - `docs/DEVELOPMENT-FIXES-AND-UPGRADES.md`, `docs/DAILY-CONTEXT.md`

- **ملاحظات للجلسة القادمة:**
  - لتسجيل أرقام قياس حقيقية: `npm run build` ثم `npm run start`، ثم في طرف جديد `npm run test:e2e:perf` مع `E2E_ADMIN_EMAIL` و`E2E_ADMIN_PASSWORD` في البيئة.

---

### جلسة 2026-04-01 — متابعة إقفال الأداء (قياس runtime سريع + ضبط نهائي للباقات)

- **ما تم:**
  - متابعة نهائية: ضبط كاش `plans`, `admin/plans`, `subscriptions/me` بسياسات قصيرة من `httpCacheHeaders`.
  - تشغيل قياس runtime فعلي على خادم production محلي (`next start`) لروابط عامة قابلة للقياس بدون حساب.
  - نتائج عينة (5 طلبات لكل مسار):
    - `/ar/subscriptions`: avg `227.6ms` (min `85ms`, max `510ms`)
    - `/ar/login`: avg `56.4ms` (min `43ms`, max `72ms`)
    - `/api/plans`: avg `340.4ms` (min `224ms`, max `533ms`)
  - التحقق من الهيدر:
    - `/api/plans` يرجع: `Cache-Control: public, max-age=60, stale-while-revalidate=300`.

- **ملاحظة تشغيلية:**
  - قياس الصفحات الثقيلة داخل الإدارة (address-book/bookings/contracts/properties) يحتاج بيانات دخول E2E (`E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`) لتشغيل `test:e2e:perf` وإخراج أرقام كاملة.
