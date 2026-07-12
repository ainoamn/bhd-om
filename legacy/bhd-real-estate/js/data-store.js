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