# -*- coding: utf-8 -*-
import pathlib

root = pathlib.Path(__file__).parent
p = next(root.glob("عقد*.html"))
text = p.read_text(encoding="utf-8")

old_get = """        return [...list.querySelectorAll('[data-insurance-row]')].map((row) => ({
            id: toStr(row.getAttribute('data-insurance-row')),
            payType: toStr(row.querySelector('[data-insurance-paytype]')?.value) || 'other',
            amount: toStr(row.querySelector('[data-insurance-amount]')?.value || '0'),
            reference: toStr(row.querySelector('[data-insurance-ref]')?.value)
        }));"""

new_get = """        return [...list.querySelectorAll('[data-insurance-row]')].map((row) => ({
            id: toStr(row.getAttribute('data-insurance-row')),
            payType: toStr(row.querySelector('[data-insurance-paytype]')?.value) || 'other',
            amount: toStr(row.querySelector('[data-insurance-amount]')?.value || '0'),
            reference: toStr(row.querySelector('[data-insurance-ref]')?.value),
            attachmentName: toStr(row.dataset.attachmentName),
            attachmentDataUrl: toStr(row.dataset.attachmentDataUrl)
        }));"""

if old_get not in text:
    raise SystemExit("getInsurance block missing")
text = text.replace(old_get, new_get, 1)

old_render = """    function renderInsuranceDepositItemsRows(rows = []) {
        const list = document.getElementById('insuranceDepositItemsList');
        if (!list) return;
        const normalized = Array.isArray(rows) ? rows : [];
        list.innerHTML = normalized
            .map((x, idx) => {
                const id = escHtml(toStr(x.id) || `ins_${Date.now()}_${idx}`);
                const payType = ['cheque', 'cheque_group', 'other'].includes(toStr(x.payType)) ? toStr(x.payType) : 'other';
                const amount = escHtml(toStr(x.amount || '0'));
                const reference = escHtml(toStr(x.reference));
                return `
                <div data-insurance-row="${id}" style="display:grid;grid-template-columns:minmax(140px,190px) 120px 1fr auto;gap:8px;align-items:center">
                    <select data-insurance-paytype>
                        <option value="cheque" ${payType === 'cheque' ? 'selected' : ''}>${t('شيك / Cheque', 'Cheque / شيك')}</option>
                        <option value="cheque_group" ${payType === 'cheque_group' ? 'selected' : ''}>${t('مجموعة شيكات / Cheque batch', 'Cheque batch / مجموعة شيكات')}</option>
                        <option value="other" ${payType === 'other' ? 'selected' : ''}>${t('أخرى / Other', 'Other / أخرى')}</option>
                    </select>
                    <input type="number" data-insurance-amount min="0" step="0.001" value="${amount}" placeholder="0.000">
                    <input type="text" data-insurance-ref value="${reference}" placeholder="${escHtml(t('رقم الشيك أو الإيصال / Cheque or receipt no.', 'Cheque or receipt no. / رقم'))}">
                    <button type="button" class="mini-btn" onclick="removeInsuranceDepositItemRow('${id}')">✖</button>
                </div>
            `;
            })
            .join('');
        localizeBilingualUi();
        updateSummaryPanel();
    }"""

