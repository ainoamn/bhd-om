# -*- coding: utf-8 -*-
"""Patch: deposit receipt+attach, insurance cheque attach, summary sections. Run from عقود folder."""
import pathlib

p = next(pathlib.Path(__file__).parent.glob("عقد*.html"))
text = p.read_text(encoding="utf-8")

old_deposit_ui = r"""                <div class="form-grid" style="margin-bottom:10px">
                    <div class="input-group" style="max-width:320px">
                        <label>مبلغ التأمين (مرجعي) / Deposit amount (OMR)</label>
                        <input type="text" id="depositAmount" value="325">
                    </div>
                </div>"""

new_deposit_ui = r"""                <div class="form-grid" style="margin-bottom:10px;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;align-items:end">
                    <div class="input-group">
                        <label data-ar="مبلغ التأمين (مرجعي) / ر.ع" data-en="Deposit amount (OMR)">مبلغ التأمين (مرجعي) / Deposit amount (OMR)</label>
                        <input type="text" id="depositAmount" value="325">
                    </div>
                    <div class="input-group">
                        <label data-ar="رقم الإيصال" data-en="Receipt no.">رقم الإيصال / Receipt no.</label>
                        <input type="text" id="depositReceiptRef" maxlength="160" autocomplete="off" placeholder="رقم الإيصال / Receipt no.">
                    </div>
                    <div class="input-group" style="grid-column:1/-1">
                        <label data-ar="مرفق إيصال أو مستند للوديعة" data-en="Deposit receipt attachment (PDF or image)">مرفق إيصال أو مستند للوديعة / Deposit receipt attachment (PDF or image)</label>
                        <div id="depositAttachmentRow" style="display:flex;flex-wrap:wrap;align-items:center;gap:10px">
                            <span data-deposit-att-name style="font-size:12px;color:#3b4b56;max-width:100%;word-break:break-all">—</span>
                            <input type="file" id="depositAttachmentInput" accept="image/*,.pdf" onclick="event.stopPropagation()" onchange="onDepositAttachmentChange(this)" style="max-width:260px">
                        </div>
                    </div>
                </div>"""

if old_deposit_ui not in text:
    raise SystemExit("deposit UI block missing")
text = text.replace(old_deposit_ui, new_deposit_ui, 1)

old_gfd = """            paymentMethod: v('paymentMethod'),
            depositAmount: v('depositAmount'),"""
new_gfd = """            paymentMethod: v('paymentMethod'),
            depositReceiptRef: v('depositReceiptRef'),
            depositAttachmentName: (() => {
                const h = document.getElementById('depositAttachmentRow');
                return h && h.dataset ? toStr(h.dataset.attachmentName) : '';
            })(),
            depositAttachmentDataUrl: (() => {
                const h = document.getElementById('depositAttachmentRow');
                return h && h.dataset ? toStr(h.dataset.attachmentDataUrl) : '';
            })(),
            depositAmount: v('depositAmount'),"""

if old_gfd not in text:
    raise SystemExit("getFormData deposit missed")
text = text.replace(old_gfd, new_gfd, 1)

old_col = """            depositAmount: document.getElementById('depositAmount').value,
            graceDays:"""

new_col = """            depositAmount: document.getElementById('depositAmount')?.value || '',
            depositReceiptRef: document.getElementById('depositReceiptRef')?.value || '',
            depositAttachmentName: (() => {
                const h = document.getElementById('depositAttachmentRow');
                return (h && h.dataset && h.dataset.attachmentName) ? toStr(h.dataset.attachmentName) : '';
            })(),
            depositAttachmentDataUrl: (() => {
                const h = document.getElementById('depositAttachmentRow');
                return (h && h.dataset && h.dataset.attachmentDataUrl) ? toStr(h.dataset.attachmentDataUrl) : '';
            })(),
            graceDays:"""

if old_col not in text:
    raise SystemExit("collectStorable missed")
text = text.replace(old_col, new_col, 1)

old_gs = """        const depositRefAmount = parseFloat(toStr(d.depositAmount)) || 0;
        const graceDiscount = parseFloat(d.graceAmount) || 0;"""
