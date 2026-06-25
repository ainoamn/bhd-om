# -*- coding: utf-8 -*-
from pathlib import Path

p = next(Path(".").glob("*.html"))
t = p.read_text(encoding="utf-8")

def rep(old, new, label):
    global t
    if old not in t:
        raise SystemExit(f"MISS {label}")
    t = t.replace(old, new, 1)
    print("ok", label)

# Remove sortKeys toolbar blocks → empty options
rep(
    """                toolbar.innerHTML = insightToolbarFiltersAndPrint('units', {
                    sortKeys: [
                        { key: 'building', lab: 'المبنى / Building' },
                        { key: 'unit', lab: 'الوحدة / Unit' },
                        { key: 'status', lab: 'الحالة / Status' },
                        { key: 'tenant', lab: 'المستأجر / Tenant' }
                    ]
                });""",
    """                toolbar.innerHTML = insightToolbarFiltersAndPrint('units', {});""",
    "units toolbar",
)

rep(
    """                toolbar.innerHTML = insightToolbarFiltersAndPrint('rented', {
                    sortKeys: [
                        { key: 'building', lab: 'المبنى / Building' },
                        { key: 'unit', lab: 'الوحدة / Unit' },
                        { key: 'tenant', lab: 'المستأجر / Tenant' },
                        { key: 'endDate', lab: 'نهاية العقد / End date' }
                    ]
                });""",
    """                toolbar.innerHTML = insightToolbarFiltersAndPrint('rented', {});""",
    "rented toolbar",
)

rep(
    """                toolbar.innerHTML = insightToolbarFiltersAndPrint('vacant', {
                    sortKeys: [
                        { key: 'building', lab: 'المبنى / Building' },
                        { key: 'unit', lab: 'الوحدة / Unit' },
                        { key: 'rent', lab: 'إيجار مرجعي / Ref. rent' }
                    ]
                });""",
    """                toolbar.innerHTML = insightToolbarFiltersAndPrint('vacant', {});""",
    "vacant toolbar",
)

rep(
    """                toolbar.innerHTML = insightToolbarFiltersAndPrint('reserved', {
                    sortKeys: [
                        { key: 'building', lab: 'المبنى / Building' },
                        { key: 'unit', lab: 'الوحدة / Unit' },
                        { key: 'status', lab: 'الحالة / Status' },
                        { key: 'reservedBy', lab: 'المحجوز / Reserved name' }
                    ]
                });""",
    """                toolbar.innerHTML = insightToolbarFiltersAndPrint('reserved', {});""",
    "reserved toolbar",
)

rep(
    """                toolbar.innerHTML = insightToolbarFiltersAndPrint('monthly', {
                    sortKeys: [
                        { key: 'building', lab: 'المبنى / Building' },
                        { key: 'n', lab: 'وحدات مؤجرة / Rented units' },
                        { key: 'sum', lab: 'مجموع شهري / Monthly total' }
                    ]
                });""",
    """                toolbar.innerHTML = insightToolbarFiltersAndPrint('monthly', {});""",
    "monthly toolbar",
)

rep(
    """                toolbar.innerHTML = insightToolbarFiltersAndPrint('yearly', {
                    sortKeys: [
                        { key: 'building', lab: 'المبنى / Building' },
                        { key: 'n', lab: 'عدد الوحدات / Units' },
                        { key: 'sum', lab: 'مجموع سنوي / Yearly est.' }
                    ]
                });""",
    """                toolbar.innerHTML = insightToolbarFiltersAndPrint('yearly', {});""",
    "yearly toolbar",
)

rep(
    """                toolbar.innerHTML = insightToolbarFiltersAndPrint(em, {
                    sortKeys: [
                        { key: 'building', lab: 'المبنى / Building' },
                        { key: 'unit', lab: 'الوحدة / Unit' },
                        { key: 'tenant', lab: 'المستأجر / Tenant' },
                        { key: 'endDate', lab: 'تاريخ النهاية / End date' },
                        { key: 'days', lab: 'متبقي يوم / Days left' }
                    ]
                });""",
    """                toolbar.innerHTML = insightToolbarFiltersAndPrint(em, {});""",
    "exp toolbar",
)

