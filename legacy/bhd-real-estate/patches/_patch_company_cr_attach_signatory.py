# -*- coding: utf-8 -*-
"""CR attachment under expiry (not lease); separate lease file; foreign signatory needs ID+passport."""
import pathlib

p = next(pathlib.Path(__file__).parent.glob("عقد*.html"))
text = p.read_text(encoding="utf-8")

old_html = """                <div class="input-group" style="grid-column:1/-1">
                    <label data-ar="مرفق عقد الإيجار" data-en="Lease contract attachment">مرفق عقد الإيجار / Lease contract attachment</label>
                    <input type="file" id="abCoLeaseFile" accept="image/*,application/pdf">
                    <button type="button" class="mini-btn" style="margin-top:6px" onclick="openAddressBookCompanyAttachment('lease')" data-ar="فتح المرفق" data-en="Open attachment">فتح المرفق / Open attachment</button>
                </div>
                <div class="input-group">
                    <label data-ar="هاتف الشركة" data-en="Company phone">هاتف الشركة / Company phone</label>"""

new_html = """                <div class="input-group" style="grid-column:1/-1">
                    <label data-ar="مرفق السجل التجاري" data-en="Commercial registration (CR) certificate">مرفق السجل التجاري / Commercial registration (CR) certificate</label>
                    <input type="file" id="abCoCrFile" accept="image/*,application/pdf">
                    <button type="button" class="mini-btn" style="margin-top:6px" onclick="openAddressBookCompanyAttachment('crCert')" data-ar="فتح المرفق" data-en="Open attachment">فتح المرفق / Open attachment</button>
                </div>
                <div class="input-group">
                    <label data-ar="هاتف الشركة" data-en="Company phone">هاتف الشركة / Company phone</label>"""

if old_html not in text:
    raise SystemExit("HTML block (lease under CR) not found")

text = text.replace(old_html, new_html, 1)

old_email_block = """                <div class="input-group" style="grid-column:1/-1">
                    <label data-ar="البريد الإلكتروني" data-en="Email">البريد الإلكتروني / Email</label>
                    <input type="text" id="abCoEmail" autocomplete="email">
                </div>
                <div class="input-group" style="grid-column:1/-1">
                    <h6 style="margin:8px 0 6px;font-size:13px" data-ar="المفوض بالتوقيع" data-en="Authorized signatory">المفوض بالتوقيع / Authorized signatory</h6>
                </div>"""

new_email_block = """                <div class="input-group" style="grid-column:1/-1">
                    <label data-ar="البريد الإلكتروني" data-en="Email">البريد الإلكتروني / Email</label>
                    <input type="text" id="abCoEmail" autocomplete="email">
                </div>
                <div class="input-group" style="grid-column:1/-1">
                    <label data-ar="مرفق عقد الإيجار" data-en="Lease contract attachment">مرفق عقد الإيجار / Lease contract attachment</label>
                    <input type="file" id="abCoLeaseFile" accept="image/*,application/pdf">
                    <button type="button" class="mini-btn" style="margin-top:6px" onclick="openAddressBookCompanyAttachment('lease')" data-ar="فتح المرفق" data-en="Open attachment">فتح المرفق / Open attachment</button>
                </div>
                <div class="input-group" style="grid-column:1/-1">
                    <h6 style="margin:8px 0 6px;font-size:13px" data-ar="المفوض بالتوقيع" data-en="Authorized signatory">المفوض بالتوقيع / Authorized signatory</h6>
                </div>"""

if old_email_block not in text:
    raise SystemExit("email block insertion point not found")

text = text.replace(old_email_block, new_email_block, 1)

old_issues = """        checkDate(t('انتهاء السجل التجاري', 'CR expiry'), entry?.commercialRegExpiryDate);
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
"""

