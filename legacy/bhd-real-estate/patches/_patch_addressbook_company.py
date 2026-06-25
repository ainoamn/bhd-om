# -*- coding: utf-8 -*-
"""Insert company contact type into address book modal + JS updates."""
import pathlib

p = next(pathlib.Path(__file__).parent.glob("عقد*.html"))
text = p.read_text(encoding="utf-8")

# --- 1) Wrap person form + add company section before addressBookRelatedInfo ---
before = """        <div class="details-body">
            <div class="row-2cols">"""

after_open = """        <div class="details-body">
            <div class="input-group" style="grid-column:1/-1">
                <label data-ar="نوع جهة الاتصال" data-en="Contact entity type">نوع جهة الاتصال / Contact entity type</label>
                <select id="abEntityType" onchange="syncAddressBookPersonCompanyShell()">
                    <option value="person" data-ar="شخص" data-en="Person">شخص / Person</option>
                    <option value="company" data-ar="شركة" data-en="Company">شركة / Company</option>
                </select>
            </div>
            <div id="abPersonSection" class="row-2cols">"""

if before not in text:
    raise SystemExit("details-body row-2cols not found")
text = text.replace(before, after_open, 1)

marker = """            </div>
            <div id="addressBookRelatedInfo" class="addressbook-meta" style="margin:8px 0 10px"></div>"""

company_block = """            </div>
            <div id="abCompanySection" class="row-2cols" hidden style="display:none">
                <div class="input-group" style="grid-column:1/-1">
                    <h6 style="margin:0 0 6px;font-size:13px" data-ar="بيانات الشركة" data-en="Company details">بيانات الشركة / Company details</h6>
                </div>
                <div class="input-group">
                    <label data-ar="اسم الشركة" data-en="Company name">اسم الشركة / Company name</label>
                    <input type="text" id="abCoName" autocomplete="organization">
                </div>
                <div class="input-group">
                    <label data-ar="رقم السجل التجاري" data-en="Commercial registration (CR) no.">رقم السجل التجاري / Commercial registration (CR) no.</label>
                    <input type="text" id="abCoCrNo">
                </div>
                <div class="input-group">
                    <label data-ar="تاريخ انتهاء السجل التجاري" data-en="CR expiry date">تاريخ انتهاء السجل التجاري / CR expiry date</label>
                    <input type="date" id="abCoCrExpiry">
                </div>
                <div class="input-group" style="grid-column:1/-1">
                    <label data-ar="مرفق عقد الإيجار" data-en="Lease contract attachment">مرفق عقد الإيجار / Lease contract attachment</label>
                    <input type="file" id="abCoLeaseFile" accept="image/*,application/pdf">
                    <button type="button" class="mini-btn" style="margin-top:6px" onclick="openAddressBookCompanyAttachment('lease')" data-ar="فتح المرفق" data-en="Open attachment">فتح المرفق / Open attachment</button>
                </div>
                <div class="input-group">
                    <label data-ar="هاتف الشركة" data-en="Company phone">هاتف الشركة / Company phone</label>
                    <input type="text" id="abCoMobile">
                </div>
                <div class="input-group">
                    <label data-ar="هاتف بديل" data-en="Alternate phone">هاتف بديل / Alternate phone</label>
                    <input type="text" id="abCoExtraMobile">
                </div>
                <div class="input-group" style="grid-column:1/-1">
                    <label data-ar="البريد الإلكتروني" data-en="Email">البريد الإلكتروني / Email</label>
                    <input type="text" id="abCoEmail" autocomplete="email">
                </div>
                <div class="input-group" style="grid-column:1/-1">
                    <h6 style="margin:8px 0 6px;font-size:13px" data-ar="المفوض بالتوقيع" data-en="Authorized signatory">المفوض بالتوقيع / Authorized signatory</h6>
                </div>
                <div class="input-group">
                    <label data-ar="اسم المفوض بالتوقيع" data-en="Signatory name">اسم المفوض بالتوقيع / Signatory name</label>
                    <input type="text" id="abSigName">
                </div>
                <div class="input-group">
                    <label data-ar="جنسية المفوض" data-en="Signatory nationality">جنسية المفوض / Signatory nationality</label>
                    <select id="abSigNationality" onchange="syncAddressBookSignatoryRules()"></select>
                </div>
                <div id="abSigWrapOmani" class="row-2cols" style="display:contents">
                    <div class="input-group">
                        <label data-ar="الرقم المدني (المفوض)" data-en="Signatory civil ID no.">الرقم المدني (المفوض) / Signatory civil ID no.</label>
                        <input type="text" id="abSigIdNo">
                    </div>
                    <div class="input-group">
                        <label data-ar="انتهاء البطاقة (المفوض)" data-en="Signatory ID expiry">انتهاء البطاقة (المفوض) / Signatory ID expiry</label>
                        <input type="date" id="abSigIdExpiry">
                    </div>
                    <div class="input-group">
                        <label data-ar="هاتف المفوض" data-en="Signatory phone">هاتف المفوض / Signatory phone</label>
                        <input type="text" id="abSigMobile">
                    </div>
                    <div class="input-group" style="grid-column:1/-1">
                        <label data-ar="مرفق نسخة من بطاقة المفوض" data-en="Signatory ID attachment">مرفق نسخة من بطاقة المفوض / Signatory ID attachment</label>
                        <input type="file" id="abSigIdFile" accept="image/*,application/pdf">
                        <button type="button" class="mini-btn" style="margin-top:6px" onclick="openAddressBookCompanyAttachment('sigId')" data-ar="فتح المرفق" data-en="Open attachment">فتح المرفق / Open attachment</button>
                    </div>
                </div>
                <div id="abSigWrapForeign" style="display:none;grid-column:1/-1" class="row-2cols">
                    <div class="input-group">
                        <label data-ar="جواز السفر (المفوض)" data-en="Signatory passport no.">جواز السفر (المفوض) / Signatory passport no.</label>
                        <input type="text" id="abSigPassport">
                    </div>
                    <div class="input-group">
                        <label data-ar="انتهاء الجواز (المفوض)" data-en="Signatory passport expiry">انتهاء الجواز (المفوض) / Signatory passport expiry</label>
                        <input type="date" id="abSigPassportExpiry">
                    </div>
                    <div class="input-group" style="grid-column:1/-1">
                        <label data-ar="مرفق جواز المفوض" data-en="Signatory passport attachment">مرفق جواز المفوض / Signatory passport attachment</label>
                        <input type="file" id="abSigPassportFile" accept="image/*,application/pdf">
                        <button type="button" class="mini-btn" style="margin-top:6px" onclick="openAddressBookCompanyAttachment('sigPass')" data-ar="فتح المرفق" data-en="Open attachment">فتح المرفق / Open attachment</button>
                    </div>
                </div>
                <div class="input-group">
                    <label data-ar="المبنى" data-en="Building">المبنى / Building</label>
                    <input type="text" id="abCoBuilding">
                </div>
                <div class="input-group">
                    <label data-ar="الوحدة" data-en="Unit">الوحدة / Unit</label>
                    <input type="text" id="abCoUnit">
                </div>
                <div class="input-group">
                    <label data-ar="المصدر" data-en="Source">المصدر / Source</label>
                    <input type="text" id="abCoSource">
                </div>
            </div>
            <div id="addressBookRelatedInfo" class="addressbook-meta" style="margin:8px 0 10px"></div>"""

