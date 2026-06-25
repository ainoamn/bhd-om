# -*- coding: utf-8 -*-
from pathlib import Path
import re

f = next(Path('.').glob('عقد*.html'))
text = f.read_text(encoding='utf-8')
t = text

old_collect = """            tenantNameAr: document.getElementById('tenantNameAr').value,
            tenantNameEn: document.getElementById('tenantNameEn').value,
            tenantId: document.getElementById('tenantId').value,"""
new_collect = """            tenantNameAr: document.getElementById('tenantNameAr').value,
            tenantNameEn: document.getElementById('tenantNameEn').value,
            tenantEntityType: document.getElementById('tenantEntityType')?.value || 'person',
            tenantCommercialRegNo: document.getElementById('tenantCommercialRegNo')?.value || '',
            tenantCommercialRegExpiryDate: document.getElementById('tenantCommercialRegExpiryDate')?.value || '',
            tenantCompanyExtraMobile: document.getElementById('tenantCompanyExtraMobile')?.value || '',
            tenantCompanySignatoriesJson: document.getElementById('tenantCompanySignatoriesJson')?.value || '[]',
            tenantId: document.getElementById('tenantId').value,"""
if old_collect in t:
    t = t.replace(old_collect, new_collect, 1)
    print('collectStorable: ok')
else:
    print('collectStorable: skip')

old_validate = """        if (isReservationMode) {
            if (!toStr(d.tenantId) || !toStr(d.tenantMobile)) {
                alert(t('⚠️ لا يمكن إكمال الحجز بدون الرقم المدني ورقم الجوال للمستأجر.', '⚠️ Reservation cannot be completed without tenant Civil ID and mobile number.'));
                return false;
            }
        }"""
new_validate = """        if (isReservationMode) {
            if (!toStr(d.tenantMobile)) {
                alert(t('⚠️ لا يمكن إكمال الحجز بدون رقم جوال المستأجر.', '⚠️ Reservation cannot be completed without tenant mobile number.'));
                return false;
            }
            if (toStr(d.tenantEntityType) === 'company') {
                if (!toStr(d.tenantCommercialRegNo)) {
                    alert(t('⚠️ لا يمكن إكمال حجز شركة بدون رقم السجل التجاري.', '⚠️ Cannot complete a company reservation without commercial registration (CR) number.'));
                    return false;
                }
            } else if (!toStr(d.tenantId)) {
                alert(t('⚠️ لا يمكن إكمال الحجز بدون الرقم المدني للمستأجر (شخص).', '⚠️ Reservation cannot be completed without tenant civil ID (person).'));
                return false;
            }
        }"""
if old_validate in t:
    t = t.replace(old_validate, new_validate, 1)
    print('validateCoreData: ok')
else:
    print('validateCoreData: skip')

m = re.search(r"    function findTenantAddressBookIndexByFormName\(\) \{[\s\S]*?\n    \}", t)
if m:
    repl = """    function findTenantAddressBookIndexByFormName() {
        const d = getFormData();
        const wantCo = toStr(d.tenantEntityType) === 'company';
        const nameAr = toStr(d.tenantNameAr);
        const nameEn = toStr(d.tenantNameEn).toLowerCase();
        const civil = toStr(d.tenantId);
        const cr = toStr(d.tenantCommercialRegNo);
        const mobile = toStr(d.tenantMobile);
        return addressBookEntries.findIndex((x) => {
            if (wantCo) {
                if (toStr(x.type) !== 'company') return false;
                if (cr && toStr(x.commercialRegNo) === cr) return true;
                if (nameAr && toStr(x.name) === nameAr) return true;
                if (nameEn && toStr(x.nameEn).toLowerCase() === nameEn) return true;
                if (mobile && toStr(x.mobile) === mobile) return true;
                return false;
            }
            if (toStr(x.type) !== 'tenant') return false;
            if (civil && toStr(x.idNo) === civil) return true;
            if (nameAr && toStr(x.name) === nameAr) return true;
            if (nameEn && toStr(x.nameEn).toLowerCase() === nameEn) return true;
            if (mobile && toStr(x.mobile) === mobile) return true;
            return false;
        });
    }"""
    t = t[:m.start()] + repl + t[m.end():]
    print('findTenantAddressBookIndexByFormName: ok')
else:
    print('findTenantAddressBookIndexByFormName: skip')

