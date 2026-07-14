# Accounting Hub — دليل الصيانة (إضافة Tab / Modal)

> للمعمارية العامة راجع [`ACCOUNTING-HUB-UI.md`](./ACCOUNTING-HUB-UI.md)  
> مصدر الحقيقة لمعرّفات التبويب: `lib/accounting/ui/hubTabIds.ts`

---

## 1. إضافة تبويب جديد

### قائمة الملفات (بالترتيب)

| # | الملف | ماذا تفعل |
|---|--------|-----------|
| 1 | `lib/accounting/ui/hubTabIds.ts` | أضف id في `ACCOUNTING_HUB_TAB_IDS` + `ACCOUNTING_HUB_E2E_TAB_ORDER` |
| 2 | `components/admin/accounting/AccountingXxxTab.tsx` | أنشئ مكوّن التبويب + `data-testid="accounting-tab-{id}"` |
| 3 | `components/admin/accounting/AccountingHubTabs.tsx` | أضف `case '{id}':` في الـ switch |
| 4 | `lib/config/adminNav.ts` | أضف عنصراً في `accountingSubItems` + `labelKey` في الترجمات |
| 5 | `lib/config/dashboardRoles.ts` | أضف `DashboardSectionKey` إن لزم صلاحيات |
| 6 | `AccountingHubFilterBar.tsx` | فلاتر خاصة بالتبويب (إن وُجدت) |
| 7 | `lib/accounting/hooks/useAccountingHub.ts` | بيانات/فلاتر إضافية إن احتاج التبويب |
| 8 | `lib/accounting/hooks/useAccountingHubAnalytics.ts` | KPI أو aggregates إن لزم |
| 9 | `tests/unit/hubTabIds.test.ts` | تحديث العدد المتوقع (13 → N) |
| 10 | `tests/e2e/accounting-hub.spec.ts` | يستورد `ACCOUNTING_HUB_E2E_TAB_ORDER` تلقائياً |
| 11 | `docs/ACCOUNTING-HUB-UI.md` | جدول التبويبات §3 |

### قالب تبويب بسيط

```tsx
'use client';

export default function AccountingExampleTab(props: { ar: boolean }) {
  const { ar } = props;
  return (
    <div className="admin-card p-6" data-testid="accounting-tab-example">
      <h2 className="text-lg font-semibold">{ar ? 'مثال' : 'Example'}</h2>
    </div>
  );
}
```

### قواعد

- **لا منطق محاسبي في التبويب** — استدعِ دوال `lib/data/accounting.ts` أو API
- **Pagination** لأي قائمة > ~50 عبر `useAccountingHub`
- **i18n** — نصوص عربي/إنجليزي
- **prefetch** على أي `Link` داخل التبويب

### التحقق

```bash
npm run test:unit
npm run build
# اختياري محلياً:
npx playwright test tests/e2e/accounting-hub.spec.ts
```

---

## 2. إضافة Modal جديد

### قائمة الملفات

| # | الملف | ماذا تفعل |
|---|--------|-----------|
| 1 | `lib/accounting/ui/draftKeys.ts` | مفتاح مسودة جديد |
| 2 | `lib/accounting/forms/formFactories.ts` | `createEmptyXxxForm()` |
| 3 | `lib/accounting/types/formTypes.ts` | نوع حالة النموذج |
| 4 | `components/admin/accounting/AccountingAddXxxModal.tsx` | Modal + `data-testid="accounting-modal-xxx"` |
| 5 | `lib/accounting/hooks/useAccountingFormDraft.ts` | ربط المسودة (debounce 800ms) |
| 6 | `lib/accounting/hooks/useAccountingHubForms.ts` | state + open/close + URL `action=add` |
| 7 | `lib/accounting/ui/hubTabIds.ts` | أضف tab في `ACCOUNTING_HUB_MODAL_ACTION_TABS` إن فُتح من URL |
| 8 | `components/admin/accounting/AccountingHubModals.tsx` | تضمين Modal |
| 9 | `lib/config/adminNav.ts` | رابط سريع `?tab=...&action=add` (اختياري) |
| 10 | `tests/e2e/accounting-hub.spec.ts` | اختبار فتح من URL + تنبيه المسودة |
| 11 | `tests/unit/formFactories.test.ts` | factory للنموذج الجديد |

### معايير Modal إلزامية

1. **مسودة تلقائية** — `saveDraft` عند التغيير، `clearDraft` بعد الحفظ الناجح
2. **تنبيه** — «البيانات لن تظهر إلا بعد الحفظ» (انظر modals الحالية)
3. **حقول إجبارية** — `getRequiredFieldClass` + `showMissingFieldsAlert`
4. **useDb** — استدعِ API عند `useDb`، وإلا localStorage layer

### URL لفتح Modal

```
/{locale}/admin/accounting?tab=documents&action=add
```

التبويبات المدعومة حالياً: `ACCOUNTING_HUB_MODAL_ACTION_TABS` في `hubTabIds.ts`.

---

## 3. دوال مساعدة في hubTabIds.ts

| الدالة | الاستخدام |
|--------|-----------|
| `isAccountingHubTabId(s)` | تحقق من query `tab` |
| `parseAccountingHubTabId(s)` | قراءة آمنة من URL (fallback: dashboard) |
| `isAccountingHubModalActionTab(tab)` | هل يدعم `action=add`؟ |

---

## 4. أخطاء شائعة

| المشكلة | السبب | الحل |
|---------|--------|------|
| تبويب فارغ | نسيت `case` في `AccountingHubTabs` | أضف case + testid |
| 404 أو tab=invalid | id غير موجود في `hubTabIds` | أضف للمصدر المركزي |
| Modal لا يفتح من URL | tab ليس في `MODAL_ACTION_TABS` | أضف + handler في `useAccountingHubForms` |
| E2E يفشل | tab جديد غير في `E2E_TAB_ORDER` | حدّث المصفوفة |
| تبويب مفقود من القائمة | نسيت `adminNav.ts` | أضف `accountingSubItems` |

---

## 5. Phase 19–20

- Phase 19: نوع موحّد، `parseAccountingHubTabId`، دليل صيانة
- Phase 20: manifest + [`ACCOUNTING-HUB-REFACTOR-COMPLETE.md`](./ACCOUNTING-HUB-REFACTOR-COMPLETE.md) — **إغلاق رسمي Phases 6–20**
