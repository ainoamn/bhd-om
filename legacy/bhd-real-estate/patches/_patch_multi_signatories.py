# -*- coding: utf-8 -*-
"""Multiple corporate signatories — safe apply to عقد*.html"""
import pathlib

P = next(pathlib.Path(__file__).parent.glob("عقد*.html"))
text = P.read_text(encoding="utf-8")


def fail(msg):
    raise SystemExit(msg)


OLD_HTML = """                <div class=\"input-group\" style=\"grid-column:1/-1\">
                    <h6 style=\"margin:8px 0 6px;font-size:13px\" data-ar=\"المفوض بالتوقيع\" data-en=\"Authorized signatory\">المفوض بالتوقيع / Authorized signatory</h6>
                </div>
                <div class=\"input-group\">
                    <label data-ar=\"اسم المفوض بالتوقيع\" data-en=\"Signatory name\">اسم المفوض بالتوقيع / Signatory name</label>
                    <input type=\"text\" id=\"abSigName\">
                </div>
                <div class=\"input-group\">
                    <label data-ar=\"جنسية المفوض\" data-en=\"Signatory nationality\">جنسية المفوض / Signatory nationality</label>
                    <select id=\"abSigNationality\" onchange=\"syncAddressBookSignatoryRules()\"></select>
                </div>
                <div id=\"abSigWrapOmani\" class=\"row-2cols\" style=\"display:contents\">
                    <div class=\"input-group\">
                        <label data-ar=\"الرقم المدني (المفوض)\" data-en=\"Signatory civil ID no.\">الرقم المدني (المفوض) / Signatory civil ID no.</label>
                        <input type=\"text\" id=\"abSigIdNo\">
                    </div>
                    <div class=\"input-group\">
                        <label data-ar=\"انتهاء البطاقة (المفوض)\" data-en=\"Signatory ID expiry\">انتهاء البطاقة (المفوض) / Signatory ID expiry</label>
                        <input type=\"date\" id=\"abSigIdExpiry\">
                    </div>
                    <div class=\"input-group\">
                        <label data-ar=\"هاتف المفوض\" data-en=\"Signatory phone\">هاتف المفوض / Signatory phone</label>
                        <input type=\"text\" id=\"abSigMobile\">
                    </div>
                    <div class=\"input-group\" style=\"grid-column:1/-1\">
                        <label data-ar=\"مرفق نسخة من بطاقة المفوض\" data-en=\"Signatory ID attachment\">مرفق نسخة من بطاقة المفوض / Signatory ID attachment</label>
                        <input type=\"file\" id=\"abSigIdFile\" accept=\"image/*,application/pdf\">
                        <button type=\"button\" class=\"mini-btn\" style=\"margin-top:6px\" onclick=\"openAddressBookCompanyAttachment('sigId')\" data-ar=\"فتح المرفق\" data-en=\"Open attachment\">فتح المرفق / Open attachment</button>
                    </div>
                </div>
                <div id=\"abSigWrapForeign\" style=\"display:none;grid-column:1/-1\" class=\"row-2cols\">
                    <div class=\"input-group\">
                        <label data-ar=\"جواز السفر (المفوض)\" data-en=\"Signatory passport no.\">جواز السفر (المفوض) / Signatory passport no.</label>
                        <input type=\"text\" id=\"abSigPassport\">
                    </div>
                    <div class=\"input-group\">
                        <label data-ar=\"انتهاء الجواز (المفوض)\" data-en=\"Signatory passport expiry\">انتهاء الجواز (المفوض) / Signatory passport expiry</label>
                        <input type=\"date\" id=\"abSigPassportExpiry\">
                    </div>
                    <div class=\"input-group\" style=\"grid-column:1/-1\">
                        <label data-ar=\"مرفق جواز المفوض\" data-en=\"Signatory passport attachment\">مرفق جواز المفوض / Signatory passport attachment</label>
                        <input type=\"file\" id=\"abSigPassportFile\" accept=\"image/*,application/pdf\">
                        <button type=\"button\" class=\"mini-btn\" style=\"margin-top:6px\" onclick=\"openAddressBookCompanyAttachment('sigPass')\" data-ar=\"فتح المرفق\" data-en=\"Open attachment\">فتح المرفق / Open attachment</button>
                    </div>
                </div>
                <div class=\"input-group\">
                    <label data-ar=\"المبنى\" data-en=\"Building\">المبنى / Building</label>
                    <input type=\"text\" id=\"abCoBuilding\">
                </div>"""