m2 = re.search(r"    function findTenantAddressBookEntryForReservation\(reservation, formData\) \{[\s\S]*?\n    \}", t)
if m2:
    repl2 = """    function findTenantAddressBookEntryForReservation(reservation, formData) {
        const fd = formData || {};
        const tenantId = toStr(fd.tenantId).trim();
        const tenantNameAr = toStr(fd.tenantNameAr).trim();
        const tenantNameEn = toStr(fd.tenantNameEn).trim().toLowerCase();
        const tenantMobile = toStr(fd.tenantMobile || reservation?.phone).trim();
        const tenantCr = toStr(fd.tenantCommercialRegNo).trim();
        const wantCo = toStr(fd.tenantEntityType) === 'company';
        return addressBookEntries.find((x) => {
            if (wantCo) {
                if (toStr(x.type) !== 'company') return false;
                if (tenantCr && toStr(x.commercialRegNo).trim() === tenantCr) return true;
                if (tenantNameAr && toStr(x.name).trim() === tenantNameAr) return true;
                if (tenantNameEn && toStr(x.nameEn).trim().toLowerCase() === tenantNameEn) return true;
                if (tenantMobile && toStr(x.mobile).trim() === tenantMobile) return true;
                return false;
            }
            if (toStr(x.type) !== 'tenant') return false;
            if (tenantId && toStr(x.idNo).trim() === tenantId) return true;
            if (tenantNameAr && toStr(x.name).trim() === tenantNameAr) return true;
            if (tenantNameEn && toStr(x.nameEn).trim().toLowerCase() === tenantNameEn) return true;
            if (tenantMobile && toStr(x.mobile).trim() === tenantMobile) return true;
            return false;
        }) || null;
    }"""
    t = t[:m2.start()] + repl2 + t[m2.end():]
    print('findTenantAddressBookEntryForReservation: ok')
else:
    print('findTenantAddressBookEntryForReservation: skip')

# loadAllData: after tenantEmail line add new fields
old_load = """            document.getElementById('tenantEmail').value = data.tenantEmail || '';
            document.getElementById('buildingNo').value = data.buildingNo;"""
new_load = """            document.getElementById('tenantEmail').value = data.tenantEmail || '';
            if (document.getElementById('tenantEntityType')) document.getElementById('tenantEntityType').value = data.tenantEntityType || 'person';
            if (document.getElementById('tenantCommercialRegNo')) document.getElementById('tenantCommercialRegNo').value = data.tenantCommercialRegNo || '';
            if (document.getElementById('tenantCommercialRegExpiryDate')) document.getElementById('tenantCommercialRegExpiryDate').value = data.tenantCommercialRegExpiryDate || '';
            if (document.getElementById('tenantCompanyExtraMobile')) document.getElementById('tenantCompanyExtraMobile').value = data.tenantCompanyExtraMobile || '';
            if (document.getElementById('tenantCompanySignatoriesJson')) document.getElementById('tenantCompanySignatoriesJson').value = data.tenantCompanySignatoriesJson || '[]';
            document.getElementById('buildingNo').value = data.buildingNo;"""
if old_load in t:
    t = t.replace(old_load, new_load, 1)
    print('loadAllData tenants: ok')
else:
    print('loadAllData tenants: skip')

old_load_tail = """            ensureTypeSelectAlwaysNew();
            updateReservationCalculations();"""
new_load_tail = """            ensureTypeSelectAlwaysNew();
            try { syncTenantEntityFieldsFromType(); } catch (e) {}
            updateReservationCalculations();"""
if old_load_tail in t:
    t = t.replace(old_load_tail, new_load_tail, 1)
    print('loadAllData sync: ok')

# inputs array extend
old_inputs = "const inputs = ['agreementNo', 'contractTypeSelect', 'tenantNameAr'"
new_inputs = "const inputs = ['agreementNo', 'contractTypeSelect', 'tenantEntityType', 'tenantNameAr'"
if old_inputs in t:
    t = t.replace(old_inputs, new_inputs, 1)
    t = t.replace("'tenantPassport'", "'tenantCommercialRegNo','tenantCommercialRegExpiryDate','tenantCompanyExtraMobile','tenantCompanySignatoriesJson','tenantPassport'", 1)
    print('inputs array: ok')
else:
    print('inputs array: skip')

ab_import = "${r.type === 'tenant' ? `"
ab_import_new = "${(r.type === 'tenant' || r.type === 'company') ? `"
if ab_import in t:
    t = t.replace(ab_import, ab_import_new, 1)
    print('addressBook import btn: ok')
else:
    print('addressBook import btn: skip')

# enterReservationMode clears
old_enter = """        set('tenantEmail', '');
        set('monthlyRent', '');"""
