# -*- coding: utf-8 -*-
import pathlib
import re

p = next(pathlib.Path(r"c:\dev\عقود الايجار").glob("عقد*.html"))
text = p.read_text(encoding="utf-8")

# --- 1) HTML: custom rent section ---
old_html = r"""            <div class="input-group bhd-ledger-block" style="grid-column:1 / -1" id="customRentSection">
                <h5>📋 إيجارات مخصصة / Custom rent rules</h5>
                <p style="font-size:12px;color:#555;margin:0 0 8px;line-height:1.45" data-ar="مثال: تخفيض أو زيادة على عدد أشهر محدد — يتكرر في عمود مبلغ الدفع بجدول الأقساط." data-en="Example: discount or increase for a set span of months — applied to the monthly payment table amounts.">مثال: تخفيض أو زيادة على عدة أشهر — ينعكس تلقائياً في جدول الدفع. / E.g. discount or surcharge for N months — reflected in the payment schedule.</p>
                <div id="customRentItemsList" style="display:flex;flex-direction:column;gap:8px"></div>
                <div style="margin-top:8px">
                    <button type="button" class="mini-btn" onclick="addCustomRentItemRow()">＋ إضافة بند / Add rule</button>
                </div>
            </div>"""

new_html = r"""            <div class="input-group bhd-ledger-block" style="grid-column:1 / -1" id="customRentSection">
                <h5>📋 إيجارات مخصصة / Custom rent (per month)</h5>
                <p style="font-size:12px;color:#555;margin:0 0 8px;line-height:1.45" data-ar="نفس تنسيق جدول الدفع: التاريخ والمبلغ لكل شهر. أي تغيير هنا ينسخ مباشرة إلى جدول الدفع الشهري أدناه." data-en="Same layout as the payment schedule: date and amount per month. Changes sync immediately to the monthly payment table below.">نفس تنسيق جدول الدفع (شهر + تاريخ + مبلغ). التعديل ينعكس مباشرة في جدول الدفع الشهري. / Same format as the payment table — edits sync to the main schedule below.</p>
                <div id="customRentScheduleTableWrap" class="payment-schedule-wrap" aria-label="Custom rent table / جدول إيجار مخصص"></div>
            </div>"""

if old_html not in text:
    raise SystemExit("HTML block for custom rent not found")
text = text.replace(old_html, new_html, 1)

# --- 2) getSmartTotals: replace custom rent calculation ---
old_smart = r"""        const customRows = Array.isArray(d.customRentItems) ? d.customRentItems : [];
        const baseRentTotal = monthly * months;
        const customRentNet = totalCustomRentDeltaEffect(customRows, months);
        const rentTotal = baseRentTotal + customRentNet;"""

new_smart = r"""        const baseRows = getBaseContractPaymentRows();
        const effRows = getDefaultPaymentRowsFromForm();
        const baseRentTotal = sumScheduleAmounts(baseRows);
        const rentTotal = sumScheduleAmounts(effRows);
        const customRentNet = rentTotal - baseRentTotal;"""

if old_smart not in text:
    raise SystemExit("getSmartTotals custom block not found")
text = text.replace(old_smart, new_smart, 1)

# remove customRows from return
text = text.replace(
    "            customRentNet,\n            customRentRows: customRows,",
    "            customRentNet,",
    1,
)

# --- 3) updateSummary: remove per-rule customRulesHtml block ---
old_rules = r"""        const customRulesHtml = (s.customRentRows || [])
            .map((x) => {
                const title = escHtml(toStr(x.title) || t('بند', 'Item'));
                const dlt = (parseFloat(x.deltaPerMonth) || 0).toFixed(3);
                return `<div style="font-size:12px;margin:2px 0 0 8px;opacity:0.95">— ${title}: <b>${dlt}</b> ${t('ر.ع/شهر (OMR/mo)', 'OMR/mo (ر.ع/شهر)')}</div>`;
            })
            .join('');
"""
if old_rules in text:
    text = text.replace(old_rules, "        const customRulesHtml = '';\n", 1)