NEW_HTML = """                <div class=\"input-group\" style=\"grid-column:1/-1\">
                    <div style=\"display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px\">
                        <h6 style=\"margin:0;font-size:13px\" data-ar=\"المفوضون بالتوقيع\" data-en=\"Authorized signatories\">المفوضون بالتوقيع / Authorized signatories</h6>
                        <button type=\"button\" class=\"mini-btn\" id=\"abAddSignatoryBtn\" onclick=\"addressBookAddSignatoryRow()\" data-ar=\"+ إضافة مفوض\" data-en=\"+ Add signatory\">+ إضافة مفوض / Add signatory</button>
                    </div>
                    <small style=\"display:block;color:#60717d\" data-ar=\"بعد الحفظ يظهر كل مفوض مرقماً مع الاسم والرقم المدني والجوال في القائمة.\" data-en=\"After save, each signatory is numbered with name, civil ID, and phone in the list.\">بعد الحفظ يظهر كل مفوض مرقماً مع الاسم والرقم المدني والجوال في القائمة.</small>
                </div>
                <div id=\"abSignatoriesMount\" style=\"grid-column:1/-1\"></div>
                <div class=\"input-group\">
                    <label data-ar=\"المبنى\" data-en=\"Building\">المبنى / Building</label>
                    <input type=\"text\" id=\"abCoBuilding\">
                </div>"""

if OLD_HTML not in text:
    fail("OLD_HTML block not found — file may differ")
text = text.replace(OLD_HTML, NEW_HTML, 1)

text = text.replace(
    "    let addressBookEditorState = { mode: 'view', index: -1 };",
    "    let addressBookEditorState = { mode: 'view', index: -1 };\n    let addressBookSignatoriesDraft = [];",
    1,
)

text = text.replace(
    """        const sigSel = document.getElementById('abSigNationality');
        if (sigSel && !sigSel.options.length) {
            sigSel.innerHTML = opts;
        }
""",
    "",
    1,
)