new_render = """    function renderInsuranceDepositItemsRows(rows = []) {
        const list = document.getElementById('insuranceDepositItemsList');
        if (!list) return;
        const normalized = Array.isArray(rows) ? rows : [];
        list.innerHTML = normalized
            .map((x, idx) => {
                const id = escHtml(toStr(x.id) || `ins_${Date.now()}_${idx}`);
                const payType = ['cheque', 'cheque_group', 'other'].includes(toStr(x.payType)) ? toStr(x.payType) : 'other';
                const amount = escHtml(toStr(x.amount || '0'));
                const reference = escHtml(toStr(x.reference));
                const attDisp = escHtml(toStr(x.attachmentName));
                const showAtt = payType === 'cheque' || payType === 'cheque_group';
                const attachCol = `<div data-ins-att-wrap style="display:${showAtt ? 'flex' : 'none'};flex-direction:column;gap:4px;font-size:11px;min-width:172px">
                    <span style="font-weight:700">${t('مرفق الشيك أو المستند', 'Cheque / document attachment')}</span>
                    <span data-ins-att-lbl style="word-break:break-all;color:#3b4b56">${attDisp || '—'}</span>
                    <input type="file" data-insurance-file accept="image/*,.pdf" style="max-width:100%">
                </div>`;
                return `
                <div data-insurance-row="${id}" style="display:grid;grid-template-columns:minmax(120px,154px) 96px minmax(100px,1fr) minmax(168px,1.2fr) auto;gap:8px;align-items:end">
                    <select data-insurance-paytype>
                        <option value="cheque" ${payType === 'cheque' ? 'selected' : ''}>${t('شيك / Cheque', 'Cheque / شيك')}</option>
                        <option value="cheque_group" ${payType === 'cheque_group' ? 'selected' : ''}>${t('مجموعة شيكات / Cheque batch', 'Cheque batch / مجموعة شيكات')}</option>
                        <option value="other" ${payType === 'other' ? 'selected' : ''}>${t('أخرى / Other', 'Other / أخرى')}</option>
                    </select>
                    <input type="number" data-insurance-amount min="0" step="0.001" value="${amount}" placeholder="0.000">
                    <input type="text" data-insurance-ref value="${reference}" placeholder="${escHtml(t('رقم الشيك أو الإيصال / Cheque or receipt no.', 'Cheque or receipt no. / رقم'))}">
                    ${attachCol}
                    <button type="button" class="mini-btn" onclick="removeInsuranceDepositItemRow('${id}')">✖</button>
                </div>
            `;
            })
            .join('');
        normalized.forEach((item, idx) => {
            const els = [...list.querySelectorAll('[data-insurance-row]')];
            const row = els[idx];
            if (!row) return;
            if (toStr(item.attachmentName)) row.dataset.attachmentName = toStr(item.attachmentName);
            if (toStr(item.attachmentDataUrl)) row.dataset.attachmentDataUrl = toStr(item.attachmentDataUrl);
            const lbl = row.querySelector('[data-ins-att-lbl]');
            if (lbl && toStr(item.attachmentName)) lbl.textContent = toStr(item.attachmentName);
        });
        [...list.querySelectorAll('[data-insurance-file]')].forEach((inp) => {
            inp.onchange = function () {
                onInsuranceDepositAttachmentChange(this);
            };
        });
        [...list.querySelectorAll('[data-insurance-paytype]')].forEach((sel) => {
            const syncAtt = () => {
                const row = sel.closest('[data-insurance-row]');
                if (!row) return;
                const pt = toStr(sel.value);
                const need = pt === 'cheque' || pt === 'cheque_group';
                const wrap = row.querySelector('[data-ins-att-wrap]');
                const inp = row.querySelector('[data-insurance-file]');
                const lbl = row.querySelector('[data-ins-att-lbl]');
                if (wrap) wrap.style.display = need ? 'flex' : 'none';
                if (!need) {
                    if (inp) inp.value = '';
                    row.dataset.attachmentName = '';
                    row.dataset.attachmentDataUrl = '';
                    if (lbl) lbl.textContent = '—';
                }
                try {
                    updateSummaryPanel();
                } catch (e2) {}
            };
            sel.addEventListener('change', syncAtt);
            syncAtt();
        });
        localizeBilingualUi();
        updateSummaryPanel();
    }"""

if old_render not in text:
    raise SystemExit("renderInsurance block mismatch")
text = text.replace(old_render, new_render, 1)

old_add = """        rows.push({ id: `ins_${Date.now()}`, payType: 'cheque', amount: '0', reference: '' });"""
new_add = """        rows.push({
            id: `ins_${Date.now()}`,
            payType: 'cheque',
            amount: '0',
            reference: '',
            attachmentName: '',
            attachmentDataUrl: ''
        });"""
if old_add not in text:
    raise SystemExit("addInsurance push missing")