if marker not in text:
    raise SystemExit("addressBookRelatedInfo marker missing")
text = text.replace(marker, company_block, 1)


# --- 2) Add addressBookEntryKey after addressBookRowKey ---
anchor_key = """    function addressBookRowKey(type, name, mobile, idNo) {
        return [toStr(type).toLowerCase(), toStr(name).toLowerCase(), toStr(mobile), toStr(idNo)].join('|');
    }

    function isOmaniNationality(v) {"""

replacement_key = """    function addressBookRowKey(type, name, mobile, idNo) {
        return [toStr(type).toLowerCase(), toStr(name).toLowerCase(), toStr(mobile), toStr(idNo)].join('|');
    }

    function addressBookEntryKey(r) {
        if (!r) return '';
        if (toStr(r.type).toLowerCase() === 'company') {
            return ['company', toStr(r.commercialRegNo).toLowerCase(), toStr(r.name).toLowerCase(), toStr(r.mobile)].join('|');
        }
        return addressBookRowKey(r.type, r.name, r.mobile, r.idNo);
    }

    function isOmaniNationality(v) {"""

if anchor_key not in text:
    raise SystemExit("addressBookRowKey anchor missing")
text = text.replace(anchor_key, replacement_key, 1)


# --- 3) getAddressBookIssues: branch for company at start ---
old_issues_start = """    function getAddressBookIssues(entry) {
        const issues = [];
        const requireField = (label, value) => {
            if (!toStr(value)) issues.push(`${label}: ${t('ناقص', 'Missing')}`);
        };
        const checkDate = (label, value, { required = false } = {}) => {"""

new_issues_start = """    function getAddressBookIssues(entry) {
        const issues = [];
        if (toStr(entry?.type) === 'company') {
            return getAddressBookCompanyIssues(entry);
        }
        const requireField = (label, value) => {
            if (!toStr(value)) issues.push(`${label}: ${t('ناقص', 'Missing')}`);
        };
        const checkDate = (label, value, { required = false } = {}) => {"""

if old_issues_start not in text:
    raise SystemExit("getAddressBookIssues start missing")
text = text.replace(old_issues_start, new_issues_start, 1)

# insert getAddressBookCompanyIssues before getAddressBookIssues - actually we call it from inside - need function defined before
insert_before = """    function getAddressBookIssues(entry) {
        const issues = [];
        if (toStr(entry?.type) === 'company') {
            return getAddressBookCompanyIssues(entry);
        }"""