# ---- JS block: replace sync pair with full helper module ----
OLD_SYNC = """    function syncAddressBookPersonCompanyShell() {
        const sel = document.getElementById('abEntityType');
        const entity = sel && toStr(sel.value) === 'company' ? 'company' : 'person';
        const personSec = document.getElementById('abPersonSection');
        const companySec = document.getElementById('abCompanySection');
        if (personSec) {
            const hide = entity === 'company';
            personSec.hidden = hide;
            personSec.style.display = hide ? 'none' : '';
        }
        if (companySec) {
            const show = entity === 'company';
            companySec.hidden = !show;
            companySec.style.display = show ? '' : 'none';
        }
        if (entity === 'company') syncAddressBookSignatoryRules();
    }

    function syncAddressBookSignatoryRules() {
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

# mergeAddressBookCompanySignatories inlined here (used by refresh merge)
NEW_BLOCK = r'''    function getEmptyCompanySignatory() {
        return {
            signatoryName: '',
            signatoryNationality: 'عماني / Omani',
            signatoryIdNo: '',
            signatoryIdExpiryDate: '',
            signatoryMobile: '',
            signatoryIdAttachment: null,
            signatoryPassport: '',
            signatoryPassportExpiryDate: '',
            signatoryPassportAttachment: null
        };
    }

    function mergeAddressBookCompanySignatories(oldRow, newRow) {
        const ao = normalizeCompanySignatories(oldRow);
        const an = normalizeCompanySignatories(newRow);
        const out = ao.map((o, ix) => {
            const n = an[ix];
            const merged = { ...getEmptyCompanySignatory(), ...(n || {}), ...o };
            return {
                ...merged,
                signatoryIdAttachment: o.signatoryIdAttachment || (n && n.signatoryIdAttachment) || null,
                signatoryPassportAttachment: o.signatoryPassportAttachment || (n && n.signatoryPassportAttachment) || null
            };
        });
        while (out.length < an.length) {
            const n = an[out.length];
            out.push({ ...getEmptyCompanySignatory(), ...(n || {}) });
        }
        return out;
    }

    function normalizeCompanySignatories(entry) {
        if (!entry) return [getEmptyCompanySignatory()];
        if (Array.isArray(entry.signatories) && entry.signatories.length > 0) {
            return entry.signatories.map((s) => ({ ...getEmptyCompanySignatory(), ...s }));
        }
        if (toStr(entry.signatoryName) || toStr(entry.signatoryIdNo)) {
            return [{
                signatoryName: toStr(entry.signatoryName),
                signatoryNationality: toStr(entry.signatoryNationality) || 'عماني / Omani',
                signatoryIdNo: toStr(entry.signatoryIdNo),
                signatoryIdExpiryDate: toStr(entry.signatoryIdExpiryDate),
                signatoryMobile: toStr(entry.signatoryMobile),
                signatoryIdAttachment: entry.signatoryIdAttachment || null,
                signatoryPassport: toStr(entry.signatoryPassport),
                signatoryPassportExpiryDate: toStr(entry.signatoryPassportExpiryDate),
                signatoryPassportAttachment: entry.signatoryPassportAttachment || null
            }];
        }
        return [getEmptyCompanySignatory()];
    }

    function syncAddressBookSignatoryPasport(cardEl) {
        if (!cardEl) return;
        const nat = toStr(cardEl.querySelector('[data-ab-field="sigNat"]')?.value);
        const omani = isOmaniNationality(nat);
        const passWrap = cardEl.querySelector('[data-ab-passport-wrap]');
        if (passWrap) passWrap.style.display = omani ? 'none' : '';
    }

    function syncAddressBookSignatoryPasportFromEvent(ev) {
        const card = ev?.target?.closest('.ab-signatory-card');
        syncAddressBookSignatoryPasport(card);
    }

    function addressBookCompanySignatoryCardHtml(idx, natOpts) {
        const n = idx + 1;
        return `
            <div class="ab-signatory-card" data-ab-sig-idx="${idx}" style="grid-column:1/-1;border:1px solid #e2eaf0;border-radius:10px;padding:12px 14px;margin-bottom:10px;background:#fafcfe">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px;flex-wrap:wrap">
                    <span style="display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 8px;border-radius:999px;background:var(--primary);color:#fff;font-weight:800;font-size:13px">${n}</span>
                    <button type="button" class="mini-btn ab-sig-remove" onclick="addressBookRemoveSignatoryRow(${idx})">🗑️</button>
                </div>
                <div class="row-2cols">
                    <div class="input-group">
                        <label data-ar="اسم المفوض بالتوقيع" data-en="Signatory name">اسم المفوض بالتوقيع / Signatory name</label>
                        <input type="text" data-ab-field="sigName" autocomplete="name">
                    </div>
                    <div class="input-group">
                        <label data-ar="جنسية المفوض" data-en="Signatory nationality">جنسية المفوض / Signatory nationality</label>
                        <select data-ab-field="sigNat" onchange="syncAddressBookSignatoryPasportFromEvent(event)">${natOpts}</select>
                    </div>
                    <div class="input-group">
                        <label data-ar="الرقم المدني (المفوض)" data-en="Signatory civil ID no.">الرقم المدني (المفوض) / Signatory civil ID no.</label>
                        <input type="text" data-ab-field="sigIdNo">
                    </div>
                    <div class="input-group">
                        <label data-ar="انتهاء البطاقة (المفوض)" data-en="Signatory ID expiry">انتهاء البطاقة (المفوض) / Signatory ID expiry</label>
                        <input type="date" data-ab-field="sigIdExp">
                    </div>
                    <div class="input-group">
                        <label data-ar="هاتف المفوض" data-en="Signatory phone">هاتف المفوض / Signatory phone</label>
                        <input type="text" data-ab-field="sigMob">
                    </div>
                    <div class="input-group" style="grid-column:1/-1">
                        <label data-ar="مرفق بطاقة المفوض" data-en="Signatory ID attachment">مرفق بطاقة المفوض / Signatory ID attachment</label>
                        <input type="file" id="abSigIdFile_${idx}" accept="image/*,application/pdf">
                        <button type="button" class="mini-btn" style="margin-top:6px" onclick="openAddressBookCompanyAttachment('sigId', ${idx})">فتح المرفق / Open attachment</button>
                    </div>
                    <div data-ab-passport-wrap class="row-2cols" style="display:contents">
                        <div class="input-group">
                            <label data-ar="جواز السفر (المفوض)" data-en="Signatory passport no.">جواز السفر (المفوض) / Signatory passport no.</label>
                            <input type="text" data-ab-field="sigPassport">
                        </div>
                        <div class="input-group">
                            <label data-ar="انتهاء الجواز (المفوض)" data-en="Signatory passport expiry">انتهاء الجواز (المفوض) / Signatory passport expiry</label>
                            <input type="date" data-ab-field="sigPassExp">
                        </div>
                        <div class="input-group" style="grid-column:1/-1">
                            <label data-ar="مرفق جواز المفوض" data-en="Signatory passport attachment">مرفق جواز المفوض / Signatory passport attachment</label>
                            <input type="file" id="abSigPassportFile_${idx}" accept="image/*,application/pdf">
                            <button type="button" class="mini-btn" style="margin-top:6px" onclick="openAddressBookCompanyAttachment('sigPass', ${idx})">فتح المرفق / Open attachment</button>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    function addressBookSignatoriesSnapshotFromDom(storageEntryFlat) {
        const base = (addressBookSignatoriesDraft && addressBookSignatoriesDraft.length)
            ? addressBookSignatoriesDraft
            : normalizeCompanySignatories(storageEntryFlat || {});
        const mount = document.getElementById('abSignatoriesMount');
        if (!mount) return base.slice();
        const cards = [...mount.querySelectorAll('.ab-signatory-card')];
        return cards.map((card, idx) => {
            const gv = (f) => toStr(card.querySelector(`[data-ab-field="${f}"]`)?.value);
            return {
                signatoryName: gv('sigName'),
                signatoryNationality: gv('sigNat') || 'عماني / Omani',
                signatoryIdNo: gv('sigIdNo'),
                signatoryIdExpiryDate: gv('sigIdExp'),
                signatoryMobile: gv('sigMob'),
                signatoryPassport: gv('sigPassport'),
                signatoryPassportExpiryDate: gv('sigPassExp'),
                signatoryIdAttachment: base[idx]?.signatoryIdAttachment || null,
                signatoryPassportAttachment: base[idx]?.signatoryPassportAttachment || null
            };
        });
    }

    function addressBookRenderCompanySignatoryEditor() {
        ensureAddressBookCountryOptions();
        if (!addressBookSignatoriesDraft || !addressBookSignatoriesDraft.length) {
            addressBookSignatoriesDraft = [getEmptyCompanySignatory()];
        }
        const mount = document.getElementById('abSignatoriesMount');
        if (!mount) return;
        const natOpts = document.getElementById('abNationality')?.innerHTML || '';
        mount.innerHTML = addressBookSignatoriesDraft.map((_, ix) => addressBookCompanySignatoryCardHtml(ix, natOpts)).join('');
        mount.querySelectorAll('.ab-signatory-card').forEach((card, ix) => {
            const row = addressBookSignatoriesDraft[ix];
            const setEl = (f, v) => {
                const el = card.querySelector(`[data-ab-field="${f}"]`);
                if (el) el.value = v || '';
            };
            setEl('sigName', row.signatoryName);
            setEl('sigNat', row.signatoryNationality || 'عماني / Omani');
            setEl('sigIdNo', row.signatoryIdNo);
            setEl('sigIdExp', row.signatoryIdExpiryDate);
            setEl('sigMob', row.signatoryMobile);
            setEl('sigPassport', row.signatoryPassport);
            setEl('sigPassExp', row.signatoryPassportExpiryDate);
            syncAddressBookSignatoryPasport(card);
        });
    }

    function addressBookAddSignatoryRow() {
        const ix = Number(addressBookEditorState.index);
        const oldFlat = (ix >= 0 ? addressBookEntries[ix] : {}) || {};
        addressBookSignatoriesDraft = addressBookSignatoriesSnapshotFromDom(oldFlat);
        addressBookSignatoriesDraft.push(getEmptyCompanySignatory());
        addressBookRenderCompanySignatoryEditor();
    }

    function addressBookRemoveSignatoryRow(ix) {
        if (addressBookSignatoriesDraft.length <= 1) {
            alert(t('يجب الإبقاء على مفوض واحد على الأقل.', 'At least one signatory must remain.'));
            return;
        }
        const i2 = Number(addressBookEditorState.index);
        const oldFlat = (i2 >= 0 ? addressBookEntries[i2] : {}) || {};
        addressBookSignatoriesDraft = addressBookSignatoriesSnapshotFromDom(oldFlat);
        addressBookSignatoriesDraft.splice(ix, 1);
        addressBookRenderCompanySignatoryEditor();
    }

    async function addressBookFinalizeCompanySignatories(storageFlat) {
        const rows = addressBookSignatoriesSnapshotFromDom(storageFlat);
        const base = normalizeCompanySignatories(storageFlat || {});
        const out = [];
        for (let idx = 0; idx < rows.length; idx++) {
            const r = rows[idx];
            const legacy = base[idx] || {};
            const idAtt = await readAddressBookAttachment(`abSigIdFile_${idx}`);
            const pasAtt = await readAddressBookAttachment(`abSigPassportFile_${idx}`);
            out.push({
                ...getEmptyCompanySignatory(),
                ...r,
                signatoryIdAttachment: idAtt || legacy.signatoryIdAttachment || r.signatoryIdAttachment || null,
                signatoryPassportAttachment: pasAtt || legacy.signatoryPassportAttachment || r.signatoryPassportAttachment || null
            });
        }
        return out;
    }

    function formatCompanySignatoriesListHtml(entry) {
        const list = normalizeCompanySignatories(entry);
        const shown = list.filter((s) => toStr(s.signatoryName));
        if (!shown.length) return escHtml('-');
        return `<ol style="margin:4px 0;padding-inline-start:20px;line-height:1.5;font-size:11px;color:#324a59">${
            shown.map((s, i) =>
                `<li style="margin-bottom:4px"><strong>${i + 1}.</strong> ${escHtml(toStr(s.signatoryName) || '-')} · ${t('مدني', 'ID')} ${escHtml(toStr(s.signatoryIdNo) || '-')} · 📱 ${escHtml(toStr(s.signatoryMobile) || '-')}</li>`
            ).join('')}</ol>`;
    }

    function syncAddressBookPersonCompanyShell() {
        const sel = document.getElementById('abEntityType');
        const entity = sel && toStr(sel.value) === 'company' ? 'company' : 'person';
        const personSec = document.getElementById('abPersonSection');
        const companySec = document.getElementById('abCompanySection');
        if (personSec) {
            const hide = entity === 'company';
            personSec.hidden = hide;
            personSec.style.display = hide ? 'none' : '';
        }
        if (companySec) {
            const show = entity === 'company';
            companySec.hidden = !show;
            companySec.style.display = show ? '' : 'none';
        }
        if (entity !== 'company') {
            addressBookSignatoriesDraft = [];
            const ms = document.getElementById('abSignatoriesMount');
            if (ms) ms.innerHTML = '';
        }
    }

'''

if OLD_SYNC not in text:
    fail("OLD_SYNC not found")
text = text.replace(OLD_SYNC, NEW_BLOCK.strip() + "\n", 1)

# ---- issues ----
OLD_ISS = """        requireField(t('البريد الإلكتروني', 'Email'), entry?.email);
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
        return issues;"""

NEW_ISS = """        requireField(t('البريد الإلكتروني', 'Email'), entry?.email);
        const sigs = normalizeCompanySignatories(entry).filter((s) => toStr(s.signatoryName));
        if (!sigs.length) {
            issues.push(`${t('المفوض بالتوقيع', 'Authorized signatory')}: ${t('ناقص', 'Missing')}`);
        }
        sigs.forEach((sg, xi) => {
            const lbl = `${t('المفوض', 'Sig.')} #${xi + 1}`;
            requireField(`${lbl} — ${t('الاسم', 'Name')}`, sg.signatoryName);
            const sigNat = toStr(sg.signatoryNationality);
            const sigOmani = isOmaniNationality(sigNat);
            const requireSigCivil = () => {
                requireField(`${lbl} — ${t('الرقم المدني', 'Civil ID')}`, sg.signatoryIdNo);
                checkDate(`${lbl} — ${t('بطاقة', 'ID')}`, sg.signatoryIdExpiryDate);
                requireField(`${lbl} — ${t('الهاتف', 'Phone')}`, sg.signatoryMobile);
                if (!sg.signatoryIdAttachment?.dataUrl) {
                    issues.push(`${lbl} ${t('مرفق بطاقة', 'ID file')}: ${t('ناقص', 'Missing')}`);
                }
            };
            const requireSigPassport = () => {
                requireField(`${lbl} — ${t('الجواز', 'Passport')}`, sg.signatoryPassport);
                checkDate(`${lbl} — ${t('جواز', 'Passport')}`, sg.signatoryPassportExpiryDate);
                if (!sg.signatoryPassportAttachment?.dataUrl) {
                    issues.push(`${lbl} ${t('مرفق جواز', 'Passport file')}: ${t('ناقص', 'Missing')}`);
                }
            };
            if (sigOmani) {
                requireSigCivil();
            } else {
                requireSigCivil();
                requireSigPassport();
            }
        });
        return issues;"""

if OLD_ISS not in text:
    fail("OLD_ISS not found")
text = text.replace(OLD_ISS, NEW_ISS, 1)

# fill company
OLD_FILL = """            set('abSigName', toStr(e.signatoryName));
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