rep(
    """                toolbar.innerHTML = insightToolbarFiltersAndPrint('evictions', {
                    sortKeys: [
                        { key: 'building', lab: 'المبنى / Building' },
                        { key: 'count', lab: 'عدد الطلبات / Count' },
                        { key: 'unit', lab: 'الوحدة / Unit' },
                        { key: 'tenant', lab: 'المستأجر / Tenant' }
                    ],
                    extraHtml: '<button type="button" class="btn-outline mini-btn" onclick="insightAddEvictionPrompt()">➕ تسجيل طلب إخلاء / Add request</button>'
                });""",
    """                toolbar.innerHTML = insightToolbarFiltersAndPrint('evictions', {
                    extraHtml: '<button type="button" class="btn-outline mini-btn" onclick="insightAddEvictionPrompt()">➕ تسجيل طلب إخلاء / Add request</button>'
                });""",
    "evictions toolbar",
)

# Units: header row
rep(
    """            body.innerHTML = `<table class="ops-table"><thead><tr><th>المبنى / Building</th><th>الوحدة / Unit</th><th>الحالة / Status</th><th>المستأجر / Tenant</th><th></th></tr></thead><tbody>
                ${sorted.map((u, i) => `<tr><td>${escHtml(u.building)}</td><td>${escHtml(u.unit)}</td><td>${escHtml(u.status)}</td><td>${escHtml(u.tenant)}</td><td><button type="button" class="mini-btn" onclick="openInsightUnitAt(${i})">تفاصيل / Details</button></td></tr>`).join('')}
            </tbody></table>`;""",
    """            body.innerHTML = `<table class="ops-table"><thead><tr>
                ${insightThSort('units', 'building', 'المبنى / Building')}
                ${insightThSort('units', 'unit', 'الوحدة / Unit')}
                ${insightThSort('units', 'status', 'الحالة / Status')}
                ${insightThSort('units', 'tenant', 'المستأجر / Tenant')}
                <th></th>
            </tr></thead><tbody>
                ${sorted.map((u, i) => `<tr><td>${escHtml(u.building)}</td><td>${escHtml(u.unit)}</td><td>${escHtml(u.status)}</td><td>${escHtml(u.tenant)}</td><td><button type="button" class="mini-btn" onclick="openInsightUnitAt(${i})">تفاصيل / Details</button></td></tr>`).join('')}
            </tbody></table>`;""",
    "units thead",
)

rep(
    """            body.innerHTML = `<table class="ops-table"><thead><tr><th>المبنى / Building</th><th>الوحدة / Unit</th><th>المستأجر / Tenant</th><th>نهاية العقد / End</th><th></th></tr></thead><tbody>
                ${sorted.map((u, i) => `<tr><td>${escHtml(u.building)}</td><td>${escHtml(u.unit)}</td><td>${escHtml(u.tenant)}</td><td>${escHtml(u.endDate)}</td><td><button type="button" class="mini-btn" onclick="openInsightUnitAt(${i})">عقد / Contract</button></td></tr>`).join('')}
            </tbody></table>`;""",
    """            body.innerHTML = `<table class="ops-table"><thead><tr>
                ${insightThSort('rented', 'building', 'المبنى / Building')}
                ${insightThSort('rented', 'unit', 'الوحدة / Unit')}
                ${insightThSort('rented', 'tenant', 'المستأجر / Tenant')}
                ${insightThSort('rented', 'endDate', 'نهاية العقد / End')}
                <th></th>
            </tr></thead><tbody>
                ${sorted.map((u, i) => `<tr><td>${escHtml(u.building)}</td><td>${escHtml(u.unit)}</td><td>${escHtml(u.tenant)}</td><td>${escHtml(u.endDate)}</td><td><button type="button" class="mini-btn" onclick="openInsightUnitAt(${i})">عقد / Contract</button></td></tr>`).join('')}
            </tbody></table>`;""",
    "rented thead",
)

rep(
    """                <table class="ops-table"><thead><tr><th>المبنى / Building</th><th>الوحدة / Unit</th><th>إيجار مرجعي / Ref. rent</th><th></th></tr></thead><tbody>
                ${sorted.map((u, i) => `<tr><td>${escHtml(u.building)}</td><td>${escHtml(u.unit)}</td><td>${formatOMR(u.monthlyRent)}</td><td>
                    <button type="button" class="mini-btn" onclick="openInsightUnitAt(${i})">تفاصيل</button>
                    <button type="button" class="mini-btn" onclick="startReservationForVacant(${i})">حجز</button>
                </td></tr>`).join('')}
            </tbody></table>`;""",
    """                <table class="ops-table"><thead><tr>
                ${insightThSort('vacant', 'building', 'المبنى / Building')}
                ${insightThSort('vacant', 'unit', 'الوحدة / Unit')}
                ${insightThSort('vacant', 'rent', 'إيجار مرجعي / Ref. rent')}
                <th></th>
            </tr></thead><tbody>
                ${sorted.map((u, i) => `<tr><td>${escHtml(u.building)}</td><td>${escHtml(u.unit)}</td><td>${formatOMR(u.monthlyRent)}</td><td>
                    <button type="button" class="mini-btn" onclick="openInsightUnitAt(${i})">تفاصيل</button>
                    <button type="button" class="mini-btn" onclick="startReservationForVacant(${i})">حجز</button>
                </td></tr>`).join('')}
            </tbody></table>`;""",
    "vacant thead",
)