# --- 4) Replace getCustomRent block through totalCustomRentDeltaEffect (remove) and insert new + keep helpers before getDefault ---

# Find: from "    function getCustomRentItemsFromUi()" through "    function sumInsuranceDepositLinesAmount" start - we'll replace a large chunk

pat = re.compile(
    r"    function getCustomRentItemsFromUi\(\) \{.*?"
    r"    function getDefaultPaymentRowsFromForm\(\) \{",
    re.DOTALL,
)
m = pat.search(text)
if not m:
    raise SystemExit("Could not find getCustomRentItemsFromUi..getDefaultPaymentRowsFromForm")

replacement_middle = r"""    function getCustomRentScheduleFromUi() {
        const wrap = document.getElementById('customRentScheduleTableWrap');
        if (!wrap) return [];
        return [...wrap.querySelectorAll('tbody tr[data-custom-rent-month]')].map((tr) => ({
            monthIndex: parseInt(tr.getAttribute('data-custom-rent-month'), 10) || 0,
            dueDate: toStr(tr.querySelector('[data-custom-rent-date]')?.value),
            amount: toStr(tr.querySelector('[data-custom-rent-amount]')?.value)
        }));
    }

    function getCustomRentItemsFromUi() {
        return getCustomRentScheduleFromUi();
    }

    function renderCustomRentScheduleFromRows(rows = []) {
        const wrap = document.getElementById('customRentScheduleTableWrap');
        if (!wrap) return;
        let list = Array.isArray(rows) ? rows : [];
        if (list.length && (list[0].deltaPerMonth !== undefined || list[0].fromMonth !== undefined)) {
            list = [];
        }
        if (!list.length) {
            wrap.innerHTML = `<p style="color:#666;font-size:12px;margin:0">${t('اضبط المدة وتاريخ البداية والإيجار ثم اضغط «إعادة بناء» في جدول الدفع لعرض الأشهر.', 'Set period, start date, and rent, then press Rebuild in the payment section to list months.')}</p>`;
            return;
        }
        const body = list
            .sort((a, b) => (a.monthIndex || 0) - (b.monthIndex || 0))
            .map((r) => {
                const m = r.monthIndex || 0;
                const dVal = escHtml(toStr(r.dueDate));
                const amt = escHtml(toStr(r.amount));
                return `<tr data-custom-rent-month="${m}">
                    <td>${m}</td>
                    <td><input type="date" data-custom-rent-date value="${dVal}"></td>
                    <td><input type="number" data-custom-rent-amount min="0" step="0.001" value="${amt}"></td>
                </tr>`;
            })
            .join('');
        wrap.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>${t('الشهر / Month', 'Month / الشهر')}</th>
                        <th>${t('تاريخ الدفع / Due date', 'Due date / تاريخ الدفع')}</th>
                        <th>${t('مقدار الدفع (ر.ع) / Amount (OMR)', 'Amount (OMR) / مقدار')}</th>
                    </tr>
                </thead>
                <tbody>${body}</tbody>
            </table>`;
        try {
            localizeBilingualUi();
        } catch (e) {}
    }

    function renderCustomRentItemsRows(rows) {
        return renderCustomRentScheduleFromRows(rows);
    }

    function syncCustomRentToMainPaymentSchedule() {
        const base = getBaseContractPaymentRows();
        if (!base.length) return;
        const merged = mergeBaseWithCustomRentSchedule(base, getCustomRentScheduleFromUi());
        const prev = getPaymentScheduleFromUi();
        const mapP = new Map(prev.map((r) => [r.monthIndex, r]));
        const out = merged.map((row) => {
            const ex = mapP.get(row.monthIndex) || {};
            return {
                ...row,
                checkNo: toStr(ex.checkNo),
                checkAttachmentName: toStr(ex.checkAttachmentName),
                checkAttachmentDataUrl: toStr(ex.checkAttachmentDataUrl)
            };
        });
        renderPaymentScheduleFromRows(out);
        try {
            updateSummaryPanel();
        } catch (e) {}
        try {
            renderDocument(currentDoc);
        } catch (e) {}
    }

    function copyMainScheduleRowToCustomRentTable(monthIndex) {
        const main = document.querySelector(`#paymentScheduleTableWrap tr[data-schedule-month="${monthIndex}"]`);
        const cst = document.querySelector(`#customRentScheduleTableWrap tr[data-custom-rent-month="${monthIndex}"]`);
        if (!main || !cst) return;
        const d = main.querySelector('[data-schedule-date]');
        const a = main.querySelector('[data-schedule-amount]');
        const d2 = cst.querySelector('[data-custom-rent-date]');
        const a2 = cst.querySelector('[data-custom-rent-amount]');
        if (d && d2) d2.value = d.value;
        if (a && a2) a2.value = a.value;
    }

    function sumScheduleAmounts(rows) {
        return (Array.isArray(rows) ? rows : []).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    }

    function getBaseContractPaymentRows() {
        const n = Math.max(1, parseInt(toStr(document.getElementById('contractMonths')?.value), 10) || 12);
        const rentRaw = parseFloat(toStr(document.getElementById('monthlyRent')?.value)) || 0;
        const dayOfMonth = getAgreedRentPaymentDayOfMonth();
        const startStr = toStr(document.getElementById('startDate')?.value);
        if (!startStr) return [];
        const p = startStr.split('-').map((x) => parseInt(x, 10));
        const start = p.length === 3 && !p.some((x) => Number.isNaN(x)) ? new Date(p[0], p[1] - 1, p[2]) : new Date(startStr);
        if (Number.isNaN(start.getTime())) return [];
        const y0 = start.getFullYear();
        const m0 = start.getMonth();
        const rent = rentRaw > 0 ? rentRaw.toFixed(3) : '0.000';
        const rows = [];
        for (let i = 0; i < n; i++) {
            const t = new Date(y0, m0 + i, 1);
            const lastInMonth = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
            t.setDate(Math.min(dayOfMonth, lastInMonth));
            rows.push({
                monthIndex: i + 1,
                dueDate: formatDateYmdLocal(t),
                amount: rent,
                checkNo: '',
                checkAttachmentName: '',
                checkAttachmentDataUrl: ''
            });
        }
        return rows;
    }

    function mergeBaseWithCustomRentSchedule(base, overlay) {
        if (!Array.isArray(overlay) || !overlay.length) return base;
        const cmap = new Map(overlay.map((r) => [r.monthIndex, r]));
        return base.map((row) => {
            const c = cmap.get(row.monthIndex);
            if (!c) return row;
            const a = toStr(c.amount);
            const d = toStr(c.dueDate);
            const amt = a === '' || a === null ? row.amount : Math.max(0, parseFloat(a) || 0).toFixed(3);
            return { ...row, amount: amt, dueDate: d || row.dueDate };
        });
    }

    function getDefaultPaymentRowsFromForm() {"""

