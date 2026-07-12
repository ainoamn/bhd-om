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