rep(
    """            body.innerHTML = `<table class="ops-table"><thead><tr><th>المبنى / Building</th><th>وحدات مؤجرة / Rented</th><th>مجموع شهري OMR / Monthly</th><th></th></tr></thead><tbody>
                ${sorted.map((row) => {
                    const b = row.building;
                    return `<tr><td>${escHtml(b)}</td><td>${row.n}</td><td>${formatOMR(row.sum)}</td><td><button type="button" class="mini-btn" onclick='insightGoMonthlyBuilding(${JSON.stringify(b)})'>تفصيل وحدات / Units</button></td></tr>`;
                }).join('')}
            </tbody></table>`;""",
    """            body.innerHTML = `<table class="ops-table"><thead><tr>
                ${insightThSort('monthly', 'building', 'المبنى / Building')}
                ${insightThSort('monthly', 'n', 'وحدات مؤجرة / Rented')}
                ${insightThSort('monthly', 'sum', 'مجموع شهري OMR / Monthly')}
                <th></th>
            </tr></thead><tbody>
                ${sorted.map((row) => {
                    const b = row.building;
                    return `<tr><td>${escHtml(b)}</td><td>${row.n}</td><td>${formatOMR(row.sum)}</td><td><button type="button" class="mini-btn" onclick='insightGoMonthlyBuilding(${JSON.stringify(b)})'>تفصيل وحدات / Units</button></td></tr>`;
                }).join('')}
            </tbody></table>`;""",
    "monthly thead",
)

rep(
    """            body.innerHTML = `<p style="font-size:12px;color:#666">مجموع (إيجار شهري × 12) لكل مبنى — تقدير سنوي. / Sum (monthly × 12) per building — yearly estimate.</p>
                <table class="ops-table"><thead><tr><th>المبنى / Building</th><th>وحدات / Units</th><th>مجموع سنوي تقديري / Yearly est.</th><th></th></tr></thead><tbody>
                ${sorted.map((row) => {
                    const b = row.building;
                    return `<tr><td>${escHtml(b)}</td><td>${row.n}</td><td>${formatOMR(row.sum)}</td><td><button type="button" class="mini-btn" onclick='insightGoYearlyBuilding(${JSON.stringify(b)})'>تفصيل / Detail</button></td></tr>`;
                }).join('')}
            </tbody></table>`;""",
    """            body.innerHTML = `<p style="font-size:12px;color:#666">مجموع (إيجار شهري × 12) لكل مبنى — تقدير سنوي. / Sum (monthly × 12) per building — yearly estimate.</p>
                <table class="ops-table"><thead><tr>
                ${insightThSort('yearly', 'building', 'المبنى / Building')}
                ${insightThSort('yearly', 'n', 'وحدات / Units')}
                ${insightThSort('yearly', 'sum', 'مجموع سنوي تقديري / Yearly est.')}
                <th></th>
            </tr></thead><tbody>
                ${sorted.map((row) => {
                    const b = row.building;
                    return `<tr><td>${escHtml(b)}</td><td>${row.n}</td><td>${formatOMR(row.sum)}</td><td><button type="button" class="mini-btn" onclick='insightGoYearlyBuilding(${JSON.stringify(b)})'>تفصيل / Detail</button></td></tr>`;
                }).join('')}
            </tbody></table>`;""",
    "yearly thead",
)

rep(
    """            body.innerHTML = `<table class="ops-table"><thead><tr><th>المبنى / Building</th><th>الوحدة / Unit</th><th>المستأجر / Tenant</th><th>النهاية / End</th><th>متبقي / Days</th><th></th></tr></thead><tbody>
                ${list.map((u, i) => `<tr><td>${escHtml(u.building)}</td><td>${escHtml(u.unit)}</td><td>${escHtml(u.tenant)}</td><td>${escHtml(u.endDate)}</td><td>${daysUntil(u.endDate)}</td><td><button type="button" class="mini-btn" onclick="openInsightUnitAt(${i})">تفاصيل / Details</button></td></tr>`).join('')}
            </tbody></table>`;""",
    """            body.innerHTML = `<table class="ops-table"><thead><tr>
                ${insightThSort(em, 'building', 'المبنى / Building')}
                ${insightThSort(em, 'unit', 'الوحدة / Unit')}
                ${insightThSort(em, 'tenant', 'المستأجر / Tenant')}
                ${insightThSort(em, 'endDate', 'النهاية / End')}
                ${insightThSort(em, 'days', 'متبقي / Days')}
                <th></th>
            </tr></thead><tbody>
                ${list.map((u, i) => `<tr><td>${escHtml(u.building)}</td><td>${escHtml(u.unit)}</td><td>${escHtml(u.tenant)}</td><td>${escHtml(u.endDate)}</td><td>${daysUntil(u.endDate)}</td><td><button type="button" class="mini-btn" onclick="openInsightUnitAt(${i})">تفاصيل / Details</button></td></tr>`).join('')}
            </tbody></table>`;""",
    "exp thead",
)

