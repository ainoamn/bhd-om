# -*- coding: utf-8 -*-
"""Part 2: company address book — form save, table, filter, print, import, merge."""
import pathlib

p = next(pathlib.Path(__file__).parent.glob("عقد*.html"))
text = p.read_text(encoding="utf-8")
orig = text

def replace_once(before, after, label):
    global text
    if before not in text:
        raise SystemExit(f"MISSING [{label}]: {(before[:120] + '...')!r}")
    text = text.replace(before, after, 1)


OLD_RENDER = r"""    function renderAddressBookTable() {
        const tbody = document.getElementById('addressBookTableBody');
        if (!tbody) return;
        const rows = getAddressBookFilteredRows();
        tbody.innerHTML = rows.map((r) => `
            <tr>
                <td style="white-space:normal;line-height:1.5">
                    <div><span class="addressbook-tag">${r.type === 'owner' ? 'مالك / Owner' : 'مستأجر / Tenant'}</span></div>
                    <div style="margin-top:4px;font-weight:700">${escHtml(r.name || '')}</div>
                    <div style="font-size:11px;color:#5c6f7b">${escHtml(r.nationality || '-')}</div>
                    <div style="font-size:11px;color:#5c6f7b">ID: ${escHtml(r.idNo || '-')}</div>
                </td>
                <td style="white-space:normal;line-height:1.5">
                    <div>📱 ${escHtml(r.mobile || '-')}</div>
                    <div>📞 ${escHtml(r.extraMobile || '-')}</div>
                    <div style="font-size:11px;color:#5c6f7b">${escHtml(r.email || '-')}</div>
                </td>
                <td style="white-space:normal;line-height:1.5">
                    <div>${escHtml(r.building || '-')}</div>
                    <div style="font-size:11px;color:#5c6f7b">Unit: ${escHtml(r.unit || '-')}</div>
                </td>
                <td style="font-size:11px;color:${formatDocAlert(r) ? '#9b1c1c' : '#3b4b56'};line-height:1.45">${formatDocAlertLines(r)}</td>
                <td>
                    <div class="inline-actions">
                        <button type="button" class="mini-btn" onclick="openAddressBookEntryModal('view', ${addressBookEntries.indexOf(r)})">${t('فتح', 'Open')}</button>
                        <button type="button" class="mini-btn" onclick="openAddressBookEntryModal('edit', ${addressBookEntries.indexOf(r)})">${t('تعديل', 'Edit')}</button>
                        ${r.type === 'tenant' ? `<button type="button" class="mini-btn" onclick="applyAddressBookTenantToFormByName(${JSON.stringify(r.name).replace(/"/g, '&quot;')})">${t('استيراد للعقد', 'Import')}</button>` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
        const stats = document.getElementById('addressBookStats');
        if (stats) {
            const ownersCount = rows.filter((x) => x.type === 'owner').length;
            const tenantsCount = rows.filter((x) => x.type === 'tenant').length;
            stats.textContent = appUiLanguage === 'en'
                ? `Records total: ${rows.length} | Owners: ${ownersCount} | Tenants: ${tenantsCount}`
                : `إجمالي السجلات: ${rows.length} | ملاك: ${ownersCount} | مستأجرون: ${tenantsCount}`;
        }
"""