text = pat.sub(replacement_middle, text, count=1)

# After replacement, the OLD getDefault body is still the long one with customItems - need to fix getDefault content
# The replacement ended with "function getDefaultPaymentRowsFromForm() {" so the next lines are old for-loop
old_getdef = r"""    function getDefaultPaymentRowsFromForm() {
        const n = Math.max(1, parseInt(toStr(document.getElementById('contractMonths')?.value), 10) || 12);
        const rentRaw = parseFloat(toStr(document.getElementById('monthlyRent')?.value)) || 0;
        const dayOfMonth = getAgreedRentPaymentDayOfMonth();
        const startStr = toStr(document.getElementById('startDate')?.value);
        if (!startStr) return [];
        const p = startStr.split('-').map((x) => parseInt(x, 10));
        const start = p.length === 3 && !p.some((x) => Number.isNaN(x)) ? new Date(p[0], p[1] - 1, p[2]) : new Date(startStr);
        if (Number.isNaN(start.getTime())) return [];
        const y0 = start.getFullYear();
        const m0 = start.getMonth();
        const customItems = getCustomRentItemsFromUi();
        const rows = [];
        for (let i = 0; i < n; i++) {
            const t = new Date(y0, m0 + i, 1);
            const lastInMonth = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
            t.setDate(Math.min(dayOfMonth, lastInMonth));
            const monthIndex = i + 1;
            const delta = computeCustomRentDeltaForMonth(monthIndex, customItems, n);
            const amountNum = Math.max(0, rentRaw + delta);
            const amount = amountNum.toFixed(3);
            rows.push({
                monthIndex,
                dueDate: formatDateYmdLocal(t),
                amount,
                checkNo: '',
                checkAttachmentName: '',
                checkAttachmentDataUrl: ''
            });
        }
        return rows;
    }"""