text = text.replace(old_add, new_add, 1)

handlers = """
    function onDepositAttachmentChange(inp) {
        const row = document.getElementById('depositAttachmentRow');
        const f = inp.files && inp.files[0];
        if (!f) {
            if (row) {
                row.dataset.attachmentName = '';
                row.dataset.attachmentDataUrl = '';
                const nEl = row.querySelector('[data-deposit-att-name]');
                if (nEl) nEl.textContent = '—';
            }
            try {
                renderDocument(currentDoc);
            } catch (e) {}
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            if (!row) return;
            row.dataset.attachmentName = f.name;
            row.dataset.attachmentDataUrl = reader.result;
            const nEl = row.querySelector('[data-deposit-att-name]');
            if (nEl) nEl.textContent = f.name;
            try {
                updateSummaryPanel();
            } catch (e) {}
            try {
                renderDocument(currentDoc);
            } catch (e) {}
        };
        reader.onerror = () => {
            alert(t('تعذر قراءة الملف.', 'Could not read the file.'));
        };
        reader.readAsDataURL(f);
    }

    function onInsuranceDepositAttachmentChange(inp) {
        const row = inp && inp.closest && inp.closest('[data-insurance-row]');
        const f = inp.files && inp.files[0];
        if (!row) return;
        if (!f) {
            row.dataset.attachmentName = '';
            row.dataset.attachmentDataUrl = '';
            const nEl = row.querySelector('[data-ins-att-lbl]');
            if (nEl) nEl.textContent = '—';
            try {
                updateSummaryPanel();
            } catch (e) {}
            try {
                renderDocument(currentDoc);
            } catch (e) {}
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            row.dataset.attachmentName = f.name;
            row.dataset.attachmentDataUrl = reader.result;
            const nEl = row.querySelector('[data-ins-att-lbl]');
            if (nEl) nEl.textContent = f.name;
            try {
                updateSummaryPanel();
            } catch (e) {}
            try {
                renderDocument(currentDoc);
            } catch (e) {}
        };
        reader.onerror = () => {
            alert(t('تعذر قراءة الملف.', 'Could not read the file.'));
        };
        reader.readAsDataURL(f);
    }

"""

anchor = """    function onPaymentScheduleFileChange(inp, monthIndex) {
        const f = inp.files && inp.files[0];"""
if anchor not in text:
    raise SystemExit("anchor onPaymentSchedule not found")
if "function onDepositAttachmentChange" not in text:
    text = text.replace(anchor, handlers + anchor, 1)

# loadAllData hydrate deposit — after depositAmount line
needle_load = """            document.getElementById('depositAmount').value = data.depositAmount;
            if (document.getElementById('graceDays')) document.getElementById('graceDays').value = data.graceDays || '0';"""
replacement_load = """            document.getElementById('depositAmount').value = data.depositAmount;
            if (document.getElementById('depositReceiptRef')) document.getElementById('depositReceiptRef').value = data.depositReceiptRef || '';
            {
                const dar = document.getElementById('depositAttachmentRow');
                if (dar) {
                    dar.dataset.attachmentName = toStr(data.depositAttachmentName);
                    dar.dataset.attachmentDataUrl = toStr(data.depositAttachmentDataUrl);
                    const dsp = dar.querySelector('[data-deposit-att-name]');
                    if (dsp) dsp.textContent = toStr(data.depositAttachmentName) || '—';
                }
                const dinp = document.getElementById('depositAttachmentInput');
                if (dinp) dinp.value = '';
            }
            if (document.getElementById('graceDays')) document.getElementById('graceDays').value = data.graceDays || '0';"""

if needle_load in text:
    text = text.replace(needle_load, replacement_load, 1)

