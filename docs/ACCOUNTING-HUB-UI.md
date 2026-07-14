# Accounting Hub UI — Architecture (Phases 6–17)

> مركز المحاسبة في لوحة الإدارة: `/[locale]/admin/accounting`  
> نقطة الدخول: `components/admin/AccountingSection.tsx` (**12 سطر** — orchestrator فقط)

---

## 1. شجرة المكوّنات

```
AccountingSection (12 lines)
└── useAccountingHubController
    └── AccountingHubShell
        ├── DraftBanner
        ├── AccountingHubFilterBar     data-testid="accounting-hub-filters"
        ├── AccountingHubTabs          switch(activeTab) → 13 tabs
        └── AccountingHubModals        6 modals + print
```

---

## 2. طبقة الـ Hooks

| Hook | المسؤولية | الملف |
|------|-----------|-------|
| `useAccountingHubController` | تجميع كل hooks + callbacks | `lib/accounting/hooks/useAccountingHubController.ts` |
| `useAccountingHubNavigation` | URL tabs، `setTab`، `reportView` | `lib/accounting/hooks/useAccountingHubNavigation.ts` |
| `useAccountingHub` | بيانات، فلاتر، فرز، pagination، حجوزات | `lib/accounting/hooks/useAccountingHub.ts` |
| `useAccountingHubAnalytics` | KPI، تقارير DB، اتجاهات شهرية | `lib/accounting/hooks/useAccountingHubAnalytics.ts` |
| `useAccountingHubForms` | modals، preset، `action=add` | `lib/accounting/hooks/useAccountingHubForms.ts` |
| `useAccountingFormDraft` | auto-save مسودات (800ms) | `lib/accounting/hooks/useAccountingFormDraft.ts` |
| `useAccountingDbReports` | fetch تقارير API (داخل analytics) | `lib/accounting/hooks/useAccountingDbReports.ts` |

---

## 3. التبويبات (13)

مصدر الحقيقة: `lib/accounting/ui/hubTabIds.ts` — متزامن مع E2E `accounting-hub.spec.ts`.

| Tab ID | Component |
|--------|-----------|
| dashboard | `AccountingDashboardTab` |
| sales | `AccountingSalesTab` |
| purchases | `AccountingPurchasesTab` |
| accounts | `AccountingAccountsTab` |
| journal | `AccountingJournalTab` |
| documents | `AccountingDocumentsTab` |
| reports | `AccountingReportsTab` |
| claims | `AccountingClaimsTab` |
| cheques | `AccountingChequesTab` |
| payments | `AccountingPaymentsTab` |
| periods | `AccountingPeriodsTab` |
| audit | `AccountingAuditTab` |
| settings | `AccountingSettingsTab` |

---

## 4. URL و Navigation

```ts
// lib/accounting/navigation/buildAccountingHubPath.ts
buildAccountingHubPath('ar', 'documents', { action: 'add' })
// → /ar/admin/accounting?tab=documents&action=add

buildAccountingHubPath('ar', 'reports', { report: 'trial' })
// → /ar/admin/accounting?tab=reports&report=trial
```

Query params مدعومة:
- `tab` — التبويب النشط
- `action=add` — فتح modal (journal/accounts/documents/cheques)
- `report` — sub-view داخل التقارير
- `propertyId`, `projectId`, `contractId` — preset لmodal الشيك

---

## 5. مسودات النماذج (Draft Auto-Save)

| مفتاح localStorage | Modal |
|--------------------|-------|
| `accounting_document` | مستند |
| `accounting_journal` | قيد |
| `accounting_cheque` | شيك |
| `accounting_account` | حساب |

- `saveDraft` / `loadDraft` / `clearDraft` عبر `lib/utils/draftStorage.ts`
- `clearDraft` عند preset من المبيعات أو OCR
- `DraftBanner` + تنبيه داخل كل modal

---

## 6. Factories (Pure)

`lib/accounting/forms/formFactories.ts`:
- `createEmptyDocForm`, `docFormFromInvoiceScan`
- `createEmptyJournalForm`, `createEmptyAccountForm`, `createEmptyChequeForm`
- `computeMonthlyTrendSeries` في `lib/accounting/dashboard/monthlyTrends.ts`

---

## 7. data-testid للاختبارات

| ID | العنصر |
|----|--------|
| `accounting-hub` | الجذر |
| `accounting-hub-filters` | شريط الفلاتر |
| `accounting-tab-*` | كل تبويب |
| `accounting-modal-document` | modal مستند |
| `accounting-modal-journal` | modal قيد |
| `accounting-modal-cheque` | modal شيك |
| `accounting-modal-account` | modal حساب |

E2E: `tests/e2e/accounting-hub.spec.ts`, `tests/e2e/api-accounting-reports.spec.ts`

Unit: `tests/unit/*.test.ts` (formFactories, hubTabIds, buildAccountingHubPath, monthlyTrends, journalAccountSuggest, …)

---

## 8. SSR و initialData

صفحة الخادم: `app/[locale]/admin/accounting/page.tsx`  
تمرّر `AccountingInitialData` إلى `AccountingSection` → `useAccountingHub` يتخطى أول fetch عند وجود بيانات SSR.

---

## 9. قواعد التطوير

1. **لا منطق محاسبي في UI** — المنطق في `lib/accounting/` و `lib/data/accounting.ts`
2. **لا prop drilling** — مرّر `hub` / `analytics` / `forms` ككائنات
3. **تبويب جديد** → راجع **`docs/ACCOUNTING-HUB-MAINTENANCE.md`** §1
4. **modal جديد** → راجع **`docs/ACCOUNTING-HUB-MAINTENANCE.md`** §2
5. **Pagination** — أي قائمة > ~50 عبر `useAccountingHub` (limit/offset)

---

## 10. تاريخ إعادة الهيكلة (Phases 6–17)

| Phase | المحتوى |
|-------|---------|
| 6 | Reports tab + DB ledger APIs |
| 7 | Journal/Claims/Periods/Audit tabs |
| 8 | Cheques/Payments + FTA export |
| 9 | Dashboard/Documents + CI unit tests |
| 10 | Sales/Purchases/Accounts/Settings |
| 11 | Document/Journal/Cheque modals |
| 12 | useAccountingHub + drafts |
| 13 | useAccountingHubAnalytics + restore tabs |
| 14 | useAccountingHubForms + E2E modals |
| 15 | Navigation + AccountingHubModals |
| 16 | AccountingHubTabs switch |
| 17 | Controller + Shell (~12 lines) |

**قبل:** `AccountingSection.tsx` ~1700+ سطر  
**بعد:** 12 سطر + hooks معزولة