new_enter = """        set('tenantEmail', '');
        set('tenantEntityType', 'person');
        set('tenantCommercialRegNo', '');
        set('tenantCommercialRegExpiryDate', '');
        set('tenantCompanyExtraMobile', '');
        set('tenantCompanySignatoriesJson', '[]');
        try { syncTenantEntityFieldsFromType(); } catch (e) {}
        set('monthlyRent', '');"""
if old_enter in t:
    t = t.replace(old_enter, new_enter, 1)
    print('enterReservationMode: ok')
else:
    print('enterReservationMode: skip')

# tenancy lock ids
old_lock = """            'tenantAddressBookSelect'
        ];"""
new_lock = """            'tenantAddressBookSelect',
            'tenantEntityType',
            'tenantCommercialRegNo',
            'tenantCommercialRegExpiryDate',
            'tenantCompanyExtraMobile'
        ];"""
if old_lock in t:
    t = t.replace(old_lock, new_lock, 1)
    print('tenancy locks: ok')
else:
    print('tenancy locks: skip')

old_gap = """        if (action.type === 'newTenant') {
            openAddressBookWorkspace();
            openAddressBookEntryModal('add', -1);
            const typeSel = document.getElementById('abType');
            if (typeSel) typeSel.value = 'tenant';
            syncAddressBookFormRules();
        }"""
new_gap = """        if (action.type === 'newTenant') {
            openAddressBookWorkspace();
            openAddressBookEntryModal('add', -1);
            const typeSel = document.getElementById('abType');
            if (typeSel) typeSel.value = 'tenant';
            const fd = typeof getFormData === 'function' ? getFormData() : {};
            const es = document.getElementById('abEntityType');
            if (es) {
                es.value = toStr(fd.tenantEntityType) === 'company' ? 'company' : 'person';
                try { syncAddressBookPersonCompanyShell(); } catch (e2) {}
            }
            syncAddressBookFormRules();
        }"""
if old_gap in t:
    t = t.replace(old_gap, new_gap, 1)
    print('data gap newTenant: ok')
else:
    print('data gap newTenant: skip')

inputs_fix = """'tenantEntityType', 'tenantNameAr', 'tenantNameEn', 'tenantId', 'tenantMobile', 'tenantPassport'"""
inputs_new = """'tenantEntityType', 'tenantNameAr', 'tenantNameEn', 'tenantCommercialRegNo','tenantCommercialRegExpiryDate','tenantCompanyExtraMobile','tenantCompanySignatoriesJson','tenantId', 'tenantMobile', 'tenantPassport'"""
if inputs_fix in t:
    t = t.replace(inputs_fix, inputs_new, 1)
    print('inputs fix: ok')

if t != text:
    f.write_text(t, encoding='utf-8')
    print('WROTE')