new_gs = """        const depositRefAmount = parseFloat(toStr(d.depositAmount)) || 0;
        const depositReceiptRef = toStr(d.depositReceiptRef);
        const graceDiscount = parseFloat(d.graceAmount) || 0;"""
text = text.replace(old_gs, new_gs, 1)

old_gs_ret = """            depositRefAmount,
            insuranceRows: insRows,"""
new_gs_ret = """            depositRefAmount,
            depositReceiptRef,
            insuranceRows: insRows,"""
text = text.replace(old_gs_ret, new_gs_ret, 1)

old_panel = """        panel.innerHTML = `
            <div><b>${t('الإيجار الشهري:', 'Monthly rent:')}</b> ${s.monthly.toFixed(3)} OMR</div>
            <div><b>${t('مدة العقد:', 'Contract period:')}</b> ${s.months} ${t('شهر', 'months')}</div>
            <div><b>${t('إجمالي الإيجار (أساسي):', 'Base rent total:')}</b> ${brt.toFixed(3)} OMR</div>
            <div><b>${t('تعديل إيجار مخصص (صافي):', 'Custom rent adjustment (net):')}</b> ${csign}${(s.customRentNet || 0).toFixed(3)} OMR</div>
            ${customRulesHtml}
            <div><b>${t('إجمالي الإيجار (بعد المخصص):', 'Rent total (after custom):')}</b> ${s.rentTotal.toFixed(3)} OMR</div>
            <div><b>${t('مبلغ التأمين (مرجعي) / Deposit (reference):', 'Deposit (reference) / مبلغ التأمين:')}</b> ${(s.depositRefAmount || 0).toFixed(3)} OMR</div>
            <div><b>${t('بنود التأمين (مجموع) / Insurance lines (sum):', 'Insurance lines (sum) / بنود التأمين:')}</b> ${(s.insuranceLinesTotal || 0).toFixed(3)} OMR</div>
            <div><b>${t('رسوم البلدية (3%):', 'Municipal fees (3%):')}</b> ${s.municipal.toFixed(3)} OMR</div>
            ${extraRowsHtml}
            <div><b>${t('إجمالي الإضافات:', 'Total additions:')}</b> ${s.extraAdditions.toFixed(3)} OMR</div>
            <div><b>${t('خصم فترة السماح:', 'Grace period discount:')}</b> ${s.graceDiscount.toFixed(3)} OMR</div>
            <div><b>${t('خصومات أخرى:', 'Other discounts:')}</b> ${s.otherDiscount.toFixed(3)} OMR</div>
            <div><b>${t('إجمالي الخصومات:', 'Total discounts:')}</b> ${s.totalDiscounts.toFixed(3)} OMR</div>
            <div><b>${t('الإجمالي قبل الخصم:', 'Total before discount:')}</b> ${(s.contractBeforeDiscount + s.extraAdditions).toFixed(3)} OMR</div>
            <div><b>${t('إجمالي العقد التقديري (بعد الخصم):', 'Estimated contract total (after discount):')}</b> ${s.contractTotal.toFixed(3)} OMR</div>
        `;"""