NEW_RENDER = r"""    function renderAddressBookTable() {
        const tbody = document.getElementById('addressBookTableBody');
        if (!tbody) return;
        const rows = getAddressBookFilteredRows();
        tbody.innerHTML = rows.map((r) => {
            const typeTag = r.type === 'owner'
                ? 'مالك / Owner'
                : r.type === 'company'
                    ? 'شركة / Company'
                    : 'مستأجر / Tenant';
            const contactCol = r.type === 'company'
                ? `
                <td style="white-space:normal;line-height:1.5">
                    <div><span class="addressbook-tag">${typeTag}</span></div>
                    <div style="margin-top:4px;font-weight:700">${escHtml(r.name || '')}</div>
                    <div style="font-size:11px;color:#5c6f7b">${t('س.ت.', 'CR')}: ${escHtml(r.commercialRegNo || '-')}</div>
                    <div style="font-size:11px;color:#5c6f7b">${t('المفوض', 'Signatory')}: ${escHtml(r.signatoryName || '-')}</div>
                </td>
                <td style="white-space:normal;line-height:1.5">
                    <div>📱 ${escHtml(r.mobile || '-')}</div>
                    <div>📞 ${escHtml(r.extraMobile || '-')}</div>
                    <div style="font-size:11px;color:#5c6f7b">${escHtml(r.email || '-')}</div>
                </td>`
                : `
                <td style="white-space:normal;line-height:1.5">
                    <div><span class="addressbook-tag">${typeTag}</span></div>
                    <div style="margin-top:4px;font-weight:700">${escHtml(r.name || '')}</div>
                    <div style="font-size:11px;color:#5c6f7b">${escHtml(r.nationality || '-')}</div>
                    <div style="font-size:11px;color:#5c6f7b">ID: ${escHtml(r.idNo || '-')}</div>
                </td>
                <td style="white-space:normal;line-height:1.5">
                    <div>📱 ${escHtml(r.mobile || '-')}</div>
                    <div>📞 ${escHtml(r.extraMobile || '-')}</div>
                    <div style="font-size:11px;color:#5c6f7b">${escHtml(r.email || '-')}</div>
                </td>`;
            const locCol = `
                <td style="white-space:normal;line-height:1.5">
                    <div>${escHtml(r.building || '-')}</div>
                    <div style="font-size:11px;color:#5c6f7b">Unit: ${escHtml(r.unit || '-')}</div>
                </td>`;
            return `
            <tr>
                ${contactCol}
                ${locCol}
                <td style="font-size:11px;color:${formatDocAlert(r) ? '#9b1c1c' : '#3b4b56'};line-height:1.45">${formatDocAlertLines(r)}</td>
                <td>
                    <div class="inline-actions">
                        <button type="button" class="mini-btn" onclick="openAddressBookEntryModal('view', ${addressBookEntries.indexOf(r)})">${t('فتح', 'Open')}</button>
                        <button type="button" class="mini-btn" onclick="openAddressBookEntryModal('edit', ${addressBookEntries.indexOf(r)})">${t('تعديل', 'Edit')}</button>
                        ${r.type === 'tenant' ? `<button type="button" class="mini-btn" onclick="applyAddressBookTenantToFormByName(${JSON.stringify(r.name).replace(/"/g, '&quot;')})">${t('استيراد للعقد', 'Import')}</button>` : ''}
                    </div>
                </td>
            </tr>`;
        }).join('');
        const stats = document.getElementById('addressBookStats');
        if (stats) {
            const ownersCount = rows.filter((x) => x.type === 'owner').length;
            const tenantsCount = rows.filter((x) => x.type === 'tenant').length;
            const companiesCount = rows.filter((x) => x.type === 'company').length;
            stats.textContent = appUiLanguage === 'en'
                ? `Records total: ${rows.length} | Owners: ${ownersCount} | Tenants: ${tenantsCount} | Companies: ${companiesCount}`
                : `إجمالي السجلات: ${rows.length} | ملاك: ${ownersCount} | مستأجرون: ${tenantsCount} | شركات: ${companiesCount}`;
        }
"""

OLD_FILTER = r"""        const rows = addressBookEntries.filter((r) => {
            const contactText = `${r.type} ${r.name} ${r.nationality} ${r.idNo}`.toLowerCase();
            const commText = `${r.mobile} ${r.extraMobile} ${r.email}`.toLowerCase();
            const locText = `${r.building} ${r.unit}`.toLowerCase();
"""

