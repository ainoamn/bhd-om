# Accounting Hub Refactor — اكتمال (Phases 6–20)

> **الحالة:** ✅ مكتمل — 2026-07-14  
> **نقطة الدخول:** `components/admin/AccountingSection.tsx` (**12 سطر**)

---

## 1. ملخص

| قبل | بعد |
|-----|-----|
| `AccountingSection.tsx` ~1700+ سطر monolith | 12 سطر orchestrator |
| منطق + UI + modals + tabs في ملف واحد | hooks معزولة + Shell + Tabs + Modals |
| بدون اختبارات hub مخصصة | 41+ unit test + E2E لـ 13 tab |

---

## 2. خريطة المراحل (6–20)

| Phase | Commit area | المحتوى |
|-------|-------------|---------|
| 6 | Reports | DB ledger APIs + Reports tab + E2E |
| 7 | Tabs | Journal / Claims / Periods / Audit |
| 8 | Payments | Cheques / Payments + FTA export |
| 9 | Dashboard | Documents tab + CI unit tests |
| 10 | Modules | Sales / Purchases / Accounts / Settings |
| 11 | Modals | Document / Journal / Cheque modals + AI suggest |
| 12 | Data hook | `useAccountingHub` + FilterBar + draft auto-save |
| 13 | Analytics | `useAccountingHubAnalytics` + restore missing tabs |
| 14 | Forms | `useAccountingHubForms` + formFactories + E2E modals |
| 15 | Nav | `useAccountingHubNavigation` + `AccountingHubModals` |
| 16 | Tabs UI | `AccountingHubTabs` switch + `hubTabIds.ts` |
| 17 | Controller | `useAccountingHubController` + `AccountingHubShell` |
| 18 | Docs | `ACCOUNTING-HUB-UI.md` + composition tests |
| 19 | Registry | `ACCOUNTING-HUB-MAINTENANCE.md` + centralized tab types |
| 20 | Closure | هذا الملف + manifest + closure tests |

---

## 3. البنية النهائية

```
AccountingSection (12 lines)
└── useAccountingHubController
    ├── useAccountingHubNavigation   — URL / tabs
    ├── useAccountingHub             — data / filters / pagination
    ├── useAccountingHubAnalytics    — KPI / reports / trends
    ├── useAccountingHubForms        — modals / presets / action=add
    └── AccountingHubShell
        ├── DraftBanner
        ├── AccountingHubFilterBar
        ├── AccountingHubTabs        — 13 tabs
        └── AccountingHubModals      — 6 modals + print
```

---

## 4. فهرس الوثائق

| الملف | الغرض |
|-------|--------|
| [`ACCOUNTING-HUB-UI.md`](./ACCOUNTING-HUB-UI.md) | المعمارية، hooks، tabs، URL، drafts |
| [`ACCOUNTING-HUB-MAINTENANCE.md`](./ACCOUNTING-HUB-MAINTENANCE.md) | كيف تضيف tab أو modal |
| [`ACCOUNTING_ARCHITECTURE.md`](./ACCOUNTING_ARCHITECTURE.md) | طبقات المحاسبة الكاملة |
| [`accounting-chart-and-usage.md`](./accounting-chart-and-usage.md) | دليل الاستخدام والحسابات |
| `lib/accounting/ui/hubRefactorManifest.ts` | manifest للاختبارات |

---

## 5. قائمة تحقق ما بعد الإ refactor

- [x] Entry point ≤ 15 سطر
- [x] 13 tab في `hubTabIds.ts` + switch في `AccountingHubTabs`
- [x] 4 modal tabs تدعم `?action=add`
- [x] Draft auto-save في modals الرئيسية
- [x] E2E: `accounting-hub.spec.ts` (13 tabs + modals)
- [x] Unit: composition + hubTabIds + formFactories + …
- [x] `npm run build` ✅
- [x] `npm run test:unit` ✅

---

## 6. التطوير المستقبلي

**لا حاجة لإعادة هيكلة إضافية** — أي ميزة جديدة تتبع:

1. [`ACCOUNTING-HUB-MAINTENANCE.md`](./ACCOUNTING-HUB-MAINTENANCE.md)
2. معايير `.cursor/rules/` (drafts، required fields، pagination)
3. `lib/data/accounting.ts` أو API — لا منطق محاسبي في UI

**اختياري لاحقاً (خارج نطاق Phases 6–20):**

- React Testing Library لـ hooks
- استخراج tab registry كـ `Record<tabId, Component>` بدل switch
- Storybook للتبويبات

---

## 7. التحقق السريع

```bash
npm run test:unit
npm run build
npx playwright test tests/e2e/accounting-hub.spec.ts   # محلياً
```

Manifest: `lib/accounting/ui/hubRefactorManifest.ts`  
Closure test: `tests/unit/accountingHubRefactorComplete.test.ts`
