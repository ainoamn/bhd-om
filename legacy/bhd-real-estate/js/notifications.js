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