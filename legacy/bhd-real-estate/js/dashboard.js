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