NEW_FILTER = r"""        const rows = addressBookEntries.filter((r) => {
            const isCo = toStr(r.type) === 'company';
            const contactText = isCo
                ? `company ${r.name} ${r.commercialRegNo} ${r.signatoryName} ${r.signatoryNationality} ${r.signatoryIdNo}`.toLowerCase()
                : `${r.type} ${r.name} ${r.nationality} ${r.idNo}`.toLowerCase();
            const commText = isCo
                ? `${r.mobile} ${r.extraMobile} ${r.email} ${r.signatoryMobile}`.toLowerCase()
                : `${r.mobile} ${r.extraMobile} ${r.email}`.toLowerCase();
            const locText = `${r.building} ${r.unit}`.toLowerCase();
"""

OLD_PRINT = r"""        const tableRows = rows.map((r, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${escHtml(r.type === 'owner' ? t('مالك', 'Owner') : t('مستأجر', 'Tenant'))}</td>
                <td>${escHtml(r.name || '')}<br><small>${escHtml(r.nationality || '-')} | ID: ${escHtml(r.idNo || '-')}</small></td>
                <td>${escHtml(r.mobile || '-')}<br><small>${escHtml(r.extraMobile || '-')}</small><br><small>${escHtml(r.email || '-')}</small></td>
                <td>${escHtml(r.building || '-')}<br><small>${escHtml(r.unit || '-')}</small></td>
                <td>${getAddressBookIssues(r).length ? getAddressBookIssues(r).map((x) => `• ${escHtml(x)}`).join('<br>') : t('سليم', 'OK')}</td>
            </tr>
        `).join('');
"""

NEW_PRINT = r"""        const tableRows = rows.map((r, i) => {
            const typeLabel = r.type === 'owner' ? t('مالك', 'Owner')
                : r.type === 'company' ? t('شركة', 'Company') : t('مستأجر', 'Tenant');
            const detailCell = r.type === 'company'
                ? `${escHtml(r.name || '')}<br><small>${escHtml(toStr(r.commercialRegNo || '-'))} | ${escHtml(r.signatoryName || '-')}</small>`
                : `${escHtml(r.name || '')}<br><small>${escHtml(r.nationality || '-')} | ID: ${escHtml(r.idNo || '-')}</small>`;
            return `
            <tr>
                <td>${i + 1}</td>
                <td>${escHtml(typeLabel)}</td>
                <td>${detailCell}</td>
                <td>${escHtml(r.mobile || '-')}<br><small>${escHtml(r.extraMobile || '-')}</small><br><small>${escHtml(r.email || '-')}</small></td>
                <td>${escHtml(r.building || '-')}<br><small>${escHtml(r.unit || '-')}</small></td>
                <td>${getAddressBookIssues(r).length ? getAddressBookIssues(r).map((x) => `• ${escHtml(x)}`).join('<br>') : t('سليم', 'OK')}</td>
            </tr>`;
        }).join('');
"""

OLD_SET_DISABLED = r"""    function setAddressBookFormDisabled(disabled) {
        ['abType', 'abName', 'abNationality', 'abNameEn', 'abMobile', 'abExtraMobile', 'abIdNo', 'abIdExpiryDate', 'abEmail', 'abPassport', 'abPassportExpiryDate', 'abBuilding', 'abUnit', 'abSource', 'abIdAttachmentFile', 'abPassportAttachmentFile'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.disabled = !!disabled;
        });
"""

NEW_SET_DISABLED = r"""    function setAddressBookFormDisabled(disabled) {
        ['abEntityType', 'abType', 'abName', 'abNationality', 'abNameEn', 'abMobile', 'abExtraMobile', 'abIdNo', 'abIdExpiryDate', 'abEmail', 'abPassport', 'abPassportExpiryDate', 'abBuilding', 'abUnit', 'abSource', 'abIdAttachmentFile', 'abPassportAttachmentFile', 'abCoName', 'abCoCrNo', 'abCoCrExpiry', 'abCoLeaseFile', 'abCoMobile', 'abCoExtraMobile', 'abCoEmail', 'abSigName', 'abSigNationality', 'abSigIdNo', 'abSigIdExpiry', 'abSigMobile', 'abSigIdFile', 'abSigPassport', 'abSigPassportExpiry', 'abSigPassportFile', 'abCoBuilding', 'abCoUnit', 'abCoSource'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.disabled = !!disabled;
        });
"""