NEW_FILL = """            addressBookSignatoriesDraft = normalizeCompanySignatories(e);
            addressBookRenderCompanySignatoryEditor();
            set('abCoBuilding', toStr(e.building));
            set('abCoUnit', toStr(e.unit));
            set('abCoSource', toStr(e.source || 'manual'));
            set('abCoCrFile', '');
            set('abCoLeaseFile', '');
        } else {"""
if OLD_FILL not in text:
    fail("OLD_FILL")
text = text.replace(OLD_FILL, NEW_FILL, 1)

text = text.replace(
    """        syncAddressBookPersonCompanyShell();
        if (isCompany) syncAddressBookSignatoryRules();
    }
""",
    """        syncAddressBookPersonCompanyShell();
        if (isCompany) addressBookRenderCompanySignatoryEditor();
    }
""",
    1,
)

# disabled list
text = text.replace(
    "'abCoEmail', 'abSigName', 'abSigNationality', 'abSigIdNo', 'abSigIdExpiry', 'abSigMobile', 'abSigIdFile', 'abSigPassport', 'abSigPassportExpiry', 'abSigPassportFile', 'abCoBuilding'",
    "'abCoEmail', 'abCoBuilding'",
    1,
)

DIS_OLD = """    function setAddressBookFormDisabled(disabled) {
        ['abEntityType', 'abType', 'abName', 'abNationality', 'abNameEn', 'abMobile', 'abExtraMobile', 'abIdNo', 'abIdExpiryDate', 'abEmail', 'abPassport', 'abPassportExpiryDate', 'abBuilding', 'abUnit', 'abSource', 'abIdAttachmentFile', 'abPassportAttachmentFile', 'abCoName', 'abCoNameEn', 'abCoCrNo', 'abCoCrExpiry', 'abCoCrFile', 'abCoLeaseFile', 'abCoMobile', 'abCoExtraMobile', 'abCoEmail', 'abCoBuilding', 'abCoUnit', 'abCoSource'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.disabled = !!disabled;
        });
        const saveBtn = document.getElementById('addressBookSaveBtn');
        if (saveBtn) saveBtn.style.display = disabled ? 'none' : 'inline-flex';
    }"""