new_panel = """        const depRec = toStr(s.depositReceiptRef);
        const duesSub = (s.rentTotal || 0) + (s.municipal || 0) + (s.extraAdditions || 0);
        panel.innerHTML = `
            <div style="font-weight:700;color:var(--primary-dark);margin-bottom:6px;border-bottom:1px solid #dfe7ee;padding-bottom:4px">${t('أ — إيجار العقد والمستحقات الأساسية', 'A — Contract rent & base dues')}</div>
            <div><b>${t('الإيجار الشهري:', 'Monthly rent:')}</b> ${s.monthly.toFixed(3)} OMR</div>
            <div><b>${t('مدة العقد:', 'Contract period:')}</b> ${s.months} ${t('شهر', 'months')}</div>
            <div><b>${t('إجمالي الإيجار (أساسي):', 'Base rent total:')}</b> ${brt.toFixed(3)} OMR</div>
            <div><b>${t('تعديل إيجار مخصص (صافي):', 'Custom rent adjustment (net):')}</b> ${csign}${(s.customRentNet || 0).toFixed(3)} OMR</div>
            ${customRulesHtml}
            <div><b>${t('إجمالي الإيجار (بعد المخصص):', 'Rent total (after custom):')}</b> ${s.rentTotal.toFixed(3)} OMR</div>
            <div style="font-weight:700;color:var(--primary-dark);margin:10px 0 6px;border-bottom:1px solid #dfe7ee;padding-bottom:4px">${t('ب — التأمين والوديعة النقدية وبنود الدفع', 'B — Cash deposit & insurance payment lines')}</div>
            <div><b>${t('مبلغ التأمين (مرجعي):', 'Deposit amount (reference):')}</b> ${(s.depositRefAmount || 0).toFixed(3)} OMR</div>
            ${depRec ? `<div><b>${t('رقم الإيصال:', 'Receipt no.:')}</b> ${escHtml(depRec)}</div>` : ''}
            <div><b>${t('بنود دفع التأمين (مجموع النقد)', 'Insurance lines total (cash):')}</b> ${(s.insuranceLinesTotal || 0).toFixed(3)} OMR</div>
            <div style="font-weight:700;color:var(--primary-dark);margin:10px 0 6px;border-bottom:1px solid #dfe7ee;padding-bottom:4px">${t('ج — رسوم وإضافات', 'C — Fees & additions')}</div>
            <div><b>${t('رسوم البلدية (3٪):', 'Municipal fees (3%):')}</b> ${s.municipal.toFixed(3)} OMR</div>
            ${extraRowsHtml}
            <div><b>${t('إجمالي الإضافات:', 'Total additions:')}</b> ${s.extraAdditions.toFixed(3)} OMR</div>
            <div style="margin-top:6px;padding-top:8px;border-top:1px dashed #dfe7ee"><b>${t('مجموع المستحقات (إيجار + بلدية + إضافات):', 'Subtotal dues (rent + municipal + additions):')}</b> ${duesSub.toFixed(3)} OMR</div>
            <div style="font-weight:700;color:var(--primary-dark);margin:10px 0 6px;border-bottom:1px solid #dfe7ee;padding-bottom:4px">${t('د — الخصومات', 'D — Discounts')}</div>
            <div><b>${t('خصم فترة السماح:', 'Grace period discount:')}</b> ${s.graceDiscount.toFixed(3)} OMR</div>
            <div><b>${t('خصومات أخرى:', 'Other discounts:')}</b> ${s.otherDiscount.toFixed(3)} OMR</div>
            <div><b>${t('إجمالي الخصومات:', 'Total discounts:')}</b> ${s.totalDiscounts.toFixed(3)} OMR</div>
            <div style="font-weight:700;color:var(--primary-dark);margin:10px 0 6px;border-bottom:1px solid #dfe7ee;padding-bottom:4px">${t('هـ — الإجمالي التقديري', 'E — Estimated totals')}</div>
            <div><b>${t('الإجمالي قبل تطبيق الخصومات:', 'Subtotal before discounts:')}</b> ${(s.contractBeforeDiscount + s.extraAdditions).toFixed(3)} OMR</div>
            <div><b>${t('إجمالي العقد التقديري (بعد الخصم):', 'Estimated contract total (after discounts):')}</b> ${s.contractTotal.toFixed(3)} OMR</div>
        `;"""

if old_panel not in text:
    raise SystemExit("updateSummary panel block mismatch")
text = text.replace(old_panel, new_panel, 1)

old_get_ins = """        return [...list.querySelectorAll('[data-insurance-row]')].map((row) => ({
            id: toStr(row.getAttribute('data-insurance-row')),
            payType: toStr(row.querySelector('[data-insurance-paytype]')?.value) || 'other',
            amount: toStr(row.querySelector('[data-insurance-amount]')?.value || '0'),
            reference: toStr(row.querySelector('[data-insurance-ref]')?.value)
        }));"""