OLD_FILL = r"""    function fillAddressBookForm(entry) {
        const e = entry || getEmptyAddressBookEntry();
        ensureAddressBookCountryOptions();
        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value || '';
        };
        set('abType', toStr(e.type) === 'owner' ? 'owner' : 'tenant');
        set('abName', toStr(e.name));
        set('abNationality', toStr(e.nationality || 'عماني / Omani'));
        set('abNameEn', toStr(e.nameEn));
        set('abMobile', toStr(e.mobile));
        set('abExtraMobile', toStr(e.extraMobile));
        set('abIdNo', toStr(e.idNo));
        set('abIdExpiryDate', toStr(e.idExpiryDate));
        set('abEmail', toStr(e.email));
        set('abPassport', toStr(e.passport));
        set('abPassportExpiryDate', toStr(e.passportExpiryDate));
        set('abBuilding', toStr(e.building));
        set('abUnit', toStr(e.unit));
        set('abSource', toStr(e.source || 'manual'));
        set('abIdAttachmentFile', '');
        set('abPassportAttachmentFile', '');
        syncAddressBookFormRules();
    }
"""

NEW_FILL = r"""    function fillAddressBookForm(entry) {
        const e = entry || getEmptyAddressBookEntry();
        ensureAddressBookCountryOptions();
        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value || '';
        };
        const isCompany = toStr(e.type) === 'company';
        set('abEntityType', isCompany ? 'company' : 'person');
        if (isCompany) {
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
        } else {
            set('abType', toStr(e.type) === 'owner' ? 'owner' : 'tenant');
            set('abName', toStr(e.name));
            set('abNationality', toStr(e.nationality || 'عماني / Omani'));
            set('abNameEn', toStr(e.nameEn));
            set('abMobile', toStr(e.mobile));
            set('abExtraMobile', toStr(e.extraMobile));
            set('abIdNo', toStr(e.idNo));
            set('abIdExpiryDate', toStr(e.idExpiryDate));
            set('abEmail', toStr(e.email));
            set('abPassport', toStr(e.passport));
            set('abPassportExpiryDate', toStr(e.passportExpiryDate));
            set('abBuilding', toStr(e.building));
            set('abUnit', toStr(e.unit));
            set('abSource', toStr(e.source || 'manual'));
            set('abIdAttachmentFile', '');
            set('abPassportAttachmentFile', '');
            syncAddressBookFormRules();
        }
        syncAddressBookPersonCompanyShell();
        if (isCompany) syncAddressBookSignatoryRules();
    }
"""

OLD_RELATED = r"""        if (!entry) {
            host.textContent = '';
            return;
        }
        if (entry.type === 'owner') {
"""

NEW_RELATED = r"""        if (!entry) {
            host.textContent = '';
            return;
        }
        if (entry.type === 'company') {
            host.innerHTML = `<strong>${t('بيانات الشركة', 'Company details')}:</strong><br>${escHtml(t('السجل التجاري', 'CR'))}: ${escHtml(entry.commercialRegNo || '-')}` +
                ` | ${escHtml(t('المفوض', 'Signatory'))}: ${escHtml(entry.signatoryName || '-')}`;
            return;
        }
        if (entry.type === 'owner') {
"""