DIS_NEW = """    function setAddressBookFormDisabled(disabled) {
        ['abEntityType', 'abType', 'abName', 'abNationality', 'abNameEn', 'abMobile', 'abExtraMobile', 'abIdNo', 'abIdExpiryDate', 'abEmail', 'abPassport', 'abPassportExpiryDate', 'abBuilding', 'abUnit', 'abSource', 'abIdAttachmentFile', 'abPassportAttachmentFile', 'abCoName', 'abCoNameEn', 'abCoCrNo', 'abCoCrExpiry', 'abCoCrFile', 'abCoLeaseFile', 'abCoMobile', 'abCoExtraMobile', 'abCoEmail', 'abCoBuilding', 'abCoUnit', 'abCoSource'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.disabled = !!disabled;
        });
        document.querySelectorAll('#abSignatoriesMount input, #abSignatoriesMount select, #abSignatoriesMount button').forEach((el) => {
            el.disabled = !!disabled;
        });
        const addBtn = document.getElementById('abAddSignatoryBtn');
        if (addBtn) addBtn.disabled = !!disabled;
        const saveBtn = document.getElementById('addressBookSaveBtn');
        if (saveBtn) saveBtn.style.display = disabled ? 'none' : 'inline-flex';
    }"""
if DIS_OLD not in text:
    fail("setAddressBookFormDisabled not found")