helper_fn = """    function getAddressBookCompanyIssues(entry) {
        const issues = [];
        const requireField = (label, value) => {
            if (!toStr(value)) issues.push(`${label}: ${t('ناقص', 'Missing')}`);
        };
        const checkDate = (label, value, { required = true } = {}) => {
            if (!toStr(value)) {
                if (required) issues.push(`${label}: ${t('تاريخ غير مدخل', 'Missing date')}`);
                return;
            }
            const d = daysUntil(value);
            if (d === null) {
                if (required) issues.push(`${label}: ${t('تاريخ غير صالح', 'Invalid date')}`);
                return;
            }
            if (d < 0) issues.push(`${label}: ${t('منتهي', 'Expired')}`);
            else if (d <= 30) issues.push(`${label}: ${t(`ينتهي خلال ${d} يوم`, `Expires in ${d} days`)}`);
        };
        requireField(t('اسم الشركة', 'Company name'), entry?.name);
        requireField(t('رقم السجل التجاري', 'CR no.'), entry?.commercialRegNo);
        checkDate(t('انتهاء السجل التجاري', 'CR expiry'), entry?.commercialRegExpiryDate);
        if (!entry?.leaseContractAttachment?.dataUrl) {
            issues.push(`${t('مرفق عقد الإيجار', 'Lease contract attachment')}: ${t('ناقص', 'Missing')}`);
        }
        requireField(t('هاتف الشركة', 'Company phone'), entry?.mobile);
        requireField(t('البريد الإلكتروني', 'Email'), entry?.email);
        requireField(t('اسم المفوض', 'Signatory name'), entry?.signatoryName);
        const sigNat = toStr(entry?.signatoryNationality);
        const sigOmani = isOmaniNationality(sigNat);
        if (sigOmani) {
            requireField(t('الرقم المدني (المفوض)', 'Signatory civil ID'), entry?.signatoryIdNo);
            checkDate(t('بطاقة المفوض', 'Signatory ID'), entry?.signatoryIdExpiryDate);
            requireField(t('هاتف المفوض', 'Signatory phone'), entry?.signatoryMobile);
            if (!entry?.signatoryIdAttachment?.dataUrl) {
                issues.push(`${t('مرفق بطاقة المفوض', 'Signatory ID attachment')}: ${t('ناقص', 'Missing')}`);
            }
        } else {
            requireField(t('جواز المفوض', 'Signatory passport'), entry?.signatoryPassport);
            checkDate(t('جواز المفوض', 'Signatory passport'), entry?.signatoryPassportExpiryDate);
            if (!entry?.signatoryPassportAttachment?.dataUrl) {
                issues.push(`${t('مرفق جواز المفوض', 'Signatory passport attachment')}: ${t('ناقص', 'Missing')}`);
            }
        }
        return issues;
    }

"""

if insert_before not in text:
    raise SystemExit("insert_before getAddressBookIssues not found")
text = text.replace(insert_before, helper_fn + insert_before, 1)


# --- 4) refreshAddressBookFromSystem: use addressBookEntryKey ---
text = text.replace(
    "oldMap.set(addressBookRowKey(r.type, r.name, r.mobile, r.idNo), r);",
    "oldMap.set(addressBookEntryKey(r), r);",
    1,
)
text = text.replace(
    "const old = oldMap.get(addressBookRowKey(r.type, r.name, r.mobile, r.idNo)) || {};",
    "const old = oldMap.get(addressBookEntryKey(r)) || {};",
    1,
)
text = text.replace(
    "const key = addressBookRowKey(r.type, r.name, r.mobile, r.idNo);\n            if (!fromSystem.some((x) => addressBookRowKey(x.type, x.name, x.mobile, x.idNo) === key)",
    "const key = addressBookEntryKey(r);\n            if (!fromSystem.some((x) => addressBookEntryKey(x) === key)",
    1,
)


# --- 5) collectAddressBookRowsFromSystem unique key ---
text = text.replace(
    "const key = addressBookRowKey(r.type, r.name, r.mobile, r.idNo);\n            if (!toStr(r.name)) return;",
    "const key = addressBookEntryKey(r);\n            if (!toStr(r.name)) return;",
    1,
)


# --- 6) ensureAddressBookCountryOptions - also fill abSigNationality ---
old_ensure = """    function ensureAddressBookCountryOptions() {
        const sel = document.getElementById('abNationality');
        if (!sel || sel.options.length) return;
        sel.innerHTML = buildCountryOptions().map((c) => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('');
    }"""

new_ensure = """    function ensureAddressBookCountryOptions() {
        const opts = buildCountryOptions().map((c) => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('');
        const sel = document.getElementById('abNationality');
        if (sel && !sel.options.length) {
            sel.innerHTML = opts;
        }
        const sigSel = document.getElementById('abSigNationality');
        if (sigSel && !sigSel.options.length) {
            sigSel.innerHTML = opts;
        }
    }"""

if old_ensure not in text:
    raise SystemExit("ensureAddressBookCountryOptions not found")
text = text.replace(old_ensure, new_ensure, 1)


p.write_text(text, encoding="utf-8")
print("PART1 OK")