OLD_OPEN_PB = r"""    function openAddressBookAttachment(kind) {
        const idx = addressBookEditorState.index;
        const entry = idx >= 0 ? addressBookEntries[idx] : null;
        if (!entry) {
            alert('لا يوجد مرفق محفوظ لهذه الجهة حالياً / No saved attachment for this contact yet.');
            return;
        }
        const att = kind === 'passportAttachment' ? entry.passportAttachment : entry.idAttachment;
        openStoredAttachment(att, kind === 'passportAttachment' ? 'Passport Attachment' : 'ID Attachment');
    }
"""

NEW_OPEN_PB = r"""    function openAddressBookAttachment(kind) {
        const idx = addressBookEditorState.index;
        const entry = idx >= 0 ? addressBookEntries[idx] : null;
        if (!entry) {
            alert('لا يوجد مرفق محفوظ لهذه الجهة حالياً / No saved attachment for this contact yet.');
            return;
        }
        const att = kind === 'passportAttachment' ? entry.passportAttachment : entry.idAttachment;
        openStoredAttachment(att, kind === 'passportAttachment' ? 'Passport Attachment' : 'ID Attachment');
    }

    function openAddressBookCompanyAttachment(kind) {
        const idx = addressBookEditorState.index;
        const entry = idx >= 0 ? addressBookEntries[idx] : null;
        if (!entry || toStr(entry.type) !== 'company') {
            alert('لا يوجد مرفق محفوظ لهذه الجهة حالياً / No saved attachment for this contact yet.');
            return;
        }
        const map = {
            lease: { att: entry.leaseContractAttachment, label: { ar: 'عقد الإيجار', en: 'Lease contract' } },
            sigId: { att: entry.signatoryIdAttachment, label: { ar: 'بطاقة المفوض', en: 'Signatory ID' } },
            sigPass: { att: entry.signatoryPassportAttachment, label: { ar: 'جواز المفوض', en: 'Signatory passport' } }
        };
        const m = map[kind];
        if (!m || !m.att?.dataUrl) {
            alert('لا يوجد مرفق محفوظ لهذا الحقل حالياً / No saved attachment for this field yet.');
            return;
        }
        const title = appUiLanguage === 'en' ? m.label.en : m.label.ar;
        openStoredAttachment(m.att, title);
    }
"""

OLD_SAVE = r"""    async function saveAddressBookEntry() {
        if (addressBookEditorState.mode === 'view') return;
        const read = (id) => toStr(document.getElementById(id)?.value);
        const oldEntry = (addressBookEditorState.mode === 'edit' && addressBookEditorState.index >= 0) ? (addressBookEntries[addressBookEditorState.index] || {}) : {};
        const idAttachment = await readAddressBookAttachment('abIdAttachmentFile');
        const passportAttachment = await readAddressBookAttachment('abPassportAttachmentFile');
        const entry = {
            type: read('abType') === 'owner' ? 'owner' : 'tenant',
            name: read('abName'),
            nationality: read('abNationality') || 'عماني / Omani',
            nameEn: read('abNameEn'),
            mobile: read('abMobile'),
            extraMobile: read('abExtraMobile'),
            idNo: read('abIdNo'),
            idExpiryDate: read('abIdExpiryDate'),
            email: read('abEmail'),
            passport: read('abPassport'),
            passportExpiryDate: read('abPassportExpiryDate'),
            idAttachment: idAttachment || oldEntry.idAttachment || null,
            passportAttachment: passportAttachment || oldEntry.passportAttachment || null,
            building: read('abBuilding'),
            unit: read('abUnit'),
            source: read('abSource') || 'manual',
            updatedAt: new Date().toISOString()
        };
        if (!entry.name) {
            alert('اسم جهة الاتصال مطلوب / Contact name is required.');
            return;
        }
        if (!isOmaniNationality(entry.nationality) && !toStr(entry.passport)) {
            alert('الجواز إجباري إذا كانت الجنسية غير عماني / Passport is required for non-Omani nationality.');
            return;
        }
        if (addressBookEditorState.mode === 'edit' && addressBookEditorState.index >= 0 && addressBookEntries[addressBookEditorState.index]) {
            addressBookEntries[addressBookEditorState.index] = entry;
        } else {
            addressBookEntries.unshift(entry);
        }
        localStorage.setItem('bhd_address_book', JSON.stringify(addressBookEntries));
        renderAddressBookTable();
        closeAddressBookEntryModal();
    }
"""