text = text.replace(DIS_OLD, DIS_NEW, 1)

# openAttachment
OA_OLD = """    function openAddressBookCompanyAttachment(kind) {
        const idx = addressBookEditorState.index;
        const entry = idx >= 0 ? addressBookEntries[idx] : null;
        if (!entry || toStr(entry.type) !== 'company') {
            alert('لا يوجد مرفق محفوظ لهذه الجهة حالياً / No saved attachment for this contact yet.');
            return;
        }
        const map = {
            crCert: { att: entry.commercialRegAttachment || entry.leaseContractAttachment, label: { ar: 'السجل التجاري', en: 'Commercial registration (CR)' } },
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
OA_NEW = """    function openAddressBookCompanyAttachment(kind, sigIndex = 0) {
        const idx = addressBookEditorState.index;
        const entry = idx >= 0 ? addressBookEntries[idx] : null;
        const si = Number(sigIndex) || 0;
        const sigRows = normalizeCompanySignatories(entry || {});
        const sg = sigRows[si];
        if (!entry || toStr(entry.type) !== 'company') {
            alert('لا يوجد مرفق محفوظ لهذه الجهة حالياً / No saved attachment for this contact yet.');
            return;
        }
        if ((kind === 'sigId' || kind === 'sigPass') && !sg) {
            alert(t('لا يوجد مفوض في هذا الموضع.', 'No signatory at this slot.'));
            return;
        }
        const idxLabel = `${si + 1}`;
        const map = {
            crCert: { att: entry.commercialRegAttachment || entry.leaseContractAttachment, labelAr: 'السجل التجاري', labelEn: 'Commercial registration (CR)' },
            lease: { att: entry.leaseContractAttachment, labelAr: 'عقد الإيجار', labelEn: 'Lease contract' },
            sigId: { att: sg?.signatoryIdAttachment || entry.signatoryIdAttachment, labelAr: `بطاقة المفوض #${idxLabel}`, labelEn: `Signatory ID #${idxLabel}` },
            sigPass: { att: sg?.signatoryPassportAttachment || entry.signatoryPassportAttachment, labelAr: `جواز المفوض #${idxLabel}`, labelEn: `Signatory passport #${idxLabel}` }
        };
        const m = map[kind];
        if (!m || !m.att?.dataUrl) {
            alert('لا يوجد مرفق محفوظ لهذا الحقل حالياً / No saved attachment for this field yet.');
            return;
        }
        const title = appUiLanguage === 'en' ? m.labelEn : m.labelAr;
        openStoredAttachment(m.att, title);
    }