new_issues = """        checkDate(t('انتهاء السجل التجاري', 'CR expiry'), entry?.commercialRegExpiryDate);
        const attSchema = Number(entry?.companyAttachmentSchema) || 1;
        let crOk;
        let leaseMissing;
        if (attSchema >= 2) {
            crOk = !!entry?.commercialRegAttachment?.dataUrl;
            leaseMissing = !entry?.leaseContractAttachment?.dataUrl;
        } else {
            crOk = !!(entry?.commercialRegAttachment?.dataUrl || entry?.leaseContractAttachment?.dataUrl);
            const legacySingleFile = !entry?.commercialRegAttachment?.dataUrl && !!entry?.leaseContractAttachment?.dataUrl;
            leaseMissing = !entry?.leaseContractAttachment?.dataUrl || legacySingleFile;
        }
        if (!crOk) {
            issues.push(`${t('مرفق السجل التجاري', 'CR certificate attachment')}: ${t('ناقص', 'Missing')}`);
        }
        if (leaseMissing) {
            issues.push(`${t('مرفق عقد الإيجار', 'Lease contract attachment')}: ${t('ناقص', 'Missing')}`);
        }
        requireField(t('هاتف الشركة', 'Company phone'), entry?.mobile);
        requireField(t('البريد الإلكتروني', 'Email'), entry?.email);
        requireField(t('اسم المفوض', 'Signatory name'), entry?.signatoryName);
        const sigNat = toStr(entry?.signatoryNationality);
        const sigOmani = isOmaniNationality(sigNat);
        const requireSigCivil = () => {
            requireField(t('الرقم المدني (المفوض)', 'Signatory civil ID'), entry?.signatoryIdNo);
            checkDate(t('بطاقة المفوض', 'Signatory ID'), entry?.signatoryIdExpiryDate);
            requireField(t('هاتف المفوض', 'Signatory phone'), entry?.signatoryMobile);
            if (!entry?.signatoryIdAttachment?.dataUrl) {
                issues.push(`${t('مرفق بطاقة المفوض', 'Signatory ID attachment')}: ${t('ناقص', 'Missing')}`);
            }
        };
        const requireSigPassport = () => {
            requireField(t('جواز المفوض', 'Signatory passport'), entry?.signatoryPassport);
            checkDate(t('جواز المفوض (المفوض)', 'Signatory passport'), entry?.signatoryPassportExpiryDate);
            if (!entry?.signatoryPassportAttachment?.dataUrl) {
                issues.push(`${t('مرفق جواز المفوض', 'Signatory passport attachment')}: ${t('ناقص', 'Missing')}`);
            }
        };
        if (sigOmani) {
            requireSigCivil();
        } else {
            requireSigCivil();
            requireSigPassport();
        }
        return issues;
"""

if old_issues not in text:
    raise SystemExit("getAddressBookCompanyIssues block not found")

text = text.replace(old_issues, new_issues, 1)
old_sync = """    function syncAddressBookSignatoryRules() {
        const nat = toStr(document.getElementById('abSigNationality')?.value);
        const omani = isOmaniNationality(nat);
        const wO = document.getElementById('abSigWrapOmani');
        const wF = document.getElementById('abSigWrapForeign');
        if (wO) {
            wO.hidden = !omani;
            wO.style.display = omani ? 'contents' : 'none';
        }
        if (wF) {
            wF.hidden = omani;
            wF.style.display = omani ? 'none' : '';
        }
    }
"""

new_sync = """    function syncAddressBookSignatoryRules() {
        const nat = toStr(document.getElementById('abSigNationality')?.value);
        const omani = isOmaniNationality(nat);
        const wO = document.getElementById('abSigWrapOmani');
        const wF = document.getElementById('abSigWrapForeign');
        if (wO) {
            wO.hidden = false;
            wO.style.display = 'contents';
        }
        if (wF) {
            wF.hidden = omani;
            wF.style.display = omani ? 'none' : '';
        }
    }
"""

