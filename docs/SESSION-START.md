# بداية الجلسة — اقرأ هذا الملف أولاً
# Session Start — Read This First

**الغرض:** عند بداية أي جلسة عمل (من أي جهاز)، اقرأ هذا الملف وتابع التعليمات قبل البدء في التصميم أو البرمجة.

**آخر تحديث لهذا الملف:** 2026-03-29

---

## 1. أوامر بداية الجلسة (للمساعد / AI)

عند بداية كل جلسة جديدة:

1. **اسحب آخر التحديثات من المستودع:** نفّذ `git pull origin master` (أو الفرع المعتمد) — **دائماً** في بداية الجلسة لضمان العمل على آخر نسخة.
2. **اقرأ هذا الملف بالكامل** (`docs/SESSION-START.md`).
3. **اقرأ الملفات المرجعية** المذكورة في القسم 2 (تفاصيل الموقع والملفات الواجب قراءتها)، و**راجع** `docs/اقرأني-الدليل-التقني-الشامل.md` عند العمل على صيانة، أو تكامل، أو ميزات تؤثر على عدة طبقات.
4. **طبّق تعليمات البرمجة** في القسم 3 في كل تعديل أو إضافة.
5. **راجع ملف السياق اليومي** `docs/DAILY-CONTEXT.md` لمعرفة آخر الأحداث والمحادثات إن وُجد.
6. بعد الانتهاء من الجلسة، نفّذ إجراءات **نهاية الجلسة** حسب `docs/SESSION-END.md` (بما فيها **رفع كل شيء**).

---

## 2. تفاصيل الموقع والملفات التي يجب قراءتها قبل البدء

### 2.1 وصف المشروع

- **المشروع:** موقع بن حمود للتطوير (BHD-OM) — عقارات، حجوزات، اشتراكات، محاسبة، دفتر عناوين.
- **الهدف المقصود:** أكثر من مليون عقار وأكثر من 100 ألف مستخدم في الدقيقة — البنية تُجهَّز لهذا من اليوم.
- **التقنيات:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Prisma, next-intl (عربي/إنجليزي).

### 2.2 الملفات التي يُفترض قراءتها قبل البدء (حسب المهمة)

| المهمة | الملفات المطلوب قراءتها |
|--------|--------------------------|
| **أي تعديل عام** | `README.md`, `.cursor/rules/technical-engineering-crm.mdc`, `docs/SITE-SCENARIOS-AND-LINKS.md` |
| **فهم شامل للنظام والصيانة** | `docs/اقرأني-الدليل-التقني-الشامل.md` (نقطة دخول للطبقات، الربط، المخاطر، ديون تقنية) |
| **صفحات جديدة / روابط / تناسق** | `docs/SITE-SCENARIOS-AND-LINKS.md`, `lib/config/adminNav.ts`, `lib/config/dashboardRoles.ts` |
| **نماذج (Forms)** | `.cursor/rules/required-fields-styling.mdc`, `.cursor/rules/draft-auto-save.mdc`, `lib/utils/requiredFields.ts`, `lib/utils/draftStorage.ts` |
| **حجز، عقود، مستندات** | `docs/BOOKING_WORKFLOW_DESIGN.md`, `docs/ROLES-VISIBILITY-RULES.md` |
| **اشتراكات وباقات** | `docs/ROLES-SUBSCRIPTION-DESIGN.md` |
| **محاسبة** | `docs/accounting-chart-and-usage.md`, `docs/ACCOUNTING_ARCHITECTURE.md`, `lib/accounting/data/dbService.ts` |
| **دفتر العناوين / جهات اتصال** | `app/[locale]/admin/address-book/page.tsx`, `app/api/address-book/route.ts` |
| **عمل من أكثر من جهاز** | `docs/WORKFLOW.md` |

### 2.3 مراجع ثابتة في المشروع