NEW_SAVE = r"""    async function saveAddressBookEntry() {
        if (addressBookEditorState.mode === 'view') return;
        const read = (id) => toStr(document.getElementById(id)?.value);
        const oldEntry = (addressBookEditorState.mode === 'edit' && addressBookEditorState.index >= 0) ? (addressBookEntries[addressBookEditorState.index] || {}) : {};
        const isCompanyForm = read('abEntityType') === 'company';
        if (isCompanyForm) {
            const leaseAtt = await readAddressBookAttachment('abCoLeaseFile');
            const sigIdAtt = await readAddressBookAttachment('abSigIdFile');
            const sigPassAtt = await readAddressBookAttachment('abSigPassportFile');
            const entry = {
                type: 'company',
                name: read('abCoName'),
                commercialRegNo: read('abCoCrNo'),
                commercialRegExpiryDate: read('abCoCrExpiry'),
                leaseContractAttachment: leaseAtt || oldEntry.leaseContractAttachment || null,
                mobile: read('abCoMobile'),
                extraMobile: read('abCoExtraMobile'),
                email: read('abCoEmail'),
                signatoryName: read('abSigName'),
                signatoryNationality: read('abSigNationality') || 'عماني / Omani',
                signatoryIdNo: read('abSigIdNo'),
                signatoryIdExpiryDate: read('abSigIdExpiry'),
                signatoryMobile: read('abSigMobile'),
                signatoryIdAttachment: sigIdAtt || oldEntry.signatoryIdAttachment || null,
                signatoryPassport: read('abSigPassport'),
                signatoryPassportExpiryDate: read('abSigPassportExpiry'),
                signatoryPassportAttachment: sigPassAtt || oldEntry.signatoryPassportAttachment || null,
                building: read('abCoBuilding'),
                unit: read('abCoUnit'),
                source: read('abCoSource') || 'manual',
                updatedAt: new Date().toISOString()
            };
            if (!entry.name) {
                alert(t('اسم الشركة مطلوب', 'Company name is required.'));
                return;
            }
            if (addressBookEditorState.mode === 'edit' && addressBookEditorState.index >= 0 && addressBookEntries[addressBookEditorState.index]) {
                addressBookEntries[addressBookEditorState.index] = entry;
            } else {
                addressBookEntries.unshift(entry);
            }
            localStorage.setItem('bhd_address_book', JSON.stringify(addressBookEntries));
            renderAddressBookTable();
            closeAddressBookEntryModal();
            return;
        }
        const idAttachment = await readAddressBookAttachment('abIdAttachmentFile');
        const passportAttachment = await readAddressBookAttachment('abPassportAttachmentFile');
        const entry = {
            type: read('abType') === 'owner' ? 'owner' : 'tenant',
            name: read('abName'),
            nationality: read('abNationality') || 'عماني / Omani',
            nameEn: read('abNameEn'),
            mobile: read('abMobile'),
            extraMobile: read('abExtraMobile'),
            idNo: read('abIdNo'),
            idExpiryDate: read('abIdExpiryDate'),
            email: read('abEmail'),
            passport: read('abPassport'),
            passportExpiryDate: read('abPassportExpiryDate'),
            idAttachment: idAttachment || oldEntry.idAttachment || null,
            passportAttachment: passportAttachment || oldEntry.passportAttachment || null,
            building: read('abBuilding'),
            unit: read('abUnit'),
            source: read('abSource') || 'manual',
            updatedAt: new Date().toISOString()
        };
        if (!entry.name) {
            alert('اسم جهة الاتصال مطلوب / Contact name is required.');
            return;
        }
        if (!isOmaniNationality(entry.nationality) && !toStr(entry.passport)) {
            alert('الجواز إجباري إذا كانت الجنسية غير عماني / Passport is required for non-Omani nationality.');
            return;
        }
        if (addressBookEditorState.mode === 'edit' && addressBookEditorState.index >= 0 && addressBookEntries[addressBookEditorState.index]) {
            addressBookEntries[addressBookEditorState.index] = entry;
        } else {
            addressBookEntries.unshift(entry);
        }
        localStorage.setItem('bhd_address_book', JSON.stringify(addressBookEntries));
        renderAddressBookTable();
        closeAddressBookEntryModal();
    }
"""