if old_sync not in text:
    raise SystemExit("syncAddressBookSignatoryRules not found")
text = text.replace(old_sync, new_sync, 1)

old_disabled = "'abCoName', 'abCoCrNo', 'abCoCrExpiry', 'abCoLeaseFile',"
new_disabled = "'abCoName', 'abCoCrNo', 'abCoCrExpiry', 'abCoCrFile', 'abCoLeaseFile',"
if old_disabled not in text:
    raise SystemExit("setAddressBookFormDisabled list not found")
text = text.replace(old_disabled, new_disabled, 1)

# fillAddressBookForm: company branch — add abCoCrFile clear + migration normalize
old_fill_company = """        if (isCompany) {
            set('abCoName', toStr(e.name));
            set('abCoCrNo', toStr(e.commercialRegNo));
            set('abCoCrExpiry', toStr(e.commercialRegExpiryDate));
            set('abCoMobile', toStr(e.mobile));
            set('abCoExtraMobile', toStr(e.extraMobile));
            set('abCoEmail', toStr(e.email));
            set('abSigName', toStr(e.signatoryName));
            set('abSigNationality', toStr(e.signatoryNationality || 'عماني / Omani'));
            set('abSigIdNo', toStr(e.signatoryIdNo));
            set('abSigIdExpiry', toStr(e.signatoryIdExpiryDate));
            set('abSigMobile', toStr(e.signatoryMobile));
            set('abSigPassport', toStr(e.signatoryPassport));
            set('abSigPassportExpiry', toStr(e.signatoryPassportExpiryDate));
            set('abCoBuilding', toStr(e.building));
            set('abCoUnit', toStr(e.unit));
            set('abCoSource', toStr(e.source || 'manual'));
            set('abCoLeaseFile', '');
            set('abSigIdFile', '');
            set('abSigPassportFile', '');
        } else {"""

new_fill_company = """        if (isCompany) {
            set('abCoName', toStr(e.name));
            set('abCoCrNo', toStr(e.commercialRegNo));
            set('abCoCrExpiry', toStr(e.commercialRegExpiryDate));
            set('abCoMobile', toStr(e.mobile));
            set('abCoExtraMobile', toStr(e.extraMobile));
            set('abCoEmail', toStr(e.email));
            set('abSigName', toStr(e.signatoryName));
            set('abSigNationality', toStr(e.signatoryNationality || 'عماني / Omani'));
            set('abSigIdNo', toStr(e.signatoryIdNo));
            set('abSigIdExpiry', toStr(e.signatoryIdExpiryDate));
            set('abSigMobile', toStr(e.signatoryMobile));
            set('abSigPassport', toStr(e.signatoryPassport));
            set('abSigPassportExpiry', toStr(e.signatoryPassportExpiryDate));
            set('abCoBuilding', toStr(e.building));
            set('abCoUnit', toStr(e.unit));
            set('abCoSource', toStr(e.source || 'manual'));
            set('abCoCrFile', '');
            set('abCoLeaseFile', '');
            set('abSigIdFile', '');
            set('abSigPassportFile', '');
        } else {"""

if old_fill_company not in text:
    raise SystemExit("fillAddressBookForm company branch not found")
text = text.replace(old_fill_company, new_fill_company, 1)

old_save_co = """        if (isCompanyForm) {
            const leaseAtt = await readAddressBookAttachment('abCoLeaseFile');
            const sigIdAtt = await readAddressBookAttachment('abSigIdFile');
            const sigPassAtt = await readAddressBookAttachment('abSigPassportFile');
            const entry = {
                type: 'company',
                name: read('abCoName'),
                commercialRegNo: read('abCoCrNo'),
                commercialRegExpiryDate: read('abCoCrExpiry'),
                leaseContractAttachment: leaseAtt || oldEntry.leaseContractAttachment || null,
"""

