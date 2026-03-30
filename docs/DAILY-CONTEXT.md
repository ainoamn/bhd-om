# السياق اليومي والمحادثات — يُحدَّث بعد كل جلسة
# Daily Context & Conversation Log

**الغرض:** نسخ ملخص المحادثات والأحداث هنا وتحديثه **بعد كل جلسة** (ويُفضّل مراجعته يومياً). يضمن العمل من أكثر من جهاز عدم تغيّر السياق أو تناقص البرمجة. كل إدخال **مُؤرّخ ومُؤقّت**.

**تعليمات التحديث:** في نهاية كل جلسة، اتبع `docs/SESSION-END.md` وأضف قسماً جديداً أدناه تحت "آخر الأحداث".

---

## آخر الأحداث (الأحدث في الأعلى)

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
