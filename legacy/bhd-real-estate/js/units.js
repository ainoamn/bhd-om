            otherDiscount,
            extraRows,
            extraAdditions,
            extraDiscounts,
            totalDiscounts,
            contractBeforeDiscount,
            contractTotal: Math.max(0, contractBeforeFinalDiscount - totalDiscounts),
            customRentItems,
            isRenewalReceipt
        };
    }

    function calcMunicipalFeesFromPayload(d) {
        const rent = parseFloat(d?.monthlyRent) || 0;
        const months = parseInt(d?.contractMonths, 10) || 0;
        if (!rent || !months) return '0.000';
        return (rent * months * 0.03).toFixed(3);
    }

    /** إجمالي إيجار افتراضي بقيمة شهرية سابقة لنفس فترة التجديد / Hypothetical rent total at prior monthly for renewal period */
    function computeHypotheticalRentTotalForPayload(payload, alternateMonthly) {
        const prevM = parseFloat(alternateMonthly) || 0;
        if (!payload || !prevM) return 0;
        const newM = parseFloat(payload.monthlyRent) || 0;
        const months = parseInt(payload.contractMonths, 10) || 0;
        const schedule = parsePayloadJsonArrayField(payload, 'paymentScheduleJson', 'paymentSchedule');
        if (schedule.length) {
            const period = getContractPeriodBreakdownFromPayload(payload);
            const fullMonths = Math.max(1, period.months || months || 12);
            const extraDays = period.extraDays || 0;
            return schedule.reduce((sum, row) => {
                const m = parseInt(row.monthIndex, 10) || 0;
                if (row.isExtraPeriod || m > fullMonths) {
                    const ed = parseInt(row.extraDays, 10) || extraDays || 0;
                    return sum + (ed > 0 ? (prevM / 30) * ed : newM > 0 ? (parseFloat(row.amount) || 0) * (prevM / newM) : 0);
                }
                return sum + prevM;
            }, 0);
        }
        const period = computeContractPeriodMonthsAndExtraDays(payload.startDate, payload.endDate, months);
        const fullMonths = period.months || months || 0;
        const extraDays = period.extraDays || 0;
        let total = fullMonths * prevM;
        if (extraDays > 0) total += (prevM / 30) * extraDays;
        return total;
    }

    /** مقارنة إيجار التجديد (شهري + إجمالي) / Renewal rent comparison — monthly & period totals */
    function resolvePreviousMonthlyRentForRenewalPayload(payload) {
        if (!payload || typeof payload !== 'object') return 0;
        let prev = parseFloat(toStr(payload.previousMonthlyRent)) || 0;
        if (prev > 0) return prev;
        const b = toStr(payload.buildingNo);
        const u = toStr(payload.flatNo);
        const prevAg = toStr(payload.previousAgreementNo);
        if (!b || !u || !prevAg) return 0;
        const hk = _tenancyDraftStorageKey(b, u);
        const hist = loadContractHistoryByUnitMap()[hk];
        if (!Array.isArray(hist)) return 0;
        for (const row of hist) {
            if (toStr(row?.payload?.agreementNo) === prevAg) {
                return parseFloat(row.payload.monthlyRent) || 0;
            }
        }
        return 0;
    }

    function computeRenewalRentComparisonFromPayload(payload, totals) {
        if (!payload || !totals) return null;
        const prevMonthly = resolvePreviousMonthlyRentForRenewalPayload(payload);
        const newMonthly = parseFloat(totals.monthly) || 0;
        if (!prevMonthly || !newMonthly) return null;
        const prevRentTotal = computeHypotheticalRentTotalForPayload(payload, prevMonthly);
        const newRentTotal = parseFloat(totals.rentTotal) || 0;
        const monthlyDiff = newMonthly - prevMonthly;
        const totalDiff = newRentTotal - prevRentTotal;
        const pctMonthly = prevMonthly > 0 ? (monthlyDiff / prevMonthly) * 100 : 0;
        const pctTotal = prevRentTotal > 0 ? (totalDiff / prevRentTotal) * 100 : 0;
        return {
            prevMonthly,
            newMonthly,
            monthlyDiff,
            prevRentTotal,
            newRentTotal,
            totalDiff,
            pctMonthly,
            pctTotal
        };
    }

    function buildRenewalRentComparisonSectionHtml(payload, totals) {
        const cmp = computeRenewalRentComparisonFromPayload(payload, totals);
        if (!cmp) return '';
        const monthlyClass =
            Math.abs(cmp.monthlyDiff) < 0.0005
                ? 'fin-print-renewal-compare-neutral'
                : cmp.monthlyDiff > 0
                  ? 'fin-print-renewal-compare-up'
                  : 'fin-print-renewal-compare-down';
        const totalClass =
            Math.abs(cmp.totalDiff) < 0.0005
                ? 'fin-print-renewal-compare-neutral'
                : cmp.totalDiff > 0
                  ? 'fin-print-renewal-compare-up'
                  : 'fin-print-renewal-compare-down';
        const monthlySign = cmp.monthlyDiff >= 0 ? '+' : '';
        const totalSign = cmp.totalDiff >= 0 ? '+' : '';
        const outcomeAr =
            Math.abs(cmp.totalDiff) < 0.0005
                ? 'بدون تغيّر في إجمالي الإيجار'
                : cmp.totalDiff > 0
                  ? `ربح إيجاري للفترة: +${formatOMR(cmp.totalDiff)}`
                  : `انخفاض إيجاري للفترة: ${formatOMR(cmp.totalDiff)}`;
        const outcomeEn =
            Math.abs(cmp.totalDiff) < 0.0005
                ? 'No change in period rent total'
                : cmp.totalDiff > 0
                  ? `Rent gain for period: +${formatOMR(cmp.totalDiff)}`
                  : `Rent decrease for period: ${formatOMR(cmp.totalDiff)}`;
        const rows = [
            finPrintTableRow(
                t('الإيجار الشهري السابق / Previous monthly rent', 'Previous monthly rent / الإيجار الشهري السابق'),
                summaryAmtOm(cmp.prevMonthly)
            ),
            finPrintTableRow(
                t('الإيجار الشهري الجديد / New monthly rent', 'New monthly rent / الإيجار الشهري الجديد'),
                summaryAmtOm(cmp.newMonthly)
            ),
            finPrintTableRow(
                t('فرق الإيجار الشهري / Monthly rent difference', 'Monthly rent difference / فرق الإيجار الشهري'),
                `<span class="${monthlyClass}">${monthlySign}${summaryAmtOm(Math.abs(cmp.monthlyDiff))} (${cmp.pctMonthly >= 0 ? '+' : ''}${cmp.pctMonthly.toFixed(1)}%)</span>`
            ),
            finPrintTableRow(
                t('إجمالي إيجار الفترة (بالقيمة السابقة) / Period rent total (at old rate)', 'Period rent total (old rate) / إجمالي إيجار الفترة (سابق)'),
                summaryAmtOm(cmp.prevRentTotal)
            ),
            finPrintTableRow(
                t('إجمالي إيجار الفترة (بالقيمة الجديدة) / Period rent total (new rate)', 'Period rent total (new rate) / إجمالي إيجار الفترة (جديد)'),
                summaryAmtOm(cmp.newRentTotal),
                'total'
            ),
            finPrintTableRow(
                t('فرق إجمالي الإيجار / Period rent difference', 'Period rent difference / فرق إجمالي الإيجار'),
                `<span class="${totalClass}">${totalSign}${summaryAmtOm(Math.abs(cmp.totalDiff))} (${cmp.pctTotal >= 0 ? '+' : ''}${cmp.pctTotal.toFixed(1)}%)</span>`
            ),
            finPrintTableRow(
                t('النتيجة / Outcome', 'Outcome / النتيجة'),
                `<span class="${totalClass}">${t(outcomeAr, outcomeEn)}</span>`,
                'grand'
            )
        ].join('');
        return finPrintSectionTable(
            t('٠ — مقارنة التجديد (الإيجار) / Renewal rent comparison', 'Renewal rent comparison / مقارنة التجديد'),
            rows
        );
    }

    function buildFinancialReceiptGraceNoticeHtml(payload) {
        if (!payload || !hasContractGracePeriod(payload)) return '';
        const days = getContractGraceDaysFromData(payload);
        const graceAmt = formatGraceAmountOm(
            parseFloat(toStr(payload.graceAmount)) > 0
                ? payload.graceAmount
                : calculateGraceAmountOmFromRentAndDays(payload.monthlyRent, days)
        );
        const arNotice = escHtml(GRACE_PERIOD_NOTICE_AR).replace(/\n\n/g, '<br><br>');
        const enNotice = escHtml(GRACE_PERIOD_NOTICE_EN).replace(/\n\n/g, '<br><br>');
        return `
            <div class="fin-print-grace-notice">
                <div class="fin-print-grace-notice-title">${t('أحكام فترة السماح — العقد المجدّد / Grace period provisions — renewal', 'Grace period provisions — renewal / أحكام فترة السماح')}</div>
                <table class="fin-print-meta" role="presentation" style="margin-bottom:10px">
                    <tr><td>${t('أيام السماح / Grace days', 'Grace days / أيام السماح')}</td><td>${days}</td></tr>
                    <tr><td>${t('مبلغ السماح / Grace amount', 'Grace amount / مبلغ السماح')}</td><td>${escHtml(graceAmt)} OMR</td></tr>
                    <tr><td>${t('بداية العقد / Start', 'Start / بداية العقد')}</td><td>${escHtml(toStr(payload.startDate) || '—')}</td></tr>
                </table>
                <div class="dual-text" style="font-size:10pt;line-height:1.55">
                    <div class="text-ar" dir="rtl">${arNotice}</div>
                    <div class="text-en" dir="ltr" style="margin-top:8px">${enNotice}</div>
                </div>
            </div>`;
    }

    function buildContractFinancialReceiptHtmlFromPayload(payload, opts = {}) {
        let s;
        try {
            s = getSmartTotalsFromPayload(payload);
        } catch (_e) {
            return '';
        }
        const renewalReceipt = !!(s.isRenewalReceipt || isRenewalFinancialReceiptPayload(payload));
        const ag = escHtml(toStr(payload.agreementNo) || '—');
        const tenant = escHtml(toStr(payload.tenantNameAr) || '—');
        const building = escHtml(toStr(payload.buildingNo) || '—');
        const unit = escHtml(toStr(payload.flatNo) || '—');
        const prevAg = toStr(payload.previousAgreementNo);
        const renewalBadge = renewalReceipt
            ? `<span class="fin-print-renewal-badge">${t(
                  `إيصال تجديد — العقد الجديد ${ag}${prevAg ? ` (السابق: ${escHtml(prevAg)})` : ''}`,
                  `Renewal receipt — new agreement ${ag}${prevAg ? ` (previous: ${escHtml(prevAg)})` : ''}`
              )}</span>`
            : '';
        const tables = buildFinancialSummaryPrintTablesHtml(s, {
            startDate: payload.startDate,
            endDate: payload.endDate,
            paymentSchedule: parsePayloadJsonArrayField(payload, 'paymentScheduleJson', 'paymentSchedule'),
            renewalReceipt,
            payload,
            omitPaymentSchedule: opts.omitPaymentSchedule === true,
            omitVatChequeLineItems: opts.omitVatChequeLineItems === true
        });
        const graceNotice = renewalReceipt ? buildFinancialReceiptGraceNoticeHtml(payload) : '';
        const receiptInner = `
            <div class="contract-financial-receipt" aria-label="Financial receipt / إيصال مالي">
                <div class="contract-financial-receipt-title">${t('إيصال مالي ملحق بالعقد / Contract financial receipt', 'Contract financial receipt / إيصال مالي ملحق')}</div>
                ${renewalBadge}
                <table class="fin-print-meta" role="presentation">
                    <tr><td>${t('رقم العقد / Agreement no.', 'Agreement no. / رقم العقد')}</td><td>${ag}</td></tr>
                    <tr><td>${t('المستأجر / Tenant', 'Tenant / المستأجر')}</td><td>${tenant}</td></tr>
                    <tr><td>${t('المبنى / الوحدة / Building / Unit', 'Building / Unit / المبنى / الوحدة')}</td><td>${building} — ${unit}</td></tr>
                </table>
                ${tables}
                ${graceNotice}
            </div>`;
        if (opts.forPrint) {
            return cfvSectionWrap(
                t('الملخص المالي / Financial summary', 'Financial summary / الملخص المالي'),
                receiptInner
            );
        }
        return receiptInner;
    }

    function getContractFullViewAttachmentGroups() {
        return [
            { key: 'owner', label: t('مرفقات المالك / Owner attachments', 'Owner attachments / مرفقات المالك') },
            { key: 'building', label: t('مرفقات العقار / Property attachments', 'Property attachments / مرفقات العقار') },
            { key: 'tenant', label: t('مرفقات المستأجر / Tenant attachments', 'Tenant attachments / مرفقات المستأجر') },
            { key: 'cheques', label: t('مرفقات الشيكات / Cheque attachments', 'Cheque attachments / مرفقات الشيكات') },
            { key: 'insurance', label: t('مرفقات التأمين / Insurance attachments', 'Insurance attachments / مرفقات التأمين') },
            { key: 'property', label: t('أوراق العقار الممسوحة / Scanned property papers', 'Scanned property papers / أوراق العقار') },
            { key: 'other', label: t('مرفقات أخرى / Other attachments', 'Other attachments / مرفقات أخرى') }
        ];
    }

    const CFV_PRINT_ATTACHMENT_ORDER = ['owner', 'building', 'tenant', 'cheques', 'insurance', 'property', 'other'];

    function classifyContractAttachmentForFullView(it) {
        const key = toStr(it?.key);
        const label = toStr(it?.label);
        const labelLc = label.toLowerCase();
        if (/^owner_|^owner_id_|^core_owner_/i.test(key)) return 'owner';
        if (/^building_|^core_title_deed|^core_survey/i.test(key)) return 'building';
        if (/^pdb_/i.test(key)) return 'property';
        if (/^(pay_chq_|vat_chq_)/i.test(key)) return 'cheques';
        if (key === 'deposit_receipt' || /^ins_print_/i.test(key) || /^ins_/i.test(key)) return 'insurance';
        if (/insurance|تأمين|deposit receipt|إيصال التأمين/i.test(label)) return 'insurance';
        if (/rent cheque|شيك إيجار|vat cheque|شيك ضريبة/i.test(label) && !/insurance|تأمين/i.test(label)) {
            return 'cheques';
        }
        if (/^(tenant_|co_sig_|core_tenant_|core_company_|core_sig_)/i.test(key)) return 'tenant';
        if (
            /tenant|مستأجر|signatory|مفوض|commercial registration|السجل التجاري|passport|جواز|id card|بطاقة/i.test(
                label
            ) &&
            !/owner|مالك|title deed|سند|survey|مساح|ملكية/i.test(label)
        ) {
            return 'tenant';
        }
        if (/owner|مالك/i.test(label)) return 'owner';
        if (/title deed|سند الملكية|survey|مساح|ملكية|كروكي/i.test(label)) return 'building';
        if (/property papers|أوراق العقار|كل المستندات|all documents/i.test(label)) return 'property';
        return 'other';
    }

    function sortContractFullViewPrintAttachments(items) {
        const orderMap = {};
        CFV_PRINT_ATTACHMENT_ORDER.forEach((k, i) => {
            orderMap[k] = i;
        });
        return (Array.isArray(items) ? items : [])
            .slice()
            .sort((a, b) => {
                const ca = orderMap[classifyContractAttachmentForFullView(a)] ?? 99;
                const cb = orderMap[classifyContractAttachmentForFullView(b)] ?? 99;
                if (ca !== cb) return ca - cb;
                return toStr(a.label).localeCompare(toStr(b.label), 'ar');
            });
    }

    function collectOwnerProfileAttachmentItemsForFullView(ctx) {
        const items = [];
        (ctx?.owners || []).forEach((o, idx) => {
            const pr = o.profile || {};
            const raw = pr.idCardAttachment;
            if (!raw || typeof raw !== 'object') return;
            const ref = {
                name: toStr(raw.name),
                type: toStr(raw.type),
                dataUrl: pickEmbeddedDataUrl(raw, raw.dataUrl),
                relativePath: toStr(raw.relativePath),
                fileId: toStr(raw.fileId),
                storedOnDisk: !!raw.storedOnDisk
            };
            if (!contractAttachmentItemPresent(ref)) return;
            const ownerName = toStr(pr.fullName || o.name) || t('مالك / Owner', 'Owner / مالك');
            items.push({
                key: `owner_id_${idx}`,
                label: t(
                    `بطاقة المالك / Owner ID — ${ownerName}`,
                    `Owner ID — ${ownerName} / بطاقة المالك`
                ),
                ...ref
            });
        });
        return items;
    }

    function collectBuildingProfileAttachmentItemsForFullView(ctx) {
        const items = [];
        const b = ctx?.bProfile || {};
        const push = (key, label, att) => {
            const ref = normalizeContractAttachmentRef(att);
            if (!ref || !contractAttachmentPresent(ref)) return;
            items.push({ key, label, ...ref });
        };
        push(
            'building_title_deed',
            t('سند الملكية / Property title deed', 'Property title deed / سند الملكية'),
            b.titleDeedAttachment
        );
        push(
            'building_survey_sketch',
            t('الرسم المساحي / Survey sketch', 'Survey sketch / الرسم المساحي'),
            b.surveySketchAttachment
        );
        return items;
    }

    function collectPropertyBundleAttachmentItemsForFullView(ctx) {
        const unit = ctx?.unit;
        const payload = ctx?.payload || {};
        const items = [];
        collectPropertyDocumentCoreAttachments(unit, payload).forEach((it) => items.push({ ...it }));
        parsePropertyDocumentsBundle(payload)
            .filter((d) => contractAttachmentPresent(d))
            .forEach((d) => {
                items.push({
                    key: `pdb_${toStr(d.id)}`,
                    label: `${propertyDocumentCategoryLabel(d.category)} — ${toStr(d.titleAr || d.titleEn || d.name)}`,
                    name: toStr(d.name),
                    type: toStr(d.type),
                    dataUrl: toStr(d.dataUrl),
                    relativePath: toStr(d.relativePath),
                    fileId: toStr(d.fileId),
                    storedOnDisk: !!d.storedOnDisk
                });
            });
        return items;
    }

    async function hydrateContractFullViewAttachmentsForPrint(ctx) {
        if (!ctx) return [];
        const unit = ctx.unit;
        const payload = ctx.payload || {};
        if (!ctx.hydratedAttachments?.length) {
            try {
                ctx.attachmentItems =
                    ctx.attachmentItems?.length ||
                    (await resolveContractAttachmentsForUnit(unit, { includeDom: false, syncStores: false }));
            } catch (_eHydrBase) {
                ctx.attachmentItems = collectAllContractPrintableAttachmentsFromPayload(payload);
            }
            const ownerExtras = collectOwnerProfileAttachmentItemsForFullView(ctx);
            const buildingExtras = collectBuildingProfileAttachmentItemsForFullView(ctx);
            const propertyExtras = collectPropertyBundleAttachmentItemsForFullView(ctx);
            const mergedItems = mergeContractPrintableAttachmentLists(
                ownerExtras,
                buildingExtras,
                propertyExtras,
                ctx.attachmentItems || []
            );
            const hydrated = [];
            for (const it of mergedItems) {
                let url = toStr(it.dataUrl);
                if (!url) {
                    try {
                        url = await bhdResolveAttachmentUrl(it);
                    } catch (_eHydrUrl) {
                        url = '';
                    }
                }
                hydrated.push({ ...it, dataUrl: url || toStr(it.dataUrl) });
            }
            ctx.hydratedAttachments = enrichContractAttachmentPreviewMeta(hydrated, payload);
        }
        let items = (ctx.hydratedAttachments || []).slice();
        try {
            items = await repairContractPrintAttachmentItemsFromDisk(items, payload);
        } catch (_eRepair) {}
        try {
            items = await bhdHydrateAttachmentItemsForPrint(items);
        } catch (_eHydrPrint) {}
        try {
            items = await bhdExpandPdfAttachmentsForPrint(items);
        } catch (_eExpand) {}
        items = enrichContractAttachmentPreviewMeta(items, payload);
        return sortContractFullViewPrintAttachments(items.filter((it) => contractAttachmentItemPresent(it)));
    }

    function getCfvPrintStylesCss() {
        return `
            .cfv-section { margin-bottom: 16px; page-break-inside: auto; break-inside: auto; }
            .cfv-section-title {
                font-size: 13pt; font-weight: 800; color: #4a1525; margin: 0 0 10px; padding: 8px 12px;
                background: #f8eef1; border-right: 4px solid #6b1f35; border-radius: 4px;
                -webkit-print-color-adjust: exact; print-color-adjust: exact;
                page-break-after: avoid; break-after: avoid-page;
            }
            .cfv-financial-print-block {
                margin-bottom: 18px; padding: 12px 14px 4px;
                border: 2px solid #e8d0d6; border-radius: 8px; background: #fcfafb;
                page-break-inside: auto; break-inside: auto;
            }
            .cfv-financial-print-intro {
                font-size: 10.5pt; color: #555; text-align: center; margin: 0 0 14px; line-height: 1.55;
                padding-bottom: 10px; border-bottom: 1px dashed #d8c4ca;
            }
            .cfv-financial-print-block > .cfv-section { margin-bottom: 14px; }
            .cfv-financial-print-block > .cfv-section .contract-financial-receipt {
                margin-top: 0; border: none; background: transparent; padding: 0;
            }
            .cfv-financial-print-block > .cfv-section .contract-financial-receipt-title { display: none; }
            .cfv-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 12px; }
            .cfv-item { border: 1px solid #d8dde6; border-radius: 6px; padding: 8px 10px; background: #fafcff; page-break-inside: avoid; }
            .cfv-item small { display: block; font-size: 10pt; color: #5a6b75; margin-bottom: 3px; }
            .cfv-item strong { display: block; font-size: 11pt; color: #1f2d38; word-break: break-word; }
            .table-shell { overflow: visible !important; }
            .fin-print-table, .cfv-schedule-table {
                width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 4px 0 8px;
            }
            .fin-print-table th, .fin-print-table td,
            .cfv-schedule-table th, .cfv-schedule-table td {
                border: 1px solid #c5d4de; padding: 6px 10px; vertical-align: middle;
            }
            .fin-print-table thead th, .cfv-schedule-table thead th {
                background: #2a3f4d; color: #fff; font-weight: 700; text-align: center;
                -webkit-print-color-adjust: exact; print-color-adjust: exact;
            }
            .fin-print-table tbody tr:nth-child(even), .cfv-schedule-table tbody tr:nth-child(even) { background: #f8fafc; }
            .fin-print-table .fin-col-label { text-align: start; font-weight: 600; color: #2a3f4d; width: 62%; }
            .fin-print-table .fin-col-value { text-align: end; font-weight: 700; white-space: nowrap; width: 38%; }
            .fin-print-table tr.fin-row--add .fin-col-value { color: #0d6b3a; }
            .fin-print-table tr.fin-row--discount .fin-col-value { color: #a83232; }
            .fin-print-table tr.fin-row--total td { background: #eef4f8; font-weight: 800; border-top: 2px solid #2a3f4d; }
            .fin-print-table tr.fin-row--grand td { background: #4a1525; color: #fff; font-size: 11pt; }
            .fin-print-table tr.fin-row--grand .fin-col-label, .fin-print-table tr.fin-row--grand .fin-col-value { color: #fff; }
            .contract-financial-receipt {
                margin-top: 8px; padding: 14px 16px;
                border: 2px dashed #e8d0d6; border-radius: 8px;
                background: #fafcff; text-align: start; page-break-inside: auto; break-inside: auto;
            }
            .contract-financial-receipt-title {
                font-size: 13pt; font-weight: 800; color: #4a1525;
                text-align: center; margin: 0 0 10px; padding-bottom: 8px;
                border-bottom: 2px solid #6b1f35;
            }
            .fin-print-renewal-badge {
                display: block; font-size: 10pt; font-weight: 600; color: #555;
                text-align: center; margin-bottom: 8px;
            }
            .fin-print-meta { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10pt; }
            .fin-print-meta td { padding: 5px 10px; border: 1px solid #d8e2ea; background: #fff; }
            .fin-print-meta td:first-child { width: 34%; font-weight: 700; color: #3d5a6c; background: #f3f7fa; }
            .fin-print-section { margin-bottom: 14px; page-break-inside: auto; break-inside: auto; }
            .fin-print-section-title {
                font-weight: 800; font-size: 10.5pt; color: #4a1525; margin: 0 0 6px;
                padding: 6px 10px; background: linear-gradient(90deg, #f8eef1 0%, #fff 100%);
                border-right: 4px solid #6b1f35; border-radius: 4px;
                page-break-after: avoid; break-after: avoid-page;
            }
            .fin-print-grace-notice {
                margin-top: 12px; padding: 10px 12px; border: 1px solid #c5a028;
                border-radius: 6px; background: #fffdf5; font-size: 10pt; line-height: 1.55;
            }
            .fin-print-grace-notice-title { font-weight: 800; color: #4a1525; margin-bottom: 8px; text-align: center; }
            .fin-print-renewal-compare-up { color: #1b5e20; font-weight: 700; }
            .fin-print-renewal-compare-down { color: #b71c1c; font-weight: 700; }
            .fin-print-renewal-compare-neutral { color: #555; font-weight: 600; }
            .contract-doc-preview-grid, .contract-doc-preview-card, .contract-doc-preview-thumb-btn { display: none !important; }
            @media print {
                .cfv-section, .contract-financial-receipt, .fin-print-section, .cfv-financial-print-block {
                    page-break-inside: auto; break-inside: auto;
                }
                .cfv-section-title, .fin-print-section-title, .contract-financial-receipt-title {
                    page-break-after: avoid; break-after: avoid-page;
                }
                .fin-print-table thead, .cfv-schedule-table thead { display: table-header-group; }
                .fin-print-table tr, .cfv-schedule-table tr { page-break-inside: avoid; break-inside: avoid-page; }
                .contract-att-print-page { page-break-after: always; break-after: page; }
                .fin-print-table thead th, .cfv-schedule-table thead th,
                .fin-print-table tr.fin-row--grand td, .fin-print-table tr.fin-row--total td {
                    -webkit-print-color-adjust: exact; print-color-adjust: exact;
                }
            }`;
    }

    function collectContractFullViewSelectedKeysOrdered() {
        const selected = new Set(collectContractFullViewSelectedKeys());
        return getContractFullViewSectionDefs()
            .map((d) => d.key)
            .filter((k) => selected.has(k));
    }

    function buildContractFullViewAttachmentsGroupedHtml(ctx) {
        const ownerItems = collectOwnerProfileAttachmentItemsForFullView(ctx);
        const buildingItems = collectBuildingProfileAttachmentItemsForFullView(ctx);
        const propertyItems = collectPropertyBundleAttachmentItemsForFullView(ctx);
        const baseItems = ctx.hydratedAttachments || ctx.attachmentItems || [];
        const allItems = mergeContractPrintableAttachmentLists(ownerItems, buildingItems, propertyItems, baseItems);
        _contractDocPreviewCache = allItems;
        const buckets = { owner: [], building: [], tenant: [], cheques: [], insurance: [], property: [], other: [] };
        allItems.forEach((it) => {
            const cat = classifyContractAttachmentForFullView(it);
            (buckets[cat] || buckets.other).push(it);
        });
        const sections = getContractFullViewAttachmentGroups()
            .filter((g) => buckets[g.key]?.length)
            .map((g) => {
                const cards = buckets[g.key]
                    .map((it) => buildContractAttachmentPreviewCardHtml(it, it.dataUrl))
                    .join('');
                return `<div class="cfv-att-group">
                    <h4 class="cfv-att-group-title">${escHtml(g.label)} <span style="font-weight:500;font-size:10pt;color:#666">(${buckets[g.key].length})</span></h4>
                    <div class="contract-doc-preview-grid">${cards}</div>
                </div>`;
            })
            .join('');
        if (!sections) {
            return `<p style="font-size:12px;color:#666">${t('لا مرفقات / No attachments', 'No attachments / لا مرفقات')}</p>`;
        }
        return `<div class="cfv-att-groups">${sections}</div>`;
    }

    function buildContractFullViewSectionHtml(key, ctx, opts = {}) {
        const p = ctx.payload || {};
        const u = ctx.unit || {};
        const b = ctx.bProfile || {};
        if (key === 'summary') {
            const linked = getLinkedContractUnitsFromPayload(p);
            const unitLabel = linked.length > 1 ? formatLinkedContractUnitsLabel(p) : ctx.flatNo;
            const versionsBlock = renderContractVersionsBlockForFullView(ctx.unit);
            return cfvSectionWrap(
                t('ملخص العقد / Contract summary', 'Contract summary / ملخص العقد'),
                cfvGridHtml([
                    [t('رقم العقد / Agreement no.', 'Agreement no. / رقم العقد'), p.agreementNo || u.agreementNo],
                    [t('نوع العقد / Contract type', 'Contract type / نوع العقد'), p.contractType],
                    [t('حالة العقد / Contract status', 'Contract status / حالة العقد'), p.contractSavedStatus || u.status],
                    [t('تاريخ البداية / Start', 'Start / البداية'), p.startDate || u.startDate],
                    [t('تاريخ النهاية / End', 'End / النهاية'), p.endDate || u.endDate],
                    [t('المبنى / Building', 'Building / المبنى'), ctx.building],
                    [t('الوحدة / Unit', 'Unit / الوحدة'), unitLabel],
                    [t('المستأجر / Tenant', 'Tenant / المستأجر'), p.tenantNameAr || u.tenant]
                ]) + versionsBlock
            );
        }
        if (key === 'owner') {
            if (!ctx.owners.length) {
                return cfvSectionWrap(
                    t('بيانات المالك / Owner data', 'Owner data / بيانات المالك'),
                    cfvGridHtml([[t('المالك / Owner', 'Owner / المالك'), u.ownerNames || formatOwnerNamesForBuilding(ctx.building)]])
                );
            }
            const blocks = ctx.owners
                .map((o) => {
                    const pr = o.profile || {};
                    return cfvGridHtml([
                        [t('اسم المالك / Owner name', 'Owner name / اسم المالك'), pr.fullName || o.name],
                        [t('الاسم (EN) / Name (EN)', 'Name (EN) / الاسم'), pr.fullNameEn],
                        [t('الرقم المدني / Civil ID', 'Civil ID / الرقم المدني'), pr.civilId],
                        [t('انتهاء البطاقة / ID expiry', 'ID expiry / انتهاء البطاقة'), pr.idExpiryDate],
                        [t('الهاتف / Phone', 'Phone / الهاتف'), pr.phone],
                        [t('البريد / Email', 'Email / البريد'), pr.email]
                    ]);
                })
                .join('<hr style="border:none;border-top:1px dashed #ddd;margin:12px 0">');
            return cfvSectionWrap(t('بيانات المالك / Owner data', 'Owner data / بيانات المالك'), blocks);
        }
        if (key === 'building') {
            const main = buildingProfileToExcelMainRow(ctx.building, b);
            const rows = Object.entries(main).map(([k, v]) => [k, v]);
            return cfvSectionWrap(t('بيانات المبنى / Building data', 'Building data / بيانات المبنى'), cfvGridHtml(rows));
        }
        if (key === 'unit') {
            return cfvSectionWrap(
                t('بيانات الوحدة / Unit data', 'Unit data / بيانات الوحدة'),
                cfvGridHtml([
                    [t('المبنى / Building', 'Building / المبنى'), ctx.building],
                    [t('الوحدة / Unit', 'Unit / الوحدة'), ctx.flatNo],
                    [t('الطابق / Floor', 'Floor / الطابق'), p.floorDetails || u.floor],
                    [t('نوع الوحدة / Unit type', 'Unit type / النوع'), p.unitType || u.unitType],
                    [t('الاستخدام / Usage', 'Usage / الاستخدام'), p.usageType],
                    [t('عداد الكهرباء / Electricity', 'Electricity / الكهرباء'), p.electricityMeter || u.electricity],
                    [t('عداد الماء / Water', 'Water / الماء'), p.waterMeter || u.water],
                    [t('الحالة / Status', 'Status / الحالة'), u.status]
                ])
            );
        }
        if (key === 'linked_units') {
            const linked = getLinkedContractUnitsFromPayload(p);
            if (linked.length <= 1) return '';
            const rows = linked
                .map((lu) => {
                    const isPrimary = normalizeUnit(lu.unit) === normalizeUnit(ctx.flatNo);
                    return `<tr${isPrimary ? ' style="background:#f3f8fc;font-weight:700"' : ''}>
                        <td>${escHtml(lu.unit)}${isPrimary ? ` <span style="font-size:10px">(${t('أساسية', 'Primary')})</span>` : ''}</td>
                        <td>${escHtml(lu.floorDetails || lu.floor || '—')}</td>
                        <td>${escHtml(lu.unitType || '—')}</td>
                        <td>${escHtml(formatOMR(lu.monthlyRent))}</td>
                        <td>${escHtml(lu.electricityMeter || '—')}</td>
                        <td>${escHtml(lu.waterMeter || '—')}</td>
                    </tr>`;
                })
                .join('');
            const total = linked.reduce((s, lu) => s + (parseFloat(lu.monthlyRent) || 0), 0);
            const body = `<p style="font-size:12px;color:#555;margin:0 0 8px;line-height:1.5">${t(
                'عقد واحد يشمل الوحدات التالية — الإيجار الإجمالي محسوب لكل وحدة على حدة.',
                'One contract covers the units below — total rent is the sum of each unit.'
            )}</p>
                <table class="fin-print-table cfv-schedule-table" style="width:100%"><thead><tr>
                    <th>${t('الوحدة', 'Unit')}</th><th>${t('الطابق', 'Floor')}</th><th>${t('النوع', 'Type')}</th>
                    <th>${t('الإيجار الشهري', 'Monthly rent')}</th><th>${t('كهرباء', 'Electricity')}</th><th>${t('ماء', 'Water')}</th>
                </tr></thead><tbody>${rows}</tbody></table>
                <p style="font-size:12px;margin:10px 0 0"><b>${t('إجمالي الإيجار الشهري:', 'Total monthly rent:')}</b> ${escHtml(formatOMR(total))}</p>`;
            return cfvSectionWrap(t('الوحدات المرتبطة بالعقد / Linked contract units', 'Linked contract units / الوحدات المرتبطة'), body);
        }
        if (key === 'tenant') {
            const isCo = toStr(p.tenantEntityType) === 'company';
            const rows = isCo
                ? [
                      [t('نوع المستأجر / Tenant type', 'Tenant type / النوع'), t('شركة / Company', 'Company / شركة')],
                      [t('اسم الشركة / Company name', 'Company name / اسم الشركة'), p.tenantNameAr],
                      [t('السجل التجاري / CR no.', 'CR no. / السجل'), p.tenantCommercialRegNo],
                      [t('انتهاء السجل / CR expiry', 'CR expiry / انتهاء السجل'), p.tenantCommercialRegExpiryDate],
                      [t('الجوال / Mobile', 'Mobile / الجوال'), p.tenantMobile || u.mobile]
                  ]
                : [
                      [t('نوع المستأجر / Tenant type', 'Tenant type / النوع'), t('شخص / Person', 'Person / شخص')],
                      [t('الاسم (عربي) / Name (AR)', 'Name (AR) / الاسم'), p.tenantNameAr || u.tenant],
                      [t('الاسم (EN) / Name (EN)', 'Name (EN) / الاسم'), p.tenantNameEn || u.tenantEn],
                      [t('الرقم المدني / Civil ID', 'Civil ID / الرقم المدني'), p.tenantId || u.civilCard],
                      [t('الجواز / Passport', 'Passport / الجواز'), p.tenantPassport],
                      [t('الجنسية / Nationality', 'Nationality / الجنسية'), p.tenantNationality],
                      [t('الجوال / Mobile', 'Mobile / الجوال'), p.tenantMobile || u.mobile || u.contactNo],
                      [t('البريد / Email', 'Email / البريد'), p.tenantEmail]
                  ];
            return cfvSectionWrap(t('بيانات المستأجر / Tenant data', 'Tenant data / بيانات المستأجر'), cfvGridHtml(rows));
        }
        if (key === 'contract_terms') {
            const linked = getLinkedContractUnitsFromPayload(p);
            const rentDisplay =
                linked.length > 1
                    ? `${formatOMR(sumLinkedContractUnitsMonthlyRent(p))} (${linked
                          .map((lu) => `${lu.unit}: ${formatOMR(lu.monthlyRent)}`)
                          .join(t(' · ', ' · '))})`
                    : p.monthlyRent || u.monthlyRent;
            return cfvSectionWrap(
                t('شروط العقد والإيجار / Contract & rent terms', 'Contract & rent terms / شروط العقد'),
                cfvGridHtml([
                    [t('الإيجار الشهري / Monthly rent', 'Monthly rent / الإيجار'), rentDisplay],
                    [t('مدة العقد (أشهر) / Term (months)', 'Term (months) / المدة'), p.contractMonths],
                    [t('طريقة الدفع / Payment method', 'Payment method / الدفع'), p.paymentMethod],
                    [t('يوم دفع الإيجار / Rent payment day', 'Rent payment day / يوم الدفع'), p.agreedRentPaymentDay],
                    [t('مبلغ التأمين / Deposit', 'Deposit / التأمين'), p.depositAmount],
                    [t('رقم إيصال التأمين / Deposit receipt', 'Deposit receipt / إيصال التأمين'), p.depositReceiptRef],
                    [t('أيام السماح / Grace days', 'Grace days / السماح'), p.graceDays],
                    [t('مبلغ السماح / Grace amount', 'Grace amount / مبلغ السماح'), p.graceAmount],
                    [t('ضريبة القيمة المضافة / VAT', 'VAT / الضريبة'), toStr(p.contractSubjectToVat) === 'yes' ? t('نعم / Yes', 'Yes / نعم') : t('لا / No', 'No / لا')],
                    [t('نموذج البلدية / Municipal form', 'Municipal form / البلدية'), p.municipalFormNo],
                    [t('عقد البلدية / Municipal contract', 'Municipal contract / عقد البلدية'), p.municipalContractNo]
                ])
            );
        }
        if (key === 'documents') {
            const mandRows = Object.keys(ctx.mandDocs || {}).map((k) => {
                const att = ctx.mandDocs[k] || {};
                const present = contractAttachmentPresent(att) ? '✓' : '—';
                return [mandatoryDocKeyFallbackLabel(k), `${toStr(att.name) || '—'} ${present}`];
            });
            const otherRows = (ctx.otherDocs || []).map((doc) => {
                const ar = toStr(doc.titleAr);
                const en = toStr(doc.titleEn);
                const label = ar && en ? `${ar} / ${en}` : ar || en || toStr(doc.name);
                return [label, toStr(doc.name) || '—'];
            });
            const body =
                (mandRows.length
                    ? `<p style="font-weight:700;font-size:12px;margin:0 0 6px">${t('مستندات إلزامية / Mandatory', 'Mandatory / إلزامية')}</p>${cfvGridHtml(mandRows)}`
                    : '') +
                (otherRows.length
                    ? `<p style="font-weight:700;font-size:12px;margin:12px 0 6px">${t('مستندات إضافية / Other docs', 'Other docs / إضافية')}</p>${cfvGridHtml(otherRows)}`
                    : '') ||
                `<p style="font-size:12px;color:#666">${t('لا مستندات مسجّلة / No documents', 'No documents / لا مستندات')}</p>`;
            return cfvSectionWrap(t('المستندات / Documents', 'Documents / المستندات'), body);
        }
        if (key === 'financial') {
            return buildContractFinancialReceiptHtmlFromPayload(p, opts);
        }
        if (key === 'payments') {
            const cols = [
                { label: t('الشهر / Month', 'Month / الشهر'), render: (r) => escHtml(String(r.monthIndex || '—')) },
                { label: t('الاستحقاق / Due', 'Due / الاستحقاق'), render: (r) => escHtml(toStr(r.dueDate) || '—') },
                { label: t('المبلغ / Amount', 'Amount / المبلغ'), render: (r) => escHtml(summaryAmtOm(r.amount)) },
                { label: t('رقم الشيك / Cheque no.', 'Cheque no. / رقم الشيك'), render: (r) => escHtml(toStr(r.checkNo) || '—') }
            ];
            const rows = (ctx.paymentSchedule || []).slice().sort((a, b) => (a.monthIndex || 0) - (b.monthIndex || 0));
            return cfvSectionWrap(
                t('جدول الدفعات / Payment schedule', 'Payment schedule / جدول الدفعات'),
                cfvScheduleTableHtml(rows, cols, opts)
            );
        }
        if (key === 'cheques') {
            const rows = (ctx.paymentSchedule || [])
                .filter(
                    (r) =>
                        toStr(r.checkNo) ||
                        toStr(r.checkAttachmentName) ||
                        toStr(r.checkAttachmentRelativePath) ||
                        toStr(r.attachmentRelativePath)
                )
                .slice()
                .sort((a, b) => (a.monthIndex || 0) - (b.monthIndex || 0));
            const cols = [
                { label: t('الشهر / Month', 'Month / الشهر'), render: (r) => escHtml(String(r.monthIndex || '—')) },
                { label: t('رقم الشيك / Cheque no.', 'Cheque no. / رقم الشيك'), render: (r) => escHtml(toStr(r.checkNo) || '—') },
                { label: t('المبلغ / Amount', 'Amount / المبلغ'), render: (r) => escHtml(summaryAmtOm(r.amount)) },
                { label: t('المرفق / Attachment', 'Attachment / المرفق'), render: (r) => escHtml(toStr(r.checkAttachmentName || r.attachmentName) || '—') }
            ];
            return cfvSectionWrap(
                t('جدول الشيكات / Cheque schedule', 'Cheque schedule / جدول الشيكات'),
                cfvScheduleTableHtml(rows, cols, opts)
            );
        }
        if (key === 'vat_cheques') {
            const rows = (ctx.vatChequeSchedule || []).slice().sort((a, b) => (a.chequeIndex || 0) - (b.chequeIndex || 0));
            const cols = [
                { label: t('الشيك / Cheque', 'Cheque / الشيك'), render: (r) => escHtml(String(r.chequeIndex || '—')) },
                { label: t('الاستحقاق / Due', 'Due / الاستحقاق'), render: (r) => escHtml(toStr(r.dueDate) || '—') },
                { label: t('المبلغ / Amount', 'Amount / المبلغ'), render: (r) => escHtml(summaryAmtOm(r.amount)) },
                { label: t('رقم الشيك / Cheque no.', 'Cheque no. / رقم الشيك'), render: (r) => escHtml(toStr(r.checkNo) || '—') }
            ];
            return cfvSectionWrap(
                t('شيكات الضريبة / VAT cheques', 'VAT cheques / شيكات الضريبة'),
                cfvScheduleTableHtml(rows, cols, opts)
            );
        }
        if (key === 'insurance') {
            const rows = (ctx.insuranceDepositItems || []).map((it) => ({
                payType:
                    toStr(it.payType) === 'cheque'
                        ? t('شيك / Cheque', 'Cheque / شيك')
                        : toStr(it.payType) === 'cheque_group'
                          ? t('مجموعة شيكات / Cheque batch', 'Cheque batch / مجموعة')
                          : t('أخرى / Other', 'Other / أخرى'),
                reference: toStr(it.reference),
                amount: summaryAmtOm(it.amount),
                attachment: toStr(it.attachmentName) || '—'
            }));
            if (!rows.length) {
                return cfvSectionWrap(
                    t('بنود التأمين / Insurance lines', 'Insurance lines / بنود التأمين'),
                    `<p style="font-size:12px;color:#666">${t('لا بنود / No lines', 'No lines / لا بنود')}</p>`
                );
            }
            const cols = [
                { label: t('النوع / Type', 'Type / النوع'), render: (r) => escHtml(r.payType) },
                { label: t('المرجع / Reference', 'Reference / المرجع'), render: (r) => escHtml(r.reference) },
                { label: t('المبلغ / Amount', 'Amount / المبلغ'), render: (r) => escHtml(r.amount) },
                { label: t('مرفق / Att.', 'Att. / مرفق'), render: (r) => escHtml(r.attachment) }
            ];
            return cfvSectionWrap(
                t('بنود التأمين / Insurance lines', 'Insurance lines / بنود التأمين'),
                cfvScheduleTableHtml(rows, cols, opts)
            );
        }
        if (key === 'attachments') {
            return cfvSectionWrap(
                t('المرفقات / Attachments', 'Attachments / المرفقات'),
                buildContractFullViewAttachmentsGroupedHtml(ctx)
            );
        }
        return '';
    }

    function renderContractFullViewSectionCheckboxes() {
        const host = document.getElementById('contractFullViewSectionChecks');
        if (!host) return;
        host.innerHTML = getContractFullViewSectionDefs()
            .map(
                (sec) =>
                    `<label class="cfv-check"><input type="checkbox" class="cfv-sec-chk" data-cfv-key="${escAttr(sec.key)}" ${sec.default ? 'checked' : ''}><span>${escHtml(sec.label)}</span></label>`
            )
            .join('');
    }

    function contractFullViewSelectAllSections(on) {
        document.querySelectorAll('.cfv-sec-chk').forEach((el) => {
            el.checked = !!on;
        });
        renderContractFullViewPreview();
    }

    function collectContractFullViewSelectedKeys() {
        return [...document.querySelectorAll('.cfv-sec-chk:checked')]
            .map((el) => toStr(el.getAttribute('data-cfv-key')))
            .filter(Boolean);
    }

    async function renderContractFullViewPreview() {
        const preview = document.getElementById('contractFullViewPreview');
        const ctx = _contractFullViewCtx;
        if (!preview || !ctx) return;
        const keys = collectContractFullViewSelectedKeys();
        if (!keys.length) {
            preview.innerHTML = `<p style="color:#666;text-align:center;padding:40px 12px">${t('اختر قسماً واحداً على الأقل / Select at least one section', 'Select at least one section / اختر قسماً')}</p>`;
            return;
        }
        if (keys.includes('attachments')) {
            const ownerExtras = collectOwnerProfileAttachmentItemsForFullView(ctx);
            const buildingExtras = collectBuildingProfileAttachmentItemsForFullView(ctx);
            const propertyExtras = collectPropertyBundleAttachmentItemsForFullView(ctx);
            if (!ctx.attachmentItems?.length && ctx.unit) {
                try {
                    ctx.attachmentItems = await resolveContractAttachmentsForUnit(ctx.unit, {
                        includeDom: false,
                        syncStores: false
                    });
                } catch (_eCfvAtt) {
                    ctx.attachmentItems = collectAllContractPrintableAttachmentsFromPayload(ctx.payload);
                }
            }
            const mergedItems = mergeContractPrintableAttachmentLists(
                ownerExtras,
                buildingExtras,
                propertyExtras,
                ctx.attachmentItems || []
            );
            const hydrated = [];
            for (const it of mergedItems) {
                let url = toStr(it.dataUrl);
                if (!url) {
                    try {
                        url = await bhdResolveAttachmentUrl(it);
                    } catch (_eHydr) {
                        url = '';
                    }
                }
                hydrated.push({ ...it, dataUrl: url || toStr(it.dataUrl) });
            }
            ctx.hydratedAttachments = enrichContractAttachmentPreviewMeta(hydrated, ctx.payload);
        }
        preview.innerHTML = keys.map((k) => buildContractFullViewSectionHtml(k, ctx)).join('');
    }

    async function openContractFullViewModal(unit, opt = {}) {
        let payload = opt.payload || getContractPayloadForUnit(unit);
        if (!payload || !toStr(payload.agreementNo || unit?.agreementNo)) {
            alert(
                t(
                    'لا يوجد عقد محفوظ كامل لهذه الوحدة بعد.',
                    'No complete saved contract for this unit yet.'
                )
            );
            return;
        }
        const primary = resolveContractWorkflowPrimaryUnit(unit?.building, unit?.unit, payload);
        const viewUnit = { building: primary.building, unit: primary.unit };
        const viewPayload = getContractPayloadForUnit(viewUnit) || payload;
        const linked = getLinkedContractUnitsFromPayload(viewPayload);
        _contractFullViewCtx = buildContractFullViewData(viewUnit, viewPayload);
        const title = document.getElementById('contractFullViewTitle');
        if (title) {
            const versionSuffix = toStr(opt.versionLabel) ? ` — ${toStr(opt.versionLabel)}` : '';
            const unitLabel =
                linked.length > 1
                    ? formatLinkedContractUnitsLabel(viewPayload)
                    : toStr(viewUnit.unit);
            title.textContent = `${t('عرض تفاصيل العقد', 'Contract full view')} — ${unitLabel} | ${toStr(viewUnit.building)}${versionSuffix}`;
        }
        renderContractFullViewSectionCheckboxes();
        document.getElementById('contractFullViewModal')?.classList.add('open');
        if (opt.payload) {
            _contractFullViewCtx.attachmentItems = collectAllContractPrintableAttachmentsFromPayload(viewPayload);
        } else {
            try {
                _contractFullViewCtx.attachmentItems = await resolveContractAttachmentsForUnit(viewUnit, {
                    includeDom: false,
                    syncStores: false
                });
            } catch (_eCfvOpen) {
                _contractFullViewCtx.attachmentItems = collectAllContractPrintableAttachmentsFromPayload(viewPayload);
            }
        }
        await renderContractFullViewPreview();
    }

    function closeContractFullViewModal() {
        document.getElementById('contractFullViewModal')?.classList.remove('open');
        const preview = document.getElementById('contractFullViewPreview');
        if (preview) preview.innerHTML = '';
        _contractFullViewCtx = null;
    }

    async function printContractFullView() {
        const ctx = _contractFullViewCtx;
        if (!ctx) {
            alert(t('لا يوجد محتوى للطباعة / Nothing to print', 'Nothing to print / لا محتوى'));
            return;
        }
        const keys = collectContractFullViewSelectedKeysOrdered();
        if (!keys.length) {
            alert(t('اختر قسماً واحداً على الأقل / Select at least one section', 'Select at least one section / اختر قسماً'));
            return;
        }
        const unit = ctx.unit;
        const ag = toStr(ctx.payload?.agreementNo || unit?.agreementNo);
        const title = {
            ar: `عرض تفاصيل العقد — ${toStr(unit?.unit)} | ${toStr(unit?.building)}${ag ? ` — ${ag}` : ''}`,
            en: `Contract full view — ${toStr(unit?.unit)} | ${toStr(unit?.building)}${ag ? ` — ${ag}` : ''}`
        };
        const sectionKeys = keys.filter((k) => k !== 'attachments');
        let bodyHtml = buildContractFullViewPrintSectionsHtml(ctx, keys);
        if (keys.includes('attachments')) {
            const items = await hydrateContractFullViewAttachmentsForPrint(ctx);
            const prefix = `${toStr(unit?.building)}-${toStr(unit?.unit)}`;
            if (items.length) {
                bodyHtml += cfvSectionWrap(
                    t('المرفقات / Attachments', 'Attachments / المرفقات'),
                    `<p style="font-size:11pt;color:#555;margin:0 0 8px;line-height:1.5">${t(
                        `${items.length} مرفق — مرتّب: المالك، العقار، المستأجر، الشيكات، التأمين، أوراق العقار`,
                        `${items.length} attachment(s) — ordered: owner, property, tenant, cheques, insurance, property papers`
                    )}</p>`
                );
                bodyHtml += buildContractAttachmentsPrintPagesHtml(items, prefix, {
                    breakBeforeFirst: sectionKeys.length > 0
                });
            } else {
                bodyHtml += cfvSectionWrap(
                    t('المرفقات / Attachments', 'Attachments / المرفقات'),
                    `<p style="font-size:12px;color:#666">${t('لا مرفقات قابلة للطباعة / No printable attachments', 'No printable attachments / لا مرفقات')}</p>`
                );
            }
        }
        if (!toStr(bodyHtml).trim()) {
            alert(t('لا يوجد محتوى للطباعة / Nothing to print', 'Nothing to print / لا محتوى'));
            return;
        }
        const win = window.open('', '_blank');
        if (!win) {
            alert(t('تعذر فتح نافذة الطباعة — اسمح بالنوافذ المنبثقة.', 'Could not open print window — allow pop-ups.'));
            return;
        }
        const generatedAt = new Date();
        const arDate = generatedAt.toLocaleString('ar-OM', { dateStyle: 'medium', timeStyle: 'short' });
        const enDate = generatedAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
        const fullBody = `
            <div class="doc-title">
                <h2>${escHtml(title.ar)}</h2>
                <h3>${escHtml(title.en)}</h3>
            </div>
            <p class="property-report-meta">تاريخ إصدار التقرير / Report generated: ${escHtml(arDate)} · ${escHtml(enDate)}</p>
            <p class="property-report-meta property-report-by"><strong>منشئ التقرير / Prepared by:</strong> ${getReportPreparedByHtml()}</p>
            ${bodyHtml}`;
        try {
            win.document.open();
            win.document.write(`
            <!DOCTYPE html>
            <html lang="ar"><head><meta charset="utf-8"><title>${escHtml(title.ar)} — BHD</title>
            <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&family=Roboto&display=swap" rel="stylesheet">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Tajawal', 'Roboto', sans-serif; direction: rtl; background: white; color: #1a1a1a; font-size: 12pt; line-height: 1.55; }
                .document { --doc-accent: #6b1f35; --doc-accent-dark: #4a1525; width: 100%; }
                .doc-title { text-align: center; margin: 12px 0 10px; border-bottom: 2px double #6b1f35; padding-bottom: 8px; }
                .doc-title h2 { font-size: 16pt; color: #6b1f35; margin: 0; font-weight: 800; }
                .doc-title h3 { font-size: 12pt; font-weight: normal; color: #444; margin: 5px 0 0; direction: ltr; font-family: 'Roboto', sans-serif; }
                .property-report-meta { font-size: 11pt; color: #555; margin-bottom: 8px; text-align: center; }
                .property-report-by { margin-bottom: 14px; font-weight: 600; color: #333; }
                ${getCfvPrintStylesCss()}
                ${getContractAttachmentsPrintStylesCss()}
                @page { size: A4 portrait; margin: 10mm 12mm; }
            </style></head>
            <body dir="rtl">
                <div class="document">${fullBody}</div>
            </body></html>`);
            win.document.close();
        } catch (_eCfvPrint) {
            alert(t('تعذر تجهيز نافذة الطباعة.', 'Could not prepare the print window.'));
            try {
                win.close();
            } catch (_eClose) {}