OLD_MERGE = r"""        const merged = fromSystem.map((r) => {
            const old = oldMap.get(addressBookEntryKey(r)) || {};
            return {
                ...old,
                ...r,
                nationality: toStr(old.nationality || r.nationality || 'عماني / Omani'),
                extraMobile: toStr(old.extraMobile || r.extraMobile),
                idExpiryDate: toStr(old.idExpiryDate || r.idExpiryDate),
                passportExpiryDate: toStr(old.passportExpiryDate || r.passportExpiryDate),
                idAttachment: old.idAttachment || r.idAttachment || null,
                passportAttachment: old.passportAttachment || r.passportAttachment || null
            };
        });
"""

NEW_MERGE = r"""        const merged = fromSystem.map((r) => {
            const old = oldMap.get(addressBookEntryKey(r)) || {};
            return {
                ...old,
                ...r,
                nationality: toStr(old.nationality || r.nationality || 'عماني / Omani'),
                extraMobile: toStr(old.extraMobile || r.extraMobile),
                idExpiryDate: toStr(old.idExpiryDate || r.idExpiryDate),
                passportExpiryDate: toStr(old.passportExpiryDate || r.passportExpiryDate),
                idAttachment: old.idAttachment || r.idAttachment || null,
                passportAttachment: old.passportAttachment || r.passportAttachment || null,
                commercialRegNo: toStr(old.commercialRegNo || r.commercialRegNo),
                commercialRegExpiryDate: toStr(old.commercialRegExpiryDate || r.commercialRegExpiryDate),
                leaseContractAttachment: old.leaseContractAttachment || r.leaseContractAttachment || null,
                signatoryName: toStr(old.signatoryName || r.signatoryName),
                signatoryNationality: toStr(old.signatoryNationality || r.signatoryNationality),
                signatoryIdNo: toStr(old.signatoryIdNo || r.signatoryIdNo),
                signatoryIdExpiryDate: toStr(old.signatoryIdExpiryDate || r.signatoryIdExpiryDate),
                signatoryMobile: toStr(old.signatoryMobile || r.signatoryMobile),
                signatoryIdAttachment: old.signatoryIdAttachment || r.signatoryIdAttachment || null,
                signatoryPassport: toStr(old.signatoryPassport || r.signatoryPassport),
                signatoryPassportExpiryDate: toStr(old.signatoryPassportExpiryDate || r.signatoryPassportExpiryDate),
                signatoryPassportAttachment: old.signatoryPassportAttachment || r.signatoryPassportAttachment || null
            };
        });
"""

OLD_IMPORT = r"""                if (Array.isArray(parsed.addressBookEntries)) {
                    addressBookEntries = parsed.addressBookEntries.map((x) => ({
                        type: toStr(x.type) === 'owner' ? 'owner' : 'tenant',
                        name: toStr(x.name),
                        nationality: toStr(x.nationality) || 'عماني / Omani',
                        nameEn: toStr(x.nameEn),
                        mobile: toStr(x.mobile),
                        extraMobile: toStr(x.extraMobile),
                        idNo: toStr(x.idNo),
                        idExpiryDate: toStr(x.idExpiryDate),
                        email: toStr(x.email),
                        passport: toStr(x.passport),
                        passportExpiryDate: toStr(x.passportExpiryDate),
                        idAttachment: x.idAttachment || null,
                        passportAttachment: x.passportAttachment || null,
                        building: toStr(x.building),
                        unit: toStr(x.unit),
                        source: toStr(x.source),
                        updatedAt: toStr(x.updatedAt) || new Date().toISOString()
                    })).filter((x) => x.name);
                }
"""