# Buildings table header
rep(
    """                ${isEditingExisting ? '' : `<table class="ops-table"><thead><tr><th>المبنى</th><th>عدد الوحدات</th><th>عدد الملاك المرتبطين</th><th></th><th></th></tr></thead><tbody>
                ${sorted.map((row) => {
                    const b = row.building;
                    const ownersCount = row.ownersCount;
                    return `<tr><td>${escHtml(b)}</td><td>${row.unitCount}</td><td>${ownersCount}</td><td><button type="button" class="mini-btn" onclick='insightGoBuilding(${JSON.stringify(b)})'>فتح</button></td><td><button type="button" class="mini-btn" onclick='openBuildingEditor(${JSON.stringify(b)})'>تعديل</button></td></tr>`;
                }).join('')}
            </tbody></table>`}`;""",
    """                ${isEditingExisting ? '' : `<table class="ops-table"><thead><tr>
                ${insightThSort('buildings', 'building', 'المبنى / Building')}
                ${insightThSort('buildings', 'units', 'عدد الوحدات / Units')}
                ${insightThSort('buildings', 'owners', 'عدد الملاك / Owners')}
                <th></th><th></th>
            </tr></thead><tbody>
                ${sorted.map((row) => {
                    const b = row.building;
                    const ownersCount = row.ownersCount;
                    return `<tr><td>${escHtml(b)}</td><td>${row.unitCount}</td><td>${ownersCount}</td><td><button type="button" class="mini-btn" onclick='insightGoBuilding(${JSON.stringify(b)})'>فتح</button></td><td><button type="button" class="mini-btn" onclick='openBuildingEditor(${JSON.stringify(b)})'>تعديل</button></td></tr>`;
                }).join('')}
            </tbody></table>`}`;""",
    "buildings thead",
)

# Owners table
rep(
    """                ${isOwnerEditorOpen ? '' : `<table class="ops-table"><thead><tr><th>#</th><th>اسم المالك / Owner</th><th>عدد المباني المرتبطة / Linked buildings</th><th></th><th></th></tr></thead><tbody>
                ${sortedOwn.map((row, i) => {
                    const o = row.owner;
                    const n = row.links;
                    return `<tr><td>${i + 1}</td><td>${escHtml(o)}</td><td>${n}</td><td><button type="button" class="mini-btn" onclick='insightGoOwner(${JSON.stringify(o)})'>تفاصيل</button></td><td><button type="button" class="mini-btn" onclick='openOwnerEditor(${JSON.stringify(o)})'>تعديل</button></td></tr>`;
                }).join('')}
            </tbody></table>`}`;""",
    """                ${isOwnerEditorOpen ? '' : `<table class="ops-table"><thead><tr><th>#</th>
                ${insightThSort('owners', 'owner', 'اسم المالك / Owner')}
                ${insightThSort('owners', 'links', 'عدد المباني / Linked')}
                <th></th><th></th>
            </tr></thead><tbody>
                ${sortedOwn.map((row, i) => {
                    const o = row.owner;
                    const n = row.links;
                    return `<tr><td>${i + 1}</td><td>${escHtml(o)}</td><td>${n}</td><td><button type="button" class="mini-btn" onclick='insightGoOwner(${JSON.stringify(o)})'>تفاصيل</button></td><td><button type="button" class="mini-btn" onclick='openOwnerEditor(${JSON.stringify(o)})'>تعديل</button></td></tr>`;
                }).join('')}
            </tbody></table>`}`;""",
    "owners thead",
)

