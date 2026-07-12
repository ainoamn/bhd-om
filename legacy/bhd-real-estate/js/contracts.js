            return;
        }
        const triggerPrint = () => {
            try {
                win.focus();
                win.print();
            } catch (_ePr) {}
        };
        const embeds = win.document ? win.document.querySelectorAll('embed, object, img').length : 0;
        const delay = embeds ? Math.min(8000, 1200 + embeds * 500) : 500;
        if (win.document.readyState === 'complete') {
            setTimeout(triggerPrint, delay);
        } else {
            win.onload = () => setTimeout(triggerPrint, delay);
        }
    }

    function viewContractFromUnitDetails() {
        const unit = selectedUnitDetailsRecord;
        if (!unit) return;
        const prim = getLinkedContractDisplayPrimaryUnit(unit);
        if (prim) {
            openPrimaryLinkedContractFromUnitDetails();
            return;
        }
        if (!unitDetailsAllowsContractPrintActions(unit)) {
            alert(
                t(
                    'لا يوجد عقد لهذه الوحدة بعد. احجز الوحدة وأكمل التعاقد أولاً.',
                    'No contract for this unit yet. Reserve the unit and complete tenancy first.'
                )
            );
            return;
        }
        if (
            !assertPermissionOrAlert(
                'manage_contracts',
                'لا تملك صلاحية عرض العقود والمستندات.',
                'No permission to view contracts & documents.'
            )
        ) {
            return;
        }
        openContractFullViewModal(unit);
    }

    function editFromDetails() {
        if (!selectedUnitDetailsRecord) return;
        alert(
            t(
                'التعديل من «سجل العقود» في تفاصيل الوحدة:\n• العقد الحالي الساري: فترة وإيجار وشيكات\n• العقد الأصلي المؤرشف: الضمان وشيكات الضمان فقط\n• العقود المنتهية: لا يمكن تعديلها',
                'Edit from «Contract versions» in unit details:\n• Active current contract: period, rent & cheques\n• Archived original: deposit & deposit cheques only\n• Ended contracts: cannot be edited'
            )
        );
    }

    function saveFromDetails() {
        if (!selectedUnitDetailsRecord) return;
        if (!unitDetailsAllowsContractEdit(selectedUnitDetailsRecord)) {
            alert(
                t(
                    'لا تملك صلاحية حفظ تعديلات على عقد محفوظ.',
                    'You cannot save changes to a saved contract.'
                )
            );
            return;
        }
        prefillContractFromUnit(selectedUnitDetailsRecord, false);
        saveAllData();
    }

    function openExpiryReportWindow(maxDays) {
        const rows = getExpiringUnits(maxDays).sort((a, b) => (daysUntil(a.endDate) || 9999) - (daysUntil(b.endDate) || 9999));
        const win = window.open('', '_blank');
        if (!win) return;
        const tableRows = rows.map((u, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${u.building || ''}</td>
                <td>${u.unit || ''}</td>
                <td>${u.tenant || ''}</td>
                <td>${u.endDate || ''}</td>
                <td>${daysUntil(u.endDate)}</td>
                <td>${u.mobile || ''}</td>
            </tr>
        `).join('');
        win.document.write(`
            <html><head><title>تقرير العقود خلال ${maxDays} يوم</title>
            <style>
                body{font-family:Tahoma,Arial,sans-serif;direction:rtl;padding:20px}
                h2{margin:0 0 10px;color:#7A001F}
                table{width:100%;border-collapse:collapse;font-size:12px}
                th,td{border:1px solid #333;padding:6px 8px;text-align:right}
                th{background:#f3e6eb}
                .meta{margin:8px 0 14px;color:#444}
            </style></head>
            <body>
                <h2>تقرير العقود التي تنتهي خلال ${maxDays} يوم</h2>
                <div class="meta">إجمالي العقود: ${rows.length} | التاريخ: ${new Date().toLocaleDateString('ar-OM')}</div>
                <table>
                    <thead><tr><th>#</th><th>المبنى</th><th>الوحدة</th><th>المستأجر</th><th>تاريخ الانتهاء</th><th>متبقي يوم</th><th>التواصل</th></tr></thead>
                    <tbody>${tableRows || '<tr><td colspan="7">لا توجد نتائج</td></tr>'}</tbody>
                </table>
                <script>window.onload=function(){window.print();}<\/script>
            </body></html>
        `);
        win.document.close();
    }

    function batchRenewPrint(maxDays = 30) {
        const rows = getExpiringUnits(maxDays);
        if (!rows.length) {
            alert('لا توجد عقود ضمن المدة المحددة للطباعة الجماعية.');
            return;
        }
        const baseUrl = window.location.href.split('?')[0];
        rows.forEach((u, idx) => {
            const payload = buildPayloadFromUnit(u, true);
            const key = `bhd_runtime_payload_${Date.now()}_${idx}`;
            localStorage.setItem(key, JSON.stringify(payload));
            window.open(`${baseUrl}?viewer=1&payloadKey=${encodeURIComponent(key)}&autoprint=1`, '_blank');
        });
        alert(`✅ تم فتح ${rows.length} نافذة تجديد للطباعة الجماعية. إذا منع المتصفح النوافذ، اسمح بالنوافذ المنبثقة.`);
    }

    function runFlexibleBatchPrint() {
        const days = Number(document.getElementById('batchDaysFilter')?.value || 30);
        const building = document.getElementById('batchBuildingFilter')?.value || 'all';
        const rows = getExpiringUnitsByBuilding(days, building);
        if (!rows.length) {
            alert('لا توجد عقود مطابقة للفلاتر المحددة.');
            return;
        }
        const baseUrl = window.location.href.split('?')[0];
        rows.forEach((u, idx) => {
            const payload = buildPayloadFromUnit(u, true);
            const key = `bhd_runtime_payload_${Date.now()}_${idx}`;
            localStorage.setItem(key, JSON.stringify(payload));
            window.open(`${baseUrl}?viewer=1&payloadKey=${encodeURIComponent(key)}&autoprint=1`, '_blank');
        });
        alert(`✅ تم فتح ${rows.length} نافذة تجديد (${days} يوم)${building !== 'all' ? ` للمبنى: ${building}` : ''}.`);
    }

    function toggleTheme() {
        const current = localStorage.getItem('bhd_theme_mode') || 'maroon';
        const next = current === 'maroon' ? 'turquoise' : 'maroon';
        applyTheme(next);
    }

    function applyTheme(mode) {
        const palette = themePalettes[mode] || themePalettes.maroon;
        document.documentElement.style.setProperty('--primary', palette.primary);
        document.documentElement.style.setProperty('--primary-dark', palette.dark);
        document.documentElement.style.setProperty('--primary-light', palette.light);
        localStorage.setItem('bhd_theme_mode', mode);
        syncBhdKvToServer();
    }

    function getSmartTotals() {
        const d = getFormData();
        const monthly = parseFloat(d.monthlyRent) || 0;
        const months = parseInt(d.contractMonths) || 0;
        const municipal = parseFloat(calcMunicipalFees()) || 0;
        const baseRows = getBaseContractPaymentRows();
        const effRows = getDefaultPaymentRowsFromForm();
        const baseRentTotal = sumScheduleAmounts(baseRows);
        const rentTotal = sumScheduleAmounts(effRows);
        const customRentNet = rentTotal - baseRentTotal;
        const insRows = Array.isArray(d.insuranceDepositItems) ? d.insuranceDepositItems : [];
        const insuranceLinesTotal = insRows.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
        const depositRefAmount = parseFloat(toStr(d.depositAmount)) || 0;
        const depositReceiptRef = toStr(d.depositReceiptRef);
        const graceDiscount = parseFloat(d.graceAmount) || 0;
        const legacyOtherDiscount = parseFloat(d.otherDiscountAmount) || 0;
        const extraRows = Array.isArray(d.extraAdjustments) ? d.extraAdjustments : [];
        const extraAdditions = extraRows
            .filter((x) => toStr(x.kind) === 'add')
            .reduce((s, x) => s + Math.max(0, computeExtraAdjustmentLineTotal(x, d)), 0);
        const extraDiscounts = extraRows
            .filter((x) => toStr(x.kind) === 'discount')
            .reduce((s, x) => s + Math.abs(Math.min(0, computeExtraAdjustmentLineTotal(x, d))), 0);
        const otherDiscount = legacyOtherDiscount + extraDiscounts;
        const totalDiscounts = graceDiscount + otherDiscount;
        const vatSubject = toStr(d.contractSubjectToVat) === 'yes';
        const vatMode = toStr(d.vatPaymentMode) || 'with_rent';
        const periodBreakdown = computeContractPeriodMonthsAndExtraDays(d.startDate, d.endDate, months);
        const vatMonthly = vatSubject ? computeContractMonthlyVatOm(monthly) : 0;
        const vatAnnual = vatSubject
            ? computeContractTotalVatOm(monthly, periodBreakdown.months || months, periodBreakdown.extraDays)
            : 0;
        const vatChequeRows = Array.isArray(d.vatChequeSchedule) ? d.vatChequeSchedule : [];
        let vatChequeTotal =
            vatSubject && vatMode === 'separate' ? sumVatChequeScheduleAmounts(vatChequeRows) : 0;
        if (vatSubject && vatMode === 'separate' && !vatChequeTotal && vatAnnual > 0) {
            vatChequeTotal = vatAnnual;
        }
        const vatChequeCount = Math.max(
            vatChequeRows.length,
            parseInt(toStr(d.vatChequeCount), 10) || 0
        );
        const vatIncludedInRent =
            vatSubject && vatMode === 'with_rent'
                ? computeContractTotalVatOm(monthly, periodBreakdown.months || months || 0, periodBreakdown.extraDays)
                : 0;
        const contractBeforeDiscount =
            rentTotal + municipal + (vatMode === 'separate' ? vatChequeTotal : 0);
        const contractBeforeFinalDiscount = contractBeforeDiscount + extraAdditions;
        const periodDays = computeContractPeriodDaysInclusive(d.startDate, d.endDate);
        return {
            months,
            periodDays,
            monthly,
            municipal,
            vatSubject,
            vatMode,
            vatMonthly,
            vatAnnual,
            vatChequeTotal,
            vatChequeCount,
            vatChequeRows,
            vatIncludedInRent,
            baseRentTotal,
            customRentNet,
            insuranceLinesTotal,
            depositRefAmount,
            depositReceiptRef,
            insuranceRows: insRows,
            rentTotal,
            graceDiscount,
            otherDiscount,
            extraRows,
            extraAdditions,
            extraDiscounts,
            totalDiscounts,
            contractBeforeDiscount,
            contractTotal: Math.max(0, contractBeforeFinalDiscount - totalDiscounts)
        };
    }

    function summaryAmtOm(n, sign) {
        const v = (parseFloat(n) || 0).toFixed(3);
        if (sign === '+') return `+${v} OMR`;
        if (sign === '-') return `-${v} OMR`;
        return `${v} OMR`;
    }

    function summaryLineHtml(label, value, kind) {
        const cls =
            kind === 'add' ? 'summary-line summary-line--add'
            : kind === 'discount' ? 'summary-line summary-line--discount'
            : kind === 'total' ? 'summary-line summary-line--total'
            : 'summary-line';
        return `<div class="${cls}"><span class="summary-line-label">${label}</span><span class="summary-line-value">${value}</span></div>`;
    }

    function getSummaryAccordionOpenState() {
        const panel = document.getElementById('smartSummary');
        if (!panel) return {};
        const state = {};
        panel.querySelectorAll('[data-summary-section]').forEach((sec) => {
            const id = sec.getAttribute('data-summary-section');
            const body = document.getElementById(`summarySec_${id}`);
            if (id && body) state[id] = !body.hidden;
        });
        return state;
    }

    function toggleSummaryAccordion(sectionId) {
        const body = document.getElementById(`summarySec_${sectionId}`);
        const btn = document.querySelector(`[data-summary-toggle="${sectionId}"]`);
        if (!body) return;
        const willOpen = body.hidden;
        body.hidden = !willOpen;
        if (btn) {
            btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
            const ch = btn.querySelector('.summary-section-chevron');
            if (ch) ch.textContent = willOpen ? '▼' : '▶';
        }
    }

    function buildFinancialSummarySectionsHtml(s, opts = {}) {
        const forPrint = opts.forPrint === true;
        const openState = opts.openState || {};
        const brt = s.baseRentTotal !== undefined ? s.baseRentTotal : s.rentTotal - (s.customRentNet || 0);
        const csign = (s.customRentNet || 0) >= 0 ? '+' : '';
        const depRec = toStr(s.depositReceiptRef);
        const vatSeparateAdd = s.vatSubject && s.vatMode === 'separate' ? (s.vatChequeTotal || 0) : 0;
        const duesSub =
            (s.rentTotal || 0) + (s.municipal || 0) + (s.extraAdditions || 0) + vatSeparateAdd;
        const periodText = `${escHtml(formatContractPeriodBilingual(document.getElementById('startDate')?.value, document.getElementById('endDate')?.value, s.months))}${s.periodDays ? ` (${s.periodDays} ${t('يوم إجمالي', 'total days')})` : ''}`;

        const rentLines = [
            summaryLineHtml(t('الإيجار الشهري / Monthly rent', 'Monthly rent / الإيجار الشهري'), summaryAmtOm(s.monthly)),
            summaryLineHtml(t('مدة العقد / Contract period', 'Contract period / مدة العقد'), periodText),
            summaryLineHtml(t('إجمالي الإيجار (أساسي) / Base rent total', 'Base rent total / إجمالي الإيجار (أساسي)'), summaryAmtOm(brt)),
            summaryLineHtml(
                t('تعديل إيجار مخصص (صافي) / Custom rent adjustment', 'Custom rent adjustment / تعديل إيجار مخصص'),
                `${csign}${(s.customRentNet || 0).toFixed(3)} OMR`,
                (s.customRentNet || 0) >= 0 ? 'add' : 'discount'
            ),
            summaryLineHtml(t('إجمالي الإيجار (بعد المخصص) / Rent total', 'Rent total / إجمالي الإيجار'), summaryAmtOm(s.rentTotal), 'total')
        ].join('');

        const vatLines = [];
        if (s.vatSubject) {
            if (s.vatMode === 'with_rent') {
                vatLines.push(
                    summaryLineHtml(
                        t('الضريبة المضافة (5%) / VAT (5%)', 'VAT (5%) / الضريبة المضافة'),
                        `${t('مع الإيجار الشهري', 'With monthly rent')} — ${summaryAmtOm(s.vatMonthly)}/${t('شهر', 'month')}`
                    ),
                    summaryLineHtml(
                        t('الإيجار الشهري شامل الضريبة / Monthly rent incl. VAT', 'Monthly rent incl. VAT / الإيجار شامل الضريبة'),
                        summaryAmtOm((s.monthly || 0) + (s.vatMonthly || 0))
                    ),
                    summaryLineHtml(
                        t('إجمالي الضريبة المضمّنة في الإيجار / Total VAT in rent', 'Total VAT in rent / إجمالي الضريبة في الإيجار'),
                        summaryAmtOm(s.vatIncludedInRent || 0),
                        'add'
                    )
                );
            } else {
                vatLines.push(
                    summaryLineHtml(
                        t('الضريبة المضافة (5%) / VAT (5%)', 'VAT (5%) / الضريبة المضافة'),
                        `${t('شيكات منفصلة', 'Separate cheques')} — ${summaryAmtOm(s.vatAnnual)}/${t('سنة', 'year')}`
                    ),
                    summaryLineHtml(
                        t('عدد شيكات الضريبة / VAT cheque count', 'VAT cheque count / عدد شيكات الضريبة'),
                        String(s.vatChequeCount || (s.vatChequeRows || []).length || 0)
                    ),
                    summaryLineHtml(
                        t('إجمالي شيكات الضريبة / VAT cheques total', 'VAT cheques total / إجمالي شيكات الضريبة'),
                        summaryAmtOm(s.vatChequeTotal || 0),
                        'add'
                    )
                );
                if ((s.vatChequeRows || []).length) {
                    const chequeList = (s.vatChequeRows || [])
                        .slice()
                        .sort((a, b) => (a.chequeIndex || 0) - (b.chequeIndex || 0))
                        .map((r) => {
                            const amt = summaryAmtOm(r.amount);
                            const dt = toStr(r.dueDate) ? escHtml(toStr(r.dueDate)) : '—';
                            return `<div class="summary-line"><span class="summary-line-label">${t('شيك', 'Cheque')} ${r.chequeIndex || 0} — ${dt}</span><span class="summary-line-value">${amt}</span></div>`;
                        })
                        .join('');
                    vatLines.push(`<div class="summary-sublist">${chequeList}</div>`);
                }
            }
        } else {
            vatLines.push(summaryLineHtml(t('لا توجد ضريبة مضافة / No VAT', 'No VAT / لا توجد ضريبة'), '—'));
        }

        const hasInsuranceBreakdown = Array.isArray(s.insuranceRows) && s.insuranceRows.length > 0 && (parseFloat(s.insuranceLinesTotal) || 0) > 0;
        const feesLines = [
            summaryLineHtml(
                t('رسوم البلدية (3%) / Municipal fees', 'Municipal fees (3%) / رسوم البلدية'),
                summaryAmtOm(s.municipal),
                'add'
            ),
            summaryLineHtml(
                t('مبلغ التأمين (نقدي) / Cash insurance deposit', 'Cash insurance deposit / مبلغ التأمين النقدي'),
                summaryAmtOm(s.depositRefAmount || 0)
            ),
            depRec
                ? summaryLineHtml(t('رقم الإيصال / Receipt no.', 'Receipt no. / رقم الإيصال'), escHtml(depRec))
                : '',
            hasInsuranceBreakdown
                ? summaryLineHtml(
                      t('بنود التأمين النقدية (مجموع) / Insurance lines total', 'Insurance lines total / بنود التأمين'),
                      summaryAmtOm(s.insuranceLinesTotal || 0)
                  )
                : ''
        ].filter(Boolean);
        const extraAddRows = [];
        const extraDiscRows = [];
        (s.extraRows || []).forEach((x) => {
            const isAdd = toStr(x.kind) === 'add';
            const title = escHtml(toStr(x.title) || t('بدون عنوان', 'Untitled'));
            const line = summaryLineHtml(
                `${isAdd ? t('إضافة', 'Addition') : t('خصم', 'Discount')} — ${title}`,
                summaryAmtOm(x.amount, isAdd ? '+' : '-'),
                isAdd ? 'add' : 'discount'
            );
            if (isAdd) extraAddRows.push(line);
            else extraDiscRows.push(line);
        });
        feesLines.push(...extraAddRows);
        if ((s.extraAdditions || 0) > 0) {
            feesLines.push(
                summaryLineHtml(t('إجمالي الإضافات / Total additions', 'Total additions / إجمالي الإضافات'), summaryAmtOm(s.extraAdditions), 'add')
            );
        }
        feesLines.push(
            summaryLineHtml(
                t('مجموع المستحقات الأساسية / Subtotal', 'Subtotal / مجموع المستحقات'),
                summaryAmtOm(duesSub),
                'total'
            )
        );

        const legacyOtherDisc = Math.max(0, (s.otherDiscount || 0) - (s.extraDiscounts || 0));
        const discountLines = [
            summaryLineHtml(t('خصم فترة السماح / Grace discount', 'Grace discount / خصم السماح'), summaryAmtOm(s.graceDiscount), 'discount'),
            ...extraDiscRows,
            legacyOtherDisc > 0
                ? summaryLineHtml(
                      t('خصومات أخرى / Other discounts', 'Other discounts / خصومات أخرى'),
                      summaryAmtOm(legacyOtherDisc),
                      'discount'
                  )
                : '',
            summaryLineHtml(t('إجمالي الخصومات / Total discounts', 'Total discounts / إجمالي الخصومات'), summaryAmtOm(s.totalDiscounts), 'discount')
        ]
            .filter(Boolean)
            .join('');

        const grandLines = [
            summaryLineHtml(t('إجمالي الإيجار / Rent total', 'Rent total / إجمالي الإيجار'), summaryAmtOm(s.rentTotal)),
            summaryLineHtml(t('رسوم البلدية / Municipal fees', 'Municipal fees / رسوم البلدية'), summaryAmtOm(s.municipal)),
            vatSeparateAdd > 0
                ? summaryLineHtml(t('شيكات الضريبة المضافة / VAT cheques', 'VAT cheques / شيكات الضريبة'), summaryAmtOm(vatSeparateAdd), 'add')
                : '',
            s.vatSubject && s.vatMode === 'with_rent' && (s.vatIncludedInRent || 0) > 0
                ? summaryLineHtml(
                      t('(الضريبة مضمّنة في الإيجار) / (VAT in rent)', '(VAT in rent) / (الضريبة في الإيجار)'),
                      summaryAmtOm(s.vatIncludedInRent),
                      'add'
                  )
                : '',
            (s.extraAdditions || 0) > 0
                ? summaryLineHtml(t('إضافات أخرى / Other additions', 'Other additions / إضافات أخرى'), summaryAmtOm(s.extraAdditions), 'add')
                : '',
            summaryLineHtml(
                t('الإجمالي قبل الخصومات / Subtotal before discounts', 'Subtotal before discounts / الإجمالي قبل الخصومات'),
                summaryAmtOm(s.contractBeforeDiscount + s.extraAdditions)
            ),
            summaryLineHtml(
                t('إجمالي العقد التقديري (بعد الخصم) / Contract total', 'Contract total / إجمالي العقد'),
                summaryAmtOm(s.contractTotal),
                'total'
            )
        ]
            .filter(Boolean)
            .join('');

        const sections = [
            { id: 'rent', ar: '١ — الإيجارات / Rent', en: 'Rent / الإيجارات', body: rentLines },
            { id: 'vat', ar: '٢ — الضريبة المضافة / VAT', en: 'VAT / الضريبة المضافة', body: vatLines.join('') },
            {
                id: 'fees',
                ar: '٣ — الرسوم والتأمين والإضافات / Fees, deposit & additions',
                en: 'Fees, deposit & additions / الرسوم والتأمين والإضافات',
                body: feesLines.filter(Boolean).join('')
            },
            { id: 'discounts', ar: '٤ — الخصومات / Discounts', en: 'Discounts / الخصومات', body: discountLines },
            { id: 'grand', ar: '٥ — الإجمالي التقديري / Grand total', en: 'Grand total / الإجمالي', body: grandLines }
        ];

        return sections
            .map((sec) => {
                const expanded = forPrint ? true : openState[sec.id] !== false;
                if (forPrint) {
                    return `
                    <div class="summary-section" data-summary-section="${sec.id}">
                        <div class="summary-section-title-inline">${sec.ar}</div>
                        <div class="summary-section-body">${sec.body}</div>
                    </div>`;
                }
                return `
                <div class="summary-section" data-summary-section="${sec.id}">
                    <button type="button" class="summary-section-head" data-summary-toggle="${sec.id}" aria-expanded="${expanded ? 'true' : 'false'}" onclick="toggleSummaryAccordion('${sec.id}')">
                        <span class="summary-section-title">${sec.ar}</span>
                        <span class="summary-section-chevron" aria-hidden="true">${expanded ? '▼' : '▶'}</span>
                    </button>
                    <div class="summary-section-body" id="summarySec_${sec.id}" ${expanded ? '' : 'hidden'}>${sec.body}</div>
                </div>`;
            })
            .join('');
    }

    function finPrintTableRow(label, value, kind) {
        const rowCls =
            kind === 'add'
                ? 'fin-row--add'
                : kind === 'discount'
                  ? 'fin-row--discount'
                  : kind === 'total'
                    ? 'fin-row--total'
                    : kind === 'grand'
                      ? 'fin-row--grand'
                      : '';
        return `<tr class="${rowCls}"><td class="fin-col-label">${label}</td><td class="fin-col-value">${value}</td></tr>`;
    }

    function finPrintSectionTable(title, rowsHtml) {
        if (!toStr(rowsHtml).trim()) return '';
        return `
            <div class="fin-print-section">
                <div class="fin-print-section-title">${title}</div>
                <table class="fin-print-table" role="presentation">
                    <thead>
                        <tr>
                            <th>${t('البند / Item', 'Item / البند')}</th>
                            <th>${t('القيمة / Value', 'Value / القيمة')}</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>`;
    }

    function buildFinancialSummaryPrintTablesHtml(s, opts = {}) {
        const renewalReceipt = opts.renewalReceipt === true || s.isRenewalReceipt === true;
        const brt = s.baseRentTotal !== undefined ? s.baseRentTotal : s.rentTotal - (s.customRentNet || 0);
        const csign = (s.customRentNet || 0) >= 0 ? '+' : '';
        const depRec = toStr(s.depositReceiptRef);
        const vatSeparateAdd = s.vatSubject && s.vatMode === 'separate' ? s.vatChequeTotal || 0 : 0;
        const duesSub =
            (s.rentTotal || 0) + (s.municipal || 0) + (s.extraAdditions || 0) + vatSeparateAdd;
        const periodStart = opts.startDate || document.getElementById('startDate')?.value;
        const periodEnd = opts.endDate || document.getElementById('endDate')?.value;
        const periodText = `${escHtml(formatContractPeriodBilingual(periodStart, periodEnd, s.months))}${s.periodDays ? ` (${s.periodDays} ${t('يوم إجمالي', 'total days')})` : ''}`;
        const renewalCompareHtml =
            renewalReceipt && opts.payload
                ? buildRenewalRentComparisonSectionHtml(opts.payload, s)
                : '';

        const rentRows = [
            finPrintTableRow(t('الإيجار الشهري / Monthly rent', 'Monthly rent / الإيجار الشهري'), summaryAmtOm(s.monthly)),
            finPrintTableRow(t('مدة العقد / Contract period', 'Contract period / مدة العقد'), periodText),
            finPrintTableRow(
                t('إجمالي الإيجار (أساسي) / Base rent total', 'Base rent total / إجمالي الإيجار (أساسي)'),
                summaryAmtOm(brt)
            ),
            finPrintTableRow(
                t('تعديل إيجار مخصص (صافي) / Custom rent adjustment', 'Custom rent adjustment / تعديل إيجار مخصص'),
                `${csign}${(s.customRentNet || 0).toFixed(3)} OMR`,
                (s.customRentNet || 0) >= 0 ? 'add' : 'discount'
            ),
            finPrintTableRow(
                t('إجمالي الإيجار (بعد المخصص) / Rent total', 'Rent total / إجمالي الإيجار'),
                summaryAmtOm(s.rentTotal),
                'total'
            )
        ].join('');

        const vatRows = [];
        if (s.vatSubject) {
            if (s.vatMode === 'with_rent') {
                vatRows.push(
                    finPrintTableRow(
                        t('الضريبة المضافة (5%) / VAT (5%)', 'VAT (5%) / الضريبة المضافة'),
                        `${t('مع الإيجار الشهري', 'With monthly rent')} — ${summaryAmtOm(s.vatMonthly)}/${t('شهر', 'month')}`
                    ),
                    finPrintTableRow(
                        t('الإيجار الشهري شامل الضريبة / Monthly rent incl. VAT', 'Monthly rent incl. VAT / الإيجار شامل الضريبة'),
                        summaryAmtOm((s.monthly || 0) + (s.vatMonthly || 0))
                    ),
                    finPrintTableRow(
                        t('إجمالي الضريبة المضمّنة في الإيجار / Total VAT in rent', 'Total VAT in rent / إجمالي الضريبة في الإيجار'),
                        summaryAmtOm(s.vatIncludedInRent || 0),
                        'add'
                    )
                );
            } else {
                vatRows.push(
                    finPrintTableRow(
                        t('الضريبة المضافة (5%) / VAT (5%)', 'VAT (5%) / الضريبة المضافة'),
                        `${t('شيكات منفصلة', 'Separate cheques')} — ${summaryAmtOm(s.vatAnnual)}/${t('سنة', 'year')}`
                    ),
                    finPrintTableRow(
                        t('عدد شيكات الضريبة / VAT cheque count', 'VAT cheque count / عدد شيكات الضريبة'),
                        String(s.vatChequeCount || (s.vatChequeRows || []).length || 0)
                    ),
                    finPrintTableRow(
                        t('إجمالي شيكات الضريبة / VAT cheques total', 'VAT cheques total / إجمالي شيكات الضريبة'),
                        summaryAmtOm(s.vatChequeTotal || 0),
                        'add'
                    )
                );
                (s.vatChequeRows || [])
                    .slice()
                    .sort((a, b) => (a.chequeIndex || 0) - (b.chequeIndex || 0))
                    .forEach((r) => {
                        if (opts.omitVatChequeLineItems) return;
                        const dt = toStr(r.dueDate) ? escHtml(toStr(r.dueDate)) : '—';
                        vatRows.push(
                            finPrintTableRow(
                                `${t('شيك ضريبة / VAT cheque', 'VAT cheque / شيك ضريبة')} ${r.chequeIndex || 0} — ${dt}`,
                                summaryAmtOm(r.amount)
                            )
                        );
                    });
            }
        } else {
            vatRows.push(finPrintTableRow(t('لا توجد ضريبة مضافة / No VAT', 'No VAT / لا توجد ضريبة'), '—'));
        }

        const feesRows = [
            finPrintTableRow(
                t('رسوم البلدية (3%) / Municipal fees', 'Municipal fees (3%) / رسوم البلدية'),
                summaryAmtOm(s.municipal),
                'add'
            )
        ];
        if (!renewalReceipt) {
            feesRows.push(
                finPrintTableRow(
                    t('مبلغ التأمين (نقدي) / Cash insurance deposit', 'Cash insurance deposit / مبلغ التأمين النقدي'),
                    summaryAmtOm(s.depositRefAmount || 0)
                )
            );
            if (depRec) {
                feesRows.push(
                    finPrintTableRow(t('رقم الإيصال / Receipt no.', 'Receipt no. / رقم الإيصال'), escHtml(depRec))
                );
            }
            const hasInsuranceBreakdown =
                Array.isArray(s.insuranceRows) &&
                s.insuranceRows.length > 0 &&
                (parseFloat(s.insuranceLinesTotal) || 0) > 0;
            if (hasInsuranceBreakdown) {
                feesRows.push(
                    finPrintTableRow(
                        t('بنود التأمين النقدية (مجموع) / Insurance lines total', 'Insurance lines total / بنود التأمين'),
                        summaryAmtOm(s.insuranceLinesTotal || 0)
                    )
                );
            }
        }
        const extraDiscRows = [];
        (s.extraRows || []).forEach((x) => {
            const isAdd = toStr(x.kind) === 'add';
            const title = escHtml(toStr(x.title) || t('بدون عنوان', 'Untitled'));
            const row = finPrintTableRow(
                `${isAdd ? t('إضافة', 'Addition') : t('خصم', 'Discount')} — ${title}`,
                summaryAmtOm(x.amount, isAdd ? '+' : '-'),
                isAdd ? 'add' : 'discount'
            );
            if (isAdd) feesRows.push(row);
            else extraDiscRows.push(row);
        });
        if ((s.extraAdditions || 0) > 0) {
            feesRows.push(
                finPrintTableRow(
                    t('إجمالي الإضافات / Total additions', 'Total additions / إجمالي الإضافات'),
                    summaryAmtOm(s.extraAdditions),
                    'add'
                )
            );
        }
        feesRows.push(
            finPrintTableRow(
                t('مجموع المستحقات الأساسية / Subtotal', 'Subtotal / مجموع المستحقات'),
                summaryAmtOm(duesSub),
                'total'
            )
        );

        const legacyOtherDisc = Math.max(0, (s.otherDiscount || 0) - (s.extraDiscounts || 0));
        const discountRowParts = [];
        if (!renewalReceipt || (s.graceDiscount || 0) > 0) {
            discountRowParts.push(
                finPrintTableRow(
                    renewalReceipt
                        ? t(
                              'خصم فترة السماح (التجديد) / Grace discount (renewal)',
                              'Grace discount (renewal) / خصم فترة السماح'
                          )
                        : t('خصم فترة السماح / Grace discount', 'Grace discount / خصم السماح'),
                    summaryAmtOm(s.graceDiscount),
                    'discount'
                )
            );
        }
        discountRowParts.push(...extraDiscRows);
        if (legacyOtherDisc > 0) {
            discountRowParts.push(
                finPrintTableRow(
                    t('خصومات أخرى / Other discounts', 'Other discounts / خصومات أخرى'),
                    summaryAmtOm(legacyOtherDisc),
                    'discount'
                )
            );
        }
        if ((s.totalDiscounts || 0) > 0) {
            discountRowParts.push(
                finPrintTableRow(
                    t('إجمالي الخصومات / Total discounts', 'Total discounts / إجمالي الخصومات'),
                    summaryAmtOm(s.totalDiscounts),
                    'discount'
                )
            );
        }
        const discountRows = discountRowParts.filter(Boolean).join('');
        const feesSectionTitle = renewalReceipt
            ? t('٣ — الرسوم والإضافات / Fees & additions', 'Fees & additions / الرسوم والإضافات')
            : t(
                  '٣ — الرسوم والتأمين والإضافات / Fees, deposit & additions',
                  'Fees, deposit & additions / الرسوم والتأمين والإضافات'
              );
        const discountSectionHtml =
            discountRows.trim() !== ''
                ? finPrintSectionTable(t('٤ — الخصومات / Discounts', 'Discounts / الخصومات'), discountRows)
                : renewalReceipt
                  ? ''
                  : finPrintSectionTable(t('٤ — الخصومات / Discounts', 'Discounts / الخصومات'), discountRows);

        const grandRows = [
            finPrintTableRow(t('إجمالي الإيجار / Rent total', 'Rent total / إجمالي الإيجار'), summaryAmtOm(s.rentTotal)),
            finPrintTableRow(t('رسوم البلدية / Municipal fees', 'Municipal fees / رسوم البلدية'), summaryAmtOm(s.municipal)),
            vatSeparateAdd > 0
                ? finPrintTableRow(
                      t('شيكات الضريبة المضافة / VAT cheques', 'VAT cheques / شيكات الضريبة'),
                      summaryAmtOm(vatSeparateAdd),
                      'add'
                  )
                : '',
            s.vatSubject && s.vatMode === 'with_rent' && (s.vatIncludedInRent || 0) > 0
                ? finPrintTableRow(
                      t('(الضريبة مضمّنة في الإيجار) / (VAT in rent)', '(VAT in rent) / (الضريبة في الإيجار)'),
                      summaryAmtOm(s.vatIncludedInRent),
                      'add'
                  )
                : '',
            (s.extraAdditions || 0) > 0
                ? finPrintTableRow(
                      t('إضافات أخرى / Other additions', 'Other additions / إضافات أخرى'),
                      summaryAmtOm(s.extraAdditions),
                      'add'
                  )
                : '',
            finPrintTableRow(
                t('الإجمالي قبل الخصومات / Subtotal before discounts', 'Subtotal before discounts / الإجمالي قبل الخصومات'),
                summaryAmtOm(s.contractBeforeDiscount + s.extraAdditions)
            ),
            finPrintTableRow(
                t('إجمالي العقد التقديري (بعد الخصم) / Contract total', 'Contract total / إجمالي العقد'),
                summaryAmtOm(s.contractTotal),
                'grand'
            )
        ]
            .filter(Boolean)
            .join('');

        return (
            renewalCompareHtml +
            finPrintSectionTable(t('١ — الإيجارات / Rent', 'Rent / الإيجارات'), rentRows) +
            finPrintSectionTable(t('٢ — الضريبة المضافة / VAT', 'VAT / الضريبة المضافة'), vatRows.join('')) +
            finPrintSectionTable(feesSectionTitle, feesRows.join('')) +
            discountSectionHtml +
            finPrintSectionTable(t('٥ — الإجمالي التقديري / Grand total', 'Grand total / الإجمالي'), grandRows) +
            (opts.omitPaymentSchedule ? '' : buildFinancialPaymentSchedulePrintTableHtml(opts.paymentSchedule))
        );
    }

    function buildFinancialPaymentSchedulePrintTableHtml(rowsOpt) {
        let rows = Array.isArray(rowsOpt) ? rowsOpt : [];
        if (!rows.length) {
            try {
                rows = getPaymentScheduleFromUi();
            } catch (_ePs) {
                rows = [];
            }
        }
        if (!rows.length) return '';
        const body = rows
            .slice()
            .sort((a, b) => (a.monthIndex || 0) - (b.monthIndex || 0))
            .map((r) => {
                const m = r.monthIndex || 0;
                const due = escHtml(toStr(r.dueDate) || '—');
                const amt = escHtml(summaryAmtOm(r.amount));
                const chk = escHtml(toStr(r.checkNo) || '—');
                const att =
                    toStr(r.checkAttachmentName) ||
                    toStr(r.attachmentName) ||
                    toStr(r.checkAttachmentRelativePath) ||
                    toStr(r.attachmentRelativePath)
                        ? '✓'
                        : '—';
                return `<tr>
                    <td style="text-align:center;font-weight:700">${m}</td>
                    <td style="text-align:center">${due}</td>
                    <td style="text-align:end;font-weight:700">${amt}</td>
                    <td style="text-align:center">${chk}</td>
                    <td style="text-align:center">${att}</td>
                </tr>`;
            })
            .join('');
        return `
            <div class="fin-print-section fin-print-schedule">
                <div class="fin-print-section-title">${t('٦ — جدول الدفع الشهري / Monthly payment schedule', 'Monthly payment schedule / جدول الدفع الشهري')}</div>
                <table class="fin-print-table" role="presentation">
                    <thead>
                        <tr>
                            <th>${t('الشهر / Month', 'Month / الشهر')}</th>
                            <th>${t('تاريخ الاستحقاق / Due date', 'Due date / تاريخ الاستحقاق')}</th>
                            <th>${t('المبلغ / Amount', 'Amount / المبلغ')}</th>
                            <th>${t('رقم الشيك / Cheque no.', 'Cheque no. / رقم الشيك')}</th>
                            <th>${t('مرفق / Att.', 'Att. / مرفق')}</th>
                        </tr>
                    </thead>
                    <tbody>${body}</tbody>
                </table>
            </div>`;
    }

    function buildContractFinancialReceiptHtml() {
        let s;
        try {
            s = getSmartTotals();
        } catch (_e) {
            return '';
        }
        const ag = escHtml(toStr(document.getElementById('agreementNo')?.value) || '—');
        const tenant = escHtml(toStr(document.getElementById('tenantNameAr')?.value) || '—');
        const building = escHtml(toStr(document.getElementById('buildingNo')?.value) || '—');
        const unit = escHtml(toStr(document.getElementById('flatNo')?.value) || '—');
        const tables = buildFinancialSummaryPrintTablesHtml(s);
        return `
            <div class="contract-financial-receipt" aria-label="Financial receipt / إيصال مالي">
                <div class="contract-financial-receipt-title">${t('إيصال مالي ملحق بالعقد / Contract financial receipt', 'Contract financial receipt / إيصال مالي ملحق')}</div>
                <table class="fin-print-meta" role="presentation">
                    <tr><td>${t('رقم العقد / Agreement no.', 'Agreement no. / رقم العقد')}</td><td>${ag}</td></tr>
                    <tr><td>${t('المستأجر / Tenant', 'Tenant / المستأجر')}</td><td>${tenant}</td></tr>
                    <tr><td>${t('المبنى / الوحدة / Building / Unit', 'Building / Unit / المبنى / الوحدة')}</td><td>${building} — ${unit}</td></tr>
                </table>
                ${tables}
            </div>`;
    }

    function updateSummaryPanel() {
        let s;
        try {
            s = getSmartTotals();
        } catch (e) {
            console.error('updateSummaryPanel / getSmartTotals failed:', e);
            return;
        }
        const panel = document.getElementById('smartSummary');
        if (!panel) return;
        const openState = getSummaryAccordionOpenState();
        const sections = buildFinancialSummarySectionsHtml(s, { openState });
        const linkedUnits = getLinkedContractUnitsFromForm();
        const linkedBlock =
            linkedUnits.length > 1
                ? `<div style="margin-bottom:10px;padding:10px;border:1px solid #dfe7ee;border-radius:8px;background:#f8fbfd;font-size:12px">
            <b>${t('وحدات مرتبطة:', 'Linked units:')}</b> ${escHtml(linkedUnits.map((u) => u.unit).join(', '))}
            <span style="margin-inline-start:8px;color:#555">(${linkedUnits.length} ${t('وحدات', 'units')})</span>
        </div>`
                : '';
        panel.innerHTML = `
            <div class="smart-summary-header">${t('ملخص مالي للعقد / Contract financial summary', 'Contract financial summary / ملخص مالي للعقد')}</div>
            ${linkedBlock}
            <div class="summary-accordion">${sections}</div>
        `;
        try {
            refreshLinkedContractUnitsPanel();
        } catch (_eLnk) {}
    }

    function normalizeExtraAdjustmentRow(x) {
        const row = x && typeof x === 'object' ? { ...x } : {};
        return {
            id: toStr(row.id) || `extra_${Date.now()}`,
            kind: toStr(row.kind) === 'add' ? 'add' : 'discount',
            title: toStr(row.title),
            amount: toStr(row.amount || '0'),
            recurrence: ['one_time', 'with_renewal', 'every_3_months', 'monthly', 'custom'].includes(toStr(row.recurrence))
                ? toStr(row.recurrence)
                : 'one_time',
            durationScope: ['contract_end', 'one_year', 'custom_months'].includes(toStr(row.durationScope))
                ? toStr(row.durationScope)
                : 'contract_end',
            durationMonths: Math.max(1, parseInt(toStr(row.durationMonths), 10) || 12),
            effectiveFrom: toStr(row.effectiveFrom)
        };
    }

    function computeExtraAdjustmentApplicableMonths(item, contractStart, contractEnd, contractMonths) {
        const rec = toStr(item.recurrence) || 'one_time';
        if (rec === 'one_time' || rec === 'with_renewal') return 0;
        const from = toStr(item.effectiveFrom) || toStr(contractStart);
        const end = toStr(contractEnd);
        const scope = toStr(item.durationScope) || 'contract_end';
        if (scope === 'custom_months') {
            return Math.max(1, parseInt(toStr(item.durationMonths), 10) || 1);
        }
        if (scope === 'one_year') {
            const fromDate = parseYmdToLocalDate(from);
            const endDate = parseYmdToLocalDate(end);
            if (fromDate && endDate) {
                const yearEnd = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
                yearEnd.setFullYear(yearEnd.getFullYear() + 1);
                yearEnd.setDate(yearEnd.getDate() - 1);
                const cappedEnd = endDate < yearEnd ? endDate : yearEnd;
                const period = computeContractPeriodMonthsAndExtraDays(from, formatDateYmdLocal(cappedEnd), 0);
                return Math.max(1, period.months || 1);
            }
            return Math.min(12, Math.max(1, parseInt(toStr(contractMonths), 10) || 12));
        }
        if (from && end) {
            const period = computeContractPeriodMonthsAndExtraDays(from, end, 0);
            return Math.max(1, period.months || parseInt(toStr(contractMonths), 10) || 1);
        }
        return Math.max(1, parseInt(toStr(contractMonths), 10) || 12);
    }

    function computeExtraAdjustmentLineTotal(item, contractData) {
        const amount = parseFloat(item.amount) || 0;
        if (amount <= 0) return 0;
        const sign = toStr(item.kind) === 'discount' ? -1 : 1;
        const rec = toStr(item.recurrence) || 'one_time';
        if (rec === 'with_renewal') return 0;
        if (rec === 'one_time') return sign * amount;
        const months =
            parseInt(toStr(contractData.contractMonths), 10) ||
            computeContractPeriodMonthsAndExtraDays(
                contractData.startDate,
                contractData.endDate,
                contractData.contractMonths
            ).months ||
            12;
        const applicableMonths = computeExtraAdjustmentApplicableMonths(
            item,
            contractData.startDate,
            contractData.endDate,
            months
        );
        if (rec === 'every_3_months') {
            return sign * amount * Math.ceil(applicableMonths / 3);
        }
        if (rec === 'monthly' || rec === 'custom') {
            return sign * amount * applicableMonths;
        }
        return sign * amount;
    }

    function extraAdjustmentRecurrenceLabel(rec) {
        const map = {
            one_time: t('مرة واحدة / One-time', 'One-time / مرة واحدة'),
            with_renewal: t('مع التجديد / With renewal', 'With renewal / مع التجديد'),
            every_3_months: t('كل 3 أشهر / Every 3 months', 'Every 3 months / كل 3 أشهر'),
            monthly: t('شهري / Monthly', 'Monthly / شهري'),
            custom: t('طريقة أخرى / Other', 'Other / طريقة أخرى')
        };
        return map[rec] || map.one_time;
    }

    function getExtraAdjustmentsFromUi() {
        const list = document.getElementById('extraAdjustmentsList');
        if (!list) return [];
        const rows = [...list.querySelectorAll('[data-extra-row]')];
        return rows
            .map((row) =>
                normalizeExtraAdjustmentRow({
                    id: toStr(row.getAttribute('data-extra-row')),
                    kind: toStr(row.querySelector('[data-extra-kind]')?.value),
                    title: toStr(row.querySelector('[data-extra-title]')?.value),
                    amount: toStr(row.querySelector('[data-extra-amount]')?.value || '0'),
                    recurrence: toStr(row.querySelector('[data-extra-recurrence]')?.value),
                    durationScope: toStr(row.querySelector('[data-extra-duration-scope]')?.value),
                    durationMonths: toStr(row.querySelector('[data-extra-duration-months]')?.value),
                    effectiveFrom: toStr(row.querySelector('[data-extra-effective-from]')?.value)
                })
            )
            .filter((x) => x.title || (parseFloat(x.amount) || 0) > 0);
    }

    function onExtraAdjustmentFieldChange() {
        try {
            updateSummaryPanel();
        } catch (_eExtraCh) {}
    }

    function renderExtraAdjustmentsRows(rows = []) {
        const list = document.getElementById('extraAdjustmentsList');
        if (!list) return;
        const normalized = (Array.isArray(rows) ? rows : []).map(normalizeExtraAdjustmentRow);
        list.innerHTML = normalized
            .map((x, idx) => {
            const id = escHtml(toStr(x.id) || `extra_${Date.now()}_${idx}`);
            const kind = toStr(x.kind) === 'add' ? 'add' : 'discount';
            const title = escHtml(toStr(x.title));
            const amount = escHtml(toStr(x.amount || '0'));
            const rec = x.recurrence;
            const scope = x.durationScope;
            const durMonths = escHtml(String(x.durationMonths || 12));
            const effFrom = escHtml(toStr(x.effectiveFrom));
            const showDuration = rec !== 'one_time' && rec !== 'with_renewal';
            return `
                <div data-extra-row="${id}" style="display:flex;flex-direction:column;gap:8px;padding:10px;border:1px solid #dfe7ee;border-radius:8px;background:#fafcff">
                    <div style="display:grid;grid-template-columns:140px 1fr 140px auto;gap:8px;align-items:center">
                        <select data-extra-kind onchange="onExtraAdjustmentFieldChange()">
                            <option value="discount" ${kind === 'discount' ? 'selected' : ''}>${t('خصم / Discount', 'Discount / خصم')}</option>
                            <option value="add" ${kind === 'add' ? 'selected' : ''}>${t('إضافة / Addition', 'Addition / إضافة')}</option>
                        </select>
                        <input type="text" data-extra-title value="${title}" placeholder="${escHtml(t('عنوان البند / Item title', 'Item title / عنوان البند'))}" oninput="onExtraAdjustmentFieldChange()">
                        <input type="number" data-extra-amount min="0" step="0.001" value="${amount}" placeholder="0.000" oninput="onExtraAdjustmentFieldChange()">
                        <button type="button" class="mini-btn" onclick="removeExtraAdjustmentRow('${id}')">✖</button>
                    </div>
                    <div style="display:grid;grid-template-columns:minmax(160px,1fr) minmax(160px,1fr) minmax(140px,1fr) minmax(120px,1fr);gap:8px;align-items:end">
                        <div>
                            <small style="display:block;font-size:10px;margin-bottom:3px;color:#555">${t('التكرار / Recurrence', 'Recurrence / التكرار')}</small>
                            <select data-extra-recurrence onchange="renderExtraAdjustmentsRows(getExtraAdjustmentsFromUi())">
                                <option value="one_time" ${rec === 'one_time' ? 'selected' : ''}>${extraAdjustmentRecurrenceLabel('one_time')}</option>
                                <option value="with_renewal" ${rec === 'with_renewal' ? 'selected' : ''}>${extraAdjustmentRecurrenceLabel('with_renewal')}</option>
                                <option value="every_3_months" ${rec === 'every_3_months' ? 'selected' : ''}>${extraAdjustmentRecurrenceLabel('every_3_months')}</option>
                                <option value="monthly" ${rec === 'monthly' ? 'selected' : ''}>${extraAdjustmentRecurrenceLabel('monthly')}</option>
                                <option value="custom" ${rec === 'custom' ? 'selected' : ''}>${extraAdjustmentRecurrenceLabel('custom')}</option>
                            </select>
                        </div>
                        <div style="display:${showDuration ? '' : 'none'}">
                            <small style="display:block;font-size:10px;margin-bottom:3px;color:#555">${t('مدة الحساب / Calculation period', 'Calculation period / مدة الحساب')}</small>
                            <select data-extra-duration-scope onchange="onExtraAdjustmentFieldChange()" ${showDuration ? '' : 'disabled'}>
                                <option value="contract_end" ${scope === 'contract_end' ? 'selected' : ''}>${t('حتى نهاية العقد / Until contract end', 'Until contract end / حتى نهاية العقد')}</option>
                                <option value="one_year" ${scope === 'one_year' ? 'selected' : ''}>${t('حتى سنة / Until 1 year', 'Until 1 year / حتى سنة')}</option>
                                <option value="custom_months" ${scope === 'custom_months' ? 'selected' : ''}>${t('مدة مخصصة (أشهر) / Custom months', 'Custom months / مدة مخصصة')}</option>
                            </select>
                        </div>
                        <div style="display:${showDuration && scope === 'custom_months' ? '' : 'none'}">
                            <small style="display:block;font-size:10px;margin-bottom:3px;color:#555">${t('عدد الأشهر / Months', 'Months / عدد الأشهر')}</small>
                            <input type="number" data-extra-duration-months min="1" max="1200" value="${durMonths}" oninput="onExtraAdjustmentFieldChange()" ${showDuration && scope === 'custom_months' ? '' : 'disabled'}>
                        </div>
                        <div style="display:${showDuration ? '' : 'none'}">
                            <small style="display:block;font-size:10px;margin-bottom:3px;color:#555">${t('يبدأ من / Effective from', 'Effective from / يبدأ من')}</small>
                            <input type="date" data-extra-effective-from value="${effFrom}" onchange="onExtraAdjustmentFieldChange()" ${showDuration ? '' : 'disabled'}>
                        </div>
                    </div>
                </div>
            `;
        })
            .join('');
        localizeBilingualUi();
        updateSummaryPanel();
    }

    function addExtraAdjustmentRow() {
        const rows = getExtraAdjustmentsFromUi();
        rows.push(
            normalizeExtraAdjustmentRow({
                id: `extra_${Date.now()}`,
                kind: 'add',
                title: '',
                amount: '0',
                recurrence: 'one_time'
            })
        );
        renderExtraAdjustmentsRows(rows);
    }

    function removeExtraAdjustmentRow(id) {
        const rows = getExtraAdjustmentsFromUi().filter((x) => toStr(x.id) !== toStr(id));
        renderExtraAdjustmentsRows(rows);
    }


    function getInsuranceDepositItemsFromUi() {
        const list = document.getElementById('insuranceDepositItemsList');
        if (!list) return [];
        return [...list.querySelectorAll('[data-insurance-row]')].map((row) => ({
            id: toStr(row.getAttribute('data-insurance-row')),
            payType: toStr(row.querySelector('[data-insurance-paytype]')?.value) || 'other',
            amount: toStr(row.querySelector('[data-insurance-amount]')?.value || '0'),
            reference: toStr(row.querySelector('[data-insurance-ref]')?.value),
            attachmentName: toStr(row.dataset.attachmentName),
            attachmentDataUrl: row.dataset.storedOnDisk === '1' ? '' : toStr(row.dataset.attachmentDataUrl),
            attachmentRelativePath: toStr(row.dataset.attachmentRelativePath),
            attachmentFileId: toStr(row.dataset.attachmentFileId),
            storedOnDisk: row.dataset.storedOnDisk === '1'
        }));
    }

    function renderInsuranceDepositItemsRows(rows = []) {
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
                    <input type="text" data-insurance-ref value="${reference}" placeholder="${escHtml(t('رقم الشيك أو الإيصال / Cheque or receipt no.', 'Cheque or receipt no. / رقم'))}" onblur="if(contractAdditionalDataMode)applyContractAdditionalDataFieldLocks()">
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
            if (toStr(item.attachmentDataUrl) && !item.storedOnDisk) row.dataset.attachmentDataUrl = toStr(item.attachmentDataUrl);
            if (toStr(item.attachmentRelativePath)) row.dataset.attachmentRelativePath = toStr(item.attachmentRelativePath);
            if (toStr(item.attachmentFileId)) row.dataset.attachmentFileId = toStr(item.attachmentFileId);
            row.dataset.storedOnDisk = item.storedOnDisk ? '1' : '0';
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
                    row.dataset.attachmentRelativePath = '';
                    row.dataset.attachmentFileId = '';
                    row.dataset.storedOnDisk = '0';
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
        if (contractAdditionalDataMode) applyContractAdditionalDataFieldLocks();
    }

    function addInsuranceDepositItemRow() {
        const rows = getInsuranceDepositItemsFromUi();
        rows.push({
            id: `ins_${Date.now()}`,
            payType: 'cheque',
            amount: '0',
            reference: '',
            attachmentName: '',
            attachmentDataUrl: ''
        });
        renderInsuranceDepositItemsRows(rows);
    }

    function removeInsuranceDepositItemRow(id) {
        const rows = getInsuranceDepositItemsFromUi().filter((x) => toStr(x.id) !== toStr(id));
        renderInsuranceDepositItemsRows(rows);
    }

    function getCustomRentScheduleFromUi(wrapId) {
        const wrap = document.getElementById(wrapId || 'customRentScheduleTableWrap');
        if (!wrap) return [];
        return [...wrap.querySelectorAll('tbody tr[data-custom-rent-month]')].map((tr) => ({
            monthIndex: parseInt(tr.getAttribute('data-custom-rent-month'), 10) || 0,
            dueDate: toStr(tr.querySelector('[data-custom-rent-date]')?.value),
            amount: toStr(tr.querySelector('[data-custom-rent-amount]')?.value),
            isExtraPeriod: tr.dataset.extraPeriod === '1',
            extraDays: Math.max(0, parseInt(toStr(tr.dataset.extraDays), 10) || 0)
        }));
    }

    function getCustomRentItemsFromUi() {
        return getCustomRentScheduleFromUi();
    }

    function renderCustomRentScheduleFromRows(rows = [], options = {}) {
        const wrapId = options.wrapId || 'customRentScheduleTableWrap';
        const wrap = document.getElementById(wrapId);
        if (!wrap) return;
        const renewalPayload =
            options.renewalPayload ||
            (wrapId === RENEWAL_CUSTOM_RENT_WRAP_ID ? getRenewalRenderPayload() : null);
        let list = Array.isArray(rows) ? rows.map((r) => ({ ...r })) : [];
        if (list.length && (list[0].deltaPerMonth !== undefined || list[0].fromMonth !== undefined)) {
            list = [];
        }
        if (list.length) {
            if (renewalPayload) {
                list = enrichPaymentScheduleRowsFromPayload(renewalPayload, list);
                if (isPayloadVatIncludedWithRent(renewalPayload)) {
                    list = list.map((row) => ({
                        ...row,
                        amount: getCustomRentExVatDisplayAmount(row, renewalPayload)
                    }));
                }
            } else if (isContractVatIncludedWithRent()) {
                list = list.map((row) => ({
                    ...row,
                    amount: getCustomRentExVatDisplayAmount(row)
                }));
            } else {
                list = normalizePaymentScheduleRowsExVat(list);
            }
        }
        if (!list.length) {
            wrap.innerHTML = `<p style="color:#666;font-size:12px;margin:0">${t('اضبط المدة وتاريخ البداية والإيجار ثم اضغط «إعادة بناء» في جدول الدفع لعرض الأشهر.', 'Set period, start date, and rent, then press Rebuild in the payment section to list months.')}</p>`;
            return;
        }
        const renCustomEv = wrapId === RENEWAL_CUSTOM_RENT_WRAP_ID ? ' oninput="onRenewalCustomRentChanged()"' : '';
        const body = list
            .sort((a, b) => (a.monthIndex || 0) - (b.monthIndex || 0))
            .map((r) => {
                const m = r.monthIndex || 0;
                const monthLabel =
                    r.isExtraPeriod && r.extraDays
                        ? `${m} <span style="font-size:11px;color:#666">(+${r.extraDays} ${t('يوم', 'd')})</span>`
                        : String(m);
                const dVal = escHtml(toStr(r.dueDate));
                const amt = escHtml(toStr(r.amount));
                const extraAttrs =
                    r.isExtraPeriod && r.extraDays
                        ? ` data-extra-period="1" data-extra-days="${escHtml(String(r.extraDays))}"`
                        : '';
                return `<tr data-custom-rent-month="${m}"${extraAttrs}>
                    <td>${monthLabel}</td>
                    <td><input type="date" data-custom-rent-date value="${dVal}"${renCustomEv}></td>
                    <td><input type="number" data-custom-rent-amount min="0" step="0.001" value="${amt}"${renCustomEv}></td>
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
        onPaymentMethodOrDriversChanged({ skipCustomRedraw: true, preserveCustomDueDates: true });
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
    function ensureTypeSelectAlwaysNew() {
        const el = document.getElementById('typeSelect');
        if (!el) return;
        el.value = 'جديد New';
        el.disabled = true;
    }

    function isContractPaymentByCheque() {
        const p = toStr(document.getElementById('paymentMethod')?.value).toLowerCase();
        return p.includes('شيك') || p.includes('chq') || p.includes('cheq');
    }

    /** YYYY-MM-DD حسب التقويم المحلي — لا تستخدم toISOString() لحقول التاريخ لأنها تزحف يومًا في التوقيتات + */
    function formatDateYmdLocal(d) {
        if (!d || Number.isNaN(d.getTime())) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }


    /** تحليل YYYY-MM-DD إلى تاريخ محلي / Parse YYYY-MM-DD as local calendar date */
    function parseYmdToLocalDate(ymd) {
        const s = toStr(ymd).trim();
        if (!s) return null;
        const p = s.split('-').map((x) => parseInt(x, 10));
        if (p.length !== 3 || p.some((x) => Number.isNaN(x))) return null;
        const d = new Date(p[0], p[1] - 1, p[2]);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    function addCalendarDaysToYmd(ymdStr, calendarDays) {
        const d = parseYmdToLocalDate(ymdStr);
        if (!d || !Number.isFinite(calendarDays)) return '';
        d.setDate(d.getDate() + calendarDays);
        return formatDateYmdLocal(d);
    }

    function diffCalendarDaysBetweenYmd(fromYmd, toYmd) {
        const a = parseYmdToLocalDate(fromYmd);
        const b = parseYmdToLocalDate(toYmd);
        if (!a || !b) return null;
        const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
        const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
        return Math.round((ub - ua) / 86400000);
    }

    /** أجر اليوم من الإيجار الشهري / Daily rent from monthly rent */
    function calculateDailyRentFromMonthly(monthlyRent) {
        return (parseFloat(toStr(monthlyRent)) || 0) / 30;
    }

    /** مبلغ السماح = (الإيجار ÷ 30) × الأيام / Grace amount = (rent ÷ 30) × days */
    function calculateGraceAmountOmFromRentAndDays(monthlyRent, graceDays) {
        const days = Math.max(0, parseInt(toStr(graceDays), 10) || 0);
        return calculateDailyRentFromMonthly(monthlyRent) * days;
    }

    function formatGraceAmountOm(amount) {
        return (parseFloat(amount) || 0).toFixed(3);
    }

    function applyGraceAmountToField(graceAmountEl, monthlyRent, graceDays) {
        if (!graceAmountEl) return;
        graceAmountEl.value = formatGraceAmountOm(calculateGraceAmountOmFromRentAndDays(monthlyRent, graceDays));
    }

    function getContractGraceDaysFromData(d) {
        const src = d || getFormData();
        return Math.max(0, parseInt(toStr(src.graceDays), 10) || 0);
    }

    function hasContractGracePeriod(d) {
        return getContractGraceDaysFromData(d) > 0;
    }

    const GRACE_PERIOD_NOTICE_AR = `في حال منح المستأجر فترة سماح بموجب هذا العقد، ثم تقدم بطلب إنهاء العلاقة الإيجارية أو إخلاء العقار قبل انتهاء مدة العقد لأي سبب كان، فإن النظر في هذا الطلب وقبوله أو رفضه يعد حقاً تقديرياً خالصاً للمؤجر وإدارة العقار، ولا يترتب عليه أي التزام قانوني أو تعاقدي بالموافقة على طلب الإخلاء، وذلك وفقاً لتقديرات المالك أو إدارة العقار وما تقتضيه مصلحة العقار والتنظيم المعمول به.

كما أن استمرار العقد والتقيد بمدته يخضع لأحكام القوانين واللوائح المنظمة للعلاقة بين المؤجر والمستأجر في سلطنة عمان، ويلتزم الطرفان بالأحكام القانونية النافذة ذات الصلة.

وفي حال وافق المؤجر، استثناءً ودون أن يعد ذلك حقاً مكتسباً للمستأجر أو مخالفة لما تقرره القوانين المنظمة، على طلب الإخلاء أو إنهاء العقد قبل انتهاء مدته، يلتزم المستأجر بسداد كامل قيمة فترة السماح الممنوحة له، بالإضافة إلى رسوم البلدية وأي رسوم أو التزامات مالية مترتبة عن المدة المتبقية من العقد، وذلك وفقاً لما هو منصوص عليه في هذا العقد.`;

    const GRACE_PERIOD_NOTICE_EN = `In the event that the Tenant is granted a grace period under this Agreement and subsequently submits a request to terminate the tenancy or vacate the property prior to the expiry of the lease term for any reason whatsoever, the consideration, approval, or rejection of such request shall remain at the sole and absolute discretion of the Landlord and/or Property Management. Nothing herein shall be construed as creating any legal or contractual obligation upon the Landlord or Property Management to approve such request, as the same shall be subject to the assessment, evaluation, and discretion of the Landlord and/or Property Management in accordance with the interests of the property and the applicable regulations.

Furthermore, the continuation and enforceability of this Agreement shall remain subject to the laws and regulations governing landlord and tenant relationships in the Sultanate of Oman, and both parties shall comply with all applicable legal provisions in force.

In the event the Landlord agrees, as an exception and without prejudice to the applicable laws or creating any vested right in favor of the Tenant, to the early termination of the Agreement or vacating of the property prior to the expiry of the lease term, the Tenant shall be obligated to pay the full value of the granted grace period, in addition to all municipality fees and any other financial obligations applicable to the remaining period of the Agreement, in accordance with the terms and conditions set forth herein.`;

    /** توقيعات الطرفين — المستأجر يساراً والمؤجر يميناً دائماً / Tenant left, landlord right */
    function buildContractPartiesSignatureRowHtml(d) {
        const data = d || getFormData();
        const name = escHtml(toStr(data.tenantNameAr) || toStr(data.tenantNameEn) || '—');
        const id = escHtml(toStr(data.tenantId) || '—');
        return `
            <div class="signature-row signature-row--parties">
                <div class="signature-item signature-item--tenant">
                    <div style="font-weight:700;margin-bottom:6px">توقيع المستأجر / Tenant Signature</div>
                    <div contenteditable="true" style="font-size:12pt;font-weight:700;margin:8px 0 4px">${name}</div>
                    <div contenteditable="true" style="font-size:11pt;color:#333;margin-bottom:10px">${t('الرقم المدني / Civil ID', 'Civil ID / الرقم المدني')}: ${id}</div>
                    <div class="signature-line" style="margin-top:6px;max-width:92%;border-top:1px solid #2a2a2a;padding-top:6px;font-size:10pt;color:#555">${t('التوقيع / Signature', 'Signature / التوقيع')}</div>
                </div>
                <div class="signature-item signature-item--landlord">
                    <div style="font-weight:700;margin-bottom:6px">توقيع المؤجر أو ممثل المؤجر / Landlord or Representative Signature</div>
                    <div class="signature-line" style="margin-top:52px;max-width:92%;margin-left:auto;border-top:1px solid #2a2a2a;padding-top:6px;font-size:10pt;color:#555">${t('التوقيع / Signature', 'Signature / التوقيع')}</div>
                </div>
            </div>`;
    }

    function escCssContentValue(s) {
        return toStr(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ').trim();
    }

    /** ترقيم الصفحة + بيانات العقد في هامش الطباعة السفلي — يعمل مع counter(page) / Page margin meta via @page */
    function buildContractPrintPageMarginCss(d, agreementNoOverride) {
        const data = d || getFormData();
        const agreementNo = escCssContentValue(toStr(agreementNoOverride) || toStr(data.agreementNo) || '—');
        const buildingNo = escCssContentValue(toStr(data.buildingNo) || '—');
        const flatNo = escCssContentValue(toStr(data.flatNo) || '—');
        return `
            @page {
                size: A4 portrait;
                margin: 8mm 10mm 26mm 10mm;
                @bottom-center {
                    content: "الصفحة " counter(page) " / Page " counter(page)
                        "  |  رقم العقد / Agreement: " "${agreementNo}"
                        "  |  المبنى / Building: " "${buildingNo}"
                        "  |  الوحدة / Unit: " "${flatNo}";
                    font-family: 'Tajawal', 'Roboto', sans-serif;
                    font-size: 7pt;
                    font-weight: 700;
                    color: #4a1525;
                }
            }`;
    }

    /** تذييل الطباعة — توقيعات فقط (مرة واحدة لكل صفحة) / Fixed print footer: signatures only */
    function buildContractPrintFooterHtml(d) {
        const data = d || getFormData();
        const name = escHtml(toStr(data.tenantNameAr) || toStr(data.tenantNameEn) || '—');
        const id = escHtml(toStr(data.tenantId) || '—');
        return `
            <div class="print-footer" aria-hidden="true">
                <div class="pf-tenant">
                    <div class="pf-label">توقيع المستأجر / Tenant Signature</div>
                    <div class="pf-tenant-name">${name}</div>
                    <div class="pf-tenant-id">${t('الرقم المدني / Civil ID', 'Civil ID / الرقم المدني')}: ${id}</div>
                    <div class="pf-sig-line"></div>
                </div>
                <div class="pf-landlord">
                    <div class="pf-label">توقيع المؤجر أو ممثل المؤجر / Landlord or Representative</div>
                    <div class="pf-sig-line pf-sig-line--landlord"></div>
                </div>
            </div>`;
    }

    /** فترة السماح + أحكامها — في ملحق العقد (03) فقط عند وجود أيام سماح / Grace period block for extension addendum only */
    function buildGracePeriodDocumentBlockHtml(d) {
        if (!hasContractGracePeriod(d)) return '';
        const days = getContractGraceDaysFromData(d);
        const graceAmt = formatGraceAmountOm(
            parseFloat(toStr(d.graceAmount)) > 0
                ? d.graceAmount
                : calculateGraceAmountOmFromRentAndDays(d.monthlyRent, days)
        );
        const handover = escHtml(formatDate(d.unitHandoverDate, 'ar') || toStr(d.unitHandoverDate) || '—');
        const start = escHtml(formatDate(d.startDate, 'ar') || toStr(d.startDate) || '—');
        const arNotice = escHtml(GRACE_PERIOD_NOTICE_AR).replace(/\n\n/g, '<br><br>');
        const enNotice = escHtml(GRACE_PERIOD_NOTICE_EN).replace(/\n\n/g, '<br><br>');
        return `
            <div class="section-header">فترة السماح / Grace Period</div>
            <table class="info-table">
                <tr>
                    <th>عدد أيام السماح / Grace period (days)</th>
                    <td colspan="3" contenteditable="true">${days}</td>
                    <th>مبلغ فترة السماح (ر.ع) / Grace period amount (OMR)</th>
                    <td colspan="3" contenteditable="true">${escHtml(graceAmt)}</td>
                </tr>
                <tr>
                    <th>تاريخ استلام الوحدة / Unit handover date</th>
                    <td colspan="3" contenteditable="true">${handover}</td>
                    <th>بداية العقد / Contract start date</th>
                    <td colspan="3" contenteditable="true">${start}</td>
                </tr>
            </table>
            <div class="section-header">أحكام فترة السماح / Grace Period Provisions</div>
            <div class="clause-block">
                <div class="dual-text">
                    <div class="text-ar" contenteditable="true">${arNotice}</div>
                    <div class="text-en" contenteditable="true">${enNotice}</div>
                </div>
            </div>`;
    }

    let _contractDraftSaveTimer = null;
    let _contractWorkspaceRefreshTimer = null;
    let _contractRefreshStatusTimer = null;
    let _contractSaveInProgress = false;

    function setContractSaveDockBusy(busy) {
        _contractSaveInProgress = !!busy;
        document
            .querySelectorAll(
                '#contractsSaveDockPrimaryBtn, #contractsSaveDockDraftBtn, #contractsSaveDockWrap button[onclick*="saveAllData"], #unitDetailsSaveBtn'
            )
            .forEach((btn) => {
                try {
                    btn.disabled = !!busy;
                } catch (_eBtn) {}
            });
    }

    function isMeaningfulContractPayload(o) {
        if (!o || typeof o !== 'object') return false;
        return !!(
            toStr(o.tenantNameAr).trim() ||