NEW_IMPORT = r"""                if (Array.isArray(parsed.addressBookEntries)) {
                    addressBookEntries = parsed.addressBookEntries.map((x) => {
                        if (toStr(x.type) === 'company') {
                            return {
                                type: 'company',
                                name: toStr(x.name),
                                commercialRegNo: toStr(x.commercialRegNo),
                                commercialRegExpiryDate: toStr(x.commercialRegExpiryDate),
                                leaseContractAttachment: x.leaseContractAttachment || null,
                                mobile: toStr(x.mobile),
                                extraMobile: toStr(x.extraMobile),
                                email: toStr(x.email),
                                signatoryName: toStr(x.signatoryName),
                                signatoryNationality: toStr(x.signatoryNationality) || 'عماني / Omani',
                                signatoryIdNo: toStr(x.signatoryIdNo),
                                signatoryIdExpiryDate: toStr(x.signatoryIdExpiryDate),
                                signatoryMobile: toStr(x.signatoryMobile),
                                signatoryIdAttachment: x.signatoryIdAttachment || null,
                                signatoryPassport: toStr(x.signatoryPassport),
                                signatoryPassportExpiryDate: toStr(x.signatoryPassportExpiryDate),
                                signatoryPassportAttachment: x.signatoryPassportAttachment || null,
                                building: toStr(x.building),
                                unit: toStr(x.unit),
                                source: toStr(x.source),
                                updatedAt: toStr(x.updatedAt) || new Date().toISOString()
                            };
                        }
                        return {
                            type: toStr(x.type) === 'owner' ? 'owner' : 'tenant',
                            name: toStr(x.name),
                            nationality: toStr(x.nationality) || 'عماني / Omani',
                            nameEn: toStr(x.nameEn),
                            mobile: toStr(x.mobile),
                            extraMobile: toStr(x.extraMobile),
                            idNo: toStr(x.idNo),
                            idExpiryDate: toStr(x.idExpiryDate),
                            email: toStr(x.email),
                            passport: toStr(x.passport),
                            passportExpiryDate: toStr(x.passportExpiryDate),
                            idAttachment: x.idAttachment || null,
                            passportAttachment: x.passportAttachment || null,
                            building: toStr(x.building),
                            unit: toStr(x.unit),
                            source: toStr(x.source),
                            updatedAt: toStr(x.updatedAt) || new Date().toISOString()
                        };
                    }).filter((x) => x.name);
                }
"""

replace_once(OLD_RENDER, NEW_RENDER, "renderAddressBookTable")
replace_once(OLD_FILTER, NEW_FILTER, "getAddressBookFilteredRows")
replace_once(OLD_PRINT, NEW_PRINT, "printAddressBookReport rows")
replace_once(OLD_SET_DISABLED, NEW_SET_DISABLED, "setAddressBookFormDisabled")
replace_once(OLD_FILL, NEW_FILL, "fillAddressBookForm")
replace_once(OLD_RELATED, NEW_RELATED, "renderAddressBookRelatedInfo")
replace_once(OLD_OPEN_PB, NEW_OPEN_PB, "openAddressBookAttachment+company opener")
replace_once(OLD_SAVE, NEW_SAVE, "saveAddressBookEntry")
replace_once(OLD_MERGE, NEW_MERGE, "refresh merge")
replace_once(OLD_IMPORT, NEW_IMPORT, "json import")

if text == orig:
    raise SystemExit("No changes applied (patterns mismatch?)")

p.write_text(text, encoding="utf-8")
print("PART2 OK")