"""
if OA_OLD not in text:
    fail("openAddressBookCompanyAttachment old not found")
text = text.replace(OA_OLD, OA_NEW, 1)

SAVE_OLD = """        if (isCompanyForm) {
            const crAtt = await readAddressBookAttachment('abCoCrFile');
            const leaseAtt = await readAddressBookAttachment('abCoLeaseFile');
            const sigIdAtt = await readAddressBookAttachment('abSigIdFile');
            const sigPassAtt = await readAddressBookAttachment('abSigPassportFile');
            const entry = {
                type: 'company',
                companyAttachmentSchema: 2,
                name: read('abCoName'),
                nameEn: read('abCoNameEn'),
                commercialRegNo: read('abCoCrNo'),
                commercialRegExpiryDate: read('abCoCrExpiry'),
                commercialRegAttachment: crAtt || oldEntry.commercialRegAttachment || null,
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
            };"""

SAVE_NEW = """        if (isCompanyForm) {
            const crAtt = await readAddressBookAttachment('abCoCrFile');
            const leaseAtt = await readAddressBookAttachment('abCoLeaseFile');
            const sigList = await addressBookFinalizeCompanySignatories(oldEntry);
            const entry = {
                type: 'company',
                companyAttachmentSchema: 2,
                name: read('abCoName'),
                nameEn: read('abCoNameEn'),
                commercialRegNo: read('abCoCrNo'),
                commercialRegExpiryDate: read('abCoCrExpiry'),
                commercialRegAttachment: crAtt || oldEntry.commercialRegAttachment || null,
                leaseContractAttachment: leaseAtt || oldEntry.leaseContractAttachment || null,
                mobile: read('abCoMobile'),
                extraMobile: read('abCoExtraMobile'),
                email: read('abCoEmail'),
                signatories: sigList,
                building: read('abCoBuilding'),
                unit: read('abCoUnit'),
                source: read('abCoSource') || 'manual',
                updatedAt: new Date().toISOString()
            };"""
if SAVE_OLD not in text:
    fail("SAVE_OLD")
text = text.replace(SAVE_OLD, SAVE_NEW, 1)

TAB_OLD = """                    <div style="font-size:11px;color:#5c6f7b">${t('المفوض', 'Signatory')}: ${escHtml(r.signatoryName || '-')}</div>
                </td>"""
TAB_NEW = """                    <div>${formatCompanySignatoriesListHtml(r)}</div>
                </td>"""
if TAB_OLD not in text:
    fail("table company signatory line")
text = text.replace(TAB_OLD, TAB_NEW, 1)

LN = "                ? `company ${r.name} ${r.nameEn} ${r.commercialRegNo} ${r.signatoryName} ${r.signatoryNationality} ${r.signatoryIdNo}`.toLowerCase()\n"
LN2 = "                ? (`company ${r.name} ${r.nameEn} ${r.commercialRegNo} ` + normalizeCompanySignatories(r).map((s) => `${s.signatoryName} ${s.signatoryNationality} ${s.signatoryIdNo}`).join(' ')).toLowerCase()\n"
if LN not in text:
    fail("filter contact line")
text = text.replace(LN, LN2, 1)

LNM = "                ? `${r.mobile} ${r.extraMobile} ${r.email} ${r.signatoryMobile}`.toLowerCase()\n"
LNM2 = "                ? (`${r.mobile} ${r.extraMobile} ${r.email} ` + normalizeCompanySignatories(r).map((s) => s.signatoryMobile).join(' ')).toLowerCase()\n"
if LNM not in text:
    fail("filter comm line")
text = text.replace(LNM, LNM2, 1)

REL_OLD = """        if (entry.type === 'company') {
            const enLine = toStr(entry.nameEn) ? `<br><small style="direction:ltr">${escHtml(entry.nameEn)}</small>` : '';
            host.innerHTML = `<strong>${t('بيانات الشركة', 'Company details')}:</strong>${enLine}<br>${escHtml(t('السجل التجاري', 'CR'))}: ${escHtml(entry.commercialRegNo || '-')}` +
                ` | ${escHtml(t('المفوض', 'Signatory'))}: ${escHtml(entry.signatoryName || '-')}`;
            return;
        }"""
REL_NEW = """        if (entry.type === 'company') {
            const enLine = toStr(entry.nameEn) ? `<br><small style="direction:ltr">${escHtml(entry.nameEn)}</small>` : '';
            host.innerHTML = `<strong>${t('بيانات الشركة', 'Company details')}:</strong>${enLine}<br>${escHtml(t('السجل التجاري', 'CR'))}: ${escHtml(entry.commercialRegNo || '-')}` +
                `<br>${formatCompanySignatoriesListHtml(entry)}`;
            return;
        }"""
if REL_OLD not in text:
    fail("REL")
text = text.replace(REL_OLD, REL_NEW, 1)

PR_OLD = """                ? `${escHtml(r.name || '')}${toStr(r.nameEn) ? `<br><small style="direction:ltr">${escHtml(r.nameEn)}</small>` : ''}<br><small>${escHtml(toStr(r.commercialRegNo || '-'))} | ${escHtml(r.signatoryName || '-')}</small>`"""
PR_NEW = """                ? `${escHtml(r.name || '')}${toStr(r.nameEn) ? `<br><small style="direction:ltr">${escHtml(r.nameEn)}</small>` : ''}<br><small>${escHtml(toStr(r.commercialRegNo || '-'))}</small>${formatCompanySignatoriesListHtml(r)}`"""
if PR_OLD not in text:
    fail("print")
text = text.replace(PR_OLD, PR_NEW, 1)

MERGE_OLD = """                signatoryName: toStr(old.signatoryName || r.signatoryName),
                signatoryNationality: toStr(old.signatoryNationality || r.signatoryNationality),
                signatoryIdNo: toStr(old.signatoryIdNo || r.signatoryIdNo),
                signatoryIdExpiryDate: toStr(old.signatoryIdExpiryDate || r.signatoryIdExpiryDate),
                signatoryMobile: toStr(old.signatoryMobile || r.signatoryMobile),
                signatoryIdAttachment: old.signatoryIdAttachment || r.signatoryIdAttachment || null,
                signatoryPassport: toStr(old.signatoryPassport || r.signatoryPassport),
                signatoryPassportExpiryDate: toStr(old.signatoryPassportExpiryDate || r.signatoryPassportExpiryDate),
                signatoryPassportAttachment: old.signatoryPassportAttachment || r.signatoryPassportAttachment || null
"""
MERGE_NEW = """                signatories: mergeAddressBookCompanySignatories(old, r)
"""
if MERGE_OLD not in text:
    fail("merge signatory block")
text = text.replace(MERGE_OLD, MERGE_NEW.rstrip("\n"), 1)

IMP_OLD = """                                signatoryName: toStr(x.signatoryName),
                                signatoryNationality: toStr(x.signatoryNationality) || 'عماني / Omani',
                                signatoryIdNo: toStr(x.signatoryIdNo),
                                signatoryIdExpiryDate: toStr(x.signatoryIdExpiryDate),
                                signatoryMobile: toStr(x.signatoryMobile),
                                signatoryIdAttachment: x.signatoryIdAttachment || null,
                                signatoryPassport: toStr(x.signatoryPassport),
                                signatoryPassportExpiryDate: toStr(x.signatoryPassportExpiryDate),
                                signatoryPassportAttachment: x.signatoryPassportAttachment || null,"""

IMP_NEW = """                                signatories: Array.isArray(x.signatories)
                                    ? x.signatories.map((s) => ({ ...getEmptyCompanySignatory(), ...s }))
                                    : normalizeCompanySignatories({
                                        signatoryName: x.signatoryName,
                                        signatoryNationality: x.signatoryNationality,
                                        signatoryIdNo: x.signatoryIdNo,
                                        signatoryIdExpiryDate: x.signatoryIdExpiryDate,
                                        signatoryMobile: x.signatoryMobile,
                                        signatoryIdAttachment: x.signatoryIdAttachment,
                                        signatoryPassport: x.signatoryPassport,
                                        signatoryPassportExpiryDate: x.signatoryPassportExpiryDate,
                                        signatoryPassportAttachment: x.signatoryPassportAttachment
                                    }),"""
if IMP_OLD not in text:
    fail("import")
text = text.replace(IMP_OLD, IMP_NEW, 1)

P.write_text(text, encoding="utf-8")
print("OK multi-signatories patch", len(text), "chars")
