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