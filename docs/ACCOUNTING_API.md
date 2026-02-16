# واجهات برمجة التطبيقات - المحاسبة
# Accounting REST API

Base URL: `/api/accounting`

## 1. الحسابات (Accounts)

### GET /api/accounting/accounts
الحصول على دليل الحسابات.

**Response:**
```json
[
  {
    "id": "...",
    "code": "1000",
    "nameAr": "الصندوق",
    "nameEn": "Cash",
    "type": "ASSET",
    "isActive": true,
    "sortOrder": 1
  }
]
```

## 2. قيود اليومية (Journal)

### GET /api/accounting/journal
**Query:**
- `fromDate` (optional): YYYY-MM-DD
- `toDate` (optional): YYYY-MM-DD

### POST /api/accounting/journal
**Body:**
```json
{
  "date": "2025-02-16",
  "lines": [
    { "accountId": "...", "debit": 100, "credit": 0, "descriptionAr": "وصف" },
    { "accountId": "...", "debit": 0, "credit": 100, "descriptionAr": "وصف" }
  ],
  "descriptionAr": "وصف القيد",
  "documentType": "JOURNAL",
  "status": "APPROVED"
}
```

## 3. المستندات (Documents)

### GET /api/accounting/documents
**Query:**
- `fromDate`, `toDate`, `type`

### POST /api/accounting/documents
**Body:**
```json
{
  "type": "RECEIPT",
  "status": "APPROVED",
  "date": "2025-02-16",
  "contactId": "...",
  "bankAccountId": "...",
  "amount": 100,
  "currency": "OMR",
  "vatRate": 5,
  "vatAmount": 5,
  "totalAmount": 105,
  "descriptionAr": "إيصال استلام"
}
```
يُرحّل تلقائياً عند الحفظ.

## 4. التقارير (Reports)

### GET /api/accounting/reports
**Query:**
- `fromDate`, `toDate`, `asOfDate`
- `report`: `trial` | `income` | `balance`

## 5. التنبؤات (Forecast)

### GET /api/accounting/forecast
**Query:**
- `months`: عدد الأشهر التاريخية (default: 6)
- `forecastMonths`: عدد أشهر التنبؤ (default: 3)

**Response:**
```json
{
  "historical": { "labels": [...], "revenue": [...], "expense": [...], "cashFlow": [...] },
  "forecast": { "labels": [...], "revenue": [...], "expense": [...], "cashFlow": [...] },
  "summary": { "avgRevenue": 0, "avgExpense": 0, "trendRevenue": 0, "trendExpense": 0 }
}
```

## 6. التكامل الخارجي

- **Webhooks**: (قيد إضافي) إرسال حدث عند إنشاء قيد/مستند
- **Authentication**: يُضاف عند تفعيل NextAuth
- **Rate Limiting**: يُنصح بتطبيقه للإنتاج