new_getdef = r"""    function getDefaultPaymentRowsFromForm() {
        const base = getBaseContractPaymentRows();
        return mergeBaseWithCustomRentSchedule(base, getCustomRentScheduleFromUi());
    }"""

if old_getdef not in text:
    raise SystemExit("old getDefaultPaymentRowsFromForm not found (duplicate getDefault?)")
text = text.replace(old_getdef, new_getdef, 1)

# Remove orphaned functions if any remain: computeCustomRentDeltaForMonth, totalCustomRentDeltaEffect, addCustomRentItemRow, removeCustomRentItemRow
for fn in [
    r"    function computeCustomRentDeltaForMonth[\s\S]*?^    function totalCustomRentDeltaEffect",
    r"    function totalCustomRentDeltaEffect[\s\S]*?^    function sumInsuranceDepositLinesAmount",
]:
    m2 = re.search(fn, text, re.MULTILINE)
    if m2:
        # only remove the first of the pair in loop - do manually
        pass

# Delete compute + total blocks explicitly
z = r"""    function computeCustomRentDeltaForMonth(monthIndex1, customItems, contractMonthCount) {
        let d = 0;
        const n = Math.max(1, contractMonthCount);
        const items = Array.isArray(customItems) ? customItems : getCustomRentItemsFromUi();
        items.forEach((rule) => {
            const start = Math.max(1, parseInt(toStr(rule.fromMonth), 10) || 1);
            const cnt = Math.max(0, parseInt(toStr(rule.monthCount), 10) || 0);
            const delta = parseFloat(toStr(rule.deltaPerMonth)) || 0;
            if (cnt > 0 && monthIndex1 >= start && monthIndex1 < start + cnt && monthIndex1 <= n) d += delta;
        });
        return d;
    }

    function totalCustomRentDeltaEffect(customItems, contractMonthCount) {
        const n = Math.max(1, contractMonthCount);
        let sum = 0;
        for (let m = 1; m <= n; m++) sum += computeCustomRentDeltaForMonth(m, customItems, n);
        return sum;
    }

"""

if z in text:
    text = text.replace(z, "\n", 1)

# Remove add/remove custom rent item row if still there
a1 = r"""    function addCustomRentItemRow() {
        const rows = getCustomRentItemsFromUi();
        rows.push({ id: `cr_${Date.now()}`, title: '', fromMonth: '1', monthCount: '1', deltaPerMonth: '0' });
        renderCustomRentItemsRows(rows);
    }

    function removeCustomRentItemRow(id) {
        const rows = getCustomRentItemsFromUi().filter((x) => toStr(x.id) !== toStr(id));
        renderCustomRentItemsRows(rows);
    }

"""

if a1 in text:
    text = text.replace(a1, "", 1)

p.write_text(text, encoding="utf-8", newline="\r\n")
print("pass1 done", p)