| المورد | الغرض |
|--------|--------|
| `.cursor/rules/technical-engineering-crm.mdc` | المعايير التقنية، الترقية، السرعة، CRM |
| `.cursor/rules/required-fields-styling.mdc` | الحقول الإجبارية: أحمر عند الفراغ، أخضر عند التعبئة |
| `.cursor/rules/draft-auto-save.mdc` | حفظ المسودات تلقائياً وزر «حفظ» للالتزام |
| `.cursor/rules/git-push-after-update.mdc` | رفع التغييرات بعد التحديث (إن وُجد) |
| `README.md` | نظام الألوان، التباعد، الخطوط، البنية |
| `docs/SITE-SCENARIOS-AND-LINKS.md` | سيناريوهات الموقع، خريطة الصفحات، معايير التصميم |

---

## 3. التعليمات التي يجب اتباعها

### 3.1 معايير البرمجة (ملخص من القواعد)

- **TypeScript صارم:** تجنب `any`، استخدم interfaces واضحة.
- **طبقة بيانات معزولة:** لا استدعاء مباشر لـ localStorage/DB في المكوّنات؛ استخدم دوال/API.
- **Pagination:** أي قائمة تتجاوز ~50 عنصرًا → `limit` + `offset` أو cursor.
- **السرعة والسلاسة:** `prefetch={true}` للروابط، `loading.tsx` للصفحات، `next/image` مع lazy، debounce واضح.
- **i18n:** كل النصوص قابلة للترجمة (عربي/إنجليزي).
- **الحقول الإجبارية:** إطار أحمر عند الفراغ، أخضر بعد التعبئة؛ استخدام `getRequiredFieldClass` و `showMissingFieldsAlert`.
- **المسودات:** حفظ تلقائي (draftStorage)، والالتزام عند زر «حفظ» فقط؛ بانر تنبيه عند وجود مسودات.
- **التاريخ:** استخدام مكوّن `DateInput` (`components/shared/DateInput.tsx`) في كل مكان يحتاج إدخال تاريخ.
- **الإيصالات والدفع:** تصميم موحّد في كل الموقع.

### 3.2 إضافة صفحة جديدة

1. إنشاء الصفحة في `app/[locale]/...`.
2. إضافة الرابط في `lib/config/adminNav.ts` (وإن لزم في `lib/config/dashboardRoles.ts`).
3. إضافة مفاتيح الترجمة في `messages/ar.json` و `messages/en.json`.
4. مراعاة الصلاحيات (أدمن فقط أو عميل/مالك) حسب `adminNav.ts` و `dashboardRoles.ts`.

### 3.3 الملفات التي يجب تحديثها باستمرار

- **بعد إضافة أو تغيير صفحة/مسار:** `docs/SITE-SCENARIOS-AND-LINKS.md` (خريطة الصفحات والسيناريوهات).
- **بعد تغيير معماري أو تدفق بيانات حرج:** تحديث قسم أو فقرة في `docs/اقرأني-الدليل-التقني-الشامل.md` إن وُجد تأثير على الصيانة أو المخاطر.
- **بعد تغيير سير العمل أو الصلاحيات:** `docs/BOOKING_WORKFLOW_DESIGN.md`, `docs/ROLES-SUBSCRIPTION-DESIGN.md`, `docs/ROLES-VISIBILITY-RULES.md` حسب السياق.
- **بعد كل جلسة:** `docs/DAILY-CONTEXT.md` (ملخص المحادثة والأحداث — يُحدَّث من خلال إجراءات نهاية الجلسة).

---

## 4. ملخص سريع للمساعد (AI)

- اقرأ `SESSION-START.md` (هذا الملف) و `DAILY-CONTEXT.md` في بداية الجلسة؛ راجع `docs/اقرأني-الدليل-التقني-الشامل.md` عند الحاجة لصورة معمارية أو صيانة.
- التزم بـ `technical-engineering-crm.mdc`, `required-fields-styling.mdc`, `draft-auto-save.mdc`.
- استخدم `SITE-SCENARIOS-AND-LINKS.md` لخريطة الصفحات ومعايير التصميم.
- في نهاية الجلسة نفّذ `SESSION-END.md` (رفع، تحديث ملف السياق، توثيق التاريخ والوقت).