# inputs array + listener for summary
needle_inputs = """    const inputs = ['agreementNo', 'contractTypeSelect', 'tenantNameAr', 'tenantNameEn', 'tenantId', 'tenantMobile', 'tenantPassport', 'tenantEmail', 'buildingNo', 'flatNo', 'floorDetails', 'unitType', 'electricityMeter', 'waterMeter', 'monthlyRent', 'rentCalcMode', 'rentAreaSqm', 'rentPerSqm', 'contractMonths', 'graceDays', 'unitHandoverDate', 'startDate', 'endDate', 'agreedRentPaymentDay', 'paymentMethod', 'depositAmount', 'graceAmount', 'otherDiscountAmount', 'municipalFormNo', 'municipalContractNo'];"""
new_inputs = """    const inputs = ['agreementNo', 'contractTypeSelect', 'tenantNameAr', 'tenantNameEn', 'tenantId', 'tenantMobile', 'tenantPassport', 'tenantEmail', 'buildingNo', 'flatNo', 'floorDetails', 'unitType', 'electricityMeter', 'waterMeter', 'monthlyRent', 'rentCalcMode', 'rentAreaSqm', 'rentPerSqm', 'contractMonths', 'graceDays', 'unitHandoverDate', 'startDate', 'endDate', 'agreedRentPaymentDay', 'paymentMethod', 'depositAmount', 'depositReceiptRef', 'graceAmount', 'otherDiscountAmount', 'municipalFormNo', 'municipalContractNo'];"""
if needle_inputs in text:
    text = text.replace(needle_inputs, new_inputs, 1)

needle_handler = """                try { renderDocument(currentDoc); } catch (e) {}
            }
        });
        if(el && el.tagName === 'SELECT') el.addEventListener('change', () => """
# Too fragile — insert after deposit block in listener

old_input_block_start = """        if(el) el.addEventListener('input', () => {
            if (id === 'startDate' || id === 'contractMonths') autoCalculateEndDate();
            if (id === 'monthlyRent' || id === 'rentCalcMode' || id === 'rentAreaSqm' || id === 'rentPerSqm' || id === 'graceDays' || id === 'otherDiscountAmount') updateReservationCalculations();
            if (paymentScheduleDriverIds.includes(id)) {
                try { onPaymentMethodOrDriversChanged(); } catch (e) {}
            } else {
                try { renderDocument(currentDoc); } catch (e) {}
            }
        });"""

new_input_block_start = """        if(el) el.addEventListener('input', () => {
            if (id === 'startDate' || id === 'contractMonths') autoCalculateEndDate();
            if (id === 'monthlyRent' || id === 'rentCalcMode' || id === 'rentAreaSqm' || id === 'rentPerSqm' || id === 'graceDays' || id === 'otherDiscountAmount') updateReservationCalculations();
            if (paymentScheduleDriverIds.includes(id)) {
                try { onPaymentMethodOrDriversChanged(); } catch (e) {}
            } else {
                try { renderDocument(currentDoc); } catch (e) {}
            }
            if (id === 'depositAmount' || id === 'depositReceiptRef') {
                try { updateSummaryPanel(); } catch (e) {}
            }
        });"""

if old_input_block_start in text:
    text = text.replace(old_input_block_start, new_input_block_start, 1)

old_sel_block = """        if(el && el.tagName === 'SELECT') el.addEventListener('change', () => {
            if (id === 'rentCalcMode') updateReservationCalculations();
            if (paymentScheduleDriverIds.includes(id)) {
                try { onPaymentMethodOrDriversChanged(); } catch (e) {}
            } else {
                try { renderDocument(currentDoc); } catch (e) {}
            }
        });"""

new_sel_block = """        if(el && el.tagName === 'SELECT') el.addEventListener('change', () => {
            if (id === 'rentCalcMode') updateReservationCalculations();
            if (paymentScheduleDriverIds.includes(id)) {
                try { onPaymentMethodOrDriversChanged(); } catch (e) {}
            } else {
                try { renderDocument(currentDoc); } catch (e) {}
            }
            if (id === 'depositAmount' || id === 'depositReceiptRef') {
                try { updateSummaryPanel(); } catch (e) {}
            }
        });"""

if old_sel_block in text:
    text = text.replace(old_sel_block, new_sel_block, 1)

p.write_text(text, encoding="utf-8")
print("OK", p)
