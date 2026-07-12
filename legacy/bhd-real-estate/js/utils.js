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