new_save_co = """        if (isCompanyForm) {
            const crAtt = await readAddressBookAttachment('abCoCrFile');
            const leaseAtt = await readAddressBookAttachment('abCoLeaseFile');
            const sigIdAtt = await readAddressBookAttachment('abSigIdFile');
            const sigPassAtt = await readAddressBookAttachment('abSigPassportFile');
            const entry = {
                type: 'company',
                companyAttachmentSchema: 2,
                name: read('abCoName'),
                commercialRegNo: read('abCoCrNo'),
                commercialRegExpiryDate: read('abCoCrExpiry'),
                commercialRegAttachment: crAtt || oldEntry.commercialRegAttachment || null,
                leaseContractAttachment: leaseAtt || oldEntry.leaseContractAttachment || null,
"""

if old_save_co not in text:
    raise SystemExit("saveAddressBookEntry company block not found")
text = text.replace(old_save_co, new_save_co, 1)

old_open_map = """        const map = {
            lease: { att: entry.leaseContractAttachment, label: { ar: 'عقد الإيجار', en: 'Lease contract' } },
            sigId: { att: entry.signatoryIdAttachment, label: { ar: 'بطاقة المفوض', en: 'Signatory ID' } },
            sigPass: { att: entry.signatoryPassportAttachment, label: { ar: 'جواز المفوض', en: 'Signatory passport' } }
        };
"""

new_open_map = """        const map = {
            crCert: { att: entry.commercialRegAttachment || entry.leaseContractAttachment, label: { ar: 'السجل التجاري', en: 'Commercial registration (CR)' } },
            lease: { att: entry.leaseContractAttachment, label: { ar: 'عقد الإيجار', en: 'Lease contract' } },
            sigId: { att: entry.signatoryIdAttachment, label: { ar: 'بطاقة المفوض', en: 'Signatory ID' } },
            sigPass: { att: entry.signatoryPassportAttachment, label: { ar: 'جواز المفوض', en: 'Signatory passport' } }
        };
"""

if old_open_map not in text:
    raise SystemExit("openAddressBookCompanyAttachment map not found")
text = text.replace(old_open_map, new_open_map, 1)

old_merge = """                commercialRegNo: toStr(old.commercialRegNo || r.commercialRegNo),
                commercialRegExpiryDate: toStr(old.commercialRegExpiryDate || r.commercialRegExpiryDate),
                leaseContractAttachment: old.leaseContractAttachment || r.leaseContractAttachment || null,
"""

new_merge = """                commercialRegNo: toStr(old.commercialRegNo || r.commercialRegNo),
                commercialRegExpiryDate: toStr(old.commercialRegExpiryDate || r.commercialRegExpiryDate),
                companyAttachmentSchema: Number(old.companyAttachmentSchema || r.companyAttachmentSchema) || 1,
                commercialRegAttachment: old.commercialRegAttachment || r.commercialRegAttachment || null,
                leaseContractAttachment: old.leaseContractAttachment || r.leaseContractAttachment || null,
"""

if old_merge not in text:
    raise SystemExit("merge block not found")
text = text.replace(old_merge, new_merge, 1)

old_import = """                                commercialRegNo: toStr(x.commercialRegNo),
                                commercialRegExpiryDate: toStr(x.commercialRegExpiryDate),
                                leaseContractAttachment: x.leaseContractAttachment || null,
"""

new_import = """                                companyAttachmentSchema: Number(x.companyAttachmentSchema) || 1,
                                commercialRegNo: toStr(x.commercialRegNo),
                                commercialRegExpiryDate: toStr(x.commercialRegExpiryDate),
                                commercialRegAttachment: x.commercialRegAttachment || null,
                                leaseContractAttachment: x.leaseContractAttachment || null,
"""

if old_import not in text:
    raise SystemExit("import company block not found")
text = text.replace(old_import, new_import, 1)

p.write_text(text, encoding="utf-8")
print("OK: CR attach, lease separate, signatory rules, migration, save/import/merge/open")