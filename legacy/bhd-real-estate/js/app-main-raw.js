        <script>
        (function(){
            var tok=${tokJson};
            var btn=document.getElementById('bhdPrintToolbarBtn');
            var cls=document.getElementById('bhdPrintToolbarClose');
            if(btn) btn.addEventListener('click',function(){
                if(window.opener&&window.opener.bhdTriggerPrintPreview){ window.opener.bhdTriggerPrintPreview(tok); }
                else { window.print(); }
            });
            if(cls) cls.addEventListener('click',function(){ window.close(); });
        })();
        <\/script>`;
    }
    function getContractPrintWindowToolbarCss() {
        return `
            .bhd-print-toolbar {
                position: fixed; top: 0; left: 0; right: 0; z-index: 10000;
                display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; align-items: center;
                padding: 10px 14px; background: #2a3f4d; box-shadow: 0 2px 10px rgba(0,0,0,.25);
            }
            .bhd-print-toolbar button {
                padding: 10px 20px; font-size: 14px; font-weight: 700; cursor: pointer;
                border: none; border-radius: 8px; font-family: 'Tajawal', 'Roboto', sans-serif;
            }
            .bhd-print-toolbar-primary { background: #c9a227; color: #1a1a1a; }
            .bhd-print-toolbar-secondary { background: #fff; color: #333; }
            body.bhd-print-preview-body { padding-top: 58px; }
            @media print {
                .bhd-print-toolbar, .no-print { display: none !important; }
                body.bhd-print-preview-body { padding-top: 0 !important; }
            }`;
    }
    async function printContractDocumentsByIndices(indices, opt = {}) {
        const suppressAlerts = opt.suppressAlerts === true;
        const closeOnFail = opt.closeOnFail === true;
        const cancellation07Only =
            isContractCancellationFormOnlyPrint(indices) && opt.includeAttachments !== true;
        const formDataOverride =
            opt.formDataOverride && typeof opt.formDataOverride === 'object' ? opt.formDataOverride : null;
        let pushedOverride = false;
        if (formDataOverride) {
            pushFormDataOverride(formDataOverride);
            pushedOverride = true;
        }
        let attachmentItems = cancellation07Only
            ? []
            : Array.isArray(opt.attachmentItems)
              ? opt.attachmentItems
              : [];
        let printCtx = {};
        try {
            printCtx = formDataOverride || getFormData();
        } catch (_ePctx) {}
        const shouldHydrateAttachments = !cancellation07Only && opt.hydrateAttachments !== false;
        if (shouldHydrateAttachments) {
            if (!opt.skipDiskAttachmentMerge) {
                try {
                    const diskAll = await collectContractAttachmentsFromDiskDirect(printCtx);
                    attachmentItems = mergeContractPrintableAttachmentLists(attachmentItems, diskAll);
                } catch (_eDiskPr) {}
            }
            const preHydrateCount = attachmentItems.length;
            if (attachmentItems.length) {
                attachmentItems = await repairContractPrintAttachmentItemsFromDisk(attachmentItems, printCtx);
                attachmentItems = await bhdHydrateAttachmentItemsForPrint(attachmentItems);
                attachmentItems = await bhdExpandPdfAttachmentsForPrint(attachmentItems);
            }
            const hasForms = Array.isArray(indices) && indices.length > 0;
            const hasAttachments = attachmentItems.length > 0;
            if (preHydrateCount && !hasAttachments && !suppressAlerts) {
                alert(
                    t(
                        'تعذّر تحميل المرفقات من التخزين (شيكات أو إيصالات). تأكد من مجلد البيانات وأن الملفات موجودة على القرص، ثم أعد المحاولة.',
                        'Could not load attachments from storage (cheques or receipts). Check the data folder and that files exist on disk, then try again.'
                    )
                );
                if (!hasForms) {
                    if (pushedOverride) popFormDataOverride();
                    return { ok: false, reason: 'attachments_hydrate_failed' };
                }
            }
        }
        const rawAttachmentCount = attachmentItems.length;
        const hasForms = Array.isArray(indices) && indices.length > 0;
        const hasAttachments = attachmentItems.length > 0;
        if (!hasForms && !hasAttachments) {
            if (pushedOverride) popFormDataOverride();
            if (!suppressAlerts) {
                alert(
                    t(
                        '⚠️ لم يُحدد أي استمارة أو مرفق للطباعة.',
                        '⚠️ No form or attachment selected for printing.'
                    )
                );
            }
            return { ok: false, reason: 'no_content' };
        }
        let formData = {};
        let bodyHtml = '';
        if (hasForms) {
            if (!opt.skipValidation && !(await validateCoreData())) {
                if (pushedOverride) popFormDataOverride();
                return { ok: false, reason: 'validation' };
            }
            formData = formDataOverride || getFormData();
            const chunks = indices
                .map((i, docIdx) => {
                    if (typeof renderers[i] !== 'function') return '';
                    const wrap = document.createElement('div');
                    wrap.className =
                        'document doc-theme-royal-maroon bhd-contract-form-print' +
                        (docIdx > 0 ? ' bhd-contract-form-print--break-before' : '');
                    wrap.innerHTML = documentShellForFormPrint(renderers[i](), formData);
                    return wrap.outerHTML;
                })
                .filter(Boolean);
            if (!chunks.length) {
                if (pushedOverride) popFormDataOverride();
                if (!suppressAlerts) {
                    alert(t('⚠️ لا توجد استمارات صالحة للطباعة.', '⚠️ No valid forms to print.'));
                }
                return { ok: false, reason: 'no_chunks' };
            }
            bodyHtml = chunks.join('');
            const includeFinancialReceipt = cancellation07Only
                ? false
                : opt.includeFinancialReceipt !== false;
            if (includeFinancialReceipt) {
                try {
                    const receiptHtml = formDataOverride
                        ? buildContractFinancialReceiptHtmlFromPayload(formDataOverride)
                        : buildContractFinancialReceiptHtml();
                    if (receiptHtml) {
                        bodyHtml += `<div class="document doc-theme-royal-maroon bhd-contract-form-print bhd-contract-form-print--break-before">${receiptHtml}</div>`;
                    }
                } catch (_eRcptPr) {}
            }
        } else {
            try {
                formData = formDataOverride || getFormData();
            } catch (_eFd) {
                formData = {};
            }
        }
        if (hasAttachments) {
            let printPayload = {};
            try {
                printPayload = formDataOverride || getFormData();
            } catch (_ePp) {}
            attachmentItems = enrichContractAttachmentPreviewMeta(attachmentItems, printPayload);
            bodyHtml += buildContractAttachmentsPrintPagesHtml(attachmentItems, toStr(opt.unitPrefix), {
                breakBeforeFirst: hasForms
            });
        }
        let printToken = toStr(opt.printToken);
        if (!printToken && bhdIsDesktopApp() && window.bhdDesktop?.allocPrintWindowToken) {
            try {
                printToken = await window.bhdDesktop.allocPrintWindowToken();
            } catch (_eTok) {
                printToken = '';
            }
        }
        let win = opt.targetWindow || null;
        if (win) {
            try {
                if (win.closed) win = null;
            } catch (_eClosed) {
                win = null;
            }
        }
        if (!win) {
            try {
                win = window.open('', '_blank');
            } catch (_eOpen) {
                win = null;
            }
        }
        if (win) {
            try {
                window._bhdLastPrintPreviewWin = win;
            } catch (_eRef) {}
        }
        if (!win) {
            if (pushedOverride) popFormDataOverride();
            if (!suppressAlerts) {
                alert('تعذر فتح نافذة الطباعة — اسمح بالنوافذ المنبثقة.\nAllow pop-ups to print.');
            }
            return { ok: false, reason: 'popup_blocked' };
        }
        const attCountNote = hasAttachments
            ? ` — ${attachmentItems.length} ${t('مرفق', 'attachment')}`
            : rawAttachmentCount
              ? ` — ${t('بدون مرفقات محمّلة', 'no attachments loaded')}`
              : '';
        const titleAr =
            (hasAttachments && !hasForms
                ? t('مرفقات العقد', 'Contract attachments')
                : t('طباعة مجموعة مستندات', 'Print document set')) + attCountNote;
        try {
            win.document.open();
            win.document.write(`
            <!DOCTYPE html>
            <html lang="ar"><head><meta charset="utf-8"><title>${titleAr} - BHD</title>
            <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&family=Roboto&display=swap" rel="stylesheet">
            <style>${buildContractPrintPageMarginCss(formData)}${getContractDocumentPrintStylesCss()}${getContractAttachmentsPrintStylesCss()}${getContractPrintWindowToolbarCss()}</style></head>
            <body dir="rtl" class="bhd-print-preview-body">
                ${getContractPrintWindowToolbarHtml(printToken)}
                ${bodyHtml}
            </body></html>`);
            win.document.close();
        } catch (_eWrite) {
            if (pushedOverride) popFormDataOverride();
            if (closeOnFail) {
                try {
                    win.close();
                } catch (_eClose) {}
            }
            if (!suppressAlerts) {
                alert('تعذر تجهيز نافذة الطباعة.\nCould not prepare the print window.');
            }
            return { ok: false, reason: 'write_failed' };
        }
        if (pushedOverride) popFormDataOverride();
        const triggerPrint = () => {
            triggerPrintWindowWhenReady(win, hasAttachments ? 650 : 350, printToken);
            if (typeof opt.afterPrint === 'function') {
                let afterDone = false;
                const runAfter = () => {
                    if (afterDone) return;
                    afterDone = true;
                    try {
                        opt.afterPrint();
                    } catch (_eAp) {}
                };
                try {
                    win.addEventListener('afterprint', runAfter, { once: true });
                } catch (_eEv) {}
                setTimeout(runAfter, 3600);
            }
        };
        if (win.document.readyState === 'complete') {
            setTimeout(triggerPrint, hasAttachments ? 120 : 350);
        } else {
            win.onload = () => setTimeout(triggerPrint, hasAttachments ? 120 : 350);
        }
        return { ok: true, attachmentCount: attachmentItems.length };
    }
    function contractPrintAttachmentsSelected() {
        const el = document.getElementById('contractsPrintAttachments');
        return el ? !!el.checked : true;
    }
    function canonicalPrintAttachmentKey(key) {
        const k = toStr(key);
        if (k.startsWith('ab_')) return k.slice(3);
        return k;
    }

    function printAttachmentDedupeTokens(it) {
        const url = pickEmbeddedDataUrl(it, it?.dataUrl, it?.checkAttachmentDataUrl, it?.attachmentDataUrl);
        const rel =
            toStr(it?.relativePath) ||
            toStr(it?.checkAttachmentRelativePath) ||
            toStr(it?.attachmentRelativePath);
        const key = canonicalPrintAttachmentKey(it?.key);
        const tokens = [];
        if (key && !/^disk_/i.test(key)) tokens.push(`key:${key}`);
        if (rel) tokens.push(`rel:${rel}`);
        if (toStr(it?.fileId)) tokens.push(`fid:${toStr(it.fileId)}`);
        if (url) tokens.push(`url:${url.length > 120 ? url.slice(0, 120) : url}`);
        return tokens;
    }

    function mergeContractPrintableAttachmentLists() {
        const seen = new Set();
        const out = [];
        for (let li = 0; li < arguments.length; li += 1) {
            const list = arguments[li];
            if (!Array.isArray(list)) continue;
            list.forEach((it) => {
                const tokens = printAttachmentDedupeTokens(it);
                if (!tokens.length || tokens.some((tok) => seen.has(tok))) return;
                tokens.forEach((tok) => seen.add(tok));
                const url = pickEmbeddedDataUrl(it, it?.dataUrl, it?.checkAttachmentDataUrl, it?.attachmentDataUrl);
                const rel =
                    toStr(it?.relativePath) ||
                    toStr(it?.checkAttachmentRelativePath) ||
                    toStr(it?.attachmentRelativePath);
                const next = { ...it };
                const canonKey = canonicalPrintAttachmentKey(it?.key);
                if (canonKey) next.key = canonKey;
                if (url) next.dataUrl = url;
                if (rel && !toStr(next.relativePath)) next.relativePath = rel;
                out.push(next);
            });
        }
        return out;
    }
    async function resolveContractWorkspacePrintableAttachments() {
        let d = {};
        try {
            d = getFormData();
        } catch (_eFd) {}
        const unit = { building: d.buildingNo, unit: d.flatNo };
        const sources = listContractPayloadSourcesForUnit(unit);
        const mergedPayload = buildMergedContractAttachmentPayload(sources);
        try {
            if (mergedPayload) syncContractPrintAttachmentsFromPayload(mergedPayload);
        } catch (_eSyncPl) {}
        try {
            syncContractPrintAttachmentsToStore();
        } catch (_eSyncDom) {}
        const fromDom = collectAllContractPrintableAttachmentsFromDom();
        let fromAb = [];
        try {
            if (findAddressBookTenantIndexForContract() >= 0) {
                fromAb = collectAddressBookPrintableAttachments(unit, mergedPayload);
            }
        } catch (_eAbWs) {}
        let diskItems = [];
        try {
            diskItems = await collectContractAttachmentsFromDiskDirect(d);
        } catch (_eDiskFb) {}
        const fromPayload = mergedPayload
            ? collectAllContractPrintableAttachmentsFromPayload(mergedPayload)
            : [];
        return mergeContractPrintableAttachmentLists(fromDom, diskItems, fromPayload, fromAb);
    }
    async function runContractSelectedPrint() {
        const indices = collectContractPrintIndices();
        const attachmentItems = contractPrintAttachmentsSelected()
            ? await resolveContractWorkspacePrintableAttachments()
            : [];
        const d = getFormData();
        const prefix =
            toStr(d.buildingNo) && toStr(d.flatNo) ? `${toStr(d.buildingNo)}-${toStr(d.flatNo)}` : '';
        await printContractDocumentsByIndices(indices, { attachmentItems, unitPrefix: prefix });
        closeContractPrintMenu();
    }
    async function runContractPostSavePrint() {
        const boxes = document.querySelectorAll('.cw-print-chk');
        boxes.forEach((b) => {
            const v = parseInt(b.value, 10);
            b.checked = CONTRACT_POST_SAVE_PRINT_INDICES.includes(v);
        });
        const attachmentItems = contractPrintAttachmentsSelected()
            ? await resolveContractWorkspacePrintableAttachments()
            : [];
        const d = getFormData();
        const prefix =
            toStr(d.buildingNo) && toStr(d.flatNo) ? `${toStr(d.buildingNo)}-${toStr(d.flatNo)}` : '';
        await printContractDocumentsByIndices(CONTRACT_POST_SAVE_PRINT_INDICES, {
            attachmentItems,
            unitPrefix: prefix
        });
        closeContractPrintMenu();
    }
    function toggleUnitDetailsContractMenu(ev) {
        if (ev) ev.stopPropagation();
        if (!selectedUnitDetailsRecord || !unitDetailsAllowsContractPrintActions(selectedUnitDetailsRecord)) return;
        const p = document.getElementById('unitDetailsContractPanel');
        const o = document.getElementById('unitDetailsPrintPanel');
        if (!p) return;
        const open = p.hidden;
        if (o) o.hidden = true;
        p.hidden = !open;
    }
    function toggleUnitDetailsPrintMenu(ev) {
        if (ev) ev.stopPropagation();
        if (!selectedUnitDetailsRecord || !unitDetailsAllowsContractPrintActions(selectedUnitDetailsRecord)) return;
        const p = document.getElementById('unitDetailsPrintPanel');
        const o = document.getElementById('unitDetailsContractPanel');
        if (!p) return;
        const open = p.hidden;
        if (o) o.hidden = true;
        p.hidden = !open;
    }
    function prefillUnitDetailsForPrint() {
        if (!selectedUnitDetailsRecord || !unitDetailsAllowsContractPrintActions(selectedUnitDetailsRecord)) return;
        const asRenew = document.getElementById('unitDetailsPrintAsRenewal')?.checked;
        prefillContractFromUnit(selectedUnitDetailsRecord, !!asRenew);
    }
    function collectUnitDetailsPrintIndices() {
        const boxes = document.querySelectorAll('.ud-print-chk:checked');
        const idx = [...boxes].map((x) => parseInt(x.value, 10)).filter((n) => !Number.isNaN(n));
        return [...new Set(idx)].sort((a, b) => a - b);
    }
    async function printPrefilledContractDocuments(indices, opt = {}) {
        if (!selectedUnitDetailsRecord) return;
        await printContractDocumentsByIndices(indices, opt);
    }
    async function runUnitDetailsSelectedPrint() {
        if (!selectedUnitDetailsRecord || !unitDetailsAllowsContractPrintActions(selectedUnitDetailsRecord)) return;
        prefillUnitDetailsForPrint();
        try {
            mergeMandatoryDocsFromAddressBookAfterLoadIfMatch();
        } catch (_eAbMerge) {}
        const indices = collectUnitDetailsPrintIndices();
        const wantAttachments = unitDetailsPrintAttachmentsSelected();
        const attachmentItems = wantAttachments ? await resolveContractPrintableAttachments() : [];
        if (!indices.length && !attachmentItems.length) {
            alert(
                t(
                    '⚠️ لم يُحدد أي استمارة أو مرفق للطباعة.',
                    '⚠️ No form or attachment selected for printing.'
                )
            );
            return;
        }
        const unit = selectedUnitDetailsRecord;
        const prefix = unit ? `${toStr(unit.building)}-${toStr(unit.unit)}` : '';
        await printPrefilledContractDocuments(indices, {
            attachmentItems,
            unitPrefix: prefix
        });
        closeUnitDetailsIeMenus();
    }
    function runUnitDetailsCommonPrint() {
        if (!selectedUnitDetailsRecord || !unitDetailsAllowsContractPrintActions(selectedUnitDetailsRecord)) return;
        const boxes = document.querySelectorAll('.ud-print-chk');
        boxes.forEach((b) => {
            const v = parseInt(b.value, 10);
            b.checked = [0, 4, 5, 7].includes(v);
        });
        const attBox = document.getElementById('unitDetailsPrintAttachments');
        if (attBox) attBox.checked = true;
        runUnitDetailsSelectedPrint();
    }

    function getUnitOccupancyMode(unit) {
        return toStr(unit?.status).toLowerCase() === 'vacant' ? 'vacant' : 'rented';
    }

    function ensureUnitActionAllowed(unit, kind) {
        const mode = getUnitOccupancyMode(unit);
        if (kind === 'new' && mode !== 'vacant') {
            alert('لا يمكن تسجيل عقد جديد لوحدة مؤجرة. اختر تجديد أو إلغاء العقد.\nNew contract is allowed only for vacant units. Use renew/cancel for rented units.');
            return false;
        }
        if ((kind === 'renew' || kind === 'cancel') && mode !== 'rented') {
            alert('التجديد أو الإلغاء متاح فقط للعقود المؤجرة.\nRenewal/cancellation is available only for rented units.');
            return false;
        }
        return true;
    }

    function unitDetailsAllowsContractRenewal(unit) {
        if (!unit) return false;
        if (unitDetailsHasCancellationRequest(unit)) return false;
        if (toStr(unit.status).toLowerCase() !== 'rented') return false;
        const payload = getContractPayloadForUnit(unit);
        if (!payload || !toStr(payload.agreementNo || unit.agreementNo)) return false;
        return !!toStr(unit.endDate || payload.endDate);
    }

    function computeRenewalNewStartDate(prevEndYmd) {
        const end = parseYmdToLocalDate(prevEndYmd);
        if (!end || Number.isNaN(end.getTime())) {
            return formatDateYmdLocal(new Date());
        }
        const d = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
        return formatDateYmdLocal(d);
    }

    let _contractRenewalCtx = null;
    let _contractRenewalPeriodSyncBusy = false;

    function resolvePreviousContractMonthlyRent(payload, unit) {
        const linked = getLinkedContractUnitsFromPayload(payload);
        if (linked.length > 1) {
            const total = sumLinkedContractUnitsMonthlyRent(payload);
            return total > 0 ? formatRentAmountForInput(total) : '';
        }
        const n = parseRentAmountInput(payload?.monthlyRent ?? unit?.monthlyRent);
        return n === '' ? '' : formatRentAmountForInput(n);
    }

    function resolveRenewalNewMonthlyRent(preserved, draftPayload, prevRent) {
        if (preserved?.monthlyRent != null && toStr(preserved.monthlyRent) !== '') {
            const fromRenewal = formatRentAmountForInput(preserved.monthlyRent);
            if (fromRenewal !== '') return fromRenewal;
        }
        if (draftPayload?.monthlyRent != null && toStr(draftPayload.monthlyRent) !== '') {
            const fromDraft = formatRentAmountForInput(draftPayload.monthlyRent);
            if (fromDraft !== '') return fromDraft;
        }
        return prevRent;
    }

    function pullRenewalMonthlyRentFromPrevious() {
        const ctx = _contractRenewalCtx;
        if (!ctx) return;
        const payload = getRenewalWizardPayloadRef();
        const prev = resolvePreviousContractMonthlyRent(payload || ctx.payload, ctx.unit);
        const el = document.getElementById('crnNewMonthlyRent');
        if (el) el.value = prev;
        if (payload && getLinkedContractUnitsFromPayload(payload).length > 1) {
            applyRenewalRentToLinkedUnits(payload, prev);
            renderRenewalLinkedUnitsPanel(payload);
        }
        refreshRenewalRentChangeHint();
    }

    function refreshRenewalRentChangeHint() {
        const hint = document.getElementById('crnRentChangeHint');
        if (!hint) return;
        const ctx = _contractRenewalCtx;
        const prev = parseRentAmountInput(resolvePreviousContractMonthlyRent(ctx?.payload, ctx?.unit));
        const next = parseRentAmountInput(document.getElementById('crnNewMonthlyRent')?.value);
        if (prev === '' || next === '') {
            hint.textContent = t(
                'تُجلب القيمة من العقد السابق ويمكن تعديلها للعقد الجديد.',
                'Rent is copied from the previous contract and may be updated for the new term.'
            );
            hint.className = 'crn-summary-line';
            return;
        }
        const diff = next - prev;
        if (Math.abs(diff) < 0.0005) {
            hint.textContent = t(
                `بدون تغيير عن السابق: ${formatOMR(prev)}`,
                `Unchanged from previous: ${formatOMR(prev)}`
            );
            hint.className = 'crn-summary-line';
            return;
        }
        const pct = prev > 0 ? ((diff / prev) * 100).toFixed(1) : '—';
        const newStart = toStr(document.getElementById('crnNewStart')?.value);
        const newEnd = toStr(document.getElementById('crnNewEnd')?.value);
        const months = parseInt(toStr(document.getElementById('crnNewMonths')?.value), 10) || 0;
        let periodNote = '';
        if (newStart && newEnd && months > 0) {
            const pseudoPayload = { monthlyRent: next, contractMonths: String(months), startDate: newStart, endDate: newEnd };
            const prevTotal = computeHypotheticalRentTotalForPayload(pseudoPayload, prev);
            const newTotal = computeHypotheticalRentTotalForPayload(pseudoPayload, next);
            const totalDiff = newTotal - prevTotal;
            if (Math.abs(totalDiff) >= 0.0005) {
                periodNote =
                    totalDiff > 0
                        ? t(
                              ` · إجمالي الفترة: ${formatOMR(prevTotal)} → ${formatOMR(newTotal)} (+${formatOMR(totalDiff)})`,
                              ` · Period total: ${formatOMR(prevTotal)} → ${formatOMR(newTotal)} (+${formatOMR(totalDiff)})`
                          )
                        : t(
                              ` · إجمالي الفترة: ${formatOMR(prevTotal)} → ${formatOMR(newTotal)} (${formatOMR(totalDiff)})`,
                              ` · Period total: ${formatOMR(prevTotal)} → ${formatOMR(newTotal)} (${formatOMR(totalDiff)})`
                          );
            }
        }
        if (diff > 0) {
            hint.textContent =
                t(
                    `زيادة: ${formatOMR(prev)} → ${formatOMR(next)} (+${formatOMR(diff)} / ${pct}%)`,
                    `Increase: ${formatOMR(prev)} → ${formatOMR(next)} (+${formatOMR(diff)} / ${pct}%)`
                ) + periodNote;
            hint.className = 'crn-summary-line crn-rent-change-up';
        } else {
            hint.textContent =
                t(
                    `نقصان: ${formatOMR(prev)} → ${formatOMR(next)} (${formatOMR(diff)} / ${pct}%)`,
                    `Decrease: ${formatOMR(prev)} → ${formatOMR(next)} (${formatOMR(diff)} / ${pct}%)`
                ) + periodNote;
            hint.className = 'crn-summary-line crn-rent-change-down';
        }
        try {
            refreshRenewalGapsBanner();
        } catch (_eGapRent) {}
    }

    function renderContractRenewalSummary() {
        const ctx = _contractRenewalCtx;
        if (!ctx) return;
        const prevStart = ctx.prevStart;
        const prevEnd = ctx.prevEnd;
        const newStart = toStr(document.getElementById('crnNewStart')?.value);
        const newEnd = toStr(document.getElementById('crnNewEnd')?.value);
        const months = toStr(document.getElementById('crnNewMonths')?.value);
        const prevPeriodEl = document.getElementById('crnPrevPeriodDisplay');
        const newPeriodEl = document.getElementById('crnNewPeriodDisplay');
        const combinedLine = document.getElementById('crnCombinedPeriodLine');
        const combinedDays = document.getElementById('crnCombinedDaysLine');
        if (prevPeriodEl) {
            prevPeriodEl.value = formatContractPeriodBilingual(prevStart, prevEnd);
        }
        const newPeriod = computeContractPeriodMonthsAndExtraDays(newStart, newEnd, months);
        const extraDaysEl = document.getElementById('crnNewExtraDays');
        if (extraDaysEl && newStart && newEnd) {
            extraDaysEl.value = String(newPeriod.extraDays || 0);
        }
        if (newPeriodEl) {
            newPeriodEl.value =
                newStart && newEnd
                    ? formatContractPeriodBilingual(newStart, newEnd)
                    : formatContractPeriodBilingual(newStart, newEnd, months);
        }
        if (combinedLine) {
            const prevPart = formatContractPeriodBilingual(prevStart, prevEnd);
            const newPart =
                newStart && newEnd
                    ? formatContractPeriodBilingual(newStart, newEnd)
                    : formatContractPeriodBilingual(newStart, newEnd, months);
            const totalPart = formatContractPeriodBilingual(prevStart, newEnd);
            combinedLine.textContent = `${t('السابق', 'Previous')}: ${prevPart} · ${t('الجديد', 'New')}: ${newPart} · ${t('الإجمالي', 'Total')}: ${totalPart}`;
        }
        if (combinedDays) {
            const days = computeContractPeriodDaysInclusive(prevStart, newEnd);
            combinedDays.textContent =
                days > 0
                    ? t(`إجمالي الأيام (شاملة): ${days} يوم`, `Total calendar days (inclusive): ${days} days`)
                    : '—';
        }
        refreshRenewalRentChangeHint();
        refreshRenewalGapsBanner();
    }

    function recomputeContractRenewalPeriodFields(lastFieldId) {
        if (_contractRenewalPeriodSyncBusy) return;
        const fid = toStr(lastFieldId);
        const monthsEl = document.getElementById('crnNewMonths');
        const startEl = document.getElementById('crnNewStart');
        const endEl = document.getElementById('crnNewEnd');
        if (!monthsEl || !startEl || !endEl) return;
        const start = toStr(startEl.value).trim();
        const end = toStr(endEl.value).trim();
        const monthsRaw = parseInt(toStr(monthsEl.value), 10);
        _contractRenewalPeriodSyncBusy = true;
        try {
            if (fid === 'contractMonths') {
                if (start && monthsRaw >= 1) {
                    const nextEnd = calculateEndDateFromStartAndMonths(start, monthsRaw);
                    if (nextEnd) endEl.value = nextEnd;
                }
            } else if (fid === 'endDate' || fid === 'startDate') {
                if (start && end) {
                    const period = computeContractPeriodMonthsAndExtraDays(start, end, monthsRaw);
                    if (period.months >= 1) monthsEl.value = String(period.months);
                    const extraDaysEl = document.getElementById('crnNewExtraDays');
                    if (extraDaysEl) extraDaysEl.value = String(period.extraDays || 0);
                }
            }
        } finally {
            _contractRenewalPeriodSyncBusy = false;
        }
        renderContractRenewalSummary();
    }

    const RENEWAL_MUNICIPAL_FIELD_IDS = [
        'crnMunicipalFormNo',
        'crnMunicipalContractNo',
        'crnfMunicipalFormNo',
        'crnfMunicipalContractNo'
    ];

    function ensureRenewalMunicipalFieldsEditable() {
        RENEWAL_MUNICIPAL_FIELD_IDS.forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.readOnly = false;
            el.disabled = false;
            el.removeAttribute('readonly');
            el.removeAttribute('disabled');
            el.removeAttribute('aria-readonly');
            el.style.pointerEvents = 'auto';
            el.classList.remove('field-locked-saved-contract', 'field-locked-tenancy-draft');
            if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
        });
    }

    function isRenewalMunicipalField(el) {
        return !!(el && el.dataset && el.dataset.renewalMunicipal);
    }

    function setRenewalMunicipalFieldValue(id, val, opt = {}) {
        const el = document.getElementById(id);
        if (!el) return;
        const skipFocused = opt.skipFocused !== false;
        const skipDirty = opt.skipDirty !== false;
        if (skipFocused && document.activeElement === el) return;
        if (skipDirty && el.dataset.renewalMunicipalDirty === '1') return;
        el.value = toStr(val);
    }

    function refreshRenewalMunicipalInCtx() {
        const form = readRenewalMunicipalFormNo();
        const contract = readRenewalMunicipalContractNo();
        if (!_contractRenewalCtx) return { municipalFormNo: form, municipalContractNo: contract };
        _contractRenewalCtx.municipalFormNo = form;
        _contractRenewalCtx.municipalContractNo = contract;
        if (_contractRenewalCtx.renewal) {
            _contractRenewalCtx.renewal.municipalFormNo = form;
            _contractRenewalCtx.renewal.municipalContractNo = contract;
        }
        return { municipalFormNo: form, municipalContractNo: contract };
    }

    function onRenewalMunicipalFieldInput(source, inputEl) {
        ensureRenewalMunicipalFieldsEditable();
        const active = inputEl || document.activeElement;
        if (active && isRenewalMunicipalField(active)) {
            active.dataset.renewalMunicipalDirty = '1';
        }
        refreshRenewalMunicipalInCtx();
        if (source === 'financial') {
            syncRenewalMunicipalFieldsFromFinancial(active);
        } else {
            syncRenewalMunicipalFieldsFromWizard(active);
        }
    }

    function wireRenewalCustomRentFieldHandlers() {
        if (window._renewalCustomRentHandlersWired) return;
        window._renewalCustomRentHandlersWired = true;
        const wrap = document.getElementById(RENEWAL_CUSTOM_RENT_WRAP_ID);
        if (!wrap) return;
        wrap.addEventListener('input', (ev) => {
            if (ev.target?.matches?.('[data-custom-rent-date], [data-custom-rent-amount]')) {
                onRenewalCustomRentChanged();
            }
        });
    }

    function wireRenewalMunicipalFieldHandlers() {
        if (window._renewalMunicipalHandlersWired) return;
        window._renewalMunicipalHandlersWired = true;
        const bindModal = (modalId, source) => {
            const modal = document.getElementById(modalId);
            if (!modal) return;
            modal.addEventListener(
                'focusin',
                (ev) => {
                    if (!isRenewalMunicipalField(ev.target)) return;
                    ensureRenewalMunicipalFieldsEditable();
                },
                true
            );
            modal.addEventListener('input', (ev) => {
                if (!isRenewalMunicipalField(ev.target)) return;
                onRenewalMunicipalFieldInput(source, ev.target);
            });
        };
        bindModal('contractRenewalModal', 'wizard');
        bindModal('contractRenewalFinancialModal', 'financial');
    }

    function getRenewalMunicipalValuesFromSavedContract(unit) {
        const saved = getSavedContractPayloadForUnit(unit) || getContractPayloadForUnit(unit) || {};
        return {
            municipalFormNo: toStr(saved.municipalFormNo),
            municipalContractNo: toStr(saved.municipalContractNo)
        };
    }

    function applyRenewalMunicipalValuesToAllFields(values, opt = {}) {
        const v = values || {};
        const force = opt.force === true;
        const setOpts = { skipFocused: !force, skipDirty: !force };
        setRenewalMunicipalFieldValue('crnMunicipalFormNo', v.municipalFormNo, setOpts);
        setRenewalMunicipalFieldValue('crnMunicipalContractNo', v.municipalContractNo, setOpts);
        setRenewalMunicipalFieldValue('crnfMunicipalFormNo', v.municipalFormNo, setOpts);
        setRenewalMunicipalFieldValue('crnfMunicipalContractNo', v.municipalContractNo, setOpts);
        if (!force) {
            refreshRenewalMunicipalInCtx();
            return;
        }
        RENEWAL_MUNICIPAL_FIELD_IDS.forEach((id) => {
            const el = document.getElementById(id);
            if (el) delete el.dataset.renewalMunicipalDirty;
        });
        if (_contractRenewalCtx) {
            _contractRenewalCtx.municipalFormNo = toStr(v.municipalFormNo);
            _contractRenewalCtx.municipalContractNo = toStr(v.municipalContractNo);
            if (_contractRenewalCtx.renewal) {
                _contractRenewalCtx.renewal.municipalFormNo = toStr(v.municipalFormNo);
                _contractRenewalCtx.renewal.municipalContractNo = toStr(v.municipalContractNo);
            }
        }
    }

    function readRenewalMunicipalFieldValue(wizardId, financialId) {
        const wizOpen = document.getElementById('contractRenewalModal')?.classList.contains('open');
        const finOpen = document.getElementById('contractRenewalFinancialModal')?.classList.contains('open');
        const wiz = toStr(document.getElementById(wizardId)?.value);
        const fin = toStr(document.getElementById(financialId)?.value);
        if (wizOpen && !finOpen) return wiz;
        if (finOpen && !wizOpen) return fin;
        const wizDirty = document.getElementById(wizardId)?.dataset?.renewalMunicipalDirty === '1';
        const finDirty = document.getElementById(financialId)?.dataset?.renewalMunicipalDirty === '1';
        if (wizDirty) return wiz;
        if (finDirty) return fin;
        return wiz || fin;
    }

    function readRenewalMunicipalFormNo() {
        return readRenewalMunicipalFieldValue('crnMunicipalFormNo', 'crnfMunicipalFormNo');
    }

    function readRenewalMunicipalContractNo() {
        return readRenewalMunicipalFieldValue('crnMunicipalContractNo', 'crnfMunicipalContractNo');
    }

    function syncRenewalMunicipalFieldsToFinancial(renewal) {
        const r = renewal || refreshRenewalMunicipalInCtx();
        setRenewalMunicipalFieldValue('crnfMunicipalFormNo', r.municipalFormNo);
        setRenewalMunicipalFieldValue('crnfMunicipalContractNo', r.municipalContractNo);
    }

    function syncRenewalMunicipalFieldsFromFinancial(activeEl) {
        const form = toStr(document.getElementById('crnfMunicipalFormNo')?.value);
        const contract = toStr(document.getElementById('crnfMunicipalContractNo')?.value);
        if (!activeEl || activeEl.id !== 'crnMunicipalFormNo') {
            setRenewalMunicipalFieldValue('crnMunicipalFormNo', form);
        }
        if (!activeEl || activeEl.id !== 'crnMunicipalContractNo') {
            setRenewalMunicipalFieldValue('crnMunicipalContractNo', contract);
        }
        refreshRenewalMunicipalInCtx();
        scheduleRenewalDraftAutosave();
        try {
            refreshRenewalGapsBanner();
        } catch (_eGapFin) {}
    }

    function syncRenewalMunicipalFieldsToWizard(renewal) {
        const r = renewal || refreshRenewalMunicipalInCtx();
        setRenewalMunicipalFieldValue('crnMunicipalFormNo', r.municipalFormNo);
        setRenewalMunicipalFieldValue('crnMunicipalContractNo', r.municipalContractNo);
    }

    function syncRenewalMunicipalFieldsFromWizard(activeEl) {
        const form = toStr(document.getElementById('crnMunicipalFormNo')?.value);
        const contract = toStr(document.getElementById('crnMunicipalContractNo')?.value);
        if (!activeEl || activeEl.id !== 'crnfMunicipalFormNo') {
            setRenewalMunicipalFieldValue('crnfMunicipalFormNo', form);
        }
        if (!activeEl || activeEl.id !== 'crnfMunicipalContractNo') {
            setRenewalMunicipalFieldValue('crnfMunicipalContractNo', contract);
        }
        refreshRenewalMunicipalInCtx();
        try {
            refreshRenewalGapsBanner();
        } catch (_eGapWiz) {}
    }

    function reopenContractRenewalWizardFromFinancial() {
        const ctx = _contractRenewalCtx;
        if (!ctx?.unit || !ctx?.renewal) return;
        refreshRenewalMunicipalInCtx();
        const saved = { ...ctx, renewal: { ...ctx.renewal } };
        document.getElementById('contractRenewalFinancialModal')?.classList.remove('open');
        _contractRenewalCtx = saved;
        initContractRenewalWizardFromUnit(saved.unit, {
            preserveRenewal: saved.renewal,
            draftPayload: getContractRenewalDraftEntryForUnit(saved.unit)?.payload
        });
        document.getElementById('contractRenewalModal')?.classList.add('open');
        ensureRenewalMunicipalFieldsEditable();
        syncRenewalStepPills(1);
        refreshRenewalGapsBanner();
    }

    function initContractRenewalWizardFromUnit(unit, opt = {}) {
        const workflow = resolveContractRenewalWorkflowUnit(unit);
        unit = workflow.unit || unit;
        const payload = workflow.payload || getSavedContractPayloadForUnit(unit) || getContractPayloadForUnit(unit) || {};
        const prevStart = toStr(unit.startDate || payload.startDate);
        const prevEnd = toStr(unit.endDate || payload.endDate);
        const prevAgreement = toStr(unit.agreementNo || payload.agreementNo);
        const newStart = computeRenewalNewStartDate(prevEnd);
        const defaultMonths =
            (prevStart && prevEnd ? computeContractMonthsFromStartAndEnd(prevStart, prevEnd) : 0) || 12;
        const preserved = opt.preserveRenewal && typeof opt.preserveRenewal === 'object' ? opt.preserveRenewal : null;
        const newEnd =
            preserved?.newEnd ||
            calculateEndDateFromStartAndMonths(newStart, preserved?.newMonths || defaultMonths);
        const period0 = computeContractPeriodMonthsAndExtraDays(
            newStart,
            newEnd,
            preserved?.newMonths || defaultMonths
        );
        const newAgreement =
            preserved?.agreementNo || proposeContractRenewalAgreementNumber();
        const savedMunicipal = getRenewalMunicipalValuesFromSavedContract(unit);
        const municipalFormNo = preserved?.municipalFormNo || savedMunicipal.municipalFormNo;
        const municipalContractNo = preserved?.municipalContractNo || savedMunicipal.municipalContractNo;
        const prevMonthlyRent = resolvePreviousContractMonthlyRent(payload, unit);
        const newMonthlyRent = resolveRenewalNewMonthlyRent(preserved, opt.draftPayload, prevMonthlyRent);
        _contractRenewalCtx = {
            unit,
            payload,
            prevStart,
            prevEnd,
            prevAgreement,
            newStart,
            defaultMonths,
            municipalFormNo,
            municipalContractNo
        };
        const title = document.getElementById('contractRenewalTitle');
        if (title) {
            title.textContent = `${t('تجديد عقد الإيجار', 'Renew lease contract')} — ${getRenewalWizardLocationLabel(unit, payload)}`;
        }
        const setVal = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.value = toStr(v);
        };
        setVal('crnPrevAgreementNo', prevAgreement);
        setVal('crnPrevStart', prevStart);
        setVal('crnPrevEnd', prevEnd);
        setVal('crnNewAgreementNo', newAgreement);
        setRenewalAgreementNoInput(newAgreement);
        setVal('crnNewStart', newStart);
        setVal('crnNewMonths', String(preserved?.newMonths || period0.months || defaultMonths));
        setVal('crnNewExtraDays', String(preserved?.newExtraDays ?? period0.extraDays ?? 0));
        setVal('crnNewEnd', newEnd);
        setVal('crnPrevMonthlyRent', prevMonthlyRent ? formatOMR(prevMonthlyRent) : '—');
        setVal('crnNewMonthlyRent', newMonthlyRent);
        setVal('crnPrevMunicipalFormNo', savedMunicipal.municipalFormNo);
        setVal('crnPrevMunicipalContractNo', savedMunicipal.municipalContractNo);
        applyRenewalMunicipalValuesToAllFields({ municipalFormNo, municipalContractNo }, { force: true });
        setVal('crnRemainingMonthsDisplay', formatContractRemainingMonthsLabel(prevEnd));
        ensureRenewalMunicipalFieldsEditable();
        renderRenewalLinkedUnitsPanel(payload);
        renderContractRenewalSummary();
        syncRenewalStepPills(1);
    }

    function editRenewalFromUnitDetails() {
        if (!selectedUnitDetailsRecord) return;
        openContractRenewalEditForUnit(selectedUnitDetailsRecord);
    }

    function openContractRenewalEditForUnit(unit) {
        unit = unit || selectedUnitDetailsRecord;
        if (!unit) return;
        unit = resolveContractRenewalWorkflowUnit(unit).unit || unit;
        if (
            !assertPermissionOrAlert(
                'manage_contracts',
                'لا تملك صلاحية العقود.',
                'No permission to access contracts.'
            )
        ) {
            return;
        }
        if (!unitDetailsAllowsRenewalDataEdit(unit)) {
            if (unitHasSavedContractRecord(unit.building, unit.unit) && !canEditSavedContractForUnit(unit.building, unit.unit)) {
                alert(
                    t(
                        'لا تملك صلاحية «تعديل العقود والعقارات المحفوظة» لتعديل بيانات التجديد.',
                        'You do not have «Edit saved contracts & property data» to edit renewal data.'
                    )
                );
            } else {
                alert(
                    t('لا يمكن تعديل بيانات التجديد لهذه الوحدة.', 'Renewal data cannot be edited for this unit.')
                );
            }
            return;
        }
        closeUnitDetailsModal();
        closeUnitDetailsIeMenus();
        wireRenewalMunicipalFieldHandlers();
        const existingDraft = getContractRenewalDraftEntryForUnit(unit);
        if (existingDraft?.renewal) {
            repairSavedContractCorruptedByRenewalDraft(unit);
            document.getElementById('contractRenewalFinancialModal')?.classList.remove('open');
            initContractRenewalWizardFromUnit(unit, {
                preserveRenewal: existingDraft.renewal,
                draftPayload: existingDraft.payload
            });
            if (_contractRenewalCtx) {
                _contractRenewalCtx.isEditExistingRenewal = !!getSavedContractPayloadForUnit(unit)?.isRenewalContract;
            }
            document.getElementById('contractRenewalStepPill1')?.classList.add('active');
            document.getElementById('contractRenewalStepPill2')?.classList.remove('active');
            document.getElementById('contractRenewalModal')?.classList.add('open');
            const title = document.getElementById('contractRenewalTitle');
            if (title) {
                title.textContent = `${t('تعديل تجديد العقد', 'Edit contract renewal')} — ${getRenewalWizardLocationLabel(unit)}`;
            }
            ensureRenewalMunicipalFieldsEditable();
            refreshRenewalWizardEditModeUi();
            return;
        }
        const currentPayload = getSavedContractPayloadForUnit(unit);
        if (!isSavedRenewalContractPayload(currentPayload)) {
            alert(
                t(
                    'هذه الوحدة ليست بعقد تجديد محفوظ. استخدم «تعديل» من سجل العقود للعقد الحالي.',
                    'This unit does not have a saved renewal contract. Use Edit in contract history for the current contract.'
                )
            );
            return;
        }
        const previousSnapshot = resolveRenewalPreviousSnapshotFromHistory(unit, currentPayload);
        const renewal = buildRenewalObjectFromSavedPayload(currentPayload, previousSnapshot);
        document.getElementById('contractRenewalFinancialModal')?.classList.remove('open');
        initContractRenewalWizardFromUnit(unit, { preserveRenewal: renewal, draftPayload: currentPayload });
        if (_contractRenewalCtx) {
            _contractRenewalCtx.isEditExistingRenewal = true;
            _contractRenewalCtx.previousSnapshot = previousSnapshot;
            _contractRenewalCtx.basePayload = previousSnapshot || currentPayload;
            _contractRenewalCtx.prevStart = toStr(previousSnapshot?.startDate || renewal.prevStart);
            _contractRenewalCtx.prevEnd = toStr(previousSnapshot?.endDate || renewal.prevEnd);
            _contractRenewalCtx.prevAgreement = toStr(
                previousSnapshot?.agreementNo || currentPayload.previousAgreementNo
            );
        }
        const title = document.getElementById('contractRenewalTitle');
        if (title) {
            title.textContent = `${t('تعديل تجديد العقد', 'Edit contract renewal')} — ${getRenewalWizardLocationLabel(unit)}`;
        }
        document.getElementById('contractRenewalStepPill1')?.classList.add('active');
        document.getElementById('contractRenewalStepPill2')?.classList.remove('active');
        document.getElementById('contractRenewalModal')?.classList.add('open');
        ensureRenewalMunicipalFieldsEditable();
        refreshRenewalWizardEditModeUi();
    }

    function openContractRenewalModal(unitOpt) {
        let unit = unitOpt || selectedUnitDetailsRecord;
        if (!unit) return;
        unit = resolveContractRenewalWorkflowUnit(unit).unit || unit;
        if (
            !assertPermissionOrAlert(
                'manage_contracts',
                'لا تملك صلاحية تجديد العقود.',
                'No permission to renew contracts.'
            )
        ) {
            return;
        }
        if (!unitDetailsAllowsContractRenewal(unit)) {
            alert(
                t(
                    'التجديد متاح فقط للوحدات المؤجرة بعقد محفوظ وتاريخ انتهاء معروف.',
                    'Renewal is only available for rented units with a saved contract and known end date.'
                )
            );
            return;
        }
        if (!ensureUnitActionAllowed(unit, 'renew')) return;
        closeUnitDetailsModal();
        wireRenewalMunicipalFieldHandlers();
        const existingDraft = getContractRenewalDraftEntryForUnit(unit);
        if (existingDraft?.renewal) {
            repairSavedContractCorruptedByRenewalDraft(unit);
            document.getElementById('contractRenewalFinancialModal')?.classList.remove('open');
            initContractRenewalWizardFromUnit(unit, {
                preserveRenewal: existingDraft.renewal,
                draftPayload: existingDraft.payload
            });
            document.getElementById('contractRenewalStepPill1')?.classList.add('active');
            document.getElementById('contractRenewalStepPill2')?.classList.remove('active');
            document.getElementById('contractRenewalModal')?.classList.add('open');
            ensureRenewalMunicipalFieldsEditable();
            return;
        }
        if (!assertContractRenewalAllowedOrPrompt(unit)) return;
        if (!confirmContractRenewalContinuationWarnings(unit)) return;
        logContractRenewalEvent('started', unit, {
            ...renewalLogDetailsFromCtx(
                {
                    unit,
                    prevStart: toStr(unit.startDate),
                    prevEnd: toStr(unit.endDate),
                    previousSnapshot: getSavedContractPayloadForUnit(unit)
                },
                getSavedContractPayloadForUnit(unit)
            ),
            note: t('بدء معالج تجديد العقد.', 'Contract renewal wizard started.')
        });
        closeUnitDetailsIeMenus();
        document.getElementById('contractRenewalFinancialModal')?.classList.remove('open');
        initContractRenewalWizardFromUnit(unit);
        document.getElementById('contractRenewalStepPill1')?.classList.add('active');
        document.getElementById('contractRenewalStepPill2')?.classList.remove('active');
        document.getElementById('contractRenewalModal')?.classList.add('open');
        ensureRenewalMunicipalFieldsEditable();
    }

    function closeContractRenewalModal(clearCtx) {
        document.getElementById('contractRenewalModal')?.classList.remove('open');
        if (clearCtx !== false) _contractRenewalCtx = null;
    }

    const RENEWAL_PAY_SCHEDULE_WRAP_ID = 'crnfPaymentScheduleTableWrap';
    const RENEWAL_VAT_SCHEDULE_WRAP_ID = 'crnfVatChequeScheduleTableWrap';
    const RENEWAL_CUSTOM_RENT_WRAP_ID = 'crnfCustomRentScheduleTableWrap';

    function enrichPaymentScheduleRowsFromPayload(payload, rows) {
        if (!payload || !Array.isArray(rows)) return rows || [];
        const period = getContractPeriodBreakdownFromPayload(payload);
        const fullMonths = Math.max(1, period.months || parseInt(toStr(payload.contractMonths), 10) || 12);
        const extraDays = period.extraDays || 0;
        return rows.map((row) => {
            const m = row.monthIndex || 0;
            const enriched = { ...row };
            if (extraDays > 0 && m === fullMonths + 1) {
                enriched.isExtraPeriod = true;
                enriched.extraDays = extraDays;
            } else if (m <= fullMonths) {
                enriched.isExtraPeriod = false;
                enriched.extraDays = 0;
            }
            return enriched;
        });
    }

    function mergeBaseWithCustomRentScheduleForPayload(payload, base, overlay, options = {}) {
        const forceBaseDates = options.forceBaseDates === true;
        const useOverlayDueDate = !forceBaseDates && options.preserveCustomDueDates === true;
        if (!Array.isArray(overlay) || !overlay.length) return base;
        if (!Array.isArray(base) || !base.length) {
            return overlay.map((r) => ({
                monthIndex: r.monthIndex || 0,
                dueDate: toStr(r.dueDate),
                amount:
                    toStr(r.amount) === '' || toStr(r.amount) === null
                        ? getPaymentRowAmountFromPayload(payload, r)
                        : toStr(r.amount),
                isExtraPeriod: !!r.isExtraPeriod,
                extraDays: r.extraDays || 0,
                checkNo: '',
                checkAttachmentName: '',
                checkAttachmentDataUrl: ''
            }));
        }
        const cmap = new Map(overlay.map((r) => [r.monthIndex, r]));
        return base.map((row) => {
            const c = cmap.get(row.monthIndex);
            if (!c) return row;
            const a = toStr(c.amount);
            const overlayDate = toStr(c.dueDate);
            const baseDate = toStr(row.dueDate);
            const manualDateOverride = !forceBaseDates && !useOverlayDueDate && overlayDate && overlayDate !== baseDate;
            const d = useOverlayDueDate || manualDateOverride ? overlayDate : '';
            if (a === '' || a === null) {
                return { ...row, dueDate: d || row.dueDate };
            }
            let amt = a;
            let customRentExVatBase;
            if (isPayloadVatIncludedWithRent(payload) && !row.isExtraPeriod) {
                const parsed = parseFloat(a);
                const rentBase = getMonthlyRentBaseFromPayload(payload);
                if (!Number.isNaN(parsed) && Math.abs(parsed - rentBase) > 0.006) {
                    customRentExVatBase = parsed;
                    amt = getEffectiveRentAmountForPaymentRowFromPayload(payload, parsed);
                } else {
                    amt = getPaymentRowAmountFromPayload(payload, row);
                }
            }
            const out = { ...row, amount: amt, dueDate: d || row.dueDate };
            if (customRentExVatBase != null) out.customRentExVatBase = customRentExVatBase;
            return out;
        });
    }

    function paymentScheduleRowsToCustomRentRows(rows) {
        return (Array.isArray(rows) ? rows : []).map((r) => ({
            monthIndex: r.monthIndex || 0,
            dueDate: toStr(r.dueDate),
            amount: toStr(r.amount),
            isExtraPeriod: !!r.isExtraPeriod,
            extraDays: r.extraDays || 0,
            customRentExVatBase: r.customRentExVatBase
        }));
    }

    function onRenewalCustomRentChanged() {
        const ctx = _contractRenewalCtx;
        if (!ctx?.basePayload || !ctx?.renewal) return;
        const working = getRenewalRenderPayload();
        if (!working) return;
        const prevPay = getPaymentScheduleFromUi(RENEWAL_PAY_SCHEDULE_WRAP_ID);
        const prevMap = new Map(prevPay.map((r) => [r.monthIndex, r]));
        let base = getBaseContractPaymentRowsFromPayload(working);
        const overlay = getCustomRentScheduleFromUi(RENEWAL_CUSTOM_RENT_WRAP_ID);
        let merged = mergeBaseWithCustomRentScheduleForPayload(working, base, overlay, { forceBaseDates: true });
        merged = enrichPaymentScheduleRowsFromPayload(working, merged);
        if (isPayloadVatIncludedWithRent(working)) {
            const stdIncl = getEffectiveRentAmountForPaymentRowFromPayload(
                working,
                getMonthlyRentBaseFromPayload(working)
            );
            merged = merged.map((row) => ({
                ...row,
                amount: normalizePaymentScheduleAmountWithVat(row.amount, stdIncl, row)
            }));
        }
        merged = merged.map((row) => mergeChequeRowAttachmentFields(prevMap.get(row.monthIndex) || {}, row));
        renderCustomRentScheduleFromRows(paymentScheduleRowsToCustomRentRows(merged), {
            wrapId: RENEWAL_CUSTOM_RENT_WRAP_ID,
            renewalPayload: working
        });
        renderPaymentScheduleFromRows(merged, {
            wrapId: RENEWAL_PAY_SCHEDULE_WRAP_ID,
            byCheque: isPaymentMethodCheque(ctx.basePayload.paymentMethod),
            paymentMethodSet: !!toStr(ctx.basePayload.paymentMethod)
        });
        scheduleRenewalDraftAutosave();
    }

    function rebuildRenewalVatChequeSchedule() {
        const ctx = _contractRenewalCtx;
        if (!ctx?.basePayload || !ctx?.renewal) return;
        const working = getRenewalRenderPayload();
        if (!working) return;
        const prevVat = getVatChequeScheduleFromUi(RENEWAL_VAT_SCHEDULE_WRAP_ID);
        const vatRows = buildDefaultVatChequeRowsFromPayload(working, { preserveExisting: true }, prevVat);
        renderVatChequeScheduleFromRows(vatRows, { wrapId: RENEWAL_VAT_SCHEDULE_WRAP_ID });
        scheduleRenewalDraftAutosave();
    }

    function getAgreedRentPaymentDayFromPayload(payload) {
        const raw = parseInt(toStr(payload?.agreedRentPaymentDay), 10);
        if (!Number.isNaN(raw) && raw >= 1 && raw <= 31) return raw;
        return 1;
    }

    function getContractPeriodBreakdownFromPayload(payload) {
        const startStr = toStr(payload?.startDate);
        const endStr = toStr(payload?.endDate);
        const fallbackMonths = Math.max(1, parseInt(toStr(payload?.contractMonths), 10) || 12);
        return computeContractPeriodMonthsAndExtraDays(startStr, endStr, fallbackMonths);
    }

    function isPayloadSubjectToVat(payload) {
        return toStr(payload?.contractSubjectToVat) === 'yes';
    }

    function getPayloadVatPaymentMode(payload) {
        if (!isPayloadSubjectToVat(payload)) return '';
        return toStr(payload?.vatPaymentMode) || 'with_rent';
    }

    function isPayloadVatIncludedWithRent(payload) {
        return isPayloadSubjectToVat(payload) && getPayloadVatPaymentMode(payload) === 'with_rent';
    }

    function getMonthlyRentBaseFromPayload(payload) {
        const linked = getLinkedContractUnitsFromPayload(payload);
        if (linked.length > 1) {
            const sum = sumLinkedContractUnitsMonthlyRent(payload);
            if (sum > 0) return sum;
        }
        return Math.max(0, parseFloat(toStr(payload?.monthlyRent)) || 0);
    }

    function getEffectiveRentAmountForPaymentRowFromPayload(payload, rentRaw) {
        const base = Math.max(0, parseFloat(toStr(rentRaw)) || 0);
        if (!isPayloadVatIncludedWithRent(payload)) {
            return base > 0 ? base.toFixed(3) : '0.000';
        }
        const incl = base + computeContractMonthlyVatOm(base);
        return incl > 0 ? incl.toFixed(3) : '0.000';
    }

    /** مبلغ صف الجدول: شهر كامل أو أيام إضافية بنسبة الأيام / Schedule row: full month or prorated extra days */
    function getPaymentRowAmountFromPayload(payload, row) {
        const rentBase = getMonthlyRentBaseFromPayload(payload);
        const extraDays = Math.max(0, parseInt(toStr(row?.extraDays), 10) || 0);
        if (row?.isExtraPeriod && extraDays > 0) {
            const prorated = calculateGraceAmountOmFromRentAndDays(rentBase, extraDays);
            if (!isPayloadVatIncludedWithRent(payload)) {
                return formatGraceAmountOm(prorated);
            }
            return formatGraceAmountOm(prorated + computeContractExtraDaysVatOm(rentBase, extraDays));
        }
        return getEffectiveRentAmountForPaymentRowFromPayload(payload, rentBase);
    }

    function getPaymentRowAmountForForm(row) {
        const rentBase = getMonthlyRentBaseForVat();
        const extraDays = Math.max(0, parseInt(toStr(row?.extraDays), 10) || 0);
        if (row?.isExtraPeriod && extraDays > 0) {
            const prorated = calculateGraceAmountOmFromRentAndDays(rentBase, extraDays);
            if (!isContractVatIncludedWithRent()) {
                return formatGraceAmountOm(prorated);
            }
            return formatGraceAmountOm(prorated + computeContractExtraDaysVatOm(rentBase, extraDays));
        }
        return getEffectiveRentAmountForPaymentRow(rentBase);
    }

    function getBaseContractPaymentRowsFromPayload(payload) {
        if (!payload || typeof payload !== 'object') return [];
        const period = getContractPeriodBreakdownFromPayload(payload);
        const fallbackMonths = Math.max(1, parseInt(toStr(payload.contractMonths), 10) || 12);
        const n = Math.max(1, period.months || fallbackMonths);
        const extraDays = period.extraDays || 0;
        const rentRaw = getMonthlyRentBaseFromPayload(payload);
        const dayOfMonth = getAgreedRentPaymentDayFromPayload(payload);
        const startStr = toStr(payload.startDate);
        if (!startStr) return [];
        const p = startStr.split('-').map((x) => parseInt(x, 10));
        const start = p.length === 3 && !p.some((x) => Number.isNaN(x)) ? new Date(p[0], p[1] - 1, p[2]) : new Date(startStr);
        if (Number.isNaN(start.getTime())) return [];
        const y0 = start.getFullYear();
        const m0 = start.getMonth();
        const rent = getEffectiveRentAmountForPaymentRowFromPayload(payload, rentRaw);
        const rows = [];
        for (let i = 0; i < n; i++) {
            rows.push({
                monthIndex: i + 1,
                dueDate: buildPaymentDueDateForContractMonth(i, dayOfMonth, y0, m0),
                amount: rent,
                checkNo: '',
                checkAttachmentName: '',
                checkAttachmentDataUrl: ''
            });
        }
        if (extraDays > 0) {
            const extraRow = {
                monthIndex: n + 1,
                dueDate: buildPaymentDueDateForContractMonth(n, dayOfMonth, y0, m0),
                isExtraPeriod: true,
                extraDays,
                checkNo: '',
                checkAttachmentName: '',
                checkAttachmentDataUrl: ''
            };
            extraRow.amount = getPaymentRowAmountFromPayload(payload, extraRow);
            rows.push(extraRow);
        }
        return rows;
    }

    function buildDefaultVatChequeRowsFromPayload(payload, opt = {}, existingRows = []) {
        const preserveExisting = opt.preserveExisting === true;
        const count = Math.max(1, parseInt(toStr(payload?.vatChequeCount), 10) || 1);
        const rentBase = getMonthlyRentBaseFromPayload(payload);
        const period = getContractPeriodBreakdownFromPayload(payload);
        const contractMonths = Math.max(1, period.months || count);
        const extraDays = period.extraDays || 0;
        const regularVatTotal = rentBase * contractMonths * CONTRACT_VAT_RATE;
        const perCheque = count > 0 ? regularVatTotal / count : 0;
        const amt = perCheque > 0 ? perCheque.toFixed(3) : '0.000';
        const startStr = toStr(payload?.startDate);
        const dayOfMonth = getAgreedRentPaymentDayFromPayload(payload);
        const prev = preserveExisting ? existingRows : [];
        const pmap = new Map(prev.map((r) => [r.chequeIndex, r]));
        const rows = [];
        const p = startStr.split('-').map((x) => parseInt(x, 10));
        const start = p.length === 3 && !p.some((x) => Number.isNaN(x)) ? new Date(p[0], p[1] - 1, p[2]) : null;
        const y0 = start && !Number.isNaN(start.getTime()) ? start.getFullYear() : 0;
        const m0 = start && !Number.isNaN(start.getTime()) ? start.getMonth() : 0;
        for (let i = 0; i < count; i++) {
            const idx = i + 1;
            const monthOffset = Math.floor((i * contractMonths) / count);
            const ex = pmap.get(idx) || {};
            rows.push({
                chequeIndex: idx,
                dueDate:
                    preserveExisting && toStr(ex.dueDate)
                        ? toStr(ex.dueDate)
                        : start && !Number.isNaN(start.getTime())
                          ? buildPaymentDueDateForContractMonth(monthOffset, dayOfMonth, y0, m0)
                          : '',
                amount: amt,
                checkNo: preserveExisting ? toStr(ex.checkNo) : '',
                checkAttachmentName: preserveExisting ? toStr(ex.checkAttachmentName) : '',
                checkAttachmentDataUrl: preserveExisting ? toStr(ex.checkAttachmentDataUrl) : '',
                checkAttachmentRelativePath: preserveExisting ? toStr(ex.checkAttachmentRelativePath) : '',
                checkAttachmentFileId: preserveExisting ? toStr(ex.checkAttachmentFileId) : '',
                storedOnDisk: preserveExisting ? !!ex.storedOnDisk : false
            });
        }
        if (extraDays > 0) {
            const extraIdx = count + 1;
            const extraVat = computeContractExtraDaysVatOm(rentBase, extraDays);
            const ex = pmap.get(extraIdx) || {};
            rows.push({
                chequeIndex: extraIdx,
                dueDate:
                    preserveExisting && toStr(ex.dueDate)
                        ? toStr(ex.dueDate)
                        : start && !Number.isNaN(start.getTime())
                          ? buildPaymentDueDateForContractMonth(contractMonths, dayOfMonth, y0, m0)
                          : '',
                amount: extraVat > 0 ? extraVat.toFixed(3) : '0.000',
                isExtraPeriod: true,
                extraDays,
                checkNo: preserveExisting ? toStr(ex.checkNo) : '',
                checkAttachmentName: preserveExisting ? toStr(ex.checkAttachmentName) : '',
                checkAttachmentDataUrl: preserveExisting ? toStr(ex.checkAttachmentDataUrl) : '',
                checkAttachmentRelativePath: preserveExisting ? toStr(ex.checkAttachmentRelativePath) : '',
                checkAttachmentFileId: preserveExisting ? toStr(ex.checkAttachmentFileId) : '',
                storedOnDisk: preserveExisting ? !!ex.storedOnDisk : false
            });
        }
        return rows;
    }

    function buildRenewalWorkingPayload(basePayload, renewal, paymentRows, vatRows, opt = {}) {
        const p = cloneContractPayloadForArchive(basePayload) || {};
        p.startDate = renewal.newStart;
        p.endDate = renewal.newEnd;
        p.contractMonths = String(renewal.newMonths);
        p.agreementNo = renewal.agreementNo;
        p.previousAgreementNo = toStr(basePayload.agreementNo);
        p.municipalFormNo = renewal.municipalFormNo;
        p.municipalContractNo = renewal.municipalContractNo;
        const rent = parseRentAmountInput(renewal.monthlyRent);
        if (rent !== '' && rent > 0) {
            const renewalLinked = Array.isArray(renewal.linkedContractUnits) ? renewal.linkedContractUnits : [];
            const baseLinked = getLinkedContractUnitsFromPayload(p);
            if (renewalLinked.length > 1) {
                p.linkedContractUnits = renewalLinked;
                p.linkedContractUnitsJson = JSON.stringify(renewalLinked);
            } else if (baseLinked.length > 1) {
                const linkedSum = sumLinkedContractUnitsMonthlyRent(p);
                if (Math.abs(linkedSum - rent) < 0.001) {
                    p.monthlyRent = formatRentAmountForInput(rent);
                    p.agreementRent = p.monthlyRent;
                } else {
                    applyRenewalRentToLinkedUnits(p, rent);
                }
            } else {
                applyRenewalRentToLinkedUnits(p, rent);
            }
            p.monthlyRent = formatRentAmountForInput(rent);
            p.agreementRent = p.monthlyRent;
        }
        const customRentItems = getCustomRentScheduleFromUi(RENEWAL_CUSTOM_RENT_WRAP_ID);
        p.customRentItems = customRentItems;
        p.customRentItemsJson = JSON.stringify(customRentItems);
        p.paymentSchedule = Array.isArray(paymentRows) ? paymentRows : [];
        p.paymentScheduleJson = JSON.stringify(p.paymentSchedule);
        if (Array.isArray(vatRows)) {
            p.vatChequeSchedule = vatRows;
            p.vatChequeScheduleJson = JSON.stringify(vatRows);
        } else if (isPayloadSubjectToVat(p) && getPayloadVatPaymentMode(p) === 'separate') {
            p.vatChequeSchedule = [];
            p.vatChequeScheduleJson = '[]';
        } else {
            p.vatChequeSchedule = [];
            p.vatChequeScheduleJson = '[]';
        }
        if (renewal.graceDays != null && toStr(renewal.graceDays) !== '') {
            p.graceDays = toStr(renewal.graceDays) || '0';
        } else {
            p.graceDays = '0';
        }
        if (renewal.graceAmount != null) p.graceAmount = toStr(renewal.graceAmount) || '0.000';
        stripPreviousContractFinancialsFromRenewalPayload(p, basePayload);
        if (opt.clearPropertyDocuments) {
            resetPropertyDocumentsForNewRenewal(p);
        }
        const prevRent = parseRentAmountInput(resolvePreviousContractMonthlyRent(basePayload));
        if (prevRent !== '') {
            p.previousMonthlyRent = formatRentAmountForInput(prevRent);
        }
        p.isRenewalDraft = true;
        return p;
    }

    function getRenewalRenderPayload() {
        const ctx = _contractRenewalCtx;
        if (!ctx?.basePayload || !ctx?.renewal) return null;
        return buildRenewalWorkingPayload(ctx.basePayload, ctx.renewal, [], [], {
            clearPropertyDocuments: !ctx.isEditExistingRenewal && !ctx.isCurrentContractEdit
        });
    }

    function renderContractRenewalFinancialSummary() {
        const el = document.getElementById('crnfPeriodSummary');
        const ctx = _contractRenewalCtx;
        if (!el || !ctx?.renewal) return;
        const r = ctx.renewal;
        const prevPart = formatContractPeriodBilingual(ctx.prevStart, ctx.prevEnd);
        const newPart =
            r.newStart && r.newEnd
                ? formatContractPeriodBilingual(r.newStart, r.newEnd)
                : formatContractPeriodBilingual(r.newStart, r.newEnd, r.newMonths);
        el.textContent = `${t('السابق', 'Previous')}: ${prevPart} · ${t('الجديد', 'New')}: ${newPart} · ${t('رقم العقد الجديد', 'New agreement')}: ${toStr(r.agreementNo)} · ${t('الإيجار', 'Rent')}: ${formatOMR(resolvePreviousContractMonthlyRent(ctx.basePayload, ctx.unit))} → ${formatOMR(r.monthlyRent)}`;
        refreshRenewalGapsBanner();
    }

    function rebuildRenewalPaymentSchedule() {
        const ctx = _contractRenewalCtx;
        if (!ctx?.basePayload || !ctx?.renewal) return;
        const working = getRenewalRenderPayload();
        if (!working) return;
        const prevPay = getPaymentScheduleFromUi(RENEWAL_PAY_SCHEDULE_WRAP_ID);
        const prevMap = new Map(prevPay.map((r) => [r.monthIndex, r]));
        let base = getBaseContractPaymentRowsFromPayload(working);
        const overlay = getCustomRentScheduleFromUi(RENEWAL_CUSTOM_RENT_WRAP_ID);
        let merged = mergeBaseWithCustomRentScheduleForPayload(working, base, overlay, { forceBaseDates: true });
        merged = enrichPaymentScheduleRowsFromPayload(working, merged);
        if (isPayloadVatIncludedWithRent(working)) {
            const stdIncl = getEffectiveRentAmountForPaymentRowFromPayload(
                working,
                getMonthlyRentBaseFromPayload(working)
            );
            merged = merged.map((row) => ({
                ...row,
                amount: normalizePaymentScheduleAmountWithVat(row.amount, stdIncl, row)
            }));
        }
        merged = merged.map((row) => mergeChequeRowAttachmentFields(prevMap.get(row.monthIndex) || {}, row));
        renderCustomRentScheduleFromRows(paymentScheduleRowsToCustomRentRows(merged), {
            wrapId: RENEWAL_CUSTOM_RENT_WRAP_ID,
            renewalPayload: working
        });
        renderPaymentScheduleFromRows(merged, {
            wrapId: RENEWAL_PAY_SCHEDULE_WRAP_ID,
            byCheque: isPaymentMethodCheque(ctx.basePayload.paymentMethod),
            paymentMethodSet: !!toStr(ctx.basePayload.paymentMethod),
            renewalPayload: working
        });
        const vatSection = document.getElementById('crnfVatSection');
        const showVat =
            isPayloadSubjectToVat(ctx.basePayload) && getPayloadVatPaymentMode(ctx.basePayload) === 'separate';
        if (vatSection) vatSection.style.display = showVat ? '' : 'none';
        if (showVat) {
            rebuildRenewalVatChequeSchedule();
        }
        try {
            recomputeRenewalGraceFromUi();
        } catch (_eRenGraceRb) {}
        refreshRenewalGapsBanner();
    }

    function collectContractRenewalFinancialFromModal() {
        const ctx = _contractRenewalCtx;
        if (!ctx?.basePayload || !ctx?.renewal) return null;
        refreshRenewalMunicipalInCtx();
        const paymentRows = getPaymentScheduleFromUi(RENEWAL_PAY_SCHEDULE_WRAP_ID);
        let vatRows = null;
        if (isPayloadSubjectToVat(ctx.basePayload) && getPayloadVatPaymentMode(ctx.basePayload) === 'separate') {
            vatRows = getVatChequeScheduleFromUi(RENEWAL_VAT_SCHEDULE_WRAP_ID);
        }
        const renewalWithGrace = { ...ctx.renewal, ...collectRenewalGraceFromModal() };
        return buildRenewalWorkingPayload(ctx.basePayload, renewalWithGrace, paymentRows, vatRows, {
            clearPropertyDocuments: !ctx.isEditExistingRenewal && !ctx.isCurrentContractEdit
        });
    }

    function collectCurrentContractFinancialFromModal() {
        const ctx = _contractRenewalCtx;
        if (!ctx?.basePayload || !ctx?.renewal) return null;
        refreshRenewalMunicipalInCtx();
        const p = cloneContractPayloadForArchive(ctx.basePayload) || {};
        const r = { ...ctx.renewal, ...collectRenewalGraceFromModal() };
        p.startDate = r.newStart;
        p.endDate = r.newEnd;
        p.contractMonths = String(r.newMonths);
        const rent = parseRentAmountInput(r.monthlyRent);
        if (rent !== '' && rent > 0) {
            applyRenewalRentToLinkedUnits(p, rent);
        }
        p.municipalFormNo = r.municipalFormNo;
        p.municipalContractNo = r.municipalContractNo;
        p.graceDays = toStr(r.graceDays) || '0';
        p.graceAmount = toStr(r.graceAmount) || '0.000';
        const paymentRows = getPaymentScheduleFromUi(RENEWAL_PAY_SCHEDULE_WRAP_ID);
        p.paymentSchedule = paymentRows;
        p.paymentScheduleJson = JSON.stringify(paymentRows);
        const customRentItems = getCustomRentScheduleFromUi(RENEWAL_CUSTOM_RENT_WRAP_ID);
        p.customRentItems = customRentItems;
        p.customRentItemsJson = JSON.stringify(customRentItems);
        if (isPayloadSubjectToVat(p) && getPayloadVatPaymentMode(p) === 'separate') {
            const vatRows = getVatChequeScheduleFromUi(RENEWAL_VAT_SCHEDULE_WRAP_ID);
            p.vatChequeSchedule = vatRows;
            p.vatChequeScheduleJson = JSON.stringify(vatRows);
        }
        return p;
    }

    function scheduleRenewalDraftAutosave() {
        if (!_contractRenewalCtx?.financialOpen) return;
        if (_renewalDraftAutosaveTimer) clearTimeout(_renewalDraftAutosaveTimer);
        _renewalDraftAutosaveTimer = setTimeout(() => {
            _renewalDraftAutosaveTimer = null;
            try {
                persistContractRenewalDraftFromModal({ silent: true });
            } catch (_eRenAuto) {}
            try {
                refreshRenewalGapsBanner();
            } catch (_eRenGap) {}
        }, 600);
    }

    let _renewalDraftAutosaveTimer = null;

    function persistContractRenewalDraftFromModal(opt = {}) {
        const silent = opt.silent === true;
        return saveContractRenewalFromModal({
            forceDraft: true,
            silent,
            skipPrint: silent || opt.skipPrint === true
        });
    }

    function openContractRenewalFinancialModal(unit, renewal, opt = {}) {
        const isEditExisting = opt.isEditExistingRenewal === true;
        const isCurrentEdit = opt.isCurrentContractEdit === true;
        const savedRenewalPayload =
            opt.savedRenewalPayload || ((isEditExisting || isCurrentEdit) ? getSavedContractPayloadForUnit(unit) : null);
        const basePayload =
            opt.basePayload ||
            (isCurrentEdit
                ? getSavedContractPayloadForUnit(unit) || getContractPayloadForUnit(unit)
                : isEditExisting && opt.previousSnapshot
                  ? opt.previousSnapshot
                  : getSavedContractPayloadForUnit(unit) || getContractPayloadForUnit(unit));
        if (!basePayload || !renewal) return;
        repairSavedContractCorruptedByRenewalDraft(unit);
        const existingDraft = getContractRenewalDraftEntryForUnit(unit);
        let renewalNorm = { ...renewal };
        if (!toStr(renewalNorm.monthlyRent)) {
            if (savedRenewalPayload?.monthlyRent != null) {
                renewalNorm.monthlyRent = formatRentAmountForInput(savedRenewalPayload.monthlyRent);
            } else if (existingDraft?.payload?.monthlyRent != null) {
                renewalNorm.monthlyRent = formatRentAmountForInput(existingDraft.payload.monthlyRent);
            } else {
                renewalNorm.monthlyRent = resolvePreviousContractMonthlyRent(basePayload, unit);
            }
        }
        let previousSnapshot =
            opt.previousSnapshot ||
            existingDraft?.previousSnapshot ||
            (isEditExisting
                ? resolveRenewalPreviousSnapshotFromHistory(unit, savedRenewalPayload)
                : cloneContractPayloadForArchive(getSavedContractPayloadForUnit(unit) || basePayload));
        if (previousSnapshot) {
            previousSnapshot.agreementNo =
                toStr(previousSnapshot.agreementNo) ||
                toStr(savedRenewalPayload?.previousAgreementNo) ||
                toStr(unit.agreementNo || basePayload.agreementNo);
            if (!isEditExisting) {
                previousSnapshot.startDate = toStr(unit.startDate || basePayload.startDate);
                previousSnapshot.endDate = toStr(unit.endDate || basePayload.endDate);
            }
            previousSnapshot.municipalFormNo = toStr(previousSnapshot.municipalFormNo || basePayload.municipalFormNo);
            previousSnapshot.municipalContractNo = toStr(
                previousSnapshot.municipalContractNo || basePayload.municipalContractNo
            );
        }
        _contractRenewalCtx = {
            unit,
            basePayload,
            renewal: renewalNorm,
            previousSnapshot,
            prevStart: toStr(
                renewalNorm.prevStart || previousSnapshot?.startDate || unit.startDate || basePayload.startDate
            ),
            prevEnd: toStr(renewalNorm.prevEnd || previousSnapshot?.endDate || unit.endDate || basePayload.endDate),
            financialOpen: true,
            isEditExistingRenewal: isEditExisting,
            isCurrentContractEdit: isCurrentEdit
        };
        if (Array.isArray(renewalNorm.linkedContractUnits) && renewalNorm.linkedContractUnits.length > 1) {
            basePayload.linkedContractUnits = renewalNorm.linkedContractUnits;
            basePayload.linkedContractUnitsJson = JSON.stringify(renewalNorm.linkedContractUnits);
        }
        const title = document.getElementById('crnfTitle');
        const locationLabel = getRenewalWizardLocationLabel(unit, basePayload);
        if (title) {
            title.textContent = isCurrentEdit
                ? `${t('تعديل العقد الحالي — الفترة والشيكات والإيجار', 'Edit current contract — period, cheques & rent')} — ${locationLabel}`
                : isEditExisting
                  ? `${t('تعديل التجديد — الشيكات والمبالغ', 'Edit renewal — cheques & amounts')} — ${locationLabel}`
                  : `${t('تجديد — الشيكات والمبالغ', 'Renewal — cheques & amounts')} — ${locationLabel}`;
        }
        refreshRenewalFinancialModalToolbar();
        renderContractRenewalFinancialSummary();
        wireRenewalMunicipalFieldHandlers();
        applyRenewalMunicipalValuesToAllFields(
            {
                municipalFormNo: renewalNorm.municipalFormNo || getRenewalMunicipalValuesFromSavedContract(unit).municipalFormNo,
                municipalContractNo:
                    renewalNorm.municipalContractNo || getRenewalMunicipalValuesFromSavedContract(unit).municipalContractNo
            },
            { force: true }
        );
        ensureRenewalMunicipalFieldsEditable();
        document.getElementById('contractRenewalModal')?.classList.remove('open');
        const working = getRenewalRenderPayload();
        const payloadSource = savedRenewalPayload || existingDraft?.payload;
        const draftRent = parseRentAmountInput(payloadSource?.monthlyRent);
        const renewalRent = parseRentAmountInput(renewalNorm.monthlyRent);
        const rentChanged =
            payloadSource &&
            draftRent !== '' &&
            renewalRent !== '' &&
            Math.abs(draftRent - renewalRent) > 0.0005;
        if (payloadSource && !rentChanged) {
            const savedPay = enrichPaymentScheduleRowsFromPayload(
                working,
                parsePayloadJsonArrayField(payloadSource, 'paymentScheduleJson', 'paymentSchedule')
            );
            const savedCustom = parsePayloadJsonArrayField(
                payloadSource,
                'customRentItemsJson',
                'customRentItems'
            );
            const savedVat = parsePayloadJsonArrayField(payloadSource, 'vatChequeScheduleJson', 'vatChequeSchedule');
            if (savedCustom.length) {
                renderCustomRentScheduleFromRows(savedCustom, {
                    wrapId: RENEWAL_CUSTOM_RENT_WRAP_ID,
                    renewalPayload: working
                });
            } else {
                renderCustomRentScheduleFromRows(paymentScheduleRowsToCustomRentRows(savedPay), {
                    wrapId: RENEWAL_CUSTOM_RENT_WRAP_ID,
                    renewalPayload: working
                });
            }
            renderPaymentScheduleFromRows(savedPay, {
                wrapId: RENEWAL_PAY_SCHEDULE_WRAP_ID,
                byCheque: isPaymentMethodCheque(basePayload.paymentMethod),
                paymentMethodSet: !!toStr(basePayload.paymentMethod),
                renewalPayload: working
            });
            const showVat =
                isPayloadSubjectToVat(basePayload) && getPayloadVatPaymentMode(basePayload) === 'separate';
            const vatSection = document.getElementById('crnfVatSection');
            if (vatSection) vatSection.style.display = showVat ? '' : 'none';
            if (showVat) {
                renderVatChequeScheduleFromRows(savedVat, { wrapId: RENEWAL_VAT_SCHEDULE_WRAP_ID });
            }
        } else {
            rebuildRenewalPaymentSchedule();
        }
        const graceSource = payloadSource || existingDraft?.payload || { graceDays: '0', graceAmount: '0.000' };
        applyRenewalGraceFieldsToModal(graceSource, { fromDraft: !!(payloadSource || existingDraft?.payload) });
        wireRenewalCustomRentFieldHandlers();
        document.getElementById('contractRenewalFinancialModal')?.classList.add('open');
        ensureRenewalMunicipalFieldsEditable();
        syncRenewalStepPills(2);
        refreshRenewalGapsBanner();
    }

    function closeContractRenewalFinancialModal() {
        document.getElementById('contractRenewalFinancialModal')?.classList.remove('open');
        _contractRenewalCtx = null;
    }

    function cancelContractRenewalDraftFromModal() {
        const ctx = _contractRenewalCtx;
        if (!ctx?.unit) return;
        const ok = confirm(
            t(
                'إلغاء مسودة التجديد؟ سيُستعاد العقد النشط السابق إن كان قد تغيّر، وتُحذف مسودة الشيكات الجديدة.',
                'Cancel the renewal draft? The previous active contract will be restored if it was changed, and the new cheque draft will be removed.'
            )
        );
        if (!ok) return;
        const cancelPayload = collectContractRenewalFinancialFromModal();
        logContractRenewalEvent('cancelled', ctx.unit, {
            ...renewalLogDetailsFromCtx(ctx, cancelPayload),
            note: t('أُلغيت مسودة التجديد من قبل المستخدم.', 'Renewal draft cancelled by user.')
        });
        repairSavedContractCorruptedByRenewalDraft(ctx.unit);
        removeContractRenewalDraft(ctx.unit.building, ctx.unit.unit);
        try {
            syncBhdKvToServer();
        } catch (_eKvCan) {}
        closeContractRenewalFinancialModal();
        try {
            renderOperationsTable();
        } catch (_eTblCan) {}
        try {
            if (selectedUnitDetailsRecord) renderUnitHistory(selectedUnitDetailsRecord);
        } catch (_eHistCan) {}
        alert(t('تم إلغاء مسودة التجديد.', 'Renewal draft cancelled.'));
    }

    function openContractRenewalFinancialByKey(buildingNo, flatNo) {
        const b = toStr(buildingNo);
        const f = toStr(flatNo);
        if (!b || !f) return;
        const rows = window._unitsViewRows || getUnitsData() || [];
        const idx = rows.findIndex(
            (u) => toStr(u.building) === b && normalizeUnit(u.unit) === normalizeUnit(f)
        );
        const unit =
            idx >= 0
                ? rows[idx]
                : { building: b, unit: f, status: 'Rented', startDate: '', endDate: '' };
        const draft = getContractRenewalDraftEntryForUnit(unit) || getContractRenewalDraftMapEntry(loadContractRenewalDraftsMap(), b, f);
        if (!draft?.renewal) {
            alert(t('لا توجد مسودة تجديد.', 'No renewal draft found.'));
            return;
        }
        openContractRenewalFinancialModal(unit, draft.renewal);
    }

    function openContractRenewalFinancialForUnit(rowIndex) {
        const unit = (window._unitsViewRows || [])[rowIndex];
        if (!unit) return;
        if (
            !assertPermissionOrAlert(
                'manage_contracts',
                'لا تملك صلاحية العقود.',
                'No permission to access contracts.'
            )
        ) {
            return;
        }
        openContractRenewalFinancialByKey(unit.building, unit.unit);
    }

    function finalizeContractRenewalFromModal() {
        return saveContractRenewalFromModal({ forceDraft: false });
    }

    let _renewalSaveInProgress = false;

    async function saveContractRenewalFromModal(opt = {}) {
        const forceDraft = opt.forceDraft === true;
        const silent = opt.silent === true;
        if (!silent && !assertPermissionOrAlert('manage_contracts', 'لا تملك صلاحية العقود.', 'No permission for contracts.')) {
            return false;
        }
        if (_renewalSaveInProgress) return false;
        const ctx = _contractRenewalCtx;
        if (!ctx?.unit || !ctx?.previousSnapshot) return false;
        const payload = ctx.isCurrentContractEdit
            ? collectCurrentContractFinancialFromModal()
            : collectContractRenewalFinancialFromModal();
        if (!payload) return false;

        const incomplete = ctx.isCurrentContractEdit
            ? contractPayloadNeedsAdditionalData(payload)
            : renewalPayloadNeedsDraftSave(payload);
        const saveAsDraft = forceDraft || incomplete;
        _renewalSaveInProgress = true;
        try {
        let postSavePrintWin = null;
        let postSavePrintToken = '';
        if (opt.skipPrint !== true) {
            if (bhdIsDesktopApp() && window.bhdDesktop?.allocPrintWindowToken) {
                try {
                    postSavePrintToken = await window.bhdDesktop.allocPrintWindowToken();
                } catch (_ePreTok) {
                    postSavePrintToken = '';
                }
            }
            try {
                postSavePrintWin = window.open('', '_blank');
            } catch (_ePreWin) {
                postSavePrintWin = null;
            }
        }

        if (saveAsDraft) {
            mirrorRenewalPayloadToLinkedUnits(payload, (unitPayload, bKey, uKey) => {
                if (!bKey || !uKey) return;
                const linked = getLinkedContractUnitsFromPayload(payload);
                const merged =
                    linked.length > 1
                        ? {
                              ...payload,
                              ...unitPayload,
                              flatNo: toStr(uKey),
                              linkedContractUnits: linked,
                              linkedContractUnitsJson: JSON.stringify(linked)
                          }
                        : payload;
                const prevSnap =
                    normalizeUnit(uKey) === normalizeUnit(ctx.unit.unit)
                        ? ctx.previousSnapshot
                        : cloneContractPayloadForArchive(getSavedContractPayloadForUnit({ building: bKey, unit: uKey })) ||
                          ctx.previousSnapshot;
                upsertContractRenewalDraft(bKey, uKey, {
                    payload: merged,
                    renewal: ctx.renewal,
                    previousSnapshot: prevSnap,
                    lifecycleStatus: 'renewal_pending'
                });
            });
            try {
                syncBhdKvToServer();
            } catch (_eKvRen) {}
            try {
                renderOperationsTable();
            } catch (_eTblRen) {}
        } else {
            if (!validateRenewalTenantDocumentsOrAlert(payload, ctx.unit)) {
                if (postSavePrintWin) {
                    try {
                        postSavePrintWin.close();
                    } catch (_eCloseVal) {}
                }
                return false;
            }
            if (!validateRenewalMandatoryDocumentsOrAlert(payload)) {
                if (postSavePrintWin) {
                    try {
                        postSavePrintWin.close();
                    } catch (_eCloseMand) {}
                }
                return false;
            }
            const prev = ctx.previousSnapshot || getSavedContractPayloadForUnit(ctx.unit) || {};
            const prevAg = toStr(prev.agreementNo);
            const newAg = toStr(payload.agreementNo);
            if (!ctx.isEditExistingRenewal && !ctx.isCurrentContractEdit) {
                const linked = getLinkedContractUnitsFromPayload(prev);
                const unitRefs =
                    linked.length > 1
                        ? linked.map((lu) => ({ building: toStr(prev.buildingNo || ctx.unit.building), unit: lu.unit }))
                        : [{ building: ctx.unit.building, unit: ctx.unit.unit }];
                const archivedKeys = new Set();
                unitRefs.forEach((uRef) => {
                    const ak = _tenancyDraftStorageKey(uRef.building, uRef.unit);
                    if (archivedKeys.has(ak)) return;
                    archivedKeys.add(ak);
                    const prevPayload = getSavedContractPayloadForUnit(uRef) || prev;
                    const prevToArchive = cloneContractPayloadForArchive(prevPayload);
                    if (prevToArchive) {
                        normalizeRenewalPayloadUnitKeys(prevToArchive, uRef);
                        archiveSupersededContractPayload(prevToArchive, { reason: 'renewal', supersededBy: newAg });
                    }
                });
            }
            if (payload.agreementNo && /^TC-\d{2}-\d{4}-\d+$/i.test(toStr(payload.agreementNo))) {
                const seqMatch = toStr(payload.agreementNo).match(/^TC-\d{2}-\d{4}-(\d+)$/i);
                const seqNum = seqMatch ? parseInt(seqMatch[1], 10) : 0;
                const stored = parseInt(localStorage.getItem('bhd_tenancy_contract_seq') || '5000', 10) || 5000;
                if (seqNum > stored) {
                    localStorage.setItem('bhd_tenancy_contract_seq', String(seqNum));
                }
            }
            if (!ctx.isCurrentContractEdit && !ctx.isEditExistingRenewal) {
                resetPropertyDocumentsForNewRenewal(payload);
            }
            const lifecycleStatus = resolveContractLifecycleStatus(payload);
            normalizeRenewalPayloadUnitKeys(payload, ctx.unit);
            if (!ctx.isCurrentContractEdit) {
                payload.isRenewalContract = true;
            }
            payload.isRenewalDraft = false;
            payload.contractSavedStatus = lifecycleStatus;
            payload.contractSavedAt = new Date().toISOString();
            try {
                const persist = tryPersistContractFullWithQuotaBackoff(payload);
                if (persist.ok) {
                    localStorage.setItem('bhd_contract_full', JSON.stringify(persist.saved || payload));
                }
            } catch (_eFullRen) {}
            try {
                mirrorRenewalPayloadToLinkedUnits(payload, (unitPayload, bKey, uKey) => {
                    if (!bKey || !uKey) return;
                    const linked = getLinkedContractUnitsFromPayload(payload);
                    const merged =
                        linked.length > 1
                            ? {
                                  ...payload,
                                  ...unitPayload,
                                  flatNo: toStr(uKey),
                                  linkedContractUnits: linked,
                                  linkedContractUnitsJson: JSON.stringify(linked),
                                  isRenewalContract: payload.isRenewalContract,
                                  isRenewalDraft: false,
                                  contractSavedStatus: lifecycleStatus,
                                  contractSavedAt: payload.contractSavedAt
                              }
                            : { ...payload, flatNo: toStr(uKey) };
                    upsertSavedContractForUnit(bKey, uKey, merged, lifecycleStatus);
                });
            } catch (_eMirrorRenSave) {
                upsertSavedContractForUnit(ctx.unit.building, ctx.unit.unit, payload, lifecycleStatus);
            }
            try {
                repairLinkedContractUnitsLifecycleConsistency();
            } catch (_eRenLinkedSync) {}
            logContractRenewalEvent('completed', ctx.unit, {
                ...renewalLogDetailsFromCtx(ctx, payload),
                note: ctx.isCurrentContractEdit
                    ? t('تم تحديث بيانات العقد الحالي (الفترة والشيكات والإيجار).', 'Current contract updated (period, cheques & rent).')
                    : ctx.isEditExistingRenewal
                      ? t('تم تحديث بيانات التجديد المحفوظة.', 'Saved renewal data updated.')
                      : t(
                            `اكتمل التجديد. العقد السابق ${toStr(prevAg)} أُرشف.`,
                            `Renewal completed. Previous contract ${toStr(prevAg)} archived.`
                        )
            });
            removeContractRenewalDraft(ctx.unit.building, ctx.unit.unit);
            const linkedDraft = getLinkedContractUnitsFromPayload(payload);
            if (linkedDraft.length > 1) {
                linkedDraft.slice(1).forEach((lu) => {
                    removeContractRenewalDraft(ctx.unit.building, lu.unit);
                });
            }
            try {
                syncManagedUnitsFromProfiles();
            } catch (_eMuRen) {}
            try {
                syncBhdKvToServer();
            } catch (_eKvFin) {}
            closeContractRenewalFinancialModal();
            try {
                renderOperationsTable();
            } catch (_eTblFin) {}
            try {
                if (selectedUnitDetailsRecord) renderUnitHistory(selectedUnitDetailsRecord);
            } catch (_eHistFin) {}
            if (lifecycleStatus === 'active_docs_pending' && !silent && !ctx.isCurrentContractEdit) {
                setTimeout(() => {
                    try {
                        if (
                            confirm(
                                t(
                                    '✅ اكتمل التجديد.\n\nالخطوة التالية: رفع كل مستندات التجديد الإلزامية (سكنر).\nهل تريد فتح نافذة الرفع الآن؟',
                                    '✅ Renewal saved.\n\nNext step: upload all mandatory renewal documents (scanner).\nOpen the upload window now?'
                                )
                            )
                        ) {
                            openPropertyDocumentsBundleModal(ctx.unit);
                        }
                    } catch (_eRenPdbPrompt) {}
                }, 400);
            }
        }

        let printResult = { ok: false };
        if (opt.skipPrint !== true) {
            try {
                printResult = await printContractRenewalSaveBundle(payload, ctx.unit, {
                    targetWindow: postSavePrintWin,
                    printToken: postSavePrintToken,
                    suppressAlerts: true,
                    closeOnFail: true
                });
            } catch (_ePrRen) {}
        } else if (postSavePrintWin) {
            try {
                postSavePrintWin.close();
            } catch (_eCloseSkip) {}
        }

        if (!silent) {
            let msg = '';
            if (saveAsDraft) {
                msg =
                    !forceDraft && incomplete
                        ? t(
                              'البيانات غير مكتملة — تم حفظ التجديد كمسودة. أكمل الشيكات والبلدية ثم احفظ التجديد مرة أخرى.',
                              'Data is incomplete — renewal saved as draft. Complete cheques and municipal refs, then save renewal again.'
                          )
                        : t('تم حفظ مسودة التجديد.', 'Renewal draft saved.');
            } else {
                msg = t(
                    'تم حفظ تجديد العقد. العقد السابق مؤرشف وشيكاته محفوظة.',
                    'Contract renewal saved. The previous contract is archived with its cheques preserved.'
                );
            }
            if (opt.skipPrint !== true && printResult && !printResult.ok) {
                msg +=
                    '\n\n' +
                    t(
                        '⚠️ لم تُفتح نافذة الطباعة تلقائياً (02 — Renewal + كشف الحساب والشيكات). اسمح بالنوافذ المنبثقة ثم أعد الحفظ.',
                        '⚠️ The print window did not open automatically (02 — Renewal + financial summary & cheques). Allow pop-ups and save again.'
                    );
            }
            alert(msg);
        }

        return true;
        } finally {
            _renewalSaveInProgress = false;
        }
    }

    function collectContractRenewalWizardData() {
        const newStart = toStr(document.getElementById('crnNewStart')?.value);
        const newEnd = toStr(document.getElementById('crnNewEnd')?.value);
        const monthsFallback = Math.max(1, parseInt(toStr(document.getElementById('crnNewMonths')?.value), 10) || 12);
        const period = computeContractPeriodMonthsAndExtraDays(newStart, newEnd, monthsFallback);
        const municipal = refreshRenewalMunicipalInCtx();
        const monthlyRent = formatRentAmountForInput(document.getElementById('crnNewMonthlyRent')?.value);
        const linkedFromUi = readRenewalLinkedUnitsRentFromUi();
        if (linkedFromUi && linkedFromUi.length > 1) {
            syncRenewalLinkedUnitsRentToPayload(linkedFromUi);
        }
        return {
            prevStart: _contractRenewalCtx?.prevStart || '',
            prevEnd: _contractRenewalCtx?.prevEnd || '',
            newStart,
            newEnd,
            newMonths: Math.max(1, period.months || monthsFallback),
            newExtraDays: period.extraDays || 0,
            agreementNo: toStr(document.getElementById('crnNewAgreementNo')?.value),
            municipalFormNo: municipal.municipalFormNo,
            municipalContractNo: municipal.municipalContractNo,
            monthlyRent,
            linkedContractUnits: linkedFromUi && linkedFromUi.length > 1 ? linkedFromUi : undefined
        };
    }

    function continueContractRenewalToFinancials() {
        const unit = _contractRenewalCtx?.unit || selectedUnitDetailsRecord;
        if (!unit) return;
        const renewal = collectContractRenewalWizardData();
        if (!renewal.newStart || !renewal.newEnd) {
            alert(
                t(
                    'أدخل فترة العقد الجديدة (الشهور أو تاريخ النهاية).',
                    'Enter the new contract period (months or end date).'
                )
            );
            return;
        }
        if (parseYmdToLocalDate(renewal.newEnd) < parseYmdToLocalDate(renewal.newStart)) {
            alert(t('تاريخ النهاية يجب أن يكون بعد البداية.', 'End date must be after start date.'));
            return;
        }
        const rentVal = parseRentAmountInput(renewal.monthlyRent);
        if (rentVal === '' || rentVal <= 0) {
            alert(
                t(
                    'أدخل إجمالي القيمة الإيجارية الشهرية للعقد الجديد (أكبر من صفر).',
                    'Enter the new contract total monthly rent (greater than zero).'
                )
            );
            return;
        }
        renewal.monthlyRent = formatRentAmountForInput(rentVal);
        const linkedFromUi = readRenewalLinkedUnitsRentFromUi();
        if (linkedFromUi && linkedFromUi.length > 1) {
            renewal.linkedContractUnits = linkedFromUi;
            const payloadRef = _contractRenewalCtx?.payload;
            if (payloadRef) {
                payloadRef.linkedContractUnits = linkedFromUi;
                payloadRef.linkedContractUnitsJson = JSON.stringify(linkedFromUi);
            }
        } else {
            const payloadRef = _contractRenewalCtx?.payload;
            if (payloadRef && getLinkedContractUnitsFromPayload(payloadRef).length > 1) {
                applyRenewalRentToLinkedUnits(payloadRef, rentVal);
                renewal.linkedContractUnits = getLinkedContractUnitsFromPayload(payloadRef);
            }
        }
        ensureRenewalAgreementNumberAllocated(renewal, unit);
        repairSavedContractCorruptedByRenewalDraft(unit);
        const isEditExisting = _contractRenewalCtx?.isEditExistingRenewal === true;
        const isCurrentEdit = _contractRenewalCtx?.isCurrentContractEdit === true;
        const savedRenewalPayload =
            isEditExisting || isCurrentEdit ? getSavedContractPayloadForUnit(unit) : null;
        const previousSnapshot = isEditExisting
            ? _contractRenewalCtx?.previousSnapshot ||
              resolveRenewalPreviousSnapshotFromHistory(unit, savedRenewalPayload)
            : isCurrentEdit
              ? _contractRenewalCtx?.previousSnapshot || getSavedContractPayloadForUnit(unit)
              : getSavedContractPayloadForUnit(unit);
        const draftCtx = {
            unit,
            prevStart: renewal.prevStart || toStr(unit.startDate),
            prevEnd: renewal.prevEnd || toStr(unit.endDate),
            renewal,
            previousSnapshot
        };
        closeContractRenewalModal(false);
        closeUnitDetailsModal();
        openContractRenewalFinancialModal(unit, renewal, {
            isEditExistingRenewal: isEditExisting,
            isCurrentContractEdit: isCurrentEdit,
            previousSnapshot,
            basePayload: isEditExisting ? previousSnapshot : isCurrentEdit ? previousSnapshot : undefined,
            savedRenewalPayload: isEditExisting || isCurrentEdit ? savedRenewalPayload : undefined
        });
        persistContractRenewalDraftFromModal({ silent: true });
        logContractRenewalEvent('draft_started', unit, {
            ...renewalLogDetailsFromCtx(_contractRenewalCtx || draftCtx),
            note: t('فتح خطوة الشيكات والمبالغ لمسودة التجديد.', 'Renewal financial step opened (draft).')
        });
        try {
            if (selectedUnitDetailsRecord) renderUnitHistory(selectedUnitDetailsRecord);
        } catch (_eHistDr) {}
        syncRenewalStepPills(2);
        refreshRenewalGapsBanner();
    }

    function openDetailsContract(kind) {
        if (!selectedUnitDetailsRecord) return;
        if (!unitDetailsAllowsContractPrintActions(selectedUnitDetailsRecord)) {
            alert(t(
                'عقد جديد وطباعة الاستمارات متاحان بعد حجز الوحدة فقط.',
                'New contract and print forms are available only after the unit is reserved.'
            ));
            return;
        }
        if (!ensureUnitActionAllowed(selectedUnitDetailsRecord, kind)) return;
        closeUnitDetailsIeMenus();
        if (kind === 'renew') {
            openContractRenewalModal();
            return;
        }
        const map = { new: 0, renew: 1, cancel: 6, checkin: 4, checkout: 5, invoice: 7 };
        const isRenew = false;
        prefillContractFromUnit(selectedUnitDetailsRecord, isRenew);
        if (kind === 'all') {
            openDocumentsWindow(buildPayloadFromUnit(selectedUnitDetailsRecord, isRenew), { autoPrint: false });
        } else {
            currentDoc = map[kind] ?? 0;
            contractEntryContext = { mode: 'contract', unit: null };
            setWorkspaceMode('contracts');
            showContractsWorkspaceView('form');
            renderDocument(currentDoc);
            closeUnitDetailsModal();
        }
    }

    let _contractFullViewCtx = null;

    function getContractFullViewSectionDefs() {
        return [
            { key: 'summary', label: t('ملخص العقد / Contract summary', 'Contract summary / ملخص العقد'), default: true },
            { key: 'owner', label: t('بيانات المالك / Owner data', 'Owner data / بيانات المالك'), default: true },
            { key: 'building', label: t('بيانات المبنى / Building data', 'Building data / بيانات المبنى'), default: true },
            { key: 'unit', label: t('بيانات الوحدة / Unit data', 'Unit data / بيانات الوحدة'), default: true },
            { key: 'linked_units', label: t('الوحدات المرتبطة / Linked units', 'Linked units / الوحدات المرتبطة'), default: true },
            { key: 'tenant', label: t('بيانات المستأجر / Tenant data', 'Tenant data / بيانات المستأجر'), default: true },
            { key: 'contract_terms', label: t('شروط العقد والإيجار / Contract & rent terms', 'Contract & rent terms / شروط العقد'), default: true },
            { key: 'documents', label: t('المستندات الإلزامية / Mandatory documents', 'Mandatory documents / المستندات'), default: true },
            { key: 'financial', label: t('الملخص المالي / Financial summary', 'Financial summary / الملخص المالي'), default: true },
            { key: 'payments', label: t('جدول الدفعات / Payment schedule', 'Payment schedule / جدول الدفعات'), default: true },
            { key: 'cheques', label: t('جدول الشيكات / Cheque schedule', 'Cheque schedule / جدول الشيكات'), default: true },
            { key: 'vat_cheques', label: t('شيكات الضريبة / VAT cheques', 'VAT cheques / شيكات الضريبة'), default: true },
            { key: 'insurance', label: t('بنود التأمين / Insurance lines', 'Insurance lines / بنود التأمين'), default: true },
            { key: 'attachments', label: t('المرفقات / Attachments', 'Attachments / المرفقات'), default: true }
        ];
    }

    function resolveBuildingProfileForName(buildingName) {
        const b = toStr(buildingName);
        if (!b) return null;
        if (buildingProfiles[b]) return buildingProfiles[b];
        const key = Object.keys(buildingProfiles).find(
            (k) => normalizeReservationBuildingKey(k) === normalizeReservationBuildingKey(b)
        );
        return key ? buildingProfiles[key] : null;
    }

    function buildContractFullViewData(unit, payload) {
        const p = payload && typeof payload === 'object' ? payload : {};
        const building = toStr(p.buildingNo || unit?.building);
        const flatNo = toStr(p.flatNo || unit?.unit);
        const bProfile = resolveBuildingProfileForName(building) || {};
        const ownerNames = getOwnerNamesForBuilding(building);
        const owners = ownerNames.map((n) => ({
            name: n,
            profile: getEditableOwnerProfile(n)
        }));
        const paymentSchedule = parsePayloadJsonArrayField(p, 'paymentScheduleJson', 'paymentSchedule');
        const vatChequeSchedule = parsePayloadJsonArrayField(p, 'vatChequeScheduleJson', 'vatChequeSchedule');
        const insuranceDepositItems = parsePayloadJsonArrayField(p, 'insuranceDepositItemsJson', 'insuranceDepositItems');
        let mandDocs = {};
        try {
            mandDocs = JSON.parse(toStr(p.contractMandatoryDocsJson) || '{}');
        } catch (_eM) {
            mandDocs = {};
        }
        const otherDocs = parsePayloadJsonArrayField(p, 'contractOtherDocsJson', 'contractOtherDocs');
        return {
            unit,
            payload: p,
            building,
            flatNo,
            bProfile,
            owners,
            paymentSchedule,
            vatChequeSchedule,
            insuranceDepositItems,
            mandDocs,
            otherDocs,
            attachmentItems: []
        };
    }

    function cfvGridHtml(rows) {
        const list = (Array.isArray(rows) ? rows : []).filter((r) => r && toStr(r[1]) !== '');
        if (!list.length) return `<p style="font-size:12px;color:#666;margin:0">${t('لا توجد بيانات / No data', 'No data / لا توجد بيانات')}</p>`;
        return `<div class="cfv-grid">${list
            .map(
                ([label, value]) =>
                    `<div class="cfv-item"><small>${escHtml(label)}</small><strong>${escHtml(toStr(value) || '—')}</strong></div>`
            )
            .join('')}</div>`;
    }

    function cfvSectionWrap(title, body) {
        return `<section class="cfv-section"><h3 class="cfv-section-title">${escHtml(title)}</h3>${body}</section>`;
    }

    function cfvScheduleTableHtml(rows, cols, opts = {}) {
        if (!rows.length) {
            return `<p style="font-size:12px;color:#666;margin:0">${t('لا توجد صفوف / No rows', 'No rows / لا توجد صفوف')}</p>`;
        }
        const head = cols.map((c) => `<th>${escHtml(c.label)}</th>`).join('');
        const body = rows
            .map((r) => `<tr>${cols.map((c) => `<td>${c.render(r)}</td>`).join('')}</tr>`)
            .join('');
        const tableHtml = `<table class="fin-print-table cfv-schedule-table" role="presentation"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
        if (opts.forPrint) return tableHtml;
        return `<div class="table-shell" style="overflow:auto">${tableHtml}</div>`;
    }

    const CFV_FINANCIAL_SECTION_KEYS = ['financial', 'payments', 'cheques', 'vat_cheques', 'insurance'];

    function buildContractFullViewPrintOpts(keys) {
        const set = new Set(keys);
        return {
            forPrint: true,
            omitPaymentSchedule: set.has('financial') && set.has('payments'),
            omitVatChequeLineItems: set.has('financial') && set.has('vat_cheques')
        };
    }

    function buildContractFullViewPrintSectionsHtml(ctx, keys) {
        const contentKeys = keys.filter((k) => k !== 'attachments');
        const printOpts = buildContractFullViewPrintOpts(keys);
        let html = '';
        let inFinancialBlock = false;
        contentKeys.forEach((key) => {
            const isFinancial = CFV_FINANCIAL_SECTION_KEYS.includes(key);
            if (isFinancial && !inFinancialBlock) {
                html += `<div class="cfv-financial-print-block">
                    <p class="cfv-financial-print-intro">${t(
                        'المالية والدفعات — ملخص الحسابات وجداول الدفع والشيكات والتأمين بالترتيب',
                        'Financial & payments — account summary, schedules, cheques and insurance in order'
                    )}</p>`;
                inFinancialBlock = true;
            }
            if (!isFinancial && inFinancialBlock) {
                html += '</div>';
                inFinancialBlock = false;
            }
            html += buildContractFullViewSectionHtml(key, ctx, printOpts);
        });
        if (inFinancialBlock) html += '</div>';
        return html;
    }

    function isRenewalFinancialReceiptPayload(payload) {
        if (!payload || typeof payload !== 'object') return false;
        if (payload.isRenewalContract === true) return true;
        const prev = toStr(payload.previousAgreementNo);
        const cur = toStr(payload.agreementNo);
        return !!(prev && cur && prev !== cur);
    }

    function collectRenewalGraceFromModal() {
        const days = Math.max(0, parseInt(toStr(document.getElementById('crnfGraceDays')?.value), 10) || 0);
        return {
            graceDays: String(days),
            graceAmount: toStr(document.getElementById('crnfGraceAmount')?.value) || '0.000'
        };
    }

    function applyRenewalGraceFieldsToModal(payload, opt = {}) {
        const p = payload || {};
        const gEl = document.getElementById('crnfGraceDays');
        const aEl = document.getElementById('crnfGraceAmount');
        const savedDays = Math.max(0, parseInt(toStr(p.graceDays), 10) || 0);
        const useSavedGrace = opt.fromDraft === true || p.isRenewalContract === true || p.isRenewalDraft === true;
        if (gEl) gEl.value = useSavedGrace ? String(savedDays) : '0';
        recomputeRenewalGraceFromUi();
    }

    function recomputeRenewalGraceFromUi() {
        const ctx = _contractRenewalCtx;
        const gEl = document.getElementById('crnfGraceDays');
        const aEl = document.getElementById('crnfGraceAmount');
        const rent =
            parseRentAmountInput(ctx?.renewal?.monthlyRent) ||
            parseFloat(ctx?.basePayload?.monthlyRent) ||
            parseFloat(ctx?.renewal?.monthlyRent) ||
            0;
        const days = Math.max(0, parseInt(toStr(gEl?.value), 10) || 0);
        if (gEl) gEl.value = String(days);
        applyGraceAmountToField(aEl, rent, days);
        try {
            scheduleRenewalDraftAutosave();
        } catch (_eRenGrace) {}
    }

    function stripPreviousContractFinancialsFromRenewalPayload(p, basePayload) {
        if (!p || typeof p !== 'object') return p;
        const base = basePayload || {};
        p.isRenewalContract = true;
        p.previousAgreementNo = toStr(p.previousAgreementNo) || toStr(base.agreementNo);
        p.unitHandoverDate = '';
        p.depositAmount = '0';
        p.depositReceiptRef = '';
        p.depositAttachmentName = '';
        p.depositAttachmentDataUrl = '';
        p.depositAttachmentRelativePath = '';
        p.depositAttachmentFileId = '';
        p.depositStoredOnDisk = false;
        p.insuranceDepositItems = [];
        p.insuranceDepositItemsJson = '[]';
        p.extraAdjustments = [];
        p.extraAdjustmentsJson = '[]';
        p.otherDiscountAmount = '0';
        const gd = Math.max(0, parseInt(toStr(p.graceDays), 10) || 0);
        const rentNum = parseFloat(p.monthlyRent) || 0;
        p.graceDays = String(gd);
        p.graceAmount = formatGraceAmountOm(
            gd > 0
                ? parseFloat(toStr(p.graceAmount)) > 0
                    ? p.graceAmount
                    : calculateGraceAmountOmFromRentAndDays(rentNum, gd)
                : 0
        );
        return p;
    }

    function getSmartTotalsFromPayload(d) {
        const monthly = getMonthlyRentBaseFromPayload(d);
        const months = parseInt(d.contractMonths, 10) || 0;
        const municipal = parseFloat(calcMunicipalFeesFromPayload(d)) || 0;
        const paymentSchedule = parsePayloadJsonArrayField(d, 'paymentScheduleJson', 'paymentSchedule');
        const customRentItems = parsePayloadJsonArrayField(d, 'customRentItemsJson', 'customRentItems');
        let baseRows = paymentSchedule.slice();
        if (!baseRows.length && months > 0) {
            baseRows = Array.from({ length: months }, (_, i) => ({
                monthIndex: i + 1,
                amount: monthly,
                dueDate: ''
            }));
        }
        const rentTotal = sumScheduleAmounts(paymentSchedule.length ? paymentSchedule : baseRows);
        const baseRentTotal = sumScheduleAmounts(baseRows);
        const customRentNet = rentTotal - baseRentTotal;
        const insRows = parsePayloadJsonArrayField(d, 'insuranceDepositItemsJson', 'insuranceDepositItems');
        const isRenewalReceipt = isRenewalFinancialReceiptPayload(d);
        let insuranceLinesTotal = insRows.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
        let depositRefAmount = parseFloat(toStr(d.depositAmount)) || 0;
        let depositReceiptRef = toStr(d.depositReceiptRef);
        let graceDiscount = parseFloat(d.graceAmount) || 0;
        let extraRows = parsePayloadJsonArrayField(d, 'extraAdjustmentsJson', 'extraAdjustments');
        let legacyOtherDiscount = parseFloat(d.otherDiscountAmount) || 0;
        if (isRenewalReceipt) {
            insuranceLinesTotal = 0;
            depositRefAmount = 0;
            depositReceiptRef = '';
            extraRows = [];
            legacyOtherDiscount = 0;
            const renewalGraceDays = getContractGraceDaysFromData(d);
            graceDiscount =
                renewalGraceDays > 0
                    ? parseFloat(toStr(d.graceAmount)) > 0
                        ? parseFloat(d.graceAmount)
                        : calculateGraceAmountOmFromRentAndDays(monthly, renewalGraceDays)
                    : 0;
        }
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
        const vatChequeRows = parsePayloadJsonArrayField(d, 'vatChequeScheduleJson', 'vatChequeSchedule');
        let vatChequeTotal =
            vatSubject && vatMode === 'separate' ? sumVatChequeScheduleAmounts(vatChequeRows) : 0;
        if (vatSubject && vatMode === 'separate' && !vatChequeTotal && vatAnnual > 0) {
            vatChequeTotal = vatAnnual;
        }
        const vatChequeCount = Math.max(vatChequeRows.length, parseInt(toStr(d.vatChequeCount), 10) || 0);
        const vatIncludedInRent =
            vatSubject && vatMode === 'with_rent'
                ? computeContractTotalVatOm(monthly, periodBreakdown.months || months || 0, periodBreakdown.extraDays)
                : 0;
        const contractBeforeDiscount = rentTotal + municipal + (vatMode === 'separate' ? vatChequeTotal : 0);
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
            toStr(o.tenantNameEn).trim() ||
            toStr(o.agreementNo).trim() ||
            (toStr(o.buildingNo).trim() && toStr(o.flatNo).trim())
        );
    }

    function hasPersistedContractWorkspaceData() {
        try {
            const raw = localStorage.getItem('bhd_contract_full');
            if (raw) {
                const o = JSON.parse(raw);
                if (isMeaningfulContractPayload(o)) return true;
            }
        } catch (_e) {}
        try {
            const m = loadTenancyContractDraftsMap();
            for (const k of Object.keys(m || {})) {
                const p = m[k] && m[k].payload;
                if (isMeaningfulContractPayload(p)) return true;
            }
        } catch (_e2) {}
        return false;
    }

    function rememberContractWorkspaceUnitPointers(buildingNo, flatNo) {
        const b = toStr(buildingNo);
        const u = toStr(flatNo);
        if (!b || !u) return;
        try {
            sessionStorage.setItem('bhd_contract_workspace_building', b);
            sessionStorage.setItem('bhd_contract_workspace_unit', u);
            localStorage.setItem('bhd_contract_workspace_last_building', b);
            localStorage.setItem('bhd_contract_workspace_last_unit', u);
        } catch (_e) {}
    }

    function persistContractWorkspaceDraftSilent(opt = {}) {
        if (typeof isViewerMode !== 'undefined' && isViewerMode) return false;
        let data;
        try {
            data = collectStorableContractFullFromDom();
        } catch (_eCol) {
            return false;
        }
        if (!isMeaningfulContractPayload(data)) return false;
        const b = toStr(data.buildingNo);
        const u = toStr(data.flatNo);
        if (b && u) {
            const hasDraft = unitHasTenancyDraftForUnit(b, u);
            const hasSaved = unitHasSavedContractForUnit(b, u);
            const hasReservation = findReservationIndexForUnit(b, u) >= 0;
            if (!hasDraft && !hasSaved && hasReservation && !opt.explicit) {
                return false;
            }
        }
        const persist = tryPersistContractFullWithQuotaBackoff(data);
        if (!persist.ok) return false;
        let saved = enrichPayloadWithResolvedLinkedContractUnits(persist.saved || data);
        const savedB = toStr(saved.buildingNo);
        const savedU = toStr(saved.flatNo);
        try {
            mirrorTenancyPayloadToLinkedUnits(saved, (unitPayload, bKey, uKey) => {
                if (!bKey || !uKey) return;
                if (getContractRenewalDraftEntryForUnit({ building: bKey, unit: uKey })) return;
                const existingSaved = getSavedContractMapEntry(loadSavedContractsByUnitMap(), bKey, uKey);
                if (existingSaved) {
                    const merged = mergeContractPayloadPreferRich(existingSaved.payload, unitPayload);
                    merged.contractSavedAt = toStr(existingSaved.savedAt) || toStr(existingSaved.payload?.contractSavedAt);
                    const lifecycleStatus = resolveContractLifecycleStatus(merged);
                    merged.contractSavedStatus = lifecycleStatus;
                    upsertSavedContractForUnit(bKey, uKey, merged, lifecycleStatus);
                } else {
                    try {
                        upsertTenancyContractDraftFromPayload(bKey, uKey, unitPayload);
                    } catch (_eDraft) {}
                }
                rememberContractWorkspaceUnitPointers(bKey, uKey);
            });
        } catch (_eMirrorDraft) {
            const b = toStr(saved.buildingNo);
            const u = toStr(saved.flatNo);
            if (b && u) {
                try {
                    upsertTenancyContractDraftFromPayload(b, u, saved);
                } catch (_eDraft) {}
                rememberContractWorkspaceUnitPointers(b, u);
            }
        }
        try {
            syncBhdKvToServer();
        } catch (_eKv) {}
        try {
            repairLinkedContractUnitsLifecycleConsistency();
        } catch (_eRepDraftLinked) {}
        return true;
    }

    function flushContractWorkspaceDraftSave() {
        if (_contractDraftSaveTimer) {
            clearTimeout(_contractDraftSaveTimer);
            _contractDraftSaveTimer = null;
        }
        try {
            return persistContractWorkspaceDraftSilent();
        } catch (_eFlush) {
            return false;
        }
    }

    /** استعادة العقد والمستأجر بعد تحديث الصفحة / Restore contract + tenant after page refresh */
    function restoreContractWorkspaceOnStartup() {
        if (typeof isViewerMode !== 'undefined' && isViewerMode) return false;
        try {
            migrateLegacySavedContractToRegistry();
        } catch (_eMig) {}
        try {
            repairAllRenewalDraftSavedContracts();
        } catch (_eRenRepairStart) {}
        let restored = false;
        try {
            const raw = localStorage.getItem('bhd_contract_full');
            if (raw) {
                const o = JSON.parse(raw);
                if (isMeaningfulContractPayload(o)) {
                    loadAllData(false);
                    restored = true;
                }
            }
        } catch (_eLoad) {}
        if (!restored) {
            let payload = null;
            try {
                const bHint =
                    sessionStorage.getItem('bhd_contract_workspace_building') ||
                    localStorage.getItem('bhd_contract_workspace_last_building') ||
                    '';
                const uHint =
                    sessionStorage.getItem('bhd_contract_workspace_unit') ||
                    localStorage.getItem('bhd_contract_workspace_last_unit') ||
                    '';
                if (bHint && uHint) {
                    payload = getTenancyDraftPayloadForUnit({ building: bHint, unit: uHint });
                }
            } catch (_eHint) {}
            if (!payload) {
                try {
                    const m = loadTenancyContractDraftsMap();
                    const keys = Object.keys(m || {});
                    if (keys.length === 1) {
                        const entry = m[keys[0]];
                        payload = entry && entry.payload ? entry.payload : null;
                    }
                } catch (_eMap) {}
            }
            if (payload && isMeaningfulContractPayload(payload)) {
                try {
                    applyObjectToContractFormFields(payload, { hydratingFromSaved: true });
                    restored = true;
                } catch (_eApply) {}
            }
        }
        if (restored) {
            rememberContractWorkspaceUnitPointers(
                document.getElementById('buildingNo')?.value,
                document.getElementById('flatNo')?.value
            );
            try {
                flushContractWorkspaceDraftSave();
            } catch (_eSav) {}
            try {
                restoreTenancyCompletionLockFromStorage();
            } catch (_eLock) {}
            try {
                restoreContractAdditionalDataModeFromStorage();
            } catch (_eAddLock) {}
            try {
                applyContractsWorkspaceLockState();
            } catch (_eCws) {}
        }
        return restored;
    }

    function scheduleContractWorkspaceDraftSave() {
        if (typeof isViewerMode !== 'undefined' && isViewerMode) return;
        if (_contractDraftSaveTimer) clearTimeout(_contractDraftSaveTimer);
        _contractDraftSaveTimer = setTimeout(() => {
            _contractDraftSaveTimer = null;
            try {
                persistContractWorkspaceDraftSilent();
            } catch (_eSav) {}
        }, 500);
    }

    function showContractWorkspaceRefreshStatus(msg, isError) {
        const el = document.getElementById('contractWorkspaceRefreshStatus');
        if (!el) return;
        el.textContent = msg;
        el.classList.toggle('is-error', !!isError);
        el.style.opacity = '1';
        if (_contractRefreshStatusTimer) clearTimeout(_contractRefreshStatusTimer);
        _contractRefreshStatusTimer = setTimeout(() => {
            el.style.opacity = '0';
        }, 3500);
    }

    /** تحديث فوري للمدة والجداول والملخص — دون إعادة تحميل الصفحة / Live refresh of period, schedules, and summary without page reload */
    function refreshContractWorkspaceData(opt = {}) {
        const showStatus = opt.showStatus === true;
        const skipSave = opt.skipSave === true;
        try {
            recomputeGraceDaysFromHandoverAndStart('contract');
        } catch (_eG) {}
        try {
            const sd = toStr(document.getElementById('startDate')?.value);
            const ed = toStr(document.getElementById('endDate')?.value);
            if (sd && ed) recomputeContractPeriodFields('endDate');
            else if (sd) recomputeContractPeriodFields('contractMonths');
        } catch (_eP) {}
        try {
            updateReservationCalculations();
        } catch (_eC) {}
        try {
            syncContractPeriodDisplay();
        } catch (_eD) {}
        try {
            syncContractVatUi({ skipPayRebuild: true });
        } catch (_eV) {}
        try {
            onPaymentMethodOrDriversChanged({
                forceBaseDates: opt.forceBaseDates !== false,
                refreshVatInclusiveAmounts: isContractVatIncludedWithRent(),
                stripVatFromAmounts: !isContractVatIncludedWithRent()
            });
        } catch (_ePay) {}
        try {
            updateSummaryPanel();
        } catch (_eSum) {}
        try {
            renderDocument(currentDoc);
        } catch (_eDoc) {}
        try {
            refreshGraceHandoverIndicators();
        } catch (_eInd) {}
        try {
            refreshPropertyDocumentsBundleSectionVisibility();
        } catch (_ePdbVisCw) {}
        if (!skipSave) {
            const ok = persistContractWorkspaceDraftSilent();
            if (showStatus) {
                showContractWorkspaceRefreshStatus(
                    ok
                        ? t('✓ تم تحديث البيانات وحفظ المسودة محلياً', '✓ Data refreshed and draft saved locally')
                        : t('✓ تم تحديث البيانات', '✓ Data refreshed'),
                    false
                );
            }
        } else if (showStatus) {
            showContractWorkspaceRefreshStatus(t('✓ تم تحديث البيانات', '✓ Data refreshed'), false);
        }
    }

    function scheduleContractWorkspaceDataRefresh() {
        if (typeof isViewerMode !== 'undefined' && isViewerMode) return;
        if (_contractWorkspaceRefreshTimer) clearTimeout(_contractWorkspaceRefreshTimer);
        _contractWorkspaceRefreshTimer = setTimeout(() => {
            _contractWorkspaceRefreshTimer = null;
            try {
                refreshContractWorkspaceData({ skipSave: false });
            } catch (_eSch) {}
        }, 280);
    }

    function refreshContractFinancialCalculations(opt = {}) {
        try {
            recomputeGraceDaysFromHandoverAndStart('contract');
        } catch (_eGraceFin) {}
        try {
            const sd = toStr(document.getElementById('startDate')?.value);
            const ed = toStr(document.getElementById('endDate')?.value);
            if (sd && ed) recomputeContractPeriodFields('endDate');
            else if (sd) recomputeContractPeriodFields('contractMonths');
        } catch (_ePeriodFin) {}
        try {
            updateReservationCalculations();
        } catch (_eCalcFin) {}
        try {
            syncContractVatUi({
                skipPayRebuild: true,
                skipVatRebuild: opt.skipVatRebuild === true
            });
        } catch (_eVatFin) {}
        try {
            syncContractPeriodDisplay();
        } catch (_ePerDispFin) {}
        if (opt.skipPayRebuild !== true) {
            try {
                onPaymentMethodOrDriversChanged({
                    refreshVatInclusiveAmounts: isContractVatIncludedWithRent(),
                    stripVatFromAmounts: !isContractVatIncludedWithRent()
                });
            } catch (_ePayFin) {}
        }
        try {
            updateSummaryPanel();
        } catch (_eSumFin) {}
    }

    function refreshReservationFinancialCalculations() {
        try { recomputeGraceDaysFromHandoverAndStart('reservation'); } catch (_eGraceResFin) {}
        try { updateReservationFormCalculations(); } catch (_eCalcResFin) {}
    }

    function refreshContractDocumentsForPreview() {
        try { hydrateContractDocumentsFromStoredJson(); } catch (_eHydr) {}
        try { renderContractMandatoryDocsUi(true); } catch (_eMand) {}
        try { renderDocument(currentDoc); } catch (_eDoc) {}
    }

    let _contractDocPreviewCache = [];
    let _contractAttachmentPreviewZoom = 1;

    function isImageAttachmentDataUrl(dataUrl, type, name) {
        const u = toStr(dataUrl);
        const ty = toStr(type).toLowerCase();
        const nm = toStr(name).toLowerCase();
        if (/^data:image\//i.test(u)) return true;
        if (ty.startsWith('image/')) return true;
        return /\.(png|jpe?g|gif|webp|bmp)$/i.test(nm);
    }

    function isPdfAttachmentDataUrl(dataUrl, type, name) {
        const u = toStr(dataUrl);
        const ty = toStr(type).toLowerCase();
        const nm = toStr(name).toLowerCase();
        if (/^data:application\/pdf/i.test(u)) return true;
        if (ty === 'application/pdf') return true;
        return nm.endsWith('.pdf');
    }

    function isVideoAttachmentDataUrl(dataUrl, type, name) {
        const u = toStr(dataUrl);
        const ty = toStr(type).toLowerCase();
        const nm = toStr(name).toLowerCase();
        if (/^data:video\//i.test(u)) return true;
        if (ty.startsWith('video/')) return true;
        return /\.(mp4|webm|ogg|mov|m4v|avi|mkv)$/i.test(nm);
    }

    function contractAttachmentItemPresent(it) {
        if (!it) return false;
        return !!(
            pickEmbeddedDataUrl(it, it.dataUrl, it.checkAttachmentDataUrl, it.attachmentDataUrl) ||
            toStr(it.relativePath).trim() ||
            toStr(it.checkAttachmentRelativePath).trim() ||
            toStr(it.attachmentRelativePath).trim() ||
            toStr(it.fileId).trim() ||
            (it.storedOnDisk && toStr(it.name))
        );
    }

    function enrichContractAttachmentPreviewMeta(items, payloadOpt) {
        const sched = {};
        const vatSched = {};
        try {
            getPaymentScheduleFromUi().forEach((r) => {
                sched[`pay_chq_${r.monthIndex || 0}`] = r;
            });
        } catch (_ePs) {}
        try {
            getVatChequeScheduleFromUi().forEach((r) => {
                vatSched[`vat_chq_${r.chequeIndex || 0}`] = r;
            });
        } catch (_eVs) {}
        if (payloadOpt && typeof payloadOpt === 'object') {
            parsePayloadJsonArrayField(payloadOpt, 'paymentScheduleJson', 'paymentSchedule').forEach((r) => {
                const k = `pay_chq_${r.monthIndex || 0}`;
                if (!sched[k]) sched[k] = r;
            });
            parsePayloadJsonArrayField(payloadOpt, 'vatChequeScheduleJson', 'vatChequeSchedule').forEach((r) => {
                const k = `vat_chq_${r.chequeIndex || 0}`;
                if (!vatSched[k]) vatSched[k] = r;
            });
        }
        const depReceiptRef =
            toStr(document.getElementById('depositReceiptRef')?.value) ||
            toStr(payloadOpt?.depositReceiptRef);
        const depAmount =
            toStr(document.getElementById('depositAmount')?.value) || toStr(payloadOpt?.depositAmount);
        return (Array.isArray(items) ? items : []).map((it) => {
            const key = toStr(it.key);
            const next = { ...it };
            if (key === 'deposit_receipt') {
                if (depReceiptRef) next.receiptRef = depReceiptRef;
                if (depAmount) next.amount = depAmount;
            } else if (key.startsWith('pay_chq_')) {
                const row = sched[key];
                if (row) {
                    next.monthIndex = row.monthIndex || 0;
                    next.checkNo = toStr(row.checkNo);
                    next.amount = toStr(row.amount);
                }
            } else if (key.startsWith('vat_chq_')) {
                const row = vatSched[key];
                if (row) {
                    next.chequeIndex = row.chequeIndex || 0;
                    next.checkNo = toStr(row.checkNo);
                    next.amount = toStr(row.amount);
                }
            }
            return next;
        });
    }

    function buildContractAttachmentMetaLine(it) {
        const parts = [];
        const monthNo = it.monthIndex || it.chequeIndex;
        if (monthNo) {
            parts.push(t(`الشهر / Month: ${monthNo}`, `Month: ${monthNo} / الشهر`));
        }
        if (toStr(it.checkNo)) {
            parts.push(
                t(`رقم الشيك / Cheque no.: ${it.checkNo}`, `Cheque no.: ${it.checkNo} / رقم الشيك`)
            );
        }
        if (toStr(it.amount)) {
            parts.push(t(`المبلغ / Amount: ${it.amount} ر.ع`, `Amount: ${it.amount} OMR / المبلغ`));
        }
        if (toStr(it.receiptRef)) {
            parts.push(
                t(`رقم الإيصال / Receipt no.: ${it.receiptRef}`, `Receipt no.: ${it.receiptRef} / رقم الإيصال`)
            );
        }
        return parts.join(' · ');
    }

    function buildContractAttachmentPreviewCardHtml(it, thumbUrl) {
        const label = escHtml(toStr(it.label));
        const name = escHtml(toStr(it.name) || '—');
        const key = escHtml(toStr(it.key));
        const meta = buildContractAttachmentMetaLine(it);
        const metaHtml = meta ? `<div class="contract-doc-preview-meta">${escHtml(meta)}</div>` : '';
        const url = toStr(thumbUrl || it.dataUrl);
        const isImg = url && isImageAttachmentDataUrl(url, it.type, it.name);
        const hasPreview = contractAttachmentItemPresent(it);
        let previewBlock = '';
        if (hasPreview) {
            if (isImg) {
                previewBlock = `<button type="button" class="contract-doc-preview-thumb-btn" data-preview-key="${key}" onclick="openContractAttachmentPreviewFromStoreKey(this.getAttribute('data-preview-key'))" title="${escHtml(t('تكبير للمعاينة / Zoom preview', 'Zoom preview / تكبير'))}"><img src="${escHtml(url)}" alt="${label}" class="contract-doc-preview-thumb"></button>`;
            } else {
                const pdf = url && isPdfAttachmentDataUrl(url, it.type, it.name);
                const icon = pdf ? '📄' : '📎';
                const openLabel = pdf ? 'PDF' : t('ملف / File', 'File / ملف');
                previewBlock = `<button type="button" class="contract-doc-preview-icon-btn" data-preview-key="${key}" onclick="openContractAttachmentPreviewFromStoreKey(this.getAttribute('data-preview-key'))" title="${escHtml(t('فتح المرفق / Open attachment', 'Open attachment / فتح'))}"><span class="contract-doc-preview-icon" aria-hidden="true">${icon}</span><span class="contract-doc-preview-icon-lbl">${escHtml(openLabel)}</span></button>`;
            }
        }
        return `<div class="contract-doc-preview-card">${previewBlock}<div class="contract-doc-preview-label">${label}</div>${metaHtml}<div class="contract-doc-preview-name">${name}</div></div>`;
    }

    function rebuildContractDocPreviewCache() {
        _contractDocPreviewCache = collectContractAttachmentPreviewItems();
        return _contractDocPreviewCache;
    }

    function collectContractAttachmentPreviewItems() {
        try {
            syncContractPrintAttachmentsToStore();
        } catch (_eSyncPv) {}
        const items = [];
        const seen = new Set();
        const pushItem = (entry) => {
            if (!contractAttachmentItemPresent(entry)) return;
            const url = pickEmbeddedDataUrl(entry, entry.dataUrl, entry.checkAttachmentDataUrl, entry.attachmentDataUrl);
            const rel =
                toStr(entry.relativePath).trim() ||
                toStr(entry.checkAttachmentRelativePath).trim() ||
                toStr(entry.attachmentRelativePath).trim();
            const tokens = printAttachmentDedupeTokens({
                ...entry,
                dataUrl: url,
                relativePath: rel
            });
            if (!tokens.length || tokens.some((tok) => seen.has(tok))) return;
            tokens.forEach((tok) => seen.add(tok));
            const canonKey = canonicalPrintAttachmentKey(entry.key);
            items.push({
                ...entry,
                key: canonKey || toStr(entry.key),
                dataUrl: url || toStr(entry.dataUrl),
                relativePath: rel || toStr(entry.relativePath)
            });
        };
        const store = getMandatoryDocStoreObject();
        const slotKeys = new Set();
        getContractMandatoryDocSlots().forEach((sl) => {
            slotKeys.add(sl.key);
            const att = store[sl.key] || {};
            pushItem({
                key: sl.key,
                label: sl.label,
                name: toStr(att.name),
                type: toStr(att.type),
                dataUrl: pickEmbeddedDataUrl(att, att?.dataUrl),
                relativePath: toStr(att.relativePath),
                fileId: toStr(att.fileId),
                storedOnDisk: !!att.storedOnDisk
            });
        });
        getContractPrintAttachmentSlotMeta().forEach((sl) => {
            if (slotKeys.has(sl.key)) return;
            const att = store[sl.key] || {};
            pushItem({
                key: sl.key,
                label: sl.label,
                name: toStr(att.name),
                type: toStr(att.type),
                dataUrl: pickEmbeddedDataUrl(att, att?.dataUrl),
                relativePath: toStr(att.relativePath),
                fileId: toStr(att.fileId),
                storedOnDisk: !!att.storedOnDisk
            });
        });
        try {
            const depRef = bhdFileRefFromDataset(document.getElementById('depositAttachmentRow'));
            if (contractAttachmentPresent(depRef)) {
                pushItem({
                    key: 'deposit_receipt',
                    label: t('إيصال التأمين / Deposit receipt', 'Deposit receipt / إيصال التأمين'),
                    name: toStr(depRef.name),
                    type: toStr(depRef.type),
                    dataUrl: pickEmbeddedDataUrl(depRef, depRef.dataUrl),
                    relativePath: toStr(depRef.relativePath),
                    fileId: toStr(depRef.fileId),
                    storedOnDisk: !!depRef.storedOnDisk
                });
            }
        } catch (_eDepPv) {}
        try {
            getPaymentScheduleFromUi().forEach((r) => {
                const ref = normalizeContractAttachmentRef(r);
                if (!contractAttachmentPresent(ref)) return;
                const m = r.monthIndex || 0;
                const chk = toStr(r.checkNo).trim();
                pushItem({
                    key: `pay_chq_${m}`,
                    label:
                        t(`شيك إيجار — شهر ${m}`, `Rent cheque — month ${m}`) +
                        (chk ? ` (${chk})` : ''),
                    name: toStr(ref.name),
                    type: toStr(ref.type),
                    dataUrl: pickEmbeddedDataUrl(ref, ref.dataUrl),
                    relativePath: toStr(ref.relativePath),
                    fileId: toStr(ref.fileId),
                    storedOnDisk: !!ref.storedOnDisk,
                    monthIndex: m,
                    checkNo: chk,
                    amount: toStr(r.amount)
                });
            });
        } catch (_ePayPv) {}
        try {
            getVatChequeScheduleFromUi().forEach((r) => {
                const ref = normalizeContractAttachmentRef(r);
                if (!contractAttachmentPresent(ref)) return;
                const idx = r.chequeIndex || 0;
                const chk = toStr(r.checkNo).trim();
                pushItem({
                    key: `vat_chq_${idx}`,
                    label: t(`شيك ضريبة — ${idx}`, `VAT cheque — ${idx}`) + (chk ? ` (${chk})` : ''),
                    name: toStr(ref.name),
                    type: toStr(ref.type),
                    dataUrl: pickEmbeddedDataUrl(ref, ref.dataUrl),
                    relativePath: toStr(ref.relativePath),
                    fileId: toStr(ref.fileId),
                    storedOnDisk: !!ref.storedOnDisk,
                    chequeIndex: idx,
                    checkNo: chk,
                    amount: toStr(r.amount)
                });
            });
        } catch (_eVatPv) {}
        getOtherDocStoreArray().forEach((doc) => {
            const docUrl = pickEmbeddedDataUrl(doc, doc?.dataUrl);
            if (!docUrl && !doc.relativePath) return;
            const ar = toStr(doc.titleAr);
            const en = toStr(doc.titleEn);
            const label =
                ar && en ? `${ar} / ${en}` : ar || en || toStr(doc.name) || t('مستند إضافي', 'Extra document');
            pushItem({
                key: `other_${toStr(doc.id)}`,
                label,
                name: toStr(doc.name),
                type: toStr(doc.type),
                dataUrl: docUrl,
                relativePath: toStr(doc.relativePath),
                fileId: toStr(doc.fileId),
                storedOnDisk: !!doc.storedOnDisk
            });
        });
        return enrichContractAttachmentPreviewMeta(items);
    }

    async function refreshLedgerAttachmentPreviewButtons() {
        try {
            syncContractPrintAttachmentsToStore();
        } catch (_eSyncLd) {}
        const depRow = document.getElementById('depositAttachmentRow');
        if (depRow) {
            const depRef = bhdFileRefFromDataset(depRow);
            const depBtn = depRow.querySelector('[data-deposit-preview-btn]');
            const depThumb = depRow.querySelector('[data-deposit-preview-thumb]');
            const depName = depRow.querySelector('[data-deposit-att-name]');
            const has = contractAttachmentPresent(depRef);
            if (depName) {
                depName.style.cursor = has ? 'pointer' : 'default';
                if (has) depName.onclick = () => openContractAttachmentPreviewFromStoreKey('deposit_receipt');
                else depName.onclick = null;
            }
            if (!has) {
                if (depBtn) depBtn.style.display = 'none';
                if (depThumb) depThumb.style.display = 'none';
            } else {
                let url = '';
                try {
                    url = await bhdResolveAttachmentUrl(depRef);
                } catch (_eDepUrl) {}
                if (depThumb && url && isImageAttachmentDataUrl(url, depRef.type, depRef.name)) {
                    depThumb.src = url;
                    depThumb.style.display = '';
                    if (depBtn) depBtn.style.display = 'none';
                } else {
                    if (depThumb) depThumb.style.display = 'none';
                    if (depBtn) depBtn.style.display = '';
                }
            }
        }
        const refreshSchedRow = async (tr, key) => {
            if (!tr) return;
            const ref = normalizeContractAttachmentRef({
                name: tr.dataset.attachmentName,
                dataUrl: tr.dataset.attachmentDataUrl,
                relativePath: tr.dataset.attachmentRelativePath,
                fileId: tr.dataset.attachmentFileId,
                storedOnDisk: tr.dataset.storedOnDisk === '1'
            });
            const btn = tr.querySelector('[data-sched-preview-btn]');
            const thumb = tr.querySelector('[data-sched-preview-thumb]');
            const has = contractAttachmentPresent(ref);
            if (!has) {
                if (btn) btn.style.display = 'none';
                if (thumb) thumb.style.display = 'none';
                return;
            }
            let url = '';
            try {
                url = await bhdResolveAttachmentUrl(ref);
            } catch (_eSchUrl) {}
            if (thumb && url && isImageAttachmentDataUrl(url, ref.type, ref.name)) {
                thumb.src = url;
                thumb.style.display = '';
                if (btn) btn.style.display = 'none';
            } else {
                if (thumb) thumb.style.display = 'none';
                if (btn) btn.style.display = '';
            }
        };
        document.querySelectorAll('#paymentScheduleTableWrap tr[data-schedule-month]').forEach((tr) => {
            const m = parseInt(tr.getAttribute('data-schedule-month'), 10) || 0;
            refreshSchedRow(tr, `pay_chq_${m}`);
        });
        document.querySelectorAll('#vatChequeScheduleTableWrap tr[data-vat-cheque-index]').forEach((tr) => {
            const idx = parseInt(tr.getAttribute('data-vat-cheque-index'), 10) || 0;
            refreshSchedRow(tr, `vat_chq_${idx}`);
        });
    }

    async function refreshContractDocumentAttachmentsSection() {
        try {
            syncContractPrintAttachmentsToStore();
        } catch (_eSyncDoc) {}
        let items = collectContractAttachmentPreviewItems();
        const hydrated = [];
        for (const it of items) {
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
        _contractDocPreviewCache = hydrated;
        const block = document.querySelector('#currentDocument #contractDocAttachmentsBlock');
        const mount = document.querySelector('#currentDocument #contractDocAttachmentsMount');
        if (!block || !mount) return;
        if (!hydrated.length) {
            block.style.display = 'none';
            mount.innerHTML = '';
            return;
        }
        block.style.display = '';
        mount.innerHTML = `<div class="contract-doc-preview-grid">${hydrated
            .map((it) => buildContractAttachmentPreviewCardHtml(it, it.dataUrl))
            .join('')}</div>`;
    }

    function pickEmbeddedDataUrl() {
        for (let i = 0; i < arguments.length; i += 1) {
            const v = arguments[i];
            if (v == null) continue;
            if (typeof v === 'string') {
                const s = toStr(v).trim();
                if (!s) continue;
                if (/^data:/i.test(s)) return s;
                if (s.length > 180 && /base64/i.test(s.slice(0, 80))) return s;
                const cached = bhdGetCachedDiskDataUrl(s);
                if (cached) return cached;
                continue;
            }
            if (typeof v === 'object') {
                const relCached = bhdGetCachedDiskDataUrl(v.relativePath);
                if (relCached) return relCached;
                const nested = pickEmbeddedDataUrl(
                    v.dataUrl,
                    v.attachmentDataUrl,
                    v.checkAttachmentDataUrl,
                    v.url,
                    v.blob
                );
                if (nested) return nested;
            }
        }
        return '';
    }

    function listContractPayloadSourcesForUnit(unit) {
        const out = [];
        const seen = new Set();
        const add = (p) => {
            if (!p || typeof p !== 'object') return;
            const key = `${toStr(p.buildingNo)}|${normalizeUnit(p.flatNo)}|${toStr(p.agreementNo)}|${toStr(p.contractSavedAt)}`;
            if (seen.has(key)) return;
            seen.add(key);
            out.push(p);
        };
        if (unit) {
            add(getSavedContractPayloadForUnit(unit));
            const draft = getTenancyDraftPayloadForUnit(unit);
            if (draft) add(draft);
        }
        try {
            const raw = localStorage.getItem('bhd_contract_full');
            const full = raw ? JSON.parse(raw) : null;
            if (full && unit) {
                const same =
                    toStr(full.buildingNo) === toStr(unit.building) &&
                    normalizeUnit(full.flatNo) === normalizeUnit(unit.unit);
                if (same) add(full);
            } else if (full && !unit) {
                add(full);
            }
        } catch (_eFull) {}
        try {
            const dom = collectStorableContractFullFromDom();
            if (isMeaningfulContractPayload(dom)) add(dom);
        } catch (_eDom) {}
        return out;
    }

    function mergeMandatoryDocStoresFromPayloads(payloads) {
        const out = {};
        (Array.isArray(payloads) ? payloads : []).forEach((p) => {
            try {
                const o = JSON.parse(toStr(p?.contractMandatoryDocsJson) || '{}');
                if (!o || typeof o !== 'object' || Array.isArray(o)) return;
                Object.keys(o).forEach((k) => {
                    const att = o[k];
                    const url = pickEmbeddedDataUrl(att, att?.dataUrl);
                    const rel = toStr(att?.relativePath);
                    if (!url && !rel) return;
                    const prev = out[k];
                    const prevUrl = pickEmbeddedDataUrl(prev, prev?.dataUrl);
                    const prevRel = toStr(prev?.relativePath);
                    if (!prev || (!prevUrl && !prevRel) || (url && url.length >= prevUrl.length)) {
                        out[k] = {
                            ...(prev && typeof prev === 'object' ? prev : {}),
                            ...(att && typeof att === 'object' ? att : {}),
                            dataUrl: url || toStr(prev?.dataUrl)
                        };
                    }
                });
            } catch (_eM) {}
        });
        return out;
    }

    function mergeOtherDocsFromPayloads(payloads) {
        const map = new Map();
        (Array.isArray(payloads) ? payloads : []).forEach((p) => {
            parsePayloadJsonArrayField(p, 'contractOtherDocsJson', 'contractOtherDocs').forEach((doc) => {
                const url = pickEmbeddedDataUrl(doc, doc?.dataUrl);
                const rel = toStr(doc?.relativePath);
                if (!url && !rel) return;
                const id = toStr(doc.id) || `doc_${url ? url.slice(0, 48) : rel}`;
                const prev = map.get(id);
                const prevUrl = pickEmbeddedDataUrl(prev, prev?.dataUrl);
                const prevRel = toStr(prev?.relativePath);
                if (!prev || (!prevUrl && !prevRel) || (url && url.length >= prevUrl.length)) {
                    map.set(id, { ...doc, dataUrl: url || toStr(prev?.dataUrl) });
                }
            });
        });
        return [...map.values()];
    }

    function mergePaymentScheduleFromPayloads(payloads) {
        const map = new Map();
        (Array.isArray(payloads) ? payloads : []).forEach((p) => {
            parsePayloadJsonArrayField(p, 'paymentScheduleJson', 'paymentSchedule').forEach((r) => {
                const m = r.monthIndex || 0;
                const url = pickEmbeddedDataUrl(r.checkAttachmentDataUrl, r.attachmentDataUrl, r.dataUrl);
                const prev = map.get(m) || { monthIndex: m };
                const prevUrl = pickEmbeddedDataUrl(prev.checkAttachmentDataUrl, prev.attachmentDataUrl, prev.dataUrl);
                const rel = toStr(r.checkAttachmentRelativePath || r.attachmentRelativePath);
                const prevRel = toStr(prev.checkAttachmentRelativePath || prev.attachmentRelativePath);
                map.set(m, {
                    ...prev,
                    ...r,
                    monthIndex: m,
                    checkAttachmentDataUrl: url || prevUrl,
                    checkAttachmentName: toStr(r.checkAttachmentName) || toStr(prev.checkAttachmentName),
                    checkAttachmentRelativePath: rel || prevRel,
                    checkAttachmentFileId:
                        toStr(r.checkAttachmentFileId || r.attachmentFileId) ||
                        toStr(prev.checkAttachmentFileId || prev.attachmentFileId),
                    storedOnDisk: !!(r.storedOnDisk || rel || prev.storedOnDisk || prevRel),
                    checkNo: toStr(r.checkNo) || toStr(prev.checkNo)
                });
            });
        });
        return [...map.values()].sort((a, b) => (a.monthIndex || 0) - (b.monthIndex || 0));
    }

    function mergeVatChequeScheduleFromPayloads(payloads) {
        const map = new Map();
        (Array.isArray(payloads) ? payloads : []).forEach((p) => {
            parsePayloadJsonArrayField(p, 'vatChequeScheduleJson', 'vatChequeSchedule').forEach((r) => {
                const idx = r.chequeIndex || 0;
                const url = pickEmbeddedDataUrl(r.checkAttachmentDataUrl, r.attachmentDataUrl, r.dataUrl);
                const prev = map.get(idx) || { chequeIndex: idx };
                const prevUrl = pickEmbeddedDataUrl(prev.checkAttachmentDataUrl, prev.attachmentDataUrl, prev.dataUrl);
                const rel = toStr(r.checkAttachmentRelativePath || r.attachmentRelativePath);
                const prevRel = toStr(prev.checkAttachmentRelativePath || prev.attachmentRelativePath);
                map.set(idx, {
                    ...prev,
                    ...r,
                    chequeIndex: idx,
                    checkAttachmentDataUrl: url || prevUrl,
                    checkAttachmentName: toStr(r.checkAttachmentName) || toStr(prev.checkAttachmentName),
                    checkAttachmentRelativePath: rel || prevRel,
                    checkAttachmentFileId:
                        toStr(r.checkAttachmentFileId || r.attachmentFileId) ||
                        toStr(prev.checkAttachmentFileId || prev.attachmentFileId),
                    storedOnDisk: !!(r.storedOnDisk || rel || prev.storedOnDisk || prevRel),
                    checkNo: toStr(r.checkNo) || toStr(prev.checkNo)
                });
            });
        });
        return [...map.values()].sort((a, b) => (a.chequeIndex || 0) - (b.chequeIndex || 0));
    }

    function mergeInsuranceDepositItemsFromPayloads(payloads) {
        const map = new Map();
        (Array.isArray(payloads) ? payloads : []).forEach((p) => {
            parsePayloadJsonArrayField(p, 'insuranceDepositItemsJson', 'insuranceDepositItems').forEach((it) => {
                const url = pickEmbeddedDataUrl(it.attachmentDataUrl, it.dataUrl);
                if (!url && !toStr(it.reference).trim()) return;
                const id = toStr(it.id) || `ins_${map.size + 1}`;
                const prev = map.get(id) || { id };
                const prevUrl = pickEmbeddedDataUrl(prev.attachmentDataUrl, prev.dataUrl);
                map.set(id, {
                    ...prev,
                    ...it,
                    id,
                    attachmentDataUrl: url || prevUrl,
                    attachmentName: toStr(it.attachmentName) || toStr(prev.attachmentName)
                });
            });
        });
        return [...map.values()];
    }

    function buildMergedContractAttachmentPayload(sources) {
        const list = (Array.isArray(sources) ? sources : []).filter((p) => p && typeof p === 'object');
        if (!list.length) return null;
        const base = { ...list[list.length - 1] };
        const depUrl = pickEmbeddedDataUrl(...list.map((p) => p.depositAttachmentDataUrl));
        base.depositAttachmentDataUrl = depUrl;
        base.depositAttachmentName =
            list.map((p) => toStr(p.depositAttachmentName)).find((x) => x) || '';
        base.depositAttachmentRelativePath =
            list.map((p) => toStr(p.depositAttachmentRelativePath)).find((x) => x) || '';
        base.depositAttachmentFileId =
            list.map((p) => toStr(p.depositAttachmentFileId)).find((x) => x) || '';
        base.depositStoredOnDisk = list.some(
            (p) => !!p.depositStoredOnDisk || !!toStr(p.depositAttachmentRelativePath).trim()
        );
        const mand = mergeMandatoryDocStoresFromPayloads(list);
        base.contractMandatoryDocsJson = JSON.stringify(mand);
        const other = mergeOtherDocsFromPayloads(list);
        base.contractOtherDocsJson = JSON.stringify(other);
        const pay = mergePaymentScheduleFromPayloads(list);
        base.paymentSchedule = pay;
        base.paymentScheduleJson = JSON.stringify(pay);
        const vat = mergeVatChequeScheduleFromPayloads(list);
        base.vatChequeSchedule = vat;
        base.vatChequeScheduleJson = JSON.stringify(vat);
        const ins = mergeInsuranceDepositItemsFromPayloads(list);
        base.insuranceDepositItems = ins;
        base.insuranceDepositItemsJson = JSON.stringify(ins);
        return base;
    }

    function findAddressBookEntryForUnit(unit) {
        if (!unit) return null;
        const b = toStr(unit.building);
        const u = normalizeUnit(unit.unit);
        const tenant = toStr(unit.tenant);
        const mobile = toStr(unit.mobile || unit.contactNo);
        const civil = toStr(unit.civilCard);
        const pool = (addressBookEntries || []).filter(
            (e) => toStr(e.type) === 'tenant' || toStr(e.type) === 'company'
        );
        const byLoc = pool.find((e) => toStr(e.building) === b && normalizeUnit(e.unit) === u);
        if (byLoc) return byLoc;
        if (!tenant) return null;
        let matches = pool.filter((e) => toStr(e.name) === tenant || toStr(e.nameEn) === tenant);
        if (civil) {
            const withCivil = matches.filter(
                (e) => toStr(e.idNo) === civil || toStr(e.commercialRegNo) === civil
            );
            if (withCivil.length) matches = withCivil;
        }
        if (mobile) {
            const withMob = matches.find(
                (e) => toStr(e.mobile) === mobile || toStr(e.extraMobile) === mobile
            );
            if (withMob) return withMob;
        }
        return matches.length ? matches[0] : null;
    }

    function collectAddressBookPrintableAttachments(unit, payload) {
        const items = [];
        const entry = findAddressBookEntryForUnit(unit);
        if (!entry) return items;
        const store = getMandatoryDocStoreObject();
        const slotKeys = new Set();
        try {
            const o = JSON.parse(toStr(payload?.contractMandatoryDocsJson) || '{}');
            if (o && typeof o === 'object' && !Array.isArray(o)) Object.keys(o).forEach((k) => slotKeys.add(k));
        } catch (_eK) {}
        if (toStr(entry.type) === 'company') {
            slotKeys.add('tenant_company_cr');
            normalizeCompanySignatories(entry).forEach((s, idx) => {
                if (toStr(s.signatoryIdNo).trim()) {
                    slotKeys.add(`co_sig_${slugifyCivilForDocKey(s.signatoryIdNo)}_id`);
                }
                const nat = toStr(s.signatoryNationality) || 'عماني / Omani';
                if (!isOmaniNationality(nat)) {
                    slotKeys.add(`co_sig_${slugifyCivilForDocKey(s.signatoryIdNo)}_passport`);
                }
                slotKeys.add(`co_sig_row_${idx}_id`);
                if (!isOmaniNationality(nat)) slotKeys.add(`co_sig_row_${idx}_passport`);
            });
        } else {
            slotKeys.add('tenant_person_id');
            slotKeys.add('tenant_person_passport');
        }
        slotKeys.forEach((key) => {
            if (contractAttachmentPresent(store[key])) return;
            const ab = lookupMandatoryAttachmentFromAddressBook(key, entry);
            const url = pickEmbeddedDataUrl(ab, ab?.dataUrl);
            const rel = toStr(ab?.relativePath);
            if (!url && !rel) return;
            items.push({
                key,
                label: mandatoryDocKeyFallbackLabel(key),
                name: toStr(ab?.name),
                type: toStr(ab?.type),
                dataUrl: url,
                relativePath: rel,
                storedOnDisk: !!ab?.storedOnDisk
            });
        });
        return items;
    }

    function mandatoryDocKeyFallbackLabel(key) {
        const k = toStr(key);
        const map = {
            tenant_person_id: t('بطاقة المستأجر / Tenant ID card', 'Tenant ID card / بطاقة المستأجر'),
            tenant_person_passport: t('جواز المستأجر / Tenant passport', 'Tenant passport / جواز المستأجر'),
            tenant_company_cr: t('السجل التجاري / Commercial registration', 'Commercial registration / السجل التجاري')
        };
        if (map[k]) return map[k];
        if (/^co_sig_.+_id$/.test(k) || /^co_sig_row_\d+_id$/.test(k)) {
            return t('بطاقة مفوض / Signatory ID', 'Signatory ID / بطاقة مفوض');
        }
        if (/^co_sig_.+_passport$/.test(k) || /^co_sig_row_\d+_passport$/.test(k)) {
            return t('جواز مفوض / Signatory passport', 'Signatory passport / جواز مفوض');
        }
        return k;
    }

    /** مرفقات العقد من الحمولة المحفوظة (المصدر الأساسي للطباعة) / Contract attachments from saved payload */
    function collectAllContractPrintableAttachmentsFromPayload(payload) {
        if (!payload || typeof payload !== 'object') return [];
        const items = [];
        const seen = new Set();
        const pushUnique = (entry) => {
            const url = toStr(entry.dataUrl).trim();
            const rel = toStr(entry.relativePath).trim();
            const dedupe = url || rel;
            if (!dedupe || seen.has(dedupe)) return;
            seen.add(dedupe);
            items.push(entry);
        };
        const depUrl = pickEmbeddedDataUrl(payload.depositAttachmentDataUrl);
        const depRel = toStr(payload.depositAttachmentRelativePath);
        if (depUrl || depRel) {
            pushUnique({
                key: 'deposit_receipt',
                label: t('إيصال التأمين / Deposit receipt', 'Deposit receipt / إيصال التأمين'),
                name: toStr(payload.depositAttachmentName),
                type: '',
                dataUrl: depUrl,
                relativePath: depRel,
                storedOnDisk: !!payload.depositStoredOnDisk
            });
        }
        try {
            const mand = JSON.parse(toStr(payload.contractMandatoryDocsJson) || '{}');
            if (mand && typeof mand === 'object' && !Array.isArray(mand)) {
                Object.keys(mand).forEach((key) => {
                    const att = mand[key];
                    const url = pickEmbeddedDataUrl(att, att?.dataUrl);
                    if (!url && !att?.relativePath) return;
                    pushUnique({
                        key,
                        label: mandatoryDocKeyFallbackLabel(key),
                        name: toStr(att?.name),
                        type: toStr(att?.type),
                        dataUrl: url,
                        relativePath: toStr(att?.relativePath),
                        storedOnDisk: !!att?.storedOnDisk
                    });
                });
            }
        } catch (_eMand) {}
        parsePayloadJsonArrayField(payload, 'contractOtherDocsJson', 'contractOtherDocs').forEach((doc) => {
            const docUrl = pickEmbeddedDataUrl(doc, doc?.dataUrl);
            if (!docUrl && !doc.relativePath) return;
            const ar = toStr(doc.titleAr);
            const en = toStr(doc.titleEn);
            const label =
                ar && en ? `${ar} / ${en}` : ar || en || toStr(doc.name) || t('مستند إضافي', 'Extra document');
            pushUnique({
                key: `other_${toStr(doc.id)}`,
                label,
                name: toStr(doc.name),
                type: toStr(doc.type),
                dataUrl: docUrl,
                relativePath: toStr(doc.relativePath),
                storedOnDisk: !!doc.storedOnDisk
            });
        });
        parsePayloadJsonArrayField(payload, 'paymentScheduleJson', 'paymentSchedule').forEach((r) => {
            const url = pickEmbeddedDataUrl(r.checkAttachmentDataUrl, r.attachmentDataUrl, r.dataUrl);
            const rel = toStr(r.checkAttachmentRelativePath || r.attachmentRelativePath);
            if (!url && !rel) return;
            const chk = toStr(r.checkNo).trim();
            const m = r.monthIndex || 0;
            pushUnique({
                key: `pay_chq_${m}`,
                label: t(`شيك إيجار — شهر ${m}`, `Rent cheque — month ${m}`) + (chk ? ` (${chk})` : ''),
                name: toStr(r.checkAttachmentName || r.attachmentName),
                type: '',
                dataUrl: url,
                relativePath: rel,
                storedOnDisk: !!(r.storedOnDisk || rel),
                monthIndex: m,
                checkNo: chk,
                amount: toStr(r.amount)
            });
        });
        parsePayloadJsonArrayField(payload, 'vatChequeScheduleJson', 'vatChequeSchedule').forEach((r) => {
            const url = pickEmbeddedDataUrl(r.checkAttachmentDataUrl, r.attachmentDataUrl, r.dataUrl);
            const rel = toStr(r.checkAttachmentRelativePath || r.attachmentRelativePath);
            if (!url && !rel) return;
            const chk = toStr(r.checkNo).trim();
            const idx = r.chequeIndex || 0;
            pushUnique({
                key: `vat_chq_${idx}`,
                label: t(`شيك ضريبة — ${idx}`, `VAT cheque — ${idx}`) + (chk ? ` (${chk})` : ''),
                name: toStr(r.checkAttachmentName || r.attachmentName),
                type: '',
                dataUrl: url,
                relativePath: rel,
                storedOnDisk: !!(r.storedOnDisk || rel),
                chequeIndex: idx,
                checkNo: chk,
                amount: toStr(r.amount)
            });
        });
        parsePayloadJsonArrayField(payload, 'insuranceDepositItemsJson', 'insuranceDepositItems').forEach((it) => {
            const url = pickEmbeddedDataUrl(it.attachmentDataUrl, it.dataUrl);
            const insRel = toStr(it.attachmentRelativePath);
            if (!url && !insRel) return;
            const ref = toStr(it.reference).trim();
            const payType = toStr(it.payType);
            const typeLabel =
                payType === 'cheque'
                    ? t('شيك تأمين', 'Insurance cheque')
                    : payType === 'cheque_group'
                      ? t('مجموعة شيكات تأمين', 'Insurance cheque batch')
                      : t('مستند تأمين', 'Insurance document');
            pushUnique({
                key: `ins_${toStr(it.id)}`,
                label: typeLabel + (ref ? ` (${ref})` : ''),
                name: toStr(it.attachmentName),
                type: '',
                dataUrl: url,
                relativePath: toStr(it.attachmentRelativePath),
                storedOnDisk: !!it.storedOnDisk
            });
        });
        return items;
    }

    /** مرفقات العقد من واجهة النموذج (احتياطي) / Contract attachments from live form DOM */
    function collectAllContractPrintableAttachmentsFromDom() {
        const items = [...collectContractAttachmentPreviewItems()];
        const seen = new Set(
            items.map((x) => toStr(x.dataUrl).trim() || toStr(x.relativePath).trim()).filter(Boolean)
        );
        const pushUnique = (entry) => {
            const url = toStr(entry.dataUrl).trim();
            const rel = toStr(entry.relativePath).trim();
            const dedupe = url || rel;
            if (!dedupe || seen.has(dedupe)) return;
            seen.add(dedupe);
            items.push(entry);
        };
        try {
            const depRef = bhdFileRefFromDataset(document.getElementById('depositAttachmentRow'));
            if (addressBookAttachmentPresent(depRef)) {
                pushUnique({
                    key: 'deposit_receipt',
                    label: t('إيصال التأمين / Deposit receipt', 'Deposit receipt / إيصال التأمين'),
                    name: toStr(depRef.name),
                    type: toStr(depRef.type),
                    dataUrl: pickEmbeddedDataUrl(depRef, depRef.dataUrl),
                    relativePath: toStr(depRef.relativePath),
                    storedOnDisk: !!depRef.storedOnDisk
                });
            }
        } catch (_eDep) {}
        try {
            getPaymentScheduleFromUi().forEach((r) => {
                const url = pickEmbeddedDataUrl(r.checkAttachmentDataUrl, r.attachmentDataUrl, r.dataUrl);
                const rel = toStr(r.checkAttachmentRelativePath);
                if (!url && !rel) return;
                const chk = toStr(r.checkNo).trim();
                const m = r.monthIndex || 0;
                pushUnique({
                    key: `pay_chq_${m}`,
                    label:
                        t(`شيك إيجار — شهر ${m}`, `Rent cheque — month ${m}`) +
                        (chk ? ` (${chk})` : ''),
                    name: toStr(r.checkAttachmentName),
                    type: '',
                    dataUrl: url,
                    relativePath: rel,
                    storedOnDisk: !!r.storedOnDisk
                });
            });
        } catch (_ePay) {}
        try {
            getVatChequeScheduleFromUi().forEach((r) => {
                const url = pickEmbeddedDataUrl(r.checkAttachmentDataUrl, r.attachmentDataUrl, r.dataUrl);
                const rel = toStr(r.checkAttachmentRelativePath);
                if (!url && !rel) return;
                const chk = toStr(r.checkNo).trim();
                const idx = r.chequeIndex || 0;
                pushUnique({
                    key: `vat_chq_${idx}`,
                    label:
                        t(`شيك ضريبة — ${idx}`, `VAT cheque — ${idx}`) + (chk ? ` (${chk})` : ''),
                    name: toStr(r.checkAttachmentName),
                    type: '',
                    dataUrl: url,
                    relativePath: rel,
                    storedOnDisk: !!r.storedOnDisk
                });
            });
        } catch (_eVat) {}
        try {
            getInsuranceDepositItemsFromUi().forEach((it) => {
                const url = pickEmbeddedDataUrl(it.attachmentDataUrl, it.dataUrl);
                const rel = toStr(it.attachmentRelativePath);
                if (!url && !rel) return;
                const ref = toStr(it.reference).trim();
                const payType = toStr(it.payType);
                const typeLabel =
                    payType === 'cheque'
                        ? t('شيك تأمين', 'Insurance cheque')
                        : payType === 'cheque_group'
                          ? t('مجموعة شيكات تأمين', 'Insurance cheque batch')
                          : t('مستند تأمين', 'Insurance document');
                pushUnique({
                    key: `ins_${toStr(it.id)}`,
                    label: typeLabel + (ref ? ` (${ref})` : ''),
                    name: toStr(it.attachmentName),
                    type: '',
                    dataUrl: url,
                    relativePath: rel,
                    storedOnDisk: !!it.storedOnDisk
                });
            });
        } catch (_eIns) {}
        return items;
    }

    async function resolveContractAttachmentsForUnit(unit, opt = {}) {
        const includeDom = opt.includeDom !== false;
        const syncStores = opt.syncStores === true;
        if (!unit) return [];
        const sources = listContractPayloadSourcesForUnit(unit);
        const merged = buildMergedContractAttachmentPayload(sources);
        if (syncStores) {
            try {
                if (merged) syncContractPrintAttachmentsFromPayload(merged);
            } catch (_eUdSync) {}
            try {
                syncContractPrintAttachmentsToStore();
            } catch (_eUdDom) {}
        }
        const fromDom = includeDom ? collectAllContractPrintableAttachmentsFromDom() : [];
        const fromAb = collectAddressBookPrintableAttachments(unit, merged || sources[0]);
        let diskItems = [];
        try {
            diskItems = await collectContractAttachmentsFromDiskDirect({
                buildingNo: unit.building,
                flatNo: unit.unit
            });
        } catch (_eUdDisk) {}
        const fromPayload = merged ? collectAllContractPrintableAttachmentsFromPayload(merged) : [];
        let items = mergeContractPrintableAttachmentLists(fromDom, diskItems, fromPayload, fromAb);
        const printCtx = {
            buildingNo: unit.building,
            flatNo: unit.unit,
            agreementNo: merged?.agreementNo || sources[0]?.agreementNo
        };
        try {
            items = await repairContractPrintAttachmentItemsFromDisk(items, printCtx);
        } catch (_eRepair) {}
        return enrichContractAttachmentPreviewMeta(items, merged || sources[0]);
    }

    async function resolveContractPrintableAttachments() {
        return resolveContractAttachmentsForUnit(selectedUnitDetailsRecord, {
            includeDom: true,
            syncStores: true
        });
    }

    function getContractAttachmentsPrintStylesCss() {
        return `
            .contract-att-print-page { padding: 10mm 0; }
            .contract-att-print-page--break { page-break-before: always; break-before: page; }
            .contract-att-print-head { text-align: center; margin: 0 0 12px; }
            .contract-att-print-head h2 { font-size: 15px; margin: 0 0 4px; font-weight: 700; }
            .contract-att-print-head p { font-size: 11px; color: #555; margin: 0; }
            .contract-att-print-body { text-align: center; }
            .contract-att-print-body img { max-width: 100%; max-height: 92vh; object-fit: contain; display: block; margin: 0 auto; }
            .contract-att-print-body embed,
            .contract-att-print-body object { width: 100%; min-height: 92vh; border: 0; display: block; margin: 0 auto; }
            @media print {
                .contract-att-print-page { page-break-after: always; break-after: page; }
                .contract-att-print-page--break { page-break-before: always; break-before: page; }
                .contract-att-print-body img,
                .contract-att-print-body embed,
                .contract-att-print-body object {
                    -webkit-print-color-adjust: exact; print-color-adjust: exact;
                }
            }`;
    }

    function buildContractAttachmentsPrintPagesHtml(items, unitPrefix, opt = {}) {
        const prefix = toStr(unitPrefix).trim();
        const breakFirst = opt.breakBeforeFirst === true;
        return (Array.isArray(items) ? items : [])
            .filter((it) => toStr(it?.dataUrl).trim())
            .map((it, idx) => {
                const dataUrl = toStr(it.dataUrl);
                const cap = escHtml(prefix ? `${prefix} — ${toStr(it.label)}` : toStr(it.label));
                const name = escHtml(toStr(it.name) || '—');
                const meta = buildContractAttachmentMetaLine(it);
                const metaHtml = meta ? `<p class="contract-att-print-meta">${escHtml(meta)}</p>` : '';
                const isImage = isImageAttachmentDataUrl(dataUrl, it.type, it.name);
                const isPdf = isPdfAttachmentDataUrl(dataUrl, it.type, it.name);
                const breakCls = idx > 0 || breakFirst ? ' contract-att-print-page--break' : '';
                let body = '';
                if (isImage) {
                    body = `<img src="${escHtml(dataUrl)}" alt="${cap}">`;
                } else if (isPdf) {
                    body = `<embed src="${escHtml(dataUrl)}" type="application/pdf" title="${cap}" style="width:100%;min-height:90vh;border:0;background:#fff;display:block;margin:0 auto">
                        <object data="${escHtml(dataUrl)}" type="application/pdf" style="width:100%;min-height:90vh;border:0;background:#fff;display:block;margin:0 auto">
                            <p style="font-size:12px;color:#555">${escHtml(t('تعذّر عرض PDF — استخدم التنزيل / PDF preview unavailable — download', 'PDF preview unavailable — download / تعذّر عرض PDF'))}</p>
                            <a href="${escHtml(dataUrl)}" download="${escHtml(toStr(it.name) || 'document.pdf')}">${escHtml(t('تنزيل PDF / Download PDF', 'Download PDF / تنزيل PDF'))}</a>
                        </object>`;
                } else {
                    body = `<p style="font-size:12px;color:#555">${escHtml(t('لا يمكن عرض هذا النوع — استخدم التنزيل / Preview unavailable — download', 'Preview unavailable — download / لا يمكن العرض'))}</p>
                        <a href="${escHtml(dataUrl)}" download="${escHtml(toStr(it.name) || 'document')}">${escHtml(t('تنزيل / Download', 'Download / تنزيل'))}</a>`;
                }
                return `<section class="contract-att-print-page${breakCls}">
                    <header class="contract-att-print-head"><h2>${cap}</h2>${metaHtml}<p>${name}</p></header>
                    <div class="contract-att-print-body">${body}</div>
                </section>`;
            })
            .join('');
    }

    async function triggerPrintWindowWhenReady(win, baseDelay = 400, printToken) {
        if (!win) return;
        const trigger = async () => {
            if (bhdIsDesktopApp() && window.bhdDesktop?.printChildByToken) {
                try {
                    const r = await window.bhdDesktop.printChildByToken(toStr(printToken));
                    if (r && r.ok) return;
                } catch (_eDeskAuto) {}
                try {
                    const r2 = await window.bhdDesktop.printChildByToken('');
                    if (r2 && r2.ok) return;
                } catch (_eDeskAuto2) {}
            }
            try {
                win.focus();
                win.print();
            } catch (_ePr) {}
        };
        let imgs = [];
        try {
            imgs = win.document ? [...win.document.querySelectorAll('img[src]')] : [];
        } catch (_eImg) {
            imgs = [];
        }
        if (!imgs.length) {
            const embeds = win.document ? win.document.querySelectorAll('embed, object') : [];
            const extraDelay = embeds.length ? Math.max(baseDelay, 1800 + embeds.length * 400) : baseDelay;
            setTimeout(trigger, extraDelay);
            return;
        }
        let pending = imgs.length;
        let fired = false;
        const done = () => {
            pending -= 1;
            if (!fired && pending <= 0) {
                fired = true;
                setTimeout(trigger, 220);
            }
        };
        imgs.forEach((img) => {
            if (img.complete) done();
            else {
                img.addEventListener('load', done, { once: true });
                img.addEventListener('error', done, { once: true });
            }
        });
        setTimeout(() => {
            if (!fired) {
                fired = true;
                trigger();
            }
        }, Math.max(15000, baseDelay + imgs.length * 700));
    }

    function contractPrintableAttachmentsToQueueItems(items, unitPrefix) {
        const prefix = toStr(unitPrefix).trim();
        return (Array.isArray(items) ? items : [])
            .filter((it) => toStr(it?.dataUrl).trim())
            .map((it) => ({
                att: {
                    dataUrl: toStr(it.dataUrl),
                    name: toStr(it.name) || toStr(it.label) || 'attachment',
                    type: toStr(it.type)
                },
                caption: prefix ? `${prefix} — ${toStr(it.label)}` : toStr(it.label)
            }));
    }

    function unitDetailsPrintAttachmentsSelected() {
        return !!document.getElementById('unitDetailsPrintAttachments')?.checked;
    }

    async function queueContractPrintableAttachmentsFromDom(opt = {}) {
        const silent = opt.silent === true;
        const items = await resolveContractPrintableAttachments();
        if (!items.length) {
            if (!silent) {
                alert(
                    t(
                        'لا توجد مرفقات محفوظة لهذا العقد (شيكات، إيصالات، جوازات، أو مستندات).',
                        'No saved attachments for this contract (cheques, receipts, passports, or documents).'
                    )
                );
            }
            return { ok: false, reason: 'no_attachments', count: 0 };
        }
        const unit = selectedUnitDetailsRecord;
        const prefix = unit ? `${toStr(unit.building)}-${toStr(unit.unit)}` : '';
        return await printContractDocumentsByIndices([], {
            attachmentItems: items,
            unitPrefix: prefix,
            suppressAlerts: silent
        });
    }

    function openContractAttachmentPreviewFromStoreKey(key) {
        const cache = rebuildContractDocPreviewCache();
        const idx = cache.findIndex((x) => toStr(x.key) === toStr(key));
        if (idx < 0) return;
        openContractAttachmentPreview(idx);
    }

    function buildContractAttachmentsSectionHtml() {
        return `
            <div class="contract-doc-attachments-block" id="contractDocAttachmentsBlock" style="display:none">
                <div class="section-header">${t('مرفقات ومستندات العقد / Contract documents & attachments', 'Contract documents & attachments / مرفقات ومستندات العقد')}</div>
                <div id="contractDocAttachmentsMount" class="contract-doc-attachments-mount"></div>
            </div>`;
    }

    function showAttachmentPreviewInModal({ label, name, type, dataUrl }) {
        const modal = document.getElementById('contractAttachmentPreviewModal');
        const body = document.getElementById('contractAttachmentPreviewBody');
        const titleEl = document.getElementById('contractAttachmentPreviewTitle');
        if (!modal || !body || !toStr(dataUrl)) return false;
        _contractAttachmentPreviewZoom = 1;
        if (titleEl) titleEl.textContent = toStr(label) || t('معاينة المستند', 'Document preview');
        if (isImageAttachmentDataUrl(dataUrl, type, name)) {
            body.innerHTML = `<div class="contract-preview-zoom-wrap" id="contractPreviewZoomWrap" style="transform:scale(1)"><img src="${escHtml(dataUrl)}" alt="" class="contract-preview-zoom-img"></div>`;
        } else if (isVideoAttachmentDataUrl(dataUrl, type, name)) {
            body.innerHTML = `<video src="${escHtml(dataUrl)}" controls playsinline style="width:min(96vw,1180px);max-height:78vh;border:1px solid #ddd;border-radius:6px;background:#000"></video>`;
        } else if (isPdfAttachmentDataUrl(dataUrl, type, name)) {
            body.innerHTML = `<iframe src="${escHtml(dataUrl)}" title="${escHtml(toStr(label))}" style="width:min(96vw,1180px);height:78vh;border:1px solid #ddd;border-radius:6px;background:#fff"></iframe>`;
        } else {
            body.innerHTML = `<p style="font-size:13px;color:#555">${t('لا يمكن عرض هذا النوع هنا.', 'This file type cannot be previewed here.')}</p>
                <a href="${escHtml(dataUrl)}" download="${escHtml(toStr(name) || 'document')}" class="contract-doc-preview-pdf-link">${t('تنزيل الملف / Download file', 'Download file / تنزيل الملف')}</a>`;
        }
        modal.classList.add('open');
        return true;
    }

    async function openAttachmentPreviewModal(att, labelFallback) {
        if (!att) {
            alert(t('تعذر فتح المرفق.', 'Could not open attachment.'));
            return;
        }
        const norm = finalizeAccountingAttachmentRef(att, labelFallback) || normalizeContractAttachmentRef(att) || att;
        const hasRef =
            contractAttachmentPresent(norm) ||
            toStr(norm.fileId) ||
            toStr(norm.relativePath) ||
            toStr(norm.dataUrl);
        if (!hasRef) {
            alert(t('تعذر فتح المرفق — لا يوجد ملف محفوظ.', 'Could not open attachment — no saved file.'));
            return;
        }
        const dataUrl = await bhdResolveAttachmentUrl(norm);
        if (!toStr(dataUrl)) {
            alert(t('تعذر فتح المعاينة لهذا الملف.', 'Could not open preview for this file.'));
            return;
        }
        const label =
            toStr(norm.label) ||
            toStr(norm.titleAr || norm.titleEn) ||
            toStr(norm.name) ||
            labelFallback ||
            t('معاينة المستند', 'Document preview');
        if (!showAttachmentPreviewInModal({ label, name: toStr(norm.name), type: toStr(norm.type), dataUrl })) {
            const w = window.open('', '_blank');
            if (w) {
                if (isImageAttachmentDataUrl(dataUrl, norm.type, norm.name)) {
                    w.document.write(`<html><head><title>${escHtml(label)}</title></head><body style="margin:0;display:flex;align-items:center;justify-content:center;background:#111"><img src="${escHtml(dataUrl)}" style="max-width:100%;max-height:100vh"></body></html>`);
                } else if (isVideoAttachmentDataUrl(dataUrl, norm.type, norm.name)) {
                    w.document.write(`<html><head><title>${escHtml(label)}</title></head><body style="margin:0;background:#000"><video src="${escHtml(dataUrl)}" controls autoplay style="width:100%;max-height:100vh"></video></body></html>`);
                } else {
                    w.location.href = dataUrl;
                }
                w.document.close();
            } else {
                alert(t('تعذر فتح نافذة المعاينة — اسمح بالنوافذ المنبثقة.', 'Could not open preview — allow pop-ups.'));
            }
        }
    }

    async function downloadAttachmentRef(att, fallbackName) {
        const url = await bhdResolveAttachmentUrl(att);
        if (!url) {
            alert(t('التنزيل غير متاح لهذا الملف في هذه الجلسة.', 'Download not available for this file in this session.'));
            return false;
        }
        const a = document.createElement('a');
        a.href = url;
        a.download = toStr(att.name) || fallbackName || 'document';
        a.click();
        return true;
    }

    async function openContractAttachmentPreview(idx) {
        const cache = rebuildContractDocPreviewCache();
        const it = cache[idx];
        if (!it) return;
        await openAttachmentPreviewModal(it, t('معاينة المستند', 'Document preview'));
    }

    function applyContractAttachmentPreviewZoom() {
        const wrap = document.getElementById('contractPreviewZoomWrap');
        if (wrap) wrap.style.transform = `scale(${_contractAttachmentPreviewZoom})`;
    }

    function zoomContractAttachmentPreview(delta) {
        _contractAttachmentPreviewZoom = Math.max(0.4, Math.min(3, _contractAttachmentPreviewZoom + delta));
        applyContractAttachmentPreviewZoom();
    }

    function resetContractAttachmentPreviewZoom() {
        _contractAttachmentPreviewZoom = 1;
        applyContractAttachmentPreviewZoom();
    }

    function closeContractAttachmentPreview() {
        document.getElementById('contractAttachmentPreviewModal')?.classList.remove('open');
        const body = document.getElementById('contractAttachmentPreviewBody');
        if (body) body.innerHTML = '';
    }

    /** فترة السماح = الفرق بين الاستلام والبداية / Grace days = handover → start calendar days */
    function computeGraceDaysFromHandoverAndStart(handoverYmd, startYmd) {
        const hud = toStr(handoverYmd).trim();
        const sd = toStr(startYmd).trim();
        if (!hud || !sd) return 0;
        const diffVal = diffCalendarDaysBetweenYmd(hud, sd);
        if (diffVal === null || diffVal < 0) return 0;
        return diffVal;
    }

    function recomputeGraceDaysFromHandoverAndStart(context = 'contract') {
        const isRes = context === 'reservation';
        const gEl = document.getElementById(isRes ? 'resGraceDays' : 'graceDays');
        const hEl = document.getElementById(isRes ? 'resUnitHandoverDate' : 'unitHandoverDate');
        const sEl = document.getElementById(isRes ? 'resStartDate' : 'startDate');
        if (!gEl) return false;
        const computed = computeGraceDaysFromHandoverAndStart(hEl?.value, sEl?.value);
        const next = String(computed);
        const changed = toStr(gEl.value) !== next;
        gEl.value = next;
        return changed;
    }

    function syncGraceHandoverContractDates(lastFieldId) {
        const fid = toStr(lastFieldId);
        if (fid !== 'unitHandoverDate' && fid !== 'startDate') return;
        try {
            refreshContractFinancialCalculations({ skipPayRebuild: true });
        } catch (eRes) {}
        if (fid === 'startDate') {
            try {
                recomputeContractPeriodFields('startDate');
            } catch (eAe) {}
        }
        try {
            scheduleContractWorkspaceDataRefresh();
        } catch (_eSchGh) {}
        refreshGraceHandoverIndicators();
    }

    function syncReservationGraceHandoverDates(lastFieldId) {
        const fid = toStr(lastFieldId);
        if (fid && fid !== 'resUnitHandoverDate' && fid !== 'resStartDate') return;
        try { refreshReservationFinancialCalculations(); } catch (eResForm) {}
    }

    function refreshGraceHandoverIndicators() {
        const hEl = document.getElementById('unitHandoverDate');
        const sEl = document.getElementById('startDate');
        if (!hEl || !sEl) return;
        const sd = toStr(sEl.value).trim();
        const hudOk = !!toStr(hEl.value).trim();
        hEl.required = !!sd;
        try { hEl.closest('.input-group')?.classList.toggle('grace-handover-field-required', !!sd && !hudOk); } catch (_) {}
    }

    function validateGraceHandoverConsistencyOrAlert(d) {
        if (!d || typeof d !== 'object') return true;
        const hud = toStr(d.unitHandoverDate).trim();
        const sd = toStr(d.startDate).trim();
        if (hud && sd) {
            const diffVal = diffCalendarDaysBetweenYmd(hud, sd);
            if (diffVal === null || diffVal < 0) {
                alert(t('⚠️ يجب أن يكون تاريخ بداية العقد مساوياً أو بعد تاريخ استلام الوحدة.', '⚠️ Contract start date must be on or after the unit handover date.'));
                return false;
            }
        }
        return true;
    }
    function getAgreedRentPaymentDayOfMonth() {
        const raw = parseInt(toStr(document.getElementById('agreedRentPaymentDay')?.value), 10);
        if (!Number.isNaN(raw) && raw >= 1 && raw <= 31) return raw;
        return 1;
    }

    function buildPaymentDueDateForContractMonth(monthOffset, dayOfMonth, startYear, startMonthIndex) {
        const t = new Date(startYear, startMonthIndex + monthOffset, 1);
        const lastInMonth = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
        t.setDate(Math.min(Math.max(1, dayOfMonth || 1), lastInMonth));
        return formatDateYmdLocal(t);
    }

    const CONTRACT_VAT_RATE = 0.05;

    function isContractSubjectToVat() {
        return toStr(document.getElementById('contractSubjectToVat')?.value) === 'yes';
    }

    function getContractVatPaymentMode() {
        if (!isContractSubjectToVat()) return '';
        return toStr(document.getElementById('vatPaymentMode')?.value) || 'with_rent';
    }

    function getMonthlyRentBaseForVat() {
        return Math.max(0, parseFloat(toStr(document.getElementById('monthlyRent')?.value)) || 0);
    }

    function computeContractMonthlyVatOm(rentBase) {
        const base = Math.max(0, parseFloat(rentBase) || 0);
        return base * CONTRACT_VAT_RATE;
    }

    function computeContractAnnualVatOm(rentBase) {
        const base = Math.max(0, parseFloat(rentBase) || 0);
        return base * 12 * CONTRACT_VAT_RATE;
    }

    /** ضريبة الأيام الإضافية بعد آخر شهر كامل / VAT for trailing extra days after full months */
    function computeContractExtraDaysVatOm(rentBase, extraDays) {
        const days = Math.max(0, parseInt(toStr(extraDays), 10) || 0);
        if (!days) return 0;
        return calculateDailyRentFromMonthly(rentBase) * days * CONTRACT_VAT_RATE;
    }

    /** إجمالي ضريبة العقد = شهور كاملة + أيام إضافية / Total contract VAT for full months plus extra days */
    function computeContractTotalVatOm(rentBase, months, extraDays) {
        const m = Math.max(0, parseInt(toStr(months), 10) || 0);
        const base = Math.max(0, parseFloat(rentBase) || 0);
        return base * m * CONTRACT_VAT_RATE + computeContractExtraDaysVatOm(base, extraDays);
    }

    function getContractPeriodBreakdownFromForm() {
        const startStr = toStr(document.getElementById('startDate')?.value);
        const endStr = toStr(document.getElementById('endDate')?.value);
        const fallbackMonths = Math.max(1, parseInt(toStr(document.getElementById('contractMonths')?.value), 10) || 12);
        return computeContractPeriodMonthsAndExtraDays(startStr, endStr, fallbackMonths);
    }

    function isContractVatIncludedWithRent() {
        return isContractSubjectToVat() && getContractVatPaymentMode() === 'with_rent';
    }

    function getEffectiveRentAmountForPaymentRow(rentRaw) {
        const base = Math.max(0, parseFloat(toStr(rentRaw)) || 0);
        if (!isContractVatIncludedWithRent()) {
            return base > 0 ? base.toFixed(3) : '0.000';
        }
        const incl = base + computeContractMonthlyVatOm(base);
        return incl > 0 ? incl.toFixed(3) : '0.000';
    }

    function unwrapOverAppliedContractVatAmount(amt) {
        const rate = CONTRACT_VAT_RATE;
        const eps = 0.006;
        let v = Math.max(0, parseFloat(amt) || 0);
        if (!v) return 0;
        for (let i = 0; i < 5; i++) {
            const ex = v / (1 + rate);
            const doubled = ex * (1 + rate) * (1 + rate);
            if (Math.abs(v - doubled) < eps) {
                v = ex * (1 + rate);
                continue;
            }
            break;
        }
        return v;
    }

    function getCustomRentExVatDisplayAmount(row, payload = null) {
        const vatWithRent = payload ? isPayloadVatIncludedWithRent(payload) : isContractVatIncludedWithRent();
        if (!vatWithRent) return toStr(row.amount);
        if (row.customRentExVatBase != null && row.customRentExVatBase !== '') {
            const ex = parseFloat(row.customRentExVatBase);
            if (!Number.isNaN(ex)) return ex.toFixed(3);
        }
        const amt = Math.max(0, parseFloat(toStr(row.amount)) || 0);
        const monthlyBase = payload ? getMonthlyRentBaseFromPayload(payload) : getMonthlyRentBaseForVat();
        if (paymentScheduleAmountLikelyIncludesVat(amt, monthlyBase, row)) {
            return (amt / (1 + CONTRACT_VAT_RATE)).toFixed(3);
        }
        return toStr(row.amount);
    }

    function paymentScheduleAmountLikelyIncludesVat(amt, monthlyBase, rowCtx = {}) {
        const eps = 0.006;
        const base = Math.max(0, parseFloat(monthlyBase) || 0);
        const v = Math.max(0, parseFloat(amt) || 0);
        if (!v || !base) return false;
        if (rowCtx.customRentExVatBase != null && rowCtx.customRentExVatBase !== '') {
            const ex = parseFloat(rowCtx.customRentExVatBase);
            if (!Number.isNaN(ex) && Math.abs(v - ex * (1 + CONTRACT_VAT_RATE)) < eps) return true;
        }
        const stdIncl = base * (1 + CONTRACT_VAT_RATE);
        if (Math.abs(v - stdIncl) < eps) return true;
        if (Math.abs(v - base) < eps) return false;
        const stripped = v / (1 + CONTRACT_VAT_RATE);
        if (Math.abs(stripped - base) < eps) return true;
        if (rowCtx.isExtraPeriod && rowCtx.extraDays) {
            const proratedBase = calculateGraceAmountOmFromRentAndDays(base, rowCtx.extraDays);
            const proratedIncl = proratedBase * (1 + CONTRACT_VAT_RATE);
            if (Math.abs(v - proratedIncl) < eps) return true;
            if (Math.abs(v - proratedBase) < eps) return false;
            if (Math.abs(stripped - proratedBase) < eps) return true;
        }
        return false;
    }

    /** إزالة الضريبة من مبلغ الجدول عند إيقاف «مع الإيجار» / Strip VAT from schedule row when VAT-with-rent is off */
    function stripVatFromPaymentScheduleAmount(amountStr, rowCtx = {}) {
        const amt = Math.max(0, parseFloat(toStr(amountStr)) || 0);
        if (!amt || isContractVatIncludedWithRent()) {
            return amt > 0 ? amt.toFixed(3) : '0.000';
        }
        const monthlyBase = getMonthlyRentBaseForVat();
        if (!paymentScheduleAmountLikelyIncludesVat(amt, monthlyBase, rowCtx)) {
            return amt.toFixed(3);
        }
        const exVat = amt / (1 + CONTRACT_VAT_RATE);
        return exVat > 0 ? exVat.toFixed(3) : '0.000';
    }

    function normalizePaymentScheduleRowsExVat(rows = []) {
        const list = Array.isArray(rows) ? rows : [];
        return list.map((row) => ({
            ...row,
            amount: stripVatFromPaymentScheduleAmount(row.amount, row)
        }));
    }

    function normalizePaymentScheduleAmountForCurrentVatMode(amountStr, fallbackAmountStr, rowCtx = {}) {
        if (isContractVatIncludedWithRent()) {
            return normalizePaymentScheduleAmountWithVat(amountStr, fallbackAmountStr, rowCtx);
        }
        return stripVatFromPaymentScheduleAmount(amountStr, rowCtx);
    }

    /** يُطبّق الضريبة على مبالغ الجداول عند «مع الإيجار» — مرة واحدة فقط / Apply VAT once when VAT is with rent */
    function normalizePaymentScheduleAmountWithVat(amountStr, fallbackInclAmountStr, rowCtx = {}) {
        let amt = Math.max(0, parseFloat(toStr(amountStr)) || 0);
        if (!isContractVatIncludedWithRent()) {
            return stripVatFromPaymentScheduleAmount(amountStr, rowCtx);
        }
        const eps = 0.005;
        const monthlyBase = getMonthlyRentBaseForVat();
        const stdIncl = parseFloat(getEffectiveRentAmountForPaymentRow(monthlyBase)) || 0;
        const fallbackIncl = parseFloat(toStr(fallbackInclAmountStr)) || stdIncl;
        if (amt < eps) {
            return fallbackIncl > 0 ? fallbackIncl.toFixed(3) : '0.000';
        }
        if (rowCtx.customRentExVatBase != null && rowCtx.customRentExVatBase !== '') {
            return getEffectiveRentAmountForPaymentRow(rowCtx.customRentExVatBase);
        }
        const peeled = unwrapOverAppliedContractVatAmount(amt);
        if (Math.abs(peeled - amt) > eps) {
            amt = peeled;
        }
        if (paymentScheduleAmountLikelyIncludesVat(amt, monthlyBase, rowCtx)) {
            return amt.toFixed(3);
        }
        if (Math.abs(amt - stdIncl) < eps || Math.abs(amt - fallbackIncl) < eps) {
            return amt.toFixed(3);
        }
        if (Math.abs(amt - monthlyBase) < eps) {
            return stdIncl.toFixed(3);
        }
        const withVat = parseFloat(getEffectiveRentAmountForPaymentRow(amt)) || 0;
        return withVat > 0 ? withVat.toFixed(3) : '0.000';
    }

    function normalizePaymentScheduleRowsWithVat(rows = []) {
        const list = Array.isArray(rows) ? rows : [];
        const stdIncl = getEffectiveRentAmountForPaymentRow(getMonthlyRentBaseForVat());
        return list.map((row) => {
            if (row.isExtraPeriod && row.extraDays) {
                return { ...row, amount: getPaymentRowAmountForForm(row) };
            }
            return {
                ...row,
                amount: normalizePaymentScheduleAmountWithVat(row.amount, stdIncl, row)
            };
        });
    }

    /** إعادة بناء جداول الدفع والإيجار المخصص مع ضريبة «مع الإيجار» / Rebuild rent schedules when VAT is with monthly rent */
    function refreshPaymentSchedulesForVatWithRent() {
        if (!isContractVatIncludedWithRent()) return;
        try {
            onPaymentMethodOrDriversChanged({ refreshVatInclusiveAmounts: true });
        } catch (_eVatSched) {}
    }

    function getVatChequeScheduleFromUi(wrapId) {
        const wrap = document.getElementById(wrapId || 'vatChequeScheduleTableWrap');
        if (!wrap) return [];
        return [...wrap.querySelectorAll('tbody tr[data-vat-cheque-index]')].map((tr) => ({
            chequeIndex: parseInt(tr.getAttribute('data-vat-cheque-index'), 10) || 0,
            dueDate: toStr(tr.querySelector('[data-vat-schedule-date]')?.value),
            amount: toStr(tr.querySelector('[data-vat-schedule-amount]')?.value),
            checkNo: toStr(tr.querySelector('[data-vat-schedule-check]')?.value),
            checkAttachmentName: toStr(tr.dataset.attachmentName),
            checkAttachmentDataUrl: tr.dataset.storedOnDisk === '1' ? '' : toStr(tr.dataset.attachmentDataUrl),
            checkAttachmentRelativePath: toStr(tr.dataset.attachmentRelativePath),
            checkAttachmentFileId: toStr(tr.dataset.attachmentFileId),
            storedOnDisk: tr.dataset.storedOnDisk === '1'
        }));
    }

    function sumVatChequeScheduleAmounts(rows) {
        const list = Array.isArray(rows) ? rows : getVatChequeScheduleFromUi();
        return list.reduce((s, x) => s + (parseFloat(toStr(x.amount)) || 0), 0);
    }

    function buildDefaultVatChequeRows(opt = {}) {
        const preserveExisting = opt.preserveExisting === true;
        const count = Math.max(1, parseInt(toStr(document.getElementById('vatChequeCount')?.value), 10) || 1);
        const rentBase = getMonthlyRentBaseForVat();
        const period = getContractPeriodBreakdownFromForm();
        const contractMonths = Math.max(1, period.months || count);
        const extraDays = period.extraDays || 0;
        const regularVatTotal = rentBase * contractMonths * CONTRACT_VAT_RATE;
        const perCheque = count > 0 ? regularVatTotal / count : 0;
        const amt = perCheque > 0 ? perCheque.toFixed(3) : '0.000';
        const startStr = toStr(document.getElementById('startDate')?.value);
        const dayOfMonth = getAgreedRentPaymentDayOfMonth();
        const prev = preserveExisting ? getVatChequeScheduleFromUi() : [];
        const pmap = new Map(prev.map((r) => [r.chequeIndex, r]));
        const rows = [];
        const p = startStr.split('-').map((x) => parseInt(x, 10));
        const start = p.length === 3 && !p.some((x) => Number.isNaN(x)) ? new Date(p[0], p[1] - 1, p[2]) : null;
        const y0 = start && !Number.isNaN(start.getTime()) ? start.getFullYear() : 0;
        const m0 = start && !Number.isNaN(start.getTime()) ? start.getMonth() : 0;
        for (let i = 0; i < count; i++) {
            const idx = i + 1;
            const monthOffset = Math.floor((i * contractMonths) / count);
            const ex = pmap.get(idx) || {};
            rows.push({
                chequeIndex: idx,
                dueDate:
                    preserveExisting && toStr(ex.dueDate)
                        ? toStr(ex.dueDate)
                        : start && !Number.isNaN(start.getTime())
                          ? buildPaymentDueDateForContractMonth(monthOffset, dayOfMonth, y0, m0)
                          : '',
                amount: amt,
                checkNo: preserveExisting ? toStr(ex.checkNo) : '',
                checkAttachmentName: preserveExisting ? toStr(ex.checkAttachmentName) : '',
                checkAttachmentDataUrl: preserveExisting ? toStr(ex.checkAttachmentDataUrl) : '',
                checkAttachmentRelativePath: preserveExisting ? toStr(ex.checkAttachmentRelativePath) : '',
                checkAttachmentFileId: preserveExisting ? toStr(ex.checkAttachmentFileId) : '',
                storedOnDisk: preserveExisting ? !!ex.storedOnDisk : false
            });
        }
        if (extraDays > 0) {
            const extraIdx = count + 1;
            const extraVat = computeContractExtraDaysVatOm(rentBase, extraDays);
            const ex = pmap.get(extraIdx) || {};
            rows.push({
                chequeIndex: extraIdx,
                dueDate:
                    preserveExisting && toStr(ex.dueDate)
                        ? toStr(ex.dueDate)
                        : start && !Number.isNaN(start.getTime())
                          ? buildPaymentDueDateForContractMonth(contractMonths, dayOfMonth, y0, m0)
                          : '',
                amount: extraVat > 0 ? extraVat.toFixed(3) : '0.000',
                isExtraPeriod: true,
                extraDays,
                checkNo: preserveExisting ? toStr(ex.checkNo) : '',
                checkAttachmentName: preserveExisting ? toStr(ex.checkAttachmentName) : '',
                checkAttachmentDataUrl: preserveExisting ? toStr(ex.checkAttachmentDataUrl) : '',
                checkAttachmentRelativePath: preserveExisting ? toStr(ex.checkAttachmentRelativePath) : '',
                checkAttachmentFileId: preserveExisting ? toStr(ex.checkAttachmentFileId) : '',
                storedOnDisk: preserveExisting ? !!ex.storedOnDisk : false
            });
        }
        return rows;
    }

    function renderVatChequeScheduleFromRows(rows = [], options = {}) {
        const wrap = document.getElementById(options.wrapId || 'vatChequeScheduleTableWrap');
        if (!wrap) return;
        const list = Array.isArray(rows) ? rows : [];
        if (!list.length) {
            wrap.innerHTML = `<p style="color:#666;font-size:12px;margin:0">${t('لا توجد شيكات ضريبة. اضبط الإيجار وعدد الشيكات ثم اضغط «إعادة بناء».', 'No VAT cheques. Set rent and cheque count, then press Rebuild.')}</p>`;
            return;
        }
        const body = list
            .sort((a, b) => (a.chequeIndex || 0) - (b.chequeIndex || 0))
            .map((r) => {
                const idx = r.chequeIndex || 0;
                const chequeLabel =
                    r.isExtraPeriod && r.extraDays
                        ? `${idx} <span style="font-size:11px;color:#666">(+${r.extraDays} ${t('يوم', 'd')})</span>`
                        : String(idx);
                const dVal = escHtml(toStr(r.dueDate));
                const amt = escHtml(toStr(r.amount));
                const chk = escHtml(toStr(r.checkNo));
                const attN = toStr(r.checkAttachmentName);
                const attKey = `vat_chq_${idx}`;
                const hasAtt = !!(attN || toStr(r.checkAttachmentRelativePath) || toStr(r.checkAttachmentDataUrl));
                return `<tr data-vat-cheque-index="${idx}">
                    <td>${chequeLabel}</td>
                    <td><input type="date" data-vat-schedule-date value="${dVal}"></td>
                    <td><input type="number" data-vat-schedule-amount min="0" step="0.001" value="${amt}"></td>
                    <td><input type="text" data-vat-schedule-check value="${chk}" placeholder="${escHtml(t('رقم الشيك / No.', 'No. / رقم'))}" onblur="if(contractAdditionalDataMode)applyContractAdditionalDataFieldLocks()"></td>
                    <td class="sched-check-col">
                        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px">
                            <div style="font-size:11px;word-break:break-all;flex:1;min-width:120px" data-vat-attach-name>${attN ? escHtml(attN) : '—'}</div>
                            <img class="contract-mand-doc-thumb contract-sched-att-thumb" data-sched-preview-thumb data-preview-key="${attKey}" style="display:none;max-height:48px;cursor:pointer" alt="" onclick="openContractAttachmentPreviewFromStoreKey('${attKey}')">
                            <button type="button" class="mini-btn contract-sched-att-preview" data-sched-preview-btn data-preview-key="${attKey}" style="display:${hasAtt ? 'inline-block' : 'none'}" onclick="openContractAttachmentPreviewFromStoreKey('${attKey}')">${t('معاينة / Preview', 'Preview / معاينة')}</button>
                        </div>
                        <input type="file" accept="image/*,.pdf" data-vat-schedule-file onchange="onVatChequeScheduleFileChange(this,${idx})" style="max-width:100%;margin-top:4px">
                    </td>
                </tr>`;
            })
            .join('');
        wrap.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>${t('الشيك / Cheque', 'Cheque / الشيك')}</th>
                        <th>${t('تاريخ الدفع / Due date', 'Due date / تاريخ الدفع')}</th>
                        <th>${t('مبلغ الضريبة (ر.ع) / VAT (OMR)', 'VAT amount (OMR) / مبلغ الضريبة')}</th>
                        <th>${t('رقم الشيك / Cheque no.', 'Cheque no. / رقم الشيك')}</th>
                        <th>${t('مرفق نسخة الشيك / Cheque copy', 'Cheque copy / مرفق')}</th>
                    </tr>
                </thead>
                <tbody>${body}</tbody>
            </table>`;
        list.forEach((r) => {
            const idx = r.chequeIndex || 0;
            const tr = wrap.querySelector(`tr[data-vat-cheque-index="${idx}"]`);
            if (tr) {
                if (toStr(r.checkAttachmentName)) tr.dataset.attachmentName = toStr(r.checkAttachmentName);
                if (toStr(r.checkAttachmentDataUrl) && !r.storedOnDisk) tr.dataset.attachmentDataUrl = toStr(r.checkAttachmentDataUrl);
                if (toStr(r.checkAttachmentRelativePath)) tr.dataset.attachmentRelativePath = toStr(r.checkAttachmentRelativePath);
                if (toStr(r.checkAttachmentFileId)) tr.dataset.attachmentFileId = toStr(r.checkAttachmentFileId);
                tr.dataset.storedOnDisk = r.storedOnDisk ? '1' : '0';
            }
        });
        try {
            localizeBilingualUi();
        } catch (e) {}
        if (contractAdditionalDataMode) applyContractAdditionalDataFieldLocks();
        refreshLedgerAttachmentPreviewButtons().catch((e) =>
            console.warn('refreshLedgerAttachmentPreviewButtons', e)
        );
    }

    function rebuildVatChequeScheduleFromDefaults(opt = {}) {
        const rows = buildDefaultVatChequeRows({ preserveExisting: opt.preserveExisting === true });
        renderVatChequeScheduleFromRows(rows);
        try {
            updateSummaryPanel();
        } catch (e) {}
        try {
            renderDocument(currentDoc);
        } catch (e) {}
    }

    async function onVatChequeScheduleFileChange(inp, chequeIndex) {
        const f = inp.files && inp.files[0];
        const tr =
            inp.closest('tr[data-vat-cheque-index]') ||
            document.querySelector(`#vatChequeScheduleTableWrap tr[data-vat-cheque-index="${chequeIndex}"]`) ||
            document.querySelector(`#${RENEWAL_VAT_SCHEDULE_WRAP_ID} tr[data-vat-cheque-index="${chequeIndex}"]`);
        if (!f) {
            if (tr) {
                tr.dataset.attachmentName = '';
                tr.dataset.attachmentDataUrl = '';
                tr.dataset.attachmentRelativePath = '';
                tr.dataset.attachmentFileId = '';
                tr.dataset.storedOnDisk = '0';
                const nEl = tr.querySelector('[data-vat-attach-name]');
                if (nEl) nEl.textContent = '—';
            }
            return;
        }
        try {
            const ref = await bhdPersistUploadedFile(f, {
                category: 'vat-cheques',
                docType: `cheque_vat_${chequeIndex}`
            });
            if (!tr) return;
            bhdApplyFileRefToDataset(tr, ref);
            const nEl = tr.querySelector('[data-vat-attach-name]');
            if (nEl) nEl.textContent = f.name;
            try {
                syncContractPrintAttachmentsToStore();
            } catch (_eVatSync) {}
            try {
                updateSummaryPanel();
            } catch (e) {}
            try {
                renderDocument(currentDoc);
            } catch (e) {}
            if (_contractRenewalCtx?.financialOpen) scheduleRenewalDraftAutosave();
        } catch (e) {
            alert(t('تعذر قراءة الملف.', 'Could not read the file.'));
        }
    }

    function syncContractVatUi(opt = {}) {
        const skipPayRebuild = opt.skipPayRebuild === true;
        const skipVatRebuild = opt.skipVatRebuild === true;
        const subject = isContractSubjectToVat();
        const mode = getContractVatPaymentMode();
        const optionsWrap = document.getElementById('vatOptionsWrap');
        const withRentWrap = document.getElementById('vatWithRentWrap');
        const withRentInclWrap = document.getElementById('vatWithRentInclWrap');
        const separateCountWrap = document.getElementById('vatSeparateCountWrap');
        const separateAnnualWrap = document.getElementById('vatSeparateAnnualWrap');
        const separateSection = document.getElementById('vatChequeScheduleSection');
        if (optionsWrap) optionsWrap.style.display = subject ? '' : 'none';
        const withRent = subject && mode === 'with_rent';
        const separate = subject && mode === 'separate';
        if (withRentWrap) withRentWrap.style.display = withRent ? '' : 'none';
        if (withRentInclWrap) withRentInclWrap.style.display = withRent ? '' : 'none';
        if (separateCountWrap) separateCountWrap.style.display = separate ? '' : 'none';
        if (separateAnnualWrap) separateAnnualWrap.style.display = separate ? '' : 'none';
        if (separateSection) separateSection.style.display = separate ? '' : 'none';
        const rentBase = getMonthlyRentBaseForVat();
        const period = getContractPeriodBreakdownFromForm();
        const vatMonthly = computeContractMonthlyVatOm(rentBase);
        const vatAnnual = computeContractTotalVatOm(rentBase, period.months || 12, period.extraDays);
        const vatMonthlyEl = document.getElementById('vatMonthlyAmount');
        const inclEl = document.getElementById('monthlyRentInclVat');
        const annualEl = document.getElementById('vatAnnualTotal');
        if (vatMonthlyEl) vatMonthlyEl.value = subject ? vatMonthly.toFixed(3) : '';
        if (inclEl) inclEl.value = withRent ? (rentBase + vatMonthly).toFixed(3) : '';
        if (annualEl) annualEl.value = separate ? vatAnnual.toFixed(3) : '';
        if (separate && !skipVatRebuild) {
            rebuildVatChequeScheduleFromDefaults({ preserveExisting: true });
        } else if (!separate) {
            const wrap = document.getElementById('vatChequeScheduleTableWrap');
            if (wrap) wrap.innerHTML = '';
        }
        if (!skipPayRebuild) {
            try {
                onPaymentMethodOrDriversChanged({
                    refreshVatInclusiveAmounts: isContractVatIncludedWithRent(),
                    stripVatFromAmounts: !isContractVatIncludedWithRent()
                });
            } catch (e) {}
        }
    }

    function onContractVatSettingsChanged() {
        syncContractVatUi();
    }

    function getBaseContractPaymentRows() {
        const period = getContractPeriodBreakdownFromForm();
        const fallbackMonths = Math.max(1, parseInt(toStr(document.getElementById('contractMonths')?.value), 10) || 12);
        const n = Math.max(1, period.months || fallbackMonths);
        const extraDays = period.extraDays || 0;
        const rentRaw = parseFloat(toStr(document.getElementById('monthlyRent')?.value)) || 0;
        const dayOfMonth = getAgreedRentPaymentDayOfMonth();
        const startStr = toStr(document.getElementById('startDate')?.value);
        if (!startStr) return [];
        const p = startStr.split('-').map((x) => parseInt(x, 10));
        const start = p.length === 3 && !p.some((x) => Number.isNaN(x)) ? new Date(p[0], p[1] - 1, p[2]) : new Date(startStr);
        if (Number.isNaN(start.getTime())) return [];
        const y0 = start.getFullYear();
        const m0 = start.getMonth();
        const rent = getEffectiveRentAmountForPaymentRow(rentRaw);
        const rows = [];
        for (let i = 0; i < n; i++) {
            rows.push({
                monthIndex: i + 1,
                dueDate: buildPaymentDueDateForContractMonth(i, dayOfMonth, y0, m0),
                amount: rent,
                checkNo: '',
                checkAttachmentName: '',
                checkAttachmentDataUrl: ''
            });
        }
        if (extraDays > 0) {
            const extraRow = {
                monthIndex: n + 1,
                dueDate: buildPaymentDueDateForContractMonth(n, dayOfMonth, y0, m0),
                isExtraPeriod: true,
                extraDays,
                checkNo: '',
                checkAttachmentName: '',
                checkAttachmentDataUrl: ''
            };
            extraRow.amount = getPaymentRowAmountForForm(extraRow);
            rows.push(extraRow);
        }
        return rows;
    }

    function mergeBaseWithCustomRentSchedule(base, overlay, options = {}) {
        const forceBaseDates = options.forceBaseDates === true;
        const useOverlayDueDate = !forceBaseDates && options.preserveCustomDueDates === true;
        if (!Array.isArray(overlay) || !overlay.length) return base;
        /** بدون أساس (مثلاً تاريخ البداية فارغ)، نُبقي صفوف الإيجار المخصص ظاهرة / Keep custom rows visible when computed base schedule is empty */
        if (!Array.isArray(base) || !base.length) {
            return overlay.map((r) => ({
                monthIndex: r.monthIndex || 0,
                dueDate: toStr(r.dueDate),
                amount: normalizePaymentScheduleAmountForCurrentVatMode(
                    toStr(r.amount) === '' || toStr(r.amount) === null ? '0' : r.amount,
                    getEffectiveRentAmountForPaymentRow(getMonthlyRentBaseForVat()),
                    r
                ),
                checkNo: '',
                checkAttachmentName: '',
                checkAttachmentDataUrl: ''
            }));
        }
        const cmap = new Map(overlay.map((r) => [r.monthIndex, r]));
        return base.map((row) => {
            const c = cmap.get(row.monthIndex);
            if (!c) return row;
            const a = toStr(c.amount);
            const overlayDate = toStr(c.dueDate);
            const baseDate = toStr(row.dueDate);
            const manualDateOverride = !forceBaseDates && !useOverlayDueDate && overlayDate && overlayDate !== baseDate;
            const d = useOverlayDueDate || manualDateOverride ? overlayDate : '';
            if (a === '' || a === null) {
                return { ...row, dueDate: d || row.dueDate };
            }
            const mergedCtx = { ...row, ...c };
            const parsed = parseFloat(a);
            let customRentExVatBase;
            let outAmount;
            if (isContractVatIncludedWithRent() && !row.isExtraPeriod && !Number.isNaN(parsed)) {
                const rentBase = getMonthlyRentBaseForVat();
                if (Math.abs(parsed - rentBase) > 0.006) {
                    customRentExVatBase = parsed;
                    outAmount = getEffectiveRentAmountForPaymentRow(parsed);
                } else {
                    outAmount = getPaymentRowAmountForForm(row);
                }
            } else {
                outAmount = normalizePaymentScheduleAmountForCurrentVatMode(a, row.amount, mergedCtx);
            }
            const out = { ...row, amount: outAmount, dueDate: d || row.dueDate };
            if (customRentExVatBase != null) out.customRentExVatBase = customRentExVatBase;
            return out;
        });
    }

    function getDefaultPaymentRowsFromForm() {
        const base = getBaseContractPaymentRows();
        return mergeBaseWithCustomRentSchedule(base, getCustomRentScheduleFromUi());
    }

    function parseTrailingNumericChequeRef(s) {
        const v = toStr(s).trim();
        const m = v.match(/^(.*?)(\d+)$/);
        if (!m) return null;
        return { prefix: m[1], num: parseInt(m[2], 10), padLen: m[2].length };
    }

    function formatTrailingNumericChequeRef(parsed, offset) {
        if (!parsed || Number.isNaN(parsed.num)) return '';
        const n = parsed.num + (parseInt(offset, 10) || 0);
        return parsed.prefix + String(n).padStart(parsed.padLen, '0');
    }

    function getPaymentScheduleCheckRowsSorted(wrapId) {
        const wrap = document.getElementById(wrapId || 'paymentScheduleTableWrap');
        if (!wrap) return [];
        return [...wrap.querySelectorAll('tbody tr[data-schedule-month]')].sort(
            (a, b) =>
                (parseInt(a.getAttribute('data-schedule-month'), 10) || 0) -
                (parseInt(b.getAttribute('data-schedule-month'), 10) || 0)
        );
    }

    /** بعد إدخال رقم الشيك الأول: تعبئة الباقي متسلسلاً مع إمكانية التعديل اليدوي / Auto-fill sequential cheque nos. from first row */
    function onPaymentScheduleCheckInput(inp) {
        if (!inp) return;
        const wrap = inp.closest(`#paymentScheduleTableWrap, #${RENEWAL_PAY_SCHEDULE_WRAP_ID}`);
        const wrapId = wrap?.id || 'paymentScheduleTableWrap';
        const byChq =
            wrapId === RENEWAL_PAY_SCHEDULE_WRAP_ID
                ? isPaymentMethodCheque(_contractRenewalCtx?.basePayload?.paymentMethod)
                : isContractPaymentByCheque();
        if (!byChq) return;
        const rowTr = inp.closest('tr[data-schedule-month]');
        const rows = getPaymentScheduleCheckRowsSorted(wrapId);
        if (!rows.length || !rowTr) return;
        const firstTr = rows[0];
        const firstInp = firstTr.querySelector('[data-schedule-check]');
        if (!firstInp) return;
        const isFirstRow = rowTr === firstTr;
        if (!isFirstRow) {
            inp.dataset.checkAuto = '';
            return;
        }
        const firstVal = toStr(firstInp.value).trim();
        const parsed = parseTrailingNumericChequeRef(firstVal);
        rows.forEach((tr, idx) => {
            if (idx === 0) return;
            const el = tr.querySelector('[data-schedule-check]');
            if (!el) return;
            if (!parsed) {
                if (el.dataset.checkAuto === '1') {
                    el.value = '';
                    delete el.dataset.checkAuto;
                }
                return;
            }
            const isAuto = el.dataset.checkAuto === '1';
            const empty = !toStr(el.value).trim();
            if (isAuto || empty) {
                el.value = formatTrailingNumericChequeRef(parsed, idx);
                el.dataset.checkAuto = '1';
            }
        });
        if (wrapId === RENEWAL_PAY_SCHEDULE_WRAP_ID) scheduleRenewalDraftAutosave();
    }

    function getPaymentScheduleFromUi(wrapId) {
        const wrap = document.getElementById(wrapId || 'paymentScheduleTableWrap');
        if (!wrap) return [];
        return [...wrap.querySelectorAll('tbody tr[data-schedule-month]')].map((tr) => ({
            monthIndex: parseInt(tr.getAttribute('data-schedule-month'), 10) || 0,
            dueDate: toStr(tr.querySelector('[data-schedule-date]')?.value),
            amount: toStr(tr.querySelector('[data-schedule-amount]')?.value),
            checkNo: toStr(tr.querySelector('[data-schedule-check]')?.value),
            isExtraPeriod: tr.dataset.extraPeriod === '1',
            extraDays: Math.max(0, parseInt(toStr(tr.dataset.extraDays), 10) || 0),
            checkAttachmentName: toStr(tr.dataset.attachmentName),
            checkAttachmentDataUrl: tr.dataset.storedOnDisk === '1' ? '' : toStr(tr.dataset.attachmentDataUrl),
            checkAttachmentRelativePath: toStr(tr.dataset.attachmentRelativePath),
            checkAttachmentFileId: toStr(tr.dataset.attachmentFileId),
            storedOnDisk: tr.dataset.storedOnDisk === '1'
        }));
    }

    function renderPaymentScheduleFromRows(rows = [], options = {}) {
        const wrapId = options.wrapId || 'paymentScheduleTableWrap';
        const wrap = document.getElementById(wrapId);
        if (!wrap) return;
        let list = Array.isArray(rows) ? rows.map((r) => ({ ...r })) : [];
        const renewalPayload =
            options.renewalPayload ||
            (wrapId === RENEWAL_PAY_SCHEDULE_WRAP_ID ? getRenewalRenderPayload() : null);
        if (list.length) {
            if (renewalPayload) {
                list = enrichPaymentScheduleRowsFromPayload(renewalPayload, list);
                if (isPayloadVatIncludedWithRent(renewalPayload)) {
                    const stdIncl = getEffectiveRentAmountForPaymentRowFromPayload(
                        renewalPayload,
                        getMonthlyRentBaseFromPayload(renewalPayload)
                    );
                    list = list.map((row) => ({
                        ...row,
                        amount: normalizePaymentScheduleAmountWithVat(row.amount, stdIncl, row)
                    }));
                }
            } else {
                list = isContractVatIncludedWithRent()
                    ? normalizePaymentScheduleRowsWithVat(list)
                    : normalizePaymentScheduleRowsExVat(list);
            }
        }
        const byChq =
            options.byCheque !== undefined
                ? options.byCheque
                : renewalPayload
                  ? isPaymentMethodCheque(renewalPayload.paymentMethod)
                  : isContractPaymentByCheque();
        const hasPm =
            options.paymentMethodSet !== undefined
                ? options.paymentMethodSet
                : renewalPayload
                  ? !!toStr(renewalPayload.paymentMethod)
                  : !!toStr(document.getElementById('paymentMethod')?.value);
        if (!hasPm) {
            wrap.innerHTML = `<p style="color:#666;font-size:12px;margin:0">${t('اختر طريقة الدفع لعرض جدول الأقساط.', 'Select a payment method to show the payment schedule table.')}</p>`;
            return;
        }
        if (!list.length) {
            wrap.innerHTML = `<p style="color:#666;font-size:12px;margin:0">${t('لا توجد بيانات جدول. اضبط المدة والإيجار ثم اضغط «إعادة بناء».', 'No schedule rows. Set term and rent, then press Rebuild.')}</p>`;
            return;
        }
        const headExtra = byChq
            ? `<th>${t('رقم الشيك / Cheque no.', 'Cheque no. / رقم الشيك')}</th><th>${t('مرفق نسخة الشيك / Cheque copy', 'Cheque copy / مرفق')}</th>`
            : '';
        const renInputEv = wrapId === RENEWAL_PAY_SCHEDULE_WRAP_ID ? ' oninput="scheduleRenewalDraftAutosave()"' : '';
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
                const chk = escHtml(toStr(r.checkNo));
                const attN = toStr(r.checkAttachmentName);
                const attKey = `pay_chq_${m}`;
                const hasAtt = !!(attN || toStr(r.checkAttachmentRelativePath) || toStr(r.checkAttachmentDataUrl));
                const chRow = byChq
                    ? `<td><input type="text" data-schedule-check value="${chk}" placeholder="${escHtml(t('رقم الشيك / No.', 'No. / رقم'))}" oninput="onPaymentScheduleCheckInput(this)" onblur="if(contractAdditionalDataMode)applyContractAdditionalDataFieldLocks()"></td>
                       <td class="sched-check-col">
                         <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px">
                           <div style="font-size:11px;word-break:break-all;flex:1;min-width:120px" data-attach-name>${attN ? escHtml(attN) : '—'}</div>
                           <img class="contract-mand-doc-thumb contract-sched-att-thumb" data-sched-preview-thumb data-preview-key="${attKey}" style="display:none;max-height:48px;cursor:pointer" alt="" onclick="openContractAttachmentPreviewFromStoreKey('${attKey}')">
                           <button type="button" class="mini-btn contract-sched-att-preview" data-sched-preview-btn data-preview-key="${attKey}" style="display:${hasAtt ? 'inline-block' : 'none'}" onclick="openContractAttachmentPreviewFromStoreKey('${attKey}')">${t('معاينة / Preview', 'Preview / معاينة')}</button>
                         </div>
                         <input type="file" accept="image/*,.pdf" data-schedule-file onchange="onPaymentScheduleFileChange(this,${m})" style="max-width:100%;margin-top:4px">
                       </td>`
                    : '';
                const extraAttrs =
                    r.isExtraPeriod && r.extraDays
                        ? ` data-extra-period="1" data-extra-days="${escHtml(String(r.extraDays))}"`
                        : '';
                return `<tr data-schedule-month="${m}"${extraAttrs}>
                    <td>${monthLabel}</td>
                    <td><input type="date" data-schedule-date value="${dVal}"${renInputEv}></td>
                    <td><input type="number" data-schedule-amount min="0" step="0.001" value="${amt}"${renInputEv}></td>
                    ${chRow}
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
                        ${headExtra}
                    </tr>
                </thead>
                <tbody>${body}</tbody>
            </table>`;
        list.forEach((r) => {
            const m = r.monthIndex || 0;
            const tr = wrap.querySelector(`tr[data-schedule-month="${m}"]`);
            if (tr) {
                if (r.isExtraPeriod && r.extraDays) {
                    tr.dataset.extraPeriod = '1';
                    tr.dataset.extraDays = String(r.extraDays);
                } else {
                    delete tr.dataset.extraPeriod;
                    delete tr.dataset.extraDays;
                }
                if (toStr(r.checkAttachmentName)) tr.dataset.attachmentName = toStr(r.checkAttachmentName);
                if (toStr(r.checkAttachmentDataUrl) && !r.storedOnDisk) tr.dataset.attachmentDataUrl = toStr(r.checkAttachmentDataUrl);
                if (toStr(r.checkAttachmentRelativePath)) tr.dataset.attachmentRelativePath = toStr(r.checkAttachmentRelativePath);
                if (toStr(r.checkAttachmentFileId)) tr.dataset.attachmentFileId = toStr(r.checkAttachmentFileId);
                tr.dataset.storedOnDisk = r.storedOnDisk ? '1' : '0';
            }
        });
        try {
            localizeBilingualUi();
        } catch (e) {}
        if (contractAdditionalDataMode) applyContractAdditionalDataFieldLocks();
        refreshLedgerAttachmentPreviewButtons().catch((e) =>
            console.warn('refreshLedgerAttachmentPreviewButtons', e)
        );
    }


    function applyReservationDepositAttachmentFieldLock() {
        const inp = document.getElementById('resDepositAttachmentInput');
        const row = document.getElementById('resDepositAttachmentRow');
        if (inp) {
            inp.disabled = true;
            inp.hidden = true;
            inp.value = '';
        }
        if (row) {
            row.dataset.attachmentName = '';
            row.dataset.attachmentDataUrl = '';
            row.dataset.attachmentRelativePath = '';
            row.dataset.attachmentFileId = '';
            row.dataset.storedOnDisk = '0';
            const nEl = row.querySelector('[data-res-deposit-att-name]');
            if (nEl) nEl.textContent = '—';
        }
    }

    async function onReservationDepositAttachmentChange(inp) {
        applyReservationDepositAttachmentFieldLock();
        if (inp) inp.value = '';
    }

    async function onDepositAttachmentChange(inp) {
        applyContractDepositAttachmentFieldLock();
        if (inp) inp.value = '';
    }

    function syncContractDepositFieldsFromAccountingToDom(payloadOpt) {
        if (!isContractsWorkspaceScreenActive()) return;
        let data = payloadOpt && typeof payloadOpt === 'object' ? payloadOpt : null;
        try {
            if (!data) data = collectStorableContractFullFromDom();
        } catch (_eColDep) {
            return;
        }
        const enriched = enrichPayloadDepositFromAccounting(data);
        const refEl = document.getElementById('depositReceiptRef');
        if (refEl && toStr(enriched.depositReceiptRef).trim()) {
            refEl.value = toStr(enriched.depositReceiptRef);
        }
        const dar = document.getElementById('depositAttachmentRow');
        if (
            dar &&
            (payloadHasDepositAttachment(enriched) ||
                toStr(enriched.depositAttachmentName).trim() ||
                toStr(enriched.depositAttachmentRelativePath).trim())
        ) {
            dar.dataset.attachmentName = toStr(enriched.depositAttachmentName);
            dar.dataset.attachmentDataUrl = enriched.depositStoredOnDisk ? '' : toStr(enriched.depositAttachmentDataUrl);
            dar.dataset.attachmentRelativePath = toStr(enriched.depositAttachmentRelativePath);
            dar.dataset.attachmentFileId = toStr(enriched.depositAttachmentFileId);
            dar.dataset.storedOnDisk = enriched.depositStoredOnDisk ? '1' : '0';
            const dsp = dar.querySelector('[data-deposit-att-name]');
            if (dsp) {
                dsp.textContent =
                    toStr(enriched.depositAttachmentName) ||
                    t('من المحاسبة', 'From accounting');
            }
            try {
                syncContractPrintAttachmentsToStore();
            } catch (_eDepPrintSync) {}
        }
        try {
            applyContractDepositAmountFieldLock();
        } catch (_eDepAmtSync) {}
    }

    function applyContractDepositAttachmentFieldLock() {
        const inp = document.getElementById('depositAttachmentInput');
        const row = document.getElementById('depositAttachmentRow');
        const hint = document.getElementById('contractDepositAttachmentHint');
        if (inp) {
            inp.disabled = true;
            inp.hidden = true;
            inp.value = '';
        }
        if (hint) {
            hint.textContent = t(
                hint.getAttribute('data-ar') ||
                    'يُستورد المرفق تلقائياً من المحاسبة بعد اعتماد استلام التأمين — لا حاجة لرفعه من شاشة العقود.',
                hint.getAttribute('data-en') ||
                    'The attachment is imported automatically from accounting after deposit receipt approval — no upload needed on the contract screen.'
            );
            hint.style.display = '';
        }
        if (!row) return;
        let satisfied = false;
        try {
            const data = enrichPayloadDepositFromAccounting(collectStorableContractFullFromDom());
            satisfied = payloadDepositSatisfiedByAccounting(data);
            if (satisfied) {
                syncContractDepositFieldsFromAccountingToDom(data);
            }
        } catch (_eDepSat) {}
        if (satisfied && hint) {
            hint.style.background = '#eef8ee';
            hint.style.borderColor = '#b8ddb8';
            hint.style.color = '#1f5a2a';
        }
        try {
            applyContractDepositAmountFieldLock();
        } catch (_eDepAmtLock) {}
    }

    async function onContractMeterReadingAttachmentChange(kind, inp) {
        const meta = getContractMeterReadingKindMeta(kind);
        const row = document.getElementById(`${meta.prefix}AttachmentRow`);
        const f = inp?.files && inp.files[0];
        if (!row) return;
        if (!f) {
            row.dataset.attachmentName = '';
            row.dataset.attachmentDataUrl = '';
            row.dataset.attachmentRelativePath = '';
            row.dataset.attachmentFileId = '';
            row.dataset.storedOnDisk = '0';
            const lbl = row.querySelector('[data-meter-reading-att-name]');
            if (lbl) lbl.textContent = '—';
            try {
                updateSummaryPanel();
            } catch (_eSumClr) {}
            try {
                syncContractPrintAttachmentsToStore();
            } catch (_ePrintClr) {}
            try {
                scheduleContractWorkspaceDraftSave();
            } catch (_eSavClr) {}
            try {
                refreshLedgerAttachmentPreviewButtons().catch(() => {});
            } catch (_ePrevClr) {}
            return;
        }
        try {
            const ref = await bhdPersistUploadedFile(f, { category: 'property', docType: meta.docType });
            bhdApplyFileRefToDataset(row, ref);
            const lbl = row.querySelector('[data-meter-reading-att-name]');
            if (lbl) lbl.textContent = f.name;
            try {
                syncContractPrintAttachmentsToStore();
            } catch (_ePrintSync) {}
            try {
                updateSummaryPanel();
            } catch (_eSum) {}
            try {
                renderDocument(currentDoc);
            } catch (_eDoc) {}
            try {
                scheduleContractWorkspaceDraftSave();
            } catch (_eSav) {}
            try {
                refreshLedgerAttachmentPreviewButtons().catch(() => {});
            } catch (_ePrev) {}
        } catch (e) {
            alert(t('تعذر قراءة الملف.', 'Could not read the file.'));
        }
        if (inp) inp.value = '';
    }

    async function onInsuranceDepositAttachmentChange(inp) {
        const row = inp && inp.closest && inp.closest('[data-insurance-row]');
        const f = inp.files && inp.files[0];
        if (!row) return;
        if (!f) {
            row.dataset.attachmentName = '';
            row.dataset.attachmentDataUrl = '';
            row.dataset.attachmentRelativePath = '';
            row.dataset.attachmentFileId = '';
            row.dataset.storedOnDisk = '0';
            const nEl = row.querySelector('[data-ins-att-lbl]');
            if (nEl) nEl.textContent = '—';
            try {
                updateSummaryPanel();
            } catch (e) {}
            try {
                renderDocument(currentDoc);
            } catch (e) {}
            if (contractAdditionalDataMode) applyContractAdditionalDataFieldLocks();
            return;
        }
        try {
            const ref = await bhdPersistUploadedFile(f, { category: 'deposit', docType: 'insurance_deposit' });
            bhdApplyFileRefToDataset(row, ref);
            const nEl = row.querySelector('[data-ins-att-lbl]');
            if (nEl) nEl.textContent = f.name;
            try {
                syncContractPrintAttachmentsToStore();
            } catch (_eInsSync) {}
            try {
                updateSummaryPanel();
            } catch (e) {}
            try {
                renderDocument(currentDoc);
            } catch (e) {}
            if (contractAdditionalDataMode) applyContractAdditionalDataFieldLocks();
        } catch (e) {
            alert(t('تعذر قراءة الملف.', 'Could not read the file.'));
        }
    }

    async function onPaymentScheduleFileChange(inp, monthIndex) {
        const f = inp.files && inp.files[0];
        const tr =
            inp.closest('tr[data-schedule-month]') ||
            document.querySelector(`#paymentScheduleTableWrap tr[data-schedule-month="${monthIndex}"]`) ||
            document.querySelector(`#${RENEWAL_PAY_SCHEDULE_WRAP_ID} tr[data-schedule-month="${monthIndex}"]`);
        if (!f) {
            if (tr) {
                tr.dataset.attachmentName = '';
                tr.dataset.attachmentDataUrl = '';
                tr.dataset.attachmentRelativePath = '';
                tr.dataset.attachmentFileId = '';
                tr.dataset.storedOnDisk = '0';
                const nEl = tr.querySelector('[data-attach-name]');
                if (nEl) nEl.textContent = '—';
            }
            if (contractAdditionalDataMode) applyContractAdditionalDataFieldLocks();
            return;
        }
        try {
            const ref = await bhdPersistUploadedFile(f, {
                category: 'cheques',
                docType: `cheque_rent_month_${monthIndex}`
            });
            if (!tr) return;
            bhdApplyFileRefToDataset(tr, ref);
            const nEl = tr.querySelector('[data-attach-name]');
            if (nEl) nEl.textContent = f.name;
            try {
                syncContractPrintAttachmentsToStore();
            } catch (_ePaySync) {}
            try {
                updateSummaryPanel();
            } catch (e) {}
            try {
                renderDocument(currentDoc);
            } catch (e) {}
            if (contractAdditionalDataMode) applyContractAdditionalDataFieldLocks();
            if (_contractRenewalCtx?.financialOpen) scheduleRenewalDraftAutosave();
        } catch (e) {
            alert(t('تعذر قراءة الملف.', 'Could not read the file.'));
        }
    }

    function rebuildPaymentScheduleFromContractDefaults() {
        const prevPay = getPaymentScheduleFromUi();
        const prevMap = new Map(prevPay.map((r) => [r.monthIndex, r]));
        const base = getBaseContractPaymentRows();
        let overlay = getCustomRentScheduleFromUi();
        if (!isContractVatIncludedWithRent() && overlay.length) {
            overlay = normalizePaymentScheduleRowsExVat(overlay);
        }
        let merged = mergeBaseWithCustomRentSchedule(base, overlay, { forceBaseDates: true });
        if (isContractVatIncludedWithRent()) {
            merged = normalizePaymentScheduleRowsWithVat(merged);
        } else {
            merged = normalizePaymentScheduleRowsExVat(merged);
        }
        merged = merged.map((row) => mergeChequeRowAttachmentFields(prevMap.get(row.monthIndex) || {}, row));
        renderCustomRentScheduleFromRows(merged);
        renderPaymentScheduleFromRows(merged);
        if (isContractSubjectToVat() && getContractVatPaymentMode() === 'separate') {
            try {
                rebuildVatChequeScheduleFromDefaults({ preserveExisting: true });
            } catch (eVat) {}
        }
        try {
            updateSummaryPanel();
        } catch (e) {}
        try {
            renderDocument(currentDoc);
        } catch (e) {}
        try {
            scheduleContractWorkspaceDraftSave();
        } catch (_eRbSav) {}
    }

    function getPaymentScheduleDriverChangeOptions(fieldId) {
        const fid = toStr(fieldId);
        const withRentVat = isContractVatIncludedWithRent();
        if (fid === 'agreedRentPaymentDay') {
            return withRentVat
                ? { forceBaseDates: true, refreshVatInclusiveAmounts: true }
                : { forceBaseDates: true, stripVatFromAmounts: true };
        }
        return withRentVat ? { refreshVatInclusiveAmounts: true } : { stripVatFromAmounts: true };
    }

    function onPaymentMethodOrDriversChanged(opt) {
        const skipCustomRedraw = !!(opt && opt.skipCustomRedraw);
        const preserveCustomDueDates = !!(opt && opt.preserveCustomDueDates);
        const forceBaseDates = !!(opt && opt.forceBaseDates);
        const refreshVatInclusiveAmounts = !!(opt && opt.refreshVatInclusiveAmounts);
        const stripVatFromAmounts = !!(opt && opt.stripVatFromAmounts);
        const base = getBaseContractPaymentRows();
        let overlay = getCustomRentScheduleFromUi();
        if (stripVatFromAmounts && overlay.length) {
            overlay = normalizePaymentScheduleRowsExVat(overlay);
        }
        const prevPaySnapshot = getPaymentScheduleFromUi();
        let merged = mergeBaseWithCustomRentSchedule(base, overlay, { preserveCustomDueDates, forceBaseDates });
        if (isContractVatIncludedWithRent()) {
            merged = normalizePaymentScheduleRowsWithVat(merged);
        } else if (stripVatFromAmounts) {
            merged = normalizePaymentScheduleRowsExVat(merged);
        }
        if (!merged.length && prevPaySnapshot.length) {
            const shell = prevPaySnapshot.map((r) =>
                mergeChequeRowAttachmentFields(r, {
                    monthIndex: r.monthIndex || 0,
                    dueDate: toStr(r.dueDate),
                    amount: toStr(r.amount),
                    checkNo: '',
                    checkAttachmentName: '',
                    checkAttachmentDataUrl: ''
                })
            );
            merged = mergeBaseWithCustomRentSchedule(shell, overlay);
            if (isContractVatIncludedWithRent()) {
                merged = normalizePaymentScheduleRowsWithVat(merged);
            } else if (stripVatFromAmounts) {
                merged = normalizePaymentScheduleRowsExVat(merged);
            }
        }
        if (!skipCustomRedraw) renderCustomRentScheduleFromRows(merged);
        const prev = getPaymentScheduleFromUi();
        const mapP = new Map(prev.map((r) => [r.monthIndex, r]));
        const out = merged.map((row) => mergeChequeRowAttachmentFields(mapP.get(row.monthIndex) || {}, row));
        renderPaymentScheduleFromRows(out);
        if (isContractSubjectToVat() && getContractVatPaymentMode() === 'separate') {
            try {
                const rentBase = getMonthlyRentBaseForVat();
                const period = getContractPeriodBreakdownFromForm();
                const annualEl = document.getElementById('vatAnnualTotal');
                if (annualEl) {
                    annualEl.value = computeContractTotalVatOm(rentBase, period.months || 12, period.extraDays).toFixed(3);
                }
                rebuildVatChequeScheduleFromDefaults({ preserveExisting: true });
            } catch (eVatDrv) {}
        }
        try {
            updateSummaryPanel();
        } catch (e) {}
        try {
            renderDocument(currentDoc);
        } catch (e) {}
    }

    let _contractPeriodSyncBusy = false;

    function calculateEndDateFromStartAndMonths(startYmd, months) {
        const start = parseYmdToLocalDate(startYmd);
        const m = parseInt(toStr(months), 10);
        if (!start || Number.isNaN(start.getTime()) || !m || m < 1) return '';
        const end = new Date(start);
        end.setMonth(end.getMonth() + m);
        end.setDate(end.getDate() - 1);
        return formatDateYmdLocal(end);
    }

    /** تاريخ البداية + عدد الشهور (نفس يوم الشهر) / Start date plus whole months (same calendar day) */
    function addMonthsToStartYmd(startYmd, months) {
        const start = parseYmdToLocalDate(startYmd);
        const m = parseInt(toStr(months), 10);
        if (!start || Number.isNaN(start.getTime()) || !m || m < 1) return '';
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        d.setMonth(d.getMonth() + m);
        return formatDateYmdLocal(d);
    }

    function computeContractMonthsFromStartAndEnd(startYmd, endYmd) {
        const start = parseYmdToLocalDate(startYmd);
        const end = parseYmdToLocalDate(endYmd);
        if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
        const endYmdNorm = formatDateYmdLocal(end);
        for (let m = 1; m <= 1200; m++) {
            const calcEnd = calculateEndDateFromStartAndMonths(startYmd, m);
            if (calcEnd === endYmdNorm) return m;
            const calcEndDate = parseYmdToLocalDate(calcEnd);
            if (calcEndDate && calcEndDate > end) break;
        }
        /** أكبر عدد شهور كاملة حيث (البداية + m شهر) ≤ النهاية / Largest m where start + m months ≤ end */
        let months = 0;
        for (let m = 1; m <= 1200; m++) {
            const ann = addMonthsToStartYmd(startYmd, m);
            const cmp = diffCalendarDaysBetweenYmd(ann, endYmdNorm);
            if (cmp !== null && cmp >= 0) months = m;
            else break;
        }
        return Math.max(1, months);
    }

    function computeContractPeriodDaysInclusive(startYmd, endYmd) {
        const diff = diffCalendarDaysBetweenYmd(startYmd, endYmd);
        if (diff === null || diff < 0) return 0;
        return diff + 1;
    }

    /** شهور + أيام إضافية بعد آخر شهر كامل / Full months plus trailing extra days */
    function computeContractPeriodMonthsAndExtraDays(startYmd, endYmd, fallbackMonths) {
        const start = toStr(startYmd).trim();
        const end = toStr(endYmd).trim();
        if (!start || !end) {
            const m = Math.max(0, parseInt(toStr(fallbackMonths), 10) || 0);
            return { months: m, extraDays: 0 };
        }
        const months = computeContractMonthsFromStartAndEnd(start, end);
        if (!months) return { months: 0, extraDays: 0 };
        const calcEnd = calculateEndDateFromStartAndMonths(start, months);
        if (calcEnd === end) {
            return { months, extraDays: 0 };
        }
        let extraDays = 0;
        const ann = addMonthsToStartYmd(start, months);
        if (ann) {
            const diff = diffCalendarDaysBetweenYmd(ann, end);
            if (diff !== null && diff > 0) extraDays = diff;
        }
        return { months, extraDays };
    }

    function formatContractPeriodPart(lang, months, extraDays) {
        const isEn = lang === 'en';
        if (!months && !extraDays) return isEn ? '—' : '—';
        const parts = [];
        if (months) {
            if (isEn) parts.push(`${months} month${months === 1 ? '' : 's'}`);
            else parts.push(`${months} شهر`);
        }
        if (extraDays) {
            if (isEn) parts.push(`${extraDays} day${extraDays === 1 ? '' : 's'}`);
            else parts.push(`${extraDays} يوم`);
        }
        if (!isEn && parts.length === 2) return parts.join(' و ');
        if (isEn && parts.length === 2) return parts.join(' and ');
        return parts[0] || '—';
    }

    function formatContractPeriodBilingual(startYmd, endYmd, fallbackMonths) {
        const { months, extraDays } = computeContractPeriodMonthsAndExtraDays(startYmd, endYmd, fallbackMonths);
        const ar = formatContractPeriodPart('ar', months, extraDays);
        const en = formatContractPeriodPart('en', months, extraDays);
        return `${ar} / ${en}`;
    }

    function syncContractPeriodDisplay() {
        const el = document.getElementById('contractPeriodDisplay');
        if (!el) return;
        const start = document.getElementById('startDate')?.value;
        const end = document.getElementById('endDate')?.value;
        const months = document.getElementById('contractMonths')?.value;
        el.value = formatContractPeriodBilingual(start, end, months);
    }

    /** مدة العقد: شهور ↔ بداية/نهاية / Contract period: months ↔ start/end */
    function recomputeContractPeriodFields(lastFieldId) {
        if (_contractPeriodSyncBusy) return { changedEnd: false, changedMonths: false };
        const fid = toStr(lastFieldId);
        const monthsEl = document.getElementById('contractMonths');
        const startEl = document.getElementById('startDate');
        const endEl = document.getElementById('endDate');
        if (!monthsEl || !startEl || !endEl) return { changedEnd: false, changedMonths: false };
        const start = toStr(startEl.value).trim();
        const end = toStr(endEl.value).trim();
        const monthsRaw = parseInt(toStr(monthsEl.value), 10);
        let changedEnd = false;
        let changedMonths = false;
        _contractPeriodSyncBusy = true;
        try {
            if (fid === 'contractMonths') {
                if (start && monthsRaw >= 1) {
                    const nextEnd = calculateEndDateFromStartAndMonths(start, monthsRaw);
                    if (nextEnd && nextEnd !== end) {
                        endEl.value = nextEnd;
                        changedEnd = true;
                    }
                }
            } else if (fid === 'endDate') {
                if (start && end) {
                    const computed = computeContractMonthsFromStartAndEnd(start, end);
                    if (computed >= 1 && String(computed) !== toStr(monthsEl.value)) {
                        monthsEl.value = String(computed);
                        changedMonths = true;
                    }
                }
            } else if (fid === 'startDate') {
                if (start && end) {
                    const computed = computeContractMonthsFromStartAndEnd(start, end);
                    if (computed >= 1 && String(computed) !== toStr(monthsEl.value)) {
                        monthsEl.value = String(computed);
                        changedMonths = true;
                    }
                } else if (start && monthsRaw >= 1) {
                    const nextEnd = calculateEndDateFromStartAndMonths(start, monthsRaw);
                    if (nextEnd && nextEnd !== end) {
                        endEl.value = nextEnd;
                        changedEnd = true;
                    }
                }
            }
        } finally {
            _contractPeriodSyncBusy = false;
        }
        try { syncContractPeriodDisplay(); } catch (_ePerDisp) {}
        return { changedEnd, changedMonths };
    }

    function autoCalculateEndDate() {
        recomputeContractPeriodFields('contractMonths');
    }

    function updateReservationCalculations() {
        const rentMode = document.getElementById('rentCalcMode');
        const areaGroup = document.getElementById('rentAreaGroup');
        const rateGroup = document.getElementById('rentPerSqmGroup');
        const areaEl = document.getElementById('rentAreaSqm');
        const rateEl = document.getElementById('rentPerSqm');
        const monthlyEl = document.getElementById('monthlyRent');
        const graceDaysEl = document.getElementById('graceDays');
        const graceAmountEl = document.getElementById('graceAmount');
        if (!monthlyEl) return;
        const mode = toStr(rentMode?.value) || 'full';
        const isPerMeter = mode === 'per_meter';
        if (areaGroup) areaGroup.style.display = isPerMeter ? '' : 'none';
        if (rateGroup) rateGroup.style.display = isPerMeter ? '' : 'none';
        if (areaEl) areaEl.disabled = !isPerMeter;
        if (rateEl) rateEl.disabled = !isPerMeter;
        monthlyEl.readOnly = isPerMeter;
        if (isPerMeter) {
            const area = parseFloat(toStr(areaEl?.value)) || 0;
            const rate = parseFloat(toStr(rateEl?.value)) || 0;
            monthlyEl.value = (area * rate).toFixed(3);
        }
        const depositEl = document.getElementById('depositAmount');
        if (depositEl && depositEl.dataset.manualDeposit !== '1') {
            depositEl.value = (parseFloat(toStr(monthlyEl.value)) || 0).toFixed(3);
        }
        const monthly = parseFloat(toStr(monthlyEl.value)) || 0;
        const graceDays = Math.max(0, parseInt(toStr(graceDaysEl?.value), 10) || 0);
        applyGraceAmountToField(graceAmountEl, monthly, graceDays);
        updateSummaryPanel();
    }

    function closeDataGapsModal() {
        document.getElementById('dataGapsModal')?.classList.remove('open');
    }

    function findTenantAddressBookIndexByFormName() {
        let d;
        try {
            d = getActiveWorkspaceFormData();
        } catch (gf2) {
            d = getFormDataReservationSafeOrFallback();
        }
        if (isReservationsWorkspaceScreenActive()) {
            const entry = findTenantAddressBookEntryForReservation(null, d);
            if (!entry) return -1;
            return resolveAddressBookEntryIndex(entry);
        }
        return findAddressBookTenantIndexForData(d);
    }

    function extractValidationBullets(msg) {
        return String(msg || '')
            .split('\n')
            .map((x) => x.replace(/^•\s*/, '').trim())
            .filter((x) => x && !x.includes('يرجى') && !x.includes('Please complete'));
    }

    function collectContractRelatedDataGaps() {
        const gaps = [];
        let d;
        try {
            d = getActiveWorkspaceFormData();
        } catch (eGaps) {
            d = getFormDataReservationSafeOrFallback();
        }
        const building = toStr(d.buildingNo);
        const unit = toStr(d.flatNo);
        const isReservationMode = isReservationsWorkspaceScreenActive();

        if (building) {
            const resolvedBuildingKey = resolveBuildingProfileKey(building) || building;
            if (isReservationMode) {
                const bp = buildingProfiles[resolvedBuildingKey] || getEmptyBuildingProfile();
                const buildingCheck = validateBuildingProfileForReservation({ ...bp, name: bp.name || resolvedBuildingKey });
                if (!buildingCheck.ok) {
                    buildingCheck.missing.forEach((line) => {
                        gaps.push({
                            text: `${t('العقار', 'Property')}: ${line}`,
                            fixText: t('استكمال بيانات العقار', 'Complete property data'),
                            action: { type: 'building', key: resolvedBuildingKey }
                        });
                    });
                }
            } else {
                const bp = buildingProfiles[resolvedBuildingKey] || getEmptyBuildingProfile();
                const buildingCheck = validateBuildingProfileComplete({ ...bp, name: bp.name || resolvedBuildingKey });
                if (!buildingCheck.ok) {
                    extractValidationBullets(buildingCheck.message).forEach((line) => {
                        gaps.push({
                            text: `${t('العقار', 'Property')}: ${line}`,
                            fixText: t('استكمال بيانات العقار', 'Complete property data'),
                            action: { type: 'building', key: resolvedBuildingKey }
                        });
                    });
                }
            }

            const linkedOwners = getOwnerNamesForBuilding(resolvedBuildingKey);
            if (!linkedOwners.length) {
                gaps.push({
                    text: t('لا يوجد مالك مربوط بهذا العقار.', 'No owner linked to this property.'),
                    fixText: t('فتح شاشة الملاك', 'Open owners page'),
                    action: { type: 'ownersList' }
                });
            } else {
                linkedOwners.forEach((ownerName) => {
                    const profile = getEditableOwnerProfile(ownerName);
                    if (isReservationMode) {
                        if (!toStr(profile.fullName) && !toStr(profile.fullNameEn)) {
                            gaps.push({
                                text: `${t('المالك', 'Owner')} (${ownerName}): ${t('الاسم', 'Name')} ${t('ناقص', 'Missing')}`,
                                fixText: t('استكمال بيانات المالك', 'Complete owner data'),
                                action: { type: 'owner', key: ownerName }
                            });
                        }
                        if (!toStr(profile.civilId)) {
                            gaps.push({
                                text: `${t('المالك', 'Owner')} (${ownerName}): ${t('الرقم المدني', 'Civil ID')} ${t('ناقص', 'Missing')}`,
                                fixText: t('استكمال بيانات المالك', 'Complete owner data'),
                                action: { type: 'owner', key: ownerName }
                            });
                        }
                    } else {
                        const ownerCheck = validateOwnerProfileComplete(profile);
                        if (!ownerCheck.ok) {
                            extractValidationBullets(ownerCheck.message).forEach((line) => {
                                gaps.push({
                                    text: `${t('المالك', 'Owner')} (${ownerName}): ${line}`,
                                    fixText: t('استكمال بيانات المالك', 'Complete owner data'),
                                    action: { type: 'owner', key: ownerName }
                                });
                            });
                        }
                    }
                });
            }
        }

        prepareTenantAddressBookForContractValidation();
        const { entry: tenantEntry, index: tenantIdx } = getEffectiveTenantEntryForContractValidation(d);
        if (!tenantEntry) {
            gaps.push({
                text: t('المستأجر غير موجود في دفتر العناوين.', 'Tenant not found in address book.'),
                fixText: t('إضافة مستأجر جديد', 'Add new tenant'),
                action: { type: 'newTenant' }
            });
        } else {
            const tenantIssues = isReservationMode
                ? getAddressBookIssuesForReservation(tenantEntry)
                : getAddressBookIssues(tenantEntry, { contractBuilding: building, contractUnit: unit });
            tenantIssues.forEach((issue) => {
                gaps.push({
                    text: `${t('المستأجر', 'Tenant')} (${toStr(tenantEntry.name)}): ${issue}`,
                    fixText: t('استكمال بيانات المستأجر', 'Complete tenant data'),
                    action: { type: 'tenant', index: tenantIdx }
                });
            });
        }

        if (building && unit) {
            const matchedUnit = getUnitRecordByBuildingUnit(building, unit);
            if (!matchedUnit) {
                gaps.push({
                    text: t('الوحدة المختارة غير موجودة في بيانات النظام.', 'Selected unit is not found in system data.'),
                    fixText: t('فتح بيانات العقارات', 'Open properties'),
                    action: { type: 'building', key: resolveBuildingProfileKey(building) || building }
                });
            }
        }

        return gaps;
    }

    function openDataGapFix(index) {
        const item = contractDataGapFixes[index];
        if (!item) return;
        if (isReservationsWorkspaceScreenActive()) {
            upsertReservationFromCurrentForm({ asDraft: true, allowIncomplete: true });
            saveDashboardAux();
        }
        const action = item.action || {};
        closeDataGapsModal();
        if (action.type === 'building') {
            openDashboardWorkspace();
            openDashboardInsight('buildings');
            openBuildingEditor(action.key || '');
            return;
        }
        if (action.type === 'owner') {
            openDashboardWorkspace();
            openDashboardInsight('owners');
            openOwnerEditor(action.key || '');
            return;
        }
        if (action.type === 'ownersList') {
            openDashboardWorkspace();
            openDashboardInsight('owners');
            return;
        }
        if (action.type === 'tenant') {
            openAddressBookWorkspace();
            openAddressBookEntryModal('edit', Number(action.index));
            return;
        }
        if (action.type === 'newTenant') {
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
        }
    }

    async function ensureRelatedDataCompletenessAsync() {
        try {
            ensurePartyInAddressBookFromFormData();
        } catch (_eEnsureParty) {}
        if (bhdSiteFileStorageAvailable()) {
            try {
                await repairAddressBookEntriesAttachmentsFromSite();
            } catch (_eRepSiteVal) {}
        }
        try {
            prepareTenantAddressBookForContractValidation();
        } catch (_ePrepAbVal) {}
        const gaps = collectContractRelatedDataGaps();
        if (!gaps.length) return true;
        contractDataGapFixes = gaps;
        const host = document.getElementById('dataGapsBody');
        if (!host) return false;
        host.innerHTML = `
            <p style="font-size:13px;margin:0 0 10px">${t('يرجى استكمال البيانات التالية أولاً:', 'Please complete the following data first:')}</p>
            <div style="display:flex;flex-direction:column;gap:8px">
                ${gaps.map((g, i) => `
                    <div style="border:1px solid #dde5eb;border-radius:10px;padding:10px;background:#fafcfe;display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
                        <div style="font-size:12px;line-height:1.6">${escHtml(g.text)}</div>
                        <button type="button" class="mini-btn" onclick="openDataGapFix(${i})">${escHtml(g.fixText)}</button>
                    </div>
                `).join('')}
            </div>
        `;
        document.getElementById('dataGapsModal')?.classList.add('open');
        localizeBilingualUi();
        return false;
    }

    function ensureRelatedDataCompleteness() {
        try {
            ensurePartyInAddressBookFromFormData();
        } catch (_eEnsureParty) {}
        try {
            prepareTenantAddressBookForContractValidation();
        } catch (_ePrepAb) {}
        const gaps = collectContractRelatedDataGaps();
        if (!gaps.length) return true;
        contractDataGapFixes = gaps;
        const host = document.getElementById('dataGapsBody');
        if (!host) return false;
        host.innerHTML = `
            <p style="font-size:13px;margin:0 0 10px">${t('يرجى استكمال البيانات التالية أولاً:', 'Please complete the following data first:')}</p>
            <div style="display:flex;flex-direction:column;gap:8px">
                ${gaps.map((g, i) => `
                    <div style="border:1px solid #dde5eb;border-radius:10px;padding:10px;background:#fafcfe;display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
                        <div style="font-size:12px;line-height:1.6">${escHtml(g.text)}</div>
                        <button type="button" class="mini-btn" onclick="openDataGapFix(${i})">${escHtml(g.fixText)}</button>
                    </div>
                `).join('')}
            </div>
        `;
        document.getElementById('dataGapsModal')?.classList.add('open');
        localizeBilingualUi();
        return false;
    }

    function validateContractMeterReadingsOrAlert(d) {
        if (!isContractsWorkspaceScreenActive()) return true;
        const data = d && typeof d === 'object' ? d : getFormData();
        if (!toStr(data.electricityMeterReading).trim()) {
            alert(
                t(
                    '⚠️ قراءة عداد الكهرباء مطلوبة في شاشة العقود.',
                    '⚠️ Electricity meter reading is required in the contracts workspace.'
                )
            );
            try {
                document.getElementById('electricityMeterReading')?.focus();
            } catch (_eF1) {}
            return false;
        }
        if (!toStr(data.waterMeterReading).trim()) {
            alert(
                t(
                    '⚠️ قراءة عداد الماء مطلوبة في شاشة العقود.',
                    '⚠️ Water meter reading is required in the contracts workspace.'
                )
            );
            try {
                document.getElementById('waterMeterReading')?.focus();
            } catch (_eF2) {}
            return false;
        }
        if (!payloadHasContractMeterReadingAttachment(data, 'electricity')) {
            alert(
                t(
                    '⚠️ صورة قراءة عداد الكهرباء مطلوبة.',
                    '⚠️ Electricity meter reading photo is required.'
                )
            );
            try {
                document.getElementById('electricityMeterReadingAttachmentInput')?.click();
            } catch (_eF3) {}
            return false;
        }
        if (!payloadHasContractMeterReadingAttachment(data, 'water')) {
            alert(
                t(
                    '⚠️ صورة قراءة عداد الماء مطلوبة.',
                    '⚠️ Water meter reading photo is required.'
                )
            );
            try {
                document.getElementById('waterMeterReadingAttachmentInput')?.click();
            } catch (_eF4) {}
            return false;
        }
        return true;
    }

    async function validateCoreData() {
        const isReservationMode = isReservationsWorkspaceScreenActive();
        if (isReservationMode) {
            try { refreshReservationFinancialCalculations(); } catch (_eGraceVal) {}
        } else {
            try { refreshContractFinancialCalculations(); } catch (_eFinVal) {}
        }
        const d = isReservationMode ? getReservationFormData() : getFormData();
        const isCoTenantCore = toStr(d.tenantEntityType) === 'company';
        const tenantNameOk = isCoTenantCore
            ? !!(toStr(d.tenantNameAr) || toStr(d.tenantNameEn) || toStr(d.tenantCommercialRegNo))
            : !!(toStr(d.tenantNameAr) || toStr(d.tenantNameEn));
        if (!d.agreementNo || !tenantNameOk || !d.buildingNo || !d.flatNo) {
            alert(t(
                '⚠️ يرجى تعبئة الحقول الأساسية: رقم العقد أو الحجز، اسم المستأجر أو السجل التجاري للشركة، المبنى، ورقم الوحدة.',
                '⚠️ Please fill: agreement/reservation no., tenant or company CR name, building, and unit.'
            ));
            return false;
        }
        if (isReservationMode) {
            if (!validateReservationTenantAddressBookCompleteOrAlert(d)) return false;
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
        } else if (!assertContractRequiresReservationOrDraftOrActiveLease(d.buildingNo, d.flatNo)) {
            return false;
        }
        if (!validateGraceHandoverConsistencyOrAlert(d)) return false;
        if (!isReservationMode && !validateContractMeterReadingsOrAlert(d)) return false;
        if (!(await ensureRelatedDataCompletenessAsync())) return false;
        if (!d.startDate || !d.endDate) {
            alert('⚠️ يرجى تعبئة تاريخ بداية ونهاية العقد.');
            return false;
        }
        if (new Date(d.endDate) < new Date(d.startDate)) {
            alert('⚠️ تاريخ نهاية العقد يجب أن يكون بعد تاريخ البداية.');
            return false;
        }
        if ((parseFloat(d.monthlyRent) || 0) <= 0) {
            alert('⚠️ الإيجار الشهري يجب أن يكون أكبر من صفر.');
            return false;
        }
        if (!validateContractMandatoryDocumentsOrAlert()) return false;
        return true;
    }
    
    function createHeader() {
        return buildOrganizationHeaderHtml({ editable: true });
    }

    /** قالب طباعة الاستمارات الرسمية فقط — بدون إيصال مالي ولا مرفقات / Official form print shell only */
    function documentShellForFormPrint(bodyHtml, formData) {
        const footerHtml = buildContractPrintFooterHtml(formData || getFormData());
        return `
            <table class="doc-print-frame" role="presentation">
                <thead>
                    <tr>
                        <td class="doc-print-thead-cell">${createHeader()}</td>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="doc-print-tbody-cell">${bodyHtml}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td class="doc-print-tfoot-cell">${footerHtml}</td>
                    </tr>
                </tfoot>
            </table>
        `;
    }

    /** يلف المحتوى في جدول ليتكرر الهيدر في كل صفحة عند الطباعة متعددة الصفحات */
    function documentShell(bodyHtml) {
        let receiptHtml = '';
        let attachmentsHtml = '';
        try {
            receiptHtml = buildContractFinancialReceiptHtml();
        } catch (_eRcptShell) {}
        try {
            attachmentsHtml = buildContractAttachmentsSectionHtml();
        } catch (_eAttShell) {}
        const footerHtml = buildContractPrintFooterHtml(getFormData());
        return `
            <table class="doc-print-frame" role="presentation">
                <thead>
                    <tr>
                        <td class="doc-print-thead-cell">${createHeader()}</td>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="doc-print-tbody-cell">${bodyHtml}${receiptHtml}${attachmentsHtml}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td class="doc-print-tfoot-cell">${footerHtml}</td>
                    </tr>
                </tfoot>
            </table>
        `;
    }
    
    // المستند 01 - Residential (كامل)
    function renderResidential() {
        let d = getFormData();
        let municipal = calcMunicipalFees();
        const periodLabel = formatContractPeriodBilingual(d.startDate, d.endDate, d.contractMonths);
        return `
            <div class="doc-title">
                <h2>تأجير وحدة ( مستند رقم 1 )</h2>
                <h3>RENT A UNIT (Documents No 1)</h3>
            </div>
            <table class="info-table">
                <tr><th>النوع / Type</th><td colspan="3" contenteditable="true">${d.type}</td><th>رقم العقد / Agreement No.:</th><td colspan="3" contenteditable="true">${d.agreementNo}</td></tr>
                <tr><th>نوع العقد / Contract Type</th><td colspan="7" contenteditable="true">${d.contractType}</td></tr>
            </table>
            <div class="section-header">بيانات المؤجر (الطرف الأول) / Landlord Details (First Party)</div>
            <table class="info-table"><tr><th>الاسم / Name:</th><td colspan="7" contenteditable="true">سيد فياض بن علي - Syed Fayyaz ali</td></tr></table>
            <div class="section-header">بيانات المستأجر (الطرف الثاني) / Tenant Details (Second Party)</div>
            <table class="info-table">
                <tr><th>أسم المستأجر / Name:</th><td colspan="7" contenteditable="true">${d.tenantNameAr}</td></tr>
                <tr><th>الرقم المدني / الرقم المدني / ID No.:</th><td colspan="3" contenteditable="true">${d.tenantId}</td><th>رقم الجواز / Passport number:</th><td colspan="3" contenteditable="true">${d.tenantPassport}</td></tr>
                <tr><th>رقم النقال / Mobile No:</th><td colspan="3" contenteditable="true">${d.tenantMobile}</td><th>رقم الهاتف البديل / Alternative phone number:</th><td colspan="3" contenteditable="true"></td></tr>
                <tr><th>البريد الإلكتروني / E-mail :</th><td colspan="7" contenteditable="true">${d.tenantEmail}</td></tr>
            </table>
            <div class="section-header">بيانات العقار المستأجر / Property Details</div>
            <table class="info-table">
                <tr><th>رقم المبنى / Building No.:</th><td colspan="3" contenteditable="true">${d.buildingNo}</td><th>الوحدة / Unit (Flat,Office,Shop)</th><td colspan="3" contenteditable="true">${d.unitType}</td></tr>
                <tr><th>تفاصيل الطابق / Floor Details</th><td colspan="3" contenteditable="true">${d.floorDetails}</td><th>رقم الشقة/المحل / Flat/Shop no :</th><td colspan="3" contenteditable="true">${d.flatNo}</td></tr>
                <tr><th>رقم عداد الكهرباء / Electricity Meter Number</th><td colspan="3" contenteditable="true">${d.electricityMeter}</td><th>رقم عداد الماء / Water Meter Number</th><td colspan="3" contenteditable="true">${d.waterMeter}</td></tr>
            </table>
            <div class="section-header">مدة العقد والقيمة الإيجارية / Agreement Period & Rental Value</div>
            <table class="info-table">
                <tr><th>القيمة الإيجارية الشهرية / Monthly Rental Amount :</th><td colspan="3" contenteditable="true">${d.monthlyRent}</td><th>مدة العقد / Contract period :</th><td colspan="3" contenteditable="true">${periodLabel}</td></tr>
                <tr><th>رسوم البلدية / Municipal fees</th><td colspan="3" contenteditable="true">${municipal}</td><th>طريقة الدفع / Payment Method</th><td colspan="3" contenteditable="true">${d.paymentMethod}</td></tr>
                <tr><th>الضمان / Security</th><td colspan="3" contenteditable="true">تحويل بنكي Bank transfer</td><th>رقم الشيك أو الإيصال / check or receipt number</th><td colspan="3" contenteditable="true">4355</td></tr>
                <tr><th>مبلغ المودع / Deposit amount:</th><td colspan="3" contenteditable="true">${d.depositAmount}</td><th>يبدأ من / From :</th><td colspan="3" contenteditable="true">${formatDate(d.startDate, 'ar')}</td></tr>
                <tr><th>ينتهي في / To :</th><td colspan="7" contenteditable="true">${formatDate(d.endDate, 'ar')}</td></tr>
            </table>
            <div class="section-header">شروط وأحكام أخرى / Other terms and conditions</div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">1. هذا النموذج هو جزء لا يتجزأ من اتفاقية الإيجار ، وعقد البلدية ، وشروط الإيجار ، وبتوقيعه ، أوافق على تسجيل عقد الإيجار بالشروط المعمول بهاء أو ما سيتم تحديثه من قبل إدارة العقار. ( للإطلاع على الشروط والقوانين أمسح الباركود او اطلب نسخة رقمية عبر الواتساب 93555643 )</div><div class="text-en" contenteditable="true">1. This form is an integral part of the lease agreement, the municipal contract, and the terms of the lease, and by signing it, I agree to register the lease with the applicable terms or what will be updated by the property management.(To view the terms and conditions, scan the barcode or request a digital copy via WhatsApp 93555643)</div></div></div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">2. توقيع المستأجر على هذا النموذج موافقة على توثيق العقد من قبل السلطات المختصة.</div><div class="text-en" contenteditable="true">2. The tenant's signature on this form constitutes approval of the contract documentation by the competent authorities.</div></div></div>
            ${buildContractPartiesSignatureRowHtml(d)}
        `;
    }
    
    // المستند 02 - Renewal
    function renderRenewal() {
        let d = getFormData();
        const periodLabel = formatContractPeriodBilingual(d.startDate, d.endDate, d.contractMonths);
        return `
            <div class="doc-title"><h2>تأجير وحدة ( مستند رقم 1 ) - تجديد</h2><h3>RENT A UNIT (Documents No 1) - Renewal</h3></div>
            <table class="info-table"><tr><th>النوع / Type</th><td colspan="3" contenteditable="true">تجديد Renewal</td><th>رقم العقد / Agreement No.:</th><td colspan="3" contenteditable="true">${d.agreementNo}</td></tr></table>
            <div class="section-header">بيانات المؤجر (الطرف الأول) / Landlord Details</div>
            <table class="info-table"><tr><th>الاسم / Name:</th><td colspan="7" contenteditable="true">سيد فياض بن علي - Syed Fayyaz ali</td></tr></table>
            <div class="section-header">بيانات المستأجر (الطرف الثاني) / Tenant Details</div>
            <table class="info-table"><tr><th>أسم المستأجر / Name:</th><td colspan="7" contenteditable="true">${d.tenantNameAr}</td></tr>
            <tr><th>الرقم المدني / ID No.:</th><td colspan="3" contenteditable="true">${d.tenantId}</td><th>رقم النقال / Mobile No:</th><td colspan="3" contenteditable="true">${d.tenantMobile}</td></tr></table>
            <div class="section-header">بيانات العقار المستأجر / Property Details</div>
            <table class="info-table"><tr><th>رقم المبنى / Building No.:</th><td colspan="3" contenteditable="true">${d.buildingNo}</td><th>الوحدة / Unit</th><td colspan="3" contenteditable="true">${d.unitType} ${d.flatNo}</td></tr></table>
            <div class="section-header">مدة العقد والقيمة الإيجارية / Agreement Period & Rental Value</div>
            <table class="info-table"><tr><th>القيمة الإيجارية الشهرية / Monthly Rent :</th><td colspan="3" contenteditable="true">${d.monthlyRent}</td><th>مدة العقد / Contract period :</th><td colspan="3" contenteditable="true">${periodLabel}</td></tr>
            <tr><th>رسوم البلدية / Municipal fees</th><td colspan="3" contenteditable="true">${calcMunicipalFees()}</td><th>من / From :</th><td colspan="3" contenteditable="true">${formatDate(d.startDate, 'ar')}</td></tr>
            <tr><th>إلى / To :</th><td colspan="7" contenteditable="true">${formatDate(d.endDate, 'ar')}</td></tr></table>
            <div class="section-header">أحكام التجديد / Renewal Provisions</div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">1. يقر الطرفان، المؤجر والمستأجر، بأنهما اتفقا على تجديد عقد الإيجار المبرم بينهما، ويجوز للمؤجر أو ممثله القانوني أو أي شخص مفوض منه تفويضًا صحيحًا اتخاذ جميع الإجراءات اللازمة لإتمام التجديد والتوقيع على المستندات ذات الصلة نيابة عنه.</div><div class="text-en" contenteditable="true">1. The Parties, namely the Lessor and the Lessee, hereby acknowledge and agree that they have mutually agreed to renew the Lease Agreement previously executed between them. The Lessor, his legal representative, or any person duly authorized by him shall have the authority to complete all renewal procedures and execute any related documents on his behalf.</div></div></div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">2. كما يقر الطرفان بأنهما قد اطلعا على جميع بنود وشروط وأحكام عقد الإيجار السابق، وكافة اللوائح والاشتراطات والتعليمات المنظمة للعلاقة الإيجارية، وأنهما قبلا بها والتزما بالعمل بموجبها.</div><div class="text-en" contenteditable="true">2. The Parties further acknowledge that they have read, reviewed, and understood all the terms, conditions, and provisions of the previous Lease Agreement, as well as all regulations, requirements, and instructions governing the tenancy relationship, and that they accept and undertake to comply with the same.</div></div></div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">3. ويوافق الطرفان بموجب هذه الاستمارة على تجديد عقد الإيجار وفقًا للشروط والأحكام الواردة في عقد الإيجار السابق، والتي تظل سارية ونافذة وملزمة للطرفين ما لم يتم الاتفاق كتابيًا على تعديل أي منها.</div><div class="text-en" contenteditable="true">3. By signing this Renewal Form, the Parties agree to renew the Lease Agreement in accordance with the terms and conditions contained in the previous Lease Agreement, which shall remain valid, effective, and binding upon the Parties unless otherwise amended by a written agreement.</div></div></div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">4. وتُعد هذه الاستمارة ملحقًا مكملًا ومتممًا لعقد الإيجار السابق وجزءًا لا يتجزأ منه، وتُقرأ وتُفسر معه كوثيقة واحدة، وتكون لها ذات القوة والأثر القانوني المترتبين على العقد الأصلي.</div><div class="text-en" contenteditable="true">4. This Renewal Form shall constitute a supplementary addendum to, and an integral part of, the previous Lease Agreement and shall be read and construed together with it as one instrument, having the same legal force and effect as the original agreement.</div></div></div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">5. كما يقر الطرفان بأن توقيعهما على هذه الاستمارة يُعد موافقة صريحة ونهائية وغير مشروطة على تجديد عقد الإيجار واستمرار العلاقة الإيجارية للمدة المتفق عليها، مع بقاء جميع الحقوق والالتزامات والضمانات والتعهدات الناشئة عن عقد الإيجار السابق سارية ونافذة وملزمة للطرفين طوال مدة التجديد.</div><div class="text-en" contenteditable="true">5. The Parties further acknowledge and agree that their signatures on this Renewal Form constitute their explicit, final, and unconditional consent to the renewal of the Lease Agreement and the continuation of the tenancy relationship for the agreed renewal term, with all rights, obligations, warranties, and undertakings arising under the previous Lease Agreement remaining valid, enforceable, and binding upon the Parties throughout the renewal period.</div></div></div>
            ${buildContractPartiesSignatureRowHtml(d)}
        `;
    }
    
    // المستند 03 - Extension Addendum (17 بنداً كاملاً)
    function renderExtension() {
        let d = getFormData();
        return `
            <div class="doc-title"><h2>ملحق عقد إيجار ( مستند رقم 2 - أ )</h2><h3>Extension of Tenancy Agreement (Document No. 2-A)</h3></div>
            <table class="info-table"><tr><th>رقم العقد / Agreement No.:</th><td colspan="7" contenteditable="true">${d.agreementNo}</td></tr></table>
            <div class="section-header">الشروط والأحكام / Terms and Conditions</div>
            ${allClauses.map(c => `
                <div class="clause-block">
                    <div class="clause-title">${c.num}. ${c.titleAr} / ${c.titleEn}</div>
                    <div class="dual-text">
                        <div class="text-ar" contenteditable="true">${c.textAr}</div>
                        <div class="text-en" contenteditable="true">${c.textEn}</div>
                    </div>
                </div>
            `).join('')}
            ${buildGracePeriodDocumentBlockHtml(d)}
            ${buildContractPartiesSignatureRowHtml(d)}
        `;
    }
    
    // المستند 04 - Declaration (كامل)
    function renderDeclaration() {
        let d = getFormData();
        return `
            <div class="doc-title"><h2>إقـــــــــــــــــــــــــــــرار</h2><h3>Declaration Form</h3></div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">بهذا أقر أنا الموقع أدناه بأن العنوان الموضح أدناه هو عنوان إقامتي الصحيح لي لتوجيه كافة المراسلات و الإعلانات و الإخطارات إليه. كما أتعهد بأن أخطر الشركة في حالة حدوث أي تغيير في عنواني المذكور خلال سبعة أيام من تاريخ حدوث ذلك التغيير وإلا أعتبر عنواني السابق المسجل بسجلات الشركة عنواناً وصحيحاً لي للمراسلات.</div><div class="text-en" contenteditable="true">I, the undersigned do hereby declare that the address mentioned hereunder is my correct address for the purpose of sending all notices, correspondences, and publications. I do hereby undertake to give notice / inform to the company in case of any change in my address mentioned below within seven days from the date of such change, otherwise my previous recorded address in my company's records shall be considered as my address for correspondence.</div></div></div>
            <div class="section-header">العنوان الدائم / PERMANENT ADDRESS</div>
            <table class="info-table"><tr><th>الولاية / Wilayat:</th><td contenteditable="true">Bausher</td><th>المنطقة / Region:</th><td contenteditable="true">Muscat</td></tr>
            <tr><th>القرية / Village:</th><td contenteditable="true"></td><th>رقم السكة / Way No:</th><td contenteditable="true"></td></tr>
            <tr><th>الشارع / Street :</th><td contenteditable="true"></td><th>رقم المبنى / Building No:</th><td contenteditable="true">${d.buildingNo}</td></tr>
            <tr><th>أقرب معلم / Nearest Landmark:</th><td contenteditable="true"></td><th>رقم الشقة / Flat No:</th><td contenteditable="true">${d.flatNo}</td></tr>
            <tr><th>الهاتف النقال / GSM No :</th><td contenteditable="true">${d.tenantMobile}</td><th>هاتف المنزل / Office No :</th><td contenteditable="true"></td></tr>
            <tr><th>البريد الإلكتروني / E-mail :</th><td colspan="3" contenteditable="true">${d.tenantEmail}</td></tr></table>
            <div class="section-header">العنوان الحالي / CURRENT ADDRESS</div>
            <table class="info-table"><tr><th>الولاية / Wilayat:</th><td contenteditable="true"></td><th>المنطقة / Region:</th><td contenteditable="true"></td></tr>
            <tr><th>القرية / Village:</th><td contenteditable="true"></td><th>رقم السكة / Way No:</th><td contenteditable="true"></td></tr>
            <tr><th>الشارع / Street :</th><td contenteditable="true"></td><th>رقم المبنى / Building No:</th><td contenteditable="true"></td></tr></table>
            ${buildContractPartiesSignatureRowHtml(d)}
        `;
    }
    
    // المستند 05 - Check-In (مع قائمة الأثاث الكاملة)
    function renderCheckIn() {
        let d = getFormData();
        return `
            <div class="doc-title"><h2>تسجيل دخول المستأجر ( مستند رقم 4 )</h2><h3>Tenant Check-In (Document No. 4)</h3></div>
            <table class="info-table"><tr><th>رقم العقد / Agreement No.:</th><td colspan="3" contenteditable="true">${d.agreementNo}</td><th>المستأجر / Tenant:</th><td colspan="3" contenteditable="true">${d.tenantNameAr}</td></tr>
            <tr><th>المبنى / Building No.:</th><td colspan="3" contenteditable="true">${d.buildingNo}</td><th>رقم الشقة / Flat/Shop no :</th><td colspan="3" contenteditable="true">${d.flatNo}</td></tr></table>
            <div class="section-header">الأثاث والأجهزة / Furniture and appliances</div>
            <table class="info-table furniture-table"><thead><tr><th>الوصف / Description</th><th>العلامة التجارية / Brand</th><th>الحالة / Condition</th><th>العدد / Number</th></tr></thead>
            <tbody>${furnitureItems.map(item => `<tr><td contenteditable="true">${item}</td><td contenteditable="true"></td><td contenteditable="true">صالح Valid</td><td contenteditable="true"></td></tr>`).join('')}
            <tr><td colspan="4" style="background:#f9f9f9"><strong>الملاحظات / Remarks:</strong> <span contenteditable="true"></span></td></tr></tbody></table>
            <div class="section-header">شروط وأحكام / Terms and conditions</div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">هذه الاستمارة هي جزء لا يتجزأ من اتفاقية الإيجار اللاحقة ويكملها وجميع الوثائق اللاحقة. يشار إليه باسم المستند رقم 4.</div><div class="text-en" contenteditable="true">This form is an integral part of and complements the subsequent rental agreement and all subsequent documents. It is referred to as Document #4.</div></div></div>
            ${buildContractPartiesSignatureRowHtml(d)}
        `;
    }
    
    // المستند 06 - Check-Out
    function renderCheckOut() {
        let d = getFormData();
        return `
            <div class="doc-title"><h2>تسجيل خروج المستأجر ( مستند رقم 5 )</h2><h3>Tenant Check-Out (Document No. 5)</h3></div>
            <table class="info-table"><tr><th>رقم العقد / Agreement No.:</th><td colspan="3" contenteditable="true">${d.agreementNo}</td><th>المستأجر / Tenant:</th><td colspan="3" contenteditable="true">${d.tenantNameAr}</td></tr>
            <tr><th>المبنى / Building No.:</th><td colspan="3" contenteditable="true">${d.buildingNo}</td><th>رقم الشقة / Flat/Shop no :</th><td colspan="3" contenteditable="true">${d.flatNo}</td></tr>
            <tr><th>عداد الكهرباء / Electricity Meter</th><td colspan="3" contenteditable="true">${d.electricityMeter}</td><th>عداد الماء / Water Meter</th><td colspan="3" contenteditable="true">${d.waterMeter}</td></tr></table>
            <div class="section-header">تاريخ الإخلاء و القراءات / Eviction date and readings</div>
            <table class="info-table"><tr><th>تاريخ الإخلاء / Eviction date :</th><td contenteditable="true"></td><th>قراءة عداد الكهرباء / Electricity Meter Reading :</th><td contenteditable="true"></td><th>مبلغ الفاتورة / Bill amount :</th><td contenteditable="true"></td></tr>
            <tr><th>قراءة عداد الماء / Water Meter Reading :</th><td contenteditable="true"></td><th>مبلغ الفاتورة / Bill amount :</th><td colspan="3" contenteditable="true"></td></tr></table>
            <div class="section-header">الأثاث والأجهزة / Furniture and appliances</div>
            <table class="info-table"><thead><tr><th>الوصف</th><th>الحالة</th><th>الوصف</th><th>الحالة</th></tr></thead>
            <tbody>${furnitureItems.slice(0,7).map((item,i) => `<tr><td contenteditable="true">${item}</td><td contenteditable="true">صالح</td><td contenteditable="true">${furnitureItems[i+7] || ''}</td><td contenteditable="true">صالح</td></tr>`).join('')}</tbody></table>
            <div class="section-header">إقرارات الخروج / Check-Out Declarations</div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">هذه المستندات جزء لا يتجزأ من اتفاقية الإيجار. يشار إليه باسم المستند رقم 4. يقر المستأجر بأنه أعاد العقار في الحالة المذكورة أعلاه. يتعهد المستأجر بدفع فواتير الماء والكهرباء حتى القراءة الموضحة في هذه الوثيقة، كما يتحمل أي مبالغ تضاف بأثر رجعي نتيجة استخدامه. يتم استلام الوحدة من المستأجر بعد استكمال جميع المستندات المطلوبة وتوقيع نموذج الإلغاء وتسوية جميع الفواتير والإيجارات، ولا يتم استلام المفاتيح إلا بعد التسوية الكاملة.</div><div class="text-en" contenteditable="true">These documents are an integral part of the lease agreement and are referred to as Document No. 4. The tenant acknowledges that the unit has been returned in the condition stated above. The tenant undertakes to settle water and electricity bills up to the readings stated in this document and remains liable for any retroactive charges related to their use. The unit handover is completed only after all required documents are finished, the cancellation form is signed, and all rents and bills are fully settled.</div></div></div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">يتم إرجاع مبلغ التأمين بعد تصفية جميع الالتزامات ودفع جميع الفواتير، وفي حال عدم وجود عيوب أو أضرار ناتجة عن الإهمال أو سوء الاستخدام، وذلك خلال مدة أقصاها أسبوع من توقيع هذا النموذج. تعتبر الصور المرفقة بهذه الوثيقة مكملة لها وجزءاً لا يتجزأ منها (مثل صور عدادات الخدمات وصور الوحدة).</div><div class="text-en" contenteditable="true">The security deposit is returned after settlement of all obligations and bills, and provided there are no defects or damages caused by negligence or misuse, within a maximum of one week after signing this form. Any images attached to this document are considered complementary and form an integral part of it (such as service meter photos and unit photos).</div></div></div>
            ${buildContractPartiesSignatureRowHtml(d)}
        `;
    }
    
    // المستند 07 - Cancellation (كامل)
    function renderCancellation() {
        let d = getFormData();
        return `
            <div class="doc-title"><h2>طلب الغــاء عقــــد الايــجـــار ( مستند رقم 7 )</h2><h3>TENANCY CANCELLATION (Document No. 7)</h3></div>
            <table class="info-table"><tr><th>رقم العقد / Agreement No.:</th><td colspan="3" contenteditable="true">${d.agreementNo}</td><th>المستأجر / Tenant:</th><td colspan="3" contenteditable="true">${d.tenantNameAr}</td></tr>
            <tr><th>الرقم المدني / ID No.:</th><td colspan="3" contenteditable="true">${d.tenantId}</td><th>رقم النقال / Mobile No</th><td colspan="3" contenteditable="true">${d.tenantMobile}</td></tr>
            <tr><th>رقم المبنى / Building No.:</th><td colspan="3" contenteditable="true">${d.buildingNo}</td><th>رقم الشقة / Flat/Shop no :</th><td colspan="3" contenteditable="true">${d.flatNo}</td></tr></table>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">أنا الموقع أدناه أقر بأنني مستأجر للعقار المذكور بياناته أعلاه، وبما أنني لا أرغب في مواصلة الاستئجار فإنني أقر بإلغاء العقد المذكور. ويكون هذا الطلب باطلاً إذا لم تتم تسوية فواتير الماء والكهرباء والإيجار، وتبقى الوحدة تحت مسؤوليتي حتى سداد جميع الالتزامات والمتأخرات. كما أقر بحق المالك أو من ينوب عنه في إعادة تأجير العقار بعد توقيعي، وحقه في قطع الخدمات عند فسخ العقد دون الرجوع إليّ، وأتنازل عن أي اعتراض أو مطالبة.</div><div class="text-en" contenteditable="true">I, the undersigned, acknowledge that I am the tenant of the above-mentioned property and that I request cancellation of the tenancy contract as I do not wish to continue renting. This request is considered void if utility bills and rent are not fully settled, and the unit remains under my responsibility until all dues are paid. I also acknowledge the landlord's right (or their representative's right) to re-rent the property after my signature and to disconnect services upon termination without referring to me, and I waive any objection or claim.</div></div></div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">أقر أيضًا بأن للمالك أو وكيله الحق الكامل في التصرف بمحتويات العقار (استخدامها أو التخلص منها أو إعادة بيعها) إذا لم أقم باستلامها حتى تاريخ التوقيع على هذه الوثيقة، وأتعهد بعدم المطالبة بأي حقوق مالية أو غير مالية. كما أقر بأنه بعد توقيعي لهذا الطلب لا يحق لي أي حق على العقار المذكور، وأن فسخ العقد تم على مسؤوليتي الكاملة.</div><div class="text-en" contenteditable="true">I further acknowledge that the landlord or their representative has full right to deal with the belongings remaining in the property (use, dispose of, or resell them) if I do not collect them by the date of signing this document, and I undertake not to make any financial or non-financial claims. I also acknowledge that after signing this request, I have no right of any kind in the referenced property, and that termination is under my full responsibility.</div></div></div>
            ${buildContractPartiesSignatureRowHtml(d)}
        `;
    }
    
    function isContractPaymentCash() {
        const p = toStr(document.getElementById('paymentMethod')?.value).toLowerCase();
        return p.includes('نقد') || p.includes('cash');
    }

    function formatInvoiceAmtOm(n) {
        return (Math.max(0, parseFloat(n) || 0)).toFixed(3);
    }

    function getInvoicePaymentScheduleRows() {
        let rows = getPaymentScheduleFromUi();
        if (!rows.length) rows = getDefaultPaymentRowsFromForm();
        return [...rows].sort((a, b) => (a.monthIndex || 0) - (b.monthIndex || 0));
    }

    function breakdownInvoiceRowAmount(row) {
        const amt = Math.max(0, parseFloat(toStr(row.amount)) || 0);
        if (!isContractSubjectToVat()) {
            return { rental: amt, vat: 0, total: amt };
        }
        if (isContractVatIncludedWithRent()) {
            const rental = amt / (1 + CONTRACT_VAT_RATE);
            const vat = amt - rental;
            return { rental, vat, total: amt };
        }
        return { rental: amt, vat: 0, total: amt };
    }

    // المستند 08 - Invoice
    function renderInvoice() {
        const d = getFormData();
        const pmLabel = escHtml(toStr(d.paymentMethod) || '—');
        const byChq = isContractPaymentByCheque();
        const byCash = isContractPaymentCash();
        const scheduleRows = getInvoicePaymentScheduleRows();
        const scheduleSectionTitle = byChq
            ? 'جدول الشيكات / Cheques Schedule'
            : byCash
              ? 'جدول الدفع النقدي / Cash Payment Schedule'
              : 'جدول الدفع / Payment Schedule';
        const dateColTitle = byChq
            ? 'تاريخ الشيك / Check date'
            : 'تاريخ الدفع / Due date';
        const totalColTitle = byChq
            ? 'مبلغ الشيك / Check amount'
            : 'المبلغ الإجمالي / Total amount';
        const extraHead = byChq
            ? '<th>رقم الشيك / Cheque no.</th>'
            : '<th>طريقة الدفع / Payment method</th>';
        let mainRows = '';
        scheduleRows.forEach((row, i) => {
            const idx = row.monthIndex || i + 1;
            const label =
                row.isExtraPeriod && row.extraDays
                    ? `${idx} (+${row.extraDays} ${t('يوم', 'd')})`
                    : String(idx);
            const br = breakdownInvoiceRowAmount(row);
            const extraCell = byChq
                ? `<td contenteditable="true">${escHtml(toStr(row.checkNo) || '—')}</td>`
                : `<td contenteditable="true">${pmLabel}</td>`;
            mainRows += `<tr>
                <td contenteditable="true">${escHtml(label)}</td>
                <td contenteditable="true">${escHtml(toStr(row.dueDate) || '—')}</td>
                <td contenteditable="true">${formatInvoiceAmtOm(br.rental)}</td>
                <td contenteditable="true">${formatInvoiceAmtOm(br.vat)}</td>
                <td contenteditable="true">${formatInvoiceAmtOm(br.total)}</td>
                ${extraCell}
            </tr>`;
        });
        if (!mainRows) {
            mainRows = `<tr><td colspan="6" contenteditable="true">${t('لا توجد بيانات جدول دفع — راجع المدة والإيجار.', 'No payment schedule — check term and rent.')}</td></tr>`;
        }
        let vatChequeBlock = '';
        if (isContractSubjectToVat() && !isContractVatIncludedWithRent()) {
            const vatRows = getVatChequeScheduleFromUi();
            if (vatRows.length) {
                let vatBody = '';
                vatRows.forEach((vr) => {
                    const vIdx = vr.chequeIndex || '';
                    const vLabel =
                        vr.isExtraPeriod && vr.extraDays
                            ? `${vIdx} (+${vr.extraDays} ${t('يوم', 'd')})`
                            : String(vIdx);
                    const vAmt = formatInvoiceAmtOm(vr.amount);
                    const vDate = escHtml(toStr(vr.dueDate) || '—');
                    const vChk = escHtml(toStr(vr.checkNo) || '—');
                    vatBody += `<tr>
                        <td contenteditable="true">${escHtml(vLabel)}</td>
                        <td contenteditable="true">${vDate}</td>
                        <td contenteditable="true">0.000</td>
                        <td contenteditable="true">${vAmt}</td>
                        <td contenteditable="true">${vAmt}</td>
                        <td contenteditable="true">${byChq ? vChk : pmLabel}</td>
                    </tr>`;
                });
                vatChequeBlock = `
            <div class="section-header">شيكات الضريبة / VAT Cheques</div>
            <table class="info-table"><thead><tr><th>#</th><th>${dateColTitle}</th><th>مبلغ الإيجار / Rental</th><th>الضريبة / VAT</th><th>${totalColTitle}</th>${extraHead}</tr></thead><tbody>${vatBody}</tbody></table>`;
            }
        }
        const depositAmt = formatInvoiceAmtOm(d.depositAmount);
        const cashNote = byCash
            ? `<div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">طريقة الدفع: نقداً — يُسدَّد كل قسط في تاريخه المحدد أعلاه نقداً حسب الاتفاق. / Payment method: Cash — each instalment is paid in cash on the due date shown above as agreed.</div><div class="text-en" contenteditable="true">Payment method: Cash — each instalment is paid in cash on the due date listed in the schedule above.</div></div></div>`
            : '';
        const chqNote = byChq
            ? `<div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">ملاحظة: شيكات الإيجار يجب أن تكون بإسم محمد سيد فياض علي<br>The Rent cheques should be under Mohammad Syed Fayyaz Ali name</div><div class="text-en" contenteditable="true">Note: Rent cheques should be under Mohammad Syed Fayyaz Ali name</div></div></div>`
            : '';
        return `
            <div class="doc-title"><h2>المتطلبات والفاتورة</h2><h3>Requirement & Invoice</h3></div>
            <table class="info-table">
                <tr><th>رقم العقد / Agreement No.:</th><td colspan="3" contenteditable="true">${escHtml(d.agreementNo)}</td><th>اسم المستأجر / Tenant Name:</th><td colspan="3" contenteditable="true">${escHtml(d.tenantNameAr)}</td></tr>
                <tr><th>طريقة الدفع / Payment method:</th><td colspan="7" contenteditable="true">${pmLabel}</td></tr>
            </table>
            <div class="section-header">${scheduleSectionTitle}</div>
            <table class="info-table"><thead><tr><th>#</th><th>${dateColTitle}</th><th>مبلغ الإيجار / Rental Amount</th><th>الضريبة / VAT</th><th>${totalColTitle}</th>${extraHead}</tr></thead><tbody>${mainRows}</tbody></table>
            ${vatChequeBlock}
            <div class="section-header">المتطلبات / Requirements</div>
            <table class="info-table"><tr>
                <td contenteditable="true">${byChq ? '1. شيكات الإيجار / Rent Cheques' : byCash ? '1. دفعات الإيجار نقداً / Cash rent payments' : '1. دفعات الإيجار / Rent payments'}</td>
                <td contenteditable="true">2. البطاقة المدنية / ID Card</td>
                <td contenteditable="true">3. شيكات الضمان / Security deposit</td>
            </tr></table>
            <div class="section-header">تفاصيل الشيكات والمبالغ الإضافية / Details of checks and additional amounts</div>
            <table class="info-table"><thead><tr><th>#</th><th>البيان / Description</th><th>المبلغ / Amount</th><th>الضريبة / VAT</th><th>الإجمالي / Total</th><th>طريقة الدفع / Payment method</th></tr></thead>
            <tbody>
                <tr><td contenteditable="true">1</td><td contenteditable="true">${t('مبلغ التأمين / Security deposit', 'Security deposit / مبلغ التأمين')}</td><td contenteditable="true">${depositAmt}</td><td contenteditable="true">0.000</td><td contenteditable="true">${depositAmt}</td><td contenteditable="true">${pmLabel}</td></tr>
            </tbody></table>
            ${cashNote}
            ${chqNote}
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">يعتبر هذا المستند جزء من العقد ، ويقرأ معه .</div><div class="text-en" contenteditable="true">This document is considered part of the contract, and it must be read with it.</div></div></div>
            ${buildContractPartiesSignatureRowHtml(d)}
        `;
    }
    
    // المستند 09 - Unit Details
    function renderUnitDetails() {
        let d = getFormData();
        return `
            <div class="doc-title"><h2>تفاصيل الوحدة</h2><h3>Unit Details</h3></div>
            <table class="info-table">
                <tr><th>الموقع / Location,Building</th><td colspan="3" contenteditable="true">${d.buildingNo}</td></tr>
                <tr><th>الوحدة / Unit (Flat, Shop)</th><td colspan="3" contenteditable="true">${d.unitType} ${d.flatNo}</td></tr>
                <tr><th>تفاصيل الطابق / Floor Details</th><td colspan="3" contenteditable="true">${d.floorDetails}</td></tr>
                <tr><th>الرقم المسلسل / Serial Number</th><td colspan="3" contenteditable="true"></td></tr>
                <tr><th>رقم حساب الكهرباء / Electricity Account Number</th><td colspan="3" contenteditable="true">${d.electricityMeter}</td></tr>
                <tr><th>رقم حساب الماء / Water Account Number</th><td colspan="3" contenteditable="true">${d.waterMeter}</td></tr>
            </table>
            ${buildContractPartiesSignatureRowHtml(d)}
        `;
    }
    
    // المستند 10 - Index
    function renderIndex() {
        return `
            <div class="doc-title"><h2>الفهرس</h2><h3>Index</h3></div>
            <table class="info-table" style="width:80%; margin:auto">
                <thead><tr><th>رقم الصفحة / Page NO</th><th>التفاصيل / Details</th></tr></thead>
                <tbody>
                    <tr><td contenteditable="true">1</td><td contenteditable="true">Municipal Agreement / عقد البلدية</td></tr>
                    <tr><td contenteditable="true">2</td><td contenteditable="true">Tenancy Agreement Addendum / ملحق عقد الإيجار</td></tr>
                    <tr><td contenteditable="true">3</td><td contenteditable="true">Personal Guarantee Form / الضمان الشخصي</td></tr>
                    <tr><td contenteditable="true">4</td><td contenteditable="true">Declaration Form / نموذج الإقرار</td></tr>
                    <tr><td contenteditable="true">5</td><td contenteditable="true">Tenant Check-In / تسجيل الدخول</td></tr>
                    <tr><td contenteditable="true">6</td><td contenteditable="true">ID / Passport / البطاقة الشخصية / الجواز</td></tr>
                    <tr><td contenteditable="true">7</td><td contenteditable="true">CR Papers / أوراق السجل التجاري</td></tr>
                    <tr><td contenteditable="true">8</td><td contenteditable="true">PDC Cheque copies / نسخ الشيكات</td></tr>
                </tbody>
            </table>
            ${buildContractPartiesSignatureRowHtml(getFormData())}
        `;
    }
    
    // المستند 11 - Terms & Conditions (كامل)
    function renderFullTermsFromData(d, options = {}) {
        const data = d || getFormData();
        const includeSignature = options.includeSignature !== false;
        const termsSource = Array.isArray(options.clauses) && options.clauses.length ? options.clauses : allClauses;
        const showTitle = options.showTitle !== false;
        const headingHtml = showTitle
            ? `
            <div class="doc-title"><h2>الشروط والأحكام لتأجير الوحدات</h2><h3>Terms and conditions for renting units</h3></div>
            <table class="info-table"><tr><th>رقم العقد / Agreement No.:</th><td colspan="3" contenteditable="true">${data.agreementNo}</td></tr></table>
            <div class="section-header">الشروط والأحكام الكاملة / Complete Terms & Conditions</div>
            `
            : `<div class="section-header">تكملة الشروط والأحكام / Terms continuation</div>`;
        const signatureHtml = includeSignature ? buildContractPartiesSignatureRowHtml(data) : '';
        return `
            ${headingHtml}
            ${termsSource.map(c => `
                <div class="clause-block terms-clause" style="padding:8px 6px;border-bottom:1px dashed #b34a62">
                    <div class="dual-text terms-dual" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start">
                        <div class="text-ar terms-ar" contenteditable="true" style="text-align:right;direction:rtl;font-size:9.2pt;line-height:1.24">
                            <div class="clause-title" style="font-weight:800;color:#6b1f35;margin-bottom:6px">${c.num}. ${c.titleAr}</div>
                            <div>${c.textAr}</div>
                        </div>
                        <div class="text-en terms-en" contenteditable="true" style="text-align:left;direction:ltr;font-family:'Roboto',sans-serif;font-size:9.2pt;line-height:1.24">
                            <div class="clause-title" style="font-weight:800;color:#6b1f35;margin-bottom:6px">${c.num}. ${c.titleEn}</div>
                            <div>${c.textEn}</div>
                        </div>
                    </div>
                </div>
            `).join('')}
            ${signatureHtml}
        `;
    }
    function renderFullTerms() {
        return renderFullTermsFromData(getFormData());
    }
    
    // المستند 12 - Buildings & Owners
    function renderBuildingsOwners() {
        return `
            <div class="doc-title"><h2>قائمة المباني والملاك</h2><h3>Buildings & Owners List</h3></div>
            <div class="section-header">قائمة المواقع / Locations List</div>
            <table class="info-table">
                ${buildingsList.map((b, i) => `<tr><th style="width:5%">${i+1}</th><td contenteditable="true">${b}</td></tr>`).join('')}
                <tr><td colspan="2"><button class="btn-outline" style="margin-top:10px" onclick="addBuilding()">+ إضافة مبنى جديد</button></td></tr>
            </table>
            <div class="section-header">قائمة الملاك / Owners List</div>
            <table class="info-table">
                ${ownersList.map((o, i) => `<tr><th style="width:5%">${i+1}</th><td contenteditable="true">${o}</td></tr>`).join('')}
                <tr><td colspan="2"><button class="btn-outline" style="margin-top:10px" onclick="addOwner()">+ إضافة مالك جديد</button></td></tr>
            </table>
            ${buildContractPartiesSignatureRowHtml(getFormData())}
        `;
    }
    
    const renderers = [
        renderResidential, renderRenewal, renderExtension, renderDeclaration,
        renderCheckIn, renderCheckOut, renderCancellation, renderInvoice,
        renderUnitDetails, renderIndex, renderFullTerms, renderBuildingsOwners
    ];

    function renderDocumentsSystemPanel() {
        const categoriesHost = document.getElementById('documentsSystemCategories');
        const listHost = document.getElementById('documentsSystemList');
        if (!categoriesHost || !listHost) return;
        categoriesHost.innerHTML = DOCUMENT_SYSTEM_CATEGORIES.map((cat) => `
            <button type="button" class="btn-outline ${activeDocumentCategory === cat.key ? 'active' : ''}" onclick="openDocumentsCategory('${cat.key}')">
                ${t(cat.ar, cat.en)}
            </button>
        `).join('');
        const items = DOCUMENT_SYSTEM_LIBRARY[activeDocumentCategory] || [];
        const activeCategory = DOCUMENT_SYSTEM_CATEGORIES.find((c) => c.key === activeDocumentCategory) || DOCUMENT_SYSTEM_CATEGORIES[0];
        listHost.innerHTML = `
            <div><strong>${t('الفئة الحالية', 'Active category')}:</strong> ${t(activeCategory.ar, activeCategory.en)}</div>
            <div style="margin-top:6px">${items.map((name, idx) => `${idx + 1}- ${escHtml(name)}`).join(' &nbsp; | &nbsp; ') || '-'}</div>
        `;
    }

    function openDocumentsCategory(categoryKey) {
        activeDocumentCategory = categoryKey || 'contract_forms';
        renderDocumentsSystemPanel();
        if (activeDocumentCategory === 'contract_forms') {
            renderDocument(currentDoc);
            return;
        }
        const container = document.getElementById('currentDocument');
        if (!container) return;
        container.className = 'document doc-theme-royal-maroon';
        container.innerHTML = documentShell(`
            <div class="doc-title"><h2>${t('نظام المستندات', 'Documents system')}</h2><h3>${t('قوالب المراسلات', 'Letters templates')}</h3></div>
            <div class="section-header">${t('ملاحظة', 'Note')}</div>
            <table class="info-table">
                <tr>
                    <th>${t('الحالة', 'Status')}</th>
                    <td>${t('سيتم ربط هذه القوالب مباشرة بصفحة العقد لسحب بيانات المالك والمستأجر والعقار تلقائياً عند الطباعة.', 'These templates will be linked to the contract page to auto-fill owner, tenant, and property data on print.')}</td>
                </tr>
            </table>
        `);
        const tabsContainer = document.getElementById('tabsContainer');
        if (tabsContainer) {
            tabsContainer.innerHTML = `<button class="tab-btn" onclick="openDocumentsCategory('contract_forms')">${t('↩️ الرجوع إلى استمارات العقود', '↩️ Back to contract forms')}</button>`;
        }
    }
    
    async function renderDocument(index) {
        if (!isViewerMode && isContractsWorkspaceScreenActive() && !isContractWorkspaceUnlockedForCurrentUnit()) {
            renderContractsWorkspaceLockedPlaceholder();
            return;
        }
        activeDocumentCategory = 'contract_forms';
        const max = Math.max(0, (Array.isArray(renderers) ? renderers.length : 1) - 1);
        const safeIndex = Math.max(0, Math.min(typeof index === 'number' && !Number.isNaN(index) ? index : 0, max));
        currentDoc = safeIndex;
        if (!isViewerMode) {
            try {
                sessionStorage.setItem('bhd_ui_current_doc', String(safeIndex));
            } catch (e) {}
        }
        const container = document.getElementById('currentDocument');
        if(!container) return;
        container.className = 'document doc-theme-royal-maroon';
        const renderer = renderers[safeIndex];
        if (typeof renderer !== 'function') return;
        container.innerHTML = documentShell(renderer());
        
        renderDocumentsSystemPanel();
        // تحديث شريط التنقل
        const tabsContainer = document.getElementById('tabsContainer');
        if(tabsContainer) {
            const printBtn = `<button class="tab-btn" onclick="printDocument()">🖨️ طباعة المستند الحالي</button>`;
            tabsContainer.innerHTML = docNames.map((name, i) =>
                `<button class="tab-btn ${i === safeIndex ? 'active' : ''}" onclick="renderDocument(${i})">${i+1}. ${name}</button>`
            ).join('') + printBtn;
        }
        
        // تحديث قائمة المباني في select
        const buildingSelect = document.getElementById('buildingSelect');
        if(buildingSelect) {
            const buildingOptions = getActiveBuildingNames();
            buildingSelect.innerHTML =
                `<option value="">— ${t('اختر مبنى نشط', 'Select active building')} —</option>` +
                buildingOptions.map((b) => `<option value="${escHtml(b)}">${escHtml(b)}</option>`).join('');
            const currentBuilding = document.getElementById('buildingNo')?.value;
            if (currentBuilding && buildingOptions.includes(currentBuilding)) {
                buildingSelect.value = currentBuilding;
            }
        }
        updateSummaryPanel();
        renderOperationsTable();
        refreshContractDocumentAttachmentsSection().catch((e) =>
            console.warn('refreshContractDocumentAttachmentsSection', e)
        );
        refreshLedgerAttachmentPreviewButtons().catch((e) =>
            console.warn('refreshLedgerAttachmentPreviewButtons', e)
        );
    }
    
    async function printDocument() {
        if (!isViewerMode && isContractsWorkspaceScreenActive() && !isContractWorkspaceUnlockedForCurrentUnit()) {
            alertContractWorkspaceLockedOrMissingUnit();
            return;
        }
        if (!(await validateCoreData())) return;
        const d = getFormData();
        if (currentDoc === CONTRACT_CANCELLATION_FORM_07_INDEX) {
            const prefix =
                toStr(d.buildingNo) && toStr(d.flatNo) ? `${toStr(d.buildingNo)}-${toStr(d.flatNo)}` : '';
            await printContractDocumentsByIndices([CONTRACT_CANCELLATION_FORM_07_INDEX], {
                includeFinancialReceipt: false,
                hydrateAttachments: false,
                attachmentItems: [],
                unitPrefix: prefix
            });
            return;
        }
        const reservationNo = toStr(d.agreementNo) || '-';
        const baseDoc = document.querySelector('.document');
        if(!baseDoc) return;
        const printRoot = baseDoc.cloneNode(true);
        printRoot.querySelectorAll('.contract-financial-receipt, .contract-doc-preview-grid, .contract-doc-attachments-block').forEach((el) => {
            const prev = el.previousElementSibling;
            if (prev && prev.classList && prev.classList.contains('section-header')) prev.remove();
            el.remove();
        });
        const win = window.open('', '_blank');
        win.document.write(`
            <!DOCTYPE html>
            <html lang="ar"><head><meta charset="utf-8"><title>${docNames[currentDoc]} - مجموعة سيد فياض العالمية</title>
            <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&family=Roboto&display=swap" rel="stylesheet">
            <style>${buildContractPrintPageMarginCss(d, reservationNo)}${getContractDocumentPrintStylesCss()}
                .contract-financial-receipt, .contract-doc-preview-grid, .contract-doc-preview-card, .contract-doc-attachments-block { display: none !important; }
            </style></head>
            <body dir="rtl">
                ${printRoot.outerHTML}
            </body></html>
        `);
        win.document.close();
        const triggerPrint = () => {
            try { win.focus(); win.print(); } catch (_ePr) {}
        };
        if (win.document.readyState === 'complete') {
            setTimeout(triggerPrint, 350);
        } else {
            win.onload = () => setTimeout(triggerPrint, 350);
        }
    }
    
    async function saveAllDataAsDraft() {
        if (!assertPermissionOrAlert('manage_contracts', 'لا تملك صلاحية حفظ بيانات العقود.', 'No permission to save contracts.')) return;
        if (isReservationsWorkspaceScreenActive()) return;
        if (_contractSaveInProgress) return;
        if (isContractsWorkspaceScreenActive() && !isContractWorkspaceUnlockedForCurrentUnit()) {
            alertContractWorkspaceLockedOrMissingUnit();
            try {
                applyContractsWorkspaceLockState();
            } catch (_eDraftLock) {}
            return;
        }
        loadDashboardAux();
        if (!(await validateCoreData())) return;
        setContractSaveDockBusy(true);
        try {
            const data = enrichPayloadWithResolvedLinkedContractUnits(collectStorableContractFullFromDom());
            try {
                ensureLinkedContractUnitsOnForm(data);
                refreshLinkedContractUnitsPanel(data);
            } catch (_eDraftLinkedUi) {}
            const primary = resolveContractWorkflowPrimaryUnit(data.buildingNo, data.flatNo, data);
            try {
                syncAccountingFromContractPayload(primary.building, primary.unit, data);
            } catch (_eSyncDraft) {}
            const ok = persistContractWorkspaceDraftSilent({ explicit: true });
            if (!ok) {
                alert(
                    t(
                        'تعذّر حفظ المسودة. تأكد من إدخال المبنى والوحدة وبيانات أساسية للمستأجر.',
                        'Could not save draft. Ensure building, unit, and basic tenant data are entered.'
                    )
                );
                return;
            }
            const lsBundle = tryPersistStandardBhdLocalStoresBundle();
            if (!lsBundle.ok) {
                console.error(lsBundle.error);
                alert(
                    t(
                        'تعذّر حفظ قوائم النظام المساعدة: مساحة التخزين المحلي ممتلئة. قد تكون مسودة العقد محفوظة؛ صغّر المرفقات أو استخدم تصفية البيانات ثم أعد المحاولة.',
                        'Could not save auxiliary lists: browser storage is full. The contract draft may already be saved; reduce attachments or use Data cleanup, then retry.'
                    )
                );
                syncBhdKvToServer();
                return;
            }
            syncBhdKvToServer();
            recordSystemActivity({
                actionKey: 'save_contract_draft',
                actionAr: 'حفظ مسودة عقد / Save contract draft',
                actionEn: 'Save contract draft / حفظ مسودة عقد',
                building: toStr(data.buildingNo),
                unit: toStr(data.flatNo),
                ref: toStr(data.agreementNo),
                note: t('حفظ مسودة بيانات العقد (قبل اعتماد المحاسب)', 'Contract data draft save (before accounting approval)')
            });
            alert(
                t(
                    '✅ تم حفظ بيانات العقد كمسودة.\n\nيمكنك العودة لاحقاً لإكمال «حفظ بيانات العقد» بعد اعتماد المحاسب على استلام الضمان وشيك الضمان (إن وُجد).',
                    '✅ Contract data saved as draft.\n\nYou can return later to complete «Save contract data» after accounting confirms deposit and deposit cheque receipt (if any).'
                )
            );
            try {
                updateSummaryPanel();
            } catch (_eSumDraft) {}
            try {
                refreshContractSaveDockAccountingGateUi();
            } catch (_eDraftGateUi) {}
        } finally {
            setContractSaveDockBusy(false);
        }
    }

    async function saveAllData() {
        if (!assertPermissionOrAlert('manage_contracts', 'لا تملك صلاحية حفظ بيانات العقود.', 'No permission to save contracts.')) return;
        if (isReservationsWorkspaceScreenActive()) {
            saveReservationData();
            return;
        }
        if (_contractSaveInProgress) return;
        if (isContractsWorkspaceScreenActive() && !isContractWorkspaceUnlockedForCurrentUnit()) {
            alertContractWorkspaceLockedOrMissingUnit();
            try { applyContractsWorkspaceLockState(); } catch (_eSavLock) {}
            return;
        }
        loadDashboardAux();
        if (isContractsWorkspaceScreenActive()) {
            const preAcctData = applyActorAuditStamp(collectStorableContractFullFromDom());
            if (!assertContractDepositAccountingApprovedForSaveOrAlert(preAcctData)) {
                try {
                    refreshContractSaveDockAccountingGateUi();
                } catch (_eAcctGateSavEarly) {}
                return;
            }
        }
        await refreshAddressBookFromSystemAsync(false);
        if (!(await validateCoreData())) {
            return;
        }
        const preSaveData = applyActorAuditStamp(collectStorableContractFullFromDom());
        setContractSaveDockBusy(true);
        let postSavePrintWin = null;
        let postSavePrintToken = '';
        if (bhdIsDesktopApp() && window.bhdDesktop?.allocPrintWindowToken) {
            try {
                postSavePrintToken = await window.bhdDesktop.allocPrintWindowToken();
            } catch (_ePreTok) {
                postSavePrintToken = '';
            }
        }
        try {
            postSavePrintWin = window.open('', '_blank');
        } catch (_ePreWin) {
            postSavePrintWin = null;
        }
        let data = applyActorAuditStamp(collectStorableContractFullFromDom());
        data.contractSavedAt = new Date().toISOString();
        data.contractSavedStatus = resolveContractLifecycleStatus(data);
        try {
            const ag0 = toStr(data.agreementNo).trim();
            if (ag0 && /^RES-/i.test(ag0)) {
                const nn = nextContractAgreementDraftNumber();
                const agEl = document.getElementById('agreementNo');
                if (agEl) agEl.value = nn;
                data = collectStorableContractFullFromDom();
                try {
                    updateSummaryPanel();
                } catch (_eSum) {}
            }
        } catch (_ePromo) {}

        const persist = tryPersistContractFullWithQuotaBackoff(data);
        if (!persist.ok) {
            if (postSavePrintWin) {
                try {
                    postSavePrintWin.close();
                } catch (_eClose1) {}
            }
            console.error(persist.error);
            const qe = persist.error;
            alert(
                t(
                    'تعذّر حفظ العقد: مساحة التخزين المحلي ممتلئة حتى بعد تخفيض مرافق العقد ذاتها. صغّر أو أزل مرفقات الشيكات والمستندات في النموذج، أو احذف بيانات قديمة عبر تصفية البيانات ثم أعد المحاولة.',
                    'Saving the contract failed: browser storage quota is full even after slimming embedded contract payloads. Reduce cheque/document attachments or use Data cleanup, then retry.'
                )
            );
            syncBhdKvToServer();
            setContractSaveDockBusy(false);
            return;
        }
        data = persist.saved;
        recordSystemActivity({
            actionKey: 'save_contract',
            actionAr: 'حفظ عقد / Save contract',
            actionEn: 'Save contract / حفظ عقد',
            building: toStr(data.buildingNo),
            unit: toStr(data.flatNo),
            ref: toStr(data.agreementNo),
            note: t('حفظ نهائي لبيانات العقد', 'Final contract data save')
        });
        if (persist.stripLevel > 0) syncDomSnapshotFromSlimContractPayload(data);
        const lsBundle = tryPersistStandardBhdLocalStoresBundle();
        if (!lsBundle.ok) {
            if (postSavePrintWin) {
                try {
                    postSavePrintWin.close();
                } catch (_eClose2) {}
            }
            console.error(lsBundle.error);
            alert(
                t(
                    'تعذّر حفظ قوائم النظام: مساحة التخزين المحلي ما زالت ممتلئة بعد تقليل الملفات المضمّنة في الدفتر أو العقارات أو نسخ الحجوزات. بيانات العقد الحالية قد تكون محفوظاً؛ استخدم تصفية البيانات أو صِغْ المرفقات ثم حاول «حفظ جميع البيانات» مرة أخرى.',
                    'Could not save auxiliary lists: browser storage is still full after trimming address book/property/reservation data. The contract record may already be saved; run Data cleanup or reduce attachments, then tap Save all data again.'
                )
            );
            syncBhdKvToServer();
            setContractSaveDockBusy(false);
            return;
        }
        syncBhdKvToServer();
        try {
            if (contractEntryContext?.renewal && contractEntryContext?.previousContractSnapshot) {
                const prev = contractEntryContext.previousContractSnapshot;
                const prevAg = toStr(prev.agreementNo);
                const newAg = toStr(data.agreementNo);
                if (prevAg && newAg && prevAg !== newAg) {
                    archiveSupersededContractPayload(prev, {
                        reason: 'renewal',
                        supersededBy: newAg
                    });
                }
                contractEntryContext = { mode: 'contract', unit: null };
            }
        } catch (_eArchRen) {}
        try {
            mirrorTenancyPayloadToLinkedUnits(data, (unitPayload, bKey, uKey) => {
                if (!bKey || !uKey) return;
                const linked = getLinkedContractUnitsFromPayload(data);
                const merged =
                    linked.length > 1
                        ? {
                              ...unitPayload,
                              linkedContractUnits: linked,
                              linkedContractUnitsJson: JSON.stringify(linked)
                          }
                        : unitPayload;
                upsertSavedContractForUnit(bKey, uKey, merged, merged.contractSavedStatus || data.contractSavedStatus);
                try {
                    revokeContractEditGrant(bKey, uKey);
                } catch (_eRevGrantEach) {}
                removeTenancyContractDraftForKeys(bKey, uKey);
            });
        } catch (_eMirrorSav) {
            upsertSavedContractForUnit(data.buildingNo, data.flatNo, data, data.contractSavedStatus);
            try {
                revokeContractEditGrant(data.buildingNo, data.flatNo);
            } catch (_eRevGrant) {}
            removeTenancyContractDraftForKeys(data.buildingNo, data.flatNo);
        }
        try {
            repairLinkedContractUnitsLifecycleConsistency();
        } catch (_eSavLinkedSync) {}
        if (data.contractSavedStatus === 'active') {
            try {
                exitContractAdditionalDataMode();
                exitContractActivationDataMode();
            } catch (_eExitAdd) {}
            contractFullEditMode = false;
        } else if (data.contractSavedStatus === 'active_pending') {
            try {
                ensureLinkedContractUnitsOnForm(data);
                refreshLinkedContractUnitsPanel(data);
            } catch (_eLinkedPending) {}
            try {
                applyContractDepositAttachmentFieldLock();
            } catch (_eDepPending) {}
            try {
                enterContractAdditionalDataMode(data);
            } catch (_eReAdd) {}
        } else if (data.contractSavedStatus === 'active_docs_pending') {
            try {
                exitContractAdditionalDataMode();
            } catch (_eExitDocs) {}
            contractFullEditMode = false;
            try {
                enterContractActivationDataMode(data);
            } catch (_eActMode) {}
            try {
                refreshPropertyDocumentsBundleSectionVisibility();
            } catch (_ePdbVis) {}
            setTimeout(() => {
                try {
                    if (
                        confirm(
                            t(
                                '✅ اكتملت بيانات العقد والشيكات.\n\nالخطوة التالية (إلزامية قبل التفعيل):\n• رقم استمارة العقد البلدي\n• رقم العقد البلدي\n• رفع أوراق العقار الكاملة (سكنر)\n\nهل تريد فتح نافذة رفع المستندات الآن؟',
                                '✅ Contract data and cheques are complete.\n\nNext step (required before activation):\n• Municipal contract form no.\n• Municipal contract no.\n• Upload full property papers (scanner)\n\nOpen the upload window now?'
                            )
                        )
                    ) {
                        openPropertyDocumentsBundleModal({
                            building: data.buildingNo,
                            unit: data.flatNo
                        });
                    }
                } catch (_ePdbPrompt) {}
            }, 400);
        } else if (data.contractSavedStatus === 'active_accounting_pending') {
            try {
                exitContractAdditionalDataMode();
                exitContractActivationDataMode();
            } catch (_eExitAcct) {}
            contractFullEditMode = false;
            setTimeout(() => {
                try {
                    alert(
                        t(
                            '✅ اكتملت بيانات العقد والمستندات.\n\nالخطوة التالية: اعتماد المحاسب على استلام الضمان وسلامة الشيكات من شاشة المحاسبة → بانتظار الاعتماد.',
                            '✅ Contract data and documents are complete.\n\nNext: accountant must confirm deposit and cheque receipt in Accounting → Pending.'
                        )
                    );
                } catch (_eAcctPrompt) {}
            }, 400);
        }
        setTenancyDraftCompletionFieldLocks(false);
        try { setTenantIdentityLockedFromAddressBook(false); } catch (_eAbClrSav) {}
        try {
            applyTenancyAndTenantFieldLocks();
        } catch (_ePostSavLock) {}
        try {
            applyContractsWorkspaceLockState();
        } catch (_ePostSavCws) {}
        const stripWarn =
            persist.stripLevel > 0
                ? t(
                      '⚠ تم حفظ العقد بتخفيض نسخ الملفات الكبيرة داخل التخزين المحلي لتفادي الامتلاء. أعد رفع أو أعد استيراد مرفقات الشيكات أو المستندات من دفتر العناوين إذا احتجت الطباعة الكاملة لهذه الجلسة.',
                      '⚠ Saved with reduced embedded copies in browser storage (quota relief). Re-upload cheque copies or pull mandatory docs again from the address book if you need full files for printing in this browser.'
                  ) + '\n\n'
                : '';
        const okSaved = t(
            `✅ تم حفظ جميع البيانات بنجاح!${
                isBhdSiteKvPersistenceActive()
                    ? ' (تم حفظها في PostgreSQL على الخادم)'
                    : bhdApiAvailable
                      ? ' (تم حفظها في قاعدة البيانات المحلية أيضاً)'
                      : ''
            }`,
            `✅ All data saved successfully!${
                isBhdSiteKvPersistenceActive()
                    ? ' (Saved to PostgreSQL on the server.)'
                    : bhdApiAvailable
                      ? ' (Also stored in the local database.)'
                      : ''
            }`
        );
        const lsReliefAny =
            lsBundle.relievedAddressBook ||
            lsBundle.relievedBuildingProfiles ||
            lsBundle.relievedOwnerProfiles ||
            lsBundle.relievedReservationSnapshots;
        const lsReliefNote =
            lsReliefAny
                ? '\n\n' +
                  t(
                      '⚠ خُفِّفت أيضاً النسخ المضمَّنة المحلّية في دفتر العناوين أو مستندات العقار أو نسخ الحجوزات لتفادي امتلاء مساحة المتصفّح؛ راجع تلك السجلات وأعد إرفاق الملفات عند الحاجة لمطابقات الطباعة.',
                      '⚠ Stored copies in the address book, building records, or reservation snapshots were also reduced to satisfy browser quota; revisit those entries and re-attach files when you need originals for printing.'
                  )
                : '';
        showContractPrintFormsPanel({ openMenu: true });
        try {
            renderOperationsTable();
        } catch (_eOps) {}
        let printResult = { ok: false };
        try {
            const printPrefix =
                toStr(data.buildingNo) && toStr(data.flatNo)
                    ? `${toStr(data.buildingNo)}-${toStr(data.flatNo)}`
                    : '';
            printResult = await printContractDocumentsByIndices(CONTRACT_POST_SAVE_PRINT_INDICES, {
                targetWindow: postSavePrintWin,
                printToken: postSavePrintToken,
                suppressAlerts: true,
                closeOnFail: true,
                attachmentItems: await resolveContractWorkspacePrintableAttachments(),
                unitPrefix: printPrefix
            });
        } catch (_ePrSav) {}
        const pendingNote =
            data.contractSavedStatus === 'active_pending'
                ? '\n\n' +
                  t(
                      'ℹ️ الحالة: نشط — مطلوب بيانات إضافية (البلدي أو الشيكات). أكملها من شاشة العقود ثم احفظ مرة أخرى.',
                      'ℹ️ Status: Active — additional data required (municipal refs or cheques). Complete them in Contracts workspace and save again.'
                  )
                : '';
        const printNote =
            printResult && printResult.ok
                ? ''
                : '\n\n' +
                  t(
                      '⚠️ لم تُفتح نافذة الطباعة تلقائياً. اسمح بالنوافذ المنبثقة لهذا الموقع، أو استخدم «طباعة مجموعة الحفظ (01+03+04+08)» من القائمة أعلاه.',
                      '⚠️ The print window did not open automatically. Allow pop-ups for this site, or use «Post-save set (01+03+04+08)» from the menu above.'
                  );
        alert(stripWarn + okSaved + lsReliefNote + pendingNote + printNote);
        if (data.contractSavedStatus === 'active') {
            try {
                openFormsWorkspace();
            } catch (_eNavForms) {}
        }
        setContractSaveDockBusy(false);
        try {
            applySavedContractEditLock();
        } catch (_ePostSavLockBtn) {}
    }

    async function exportDataFile() {
        if (!assertPermissionOrAlert('import_export', 'لا تملك صلاحية تصدير البيانات.', 'No permission to export data.')) return;
        loadDashboardAux();
        const data = {
            contract: getFormData(),
            buildings: buildingsList,
            owners: ownersList,
            addressBookEntries,
            fileRegistry,
            unitReservations,
            evictionRequests,
            ownerBuildingMap,
            buildingProfiles,
            ownerProfiles,
            managedUnitsData,
            usersRegistry,
            contractEditRequests: loadContractEditRequests(),
            contractEditGrants: loadContractEditGrants(),
            addressBookEditRequests: loadAddressBookEditRequests(),
            addressBookEditGrants: loadAddressBookEditGrants(),
            passwordResetRequests: loadPasswordResetRequests(),
            exportedAt: new Date().toISOString()
        };
        const json = JSON.stringify(data, null, 2);
        const defaultName = `bhd-real-estate-${data.contract.agreementNo || 'draft'}-${new Date().toISOString().slice(0, 10)}.json`;
        if (window.bhdDesktop) {
            try {
                const toFolder = confirm(t(
                    'حفظ في مجلد exports داخل بيانات التطبيق؟\nموافق = مجلد البيانات، إلغاء = اختر مكان الحفظ',
                    'Save to the app data exports folder?\nOK = data folder, Cancel = pick save location'
                ));
                const dest = toFolder
                    ? await window.bhdDesktop.exportJsonToDataFolder(json, defaultName)
                    : await window.bhdDesktop.exportJsonDialog(json, defaultName);
                if (dest) alert(t('✓ تم التصدير: ', '✓ Exported: ') + dest);
            } catch (err) {
                alert(t('فشل التصدير: ', 'Export failed: ') + (err && err.message ? err.message : String(err)));
            }
            return;
        }
        const blob = new Blob([json], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = defaultName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
    }

    async function triggerImport() {
        if (window.bhdDesktop) {
            if (!assertPermissionOrAlert('import_export', 'لا تملك صلاحية استيراد البيانات.', 'No permission to import data.')) return;
            try {
                const text = await window.bhdDesktop.importJsonDialog();
                if (text) importDataFileFromJsonText(text);
            } catch (err) {
                alert(t('فشل الاستيراد: ', 'Import failed: ') + (err && err.message ? err.message : String(err)));
            }
            return;
        }
        const input = document.getElementById('importFileInput');
        if (input) input.click();
    }

    function importDataFileFromJsonText(text) {
            if (!assertPermissionOrAlert('import_export', 'لا تملك صلاحية استيراد البيانات.', 'No permission to import data.')) return;
            try {
                const parsed = JSON.parse(text);
                const data = parsed.contract || {};
                const skipImportKeys = new Set([
                    'extraAdjustments',
                    'extraAdjustmentsJson',
                    'insuranceDepositItems',
                    'insuranceDepositItemsJson',
                    'customRentItems',
                    'customRentItemsJson',
                    'paymentSchedule',
                    'paymentScheduleJson',
                    'type'
                ]);
                Object.keys(getFormData()).forEach((key) => {
                    if (skipImportKeys.has(key)) return;
                    const el = document.getElementById(key === 'contractType' ? 'contractTypeSelect' : key === 'type' ? 'typeSelect' : key);
                    if (el && data[key] !== undefined && data[key] !== null && typeof data[key] !== 'object') {
                        el.value = data[key];
                    }
                });
                if (!toStr(data.agreedRentPaymentDay) && data.agreedRentPaymentDate) {
                    try {
                        const dt0 = new Date(data.agreedRentPaymentDate);
                        if (!Number.isNaN(dt0.getTime())) {
                            const el0 = document.getElementById('agreedRentPaymentDay');
                            if (el0) el0.value = String(dt0.getDate());
                        }
                    } catch (e) {}
                }
                try {
                    if (data.paymentScheduleJson) {
                        const arr = JSON.parse(toStr(data.paymentScheduleJson) || '[]');
                        renderPaymentScheduleFromRows(Array.isArray(arr) ? arr : []);
                    } else if (Array.isArray(data.paymentSchedule) && data.paymentSchedule.length) {
                        renderPaymentScheduleFromRows(data.paymentSchedule);
                    }
                } catch (e2) {}
                try {
                    if (data.extraAdjustmentsJson) {
                        renderExtraAdjustmentsRows(JSON.parse(toStr(data.extraAdjustmentsJson) || '[]'));
                    }
                } catch (e3) {}
                try {
                    if (data.insuranceDepositItemsJson) {
                        renderInsuranceDepositItemsRows(JSON.parse(toStr(data.insuranceDepositItemsJson) || '[]'));
                    }
                } catch (e4) {}
                try {
                    if (data.customRentItemsJson) {
                        renderCustomRentItemsRows(JSON.parse(toStr(data.customRentItemsJson) || '[]'));
                    }
                } catch (e5) {}
                ensureTypeSelectAlwaysNew();

                if (Array.isArray(parsed.buildings) && parsed.buildings.length) {
                    buildingsList.length = 0;
                    parsed.buildings.forEach((b) => buildingsList.push(String(b)));
                }
                if (Array.isArray(parsed.owners) && parsed.owners.length) {
                    ownersList.length = 0;
                    parsed.owners.forEach((o) => ownersList.push(String(o)));
                }
                if (Array.isArray(parsed.fileRegistry)) {
                    fileRegistry = parsed.fileRegistry.map((x) => ({
                        id: x.id || `reg_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
                        building: toStr(x.building),
                        unit: toStr(x.unit),
                        tenant: toStr(x.tenant),
                        docType: toStr(x.docType) || 'Other',
                        fileName: toStr(x.fileName),
                        filePath: toStr(x.filePath),
                        source: toStr(x.source),
                        notes: toStr(x.notes),
                        updatedAt: x.updatedAt || new Date().toISOString()
                    }));
                }
                if (Array.isArray(parsed.addressBookEntries)) {
                    addressBookEntries = parsed.addressBookEntries.map((x) => {
                        if (toStr(x.type) === 'company') {
                            return {
                                type: 'company',
                                name: toStr(x.name),
                                nameEn: toStr(x.nameEn),
                                companyAttachmentSchema: Number(x.companyAttachmentSchema) || 1,
                                commercialRegNo: toStr(x.commercialRegNo),
                                commercialRegExpiryDate: toStr(x.commercialRegExpiryDate),
                                commercialRegAttachment: x.commercialRegAttachment || null,
                                leaseContractAttachment: x.leaseContractAttachment || null,
                                mobile: toStr(x.mobile),
                                extraMobile: toStr(x.extraMobile),
                                email: toStr(x.email),
                                signatories: Array.isArray(x.signatories)
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
                                    }),
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
                if (Array.isArray(parsed.unitReservations)) {
                    unitReservations = parsed.unitReservations.map((x) => ({
                        building: toStr(x.building),
                        unit: toStr(x.unit),
                        reservedBy: toStr(x.reservedBy || x.tenant || x.by),
                        phone: toStr(x.phone),
                        since: toStr(x.since || x.date) || new Date().toISOString().slice(0, 10),
                        state: toStr(x.state) === 'confirmed' ? 'confirmed' : 'draft',
                        formData: (x.formData && typeof x.formData === 'object') ? x.formData : null,
                        details: toStr(x.details)
                    }));
                }
                if (Array.isArray(parsed.evictionRequests)) {
                    evictionRequests = parsed.evictionRequests.map((x) => ({
                        building: toStr(x.building),
                        unit: toStr(x.unit),
                        tenant: toStr(x.tenant),
                        requestDate: toStr(x.requestDate) || new Date().toISOString().slice(0, 10),
                        plannedDate: toStr(x.plannedDate),
                        notes: toStr(x.notes)
                    }));
                }
                if (parsed.ownerBuildingMap && typeof parsed.ownerBuildingMap === 'object') {
                    ownerBuildingMap = Object.keys(parsed.ownerBuildingMap).reduce((acc, owner) => {
                        const key = toStr(owner);
                        const list = Array.isArray(parsed.ownerBuildingMap[owner]) ? parsed.ownerBuildingMap[owner] : [];
                        acc[key] = list.map((b) => toStr(b)).filter(Boolean);
                        return acc;
                    }, {});
                }
                if (parsed.buildingProfiles && typeof parsed.buildingProfiles === 'object') {
                    buildingProfiles = parsed.buildingProfiles;
                }
                if (parsed.ownerProfiles && typeof parsed.ownerProfiles === 'object') {
                    ownerProfiles = parsed.ownerProfiles;
                }
                if (Array.isArray(parsed.managedUnitsData)) {
                    managedUnitsData = parsed.managedUnitsData;
                } else {
                    syncManagedUnitsFromProfiles();
                }
                if (Array.isArray(parsed.usersRegistry)) {
                    const basePerm = {};
                    BHD_PERMISSION_DEFS.forEach((p) => { basePerm[p.key] = false; });
                    usersRegistry = parsed.usersRegistry
                        .map((u) => {
                            const mergedPerm = { ...basePerm, ...(typeof u.permissions === 'object' ? u.permissions : {}) };
                            return normalizeUserRecord({
                                id: toStr(u.id) || generateUserRecordId(),
                                role: toStr(u.role),
                                displayName: toStr(u.displayName),
                                email: toStr(u.email),
                                phone: toStr(u.phone),
                                notes: toStr(u.notes),
                                password: toStr(u.password),
                                permissions: mergedPerm,
                                createdAt: u.createdAt || '',
                                createdBy: toStr(u.createdBy),
                                updatedAt: u.updatedAt || '',
                                updatedBy: toStr(u.updatedBy)
                            });
                        })
                        .filter((u) => u.email);
                    validateAuthSession();
                }
                if (Array.isArray(parsed.passwordResetRequests)) {
                    localStorage.setItem('bhd_password_reset_requests', JSON.stringify(parsed.passwordResetRequests));
                }
                if (Array.isArray(parsed.addressBookEditRequests)) {
                    localStorage.setItem('bhd_addressbook_edit_requests', JSON.stringify(parsed.addressBookEditRequests));
                }
                if (parsed.addressBookEditGrants && typeof parsed.addressBookEditGrants === 'object') {
                    localStorage.setItem('bhd_addressbook_edit_grants', JSON.stringify(parsed.addressBookEditGrants));
                }
                if (Array.isArray(parsed.contractEditRequests)) {
                    localStorage.setItem('bhd_contract_edit_requests', JSON.stringify(parsed.contractEditRequests));
                }
                if (parsed.contractEditGrants && typeof parsed.contractEditGrants === 'object') {
                    localStorage.setItem('bhd_contract_edit_grants', JSON.stringify(parsed.contractEditGrants));
                }

                localStorage.setItem('bhd_unit_reservations', JSON.stringify(unitReservations));
                localStorage.setItem('bhd_eviction_requests', JSON.stringify(evictionRequests));
                localStorage.setItem('bhd_owner_building_map', JSON.stringify(ownerBuildingMap));
                localStorage.setItem('bhd_building_profiles', JSON.stringify(buildingProfiles));
                localStorage.setItem('bhd_owner_profiles', JSON.stringify(ownerProfiles));
                localStorage.setItem('bhd_address_book', JSON.stringify(addressBookEntries));
                localStorage.setItem('bhd_managed_units', JSON.stringify(managedUnitsData));
                localStorage.setItem('bhd_users_registry', JSON.stringify(usersRegistry));
                localStorage.setItem('bhd_auth_session', JSON.stringify(authSession));

                try { syncTenantEntityFieldsFromType(); } catch (eSyn) {}
                try { hydrateContractDocumentsFromStoredJson(); } catch (eHydr) {}
                try { mergeMandatoryDocsFromAddressBookAfterLoadIfMatch(); } catch (eAb2) {}

                renderDocument(currentDoc);
                updateAuthHeaderBar();
                renderAddressBookTable();
                syncBhdKvToServer();
                alert('✅ تم استيراد البيانات بنجاح.');
            } catch (err) {
                alert('❌ ملف البيانات غير صالح. يرجى اختيار ملف JSON صحيح.');
            }
    }

    function importDataFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => importDataFileFromJsonText(e.target.result);
        reader.readAsText(file, 'utf-8');
    }
    
    async function loadAllDataFromDisk() {
        if (bhdApiAvailable) await pullBhdKvFromServer();
        loadAllData(true);
    }

    function loadAllData(showAlert = true) {
        const saved = localStorage.getItem('bhd_contract_full');
        if(saved) {
            const data = JSON.parse(saved);
            document.getElementById('agreementNo').value = data.agreementNo;
            document.getElementById('contractTypeSelect').value = data.contractType;
            if (document.getElementById('municipalFormNo')) document.getElementById('municipalFormNo').value = data.municipalFormNo || '';
            if (document.getElementById('municipalContractNo')) document.getElementById('municipalContractNo').value = data.municipalContractNo || '';
            document.getElementById('typeSelect').value = data.type;
            document.getElementById('tenantNameAr').value = data.tenantNameAr;
            document.getElementById('tenantNameEn').value = data.tenantNameEn;
            document.getElementById('tenantId').value = data.tenantId;
            document.getElementById('tenantMobile').value = data.tenantMobile;
            document.getElementById('tenantPassport').value = data.tenantPassport || '';
            document.getElementById('tenantEmail').value = data.tenantEmail || '';
            if (document.getElementById('tenantEntityType')) document.getElementById('tenantEntityType').value = data.tenantEntityType || 'person';
            if (document.getElementById('tenantCommercialRegNo')) document.getElementById('tenantCommercialRegNo').value = data.tenantCommercialRegNo || '';
            if (document.getElementById('tenantCommercialRegExpiryDate')) document.getElementById('tenantCommercialRegExpiryDate').value = data.tenantCommercialRegExpiryDate || '';
            if (document.getElementById('tenantCompanyExtraMobile')) document.getElementById('tenantCompanyExtraMobile').value = data.tenantCompanyExtraMobile || '';
            if (document.getElementById('tenantCompanySignatoriesJson')) document.getElementById('tenantCompanySignatoriesJson').value = data.tenantCompanySignatoriesJson || '[]';
            if (document.getElementById('tenantNationality')) {
                try { ensureTenantNationalitySelect(false); } catch (e) {}
                document.getElementById('tenantNationality').value = data.tenantNationality || 'عماني / Omani';
            }
            if (document.getElementById('contractMandatoryDocsJson')) document.getElementById('contractMandatoryDocsJson').value = data.contractMandatoryDocsJson || '{}';
            if (document.getElementById('contractOtherDocsJson')) document.getElementById('contractOtherDocsJson').value = data.contractOtherDocsJson || '[]';
            document.getElementById('buildingNo').value = data.buildingNo;
            document.getElementById('flatNo').value = data.flatNo;
            document.getElementById('floorDetails').value = data.floorDetails;
            document.getElementById('unitType').value = data.unitType;
            if (document.getElementById('usageType')) document.getElementById('usageType').value = data.usageType || 'سكني Residential';
            document.getElementById('electricityMeter').value = data.electricityMeter;
            document.getElementById('waterMeter').value = data.waterMeter;
            document.getElementById('monthlyRent').value = data.monthlyRent;
            if (document.getElementById('rentCalcMode')) document.getElementById('rentCalcMode').value = data.rentCalcMode || 'full';
            if (document.getElementById('rentAreaSqm')) document.getElementById('rentAreaSqm').value = data.rentAreaSqm || '';
            if (document.getElementById('rentPerSqm')) document.getElementById('rentPerSqm').value = data.rentPerSqm || '';
            document.getElementById('contractMonths').value = data.contractMonths;
            document.getElementById('startDate').value = data.startDate;
            document.getElementById('endDate').value = data.endDate;
            try {
                if (toStr(data.startDate) && toStr(data.endDate)) {
                    recomputeContractPeriodFields('endDate');
                } else if (toStr(data.startDate) && toStr(data.contractMonths)) {
                    recomputeContractPeriodFields('contractMonths');
                }
            } catch (_ePeriodLoad) {}
            if (document.getElementById('unitHandoverDate')) document.getElementById('unitHandoverDate').value = data.unitHandoverDate || '';
            if (document.getElementById('agreedRentPaymentDay')) {
                let dayVal = toStr(data.agreedRentPaymentDay);
                if (!dayVal && data.agreedRentPaymentDate) {
                    try {
                        const dt = new Date(data.agreedRentPaymentDate);
                        if (!Number.isNaN(dt.getTime())) dayVal = String(dt.getDate());
                    } catch (e) {}
                }
                document.getElementById('agreedRentPaymentDay').value = dayVal || '5';
            }
            document.getElementById('paymentMethod').value = data.paymentMethod;
            if (document.getElementById('contractSubjectToVat')) {
                document.getElementById('contractSubjectToVat').value = data.contractSubjectToVat || 'no';
            }
            if (document.getElementById('vatPaymentMode')) {
                document.getElementById('vatPaymentMode').value = data.vatPaymentMode || 'with_rent';
            }
            if (document.getElementById('vatChequeCount')) {
                document.getElementById('vatChequeCount').value = data.vatChequeCount || '1';
            }
            document.getElementById('depositAmount').value = data.depositAmount;
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
            try { refreshContractFinancialCalculations(); } catch (_eGraceLoad) {}
            if (document.getElementById('otherDiscountAmount')) document.getElementById('otherDiscountAmount').value = data.otherDiscountAmount || '0';
            try { renderExtraAdjustmentsRows(JSON.parse(toStr(data.extraAdjustmentsJson) || '[]')); } catch (e) { renderExtraAdjustmentsRows([]); }
            try { renderInsuranceDepositItemsRows(JSON.parse(toStr(data.insuranceDepositItemsJson) || '[]')); } catch (e) { renderInsuranceDepositItemsRows([]); }
            try { renderCustomRentItemsRows(JSON.parse(toStr(data.customRentItemsJson) || '[]')); } catch (e) { renderCustomRentItemsRows([]); }
            try {
                hydrateContractPaymentAndVatSchedulesFromPayload(data, { refreshVatWithRent: true });
            } catch (_eVatLoad) {}
            ensureTypeSelectAlwaysNew();
            try { syncTenantEntityFieldsFromType(); } catch (e) {}
            try { hydrateContractDocumentsFromStoredJson(); } catch (eHydr) {}
            try { refreshContractFinancialCalculations(); } catch (_eLoadFin) {}
            try { syncContractPeriodDisplay(); } catch (_ePerLoad) {}
            try { renderDocument(currentDoc); } catch (_eLoadDoc) {}
        }
        const savedBuildings = localStorage.getItem('bhd_buildings_list');
        if(savedBuildings) {
            buildingsList.length = 0;
            JSON.parse(savedBuildings).forEach(b => buildingsList.push(b));
        }
        const savedOwners = localStorage.getItem('bhd_owners_list');
        if(savedOwners) {
            ownersList.length = 0;
            JSON.parse(savedOwners).forEach(o => ownersList.push(o));
        }
        const savedOwnerProfiles = localStorage.getItem('bhd_owner_profiles');
        if (savedOwnerProfiles) {
            try {
                ownerProfiles = JSON.parse(savedOwnerProfiles) || {};
            } catch (e) {
                ownerProfiles = {};
            }
        }
        const savedAddressBook = localStorage.getItem('bhd_address_book');
        if (savedAddressBook) {
            try {
                addressBookEntries = JSON.parse(savedAddressBook) || [];
                if (!Array.isArray(addressBookEntries)) addressBookEntries = [];
            } catch (e) {
                addressBookEntries = [];
            }
        }
        try { mergeMandatoryDocsFromAddressBookAfterLoadIfMatch(); } catch (eAbPost) {}
        const savedProfiles = localStorage.getItem('bhd_building_profiles');
        if (savedProfiles) {
            try {
                buildingProfiles = JSON.parse(savedProfiles) || {};
            } catch (e) {
                buildingProfiles = {};
            }
        }
        const savedManagedUnits = localStorage.getItem('bhd_managed_units');
        if (savedManagedUnits) {
            try {
                managedUnitsData = JSON.parse(savedManagedUnits) || [];
            } catch (e) {
                managedUnitsData = [];
            }
        } else {
            syncManagedUnitsFromProfiles();
        }
        const savedRegistry = localStorage.getItem('bhd_file_registry');
        if (savedRegistry) {
            try {
                const parsed = JSON.parse(savedRegistry);
                if (Array.isArray(parsed)) fileRegistry = parsed;
            } catch (e) {
                fileRegistry = [];
            }
        }
        const savedUsersReg = localStorage.getItem('bhd_users_registry');
        if (savedUsersReg) {
            try {
                usersRegistry = JSON.parse(savedUsersReg) || [];
                if (!Array.isArray(usersRegistry)) usersRegistry = [];
            } catch (e) {
                usersRegistry = [];
            }
        } else {
            usersRegistry = [];
        }
        try {
            ensureDefaultBhdAdminAccount();
        } catch (eEnsLd) {}
        try {
            authSession = JSON.parse(localStorage.getItem('bhd_auth_session') || 'null');
            if (!authSession || typeof authSession !== 'object') authSession = null;
        } catch (e) {
            authSession = null;
        }
        validateAuthSession();
        if(isViewerMode) {
            renderDocument(currentDoc);
        } else {
            updateSummaryPanel();
            updateAuthHeaderBar();
            renderOperationsTable();
            renderRegistryTable();
            renderAddressBookTable();
            try { populateAddressBookTypeSelect('tenant'); } catch (_eAbTypes) {}
        }
        if (!isViewerMode) {
            try {
                restoreTenancyCompletionLockFromStorage();
            } catch (eRestoreAfterLoad) {}
        }
        try { applyContractsWorkspaceLockState(); } catch (_eLoadLock) {}
        try {
            rememberContractWorkspaceUnitPointers(
                document.getElementById('buildingNo')?.value,
                document.getElementById('flatNo')?.value
            );
        } catch (_ePtrLoad) {}
        if (showAlert) {
            alert('📂 تم استعادة البيانات المحفوظة');
        }
    }

    function buildRuntimePayload() {
        return {
            contract: getFormData(),
            buildings: [...buildingsList],
            owners: [...ownersList],
            fileRegistry: [...fileRegistry],
            currentDoc
        };
    }

    async function openDocumentsWindow(payloadOverride = null, options = {}) {
        if (
            !isViewerMode &&
            !assertPermissionOrAlert(
                'manage_contracts',
                'لا تملك صلاحية العقود والمستندات.',
                'No permission to access contracts & documents.'
            )
        ) {
            return;
        }
        if (!isViewerMode && isContractsWorkspaceScreenActive() && !isContractWorkspaceUnlockedForCurrentUnit()) {
            alertContractWorkspaceLockedOrMissingUnit();
            try { applyContractsWorkspaceLockState(); } catch (_eDocLock) {}
            return;
        }
        if (!(await validateCoreData())) return;
        const payload = payloadOverride || buildRuntimePayload();
        const payloadKey = options.payloadKey || 'bhd_runtime_payload';
        localStorage.setItem(payloadKey, JSON.stringify(payload));
        const baseUrl = window.location.href.split('?')[0];
        const params = new URLSearchParams({ viewer: '1', payloadKey });
        if (options.autoPrint) params.set('autoprint', '1');
        window.open(`${baseUrl}?${params.toString()}`, '_blank');
    }

    function syncTopNavOffset() {
        if (isViewerMode) return;
        const nav = document.getElementById('appTopNav');
        if (!nav) return;
        const gapPx = Math.round((0.2 / 2.54) * 96); // 0.2 cm in px
        const navHeight = Math.ceil(nav.getBoundingClientRect().height || 0);
        const offsetPx = navHeight + gapPx;
        document.body.style.setProperty('--top-nav-offset', `${offsetPx}px`);
        document.body.style.setProperty('--workspace-top-gap', `${offsetPx}px`);
    }

    function pickLocalizedSegment(text) {
        const src = String(text || '');
        if (!src.includes('/')) return src;
        const parts = src.split('/').map((p) => p.trim()).filter(Boolean);
        if (parts.length < 2) return src;
        const hasArabic = (s) => /[\u0600-\u06FF]/.test(s);
        if (appUiLanguage === 'ar') {
            return parts.find((p) => hasArabic(p)) || parts[0];
        }
        return parts.find((p) => !hasArabic(p)) || parts[parts.length - 1];
    }

    function localizeBilingualUi(scopeRoot) {
        if (isViewerMode) return;
        const allRoots = ['.dashboard', '.contracts-workspace', '.reservations-workspace', '.users-workspace', '.notifications-workspace', '.addressbook-workspace', '.accounting-workspace', '.maintenance-workspace', '#addressBookEntryModal', '#dashboardInsightModal', '#unitDetailsModal', '#unitDetailsCancelDraftModal', '#unitDetailsCancellationDocsModal', '#unitHistoryEventDetailModal', '#unitAccountingDetailModal', '#accountingChequeActionModal', '#accountingManualEntryModal', '#accountingApprovalModal', '#accountingContractReceiptModal', '#accountingContractChequeBulkReceiptModal', '#accountingPropertyReviewModal', '#accountingAuditCycleModal', '#appDialogModal', '#manualEntryReceivablePickerModal', '#accountingCoaEditorModal', '#accountingUnitAccountModal', '#accountingReportModal', '#maintenanceRequestModal', '#maintenanceDetailModal', '#maintenancePrintModal', '#maintenanceCatalogModal', '#maintenanceStatusActionModal', '#maintenanceUnitHistoryModal', '#authLoginModal', '#contractEditThreadModal', '#propertyPrintMenuModal', '#dataGapsModal', '#dataCleanupModal', '#storageManagementModal', '#contractRenewalGapsModal'];
        const roots = scopeRoot ? [scopeRoot] : allRoots;
        const selector = 'h1,h2,h3,h4,h5,h6,p,small,strong,span,label,button,th,td,option,input,textarea,select';
        roots.forEach((rootSel) => {
            const root = document.querySelector(rootSel);
            if (!root) return;
            root.querySelectorAll(selector).forEach((el) => {
                if (el.hasAttribute('data-ar') && el.hasAttribute('data-en')) return;
                if (el.querySelector && el.querySelector('input,textarea,select')) return;
                if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && el.children.length === 0) {
                    const sourceText = el.dataset.i18nSourceText || el.textContent;
                    if (typeof sourceText === 'string' && sourceText.includes('/')) {
                        el.dataset.i18nSourceText = sourceText;
                        el.textContent = pickLocalizedSegment(sourceText);
                    }
                }
                if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && el.children.length > 0) {
                    const textNodes = Array.from(el.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE && toStr(n.nodeValue).trim());
                    if (textNodes.length === 1) {
                        const sourceText = el.dataset.i18nSourceText || textNodes[0].nodeValue;
                        if (typeof sourceText === 'string' && sourceText.includes('/')) {
                            el.dataset.i18nSourceText = sourceText;
                            textNodes[0].nodeValue = ` ${pickLocalizedSegment(sourceText)} `;
                        }
                    }
                }
                const placeholder = el.dataset.i18nSourcePlaceholder || el.getAttribute('placeholder');
                if (typeof placeholder === 'string' && placeholder.includes('/')) {
                    el.dataset.i18nSourcePlaceholder = placeholder;
                    el.setAttribute('placeholder', pickLocalizedSegment(placeholder));
                }
                const title = el.dataset.i18nSourceTitle || el.getAttribute('title');
                if (typeof title === 'string' && title.includes('/')) {
                    el.dataset.i18nSourceTitle = title;
                    el.setAttribute('title', pickLocalizedSegment(title));
                }
            });
        });
    }

    function applyAppLanguage(options) {
        const fast = options && options.fast === true;
        document.documentElement.lang = appUiLanguage === 'en' ? 'en' : 'ar';
        document.documentElement.dir = appUiLanguage === 'en' ? 'ltr' : 'rtl';
        document.body.style.direction = appUiLanguage === 'en' ? 'ltr' : 'rtl';
        document.body.classList.remove('lang-ar', 'lang-en');
        document.body.classList.add(appUiLanguage === 'en' ? 'lang-en' : 'lang-ar');
        const langButtons = document.querySelectorAll('[data-ar][data-en]');
        langButtons.forEach((btn) => {
            if (btn.querySelector && btn.querySelector('input,textarea,select,button,a,table,div')) return;
            btn.textContent = appUiLanguage === 'en' ? btn.dataset.en : btn.dataset.ar;
        });
        document.querySelectorAll('.app-top-nav [data-ar][data-en], .dashboard-main-nav [data-ar][data-en]').forEach((btn) => {
            btn.textContent = appUiLanguage === 'en' ? btn.dataset.en : btn.dataset.ar;
        });
        const langToggleBtn = document.getElementById('langToggleTopBtn');
        if (langToggleBtn) {
            langToggleBtn.textContent = appUiLanguage === 'en' ? '🌐 English' : '🌐 العربية';
            langToggleBtn.title = appUiLanguage === 'en'
                ? 'Change language to Arabic'
                : 'تغيير اللغة إلى الإنجليزية';
        }
        if (fast) {
            syncTopNavOffset();
            const finishLang = () => {
                try {
                    localizeBilingualUi();
                    updateAuthHeaderBar();
                } catch (_eLangIdle) {}
            };
            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(finishLang, { timeout: 4000 });
            } else {
                setTimeout(finishLang, 80);
            }
            return;
        }
        localizeBilingualUi();
        updateAuthHeaderBar();
        if (!isViewerMode && document.body.classList.contains('mode-dashboard')) {
            renderOperationsTable();
            renderRegistryTable();
        }
        syncTopNavOffset();
    }

    function toggleAppLanguage() {
        appUiLanguage = appUiLanguage === 'en' ? 'ar' : 'en';
        localStorage.setItem('bhd_ui_language', appUiLanguage);
        applyAppLanguage();
    }

    function updateSideNavActive(mode) {
        const targets = document.querySelectorAll('[data-nav-target]');
        targets.forEach((btn) => {
            const isActive = btn.dataset.navTarget === mode;
            btn.classList.toggle('btn-primary', isActive);
            btn.classList.toggle('btn-outline', !isActive);
        });
        const adminBtn = document.getElementById('appTopNavAdminBtn');
        if (adminBtn) {
            const adminActive = mode === 'users' || mode === 'forms' || mode === 'organization' || mode === 'doc_templates';
            adminBtn.classList.toggle('btn-primary', adminActive);
            adminBtn.classList.toggle('btn-outline', !adminActive);
        }
    }

    function canAccessAppAdminMenu() {
        if (!usersRegistryHasRows()) return true;
        return (
            effectivePermission('manage_users') ||
            effectivePermission('import_export') ||
            effectivePermission('manage_contracts')
        );
    }

    function applyAppAdminMenuPermissions() {
        const setItemVisible = (el, ok) => {
            if (!el) return;
            el.style.display = ok ? '' : 'none';
            el.disabled = !ok;
            el.setAttribute('aria-hidden', ok ? 'false' : 'true');
        };
        document.querySelectorAll('[data-admin-perm]').forEach((el) => {
            const perm = el.getAttribute('data-admin-perm');
            let ok = true;
            if (perm === 'manage_users') ok = effectivePermission('manage_users');
            else if (perm === 'import_export') ok = effectivePermission('import_export');
            else if (perm === 'manage_contracts') ok = effectivePermission('manage_contracts');
            setItemVisible(el, ok);
        });
        document.querySelectorAll('[data-admin-perm-any]').forEach((el) => {
            const raw = toStr(el.getAttribute('data-admin-perm-any'));
            const keys = raw.split(',').map((x) => x.trim()).filter(Boolean);
            setItemVisible(el, keys.length ? effectivePermissionAny(keys) : true);
        });
        const menuOk = canAccessAppAdminMenu();
        document.querySelectorAll('.app-admin-menu-wrap').forEach((wrap) => {
            const items = wrap.querySelectorAll('[data-admin-perm], [data-admin-perm-any]');
            const anyItem = [...items].some((el) => el.style.display !== 'none');
            wrap.style.display = menuOk && anyItem ? '' : 'none';
            wrap.setAttribute('aria-hidden', menuOk && anyItem ? 'false' : 'true');
        });
    }

    function closeAppAdminMenus() {
        document.querySelectorAll('.app-admin-menu-panel').forEach((panel) => {
            panel.hidden = true;
        });
    }

    function toggleAppAdminMenu(ev, panelId) {
        if (ev) ev.stopPropagation();
        if (!canAccessAppAdminMenu()) {
            alert(t('لا تملك صلاحية الإعدادات والإدارة.', 'No permission for settings & admin.'));
            return;
        }
        const panel = document.getElementById(panelId || 'appTopNavAdminPanel');
        if (!panel) return;
        const open = panel.hidden;
        closeAppAdminMenus();
        try {
            closeAddressBookPrintMenu();
        } catch (_eAb) {}
        try {
            closeContractPrintMenu();
        } catch (_eCp) {}
        panel.hidden = !open;
    }

    function canAccessWorkspaceMode(mode) {
        if (!usersRegistryHasRows() || isViewerMode) return true;
        if (mode === 'dashboard') return effectivePermission('manage_dashboard');
        if (mode === 'contracts') return effectivePermissionAny(['manage_contracts', 'view_own_contract']);
        if (mode === 'reservations' || mode === 'forms') return effectivePermission('manage_contracts');
        if (mode === 'users') return effectivePermission('manage_users');
        if (mode === 'addressbook') return effectivePermissionAny(['manage_owners', 'manage_contracts', 'view_address_book']);
        if (mode === 'notifications') return canAccessNotificationsPage();
        if (mode === 'accounting') return effectivePermission('manage_accounting');
        if (mode === 'maintenance') return canAccessMaintenanceWorkspace();
        if (mode === 'organization') return canAccessOrganizationSettingsWorkspace();
        if (mode === 'doc_templates') return canAccessDocumentTemplatesWorkspace();
        return true;
    }

    function renderDashboardWorkspaceStaged() {
        try {
            renderOperationsTable();
        } catch (_eDashOps) {}
        requestAnimationFrame(() => {
            try {
                renderRegistryTable();
            } catch (_eDashReg) {}
            const idle = () => {
                try {
                    renderDashboardModuleHub();
                    renderDashboardCalendar();
                } catch (_eDashIdle) {}
            };
            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(idle, { timeout: 2500 });
            } else {
                setTimeout(idle, 60);
            }
        });
    }

    function renderWorkspaceModeContent(mode) {
        if (mode === 'contracts') {
            updateContractWorkspaceContextUi();
            updateSummaryPanel();
            try {
                applyContractsWorkspaceLockState();
            } catch (_eSetCws) {}
            if (contractsWorkspaceSubview === 'list') {
                try {
                    renderContractsListPanel();
                } catch (_eClR) {}
            }
            if (isContractWorkspaceUnlockedForCurrentUnit()) {
                try {
                    refreshContractDocumentsForPreview();
                } catch (_eDocMode) {}
            }
        } else if (mode === 'reservations') {
            updateReservationsWorkspaceUi();
            updateReservationSummaryPanel();
            if (reservationsWorkspaceSubview === 'list') {
                try {
                    renderReservationsListPanel();
                } catch (_eRlR) {}
            }
        } else if (mode === 'forms') {
            updateContractWorkspaceContextUi();
            updateSummaryPanel();
            renderDocument(currentDoc);
        } else if (mode === 'dashboard') {
            renderDashboardWorkspaceStaged();
        } else if (mode === 'users') {
            loadDashboardAux();
            renderUsersManagementPage();
            updateAuthHeaderBar();
        } else if (mode === 'organization') {
            renderOrganizationSettingsPage();
            updateAuthHeaderBar();
            document.getElementById('organizationWorkspace')?.scrollIntoView({ block: 'start' });
        } else if (mode === 'doc_templates') {
            renderDocumentTemplatesPage();
            updateAuthHeaderBar();
            document.getElementById('docTemplatesWorkspace')?.scrollIntoView({ block: 'start' });
        } else if (mode === 'addressbook') {
            renderAddressBookTable();
            updateAuthHeaderBar();
        } else if (mode === 'notifications') {
            loadDashboardAux();
            renderNotificationsPage();
            updateAuthHeaderBar();
        } else if (mode === 'accounting') {
            renderAccountingWorkspace();
            updateAuthHeaderBar();
            scheduleCoaLinksSyncIfNeeded();
        } else if (mode === 'maintenance') {
            renderMaintenanceWorkspace();
            updateAuthHeaderBar();
        }
    }

    function setWorkspaceMode(mode) {
        if (isViewerMode) return;
        if (mode !== 'contracts') contractFullEditMode = false;
        if (!canAccessWorkspaceMode(mode)) {
            if (localStorage.getItem('bhd_site_integrated') === '1' && typeof window.__bhdReapplySiteBridge === 'function') {
                window.__bhdReapplySiteBridge();
                syncAuthStateFromStorage();
            }
            const fallbacks = ['dashboard', 'contracts', 'accounting', 'maintenance', 'addressbook', 'notifications', 'users'];
            const next = fallbacks.find((m) => canAccessWorkspaceMode(m));
            if (!next) {
                alert(t('لا تملك صلاحية الوصول. سجّل الدخول بحساب مناسب.', 'No access permission. Sign in with a suitable account.'));
                try {
                    openAuthLoginModal();
                } catch (_eWsLogin) {}
                return;
            }
            mode = next;
        }
        const sameMode = mode === _activeWorkspaceMode;
        _activeWorkspaceMode = mode;
        document.body.classList.remove('mode-dashboard', 'mode-contracts', 'mode-reservations', 'mode-forms', 'mode-users', 'mode-addressbook', 'mode-notifications', 'mode-accounting', 'mode-maintenance', 'mode-organization', 'mode-doc_templates');
        if (mode === 'contracts') document.body.classList.add('mode-contracts');
        else if (mode === 'reservations') document.body.classList.add('mode-reservations');
        else if (mode === 'forms') document.body.classList.add('mode-forms');
        else if (mode === 'users') document.body.classList.add('mode-users');
        else if (mode === 'organization') document.body.classList.add('mode-organization');
        else if (mode === 'doc_templates') document.body.classList.add('mode-doc_templates');
        else if (mode === 'addressbook') document.body.classList.add('mode-addressbook');
        else if (mode === 'notifications') document.body.classList.add('mode-notifications');
        else if (mode === 'accounting') document.body.classList.add('mode-accounting');
        else if (mode === 'maintenance') document.body.classList.add('mode-maintenance');
        else document.body.classList.add('mode-dashboard');
        if (mode === 'reservations') {
            try {
                setReservationFormFlowActive(true);
            } catch (_swmRes) {}
        } else if (mode === 'contracts') {
            try {
                setReservationFormFlowActive(false);
            } catch (_swmCon) {}
        }
        const badge = document.getElementById('screenBadge');
        if (badge) {
            if (mode === 'users') badge.textContent = t('إدارة المستخدمين', 'Users');
            else if (mode === 'notifications') badge.textContent = t('التنبيهات والمهام', 'Notifications & tasks');
            else if (mode === 'accounting') badge.textContent = t('المحاسبة', 'Accounting');
            else if (mode === 'maintenance') badge.textContent = t('الصيانة', 'Maintenance');
            else if (mode === 'addressbook') badge.textContent = t('دفتر العناوين', 'Address book');
            else if (mode === 'reservations') badge.textContent = t('صفحة الحجوزات', 'Reservations');
            else if (mode === 'forms') badge.textContent = t('نظام المستندات', 'Documents system');
            else if (mode === 'organization') badge.textContent = t('إعدادات المنشأة', 'Organization settings');
            else if (mode === 'doc_templates') badge.textContent = t('قوالب المستندات', 'Document templates');
            else badge.textContent = t('لوحة البيانات والمعلومات', 'Dashboard overview');
        }
        const contractsBadge = document.getElementById('contractsScreenBadge');
        if (contractsBadge) {
            contractsBadge.textContent =
                mode === 'contracts'
                    ? t('وضع العمل: بيانات العقد والمستندات', 'Work mode: contract data and documents')
                    : mode === 'forms'
                      ? t('وضع العمل: نظام المستندات والطباعة', 'Work mode: documents system and printing')
                      : '';
        }
        const reservationsBadge = document.getElementById('reservationsScreenBadge');
        if (reservationsBadge) {
            reservationsBadge.textContent =
                mode === 'reservations'
                    ? t('وضع العمل: صفحة الحجوزات المنفصلة', 'Work mode: standalone reservations page')
                    : t('إدارة الحجوزات / Reservations management', 'إدارة الحجوزات / Reservations management');
        }
        const baseUrl = window.location.href.split('?')[0];
        const modeParam =
            mode === 'contracts'
                ? 'contracts'
                : mode === 'reservations'
                  ? 'reservations'
                  : mode === 'forms'
                    ? 'forms'
                    : mode === 'users'
                      ? 'users'
                      : mode === 'addressbook'
                        ? 'addressbook'
                        : mode === 'notifications'
                          ? 'notifications'
                          : mode === 'accounting'
                            ? 'accounting'
                            : mode === 'maintenance'
                              ? 'maintenance'
                              : mode === 'organization'
                                ? 'organization'
                                : mode === 'doc_templates'
                                  ? 'doc_templates'
                                  : 'dashboard';
        try {
            sessionStorage.setItem('bhd_ui_last_mode', modeParam);
            localStorage.setItem('bhd_ui_last_mode', modeParam);
        } catch (e) {}
        window.history.replaceState({}, '', `${baseUrl}?mode=${modeParam}`);
        syncTopNavOffset();
        updateSideNavActive(mode);
        if ((mode === 'contracts' || mode === 'forms') && window.__bhdContractRestorePending) {
            window.__bhdContractRestorePending = false;
            requestAnimationFrame(() => {
                try {
                    restoreContractWorkspaceOnStartup();
                } catch (_eWsRestore) {}
            });
        }
        requestAnimationFrame(() => {
            try {
                applyPermissionNavUi();
            } catch (_eNavWs) {}
        });
        if (sameMode) {
            try {
                window.scrollTo(0, 0);
            } catch (_eScrollSame) {}
            return;
        }
        const renderToken = ++_workspaceContentRenderToken;
        requestAnimationFrame(() => {
            if (renderToken !== _workspaceContentRenderToken) return;
            try {
                renderWorkspaceModeContent(mode);
            } catch (_eWsRender) {
                console.warn('renderWorkspaceModeContent', _eWsRender);
            }
            try {
                window.scrollTo(0, 0);
            } catch (_eScrollWs) {}
        });
    }

    function openDashboardWorkspace() {
        if (
            !assertPermissionOrAlert(
                'manage_dashboard',
                'لا تملك صلاحية لوحة المعلومات.',
                'No permission to access the dashboard.'
            )
        ) {
            return;
        }
        setWorkspaceMode('dashboard');
    }

    let contractsWorkspaceSubview = 'list';
    let reservationsWorkspaceSubview = 'list';
    const contractsListSortState = { key: 'building', dir: 'asc' };
    const reservationsListSortState = { key: 'building', dir: 'asc' };

    function hasActiveContractFormSession() {
        const b = toStr(document.getElementById('buildingNo')?.value);
        const f = toStr(document.getElementById('flatNo')?.value);
        const tenant = toStr(document.getElementById('tenantNameAr')?.value);
        return !!(b && f) || !!tenant;
    }

    function showContractsWorkspaceView(view) {
        contractsWorkspaceSubview = view === 'form' ? 'form' : 'list';
        const listEl = document.getElementById('contractsListPanel');
        const formEl = document.getElementById('contractsFormPanel');
        const backBar = document.getElementById('contractsFormBackBar');
        if (listEl) listEl.hidden = contractsWorkspaceSubview !== 'list';
        if (formEl) formEl.hidden = contractsWorkspaceSubview !== 'form';
        if (backBar) backBar.style.display = contractsWorkspaceSubview === 'form' ? 'block' : 'none';
        if (contractsWorkspaceSubview === 'list') renderContractsListPanel();
        if (contractsWorkspaceSubview === 'form') {
            try {
                refreshLinkedContractUnitsPanel();
            } catch (_eCwLinked) {}
            try {
                syncContractDepositFieldsFromAccountingToDom();
            } catch (_eCwDepSync) {}
            try {
                applyContractDepositAttachmentFieldLock();
            } catch (_eCwDepLock) {}
        }
    }

    function showReservationsWorkspaceView(view) {
        reservationsWorkspaceSubview = view === 'form' ? 'form' : 'list';
        const listEl = document.getElementById('reservationsListPanel');
        const formEl = document.getElementById('reservationsFormPanel');
        const backBar = document.getElementById('reservationsFormBackBar');
        if (listEl) listEl.hidden = reservationsWorkspaceSubview !== 'list';
        if (formEl) formEl.hidden = reservationsWorkspaceSubview !== 'form';
        if (backBar) backBar.style.display = reservationsWorkspaceSubview === 'form' ? 'block' : 'none';
        if (reservationsWorkspaceSubview === 'list') renderReservationsListPanel();
        if (reservationsWorkspaceSubview === 'form') {
            try {
                applyReservationDepositAttachmentFieldLock();
            } catch (_eResDepLock) {}
            try { renderAddressBookTenantSelect(); } catch (_eAbResForm) {}
        }
    }

    function toggleContractsListFilterRow() {
        const row = document.getElementById('contractsListFilterRow');
        if (row) row.hidden = !row.hidden;
    }

    function toggleReservationsListFilterRow() {
        const row = document.getElementById('reservationsListFilterRow');
        if (row) row.hidden = !row.hidden;
    }

    function setContractsListSort(key) {
        if (contractsListSortState.key === key) {
            contractsListSortState.dir = contractsListSortState.dir === 'asc' ? 'desc' : 'asc';
        } else {
            contractsListSortState.key = key;
            contractsListSortState.dir = 'asc';
        }
        renderContractsListPanel();
    }

    function setReservationsListSort(key) {
        if (reservationsListSortState.key === key) {
            reservationsListSortState.dir = reservationsListSortState.dir === 'asc' ? 'desc' : 'asc';
        } else {
            reservationsListSortState.key = key;
            reservationsListSortState.dir = 'asc';
        }
        renderReservationsListPanel();
    }

    function collectContractsListSourceRows() {
        try {
            repairSavedContractsByUnitMapStorageKeys();
        } catch (_eRepKeysList) {}
        const map = loadSavedContractsByUnitMap(true);
        const seen = new Set();
        const groupSeen = new Set();
        const rows = [];
        const pushMultiUnitRow = (b, u, p, savedEntry, base) => {
            const linked = getLinkedContractUnitsFromPayload(p);
            if (linked.length <= 1) return false;
            const groupKey = getMultiUnitContractGroupKey(b, u, p);
            if (groupSeen.has(groupKey)) return true;
            groupSeen.add(groupKey);
            const primary = resolveContractWorkflowPrimaryUnit(b, u, p);
            const pb = primary.building;
            const pu = primary.unit;
            linked.forEach((lu) => {
                seen.add(_tenancyDraftStorageKey(pb, lu.unit));
            });
            const primaryPayload = getContractPayloadForUnit({ building: pb, unit: pu }) || p;
            const hasSaved = !!savedEntry || !!getTenancyDraftPayloadForUnit({ building: pb, unit: pu });
            const primaryRef =
                getUnitsData().find(
                    (x) =>
                        normalizeReservationBuildingKey(x.building) === normalizeReservationBuildingKey(pb) &&
                        normalizeUnit(x.unit) === pu
                ) || { building: pb, unit: pu, status: hasSaved ? 'Rented' : base?.status || '' };
            rows.push({
                building: pb,
                unit: formatLinkedContractUnitsLabel(primaryPayload),
                ownerNames: toStr(primaryRef.ownerNames) || formatOwnerNamesForBuilding(pb),
                tenant: toStr(primaryPayload?.tenantNameAr || primaryRef.tenant),
                agreementNo: toStr(primaryPayload?.agreementNo || primaryRef.agreementNo),
                endDate: toStr(primaryPayload?.endDate || primaryRef.endDate),
                status: primaryRef.status || base?.status || '',
                _unitRef: primaryRef,
                _linkedUnits: linked,
                _isMultiUnit: true,
                _groupKey: groupKey
            });
            return true;
        };
        Object.values(map).forEach((entry) => {
            const p = entry?.payload;
            if (!p) return;
            pushMultiUnitRow(toStr(p.buildingNo), toStr(p.flatNo), p, entry, null);
        });
        const pushRow = (building, unit, unitRow) => {
            const b = toStr(building);
            const u = normalizeUnit(unit);
            if (!b || !u) return;
            const key = _tenancyDraftStorageKey(b, u);
            if (seen.has(key)) return;
            const saved = getSavedContractMapEntry(map, b, u);
            const payload = saved?.payload;
            const base =
                unitRow ||
                getUnitsData().find(
                    (x) =>
                        normalizeReservationBuildingKey(x.building) === normalizeReservationBuildingKey(b) &&
                        normalizeUnit(x.unit) === u
                ) ||
                {};
            const draft = getTenancyDraftPayloadForUnit({ building: b, unit: u });
            const isRented = toStr(base.status) === 'Rented';
            const hasSaved = !!saved || !!draft;
            if (!isRented && !hasSaved) return;
            const p = payload || draft;
            if (pushMultiUnitRow(b, u, p, saved, base)) return;
            const secPrim = findLinkedContractPrimaryForUnitInSavedMap({ building: b, unit: u });
            if (secPrim && normalizeUnit(secPrim.unit) !== u) return;
            seen.add(key);
            const unitRef = base.building ? base : { building: b, unit: u, status: hasSaved ? 'Rented' : '' };
            rows.push({
                building: b,
                unit: u,
                ownerNames: toStr(base.ownerNames) || formatOwnerNamesForBuilding(b),
                tenant: toStr(p?.tenantNameAr || base.tenant),
                agreementNo: toStr(p?.agreementNo || base.agreementNo),
                endDate: toStr(p?.endDate || base.endDate),
                status: base.status || '',
                _unitRef: unitRef
            });
        };
        getUnitsData().forEach((u) => pushRow(u.building, u.unit, u));
        Object.keys(map).forEach((k) => {
            const tab = k.indexOf('\t');
            if (tab < 0) return;
            pushRow(k.slice(0, tab), k.slice(tab + 1), null);
        });
        const rowKeys = new Set();
        const mergedByAgreement = new Map();
        const singlesNoAg = [];
        rows.forEach((r) => {
            const ag = toStr(r.agreementNo).trim();
            const bk = normalizeReservationBuildingKey(r.building);
            if (ag) {
                const ak = `${bk}\t${ag}`;
                const prev = mergedByAgreement.get(ak);
                const score = (row) => {
                    if (row._isMultiUnit) return 3;
                    const u = toStr(row.unit);
                    if (u.includes('،') || u.includes(',')) return 2;
                    return 1;
                };
                if (!prev || score(r) > score(prev)) mergedByAgreement.set(ak, r);
                return;
            }
            singlesNoAg.push(r);
        });
        const combined = [...mergedByAgreement.values(), ...singlesNoAg];
        return combined.filter((r) => {
            const rk = r._isMultiUnit
                ? toStr(r._groupKey)
                : `${normalizeReservationBuildingKey(r.building)}\t${normalizeUnit(r._unitRef?.unit || r.unit)}\t${toStr(r.agreementNo)}`;
            if (rowKeys.has(rk)) return false;
            rowKeys.add(rk);
            return true;
        });
    }

    function getContractsListFilteredRows() {
        const q = toStr(document.getElementById('contractsListSearch')?.value).toLowerCase();
        const buildingFilter = document.getElementById('contractsListBuildingFilter')?.value || 'all';
        const fBuilding = toStr(document.getElementById('contractsListColBuilding')?.value).toLowerCase();
        const fOwner = toStr(document.getElementById('contractsListColOwner')?.value).toLowerCase();
        const fUnit = toStr(document.getElementById('contractsListColUnit')?.value).toLowerCase();
        const fTenant = toStr(document.getElementById('contractsListColTenant')?.value).toLowerCase();
        const fAgreement = toStr(document.getElementById('contractsListColAgreement')?.value).toLowerCase();
        const fEndDate = toStr(document.getElementById('contractsListColEndDate')?.value).toLowerCase();
        const rows = collectContractsListSourceRows().filter((r) => {
            if (buildingFilter !== 'all' && r.building !== buildingFilter) return false;
            const blob = [r.building, r.ownerNames, r.unit, r.tenant, r.agreementNo, r.endDate]
                .map((x) => toStr(x).toLowerCase())
                .join(' ');
            if (q && !blob.includes(q)) return false;
            if (fBuilding && !toStr(r.building).toLowerCase().includes(fBuilding)) return false;
            if (fOwner && !toStr(r.ownerNames).toLowerCase().includes(fOwner)) return false;
            if (fUnit && !toStr(r.unit).toLowerCase().includes(fUnit)) return false;
            if (fTenant && !toStr(r.tenant).toLowerCase().includes(fTenant)) return false;
            if (fAgreement && !toStr(r.agreementNo).toLowerCase().includes(fAgreement)) return false;
            if (fEndDate && !toStr(r.endDate).toLowerCase().includes(fEndDate)) return false;
            return true;
        });
        const dir = contractsListSortState.dir === 'asc' ? 1 : -1;
        const key = contractsListSortState.key;
        rows.sort((a, b) => {
            let va;
            let vb;
            if (key === 'owner') {
                va = a.ownerNames;
                vb = b.ownerNames;
            } else if (key === 'unit') {
                va = a.unit;
                vb = b.unit;
            } else if (key === 'tenant') {
                va = a.tenant;
                vb = b.tenant;
            } else if (key === 'agreementNo') {
                va = a.agreementNo;
                vb = b.agreementNo;
            } else if (key === 'endDate') {
                va = a.endDate;
                vb = b.endDate;
            } else if (key === 'contractState') {
                va = getContractLifecycleStateRank(getContractListRowLifecycleStateKey(a));
                vb = getContractLifecycleStateRank(getContractListRowLifecycleStateKey(b));
                return (va - vb) * dir;
            } else {
                va = a.building;
                vb = b.building;
            }
            return compareSmart(va, vb) * dir;
        });
        return rows;
    }

    function refreshContractsListBuildingFilterOptions() {
        const sel = document.getElementById('contractsListBuildingFilter');
        if (!sel) return;
        const current = sel.value || 'all';
        const buildings = [...new Set(collectContractsListSourceRows().map((r) => r.building).filter(Boolean))].sort((a, b) =>
            a.localeCompare(b, 'ar')
        );
        sel.innerHTML =
            `<option value="all">${t('كل المباني', 'All buildings')}</option>` +
            buildings.map((b) => `<option value="${escAttr(b)}">${escHtml(b)}</option>`).join('');
        if (current === 'all' || buildings.includes(current)) sel.value = current;
    }

    async function renderContractsListPanel() {
        const tbody = document.getElementById('contractsListTableBody');
        if (!tbody) return;
        if (isBhdSiteKvPersistenceActive() && !_bhdContractsListNeonSyncedThisPage) {
            tbody.innerHTML = `<tr><td colspan="8">${t('جاري تحميل البيانات من قاعدة السحابة…', 'Loading data from cloud database…')}</td></tr>`;
            const pulled = await ensureBhdSiteKvHydratedForContractsList();
            if (!pulled && !bhdHasLocalContractsListData()) {
                tbody.innerHTML = `<tr><td colspan="8">${t(
                    'تعذّر تحميل البيانات من قاعدة السحابة. تأكد من تسجيل الدخول ثم حدّث الصفحة.',
                    'Could not load data from the cloud database. Sign in and refresh the page.'
                )} <button type="button" class="mini-btn" onclick="_bhdContractsListNeonSyncedThisPage=false;renderContractsListPanel()">${t('إعادة المحاولة', 'Retry')}</button></td></tr>`;
                return;
            }
            _bhdContractsListNeonSyncedThisPage = true;
        }
        muteBhdKvAutoPush(12000);
        if (!isBhdSiteKvPersistenceActive()) {
            try {
                repairDuplicateMultiUnitAccountingEntries();
            } catch (_eRepList) {}
            try {
                repairLinkedContractUnitsLifecycleConsistencyThrottled(60000);
            } catch (_eRepLinkedList) {}
        }
        try {
            loadAccountingRegistry(true);
            loadSavedContractsByUnitMap(true);
        } catch (_eListFresh) {}
        refreshContractsListBuildingFilterOptions();
        const rows = getContractsListFilteredRows();
        window._contractsListRows = rows;
        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="8">${t('لا توجد عقود مسجلة بعد.', 'No registered contracts yet.')}</td></tr>`;
            return;
        }
        tbody.innerHTML = rows
            .map((r, i) => {
                const stateKey = getContractListRowLifecycleStateKey(r);
                return `<tr>
                    <td>${escHtml(r.building)}</td>
                    <td>${escHtml(r.ownerNames || '-')}</td>
                    <td>${escHtml(r.unit)}</td>
                    <td>${escHtml(r.tenant || '-')}</td>
                    <td>${escHtml(r.agreementNo || '-')}</td>
                    <td>${escHtml(r.endDate || '-')}</td>
                    <td><span class="chip contract-state-${stateKey}">${getContractLifecycleLabelForKey(stateKey)}</span></td>
                    <td style="white-space:nowrap">
                        <button type="button" class="mini-btn" onclick="openContractFullViewFromListRow(${i})">${t('فتح العقد', 'Open contract')}</button>
                        <button type="button" class="mini-btn" onclick="openContractUnitDetailsFromListRow(${i})">${t('تفاصيل', 'Details')}</button>
                    </td>
                </tr>`;
            })
            .join('');
    }

    function openContractFullViewFromListRow(index) {
        const r = window._contractsListRows?.[index];
        if (!r) return;
        const unit = r._unitRef || { building: r.building, unit: r.unit, agreementNo: r.agreementNo };
        if (
            !assertPermissionAnyOrAlert(
                ['manage_contracts', 'view_own_contract'],
                'لا تملك صلاحية عرض العقود والمستندات.',
                'No permission to view contracts & documents.'
            )
        ) {
            return;
        }
        const stateKey = getContractLifecycleStateKey(unit);
        if (stateKey === 'draft' || stateKey === 'active_pending') {
            selectedUnitDetailsRecord = unit;
            completeTenancyDraftFromUnitDetails();
            return;
        }
        openContractFullViewModal(unit);
    }

    function openContractUnitDetailsFromListRow(index) {
        const r = window._contractsListRows?.[index];
        if (!r) return;
        openUnitDetailsForUnit(r._unitRef || { building: r.building, unit: r.unit });
    }

    function startNewContractFromList() {
        contractEntryContext = { mode: 'contract', unit: null };
        showContractsWorkspaceView('form');
    }

    function printContractsListReport() {
        const rows = getContractsListFilteredRows();
        if (!rows.length) {
            alert(t('لا توجد عقود للطباعة.', 'No contracts to print.'));
            return;
        }
        const tableRows = rows
            .map((r, i) => {
                const stateKey = getContractLifecycleStateKey(r._unitRef);
                return `<tr>
                    <td>${i + 1}</td>
                    <td>${escHtml(r.building)}</td>
                    <td>${escHtml(r.ownerNames || '-')}</td>
                    <td>${escHtml(r.unit)}</td>
                    <td>${escHtml(r.tenant || '-')}</td>
                    <td>${escHtml(r.agreementNo || '-')}</td>
                    <td>${escHtml(r.endDate || '-')}</td>
                    <td>${escHtml(getContractLifecycleLabelForKey(stateKey))}</td>
                </tr>`;
            })
            .join('');
        printWithSiteStandard(
            { ar: 'قائمة العقود المسجلة', en: 'Registered contracts list' },
            `<p class="property-report-meta">${escHtml(t(`عدد السجلات: ${rows.length}`, `Records: ${rows.length}`))}</p>
            <table class="print-table"><thead><tr>
                <th>#</th>
                <th>${t('المبنى', 'Building')}</th>
                <th>${t('المالك', 'Owner')}</th>
                <th>${t('الوحدة', 'Unit')}</th>
                <th>${t('المستأجر', 'Tenant')}</th>
                <th>${t('رقم العقد', 'Contract no.')}</th>
                <th>${t('نهاية العقد', 'End date')}</th>
                <th>${t('حالة العقد', 'Contract state')}</th>
            </tr></thead><tbody>${tableRows}</tbody></table>`
        );
    }

    function getReservationsListFilteredRows() {
        loadDashboardAux();
        const q = toStr(document.getElementById('reservationsListSearch')?.value).toLowerCase();
        const buildingFilter = document.getElementById('reservationsListBuildingFilter')?.value || 'all';
        const fBuilding = toStr(document.getElementById('reservationsListColBuilding')?.value).toLowerCase();
        const fUnit = toStr(document.getElementById('reservationsListColUnit')?.value).toLowerCase();
        const fName = toStr(document.getElementById('reservationsListColName')?.value).toLowerCase();
        const fPhone = toStr(document.getElementById('reservationsListColPhone')?.value).toLowerCase();
        const fDate = toStr(document.getElementById('reservationsListColDate')?.value).toLowerCase();
        let pairs = unitReservations.map((r, i) => ({ r, i }));
        pairs = pairs.filter(({ r }) => {
            if (buildingFilter !== 'all' && toStr(r.building) !== buildingFilter) return false;
            const blob = [r.building, r.unit, r.reservedBy, r.phone, r.since, r.state]
                .map((x) => toStr(x).toLowerCase())
                .join(' ');
            if (q && !blob.includes(q)) return false;
            if (fBuilding && !toStr(r.building).toLowerCase().includes(fBuilding)) return false;
            if (fUnit && !toStr(r.unit).toLowerCase().includes(fUnit)) return false;
            if (fName && !toStr(r.reservedBy).toLowerCase().includes(fName)) return false;
            if (fPhone && !toStr(r.phone).toLowerCase().includes(fPhone)) return false;
            if (fDate && !toStr(r.since).toLowerCase().includes(fDate)) return false;
            return true;
        });
        const dir = reservationsListSortState.dir === 'asc' ? 1 : -1;
        const key = reservationsListSortState.key;
        pairs.sort((a, b) => {
            const ra = a.r;
            const rb = b.r;
            let va;
            let vb;
            if (key === 'unit') {
                va = ra.unit;
                vb = rb.unit;
            } else if (key === 'reservedBy') {
                va = ra.reservedBy;
                vb = rb.reservedBy;
            } else if (key === 'phone') {
                va = ra.phone;
                vb = rb.phone;
            } else if (key === 'since') {
                va = ra.since;
                vb = rb.since;
            } else if (key === 'state') {
                va = toStr(ra.state);
                vb = toStr(rb.state);
            } else {
                va = ra.building;
                vb = rb.building;
            }
            return compareSmart(va, vb) * dir;
        });
        return pairs;
    }

    function refreshReservationsListBuildingFilterOptions() {
        const sel = document.getElementById('reservationsListBuildingFilter');
        if (!sel) return;
        const current = sel.value || 'all';
        const buildings = [...new Set(unitReservations.map((r) => toStr(r.building)).filter(Boolean))].sort((a, b) =>
            a.localeCompare(b, 'ar')
        );
        sel.innerHTML =
            `<option value="all">${t('كل المباني', 'All buildings')}</option>` +
            buildings.map((b) => `<option value="${escAttr(b)}">${escHtml(b)}</option>`).join('');
        if (current === 'all' || buildings.includes(current)) sel.value = current;
    }

    function renderReservationsListPanel() {
        const tbody = document.getElementById('reservationsListTableBody');
        if (!tbody) return;
        loadDashboardAux();
        refreshReservationsListBuildingFilterOptions();
        const pairs = getReservationsListFilteredRows();
        window._reservationsListPairs = pairs;
        if (!pairs.length) {
            tbody.innerHTML = `<tr><td colspan="7">${t('لا توجد حجوزات مسجلة بعد.', 'No reservations yet.')}</td></tr>`;
            return;
        }
        tbody.innerHTML = pairs
            .map(({ r, i }) => {
                const stateLabel =
                    toStr(r.state) === 'draft' ? t('🟡 مسودة', '🟡 Draft') : t('🟢 مكتمل', '🟢 Completed');
                return `<tr>
                    <td>${escHtml(r.building)}</td>
                    <td>${formatReservationUnitsLabel(r)}</td>
                    <td>${escHtml(r.reservedBy)}</td>
                    <td>${escHtml(r.phone)}</td>
                    <td>${escHtml(r.since)}</td>
                    <td>${stateLabel}</td>
                    <td style="white-space:normal;min-width:200px">
                        <button type="button" class="mini-btn" onclick="openReservationFromListRow(${i})">${t('استكمال الحجز', 'Resume reservation')}</button>
                        <button type="button" class="mini-btn" onclick="openReservationCancelModal(${i})">${t('إلغاء حجز', 'Cancel reservation')}</button>
                        ${toStr(r.state) === 'confirmed' ? `<button type="button" class="mini-btn" onclick="printReservationForm(${i})">${t('🖨️ طباعة', '🖨️ Print')}</button>` : ''}
                        <button type="button" class="mini-btn" onclick="convertReservationToTenancyContract(${i})">${t('تحويل عقد', 'Convert contract')}</button>
                    </td>
                </tr>`;
            })
            .join('');
    }

    function openReservationFromListRow(index) {
        resumeReservationDraft(index);
    }

    function startNewReservationFromList() {
        contractEntryContext = { mode: 'reservation', unit: null };
        resetReservationWorkspaceForm();
        showReservationsWorkspaceView('form');
    }

    function printReservationsListReport() {
        loadDashboardAux();
        const pairs = getReservationsListFilteredRows();
        if (!pairs.length) {
            alert(t('لا توجد حجوزات للطباعة.', 'No reservations to print.'));
            return;
        }
        const tableRows = pairs
            .map(({ r }, idx) => {
                const stateLabel = toStr(r.state) === 'draft' ? t('مسودة', 'Draft') : t('مكتمل', 'Completed');
                return `<tr>
                    <td>${idx + 1}</td>
                    <td>${escHtml(r.building)}</td>
                    <td>${getReservationUnitsList(r)
                        .map((x) => x.unit)
                        .join(', ') || escHtml(r.unit)}</td>
                    <td>${escHtml(r.reservedBy)}</td>
                    <td>${escHtml(r.phone)}</td>
                    <td>${escHtml(r.since)}</td>
                    <td>${escHtml(stateLabel)}</td>
                </tr>`;
            })
            .join('');
        printWithSiteStandard(
            { ar: 'قائمة الحجوزات', en: 'Reservations list' },
            `<p class="property-report-meta">${escHtml(t(`عدد السجلات: ${pairs.length}`, `Records: ${pairs.length}`))}</p>
            <table class="print-table"><thead><tr>
                <th>#</th>
                <th>${t('المبنى', 'Building')}</th>
                <th>${t('الوحدة', 'Unit')}</th>
                <th>${t('المحجوز', 'Reserved by')}</th>
                <th>${t('الجوال', 'Phone')}</th>
                <th>${t('التاريخ', 'Date')}</th>
                <th>${t('الحالة', 'Status')}</th>
            </tr></thead><tbody>${tableRows}</tbody></table>`
        );
    }

    function openContractsWorkspace(options) {
        if (
            !assertPermissionAnyOrAlert(
                ['manage_contracts', 'view_own_contract'],
                'لا تملك صلاحية العقود والمستندات.',
                'No permission to access contracts.'
            )
        ) {
            return;
        }
        const opts = options && typeof options === 'object' ? options : {};
        if (!opts.unit && !contractEntryContext?.unit) {
            contractEntryContext = { mode: 'contract', unit: null };
        }
        setWorkspaceMode('contracts');
        if (opts.view === 'list') {
            showContractsWorkspaceView('list');
        } else if (opts.view === 'form') {
            showContractsWorkspaceView('form');
        } else if (opts.unit || contractEntryContext?.unit || hasActiveContractFormSession()) {
            showContractsWorkspaceView('form');
        } else {
            showContractsWorkspaceView('list');
        }
        try {
            applyTenancyAndTenantFieldLocks();
        } catch (_eOpenLocks) {}
        try { applyContractsWorkspaceLockState(); } catch (_eOpenCws) {}
    }
    function openReservationsWorkspace(options) {
        if (
            !assertPermissionOrAlert(
                'manage_contracts',
                'لا تملك صلاحية الحجوزات والعقود.',
                'No permission to access reservations.'
            )
        ) {
            return;
        }
        const opts = options && typeof options === 'object' ? options : {};
        const ctxUnit = opts.unit || contractEntryContext.unit || null;
        contractEntryContext = { mode: 'reservation', unit: ctxUnit };
        setWorkspaceMode('reservations');
        if (opts.view === 'list') {
            showReservationsWorkspaceView('list');
        } else if (opts.view === 'form') {
            showReservationsWorkspaceView('form');
            if (ctxUnit && toStr(ctxUnit.building) && toStr(ctxUnit.unit)) {
                enterReservationModeForUnit(ctxUnit);
            } else {
                resetReservationWorkspaceForm();
            }
        } else if (ctxUnit && toStr(ctxUnit.building) && toStr(ctxUnit.unit)) {
            showReservationsWorkspaceView('form');
            enterReservationModeForUnit(ctxUnit);
        } else {
            showReservationsWorkspaceView('list');
            resetReservationWorkspaceForm();
        }
    }
    function openFormsWorkspace() {
        if (
            !assertPermissionOrAlert(
                'manage_contracts',
                'لا تملك صلاحية نظام المستندات والعقود.',
                'No permission to access documents.'
            )
        ) {
            return;
        }
        setWorkspaceMode('forms');
    }
    function openAddressBookWorkspace() {
        if (
            !assertPermissionAnyOrAlert(
                ['manage_owners', 'manage_contracts', 'view_address_book'],
                'لا تملك صلاحية دفتر العناوين.',
                'No permission to access the address book.'
            )
        ) {
            return;
        }
        setWorkspaceMode('addressbook');
    }

    function applyRuntimePayload() {
        const params = new URLSearchParams(window.location.search);
        const payloadKey = params.get('payloadKey') || 'bhd_runtime_payload';
        const raw = localStorage.getItem(payloadKey);
        if(!raw) return false;
        try {
            const payload = JSON.parse(raw);
            const data = payload.contract || {};
            const skipRuntimeKeys = new Set([
                'extraAdjustments',
                'extraAdjustmentsJson',
                'insuranceDepositItems',
                'insuranceDepositItemsJson',
                'customRentItems',
                'customRentItemsJson',
                'paymentSchedule',
                'paymentScheduleJson',
                'type'
            ]);
            Object.keys(getFormData()).forEach((key) => {
                if (skipRuntimeKeys.has(key)) return;
                const mappedId = key === 'contractType' ? 'contractTypeSelect' : key === 'type' ? 'typeSelect' : key;
                const el = document.getElementById(mappedId);
                if (el && data[key] !== undefined && data[key] !== null && typeof data[key] !== 'object') {
                    el.value = data[key];
                }
            });
            if (!toStr(data.agreedRentPaymentDay) && data.agreedRentPaymentDate) {
                try {
                    const dtR = new Date(data.agreedRentPaymentDate);
                    if (!Number.isNaN(dtR.getTime())) {
                        const elR = document.getElementById('agreedRentPaymentDay');
                        if (elR) elR.value = String(dtR.getDate());
                    }
                } catch (e) {}
            }
            try {
                if (data.paymentScheduleJson) {
                    const arr = JSON.parse(toStr(data.paymentScheduleJson) || '[]');
                    renderPaymentScheduleFromRows(Array.isArray(arr) ? arr : []);
                } else if (Array.isArray(data.paymentSchedule) && data.paymentSchedule.length) {
                    renderPaymentScheduleFromRows(data.paymentSchedule);
                }
            } catch (e) {}
            try {
                if (data.extraAdjustmentsJson) {
                    renderExtraAdjustmentsRows(JSON.parse(toStr(data.extraAdjustmentsJson) || '[]'));
                }
            } catch (e) {}
            try {
                if (data.insuranceDepositItemsJson) {
                    renderInsuranceDepositItemsRows(JSON.parse(toStr(data.insuranceDepositItemsJson) || '[]'));
                }
            } catch (e) {}
            try {
                if (data.customRentItemsJson) {
                    renderCustomRentItemsRows(JSON.parse(toStr(data.customRentItemsJson) || '[]'));
                }
            } catch (e) {}
            ensureTypeSelectAlwaysNew();
            if (Array.isArray(payload.buildings) && payload.buildings.length) {
                buildingsList.length = 0;
                payload.buildings.forEach((b) => buildingsList.push(String(b)));
            }
            if (payload.buildingProfiles && typeof payload.buildingProfiles === 'object') {
                buildingProfiles = payload.buildingProfiles;
            }
            if (Array.isArray(payload.managedUnitsData)) {
                managedUnitsData = payload.managedUnitsData;
            } else {
                syncManagedUnitsFromProfiles();
            }
            if (Array.isArray(payload.owners) && payload.owners.length) {
                ownersList.length = 0;
                payload.owners.forEach((o) => ownersList.push(String(o)));
            }
            if (payload.ownerProfiles && typeof payload.ownerProfiles === 'object') {
                ownerProfiles = payload.ownerProfiles;
            }
            if (Array.isArray(payload.fileRegistry)) {
                fileRegistry = payload.fileRegistry;
            }
            if (typeof payload.currentDoc === 'number' && !Number.isNaN(payload.currentDoc)) {
                const dm = Math.max(0, docNames.length - 1);
                currentDoc = Math.max(0, Math.min(payload.currentDoc, dm));
            }
            if (payloadKey !== 'bhd_runtime_payload') {
                localStorage.removeItem(payloadKey);
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    function initializeMode() {
        let activePageMode = pageMode;
        try {
            applyTheme(localStorage.getItem('bhd_theme_mode') || 'maroon');
            document.body.classList.add(isViewerMode ? 'viewer-mode' : 'entry-mode');
            applyAppLanguage(window.__bhdBootRefreshFast ? { fast: true } : undefined);
            syncTopNavOffset();
        } catch (e) {
            console.error('initializeMode (theme/language/nav) failed:', e);
        }
        if (!isViewerMode) {
            try {
                const startupMode = pageMode;
                const needsContractRestore =
                    startupMode === 'contracts' || startupMode === 'forms';
                if (!needsContractRestore) {
                    window.__bhdContractRestorePending = true;
                } else {
                    const runRestore = () => {
                        try {
                            restoreContractWorkspaceOnStartup();
                        } catch (_eRestore) {}
                    };
                    if (window.__bhdBootRefreshFast) {
                        if (typeof requestIdleCallback === 'function') {
                            requestIdleCallback(runRestore, { timeout: 8000 });
                        } else {
                            setTimeout(runRestore, 400);
                        }
                    } else {
                        runRestore();
                    }
                }
            } catch (e) {}
        }
        if (!isViewerMode) {
            try {
                syncAuthStateFromStorage();
            } catch (_eInitAuth) {}
            if (!canAccessWorkspaceMode(activePageMode)) {
                activePageMode = effectivePermission('manage_dashboard') ? 'dashboard' : 'dashboard';
            }
            _activeWorkspaceMode = activePageMode;
            document.body.classList.add(
                activePageMode === 'contracts'
                    ? 'mode-contracts'
                    : activePageMode === 'reservations'
                        ? 'mode-reservations'
                    : activePageMode === 'forms'
                        ? 'mode-forms'
                    : activePageMode === 'users'
                        ? 'mode-users'
                    : activePageMode === 'organization'
                        ? 'mode-organization'
                    : activePageMode === 'doc_templates'
                        ? 'mode-doc_templates'
                        : activePageMode === 'addressbook'
                            ? 'mode-addressbook'
                        : activePageMode === 'notifications'
                            ? 'mode-notifications'
                        : activePageMode === 'accounting'
                            ? 'mode-accounting'
                        : activePageMode === 'maintenance'
                            ? 'mode-maintenance'
                            : 'mode-dashboard'
            );
            if (activePageMode === 'reservations') {
                try { setReservationFormFlowActive(true); } catch (_initRes) {}
            } else if (activePageMode === 'contracts') {
                try { setReservationFormFlowActive(false); } catch (_initCon) {}
            }
            updateSideNavActive(activePageMode);
        }
        const screenBadge = document.getElementById('screenBadge');
        if (screenBadge && !isViewerMode) {
            screenBadge.textContent = activePageMode === 'users'
                ? t('إدارة المستخدمين', 'Users')
                : activePageMode === 'reservations'
                    ? t('صفحة الحجوزات', 'Reservations')
                : activePageMode === 'forms'
                    ? t('نظام المستندات', 'Documents system')
                : activePageMode === 'organization'
                    ? t('إعدادات المنشأة', 'Organization settings')
                : activePageMode === 'doc_templates'
                    ? t('قوالب المستندات', 'Document templates')
                : activePageMode === 'addressbook'
                    ? t('دفتر العناوين', 'Address book')
                : activePageMode === 'notifications'
                    ? t('التنبيهات والمهام', 'Notifications & tasks')
                : activePageMode === 'accounting'
                    ? t('المحاسبة', 'Accounting')
                : activePageMode === 'maintenance'
                    ? t('الصيانة', 'Maintenance')
                    : t('لوحة البيانات والمعلومات', 'Dashboard overview');
        }
        const contractsBadge = document.getElementById('contractsScreenBadge');
        if (contractsBadge && !isViewerMode) {
            contractsBadge.textContent = activePageMode === 'contracts'
                ? t('وضع العمل: بيانات العقد والمستندات', 'Work mode: contract data and documents')
                : activePageMode === 'forms'
                    ? t('وضع العمل: نظام المستندات والطباعة', 'Work mode: documents system and printing')
                    : '';
        }
        const reservationsBadge = document.getElementById('reservationsScreenBadge');
        if (reservationsBadge && !isViewerMode) {
            reservationsBadge.textContent = activePageMode === 'reservations'
                ? t('وضع العمل: صفحة الحجوزات المنفصلة', 'Work mode: standalone reservations page')
                : t('إدارة الحجوزات / Reservations management', 'إدارة الحجوزات / Reservations management');
        }
        if (!isViewerMode && activePageMode === 'contracts') {
            try {
                if (hasActiveContractFormSession() || contractEntryContext?.unit) {
                    showContractsWorkspaceView('form');
                } else {
                    showContractsWorkspaceView('list');
                }
            } catch (_eInitCw) {}
        } else if (!isViewerMode && activePageMode === 'reservations') {
            try {
                const ctxUnit = contractEntryContext?.unit;
                if (ctxUnit && toStr(ctxUnit.building) && toStr(ctxUnit.unit)) {
                    showReservationsWorkspaceView('form');
                } else {
                    showReservationsWorkspaceView('list');
                }
            } catch (_eInitRw) {}
        }
        try {
            updateContractWorkspaceContextUi();
        } catch (e) {
            console.error('updateContractWorkspaceContextUi failed:', e);
        }
        try {
            renderExtraAdjustmentsRows(getExtraAdjustmentsFromUi());
        } catch (e) {
            console.error('renderExtraAdjustmentsRows failed:', e);
        }
        if (!isViewerMode) {
            try {
                if (!localStorage.getItem('bhd_contract_full')) {
                    onPaymentMethodOrDriversChanged();
                }
            } catch (e) {}
        }
        if (isViewerMode) {
            const loadedFromRuntime = applyRuntimePayload();
            if (!loadedFromRuntime) {
                const hasSaved = localStorage.getItem('bhd_contract_full');
                if (hasSaved) {
                    loadAllData(false);
                }
            }
            try {
                renderDocument(currentDoc);
            } catch (e) {
                console.error('renderDocument (viewer init) failed:', e);
            }
            const params = new URLSearchParams(window.location.search);
            if (params.get('autoprint') === '1') {
                setTimeout(() => printDocument(), 700);
            }
        } else {
            try {
                updateSummaryPanel();
            } catch (e) {
                console.error('updateSummaryPanel (init) failed:', e);
            }
            try {
                updateAuthHeaderBar();
            } catch (e) {
                console.error('updateAuthHeaderBar failed:', e);
            }
            if (activePageMode === 'dashboard') {
                try {
                    renderDashboardWorkspaceStaged();
                } catch (e) {
                    console.error('renderDashboardWorkspaceStaged failed:', e);
                }
            } else if (activePageMode === 'contracts') {
                try {
                    const s = sessionStorage.getItem('bhd_ui_current_doc');
                    if (s != null && s !== '') {
                        const n = parseInt(s, 10);
                        if (!Number.isNaN(n) && n >= 0 && n < docNames.length) {
                            currentDoc = n;
                        }
                    }
                } catch (e) {}
                try { applyContractsWorkspaceLockState(); } catch (_eInitCws) {}
                try {
                    if (isContractWorkspaceUnlockedForCurrentUnit()) {
                        try { refreshContractDocumentsForPreview(); } catch (_eInitDoc) {}
                        renderDocument(currentDoc);
                    }
                } catch (e) {
                    console.error('renderDocument (contracts init) failed:', e);
                }
            } else if (activePageMode === 'reservations') {
                try {
                    updateReservationsWorkspaceUi();
                    updateReservationSummaryPanel();
                } catch (e) {
                    console.error('updateReservationsWorkspaceUi (reservations) failed:', e);
                }
            } else if (activePageMode === 'forms') {
                try {
                    const s = sessionStorage.getItem('bhd_ui_current_doc');
                    if (s != null && s !== '') {
                        const n = parseInt(s, 10);
                        if (!Number.isNaN(n) && n >= 0 && n < docNames.length) {
                            currentDoc = n;
                        }
                    }
                } catch (e) {}
                try {
                    renderDocument(currentDoc);
                } catch (e) {
                    console.error('renderDocument (forms init) failed:', e);
                }
            } else if (activePageMode === 'users') {
                try {
                    loadDashboardAux();
                } catch (e) {
                    console.error('loadDashboardAux failed:', e);
                }
                try {
                    renderUsersManagementPage();
                } catch (e) {
                    console.error('renderUsersManagementPage failed:', e);
                }
            } else if (activePageMode === 'organization') {
                try {
                    renderOrganizationSettingsPage();
                } catch (e) {
                    console.error('renderOrganizationSettingsPage failed:', e);
                }
            } else if (activePageMode === 'doc_templates') {
                try {
                    renderDocumentTemplatesPage();
                } catch (e) {
                    console.error('renderDocumentTemplatesPage failed:', e);
                }
            } else if (activePageMode === 'addressbook') {
                try {
                    renderAddressBookTable();
                } catch (e) {
                    console.error('renderAddressBookTable (init) failed:', e);
                }
            } else if (activePageMode === 'notifications') {
                try {
                    loadDashboardAux();
                } catch (e) {
                    console.error('loadDashboardAux (notifications init) failed:', e);
                }
                try {
                    renderNotificationsPage();
                } catch (e) {
                    console.error('renderNotificationsPage (init) failed:', e);
                }
            } else if (activePageMode === 'accounting') {
                try {
                    renderAccountingWorkspace();
                } catch (e) {
                    console.error('renderAccountingWorkspace (init) failed:', e);
                }
            } else if (activePageMode === 'maintenance') {
                try {
                    renderMaintenanceWorkspace();
                } catch (e) {
                    console.error('renderMaintenanceWorkspace (init) failed:', e);
                }
            }
        }
        if (!isViewerMode) {
            const modeParam = activePageMode === 'contracts'
                ? 'contracts'
                : activePageMode === 'reservations'
                    ? 'reservations'
                : activePageMode === 'forms'
                    ? 'forms'
                : activePageMode === 'users'
                    ? 'users'
                : activePageMode === 'organization'
                    ? 'organization'
                : activePageMode === 'doc_templates'
                    ? 'doc_templates'
                    : activePageMode === 'addressbook'
                        ? 'addressbook'
                    : activePageMode === 'notifications'
                        ? 'notifications'
                    : activePageMode === 'accounting'
                        ? 'accounting'
                    : activePageMode === 'maintenance'
                        ? 'maintenance'
                        : 'dashboard';
            try {
                const sp = new URLSearchParams(window.location.search);
                if (sp.get('mode') !== modeParam) {
                    const baseUrl = window.location.href.split('?')[0];
                    window.history.replaceState({}, '', `${baseUrl}?mode=${modeParam}`);
                }
            } catch (e) {}
            try {
                applyPermissionNavUi();
            } catch (_eNavInit) {}
            try {
                applyOrganizationBrandingToUi();
            } catch (_eOrgBrand) {}
        }
    }

    window.addEventListener('resize', syncTopNavOffset);
    window.addEventListener('load', () => {
        syncTopNavOffset();
        setTimeout(syncTopNavOffset, 120);
        initBuildingRequiredFieldWatchers();
    });
    
    function addBuilding() {
        if (
            !assertPermissionOrAlert(
                'manage_properties',
                'لا تملك صلاحية تعديل العقارات والمباني.',
                'No permission to edit properties & buildings.'
            )
        ) {
            return;
        }
        const newBuilding = prompt('أدخل اسم المبنى الجديد / Enter new building name:');
        if(newBuilding) {
            if (!buildingsList.includes(newBuilding)) buildingsList.push(newBuilding);
            persistReferenceData(false);
            renderDocument(11);
        }
    }
    
    function addOwner() {
        const newOwner = prompt('أدخل اسم المالك الجديد / Enter new owner name:');
        if(newOwner) {
            if (!ownersList.includes(newOwner)) ownersList.push(newOwner);
            if (!ownerBuildingMap[newOwner]) ownerBuildingMap[newOwner] = [];
            persistReferenceData(false);
            renderDocument(11);
        }
    }
    
    // ربط أحداث التغيير لتحديث المستند تلقائياً
    const paymentScheduleDriverIds = ['contractMonths', 'startDate', 'endDate', 'agreedRentPaymentDay', 'monthlyRent', 'paymentMethod'];
    const contractWorkspaceLiveRefreshIds = [
        'contractMonths',
        'startDate',
        'endDate',
        'unitHandoverDate',
        'agreedRentPaymentDay',
        'monthlyRent',
        'paymentMethod',
        'contractSubjectToVat',
        'vatPaymentMode',
        'vatChequeCount',
        'graceAmount',
        'otherDiscountAmount',
        'rentCalcMode',
        'rentAreaSqm',
        'rentPerSqm'
    ];
    const inputs = ['agreementNo', 'contractTypeSelect', 'tenantEntityType', 'tenantNameAr', 'tenantNameEn', 'tenantCommercialRegNo','tenantCommercialRegExpiryDate','tenantCompanyExtraMobile','tenantCompanySignatoriesJson','tenantId', 'tenantMobile', 'tenantPassport', 'tenantNationality', 'tenantEmail', 'buildingNo', 'flatNo', 'floorDetails', 'unitType', 'electricityMeter', 'waterMeter', 'monthlyRent', 'rentCalcMode', 'rentAreaSqm', 'rentPerSqm', 'contractMonths', 'graceDays', 'unitHandoverDate', 'startDate', 'endDate', 'agreedRentPaymentDay', 'paymentMethod', 'contractSubjectToVat', 'vatPaymentMode', 'vatChequeCount', 'depositAmount', 'depositReceiptRef', 'graceAmount', 'otherDiscountAmount', 'municipalFormNo', 'municipalContractNo'];
    try { ensureTenantNationalitySelect(false); } catch (e) {}
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', () => {
            if (id === 'buildingNo' || id === 'flatNo') {
                try { applyContractsWorkspaceLockState(); } catch (_eBfLock) {}
            }
            if (id === 'unitHandoverDate' || id === 'startDate') try { syncGraceHandoverContractDates(id); } catch (eGh) {}
            if (id === 'endDate') {
                try {
                    recomputeContractPeriodFields('endDate');
                } catch (eEd) {}
            }
            if (id === 'vatChequeCount') {
                try { syncContractVatUi(); } catch (_eVatCnt) {}
            } else if (id === 'monthlyRent' || id === 'rentCalcMode' || id === 'rentAreaSqm' || id === 'rentPerSqm' || id === 'otherDiscountAmount') {
                try { refreshContractFinancialCalculations({ skipPayRebuild: true }); } catch (_eFinInp) {}
            }
            if (id === 'tenantNationality') try { renderContractMandatoryDocsUi(true); } catch (eNd) {}
            if (id === 'tenantCompanySignatoriesJson') {
                try { updateTenantCompanySignatoriesPreviewFromJson(); } catch (eP) {}
                try { renderContractMandatoryDocsUi(true); } catch (eP2) {}
            }
            if (contractWorkspaceLiveRefreshIds.includes(id)) {
                try { scheduleContractWorkspaceDataRefresh(); } catch (eLive) {}
            } else if (paymentScheduleDriverIds.includes(id)) {
                try { scheduleContractWorkspaceDataRefresh(); } catch (e) {}
            } else if (!(id === 'buildingNo' || id === 'flatNo') || isContractWorkspaceUnlockedForCurrentUnit()) {
                try { renderDocument(currentDoc); } catch (e) {}
            }
            if (id === 'depositAmount' || id === 'depositReceiptRef') {
                try { updateSummaryPanel(); } catch (e) {}
            }
            try { scheduleContractWorkspaceDraftSave(); } catch (_eDraftInp) {}
        });
        if (
            el &&
            (id === 'municipalFormNo' || id === 'municipalContractNo' || id === 'depositReceiptRef')
        ) {
            el.addEventListener('blur', () => {
                if (!contractAdditionalDataMode) return;
                try {
                    applyContractAdditionalDataFieldLocks();
                } catch (_eGapBlur) {}
            });
        }
        if(el && el.tagName === 'SELECT') el.addEventListener('change', () => {
            if (id === 'contractSubjectToVat' || id === 'vatPaymentMode') {
                try { onContractVatSettingsChanged(); } catch (_eVatSel) {}
            }
            if (id === 'rentCalcMode') {
                try { refreshContractFinancialCalculations({ skipPayRebuild: true }); } catch (_eFinSel) {}
            }
            if (id === 'tenantNationality') try { renderContractMandatoryDocsUi(true); } catch (eNd) {}
            if (contractWorkspaceLiveRefreshIds.includes(id) || paymentScheduleDriverIds.includes(id)) {
                try { scheduleContractWorkspaceDataRefresh(); } catch (e) {}
            } else if (isContractWorkspaceUnlockedForCurrentUnit()) {
                try { renderDocument(currentDoc); } catch (e) {}
            }
            if (id === 'depositAmount' || id === 'depositReceiptRef') {
                try { updateSummaryPanel(); } catch (e) {}
            }
            try { scheduleContractWorkspaceDraftSave(); } catch (_eDraftSel) {}
        });
        if (el && id === 'unitHandoverDate') {
            el.addEventListener('change', () => {
                try { syncGraceHandoverContractDates(id); } catch (eGd2) {}
            });
        }
        if (el && id === 'startDate') {
            el.addEventListener('change', () => {
                try { syncGraceHandoverContractDates(id); } catch (eGsX) {}
                try {
                    recomputeContractPeriodFields('startDate');
                    scheduleContractWorkspaceDataRefresh();
                } catch (ePr) {}
            });
        }
        if (el && id === 'contractMonths') {
            el.addEventListener('change', () => {
                try {
                    recomputeContractPeriodFields('contractMonths');
                    scheduleContractWorkspaceDataRefresh();
                } catch (eCmCh) {}
            });
        }
        if (el && id === 'endDate') {
            el.addEventListener('change', () => {
                try {
                    recomputeContractPeriodFields('endDate');
                    scheduleContractWorkspaceDataRefresh();
                } catch (eEdCh) {}
            });
        }
    });
    try { refreshGraceHandoverIndicators(); } catch (eRfG) {}
    try {
        window.addEventListener('beforeunload', flushContractWorkspaceDraftSave);
        window.addEventListener('pagehide', flushContractWorkspaceDraftSave);
    } catch (_eUnload) {}
    const extraAdjustmentsList = document.getElementById('extraAdjustmentsList');
    if (extraAdjustmentsList) {
        const onExtraChange = () => {
            try { scheduleContractWorkspaceDataRefresh(); } catch (_eExt) {}
            try { scheduleContractWorkspaceDraftSave(); } catch (_eExtSav) {}
        };
        extraAdjustmentsList.addEventListener('input', onExtraChange);
        extraAdjustmentsList.addEventListener('change', onExtraChange);
    }
    const insuranceDepositItemsList = document.getElementById('insuranceDepositItemsList');
    if (insuranceDepositItemsList) {
        const onInsChange = () => {
            try { updateSummaryPanel(); } catch (e) {}
            try { renderDocument(currentDoc); } catch (e) {}
            try { scheduleContractWorkspaceDraftSave(); } catch (_eInsSav) {}
        };
        insuranceDepositItemsList.addEventListener('input', onInsChange);
        insuranceDepositItemsList.addEventListener('change', onInsChange);
    }
    const customRentScheduleTableWrap = document.getElementById('customRentScheduleTableWrap');
    if (customRentScheduleTableWrap) {
        const onCustomRentChange = () => {
            try {
                syncCustomRentToMainPaymentSchedule();
            } catch (e) {}
            try {
                scheduleContractWorkspaceDraftSave();
            } catch (_eCrSav) {}
        };
        customRentScheduleTableWrap.addEventListener('input', onCustomRentChange);
        customRentScheduleTableWrap.addEventListener('change', onCustomRentChange);
    }
    const paySchedWrap = document.getElementById('paymentScheduleTableWrap');
    if (paySchedWrap) {
        const onSched = (e) => {
            const t = e && e.target;
            if (t && t.nodeType === 1) {
                const el = t;
                if (el.hasAttribute('data-schedule-date') || el.hasAttribute('data-schedule-amount')) {
                    const tr = el.closest('tr');
                    if (tr) {
                        const m = tr.getAttribute('data-schedule-month');
                        if (m) {
                            try {
                                copyMainScheduleRowToCustomRentTable(m);
                            } catch (err) {}
                        }
                    }
                }
            }
            try {
                updateSummaryPanel();
            } catch (e) {}
            try {
                renderDocument(currentDoc);
            } catch (e) {}
            try {
                scheduleContractWorkspaceDraftSave();
            } catch (_eSchedSav) {}
        };
        paySchedWrap.addEventListener('input', onSched);
        paySchedWrap.addEventListener('change', onSched);
    }
    const vatSchedWrap = document.getElementById('vatChequeScheduleTableWrap');
    if (vatSchedWrap) {
        const onVatSched = () => {
            try {
                updateSummaryPanel();
            } catch (e) {}
            try {
                renderDocument(currentDoc);
            } catch (e) {}
        };
        vatSchedWrap.addEventListener('input', onVatSched);
        vatSchedWrap.addEventListener('change', onVatSched);
    }
    const depositInput = document.getElementById('depositAmount');
    if (depositInput) {
        depositInput.addEventListener('input', () => {
            depositInput.dataset.manualDeposit = '1';
        });
    }
    ['buildingNo', 'flatNo', 'buildingSelect'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const ev = el.tagName === 'SELECT' ? 'change' : 'input';
        el.addEventListener(ev, syncUnitDerivedFieldsFromSelection);
    });

    const importInput = document.getElementById('importFileInput');
    if (importInput) {
        importInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) importDataFile(file);
            e.target.value = '';
        });
    }

    ['unitsSearchInput', 'unitsBuildingFilter', 'unitsStatusFilter', 'unitsExpireFilter', 'unitsUtilitiesFilter'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            const eventName = el.tagName === 'SELECT' ? 'change' : 'input';
            el.addEventListener(eventName, resetOperationsPageAndRender);
        }
    });

    const registrySearch = document.getElementById('registrySearch');
    if (registrySearch) registrySearch.addEventListener('input', renderRegistryTable);
    const addressBookSearch = document.getElementById('addressBookSearch');
    if (addressBookSearch) addressBookSearch.addEventListener('input', renderAddressBookTable);
    const contractsListSearch = document.getElementById('contractsListSearch');
    if (contractsListSearch) contractsListSearch.addEventListener('input', renderContractsListPanel);
    const contractsListBuildingFilter = document.getElementById('contractsListBuildingFilter');
    if (contractsListBuildingFilter) contractsListBuildingFilter.addEventListener('change', renderContractsListPanel);
    ['contractsListColBuilding', 'contractsListColOwner', 'contractsListColUnit', 'contractsListColTenant', 'contractsListColAgreement', 'contractsListColEndDate'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', renderContractsListPanel);
    });
    const reservationsListSearch = document.getElementById('reservationsListSearch');
    if (reservationsListSearch) reservationsListSearch.addEventListener('input', renderReservationsListPanel);
    const reservationsListBuildingFilter = document.getElementById('reservationsListBuildingFilter');
    if (reservationsListBuildingFilter) reservationsListBuildingFilter.addEventListener('change', renderReservationsListPanel);
    ['reservationsListColBuilding', 'reservationsListColUnit', 'reservationsListColName', 'reservationsListColPhone', 'reservationsListColDate'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', renderReservationsListPanel);
    });
    ['abFilterContact', 'abFilterComm', 'abFilterLocation', 'abFilterDocs'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', renderAddressBookTable);
    });
    const abNationality = document.getElementById('abNationality');
    if (abNationality) abNationality.addEventListener('change', syncAddressBookFormRules);
    ['abBirthDate', 'abIdExpiryDate', 'abPassportExpiryDate'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const openPicker = () => {
            if (typeof el.showPicker === 'function') {
                try { el.showPicker(); } catch (e) {}
            }
        };
        el.addEventListener('focus', openPicker);
        el.addEventListener('click', openPicker);
    });
    const abName = document.getElementById('abName');
    const abRelatedRefreshIds = [
        'abType', 'abName', 'abNameEn', 'abMobile', 'abIdNo', 'abCoName', 'abCoNameEn', 'abCoCrNo', 'abCoMobile'
    ];
    abRelatedRefreshIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const handler = () => {
            try { refreshAddressBookRelatedInfoFromForm(); } catch (_e) {}
        };
        el.addEventListener('input', handler);
        el.addEventListener('change', handler);
    });
    const tenantAddressBookSelect = document.getElementById('tenantAddressBookSelect');
    if (tenantAddressBookSelect) {
        tenantAddressBookSelect.addEventListener('change', () => {
            if (tenancyDraftCompletionLocked) return;
            if (tenantAddressBookSelect.value !== '') applySelectedAddressBookTenantToForm();
        });
    }
    const resTenantAddressBookSelect = document.getElementById('resTenantAddressBookSelect');
    if (resTenantAddressBookSelect) {
        resTenantAddressBookSelect.addEventListener('change', () => {
            if (resTenantAddressBookSelect.value !== '') applySelectedAddressBookTenantToReservationForm();
        });
    }
    try { ensureReservationTenantNationalitySelect(false); } catch (_eResNat) {}

    const buildingStructureExcelInput = document.getElementById('buildingStructureExcelInput');
    if (buildingStructureExcelInput) {
        buildingStructureExcelInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) importBuildingStructuresExcel(file);
            e.target.value = '';
        });
    }

    const bhdBuildingsExcelInput = document.getElementById('bhdBuildingsExcelInput');
    if (bhdBuildingsExcelInput) {
        bhdBuildingsExcelInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) importBuildingsExcel(file);
            e.target.value = '';
        });
    }
    const bhdOwnersExcelInput = document.getElementById('bhdOwnersExcelInput');
    if (bhdOwnersExcelInput) {
        bhdOwnersExcelInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) importOwnersFromExcel(file);
            e.target.value = '';
        });
    }
    const bhdUnitsExcelInput = document.getElementById('bhdUnitsExcelInput');
    if (bhdUnitsExcelInput) {
        bhdUnitsExcelInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) importUnitsExcel(file);
            e.target.value = '';
        });
    }

    const rentedContractsExcelInput = document.getElementById('rentedContractsExcelInput');
    if (rentedContractsExcelInput) {
        rentedContractsExcelInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) importRentedContractsExcel(file);
            e.target.value = '';
        });
    }

    const unitDetailsModalEl = document.getElementById('unitDetailsModal');
    if (unitDetailsModalEl) {
        unitDetailsModalEl.addEventListener('click', (e) => {
            const t = e.target;
            if (t && (t.closest('#unitDetailsContractWrap') || t.closest('#unitDetailsPrintWrap'))) return;
            closeUnitDetailsIeMenus();
        });
    }

    const unitDetailsModal = document.getElementById('unitDetailsModal');
    if (unitDetailsModal) {
        unitDetailsModal.addEventListener('click', (e) => {
            if (e.target === unitDetailsModal) closeUnitDetailsModal();
        });
    }
    document.addEventListener('click', (e) => {
        const t = e.target;
        if (t && t.closest && t.closest('#addressBookPrintWrap')) return;
        closeAddressBookPrintMenu();
        if (t && t.closest && t.closest('#contractsPrintWrap')) return;
        closeContractPrintMenu();
        if (t && t.closest && t.closest('.app-admin-menu-wrap')) return;
        closeAppAdminMenus();
    });
    
    // بدء التشغيل (وضع آمن عند حدوث أعطال جزئية) + جلب البيانات من الخادم إن وُجد
    (async function startup() {
        closeAllDetailsModalsOnBoot();
        migrateLegacySfgStorageKeysToBhd();
        try {
            window.addEventListener('bhd-site-bridge-applied', () => {
                try {
                    bhdBridgeAppliedLightRefresh();
                } catch (_eBridgeAb) {}
            });
        } catch (_eBridgeAbWire) {}
        ensureBhdAppRefreshFastBootFromNavigation();
        const refreshFastBoot = isBhdAppRefreshFastBoot();
        if (refreshFastBoot) {
            clearBhdAppRefreshFastBoot();
            window.__bhdBootRefreshFast = true;
        }
        const siteIntegratedWeb = isBhdSiteIntegratedWebClient();
        const siteKv = isBhdSiteKvPersistenceActive();
        const warmReload = !siteKv && (refreshFastBoot || siteIntegratedWeb) && bhdLocalStorageHasSubstantiveData();
        const dataWasWiped = !!localStorage.getItem('bhd_last_data_wipe') || localStorage.getItem('bhd_hide_demo_units') === '1';

        if (warmReload) {
            window.__bhdBootRefreshFast = true;
            bhdAuditMute();
            try {
                syncAuthStateFromStorage();
                tryAutoSignInDefaultAdminIfNeeded();
                updateAuthHeaderBar();
            } catch (_eAuthWarm) {}
            try {
                loadDashboardAux(true, { fast: true });
                initializeMode();
            } catch (_eWarmUi) {
                console.warn('warm reload UI', _eWarmUi);
            }
            bhdAuditUnmute();
            try {
                initContractEditRequestNotifications();
                updateNotificationsNavBadge();
                wireRenewalMunicipalFieldHandlers();
                wireRenewalCustomRentFieldHandlers();
            } catch (_eWarmPost) {}
            setTimeout(async () => {
                try {
                    await probeBhdApi();
                    if (siteIntegratedWeb) scheduleBhdSiteBootHydrationOnce(0);
                    probeBhdCloudApi().then(() => bhdCloudTryRestoreSession()).catch(() => {});
                    scheduleAutomaticDataSync(false);
                } catch (_eWarmBg) {
                    console.warn('warm reload background', _eWarmBg);
                }
            }, 60);
            const runWarmIdleMaintenance = () => {
                try {
                    if (repairReservationMultiUnitRows()) {
                        localStorage.setItem('bhd_unit_reservations', JSON.stringify(unitReservations));
                    }
                    repairLinkedContractUnitsLifecycleConsistencyThrottled(60000);
                } catch (_eWarmRepair) {}
                try {
                    loadDashboardAux(true);
                    bhdRefreshActiveWorkspaceLight();
                } catch (_eWarmAux) {}
                try {
                    delete window.__bhdBootRefreshFast;
                } catch (_eClrFast) {}
            };
            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(runWarmIdleMaintenance, { timeout: 20000 });
            } else {
                setTimeout(runWarmIdleMaintenance, 3000);
            }
            return;
        }

        bhdAuditMute();
        if (window.bhdDesktop) {
            try {
                if (dataWasWiped && window.bhdDesktop.kvWipeAllExcept) {
                    await window.bhdDesktop.kvWipeAllExcept(BHD_KEYS_KEEP_ON_FULL_WIPE);
                }
                if (!refreshFastBoot) {
                    const snapshot = {};
                    BHD_KV_KEYS.forEach((k) => {
                        const v = localStorage.getItem(k);
                        if (v !== null) snapshot[k] = v;
                    });
                    await window.bhdDesktop.startupMigrate(snapshot);
                    const needsDbHydrate = dataWasWiped || !bhdLocalStorageHasSubstantiveData();
                    if (needsDbHydrate) {
                        const fromDb = await window.bhdDesktop.kvGetBulk();
                        hydrateBhdKvFromExternalStore(fromDb || {});
                    }
                    scheduleDesktopIdbMirror();
                }
                await dropLegacySfgIndexedDb();
            } catch (eDesk) {
                console.warn('desktop startup migrate', eDesk);
            }
        }
        await probeBhdApi();
        if (siteIntegratedWeb || refreshFastBoot) {
            setTimeout(() => {
                probeBhdCloudApi()
                    .then(() => bhdCloudTryRestoreSession())
                    .catch(() => {});
            }, 0);
        } else {
            await probeBhdCloudApi();
            await bhdCloudTryRestoreSession();
        }
        if (!dataWasWiped && !refreshFastBoot && !window.bhdDesktop && !siteIntegratedWeb) {
            await hydrateLocalStorageFromIndexedDb();
        }
        if (siteIntegratedWeb) {
            await probeBhdApi();
            if (!bhdIsPostWipeQuarantineActive()) {
                if (typeof window.__bhdRefreshAddressBookFromSite === 'function') {
                    try {
                        await window.__bhdRefreshAddressBookFromSite();
                    } catch (_eAbBootPull) {}
                }
                try {
                    await repairAddressBookEntriesFromSite();
                } catch (_eAbBootRep) {}
            }
            try {
                window.__bhdDedupeAddressBook?.();
            } catch (_eDedBootFull) {}
            await bhdHydrateSiteKvFromServerIfNeeded({ deferIdbMirror: true });
            await bhdSiteExtractKvBlobsOnce();
            muteBhdKvAutoPush(60000);
            try {
                _bhdKvDirtyKeys.clear();
            } catch (_eClrBootDirty) {}
        } else if (bhdApiAvailable && !window.bhdDesktop) {
            if (!bhdIsPostWipeQuarantineActive()) {
                if (typeof window.__bhdRefreshAddressBookFromSite === 'function') {
                    try {
                        await window.__bhdRefreshAddressBookFromSite();
                    } catch (_eAbBootPull2) {}
                }
                try {
                    await repairAddressBookEntriesFromSite();
                } catch (_eAbRep2) {}
            }
            await bhdHydrateSiteKvFromServerIfNeeded({ deferIdbMirror: true });
            try {
                window.__bhdDedupeAddressBook?.();
            } catch (_eDedBootFull2) {}
            muteBhdKvAutoPush(60000);
            try {
                _bhdKvDirtyKeys.clear();
            } catch (_eClrBootDirty2) {}
        }
        if (!refreshFastBoot) {
            await dropLegacySfgIndexedDb();
        }
        bhdAuditUnmute();
        try {
            syncAuthStateFromStorage();
            tryAutoSignInDefaultAdminIfNeeded();
            updateAuthHeaderBar();
        } catch (eAuthBoot) {
            console.warn('auth bootstrap', eAuthBoot);
        }
        try {
            loadDashboardAux(true);
            try {
                if (repairReservationMultiUnitRows()) {
                    localStorage.setItem('bhd_unit_reservations', JSON.stringify(unitReservations));
                    saveDashboardAux();
                }
            } catch (_eBootResMu) {}
            if (!siteIntegratedWeb) {
                try {
                    repairLinkedContractUnitsLifecycleConsistency();
                } catch (_eBootLinked) {}
            }
        } catch (_eDashBootLoad) {
            console.warn('loadDashboardAux startup', _eDashBootLoad);
        }
        const params = new URLSearchParams(window.location.search);
        const viewer = params.get('viewer') === '1';
        try {
            initializeMode();
        } catch (err) {
            console.error('Initialization failed:', err);
            if (err && err.stack) console.error(err.stack);
            try {
                renderDocument(0);
            } catch (innerErr) {
                console.error('Fallback render failed:', innerErr);
            }
            if (localStorage.getItem('bhd_show_init_error_alert') === '1') {
                alert('⚠️ حدث خطأ أثناء تهيئة بعض أجزاء الواجهة. تم تشغيل وضع آمن مؤقتاً، يرجى تحديث الصفحة.\n\n' + (err && err.message ? err.message : String(err)));
            }
        }
        try {
            if (
                (dataWasWiped || localStorage.getItem('bhd_hide_demo_units') === '1') &&
                !hasPersistedContractWorkspaceData()
            ) {
                clearDemoContractFormFields();
            }
            if (!refreshFastBoot) {
                loadDashboardAux(true);
            }
            const bootRefreshDashboard = () => {
                try {
                    refreshDashboardIfVisible();
                } catch (_eDashBoot) {
                    console.warn('refreshDashboardIfVisible startup', _eDashBoot);
                }
            };
            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(bootRefreshDashboard, { timeout: refreshFastBoot ? 2000 : 2000 });
            } else {
                setTimeout(bootRefreshDashboard, refreshFastBoot ? 80 : 0);
            }
            if (refreshFastBoot) {
                if (typeof requestIdleCallback === 'function') {
                    requestIdleCallback(() => scheduleAutomaticDataSync(false), { timeout: 8000 });
                } else {
                    setTimeout(() => scheduleAutomaticDataSync(false), 4000);
                }
            } else {
                scheduleAutomaticDataSync(true);
            }
            if (window.bhdDesktop?.fileListEntries && !refreshFastBoot) {
                try {
                    await repairAddressBookEntriesAttachments();
                } catch (_eRepAbAtt) {
                    console.warn('repairAddressBookEntriesAttachments', _eRepAbAtt);
                }
            } else if (bhdSiteFileStorageAvailable()) {
                try {
                    await repairAddressBookEntriesAttachmentsFromSite();
                } catch (_eRepAbAttSite) {
                    console.warn('repairAddressBookEntriesAttachmentsFromSite', _eRepAbAttSite);
                }
            } else if (refreshFastBoot && window.bhdDesktop?.fileListEntries) {
                const repairAbAtt = () => {
                    repairAddressBookEntriesAttachments().catch((e) => {
                        console.warn('repairAddressBookEntriesAttachments', e);
                    });
                };
                if (typeof requestIdleCallback === 'function') {
                    requestIdleCallback(repairAbAtt, { timeout: 20000 });
                } else {
                    setTimeout(repairAbAtt, 5000);
                }
            }
            const skipAbRebuild = dataWasWiped || localStorage.getItem('bhd_address_book') === '[]';
                const siteIntegrated = localStorage.getItem('bhd_site_integrated') === '1';
                const needsSiteAbFetch = siteIntegrated && !addressBookEntriesIncludeSiteContacts(addressBookEntries);
                if (!refreshFastBoot && !skipAbRebuild && (needsSiteAbFetch || !Array.isArray(addressBookEntries) || !addressBookEntries.length)) {
                    refreshAddressBookFromSystem(false);
                } else {
                    renderAddressBookTable();
                    try { renderAddressBookTenantSelect(); } catch (_eAbBootSel) {}
                }
        } catch (abErr) {
            console.error('Address book init failed:', abErr);
        }
        try {
            initContractEditRequestNotifications();
        } catch (_eEditNotify) {}
        try {
            updateNotificationsNavBadge();
        } catch (_eNavInitBadge) {}
        try {
            if (sessionStorage.getItem('bhd_app_refresh_done')) {
                sessionStorage.removeItem('bhd_app_refresh_done');
                setBhdDbStatus(t('تم تحديث النظام', 'System refreshed'));
            }
        } catch (_eRefDone) {}
        try {
            wireRenewalMunicipalFieldHandlers();
        } catch (_eRenMunWire) {}
        try {
            wireRenewalCustomRentFieldHandlers();
        } catch (_eRenCrWire) {}
        try {
            delete window.__bhdBootRefreshFast;
        } catch (_eBootFastClr) {}
    })();
</script>