new_get_ins = """        return [...list.querySelectorAll('[data-insurance-row]')].map((row) => ({
            id: toStr(row.getAttribute('data-insurance-row')),
            payType: toStr(row.querySelector('[data-insurance-paytype]')?.value) || 'other',
            amount: toStr(row.querySelector('[data-insurance-amount]')?.value || '0'),
            reference: toStr(row.querySelector('[data-insurance-ref]')?.value),
            attachmentName: toStr(row.dataset.attachmentName),
            attachmentDataUrl: toStr(row.dataset.attachmentDataUrl)
        }));"""
text = text.replace(old_get_ins, new_get_ins, 1)

old_rnd_inner = """                const reference = escHtml(toStr(x.reference));
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
            `;"""

new_rnd_inner = """                const reference = escHtml(toStr(x.reference));
                const attDisp = escHtml(toStr(x.attachmentName));
                const cq = payType === 'cheque' || payType === 'cheque_group';
                const attachCol = cq
                    ? `<div style="display:flex;flex-direction:column;gap:4px;font-size:11px;min-width:168px">${t('<span style=\\'font-weight:700\\'>مرفق (شيك/مجموعة شيكات)</span> / Attachment','<span style=\\'font-weight:700\\'>Attachment</span> — cheque batch / مرفق')}</span><span data-ins-att-lbl style="word-break:break-all;color:#3b4b56">${attDisp || '—'}</span><input type="file" data-insurance-file accept="image/*,.pdf" style="max-width:100%"></div>`
                    : '<div></div>';
                return `
                <div data-insurance-row="${id}" style="display:grid;grid-template-columns:minmax(120px,150px) 96px minmax(100px,1fr) minmax(160px,1.1fr) auto;gap:8px;align-items:end">
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
            `;"""

if old_rnd_inner not in text:
    raise SystemExit("insurance rows template mismatch")
text = text.replace(old_rnd_inner, new_rnd_inner, 1)

# hydrate attachments + wire paytype toggle after innerHTML join
needle = """        list.innerHTML = normalized
            .map((x, idx) => {""".replace("(x, idx)", "(x, idx)")  # keep as is

# find: .join('');
#         localizeBilingualUi();
needle2 = """            .join('');
        localizeBilingualUi();
        updateSummaryPanel();
    }

    function addInsuranceDepositItemRow("""

if needle2 not in text:
    raise SystemExit("renderInsuranceDepositItemsRows tail not found")

repl2 = """            .join('');
        normalized.forEach((x, i) => {
            const els = [...list.querySelectorAll('[data-insurance-row]')];
            const row = els[i];
            if (!row) return;
            if (toStr(x.attachmentName)) row.dataset.attachmentName = toStr(x.attachmentName);
            if (toStr(x.attachmentDataUrl)) row.dataset.attachmentDataUrl = toStr(x.attachmentDataUrl);
        });
        localizeBilingualUi();
        [...list.querySelectorAll('[data-insurance-paytype]')].forEach((sel) => {
            const syncAttach = () => {
                const r = sel.closest('[data-insurance-row]');
                if (!r) return;
                const pt = toStr(sel.value);
                const need = pt === 'cheque' || pt === 'cheque_group';
                const cell = r.querySelector('[data-ins-att-lbl]');
                const fi = r.querySelector('[data-insurance-file]');
                const wrap = cell && cell.parentElement;
                if (wrap) wrap.style.display = need ? '' : 'none';
                if (!need && fi) {
                    fi.value = '';
                    r.dataset.attachmentName = '';
                    r.dataset.attachmentDataUrl = '';
                    if (cell) cell.textContent = '—';
                }
            };
            sel.addEventListener('change', syncAttach);
            syncAttach();
        });
        updateSummaryPanel();
    }

    function addInsuranceDepositItemRow("""

text = text.replace(needle2, repl2, 1)

needle3 = """        rows.push({ id: `ins_${Date.now()}`, payType: 'cheque', amount: '0', reference: '' });"""
needle3_new = """        rows.push({
            id: `ins_${Date.now()}`,
            payType: 'cheque',
            amount: '0',
            reference: '',
            attachmentName: '',
            attachmentDataUrl: ''
        });"""
text = text.replace(needle3, needle3_new, 1)

p.write_text(text, encoding="utf-8")
print("PASS 1:", p)
