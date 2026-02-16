# ERD - نظام المحاسبة (للمرحلة القادمة - DB Migration)

```
┌─────────────────────────────────────────────────────────────────┐
│ AccountingAccount (دليل الحسابات)                               │
├─────────────────────────────────────────────────────────────────┤
│ id, code (unique), nameAr, nameEn, type, parentId, isActive,     │
│ sortOrder, createdAt, updatedAt                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ AccountingJournalEntry (قيود اليومية)                            │
├─────────────────────────────────────────────────────────────────┤
│ id, serialNumber, version, date, totalDebit, totalCredit,        │
│ descriptionAr, descriptionEn, documentType, documentId,         │
│ contactId, bankAccountId, propertyId, projectId, status,         │
│ replacedBy, createdAt, updatedAt                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ AccountingJournalLine (بنود القيد)                               │
├─────────────────────────────────────────────────────────────────┤
│ id, journalId, accountId, debit, credit, descriptionAr,         │
│ descriptionEn                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ AccountingFiscalPeriod (الفترات المالية)                          │
├─────────────────────────────────────────────────────────────────┤
│ id, code, startDate, endDate, isLocked, closedAt, closedBy      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ AccountingAuditLog (سجل التدقيق - غير قابل للتعديل)               │
├─────────────────────────────────────────────────────────────────┤
│ id, timestamp, action, entityType, entityId, userId, reason,    │
│ previousState, newState                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Constraints
- **Balance Check**: totalDebit = totalCredit لكل قيد
- **Precision**: دقتان عشريتان
- **Referential Integrity**: accountId موجود في AccountingAccount
- **Period Lock**: لا ترحيل لفترة مغلقة