def patch_res_print():
    f = next(Path(".").glob("عقد*.html"))
    t = f.read_text(encoding="utf-8")
    o = """        const tenantEntry = findTenantAddressBookEntryForReservation(r, d) || getEmptyAddressBookEntry();
        const logoSrc = getPrintLogoSrc();"""
    n = """        const tenantEntry = findTenantAddressBookEntryForReservation(r, d) || getEmptyAddressBookEntry();
        const isCoLessee = toStr(d.tenantEntityType) === 'company' || toStr(tenantEntry.type) === 'company';
        let coSignatoriesPrintHtml = '';
        try {
            const arr = JSON.parse(toStr(d.tenantCompanySignatoriesJson) || '[]');
            if (Array.isArray(arr) && arr.length) coSignatoriesPrintHtml = formatCompanySignatoriesListHtml({ signatories: arr });
            else if (toStr(tenantEntry.type) === 'company') coSignatoriesPrintHtml = formatCompanySignatoriesListHtml(tenantEntry);
        } catch (e) {
            coSignatoriesPrintHtml = toStr(tenantEntry.type) === 'company' ? formatCompanySignatoriesListHtml(tenantEntry) : '';
        }
        const logoSrc = getPrintLogoSrc();"""
    if o not in t:
        print("res print inject: skip")
        return
    t = t.replace(o, n, 1)
    print("res print inject: ok")
    tenant_tbl = """            <div class="section-header">بيانات المستأجر / Tenant Details</div>
            <table class="info-table">
                ${infoRow('اسم المستأجر','Tenant Name',toStr(tenantEntry.name) || toStr(d.tenantNameAr))}
                ${infoRow('اسم المستأجر بالإنجليزية','Tenant Name (EN)',toStr(tenantEntry.nameEn) || toStr(d.tenantNameEn))}
                ${infoRow('الرقم المدني','Civil ID',toStr(tenantEntry.idNo) || toStr(d.tenantId))}
                ${infoRow('رقم الجوال','Mobile',toStr(tenantEntry.mobile) || toStr(d.tenantMobile))}
                ${infoRow('رقم إضافي','Extra number',toStr(tenantEntry.extraMobile))}
                ${infoRow('الجنسية','Nationality',toStr(tenantEntry.nationality))}
                ${infoRow('تاريخ انتهاء البطاقة','ID expiry date',toStr(tenantEntry.idExpiryDate))}
                ${infoRow('رقم الجواز','Passport number',toStr(tenantEntry.passport) || toStr(d.tenantPassport))}
                ${infoRow('تاريخ انتهاء الجواز','Passport expiry date',toStr(tenantEntry.passportExpiryDate))}
                ${infoRow('البريد الإلكتروني','Email',toStr(tenantEntry.email) || toStr(d.tenantEmail))}
            </table>"""
    new_tbl = """            <div class="section-header">${isCoLessee ? `${t('بيانات شركة مستأجرة','Lessee company')} / Lessee company` : `بيانات المستأجر / Tenant Details`}</div>
            <table class="info-table">
            ${isCoLessee ? `
                ${infoRow(t('اسم الشركة','Company name'),'Company name',toStr(tenantEntry.name) || toStr(d.tenantNameAr))}
                ${infoRow(t('اسم الشركة بالإنجليزية','Company name (EN)'),'Company name (EN)',toStr(tenantEntry.nameEn) || toStr(d.tenantNameEn))}
                ${infoRow(t('السجل التجاري','CR no.'),'CR no.',toStr(tenantEntry.commercialRegNo) || toStr(d.tenantCommercialRegNo))}
                ${infoRow(t('انتهاء السجل التجاري','CR expiry'),'CR expiry',toStr(tenantEntry.commercialRegExpiryDate) || toStr(d.tenantCommercialRegExpiryDate))}
                ${infoRow(t('الهاتف الرئيسي','Primary phone'),'Primary phone',toStr(tenantEntry.mobile) || toStr(d.tenantMobile))}
                ${infoRow(t('هاتف إضافي','Extra phone'),'Extra phone',toStr(tenantEntry.extraMobile) || toStr(d.tenantCompanyExtraMobile))}
                ${infoRow(t('البريد الإلكتروني','Email'),'Email',toStr(tenantEntry.email) || toStr(d.tenantEmail))}
            ` : `
                ${infoRow('اسم المستأجر','Tenant Name',toStr(tenantEntry.name) || toStr(d.tenantNameAr))}
                ${infoRow('اسم المستأجر بالإنجليزية','Tenant Name (EN)',toStr(tenantEntry.nameEn) || toStr(d.tenantNameEn))}
                ${infoRow('الرقم المدني','Civil ID',toStr(tenantEntry.idNo) || toStr(d.tenantId))}
                ${infoRow('رقم الجوال','Mobile',toStr(tenantEntry.mobile) || toStr(d.tenantMobile))}
                ${infoRow('رقم إضافي','Extra number',toStr(tenantEntry.extraMobile))}
                ${infoRow('الجنسية','Nationality',toStr(tenantEntry.nationality))}
                ${infoRow('تاريخ انتهاء البطاقة','ID expiry date',toStr(tenantEntry.idExpiryDate))}
                ${infoRow('رقم الجواز','Passport number',toStr(tenantEntry.passport) || toStr(d.tenantPassport))}
                ${infoRow('تاريخ انتهاء الجواز','Passport expiry date',toStr(tenantEntry.passportExpiryDate))}
                ${infoRow('البريد الإلكتروني','Email',toStr(tenantEntry.email) || toStr(d.tenantEmail))}
            `}
            </table>
            ${isCoLessee && coSignatoriesPrintHtml ? `<div style="margin-top:10px;padding:8px 10px;border:1px solid #2a2a2a;border-radius:4px;background:#fcf7f8"><div style="font-weight:800;margin-bottom:6px;color:#4D0014">${t('المفوضون بالتوقيع','Signatories')}</div>${coSignatoriesPrintHtml}</div>` : ''}"""
    if tenant_tbl not in t:
        print("res print table: skip")
    else:
        t = t.replace(tenant_tbl, new_tbl, 1)
        print("res print table: ok")
    f.write_text(t, encoding="utf-8")


patch_res_print()