# Evictions: two tables — summary + detail
rep(
    """            body.innerHTML = `${sumRows.length ? `<table class="ops-table"><thead><tr><th>المبنى / Building</th><th>عدد الطلبات / Count</th><th></th></tr></thead><tbody>
                        ${sumRows.map((r) => `<tr><td>${escHtml(r.building)}</td><td>${r.count}</td><td><button type="button" class="mini-btn" onclick='insightGoEvictionBuilding(${JSON.stringify(r.building)})'>عرض الوحدات / Units</button></td></tr>`).join('')}
                    </tbody></table>` : ''}
                    <h6 style="margin-top:14px">كل الطلبات / All requests</h6>
                    <table class="ops-table"><thead><tr><th>المبنى / Building</th><th>الوحدة / Unit</th><th>المستأجر / Tenant</th><th>الطلب / Request</th><th>الإخلاء المتوقع / Planned</th><th></th></tr></thead><tbody>
                        ${evPairs.map(({ e, idx }) => {
                            return `<tr>
                                <td>${escHtml(e.building)}</td>
                                <td>${escHtml(e.unit)}</td>
                                <td>${escHtml(e.tenant)}</td>
                                <td>${escHtml(e.requestDate)}</td>
                                <td>${escHtml(e.plannedDate)}</td>
                                <td>
                                    <button type="button" class="mini-btn" onclick='openUnitDetailsByKey(${JSON.stringify(e.building)}, ${JSON.stringify(e.unit)})'>الوحدة / Unit</button>
                                    <button type="button" class="mini-btn" onclick="removeEviction(${idx})">حذف / Delete</button>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody></table>`;""",
    """            body.innerHTML = `${sumRows.length ? `<table class="ops-table"><thead><tr>
                        ${insightThSort('evictions', 'building', 'المبنى / Building')}
                        ${insightThSort('evictions', 'count', 'عدد الطلبات / Count')}
                        <th></th>
                    </tr></thead><tbody>
                        ${sumRows.map((r) => `<tr><td>${escHtml(r.building)}</td><td>${r.count}</td><td><button type="button" class="mini-btn" onclick='insightGoEvictionBuilding(${JSON.stringify(r.building)})'>عرض الوحدات / Units</button></td></tr>`).join('')}
                    </tbody></table>` : ''}
                    <h6 style="margin-top:14px">كل الطلبات / All requests</h6>
                    <table class="ops-table"><thead><tr>
                        ${insightThSort('evictions', 'building', 'المبنى / Building')}
                        ${insightThSort('evictions', 'unit', 'الوحدة / Unit')}
                        ${insightThSort('evictions', 'tenant', 'المستأجر / Tenant')}
                        <th>الطلب / Request</th><th>الإخلاء المتوقع / Planned</th><th></th>
                    </tr></thead><tbody>
                        ${evPairs.map(({ e, idx }) => {
                            return `<tr>
                                <td>${escHtml(e.building)}</td>
                                <td>${escHtml(e.unit)}</td>
                                <td>${escHtml(e.tenant)}</td>
                                <td>${escHtml(e.requestDate)}</td>
                                <td>${escHtml(e.plannedDate)}</td>
                                <td>
                                    <button type="button" class="mini-btn" onclick='openUnitDetailsByKey(${JSON.stringify(e.building)}, ${JSON.stringify(e.unit)})'>الوحدة / Unit</button>
                                    <button type="button" class="mini-btn" onclick="removeEviction(${idx})">حذف / Delete</button>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody></table>`;""",
    "evictions thead",
)

# Reserved second table headers (first table keep simple — or add lens only in toolbar)
rep(
    """                <table class="ops-table"><thead><tr><th>المبنى / Building</th><th>الوحدة / Unit</th><th>الحالة / Status</th><th></th></tr></thead><tbody>
                    ${sortedRows.map((u, i) => `<tr><td>${escHtml(u.building)}</td><td>${escHtml(u.unit)}</td><td>${escHtml(u.status)}</td><td><button type="button" class="mini-btn" onclick="openInsightUnitAt(${i})">تفاصيل / Details</button></td></tr>`).join('')}
                </tbody></table>`;""",
    """                <table class="ops-table"><thead><tr>
                    ${insightThSort('reserved', 'building', 'المبنى / Building')}
                    ${insightThSort('reserved', 'unit', 'الوحدة / Unit')}
                    ${insightThSort('reserved', 'status', 'الحالة / Status')}
                    <th></th>
                </tr></thead><tbody>
                    ${sortedRows.map((u, i) => `<tr><td>${escHtml(u.building)}</td><td>${escHtml(u.unit)}</td><td>${escHtml(u.status)}</td><td><button type="button" class="mini-btn" onclick="openInsightUnitAt(${i})">تفاصيل / Details</button></td></tr>`).join('')}
                </tbody></table>`;""",
    "reserved units thead",
)

p.write_text(t, encoding="utf-8")
print("ALL DONE")
