    /** === نظام المحاسبة المرتبط بالعقار / Property-linked accounting === */
    const ACCOUNTING_REGISTRY_KEY = 'bhd_accounting_registry';
    const ACCOUNTING_CHEQUE_STATUSES = ['awaiting_contract_data', 'pending_receipt', 'pending', 'deferred', 'paid_full', 'paid_partial', 'paid_cash', 'bounced', 'returned', 'receipt_rejected'];
    const ACCOUNTING_ACTION_TYPES = [
        'bank_deposit',
        'bounced',
        'tenant_contact',
        'defer',
        'cash_convert',
        'status_change',
        'reschedule',
        'receipt_confirmed',
        'receipt_rejected',
        'other'
    ];
    let _accountingSyncMuted = false;
    let _accountingChequeActionCtx = null;
    let _accountingContractReceiptCtx = null;
    let _accountingContractBulkReceiptCtx = null;
    let _accountingWorkspaceRenderPending = false;
    let _accountingJournalRebuildTimer = 0;

    function isAccountingContractReceiptModalOpen() {
        return !!(
            document.getElementById('accountingContractChequeBulkReceiptModal')?.classList.contains('open') ||
            document.getElementById('accountingContractReceiptModal')?.classList.contains('open')
        );
    }

    function scheduleAccountingJournalRebuild(reg, force) {
        const target = reg || loadAccountingRegistry();
        if (!target) return;
        clearTimeout(_accountingJournalRebuildTimer);
        const run = () => {
            _accountingJournalRebuildTimer = 0;
            if (isAccountingContractReceiptModalOpen()) {
                _accountingJournalRebuildTimer = setTimeout(run, 400);
                return;
            }
            try {
                if (_accountingRegistryCache === target) ensureAccountingJournalLedger(target, !!force);
            } catch (_eJlSched) {
                console.warn('scheduleAccountingJournalRebuild', _eJlSched);
            }
        };
        if (isAccountingContractReceiptModalOpen()) {
            _accountingJournalRebuildTimer = setTimeout(run, 400);
            return;
        }
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(() => run(), { timeout: force ? 3000 : 12000 });
        } else {
            _accountingJournalRebuildTimer = setTimeout(run, force ? 120 : 2500);
        }
    }

    function flushPendingAccountingWorkspaceRender() {
        if (!_accountingWorkspaceRenderPending) return;
        _accountingWorkspaceRenderPending = false;
        renderAccountingWorkspace();
    }

    function accountingChequeAttachmentLooksPresent(att) {
        const norm = finalizeAccountingAttachmentRef(att, '');
        return !!(
            norm &&
            (contractAttachmentPresent(norm) ||
                toStr(norm.fileId) ||
                toStr(norm.relativePath) ||
                toStr(norm.dataUrl))
        );
    }
    let _accountingChequesTbodyDebounceTimer = 0;
    let _accountingRegistryCache = null;
    let _accountingRegistryCacheRaw = null;
    let _accountingRegistrySaving = false;
    let _accountingRenderDebounceTimer = 0;
    let _accountingUiState = {
        tab: 'cheques',
        building: '',
        unit: '',
        search: '',
        chequeStatus: '',
        tenant: '',
        agreementNo: '',
        dueMonth: '',
        dueDay: '',
        dueDateFrom: '',
        dueDateTo: '',
        bucket: '',
        pendingType: '',
        depositType: '',
        depositStatus: '',
        invoiceStatus: '',
        ledgerStatus: '',
        coaExpanded: {},
        coaSearch: '',
        reportSearch: ''
    };

    function accountingFilterFieldMatches(hay, needle) {
        const q = toStr(needle).trim().toLowerCase();
        if (!q) return true;
        return toStr(hay).toLowerCase().includes(q);
    }

    function countAccountingTabActiveFilters(tab) {
        const st = _accountingUiState;
        let n = 0;
        const bump = (v) => {
            if (toStr(v).trim()) n++;
        };
        bump(st.search);
        bump(st.building);
        bump(st.unit);
        bump(st.tenant);
        bump(st.dueDateFrom);
        bump(st.dueDateTo);
        if (tab === 'cheques') {
            bump(st.bucket);
            bump(st.chequeStatus);
            const f = ensureAccountingChequeTableState().filters;
            Object.values(f).forEach(bump);
            if (ensureAccountingChequeTableState().filterRowVisible) n = Math.max(n, 1);
        } else if (tab === 'pending') {
            bump(st.pendingType);
        } else if (tab === 'deposits') {
            bump(st.depositType);
            bump(st.depositStatus);
        } else if (tab === 'invoices') {
            bump(st.invoiceStatus);
        } else if (tab === 'income' || tab === 'expense') {
            bump(st.ledgerStatus);
        }
        return n;
    }

    function clearAccountingTabFilters(tab) {
        _accountingUiState.search = '';
        _accountingUiState.building = '';
        _accountingUiState.unit = '';
        _accountingUiState.tenant = '';
        _accountingUiState.agreementNo = '';
        _accountingUiState.dueDateFrom = '';
        _accountingUiState.dueDateTo = '';
        _accountingUiState.dueMonth = '';
        _accountingUiState.dueDay = '';
        _accountingUiState.chequeStatus = '';
        _accountingUiState.bucket = '';
        _accountingUiState.pendingType = '';
        _accountingUiState.depositType = '';
        _accountingUiState.depositStatus = '';
        _accountingUiState.invoiceStatus = '';
        _accountingUiState.ledgerStatus = '';
        if (tab === 'cheques') {
            const st = ensureAccountingChequeTableState();
            Object.keys(st.filters).forEach((k) => {
                st.filters[k] = '';
            });
            st.filterRowVisible = false;
            renderAccountingWorkspace();
            return;
        }
        renderAccountingWorkspace();
    }

    function setAccountingChequesGlobalSearch(value) {
        _accountingUiState.search = toStr(value);
        scheduleAccountingChequesTbodyRefresh();
    }

    function setAccountingChequesQuickFilter(value) {
        _accountingUiState.bucket = toStr(value);
        scheduleAccountingChequesTbodyRefresh();
    }

    function setAccountingChequesStatusFilter(value) {
        _accountingUiState.chequeStatus = toStr(value);
        scheduleAccountingChequesTbodyRefresh();
    }

    function buildAccountingTabToolbar(tab) {
        const st = _accountingUiState;
        const activeN = countAccountingTabActiveFilters(tab);
        const activeBadge =
            activeN > 0
                ? `<span class="acct-tab-toolbar__active-count">${t('فلاتر نشطة', 'Active filters')}: ${activeN}</span>`
                : '';
        const clearBtn = `<button type="button" class="btn-outline mini-btn" onclick="clearAccountingTabFilters('${escHtml(tab)}')">${t('مسح الكل', 'Clear all')}</button>`;
        const lbl = (ar, en) => `<span class="acct-tab-toolbar__label">${t(ar, en)}</span>`;

        if (tab === 'cheques') {
            const bucket = toStr(st.bucket);
            const status = toStr(st.chequeStatus);
            return `<div class="acct-tab-toolbar acct-tab-toolbar--cheques">
                <div class="acct-tab-toolbar__field acct-tab-toolbar__field--grow">
                    ${lbl('بحث في الشيكات', 'Search cheques')}
                    <input type="search" value="${escHtml(st.search)}" placeholder="${t('رقم شيك، مستأجر، عقد، مبنى...', 'Cheque no., tenant, contract, building...')}" oninput="setAccountingChequesGlobalSearch(this.value)">
                </div>
                <div class="acct-tab-toolbar__field">
                    ${lbl('التصنيف', 'Category')}
                    <select onchange="setAccountingChequesQuickFilter(this.value)">
                        <option value="">${t('كل الشيكات', 'All cheques')}</option>
                        <option value="overdue" ${bucket === 'overdue' ? 'selected' : ''}>${t('متأخر', 'Overdue')}</option>
                        <option value="due" ${bucket === 'due' ? 'selected' : ''}>${t('مستحق الآن', 'Due now')}</option>
                        <option value="upcoming" ${bucket === 'upcoming' ? 'selected' : ''}>${t('قادم', 'Upcoming')}</option>
                        <option value="deferred" ${bucket === 'deferred' ? 'selected' : ''}>${t('مؤجّل', 'Deferred')}</option>
                        <option value="paid" ${bucket === 'paid' ? 'selected' : ''}>${t('مدفوع', 'Paid')}</option>
                    </select>
                </div>
                <div class="acct-tab-toolbar__field">
                    ${lbl('الحالة', 'Status')}
                    <select onchange="setAccountingChequesStatusFilter(this.value)">
                        <option value="">${t('كل الحالات', 'All statuses')}</option>
                        ${ACCOUNTING_CHEQUE_STATUSES.map((s) => `<option value="${escHtml(s)}" ${status === s ? 'selected' : ''}>${escHtml(accountingChequeStatusLabel(s))}</option>`).join('')}
                    </select>
                </div>
                <div class="acct-tab-toolbar__actions">${activeBadge}${clearBtn}</div>
                <p class="acct-tab-toolbar__hint">${t('لتصفية عمود معيّن (مبنى، وحدة، تاريخ...) اضغط 🔍 في رأس الجدول.', 'For a specific column (building, unit, date…), click 🔍 in the table header.')}</p>
            </div>`;
        }

        if (tab === 'income' || tab === 'expense') {
            const ledgerStatus = toStr(st.ledgerStatus);
            return `<div class="acct-tab-toolbar">
                <div class="acct-tab-toolbar__field acct-tab-toolbar__field--grow">
                    ${lbl('بحث', 'Search')}
                    <input type="search" value="${escHtml(st.search)}" placeholder="${t('سند، عميل، بند، رقم طلب...', 'Voucher, party, item, request no...')}" oninput="_accountingUiState.search=this.value; scheduleAccountingWorkspaceRender()">
                </div>
                <div class="acct-tab-toolbar__field">
                    ${lbl('مبنى', 'Building')}
                    <input type="text" value="${escHtml(st.building)}" placeholder="${t('مثال: 369', 'e.g. 369')}" oninput="_accountingUiState.building=this.value; scheduleAccountingWorkspaceRender()">
                </div>
                <div class="acct-tab-toolbar__field">
                    ${lbl('وحدة', 'Unit')}
                    <input type="text" value="${escHtml(st.unit)}" placeholder="${t('مثال: 3', 'e.g. 3')}" oninput="_accountingUiState.unit=this.value; scheduleAccountingWorkspaceRender()">
                </div>
                <div class="acct-tab-toolbar__field">
                    ${lbl('الجهة / المستأجر', 'Party / tenant')}
                    <input type="text" value="${escHtml(st.tenant)}" placeholder="${t('اسم العميل', 'Client name')}" oninput="_accountingUiState.tenant=this.value; scheduleAccountingWorkspaceRender()">
                </div>
                <div class="acct-tab-toolbar__field">
                    ${lbl('من تاريخ', 'From date')}
                    <input type="date" value="${escHtml(st.dueDateFrom)}" onchange="_accountingUiState.dueDateFrom=this.value; renderAccountingWorkspace()">
                </div>
                <div class="acct-tab-toolbar__field">
                    ${lbl('إلى تاريخ', 'To date')}
                    <input type="date" value="${escHtml(st.dueDateTo)}" onchange="_accountingUiState.dueDateTo=this.value; renderAccountingWorkspace()">
                </div>
                <div class="acct-tab-toolbar__field">
                    ${lbl('الحالة', 'Status')}
                    <select onchange="_accountingUiState.ledgerStatus=this.value; renderAccountingWorkspace()">
                        <option value="">${t('الكل', 'All')}</option>
                        <option value="confirmed" ${ledgerStatus === 'confirmed' ? 'selected' : ''}>${t('معتمد', 'Approved')}</option>
                        <option value="pending" ${ledgerStatus === 'pending' ? 'selected' : ''}>${t('بانتظار الاعتماد', 'Pending approval')}</option>
                        <option value="rejected" ${ledgerStatus === 'rejected' ? 'selected' : ''}>${t('مرفوض', 'Rejected')}</option>
                    </select>
                </div>
                <div class="acct-tab-toolbar__actions">${activeBadge}${clearBtn}</div>
            </div>`;
        }

        if (tab === 'pending') {
            const pendingType = toStr(st.pendingType);
            return `<div class="acct-tab-toolbar">
                <div class="acct-tab-toolbar__field acct-tab-toolbar__field--grow">
                    ${lbl('بحث في الطلبات', 'Search requests')}
                    <input type="search" value="${escHtml(st.search)}" placeholder="${t('رقم طلب ARQ، سند، بند، جهة...', 'ARQ request no., voucher, item, party...')}" oninput="_accountingUiState.search=this.value; scheduleAccountingWorkspaceRender()">
                </div>
                <div class="acct-tab-toolbar__field">
                    ${lbl('مبنى', 'Building')}
                    <input type="text" value="${escHtml(st.building)}" oninput="_accountingUiState.building=this.value; scheduleAccountingWorkspaceRender()">
                </div>
                <div class="acct-tab-toolbar__field">
                    ${lbl('وحدة', 'Unit')}
                    <input type="text" value="${escHtml(st.unit)}" oninput="_accountingUiState.unit=this.value; scheduleAccountingWorkspaceRender()">
                </div>
                <div class="acct-tab-toolbar__field">
                    ${lbl('نوع المعاملة', 'Transaction type')}
                    <select onchange="_accountingUiState.pendingType=this.value; renderAccountingWorkspace()">
                        <option value="">${t('الكل', 'All')}</option>
                        <option value="income" ${pendingType === 'income' ? 'selected' : ''}>${t('إيراد', 'Income')}</option>
                        <option value="expense" ${pendingType === 'expense' ? 'selected' : ''}>${t('مصروف', 'Expense')}</option>
                    </select>
                </div>
                <div class="acct-tab-toolbar__actions">${activeBadge}${clearBtn}</div>
            </div>`;
        }

        if (tab === 'deposits') {
            const depositType = toStr(st.depositType);
            const depositStatus = toStr(st.depositStatus);
            return `<div class="acct-tab-toolbar">
                <div class="acct-tab-toolbar__field acct-tab-toolbar__field--grow">
                    ${lbl('بحث', 'Search')}
                    <input type="search" value="${escHtml(st.search)}" placeholder="${t('مرجع، مبنى، وحدة، مستأجر...', 'Reference, building, unit, tenant...')}" oninput="_accountingUiState.search=this.value; scheduleAccountingWorkspaceRender()">
                </div>
                <div class="acct-tab-toolbar__field">
                    ${lbl('مبنى', 'Building')}
                    <input type="text" value="${escHtml(st.building)}" oninput="_accountingUiState.building=this.value; scheduleAccountingWorkspaceRender()">
                </div>
                <div class="acct-tab-toolbar__field">
                    ${lbl('وحدة', 'Unit')}
                    <input type="text" value="${escHtml(st.unit)}" oninput="_accountingUiState.unit=this.value; scheduleAccountingWorkspaceRender()">
                </div>
                <div class="acct-tab-toolbar__field">
                    ${lbl('نوع الضمان', 'Deposit type')}
                    <select onchange="_accountingUiState.depositType=this.value; renderAccountingWorkspace()">
                        <option value="">${t('الكل', 'All')}</option>
                        <option value="security" ${depositType === 'security' ? 'selected' : ''}>${t('ضمان', 'Security')}</option>
                        <option value="insurance" ${depositType === 'insurance' ? 'selected' : ''}>${t('تأمين', 'Insurance')}</option>
                    </select>
                </div>
                <div class="acct-tab-toolbar__field">
                    ${lbl('الحالة', 'Status')}
                    <select onchange="_accountingUiState.depositStatus=this.value; renderAccountingWorkspace()">
                        <option value="">${t('الكل', 'All')}</option>
                        <option value="pending_receipt" ${depositStatus === 'pending_receipt' ? 'selected' : ''}>${t('بانتظار الاعتماد', 'Awaiting approval')}</option>
                        <option value="held" ${depositStatus === 'held' ? 'selected' : ''}>${t('محتجز', 'Held')}</option>
                        <option value="receipt_rejected" ${depositStatus === 'receipt_rejected' ? 'selected' : ''}>${t('مرفوض', 'Rejected')}</option>
                    </select>
                </div>
                <div class="acct-tab-toolbar__actions">${activeBadge}${clearBtn}</div>
            </div>`;
        }

        if (tab === 'invoices') {
            const invoiceStatus = toStr(st.invoiceStatus);
            return `<div class="acct-tab-toolbar">
                <div class="acct-tab-toolbar__field acct-tab-toolbar__field--grow">
                    ${lbl('بحث في الفواتير', 'Search invoices')}
                    <input type="search" value="${escHtml(st.search)}" placeholder="${t('رقم فاتورة، مستأجر، مبنى...', 'Invoice no., tenant, building...')}" oninput="_accountingUiState.search=this.value; scheduleAccountingWorkspaceRender()">
                </div>
                <div class="acct-tab-toolbar__field">
                    ${lbl('مبنى', 'Building')}
                    <input type="text" value="${escHtml(st.building)}" oninput="_accountingUiState.building=this.value; scheduleAccountingWorkspaceRender()">
                </div>
                <div class="acct-tab-toolbar__field">
                    ${lbl('وحدة', 'Unit')}
                    <input type="text" value="${escHtml(st.unit)}" oninput="_accountingUiState.unit=this.value; scheduleAccountingWorkspaceRender()">
                </div>
                <div class="acct-tab-toolbar__field">
                    ${lbl('حالة السداد', 'Payment status')}
                    <select onchange="_accountingUiState.invoiceStatus=this.value; renderAccountingWorkspace()">
                        <option value="">${t('الكل', 'All')}</option>
                        <option value="open" ${invoiceStatus === 'open' ? 'selected' : ''}>${t('غير مسددة', 'Unpaid')}</option>
                        <option value="partial" ${invoiceStatus === 'partial' ? 'selected' : ''}>${t('مسددة جزئياً', 'Partial')}</option>
                        <option value="paid" ${invoiceStatus === 'paid' ? 'selected' : ''}>${t('مسددة', 'Paid')}</option>
                    </select>
                </div>
                <div class="acct-tab-toolbar__actions">${activeBadge}${clearBtn}</div>
            </div>`;
        }

        if (tab === 'journals') {
            return `<div class="acct-tab-toolbar">
                <div class="acct-tab-toolbar__field acct-tab-toolbar__field--grow">
                    ${lbl('بحث في القيود', 'Search journal entries')}
                    <input type="search" value="${escHtml(st.search)}" placeholder="${t('رقم قيد، بيان، مرجع...', 'Entry #, description, reference...')}" oninput="_accountingUiState.search=this.value; scheduleAccountingWorkspaceRender()">
                </div>
                <div class="acct-tab-toolbar__field">
                    ${lbl('من تاريخ', 'From date')}
                    <input type="date" value="${escHtml(st.dueDateFrom)}" onchange="_accountingUiState.dueDateFrom=this.value; renderAccountingWorkspace()">
                </div>
                <div class="acct-tab-toolbar__field">
                    ${lbl('إلى تاريخ', 'To date')}
                    <input type="date" value="${escHtml(st.dueDateTo)}" onchange="_accountingUiState.dueDateTo=this.value; renderAccountingWorkspace()">
                </div>
                <div class="acct-tab-toolbar__actions">${activeBadge}${clearBtn}</div>
            </div>`;
        }

        return '';
    }

    function ensureAccountingChequeTableState() {
        if (!_accountingUiState.chequeTable) {
            _accountingUiState.chequeTable = {
                filterRowVisible: false,
                focusCol: '',
                filters: {
                    building: '',
                    unit: '',
                    tenant: '',
                    sourceType: '',
                    chequeNo: '',
                    dueFrom: '',
                    dueTo: '',
                    amount: '',
                    status: ''
                },
                sort: { key: 'dueDate', dir: 'desc' }
            };
        }
        return _accountingUiState.chequeTable;
    }

    function toggleAccountingChequeColFilter(colKey) {
        const st = ensureAccountingChequeTableState();
        const opening = !st.filterRowVisible;
        st.filterRowVisible = opening;
        st.focusCol = opening ? toStr(colKey) : '';
        renderAccountingWorkspace();
    }

    function setAccountingChequeColSort(colKey) {
        const st = ensureAccountingChequeTableState();
        const key = toStr(colKey);
        if (st.sort.key === key) {
            st.sort.dir = st.sort.dir === 'asc' ? 'desc' : 'asc';
        } else {
            st.sort.key = key;
            st.sort.dir = key === 'dueDate' || key === 'amount' ? 'desc' : 'asc';
        }
        renderAccountingWorkspace();
    }

    function accountingChequeColFilterInput(key, value) {
        const st = ensureAccountingChequeTableState();
        st.filters[key] = toStr(value);
        scheduleAccountingChequesTbodyRefresh();
    }

    function getAccountingChequesDisplayRows(regOpt) {
        const reg = regOpt || loadAccountingRegistry();
        let rows = (reg.cheques || []).filter(isAccountingChequeVisibleInWorkspace).slice();
        rows = applyAccountingChequeColFilters(rows);
        const q = toStr(_accountingUiState.search).trim();
        if (q) rows = rows.filter((c) => accountingMatchesSearch(c, q));
        rows = rows.filter(accountingChequeMatchesFilters);
        return sortAccountingChequeRows(rows);
    }

    function getAccountingChequesUnitFilterForActions() {
        const f = ensureAccountingChequeTableState().filters;
        const b = toStr(f.building).trim();
        const u = toStr(f.unit).trim();
        return b && u ? { building: b, unit: u } : null;
    }

    function buildAccountingChequeTableRowHtml(c, reg) {
        const overdue = isAccountingChequeOverdue(c);
        const cid = escHtml(c.id);
        const bEsc = escHtml(c.building).replace(/'/g, "\\'");
        const uEsc = escHtml(c.unit).replace(/'/g, "\\'");
        const lastDate = c.lastActionDate ? formatAccountingDisplayDate(c.lastActionDate) : '—';
        const parent = isAccountingChequePaidStatus(c.status) ? findParentReceiptAllocationForCheque(c.id, reg) : null;
        const receiptBtn = isAccountingChequePaidStatus(c.status)
            ? `<button type="button" class="btn-outline mini-btn" onclick="printAccountingChequeReceipt('${cid}')" title="${t('طباعة الإيصال', 'Print receipt')}">🖨️ ${parent ? t('إيصال', 'Receipt') : t('طباعة', 'Print')}</button>${parent ? `<button type="button" class="btn-outline mini-btn" onclick="openAccountingReceiptDetailModal('${escHtml(parent.entry.id)}')">${t('السند', 'Voucher')}</button>` : ''}`
            : '';
        return `<tr>
            <td>${escHtml(c.building)}</td>
            <td><span class="acct-unit-link" onclick="openAccountingUnitAccountModal('${bEsc}','${uEsc}')">${escHtml(c.unit)}</span></td>
            <td><span class="acct-tenant-chip" onclick="openAccountingUnitAccountModal('${bEsc}','${uEsc}','${escHtml(accountingTenantKey(c.tenant, c.agreementNo)).replace(/'/g, "\\'")}')" title="${escHtml(c.agreementNo || '')}">${escHtml(c.tenant || '—')}</span></td>
            <td>${escHtml(c.sourceType === 'vat' ? t('ضريبة', 'VAT') : t('إيجار', 'Rent'))}</td>
            <td>${escHtml(c.chequeNo || '—')}</td>
            <td>${escHtml(c.dueDate || '—')}${c.originalDueDate && c.originalDueDate !== c.dueDate ? `<br><small style="color:#888">${t('أصلي', 'Orig')}: ${escHtml(c.originalDueDate)}</small>` : ''}</td>
            <td>${escHtml(summaryAmtOm(c.amount))}</td>
            <td>${accountingChequeStatusChip(c.status, overdue)}</td>
            <td style="min-width:180px">
                <span class="acct-action-date">${t('تاريخ الإجراء', 'Action date')}: ${escHtml(lastDate)}</span>
                <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">
                    ${isAccountingChequePendingReceipt(c.status) && canApproveAccountingEntry() ? `<button type="button" class="btn-primary mini-btn" onclick="openAccountingContractReceiptApprovalModal('cheque','${cid}')">${t('اعتماد الاستلام', 'Confirm receipt')}</button>` : ''}
                    <button type="button" class="btn-primary mini-btn" onclick="openAccountingChequeActionModal('${cid}','action')">${t('إدارة', 'Manage')}</button>
                    <button type="button" class="btn-outline mini-btn" onclick="openAccountingChequeActionModal('${cid}','history')">${t('السجل', 'Log')}</button>
                    ${receiptBtn}
                    <button type="button" class="btn-outline mini-btn" onclick="printAccountingChequeMovementReport('${cid}')">🖨️ ${t('كشف', 'Log')}</button>
                </div>
            </td>
        </tr>`;
    }

    function buildAccountingChequesTbodyHtml(regOpt) {
        const reg = regOpt || loadAccountingRegistry();
        const rows = getAccountingChequesDisplayRows(reg);
        return rows.length
            ? rows.map((c) => buildAccountingChequeTableRowHtml(c, reg)).join('')
            : `<tr><td colspan="9" style="text-align:center;padding:16px;color:#666">${t('لا توجد شيكات', 'No cheques')}</td></tr>`;
    }

    function renderAccountingChequesTbodyOnly() {
        const tbody = document.getElementById('accountingChequesTableBody');
        if (!tbody) return;
        tbody.innerHTML = buildAccountingChequesTbodyHtml();
    }

    function scheduleAccountingChequesTbodyRefresh() {
        clearTimeout(_accountingChequesTbodyDebounceTimer);
        _accountingChequesTbodyDebounceTimer = setTimeout(() => {
            _accountingChequesTbodyDebounceTimer = 0;
            renderAccountingChequesTbodyOnly();
        }, 120);
    }

    function initAccountingChequeFilterDelegation() {
        const host = document.getElementById('accountingPanelHost');
        if (!host || host.dataset.acctChqFiltWire === '1') return;
        host.dataset.acctChqFiltWire = '1';
        host.addEventListener('input', (e) => {
            const el = e.target;
            if (!el || !el.id || !el.id.startsWith('acctChqFilt_')) return;
            const key = el.id.slice('acctChqFilt_'.length);
            const st = ensureAccountingChequeTableState();
            if (!Object.prototype.hasOwnProperty.call(st.filters, key)) return;
            st.filters[key] = el.value;
            scheduleAccountingChequesTbodyRefresh();
        });
        host.addEventListener('change', (e) => {
            const el = e.target;
            if (!el || !el.id || !el.id.startsWith('acctChqFilt_')) return;
            const key = el.id.slice('acctChqFilt_'.length);
            const st = ensureAccountingChequeTableState();
            if (!Object.prototype.hasOwnProperty.call(st.filters, key)) return;
            st.filters[key] = el.value;
            renderAccountingChequesTbodyOnly();
        });
    }

    function clearAccountingChequeColFilters() {
        const st = ensureAccountingChequeTableState();
        Object.keys(st.filters).forEach((k) => {
            st.filters[k] = '';
        });
        renderAccountingWorkspace();
    }

    function accountingChequeColHeader(label, colKey, sortable) {
        const st = ensureAccountingChequeTableState();
        const key = toStr(colKey);
        const isActive = sortable && st.sort.key === key;
        const sortIcon = isActive ? (st.sort.dir === 'asc' ? '↑' : '↓') : '↕';
        const sortCls = isActive ? ' bhd-col-sort-btn is-active' : ' bhd-col-sort-btn';
        return `<th class="bhd-col-header">
            <div class="bhd-col-header__inner">
                <span class="bhd-col-header__label">${escHtml(label)}</span>
                <span class="bhd-col-header__tools">
                    ${sortable ? `<button type="button" class="${sortCls.trim()}" title="${t('ترتيب', 'Sort')}" onclick="setAccountingChequeColSort('${key}')">${sortIcon}</button>` : ''}
                    <button type="button" class="bhd-col-filter-btn" title="${t('تصفية العمود', 'Filter column')}" onclick="toggleAccountingChequeColFilter('${key}')">🔍</button>
                </span>
            </div>
        </th>`;
    }

    function buildAccountingChequeFilterRowHtml() {
        const st = ensureAccountingChequeTableState();
        const f = st.filters;
        const hiddenAttr = st.filterRowVisible ? '' : ' hidden';
        const ph = (ar, en) => escHtml(t(ar, en));
        const statusOpts = `<option value="">${t('الكل', 'All')}</option>${ACCOUNTING_CHEQUE_STATUSES.map((s) => `<option value="${escHtml(s)}" ${f.status === s ? 'selected' : ''}>${escHtml(accountingChequeStatusLabel(s))}</option>`).join('')}`;
        return `<tr id="accountingChequeFilterRow" class="bhd-col-filter-row"${hiddenAttr}>
            <th><input id="acctChqFilt_building" value="${escHtml(f.building)}" placeholder="${ph('مبنى', 'Building')}"></th>
            <th><input id="acctChqFilt_unit" value="${escHtml(f.unit)}" placeholder="${ph('وحدة', 'Unit')}"></th>
            <th><input id="acctChqFilt_tenant" value="${escHtml(f.tenant)}" placeholder="${ph('مستأجر', 'Tenant')}"></th>
            <th><input id="acctChqFilt_sourceType" value="${escHtml(f.sourceType)}" placeholder="${ph('إيجار / ضريبة', 'Rent / VAT')}"></th>
            <th><input id="acctChqFilt_chequeNo" value="${escHtml(f.chequeNo)}" placeholder="${ph('رقم الشيك', 'Cheque no.')}"></th>
            <th class="bhd-col-filter-date">
                <input type="date" id="acctChqFilt_dueFrom" value="${escHtml(f.dueFrom)}" title="${ph('من تاريخ', 'From date')}">
                <input type="date" id="acctChqFilt_dueTo" value="${escHtml(f.dueTo)}" title="${ph('إلى تاريخ', 'To date')}">
            </th>
            <th><input id="acctChqFilt_amount" value="${escHtml(f.amount)}" placeholder="${ph('مبلغ', 'Amount')}" inputmode="decimal"></th>
            <th><select id="acctChqFilt_status">${statusOpts}</select></th>
            <th><button type="button" class="btn-outline mini-btn" onclick="clearAccountingChequeColFilters()">${t('مسح', 'Clear')}</button></th>
        </tr>`;
    }

    function applyAccountingChequeColFilters(cheques) {
        const f = ensureAccountingChequeTableState().filters;
        const inc = (hay, needle) => !needle || toStr(hay).toLowerCase().includes(toStr(needle).toLowerCase());
        return (cheques || []).filter((c) => {
            if (!inc(c.building, f.building)) return false;
            if (!inc(c.unit, f.unit)) return false;
            if (!inc(c.tenant, f.tenant)) return false;
            if (f.sourceType) {
                const srcLbl = c.sourceType === 'vat' ? 'vat ضريبة' : 'rent إيجار';
                if (!inc(srcLbl, f.sourceType) && !inc(c.sourceType, f.sourceType)) return false;
            }
            if (!inc(c.chequeNo, f.chequeNo)) return false;
            const due = toStr(c.dueDate);
            if (f.dueFrom && due && due < f.dueFrom) return false;
            if (f.dueTo && due && due > f.dueTo) return false;
            if (f.amount) {
                const amt = parseFloat(c.amount) || 0;
                const qNum = parseFloat(f.amount);
                if (!Number.isNaN(qNum)) {
                    if (Math.abs(amt - qNum) > 0.001 && !String(amt).includes(f.amount)) return false;
                } else if (!String(amt).includes(f.amount)) return false;
            }
            if (f.status && toStr(c.status) !== f.status) return false;
            return true;
        });
    }

    function sortAccountingChequeRows(cheques) {
        const { key, dir } = ensureAccountingChequeTableState().sort;
        const mul = dir === 'asc' ? 1 : -1;
        const cmpText = (a, b) => mul * toStr(a).localeCompare(toStr(b), undefined, { numeric: true, sensitivity: 'base' });
        return (cheques || []).slice().sort((a, b) => {
            switch (key) {
                case 'building':
                    return cmpText(a.building, b.building);
                case 'unit':
                    return cmpText(a.unit, b.unit);
                case 'tenant':
                    return cmpText(a.tenant, b.tenant);
                case 'sourceType':
                    return cmpText(a.sourceType, b.sourceType);
                case 'chequeNo':
                    return cmpText(a.chequeNo, b.chequeNo);
                case 'dueDate':
                    return cmpText(a.dueDate, b.dueDate);
                case 'amount':
                    return mul * ((parseFloat(a.amount) || 0) - (parseFloat(b.amount) || 0));
                case 'status':
                    return cmpText(a.status, b.status);
                default:
                    return cmpText(a.dueDate, b.dueDate);
            }
        });
    }

    function focusAccountingChequeColFilterIfNeeded() {
        const st = ensureAccountingChequeTableState();
        if (!st.filterRowVisible || !st.focusCol) return;
        const col = st.focusCol;
        st.focusCol = '';
        setTimeout(() => {
            const el = document.getElementById(`acctChqFilt_${col}`);
            if (el) {
                try {
                    el.focus();
                    if (el.select) el.select();
                } catch (_eChqFoc) {}
            }
        }, 40);
    }

    function emptyAccountingRegistry() {
        return {
            version: 4,
            accounts: {},
            cheques: [],
            entries: [],
            deposits: [],
            invoices: [],
            bankAccounts: [],
            chartOfAccounts: defaultChartOfAccounts(),
            settings: defaultAccountingSettings(),
            branches: [],
            costCenters: [],
            projects: [],
            employees: [],
            payrollRuns: [],
            inventoryItems: [],
            warehouses: [],
            stockMovements: [],
            journals: [],
            journalLedgerVersion: 0,
            openingBalances: [],
            bankTransfers: []
        };
    }

    function ensureAccountingRegistryExtensions(reg) {
        if (!reg || typeof reg !== 'object') return reg;
        if (!Array.isArray(reg.branches)) reg.branches = [];
        if (!Array.isArray(reg.costCenters)) reg.costCenters = [];
        if (!Array.isArray(reg.projects)) reg.projects = [];
        if (!Array.isArray(reg.employees)) reg.employees = [];
        if (!Array.isArray(reg.payrollRuns)) reg.payrollRuns = [];
        if (!Array.isArray(reg.inventoryItems)) reg.inventoryItems = [];
        if (!Array.isArray(reg.warehouses)) reg.warehouses = [];
        if (!Array.isArray(reg.stockMovements)) reg.stockMovements = [];
        if (!Array.isArray(reg.journals)) reg.journals = [];
        if (!Array.isArray(reg.openingBalances)) reg.openingBalances = [];
        if (!Array.isArray(reg.bankTransfers)) reg.bankTransfers = [];
        if (reg.journalLedgerVersion == null) reg.journalLedgerVersion = 0;
        syncAccountingBranchesFromProperties(reg);
        return reg;
    }

    function syncAccountingBranchesFromProperties(reg) {
        try {
            const seen = new Set((reg.branches || []).map((b) => toStr(b.code || b.id)));
            const buildings = new Set();
            getUnitsData().forEach((u) => { if (toStr(u.building)) buildings.add(toStr(u.building)); });
            (reg.cheques || []).forEach((c) => { if (toStr(c.building)) buildings.add(toStr(c.building)); });
            buildings.forEach((code) => {
                const id = `branch_${code.replace(/\W/g, '_')}`;
                if (seen.has(code) || seen.has(id)) return;
                reg.branches.push({
                    id,
                    code,
                    nameAr: `${t('فرع', 'Branch')} ${code}`,
                    nameEn: `Branch ${code}`,
                    source: 'property',
                    active: true
                });
                seen.add(code);
                seen.add(id);
            });
        } catch (_eSyncBranches) {
            console.warn('syncAccountingBranchesFromProperties', _eSyncBranches);
        }
    }

    function wireAccountingReportsDelegation() {
        if (window._acctReportsDelegated) return;
        window._acctReportsDelegated = true;
        document.addEventListener('click', (e) => {
            const card = e.target.closest('[data-acct-report]');
            if (!card || card.disabled) return;
            const id = toStr(card.getAttribute('data-acct-report'));
            if (id) runAccountingReport(id);
        });
    }

    function closeAllDetailsModalsOnBoot() {
        try {
            document.querySelectorAll('.details-modal.open').forEach((m) => m.classList.remove('open'));
        } catch (_eCloseModals) {}
    }

    function installGlobalUiErrorShield() {
        if (window._bhdUiErrorShieldInstalled) return;
        window._bhdUiErrorShieldInstalled = true;
        window.addEventListener('error', (ev) => {
            console.error('UI error:', ev.error || ev.message);
            try {
                const bar = document.getElementById('bhdDbStatus');
                if (bar && ev.message) {
                    bar.textContent = (toStr(bar.textContent) + ' · ⚠ ' + ev.message).slice(0, 220);
                }
            } catch (_eBar) {}
        });
        window.addEventListener('unhandledrejection', (ev) => {
            console.error('Unhandled promise:', ev.reason);
        });
    }

    function defaultAccountingSettings() {
        return {
            penalties: {
                autoPenaltyOnBounce: true,
                bounceFixedAmount: 10
            },
            sequences: {}
        };
    }

    function normalizeAccountingPenaltySettings(penalties) {
        const base = penalties && typeof penalties === 'object' ? penalties : {};
        if (base.bounceFixedAmount == null) {
            const legacy = parseFloat(base.bouncePercent);
            base.bounceFixedAmount = Number.isFinite(legacy) ? legacy : defaultAccountingSettings().penalties.bounceFixedAmount;
        }
        if (base.autoPenaltyOnBounce == null) base.autoPenaltyOnBounce = true;
        return base;
    }

    function getDefaultBouncePenaltyAmount(settingsOpt) {
        const settings = settingsOpt || getAccountingSettings();
        return getBouncePenaltyFixedAmount(normalizeAccountingPenaltySettings(settings.penalties).bounceFixedAmount);
    }

    function getBouncePenaltyFixedAmount(amount) {
        const amt = parseFloat(amount);
        if (!Number.isFinite(amt) || amt < 0) return 0;
        return parseFloat(amt.toFixed(3));
    }

    function getAccountingSettings(regOpt) {
        const reg = regOpt || loadAccountingRegistry();
        if (!reg.settings || typeof reg.settings !== 'object') reg.settings = defaultAccountingSettings();
        if (!reg.settings.sequences || typeof reg.settings.sequences !== 'object') reg.settings.sequences = {};
        reg.settings.penalties = normalizeAccountingPenaltySettings(reg.settings.penalties);
        return reg.settings;
    }

    function peekNextManualVoucherNo(kind) {
        const settings = getAccountingSettings();
        const year = new Date().getFullYear();
        const key = kind === 'expense' ? `expenseVoucher_${year}` : `receiptVoucher_${year}`;
        const n = (settings.sequences[key] || 0) + 1;
        const prefix = kind === 'expense' ? 'PAY' : 'RCP';
        return `${prefix}-${year}-${String(n).padStart(5, '0')}`;
    }

    function commitNextManualVoucherNo(kind) {
        const reg = loadAccountingRegistry();
        const settings = getAccountingSettings(reg);
        const year = new Date().getFullYear();
        const key = kind === 'expense' ? `expenseVoucher_${year}` : `receiptVoucher_${year}`;
        settings.sequences[key] = (settings.sequences[key] || 0) + 1;
        saveAccountingRegistry(reg);
        const n = settings.sequences[key];
        const prefix = kind === 'expense' ? 'PAY' : 'RCP';
        return `${prefix}-${year}-${String(n).padStart(5, '0')}`;
    }

    function peekNextAccountingApprovalRequestNo(regOpt) {
        const settings = getAccountingSettings(regOpt);
        const year = new Date().getFullYear();
        const key = `approvalRequest_${year}`;
        const n = (settings.sequences[key] || 0) + 1;
        return `ARQ-${year}-${String(n).padStart(5, '0')}`;
    }

    function commitNextAccountingApprovalRequestNo(regOpt) {
        const reg = regOpt || loadAccountingRegistry();
        const settings = getAccountingSettings(reg);
        const year = new Date().getFullYear();
        const key = `approvalRequest_${year}`;
        settings.sequences[key] = (settings.sequences[key] || 0) + 1;
        if (!regOpt) saveAccountingRegistry(reg);
        const n = settings.sequences[key];
        return `ARQ-${year}-${String(n).padStart(5, '0')}`;
    }

    function ensureAccountingPendingRequestNo(reg, pendingRequest) {
        if (!pendingRequest || toStr(pendingRequest.requestNo)) return pendingRequest;
        return { ...pendingRequest, requestNo: commitNextAccountingApprovalRequestNo(reg) };
    }

    function getAccountingEntryActiveRequestNo(entry) {
        if (!entry) return '';
        return toStr(entry.pendingRequest?.requestNo);
    }

    function collectAccountingEntryRequestNoHaystack(entry) {
        if (!entry) return '';
        const parts = [];
        const active = getAccountingEntryActiveRequestNo(entry);
        if (active) parts.push(active);
        (entry.approvalHistory || []).forEach((h) => {
            if (h?.requestNo) parts.push(h.requestNo);
            if (h?.requestSnapshot?.requestNo) parts.push(h.requestSnapshot.requestNo);
        });
        return parts.join(' ');
    }

    function findAccountingEntriesByRequestNo(requestNo, regOpt) {
        const q = toStr(requestNo).trim().toUpperCase();
        if (!q) return [];
        const reg = regOpt || loadAccountingRegistry();
        return (reg.entries || []).filter((e) => {
            const hay = collectAccountingEntryRequestNoHaystack(e).toUpperCase();
            return hay.includes(q);
        });
    }

    function formatAccountingApprovalRequestNoBadge(requestNo) {
        const no = toStr(requestNo);
        if (!no) return '';
        return `<span class="acct-approval-req-no" title="${t('رقم الطلب', 'Request no.')}">${escHtml(no)}</span>`;
    }

    function resolveManualEntryCounterCoaId(bankAccountId) {
        const bankId = toStr(bankAccountId);
        if (bankId) {
            const ba = getBankAccountById(bankId);
            if (ba) {
                try {
                    const coaId = ensureCoaForBankAccount(ba);
                    if (coaId) return coaId;
                } catch (_eBankCoa) {}
                if (ba.coaAccountId) return ba.coaAccountId;
            }
        }
        return 'coa_111';
    }

    function onManualEntryBankAccountChange() {
        const bankId = toStr(document.getElementById('manualEntryBankAccount')?.value);
        const counterEl = document.getElementById('manualEntryCounterCoa');
        if (counterEl) counterEl.value = resolveManualEntryCounterCoaId(bankId);
    }

    function coaRow(id, code, nameAr, nameEn, parentId, type, opts) {
        const o = opts || {};
        const isLeaf = !!o.leaf;
        return {
            id,
            code,
            nameAr,
            nameEn,
            parentId: parentId || '',
            type,
            normalBalance: o.normalBalance || (type === 'asset' || type === 'expense' ? 'debit' : 'credit'),
            section: o.section || type,
            cashFlow: o.cashFlow || '',
            accountCategory: o.accountCategory || '',
            allowPost: isLeaf,
            allowPayments: !!o.allowPayments,
            allowExpenseClaims: !!o.allowExpenseClaims,
            system: o.system !== false,
            leaf: isLeaf
        };
    }

    const COA_LEGACY_ID_MAP = {
        coa_assets: 'coa_1',
        coa_cash_bank: 'coa_111',
        coa_ar: 'coa_122',
        coa_liabilities: 'coa_2',
        coa_ap: 'coa_211',
        coa_equity: 'coa_3',
        coa_revenue: 'coa_4',
        coa_rent_income: 'coa_411',
        coa_other_income: 'coa_413',
        coa_expense: 'coa_5',
        coa_maint_expense: 'coa_525',
        coa_util_expense: 'coa_521',
        coa_other_expense: 'coa_526'
    };

    function resolveCoaAccountId(id) {
        const s = toStr(id);
        return COA_LEGACY_ID_MAP[s] || s;
    }

    function defaultChartOfAccounts() {
        return [
            coaRow('coa_1', '1', 'الأصول', 'Assets', '', 'asset', { section: 'asset', accountCategory: 'assets' }),
            coaRow('coa_11', '11', 'النقد وما يعادله', 'Cash & equivalents', 'coa_1', 'asset', { cashFlow: 'cash', accountCategory: 'cash_equivalent' }),
            coaRow('coa_111', '111', 'الصندوق', 'Cash on hand', 'coa_11', 'asset', { leaf: true, allowPayments: true, cashFlow: 'cash', accountCategory: 'cash_equivalent' }),
            coaRow('coa_112', '112', 'حسابات بنكية', 'Bank accounts', 'coa_11', 'asset', { cashFlow: 'cash', accountCategory: 'cash_equivalent' }),
            coaRow('coa_12', '12', 'الأصول المتداولة', 'Current assets', 'coa_1', 'asset', { cashFlow: 'operating', accountCategory: 'current_asset' }),
            coaRow('coa_121', '121', 'المخزون', 'Inventory', 'coa_12', 'asset', { leaf: true, cashFlow: 'operating', accountCategory: 'inventory' }),
            coaRow('coa_122', '122', 'حسابات مستحقة القبض', 'Accounts receivable', 'coa_12', 'asset', { allowPayments: true, cashFlow: 'operating', accountCategory: 'receivable' }),
            coaRow('coa_123', '123', 'دفعات سلف للموظفين', 'Employee advances', 'coa_12', 'asset', { leaf: true, cashFlow: 'operating', accountCategory: 'current_asset' }),
            coaRow('coa_124', '124', 'مصروفات مدفوعة مقدماً', 'Prepaid expenses', 'coa_12', 'asset', { leaf: true, cashFlow: 'operating', accountCategory: 'current_asset' }),
            coaRow('coa_127', '127', 'العقارات والوحدات', 'Properties & units', 'coa_12', 'asset', { cashFlow: 'operating', accountCategory: 'receivable' }),
            coaRow('coa_15', '15', 'الأصول الثابتة', 'Fixed assets', 'coa_1', 'asset', { cashFlow: 'investing', accountCategory: 'fixed_asset' }),
            coaRow('coa_151', '151', 'آلات ومعدات', 'Machinery & equipment', 'coa_15', 'asset', { leaf: true, cashFlow: 'investing', accountCategory: 'fixed_asset' }),
            coaRow('coa_152', '152', 'مجمع الاهتلاك', 'Accumulated depreciation', 'coa_15', 'asset', { leaf: true, normalBalance: 'credit', cashFlow: 'investing', accountCategory: 'contra_asset' }),
            coaRow('coa_153', '153', 'السيارات', 'Vehicles', 'coa_15', 'asset', { leaf: true, cashFlow: 'investing', accountCategory: 'fixed_asset' }),
            coaRow('coa_2', '2', 'الالتزامات', 'Liabilities', '', 'liability', { section: 'liability', accountCategory: 'liabilities' }),
            coaRow('coa_21', '21', 'الالتزامات المتداولة', 'Current liabilities', 'coa_2', 'liability', { cashFlow: 'operating', accountCategory: 'current_liability' }),
            coaRow('coa_211', '211', 'حسابات مستحقة الدفع', 'Accounts payable', 'coa_21', 'liability', { allowPayments: true, cashFlow: 'operating', accountCategory: 'payable' }),
            coaRow('coa_212', '212', 'إيرادات غير مكتسبة', 'Unearned revenue', 'coa_21', 'liability', { leaf: true, cashFlow: 'operating', accountCategory: 'current_liability' }),
            coaRow('coa_213', '213', 'أجور مستحقة', 'Accrued wages', 'coa_21', 'liability', { leaf: true, cashFlow: 'operating', accountCategory: 'current_liability' }),
            coaRow('coa_22', '22', 'الالتزامات غير المتداولة', 'Non-current liabilities', 'coa_2', 'liability', { cashFlow: 'financing', accountCategory: 'non_current_liability' }),
            coaRow('coa_221', '221', 'قروض من الملاك', 'Loans from owners', 'coa_22', 'liability', { leaf: true, cashFlow: 'financing', accountCategory: 'non_current_liability' }),
            coaRow('coa_3', '3', 'حقوق الملكية', 'Equity', '', 'equity', { section: 'equity', accountCategory: 'equity' }),
            coaRow('coa_31', '31', 'حقوق ملكية من الرصيد الافتتاحي', 'Equity from opening balance', 'coa_3', 'equity', { cashFlow: 'financing', accountCategory: 'equity' }),
            coaRow('coa_311', '311', 'موازنة الرصيد الافتتاحي', 'Opening balance offset', 'coa_31', 'equity', { leaf: true, cashFlow: 'financing', accountCategory: 'equity' }),
            coaRow('coa_32', '32', 'حقوق الملكية', 'Owner\'s equity', 'coa_3', 'equity', { cashFlow: 'financing', accountCategory: 'equity' }),
            coaRow('coa_321', '321', 'رأس المال', 'Capital', 'coa_32', 'equity', { leaf: true, cashFlow: 'financing', accountCategory: 'equity' }),
            coaRow('coa_322', '322', 'المسحوبات', 'Withdrawals', 'coa_32', 'equity', { leaf: true, normalBalance: 'debit', cashFlow: 'financing', accountCategory: 'equity' }),
            coaRow('coa_33', '33', 'الأرباح المحتجزة', 'Retained earnings', 'coa_3', 'equity', { leaf: true, cashFlow: 'financing', accountCategory: 'equity' }),
            coaRow('coa_4', '4', 'الإيراد', 'Revenue', '', 'revenue', { section: 'revenue', accountCategory: 'revenue' }),
            coaRow('coa_41', '41', 'الدخل', 'Income', 'coa_4', 'revenue', { cashFlow: 'operating', accountCategory: 'revenue' }),
            coaRow('coa_411', '411', 'إيرادات الإيجار', 'Rent income', 'coa_41', 'revenue', { leaf: true, allowPayments: true, cashFlow: 'operating', accountCategory: 'rent_income' }),
            coaRow('coa_412', '412', 'إيرادات الصيانة', 'Maintenance income', 'coa_41', 'revenue', { leaf: true, cashFlow: 'operating', accountCategory: 'service_income' }),
            coaRow('coa_413', '413', 'إيرادات أخرى', 'Other income', 'coa_41', 'revenue', { leaf: true, cashFlow: 'operating', accountCategory: 'other_income' }),
            coaRow('coa_414', '414', 'غرامات التأخير والارتجاع', 'Late & bounce fees', 'coa_41', 'revenue', { leaf: true, cashFlow: 'operating', accountCategory: 'penalty_income' }),
            coaRow('coa_415', '415', 'الخصومات الممنوحة', 'Discounts given', 'coa_52', 'expense', { leaf: true, allowExpenseClaims: true, cashFlow: 'operating', accountCategory: 'sales_discount' }),
            coaRow('coa_42', '42', 'مصادر دخل أخرى', 'Other income sources', 'coa_4', 'revenue', { leaf: true, cashFlow: 'operating', accountCategory: 'other_income' }),
            coaRow('coa_5', '5', 'المصروفات', 'Expenses', '', 'expense', { section: 'expense', accountCategory: 'expense' }),
            coaRow('coa_51', '51', 'تكلفة المبيعات', 'Cost of sales', 'coa_5', 'expense', { cashFlow: 'operating', accountCategory: 'cogs' }),
            coaRow('coa_511', '511', 'تكلفة بضائع الصيانة', 'Maintenance goods cost', 'coa_51', 'expense', { leaf: true, allowExpenseClaims: true, cashFlow: 'operating', accountCategory: 'cogs' }),
            coaRow('coa_52', '52', 'المصروفات التشغيلية', 'Operating expenses', 'coa_5', 'expense', { cashFlow: 'operating', accountCategory: 'opex' }),
            coaRow('coa_521', '521', 'مصروفات الكهرباء والمياه', 'Utilities', 'coa_52', 'expense', { leaf: true, allowExpenseClaims: true, cashFlow: 'operating', accountCategory: 'utilities' }),
            coaRow('coa_522', '522', 'اللوازم المكتبية', 'Office supplies', 'coa_52', 'expense', { leaf: true, allowExpenseClaims: true, cashFlow: 'operating', accountCategory: 'admin' }),
            coaRow('coa_523', '523', 'السكن', 'Housing', 'coa_52', 'expense', { leaf: true, allowExpenseClaims: true, cashFlow: 'operating', accountCategory: 'admin' }),
            coaRow('coa_524', '524', 'الإعلان والتسويق', 'Advertising & marketing', 'coa_52', 'expense', { leaf: true, allowExpenseClaims: true, cashFlow: 'operating', accountCategory: 'marketing' }),
            coaRow('coa_525', '525', 'مصروفات الصيانة', 'Maintenance expense', 'coa_52', 'expense', { leaf: true, allowExpenseClaims: true, cashFlow: 'operating', accountCategory: 'maintenance' }),
            coaRow('coa_526', '526', 'مصروفات عامة وإدارية', 'General & administrative', 'coa_52', 'expense', { leaf: true, allowExpenseClaims: true, cashFlow: 'operating', accountCategory: 'admin' })
        ];
    }

    function ensureChartOfAccounts(reg) {
        if (!reg) return reg;
        if (!Array.isArray(reg.chartOfAccounts) || !reg.chartOfAccounts.length) {
            reg.chartOfAccounts = defaultChartOfAccounts();
            return reg;
        }
        defaultChartOfAccounts().forEach((d) => {
            if (!reg.chartOfAccounts.some((x) => x.id === d.id)) reg.chartOfAccounts.push({ ...d });
        });
        ['coa_122', 'coa_211', 'coa_112'].forEach((pid) => {
            const a = reg.chartOfAccounts.find((x) => x.id === pid);
            if (a) {
                a.leaf = false;
                a.allowPost = false;
            }
        });
        return reg;
    }

    const COA_LEGACY_CODE_TARGET = {
        '1.1': 'coa_11',
        '1.2': 'coa_122',
        '2.1': 'coa_211',
        '4.1': 'coa_411',
        '4.2': 'coa_413',
        '5.1': 'coa_525',
        '5.2': 'coa_521',
        '5.3': 'coa_526'
    };

    function getCanonicalCoaIds() {
        return new Set(defaultChartOfAccounts().map((a) => a.id));
    }

    function isObsoleteCoaAccount(a) {
        if (!a) return false;
        const id = toStr(a.id);
        const code = toStr(a.code);
        if (COA_LEGACY_ID_MAP[id]) return true;
        if (/^\d\.\d/.test(code)) return true;
        if (/^[1-5]$/.test(code) && id !== `coa_${code}`) return true;
        const canonical = getCanonicalCoaIds();
        if (canonical.has(id)) return false;
        if (/^coa_(party|bank|bld|unit)_/.test(id)) return false;
        if (/^coa_\d+$/.test(id) || /^coa_\d{2,}$/.test(id)) return false;
        return false;
    }

    function remapCoaReferenceId(id, idMap) {
        let cur = toStr(id);
        let guard = 0;
        while (cur && idMap[cur] && idMap[cur] !== cur && guard < 12) {
            cur = idMap[cur];
            guard += 1;
        }
        return cur || toStr(id);
    }

    function migrateChartOfAccounts(reg) {
        if (!reg || !Array.isArray(reg.chartOfAccounts)) return false;
        ensureChartOfAccounts(reg);
        let changed = false;
        const idMap = {};
        (reg.chartOfAccounts || []).forEach((a) => {
            if (!isObsoleteCoaAccount(a)) return;
            const code = toStr(a.code);
            const target =
                COA_LEGACY_ID_MAP[a.id] ||
                COA_LEGACY_CODE_TARGET[code] ||
                (a.parentId && idMap[a.parentId] ? idMap[a.parentId] : '') ||
                resolveCoaAccountId(a.id);
            if (target && target !== a.id) {
                idMap[a.id] = target;
                changed = true;
            }
        });
        if (Object.keys(idMap).length) {
            const applyRef = (ref) => remapCoaReferenceId(ref, idMap);
            (reg.entries || []).forEach((e) => {
                if (e.coaAccountId) e.coaAccountId = applyRef(e.coaAccountId);
                if (e.counterCoaAccountId) e.counterCoaAccountId = applyRef(e.counterCoaAccountId);
                if (e.unitCoaAccountId) e.unitCoaAccountId = applyRef(e.unitCoaAccountId);
                (e.journalLines || []).forEach((ln) => {
                    if (ln.coaAccountId) ln.coaAccountId = applyRef(ln.coaAccountId);
                });
            });
            (reg.bankAccounts || []).forEach((ba) => {
                if (ba.coaAccountId) ba.coaAccountId = applyRef(ba.coaAccountId);
            });
            reg.chartOfAccounts = reg.chartOfAccounts.filter((a) => !isObsoleteCoaAccount(a));
            changed = true;
        }
        const disc = reg.chartOfAccounts.find((a) => a.id === 'coa_415');
        if (disc && disc.parentId === 'coa_41') {
            disc.parentId = 'coa_52';
            disc.type = 'expense';
            disc.accountCategory = 'sales_discount';
            disc.allowExpenseClaims = true;
            disc.normalBalance = 'debit';
            changed = true;
        }
        const props = reg.chartOfAccounts.find((a) => a.id === 'coa_127');
        if (props && (props.nameAr !== 'العقارات والوحدات' || props.nameEn !== 'Properties & units')) {
            props.nameAr = 'العقارات والوحدات';
            props.nameEn = 'Properties & units';
            changed = true;
        }
        defaultChartOfAccounts().forEach((d) => {
            if (!reg.chartOfAccounts.some((x) => x.id === d.id)) {
                reg.chartOfAccounts.push({ ...d });
                changed = true;
            }
        });
        return changed;
    }

    function getChartOfAccounts() {
        const reg = loadAccountingRegistry();
        ensureChartOfAccounts(reg);
        return (reg.chartOfAccounts || []).slice().sort((a, b) => toStr(a.code).localeCompare(toStr(b.code), undefined, { numeric: true }));
    }

    function coaSlugKey(raw) {
        return toStr(raw)
            .toLowerCase()
            .replace(/[^\w\u0600-\u06FF]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 48) || 'item';
    }

    function upsertCoaAccountInRegistry(reg, spec) {
        if (!reg || !spec || !spec.id) return false;
        ensureChartOfAccounts(reg);
        const idx = (reg.chartOfAccounts || []).findIndex((a) => a.id === spec.id);
        const row = coaRow(
            spec.id,
            spec.code,
            spec.nameAr,
            spec.nameEn,
            spec.parentId || '',
            spec.type || 'asset',
            spec.opts || {}
        );
        if (spec.linkedUserId) row.linkedUserId = spec.linkedUserId;
        if (spec.linkedBankAccountId) row.linkedBankAccountId = spec.linkedBankAccountId;
        if (spec.linkedUnitKey) row.linkedUnitKey = spec.linkedUnitKey;
        if (spec.linkedBuilding) row.linkedBuilding = spec.linkedBuilding;
        if (spec.linkedPartyName) row.linkedPartyName = spec.linkedPartyName;
        if (spec.linkedPartyType) row.linkedPartyType = spec.linkedPartyType;
        if (idx < 0) {
            reg.chartOfAccounts.push(row);
            return true;
        }
        reg.chartOfAccounts[idx] = { ...reg.chartOfAccounts[idx], ...row };
        return false;
    }

    function ensureCoaForUser(user, regOpt) {
        const userObj = user && user.id ? user : null;
        if (!userObj) return null;
        const reg = regOpt || loadAccountingRegistry();
        const id = `coa_party_${userObj.id}`;
        const label = toStr(userObj.displayName) || toStr(userObj.username) || userObj.id;
        const typeMeta = getAddressBookTypeMeta(userObj.contactType || 'other');
        upsertCoaAccountInRegistry(reg, {
            id,
            code: `127-P-${toStr(userObj.userNo || userObj.id).replace(/[^\w]/g, '').slice(-8)}`,
            nameAr: `${typeMeta ? typeMeta.labelAr : 'جهة'}: ${label}`,
            nameEn: `${typeMeta ? typeMeta.labelEn : 'Party'}: ${label}`,
            parentId: 'coa_127',
            type: 'asset',
            opts: { leaf: true, allowPost: true, allowPayments: true, cashFlow: 'operating', system: false },
            linkedUserId: userObj.id
        });
        if (!regOpt) saveAccountingRegistry(reg);
        return id;
    }

    function ensureCoaForBankAccount(ba, regOpt) {
        if (!ba || !ba.id) return null;
        const reg = regOpt || loadAccountingRegistry();
        const id = `coa_bank_${ba.id}`;
        upsertCoaAccountInRegistry(reg, {
            id,
            code: `112-${toStr(ba.accountNo).replace(/\s/g, '').slice(-6) || ba.id.slice(-4)}`,
            nameAr: `🏦 ${toStr(ba.bankName)} — ${toStr(ba.ownerName)}`,
            nameEn: `🏦 ${toStr(ba.bankName)} — ${toStr(ba.ownerName)}`,
            parentId: 'coa_112',
            type: 'asset',
            opts: { leaf: true, allowPost: true, allowPayments: true, cashFlow: 'cash', system: false },
            linkedBankAccountId: ba.id
        });
        ba.coaAccountId = id;
        if (!regOpt) saveAccountingRegistry(reg);
        return id;
    }

    function addressBookPartyCoaSlug(name) {
        return coaSlugKey(toStr(name).trim()) || 'party';
    }

    function ensureCoaForAddressBookParty(partyName, partyType, regOpt) {
        const name = toStr(partyName).trim();
        if (!name) return null;
        const reg = regOpt || loadAccountingRegistry();
        const pt = toStr(partyType).toLowerCase();
        const isVendor = pt === 'vendor' || pt === 'supplier' || pt === 'مورد';
        const parentId = isVendor ? 'coa_211' : 'coa_122';
        const acctType = isVendor ? 'liability' : 'asset';
        const slug = addressBookPartyCoaSlug(name);
        const id = `coa_party_ab_${slug}`;
        const existing = reg.chartOfAccounts.find((a) => a.id === id || (a.linkedPartyName === name && a.parentId === parentId));
        const finalId = existing ? existing.id : id;
        upsertCoaAccountInRegistry(reg, {
            id: finalId,
            code: `${isVendor ? '211' : '122'}-${slug.slice(0, 14)}`,
            nameAr: `${isVendor ? t('مورد', 'Supplier') : t('عميل', 'Customer')}: ${name}`,
            nameEn: `${isVendor ? 'Supplier' : 'Customer'}: ${name}`,
            parentId,
            type: acctType,
            opts: {
                leaf: true,
                allowPost: true,
                allowPayments: true,
                cashFlow: 'operating',
                system: false,
                accountCategory: isVendor ? 'payable' : 'receivable'
            },
            linkedPartyName: name,
            linkedPartyType: isVendor ? 'vendor' : 'client'
        });
        if (!regOpt) saveAccountingRegistry(reg);
        return finalId;
    }

    function resolvePartyCoaForEntry(e, reg) {
        if (!e) return '';
        const regUse = reg || loadAccountingRegistry();
        const partyName = toStr(e.partyName || e.tenant).trim();
        if (!partyName) return '';
        let partyType = toStr(e.partyType).toLowerCase();
        if (!partyType) partyType = toStr(e.type) === 'expense' ? 'vendor' : 'client';
        if (['tenant', 'client', 'مستأجر', 'عميل'].includes(partyType)) partyType = 'client';
        if (['vendor', 'supplier', 'مورد'].includes(partyType)) partyType = 'vendor';
        try {
            return ensureCoaForAddressBookParty(partyName, partyType, regUse) || '';
        } catch (_ePartyCoa) {
            return '';
        }
    }

    function ensureCoaForBuilding(building, regOpt) {
        const b = toStr(building).trim();
        if (!b) return null;
        const reg = regOpt || loadAccountingRegistry();
        const slug = coaSlugKey(b);
        const id = `coa_bld_${slug}`;
        upsertCoaAccountInRegistry(reg, {
            id,
            code: `127-B-${slug.slice(0, 10)}`,
            nameAr: `مبنى: ${b}`,
            nameEn: `Building: ${b}`,
            parentId: 'coa_127',
            type: 'asset',
            opts: { cashFlow: 'operating', system: false },
            linkedBuilding: b
        });
        if (!regOpt) saveAccountingRegistry(reg);
        return id;
    }

    function ensureCoaForPropertyUnit(building, unit, regOpt) {
        const b = toStr(building).trim();
        const u = toStr(unit).trim();
        if (!b || !u) return null;
        const reg = regOpt || loadAccountingRegistry();
        const bId = ensureCoaForBuilding(b, reg);
        const uk = accountingUnitKey(b, u);
        const slug = coaSlugKey(uk);
        const id = `coa_unit_${slug}`;
        upsertCoaAccountInRegistry(reg, {
            id,
            code: `127-U-${normalizeUnit(u)}`,
            nameAr: `${b} — وحدة ${u}`,
            nameEn: `${b} — Unit ${u}`,
            parentId: bId,
            type: 'asset',
            opts: { leaf: true, allowPost: true, allowPayments: true, cashFlow: 'operating', system: false },
            linkedUnitKey: uk
        });
        if (!regOpt) saveAccountingRegistry(reg);
        return id;
    }

    function syncCoaLinksFromSystem() {
        try {
            reloadUsersRegistryFromStorageForAuth();
            const reg = loadAccountingRegistry();
            let changed = false;
            if (!reg.chartOfAccounts.some((a) => a.id === 'coa_127')) {
                ensureChartOfAccounts(reg);
                changed = true;
            }
            (usersRegistry || []).forEach((u) => {
                const nu = normalizeUserRecord(u);
                if (ensureCoaForUser(nu, reg)) changed = true;
            });
            (reg.bankAccounts || []).forEach((ba) => {
                if (ensureCoaForBankAccount(ba, reg)) changed = true;
            });
            (managedUnitsData || []).forEach((mu) => {
                if (mu && ensureCoaForPropertyUnit(mu.building, mu.unit, reg)) changed = true;
            });
            (addressBookEntries || []).forEach((e) => {
                if (e && toStr(e.building) && toStr(e.unit) && ensureCoaForPropertyUnit(e.building, e.unit, reg)) {
                    changed = true;
                }
            });
            collectAddressBookContactsForAccounting().forEach((c) => {
                const pt = ['vendor', 'supplier', 'مورد'].includes(toStr(c.type)) ? 'vendor' : 'client';
                if (ensureCoaForAddressBookParty(c.name, pt, reg)) changed = true;
            });
            Object.keys(buildingProfiles || {}).forEach((b) => {
                if (ensureCoaForBuilding(b, reg)) changed = true;
            });
            if (linkAccountingItemsToUnitCoa(reg)) changed = true;
            if (migrateChartOfAccounts(reg)) changed = true;
            if (changed) saveAccountingRegistry(reg, { silent: true });
            _coaLinksSyncLastAt = Date.now();
            return changed;
        } catch (eCoaSync) {
            console.warn('syncCoaLinksFromSystem', eCoaSync);
            return false;
        }
    }

    function coaAccountById(id) {
        return getChartOfAccounts().find((a) => a.id === resolveCoaAccountId(id)) || null;
    }

    function coaAccountLabel(a) {
        if (!a) return '—';
        return appUiLanguage === 'en' ? (toStr(a.nameEn) || toStr(a.nameAr)) : (toStr(a.nameAr) || toStr(a.nameEn));
    }

    function isCoaPostable(accountId) {
        const a = coaAccountById(resolveCoaAccountId(accountId));
        return !!(a && a.allowPost);
    }

    function coaHasChildren(accountId) {
        const id = resolveCoaAccountId(accountId);
        return getChartOfAccounts().some((a) => a.parentId === id)
            || (id === 'coa_112' && getBankAccounts(false).length > 0)
            || (id === 'coa_122' && getChartOfAccounts().some((a) => a.parentId === 'coa_122'))
            || (id === 'coa_211' && getChartOfAccounts().some((a) => a.parentId === 'coa_211'));
    }

    function findCoaIdForUnit(building, unit, createIfMissing) {
        const b = toStr(building).trim();
        const u = toStr(unit).trim();
        if (!b || !u) return '';
        const uk = accountingUnitKey(b, u);
        const hit = getChartOfAccounts().find((a) => a.linkedUnitKey === uk);
        if (hit) return hit.id;
        if (createIfMissing === false) return '';
        try {
            return ensureCoaForPropertyUnit(b, u) || '';
        } catch (_e) {
            return '';
        }
    }

    function findCoaIdForBuilding(building) {
        const b = toStr(building).trim();
        if (!b) return '';
        const hit = getChartOfAccounts().find((a) => a.linkedBuilding === b && !a.linkedUnitKey);
        if (hit) return hit.id;
        try {
            return ensureCoaForBuilding(b) || '';
        } catch (_e2) {
            return '';
        }
    }

    function coaAccountTypeLabel(a) {
        if (!a) return '—';
        if (a.accountCategory === 'sales_discount') return t('خصم', 'Discount');
        if (a.accountCategory === 'contra_revenue') return t('خصم من الإيراد', 'Contra revenue');
        if (a.linkedBankAccountId) return t('بنكي', 'Bank');
        if (a.linkedUnitKey) return t('وحدة', 'Unit');
        if (a.linkedBuilding && !a.linkedUnitKey) return t('عقار', 'Property');
        if (a.linkedUserId) return t('جهة', 'Party');
        if (a.linkedPartyName) return a.linkedPartyType === 'vendor' ? t('مورد', 'Supplier') : t('عميل', 'Customer');
        const map = {
            asset: t('أصل', 'Asset'),
            liability: t('التزام', 'Liability'),
            equity: t('ملكية', 'Equity'),
            revenue: t('إيراد', 'Revenue'),
            expense: t('مصروف', 'Expense')
        };
        return map[a.type] || toStr(a.type) || '—';
    }

    function computeCoaLinkedUnitBalances(regOpt) {
        const reg = regOpt || loadAccountingRegistry();
        const map = {};
        const add = (coaId, debit, credit) => {
            const id = toStr(coaId);
            if (!id) return;
            if (!map[id]) map[id] = { debit: 0, credit: 0 };
            map[id].debit += parseFloat(debit) || 0;
            map[id].credit += parseFloat(credit) || 0;
        };
        (reg.cheques || []).forEach((ch) => {
            if (!isAccountingChequePaidStatus(ch.status)) return;
            const unitCoa = ch.unitCoaAccountId || findCoaIdForUnit(ch.building, ch.unit, false);
            if (!unitCoa) return;
            const amt = parseFloat(ch.paidAmount || ch.amount) || 0;
            add(unitCoa, amt, 0);
        });
        (reg.entries || []).forEach((e) => {
            if (!['confirmed', 'invoiced', 'pending_accountant'].includes(toStr(e.status))) return;
            const unitCoa = e.unitCoaAccountId || findCoaIdForUnit(e.building, e.unit, false);
            if (!unitCoa) return;
            const amt = parseFloat(e.amount) || 0;
            if (toStr(e.type) === 'income' || toStr(e.type) === 'adjustment_add') add(unitCoa, amt, 0);
            else if (toStr(e.type) === 'expense' || toStr(e.type) === 'adjustment_discount') add(unitCoa, 0, amt);
        });
        (reg.deposits || []).forEach((dep) => {
            const unitCoa = dep.unitCoaAccountId || findCoaIdForUnit(dep.building, dep.unit, false);
            if (!unitCoa) return;
            const amt = parseFloat(dep.amount) || 0;
            if (toStr(dep.status) === 'held') add(unitCoa, 0, amt);
        });
        return map;
    }

    function coaCashFlowLabel(v) {
        const map = {
            cash: t('نقد', 'Cash'),
            operating: t('التشغيلات', 'Operating'),
            investing: t('الاستثمارات', 'Investing'),
            financing: t('التمويلات', 'Financing')
        };
        return map[toStr(v)] || '—';
    }

    function coaSectionClass(section) {
        const map = {
            asset: 'acct-coa-section--asset',
            liability: 'acct-coa-section--liability',
            equity: 'acct-coa-section--equity',
            revenue: 'acct-coa-section--revenue',
            expense: 'acct-coa-section--expense'
        };
        return map[toStr(section)] || '';
    }

    function computeCoaAccountBalances() {
        const reg = loadAccountingRegistry();
        ensureAccountingJournalLedger(reg, false);
        const map = {};
        const add = (coaId, debit, credit) => {
            const id = resolveCoaAccountId(coaId);
            if (!id) return;
            if (!map[id]) map[id] = { debit: 0, credit: 0 };
            map[id].debit += parseFloat(debit) || 0;
            map[id].credit += parseFloat(credit) || 0;
        };
        (reg.journals || []).filter((j) => toStr(j.status) === 'posted').forEach((j) => {
            (j.lines || []).forEach((ln) => add(ln.coaAccountId, ln.debit, ln.credit));
        });
        return map;
    }

    function accountingChequeJournalLines(ch, reg) {
        if (!ch || !isAccountingChequePaidStatus(ch.status)) return [];
        const amt = parseFloat(ch.paidAmount || ch.amount) || 0;
        if (amt <= 0) return [];
        if (findParentReceiptAllocationForChequeExtended(ch.id, reg)) return [];
        const bankCoa = (reg.bankAccounts || []).find((b) =>
            (ch.actions || []).some((a) => a.actionType === 'bank_deposit' && toStr(a.bankAccountId) === toStr(b.id))
        )?.coaAccountId;
        return [
            { coaAccountId: resolveCoaAccountId(bankCoa || 'coa_111'), debit: amt, credit: 0 },
            { coaAccountId: resolveCoaAccountId('coa_411'), debit: 0, credit: amt }
        ];
    }

    function computeBankAccountBookBalance(ba, regOpt, asOfDate) {
        const reg = regOpt || loadAccountingRegistry();
        if (!ba) return 0;
        const coaId = ba.coaAccountId || `coa_bank_${ba.id}`;
        const balMap = buildCoaClosingBalanceMap(asOfDate || new Date().toISOString().slice(0, 10));
        const acct = coaAccountById(coaId);
        if (acct) return accountingCoaSignedBalance(acct, balMap);
        return computeBankAccountLedger(ba.id).balance;
    }

    function computeCashOnHandBookBalance(asOfDate) {
        const balMap = buildCoaClosingBalanceMap(asOfDate || new Date().toISOString().slice(0, 10));
        const acct = coaAccountById('coa_111');
        return acct ? accountingCoaSignedBalance(acct, balMap) : 0;
    }

    function computeBankAccountLedger(bankAccountId) {
        const reg = loadAccountingRegistry();
        let income = 0;
        let expense = 0;
        (reg.entries || []).forEach((e) => {
            if (toStr(e.bankAccountId) !== toStr(bankAccountId)) return;
            if (!['confirmed', 'invoiced'].includes(toStr(e.status))) return;
            const amt = parseFloat(e.amount) || 0;
            if (toStr(e.type) === 'income') income += amt;
            else if (toStr(e.type) === 'expense') expense += amt;
        });
        (reg.cheques || []).forEach((ch) => {
            (ch.actions || []).forEach((a) => {
                if (a.actionType === 'bank_deposit' && toStr(a.bankAccountId) === toStr(bankAccountId)) {
                    income += parseFloat(ch.paidAmount || ch.amount) || 0;
                }
                if (a.actionType === 'cash_convert' && toStr(a.bankAccountId) === toStr(bankAccountId)) {
                    income += parseFloat(a.cashAmount) || 0;
                }
            });
        });
        return { income, expense, balance: income - expense };
    }

    function computePartyFinancialSummary(partyName) {
        const name = toStr(partyName).trim();
        if (!name) return { income: 0, expense: 0, balance: 0 };
        const reg = loadAccountingRegistry();
        let income = 0;
        let expense = 0;
        (reg.entries || []).forEach((e) => {
            if (toStr(e.partyName) !== name) return;
            if (!['confirmed', 'invoiced', 'pending_accountant'].includes(toStr(e.status))) return;
            const amt = parseFloat(e.amount) || 0;
            if (toStr(e.type) === 'income') income += amt;
            else if (toStr(e.type) === 'expense') expense += amt;
        });
        (reg.cheques || []).forEach((ch) => {
            if (toStr(ch.tenant) !== name) return;
            if (isAccountingChequePaidStatus(ch.status)) income += parseFloat(ch.paidAmount || ch.amount) || 0;
        });
        return { income, expense, balance: income - expense };
    }

    function computeLiveAccountingDashboard(regIn) {
        const reg = regIn || loadAccountingRegistry();
        const base = accountingGlobalSummary(reg);
        let incomeReceived = 0;
        let expensesPaid = 0;
        let pendingIncome = 0;
        let pendingExpense = 0;
        (reg.entries || []).forEach((e) => {
            const amt = parseFloat(e.amount) || 0;
            const st = toStr(e.status);
            const pendingApproval = isAccountingEntryPendingApproval(e);
            if (toStr(e.type) === 'income') {
                if (!pendingApproval && (st === 'confirmed' || st === 'invoiced')) incomeReceived += amt;
                else if (pendingApproval) pendingIncome += amt;
            } else if (toStr(e.type) === 'expense') {
                if (!pendingApproval && (st === 'confirmed' || st === 'invoiced')) expensesPaid += amt;
                else if (pendingApproval) pendingExpense += amt;
            }
        });
        (reg.cheques || []).forEach((ch) => {
            if (!isAccountingStandaloneIncomeCheque(reg, ch)) return;
            incomeReceived += parseFloat(ch.paidAmount || ch.amount) || 0;
        });
        return {
            ...base,
            incomeReceived,
            expensesPaid,
            netBalance: incomeReceived - expensesPaid,
            pendingIncome,
            pendingExpense
        };
    }

    function buildAccountingTabNavMetrics(reg, dash) {
        const reg0 = reg || loadAccountingRegistry();
        const dash0 = dash || computeLiveAccountingDashboard(reg0);
        const global = accountingGlobalSummary(reg0);
        const pendingEntries = (reg0.entries || []).filter((e) => isAccountingEntryPendingApproval(e)).length;
        const pendingReceipts = countAccountingContractReceiptPending(reg0);
        const pendingInvoices = (reg0.invoices || []).filter((inv) => toStr(inv.status) === 'draft').length;
        const pendingBadge = pendingEntries + pendingReceipts + pendingInvoices;
        const depositsHeld = parseFloat(global.depositsHeld) || 0;
        const depositsPending = (reg0.deposits || []).filter((d) => isAccountingDepositPendingReceipt(d.status)).length;
        const chequesPending = (reg0.cheques || []).filter((c) => isAccountingChequePendingReceipt(c.status)).length;
        return {
            pending: { badge: pendingBadge, count: pendingBadge },
            income: { total: dash0.incomeReceived || 0 },
            expense: { total: dash0.expensesPaid || 0 },
            deposits: { total: depositsHeld, badge: depositsPending },
            cheques: { badge: chequesPending, count: (reg0.cheques || []).length },
            invoices: { badge: pendingInvoices }
        };
    }

    function buildAccountingTabNavButtonHtml(k, icon, lbl, activeTab, metrics) {
        const m = (metrics && metrics[k]) || {};
        const badgeN = parseInt(m.badge, 10) || 0;
        const badgeHtml =
            badgeN > 0
                ? `<span class="acct-tab-badge" title="${escHtml(t(`${badgeN} بانتظار الاعتماد`, `${badgeN} pending`))}">${badgeN > 99 ? '99+' : badgeN}</span>`
                : '';
        let metricHtml = '';
        if (k === 'income') {
            metricHtml = `<span class="acct-tab-metric">${escHtml(summaryAmtOm(m.total || 0))}</span>`;
        } else if (k === 'expense') {
            metricHtml = `<span class="acct-tab-metric acct-tab-metric--expense">${escHtml(summaryAmtOm(m.total || 0))}</span>`;
        } else if (k === 'deposits') {
            metricHtml = `<span class="acct-tab-metric acct-tab-metric--deposit">${escHtml(summaryAmtOm(m.total || 0))}</span>`;
        } else if (k === 'pending' && badgeN > 0) {
            metricHtml = `<span class="acct-tab-metric acct-tab-metric--pending">${escHtml(t(`${badgeN} طلب`, `${badgeN} request${badgeN > 1 ? 's' : ''}`))}</span>`;
        }
        const extraCls =
            k === 'pending' && badgeN > 0 ? ' acct-tab-item--has-pending' : '';
        return `<button type="button" class="acct-tab-item${activeTab === k ? ' active' : ''}${extraCls}" title="${escHtml(lbl)}" onclick="_accountingUiState.tab='${k}'; renderAccountingWorkspace()">${badgeHtml}<span class="acct-tab-icon" aria-hidden="true">${icon}</span><span class="acct-tab-label">${lbl}</span>${metricHtml}</button>`;
    }

    function buildCoaParentSelectOptions(selectedId, excludeId) {
        const sel = toStr(selectedId);
        const ex = toStr(excludeId);
        const opts = [`<option value="">${t('— جذر القسم —', '— section root —')}</option>`];
        getChartOfAccounts()
            .filter((a) => a.id !== ex && !a.leaf)
            .forEach((a) => {
                const lbl = `${a.code} — ${coaAccountLabel(a)}`;
                opts.push(`<option value="${escAttr(a.id)}" ${a.id === sel ? 'selected' : ''}>${escHtml(lbl)}</option>`);
            });
        return opts.join('');
    }

    function openCoaEditorModal(accountId) {
        if (!canManageChartOfAccounts()) {
            alert(t('لا تملك صلاحية تعديل شجرة الحسابات.', 'No chart of accounts permission.'));
            return;
        }
        const reg = loadAccountingRegistry();
        const editId = toStr(accountId);
        const existing = editId ? reg.chartOfAccounts.find((a) => a.id === editId) : null;
        const titleEl = document.getElementById('accountingCoaEditorTitle');
        if (titleEl) titleEl.textContent = existing ? t('تعديل حساب', 'Edit account') : t('حساب جديد', 'New account');
        const body = document.getElementById('accountingCoaEditorBody');
        if (!body) return;
        const typeOpts = ['asset', 'liability', 'equity', 'revenue', 'expense']
            .map((tp) => `<option value="${tp}" ${existing?.type === tp ? 'selected' : ''}>${escHtml(coaAccountTypeLabel({ type: tp }))}</option>`)
            .join('');
        const cfOpts = ['', 'cash', 'operating', 'investing', 'financing']
            .map((cf) => `<option value="${cf}" ${toStr(existing?.cashFlow) === cf ? 'selected' : ''}>${escHtml(cf ? coaCashFlowLabel(cf) : '—')}</option>`)
            .join('');
        body.innerHTML = `
            <input type="hidden" id="coaEditId" value="${escHtml(existing?.id || '')}">
            <div class="users-form-grid">
                <div><label style="font-size:12px;font-weight:700">${t('رقم الحساب', 'Account code')}</label>
                    <input id="coaEditCode" value="${escHtml(existing?.code || '')}" placeholder="527"></div>
                <div><label style="font-size:12px;font-weight:700">${t('الحساب الأب', 'Parent account')}</label>
                    <select id="coaEditParent">${buildCoaParentSelectOptions(existing?.parentId || '', existing?.id || '')}</select></div>
                <div><label style="font-size:12px;font-weight:700">${t('الاسم (عربي)', 'Name (Arabic)')}</label>
                    <input id="coaEditNameAr" value="${escHtml(existing?.nameAr || '')}"></div>
                <div><label style="font-size:12px;font-weight:700">${t('الاسم (إنجليزي)', 'Name (English)')}</label>
                    <input id="coaEditNameEn" dir="ltr" value="${escHtml(existing?.nameEn || '')}"></div>
                <div><label style="font-size:12px;font-weight:700">${t('نوع الحساب', 'Account type')}</label>
                    <select id="coaEditType">${typeOpts}</select></div>
                <div><label style="font-size:12px;font-weight:700">${t('التدفق النقدي', 'Cash flow')}</label>
                    <select id="coaEditCashFlow">${cfOpts}</select></div>
                <div><label style="display:flex;align-items:center;gap:6px;font-size:12px"><input type="checkbox" id="coaEditLeaf" ${existing?.leaf !== false ? 'checked' : ''}> ${t('حساب فرعي نهائي', 'Leaf account')}</label></div>
                <div><label style="display:flex;align-items:center;gap:6px;font-size:12px"><input type="checkbox" id="coaEditPay" ${existing?.allowPayments ? 'checked' : ''}> ${t('يسمح بالمدفوعات', 'Allow payments')}</label></div>
                <div><label style="display:flex;align-items:center;gap:6px;font-size:12px"><input type="checkbox" id="coaEditExp" ${existing?.allowExpenseClaims ? 'checked' : ''}> ${t('مطالبات مصروف', 'Expense claims')}</label></div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
                <button type="button" class="btn-primary" onclick="saveCoaAccountFromForm()">${t('حفظ', 'Save')}</button>
                ${existing && !existing.system ? `<button type="button" class="btn-outline" onclick="deleteCoaAccount('${escHtml(existing.id)}')">${t('حذف', 'Delete')}</button>` : ''}
                <button type="button" class="btn-outline" onclick="closeCoaEditorModal()">${t('إلغاء', 'Cancel')}</button>
            </div>`;
        document.getElementById('accountingCoaEditorModal')?.classList.add('open');
        try { localizeBilingualUi(); } catch (_e) {}
    }

    function closeCoaEditorModal() {
        document.getElementById('accountingCoaEditorModal')?.classList.remove('open');
    }

    function saveCoaAccountFromForm() {
        if (!canManageChartOfAccounts()) return;
        const reg = loadAccountingRegistry();
        ensureChartOfAccounts(reg);
        const editId = toStr(document.getElementById('coaEditId')?.value);
        const code = toStr(document.getElementById('coaEditCode')?.value);
        const nameAr = toStr(document.getElementById('coaEditNameAr')?.value);
        const nameEn = toStr(document.getElementById('coaEditNameEn')?.value);
        const parentId = toStr(document.getElementById('coaEditParent')?.value);
        const type = toStr(document.getElementById('coaEditType')?.value) || 'asset';
        const cashFlow = toStr(document.getElementById('coaEditCashFlow')?.value);
        const leaf = !!document.getElementById('coaEditLeaf')?.checked;
        const allowPayments = !!document.getElementById('coaEditPay')?.checked;
        const allowExpenseClaims = !!document.getElementById('coaEditExp')?.checked;
        if (!code || !nameAr) {
            alert(t('أدخل رقم الحساب والاسم العربي.', 'Enter account code and Arabic name.'));
            return;
        }
        if (reg.chartOfAccounts.some((a) => a.code === code && a.id !== editId)) {
            alert(t('رقم الحساب مستخدم مسبقاً.', 'Account code already exists.'));
            return;
        }
        const id = editId || `coa_custom_${Date.now()}`;
        const prev = editId ? reg.chartOfAccounts.find((a) => a.id === editId) : null;
        upsertCoaAccountInRegistry(reg, {
            id,
            code,
            nameAr,
            nameEn: nameEn || nameAr,
            parentId,
            type,
            opts: {
                leaf,
                allowPayments,
                allowExpenseClaims,
                cashFlow,
                system: prev ? prev.system === true : false,
                allowPost: leaf
            }
        });
        if (prev && prev.system) {
            const idx = reg.chartOfAccounts.findIndex((a) => a.id === id);
            if (idx >= 0) {
                reg.chartOfAccounts[idx].system = true;
                if (prev.linkedUserId) reg.chartOfAccounts[idx].linkedUserId = prev.linkedUserId;
                if (prev.linkedBankAccountId) reg.chartOfAccounts[idx].linkedBankAccountId = prev.linkedBankAccountId;
                if (prev.linkedUnitKey) reg.chartOfAccounts[idx].linkedUnitKey = prev.linkedUnitKey;
                if (prev.linkedBuilding) reg.chartOfAccounts[idx].linkedBuilding = prev.linkedBuilding;
            }
        }
        saveAccountingRegistry(reg);
        closeCoaEditorModal();
        renderAccountingWorkspace();
    }

    function deleteCoaAccount(accountId) {
        if (!canManageChartOfAccounts()) return;
        const id = toStr(accountId);
        const reg = loadAccountingRegistry();
        const acc = reg.chartOfAccounts.find((a) => a.id === id);
        if (!acc || acc.system) {
            alert(t('لا يمكن حذف حساب نظام.', 'Cannot delete a system account.'));
            return;
        }
        if (reg.chartOfAccounts.some((a) => a.parentId === id)) {
            alert(t('احذف الحسابات الفرعية أولاً.', 'Remove child accounts first.'));
            return;
        }
        if (!confirm(t('حذف هذا الحساب؟', 'Delete this account?'))) return;
        reg.chartOfAccounts = reg.chartOfAccounts.filter((a) => a.id !== id);
        saveAccountingRegistry(reg);
        closeCoaEditorModal();
        renderAccountingWorkspace();
    }

    function linkAccountingItemsToUnitCoa(regOpt) {
        const reg = regOpt || loadAccountingRegistry();
        let changed = false;
        (reg.cheques || []).forEach((ch) => {
            if (!ch.building || !ch.unit) return;
            const id = findCoaIdForUnit(ch.building, ch.unit);
            if (id && ch.unitCoaAccountId !== id) {
                ch.unitCoaAccountId = id;
                changed = true;
            }
        });
        (reg.entries || []).forEach((e) => {
            if (!e.building || !e.unit) return;
            const id = findCoaIdForUnit(e.building, e.unit);
            if (id && e.unitCoaAccountId !== id) {
                e.unitCoaAccountId = id;
                changed = true;
            }
        });
        (reg.deposits || []).forEach((dep) => {
            if (!dep.building || !dep.unit) return;
            const id = findCoaIdForUnit(dep.building, dep.unit);
            if (id && dep.unitCoaAccountId !== id) {
                dep.unitCoaAccountId = id;
                changed = true;
            }
        });
        if (changed && !regOpt) saveAccountingRegistry(reg);
        return changed;
    }

    function renderCoaTreeHtml(parentId, depth) {
        return renderCoaWorkspaceRows(parentId, depth || 0, true);
    }

    function toggleCoaNode(id) {
        if (!_accountingUiState.coaExpanded) _accountingUiState.coaExpanded = {};
        _accountingUiState.coaExpanded[id] = !_accountingUiState.coaExpanded[id];
        renderAccountingWorkspace();
    }

    function renderCoaWorkspaceRows(parentId, depth, compact) {
        const pid = parentId || '';
        const d = depth || 0;
        const padSide = appUiLanguage === 'en' ? 'padding-left' : 'padding-right';
        const expanded = _accountingUiState.coaExpanded || {};
        const q = toStr(_accountingUiState.coaSearch).trim().toLowerCase();
        const balances = computeCoaAccountBalances();
        let html = '';
        const roots = getChartOfAccounts().filter((a) => (a.parentId || '') === pid);
        roots.forEach((a) => {
            const hasKids = coaHasChildren(a.id);
            const isOpen = expanded[a.id] !== false;
            const bal = balances[a.id] || { debit: 0, credit: 0 };
            const lbl = coaAccountLabel(a);
            if (q && !lbl.toLowerCase().includes(q) && !toStr(a.code).includes(q) && !hasKids) return;
            if (!compact && !pid && a.section) {
                html += `<tr class="acct-coa-section-row ${coaSectionClass(a.section)}"><td colspan="7">${escHtml(a.code)} — ${escHtml(lbl)}</td></tr>`;
                if (hasKids && isOpen) html += renderCoaWorkspaceRows(a.id, d + 1, compact);
                return;
            }
            const indent = d * 16;
            const toggle = hasKids
                ? `<button type="button" class="acct-coa-toggle" onclick="toggleCoaNode('${escHtml(a.id)}')">${isOpen ? '▾' : '▸'}</button>`
                : `<span style="width:18px;display:inline-block"></span>`;
            const icon = hasKids ? '📁' : '📄';
            const pay = a.allowPayments ? t('نعم', 'Yes') : '—';
            const exp = a.allowExpenseClaims ? t('نعم', 'Yes') : '—';
            const editBtn = canManageChartOfAccounts()
                ? ` <button type="button" class="mini-btn" onclick="openCoaEditorModal('${escHtml(a.id)}')">${t('تعديل', 'Edit')}</button>`
                : '';
            html += `<tr>
                <td>${escHtml(a.code)}</td>
                <td><div class="acct-coa-name-cell" style="${padSide}:${indent}px">${toggle}<span>${icon}</span><span>${escHtml(lbl)}</span>${a.system ? ' 🔒' : ''}${editBtn}</div></td>
                <td>${escHtml(coaCashFlowLabel(a.cashFlow))}</td>
                <td>${escHtml(pay)}</td>
                <td>${escHtml(exp)}</td>
                <td>${escHtml(coaAccountTypeLabel(a))}</td>
                <td>${bal.debit || bal.credit ? escHtml(summaryAmtOm(Math.abs(bal.debit - bal.credit))) : '—'}</td>
            </tr>`;
            if (a.id === 'coa_112' && isOpen) {
                const hasCoaBankChildren = getChartOfAccounts().some((x) => x.parentId === 'coa_112' && x.linkedBankAccountId);
                if (!hasCoaBankChildren) {
                    getBankAccounts(false).forEach((ba) => {
                    const led = computeBankAccountLedger(ba.id);
                    html += `<tr>
                        <td>${escHtml(ba.accountNo || '—')}</td>
                        <td><div class="acct-coa-name-cell" style="${padSide}:${indent + 16}px"><span>🏦</span><span>${escHtml(bankAccountLabel(ba))}</span></div></td>
                        <td>${escHtml(coaCashFlowLabel('cash'))}</td>
                        <td>${t('نعم', 'Yes')}</td><td>—</td><td>${t('بنكي', 'Bank')}</td>
                        <td><span class="acct-coa-amount--income">${escHtml(summaryAmtOm(led.income))}</span> · <span class="acct-coa-amount--expense">${escHtml(summaryAmtOm(led.expense))}</span></td>
                    </tr>`;
                    });
                }
            }
            if (hasKids && isOpen && a.id !== 'coa_112') html += renderCoaWorkspaceRows(a.id, d + 1, compact);
        });
        return html;
    }

    function renderCoaWorkspaceHtml() {
        const q = escHtml(_accountingUiState.coaSearch || '');
        return `
            <div class="acct-coa-workspace">
                <div class="acct-coa-toolbar">
                    <input type="search" placeholder="${t('بحث في شجرة الحسابات', 'Search chart of accounts')}" value="${q}" oninput="_accountingUiState.coaSearch=this.value; scheduleAccountingWorkspaceRender()" style="min-width:220px">
                    ${canManageChartOfAccounts() ? `<button type="button" class="acct-nav-btn" onclick="openCoaEditorModal('')">➕ ${t('حساب جديد', 'New account')}</button>` : ''}
                    <button type="button" class="acct-nav-btn" onclick="openAccountingManualEntryModal('income')">➕ ${t('إيراد', 'Income')}</button>
                    <button type="button" class="acct-nav-btn" onclick="openAccountingManualEntryModal('expense')">➖ ${t('مصروف', 'Expense')}</button>
                </div>
                <div class="table-wrap" style="max-height:68vh;overflow:auto">
                    <table class="acct-coa-table">
                        <thead><tr>
                            <th>${t('رقم الحساب', 'Account no.')}</th>
                            <th>${t('اسم الحساب', 'Account name')}</th>
                            <th>${t('التدفق النقدي', 'Cash flow')}</th>
                            <th>${t('المدفوعات', 'Payments')}</th>
                            <th>${t('مطالبات المصروف', 'Expense claims')}</th>
                            <th>${t('نوع الحساب', 'Account type')}</th>
                            <th>${t('الرصيد', 'Balance')}</th>
                        </tr></thead>
                        <tbody>${renderCoaWorkspaceRows('', 0, false) || `<tr><td colspan="7" style="text-align:center;padding:16px;color:#666">${t('لا توجد حسابات', 'No accounts')}</td></tr>`}</tbody>
                    </table>
                </div>
            </div>`;
    }

    function buildAccountingLedgerManualEntryActions(e) {
        const id = escHtml(e.id);
        let html = `<div class="acct-ledger-actions">
                <button type="button" class="btn-outline mini-btn" onclick="printAccountingEntryVoucher('${id}')" title="${t('طباعة الإيصال', 'Print receipt')}">🖨️ ${t('طباعة', 'Print')}</button>
                <button type="button" class="btn-outline mini-btn" onclick="openAccountingReceiptDetailModal('${id}')">${t('تفاصيل', 'Details')}</button>`;
        if (canEditAccountingManualEntry(e)) {
            html += `<button type="button" class="btn-outline mini-btn" onclick="editAccountingManualEntry('${id}')">✏️ ${t('تعديل', 'Edit')}</button>
                <button type="button" class="btn-outline mini-btn" onclick="deleteAccountingManualEntry('${id}')">🗑️ ${t('حذف', 'Delete')}</button>`;
        }
        if (canRequestAccountingManualEntryChange(e)) {
            html += `<button type="button" class="btn-outline mini-btn" onclick="requestEditAccountingManualEntry('${id}')">✏️ ${t('طلب تعديل', 'Request edit')}</button>
                <button type="button" class="btn-outline mini-btn" onclick="requestDeleteAccountingManualEntry('${id}')">🗑️ ${t('طلب حذف', 'Request delete')}</button>`;
        }
        if (isAccountingEntryPendingApproval(e) && canApproveAccountingEntry()) {
            html += `<button type="button" class="btn-primary mini-btn" onclick="openAccountingApprovalModal('${id}')">${t('اعتماد / رفض', 'Approve / reject')}</button>`;
        }
        html += `</div>`;
        return html;
    }

    function renderAccountingLedgerTab(kind, regIn, dashIn) {
        const reg = regIn || loadAccountingRegistry();
        const isIncome = kind === 'income';
        const ledgerRows = (isIncome ? collectAccountingIncomeLedgerRows(reg) : collectAccountingExpenseLedgerRows(reg)).filter(
            accountingLedgerRowMatchesFilters
        );
        const dash = dashIn || computeLiveAccountingDashboard(reg);
        const hubCls = isIncome ? 'acct-module-hub--income' : 'acct-module-hub--expense';
        const title = isIncome ? t('الإيرادات', 'Income') : t('المصروفات', 'Expenses');
        const total = isIncome ? dash.incomeReceived : dash.expensesPaid;
        const pending = isIncome ? dash.pendingIncome : dash.pendingExpense;
        const entryRows = ledgerRows.length
            ? ledgerRows
                .map((row) => {
                    if (row.source === 'cheque') {
                        const ch = row.data;
                        const amts = getIncomeLedgerRowAmounts(row, reg);
                        const parentLink = findParentReceiptAllocationForCheque(ch.id, reg);
                        const parentLbl = parentLink
                            ? `<br><small style="color:#1565c0">↳ ${t('من سند', 'From voucher')} ${escHtml(parentLink.entry.voucherNo || '—')} (${escHtml(summaryAmtOm(parentLink.entry.amount))})</small>`
                            : '';
                        const itemLbl = `${t('شيك', 'Cheque')} ${escHtml(ch.chequeNo || '—')}${parentLbl}`;
                        const openDetail = parentLink
                            ? `openAccountingReceiptDetailModal('${escHtml(parentLink.entry.id)}')`
                            : `openAccountingChequeReceiptDetailModal('${escHtml(ch.id)}')`;
                        const parentEditBtns =
                            parentLink && canRequestAccountingManualEntryChange(parentLink.entry)
                                ? `<button type="button" class="btn-outline mini-btn" onclick="requestEditAccountingManualEntry('${escHtml(parentLink.entry.id)}')">✏️ ${t('تعديل السند', 'Edit voucher')}</button>
                <button type="button" class="btn-outline mini-btn" onclick="requestDeleteAccountingManualEntry('${escHtml(parentLink.entry.id)}')">🗑️ ${t('حذف السند', 'Delete voucher')}</button>`
                                : '';
                        const actions = `<div class="acct-ledger-actions">
                <button type="button" class="btn-outline mini-btn" onclick="printAccountingChequeReceipt('${escHtml(ch.id)}')" title="${t('طباعة الإيصال', 'Print receipt')}">🖨️ ${t('طباعة', 'Print')}</button>
                <button type="button" class="btn-outline mini-btn" onclick="${openDetail}">${t('تفاصيل', 'Details')}</button>
                <button type="button" class="btn-primary mini-btn" onclick="openAccountingChequeActionModal('${escHtml(ch.id)}','action')">${t('إدارة', 'Manage')}</button>
                <button type="button" class="btn-outline mini-btn" onclick="openAccountingChequeActionModal('${escHtml(ch.id)}','history')">${t('السجل', 'Log')}</button>
                ${parentEditBtns}
            </div>`;
                        return `<tr>
                <td>${escHtml(ch.lastActionDate || ch.dueDate || '—')}</td>
                <td>${escHtml(ch.building || '—')}</td><td>${escHtml(ch.unit || '—')}</td>
                <td>${itemLbl}<br><small style="color:#666">${escHtml(accountingChequeStatusLabel(ch.status))}</small></td>
                <td>${escHtml(ch.tenant || '—')}</td>
                <td class="acct-ledger-amt-paid acct-ledger-amt-link" onclick="${openDetail}" title="${t('عرض تفصيل الدفع', 'View payment details')}">${escHtml(summaryAmtOm(amts.paid))}</td>
                <td class="acct-ledger-amt-remaining">${amts.remaining > 0 ? escHtml(summaryAmtOm(amts.remaining)) : '—'}</td>
                <td>${escHtml(accountingChequeStatusLabel(ch.status))}</td>
                <td>${actions}</td>
            </tr>`;
                    }
                    const e = row.data;
                    const amts = isIncome ? getIncomeLedgerRowAmounts(row, reg) : { paid: parseFloat(e.amount) || 0, remaining: 0 };
                    const coaLbl = e.coaAccountId ? coaAccountLabel(coaAccountById(e.coaAccountId)) : '';
                    const allocRefs = (e.paymentAllocations || [])
                        .map((a) => a.ref)
                        .filter(Boolean)
                        .join(' · ');
                    const voucherLbl = e.voucherNo
                        ? `<br><small style="color:#1565c0;font-weight:700">📄 ${t('سند قبض', 'Receipt')} ${escHtml(e.voucherNo)}</small>`
                        : e.manualEntry
                          ? `<br><small style="color:#1565c0;font-weight:700">📄 ${t('سند قبض يدوي', 'Manual receipt')}</small>`
                          : '';
                    const paidCell = isIncome
                        ? `<td class="acct-ledger-amt-paid acct-ledger-amt-link" onclick="openAccountingReceiptDetailModal('${escHtml(e.id)}')" title="${t('عرض تفصيل التوزيع', 'View allocation breakdown')}">${escHtml(summaryAmtOm(amts.paid))}</td>
                <td class="acct-ledger-amt-remaining">${amts.remaining > 0 ? escHtml(summaryAmtOm(amts.remaining)) : '—'}</td>`
                        : `<td class="acct-coa-amount--expense">${escHtml(summaryAmtOm(e.amount))}</td>`;
                    const incomeActions = buildAccountingLedgerManualEntryActions(e);
                    const expenseActions = buildAccountingLedgerManualEntryActions(e);
                    return `<tr>
                <td>${escHtml(e.dueDate || '—')}</td>
                <td>${escHtml(e.building || '—')}</td><td>${escHtml(e.unit || '—')}</td>
                <td>${escHtml(e.title)}${voucherLbl}${coaLbl ? `<br><small style="color:#666">${t('حساب الإيراد', 'Revenue account')}: ${escHtml(coaLbl)}</small>` : ''}${allocRefs ? `<br><small style="color:#1565c0">🧾 ${escHtml(allocRefs)}</small>` : ''}</td>
                <td>${escHtml(e.partyName || '—')}</td>
                ${isIncome ? paidCell : paidCell}
                <td>${accountingEntryLedgerStatusCell(e)}</td>
                <td>${isIncome ? incomeActions : expenseActions}</td>
            </tr>`;
                })
                .join('')
            : `<tr><td colspan="${isIncome ? 9 : 8}" style="text-align:center;padding:16px;color:#666">${t('لا توجد بنود', 'No entries')}</td></tr>`;
        return `
            <div class="acct-module-hub ${hubCls}">
                <div class="acct-module-hub-head">
                    <h4>${isIncome ? '💚' : '🔴'} ${title}</h4>
                    <div class="acct-module-actions">
                        <button type="button" class="acct-nav-btn acct-nav-btn--primary" onclick="openAccountingManualEntryModal('${isIncome ? 'income' : 'expense'}')">➕ ${t('معاملة جديدة', 'New transaction')}</button>
                        <button type="button" class="acct-nav-btn" onclick="printAccountingLedgerReport('${kind}')">🖨️ ${t('التقارير', 'Reports')}</button>
                        <button type="button" class="acct-nav-btn" onclick="_accountingUiState.tab='coa'; renderAccountingWorkspace()">🌳 ${t('شجرة الحسابات', 'Chart of accounts')}</button>
                        ${isIncome ? `<button type="button" class="acct-nav-btn" onclick="_accountingUiState.tab='invoices'; renderAccountingWorkspace()">🧾 ${t('الفواتير', 'Invoices')}</button>` : `<button type="button" class="acct-nav-btn" onclick="_accountingUiState.tab='pending'; renderAccountingWorkspace()">⏳ ${t('بانتظار الاعتماد', 'Pending')}</button>`}
                    </div>
                </div>
                <div class="acct-live-dashboard">
                    <div class="acct-live-card ${isIncome ? 'acct-live-card--income' : 'acct-live-card--expense'}"><small>${isIncome ? t('المبلغ المستلم', 'Received') : t('المبلغ المصروف', 'Spent')}</small><strong>${escHtml(summaryAmtOm(total))}</strong></div>
                    <div class="acct-live-card"><small>${t('بانتظار الاعتماد', 'Pending approval')}</small><strong>${escHtml(summaryAmtOm(pending))}</strong></div>
                    <div class="acct-live-card acct-live-card--net"><small>${t('صافي الحركة', 'Net movement')}</small><strong>${escHtml(summaryAmtOm(total - pending))}</strong></div>
                </div>
            </div>
            ${buildAccountingTabToolbar(kind)}
            <div class="table-wrap"><table class="data-table" style="width:100%;font-size:12px">
                <thead><tr>
                    <th>${t('التاريخ', 'Date')}</th><th>${t('مبنى', 'Building')}</th><th>${t('وحدة', 'Unit')}</th>
                    <th>${t('البند', 'Item')}</th><th>${t('الجهة', 'Party')}</th>
                    ${isIncome ? `<th>${t('المدفوع', 'Paid')}</th><th>${t('المتبقي', 'Remaining')}</th>` : `<th>${t('المبلغ', 'Amount')}</th>`}
                    <th>${t('الحالة', 'Status')}</th><th>${t('إجراء', 'Action')}</th>
                </tr></thead>
                <tbody>${entryRows}</tbody>
            </table></div>`;
    }

    function renderAddressBookBankAccountsBlock(personName) {
        const name = toStr(personName).trim();
        if (!name) return '';
        const banks = getBankAccounts(false).filter((b) => toStr(b.ownerName) === name);
        if (!banks.length) return '';
        const partyFin = computePartyFinancialSummary(name);
        const rows = banks.map((ba) => {
            const led = computeBankAccountLedger(ba.id);
            return `<div class="ab-bank-acct-row">
                <div><strong>🏦 ${escHtml(bankAccountLabel(ba))}</strong>${ba.isDefault ? ` <span class="bank-default-badge">★ ${t('افتراضي', 'Default')}</span>` : ''}<br>
                <small>${escHtml(ba.bankName || '')} · ${escHtml(ba.accountNo || '')}${ba.iban ? ` · IBAN ${escHtml(ba.iban)}` : ''}</small></div>
                <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
                    <span class="ab-fin-pill ab-fin-pill--income">${t('دخل', 'Income')}: ${escHtml(summaryAmtOm(led.income))}</span>
                    <span class="ab-fin-pill ab-fin-pill--expense">${t('خصم', 'Debit')}: ${escHtml(summaryAmtOm(led.expense))}</span>
                    <span class="ab-fin-pill ab-fin-pill--balance">${t('المتبقي', 'Balance')}: ${escHtml(summaryAmtOm(led.balance))}</span>
                    <button type="button" class="btn-outline mini-btn" onclick="printBankAccountStatement('${escHtml(ba.id)}')">🖨️ ${t('كشف الحساب', 'Statement')}</button>
                </div>
            </div>`;
        }).join('');
        return `<div class="ab-bank-acct-block">
            <strong>${t('الحسابات البنكية المرتبطة', 'Linked bank accounts')}</strong>
            <div style="margin:8px 0;display:flex;flex-wrap:wrap;gap:6px">
                <span class="ab-fin-pill ab-fin-pill--income">${t('إجمالي الدخل', 'Total income')}: ${escHtml(summaryAmtOm(partyFin.income))}</span>
                <span class="ab-fin-pill ab-fin-pill--expense">${t('إجمالي الخصم', 'Total debit')}: ${escHtml(summaryAmtOm(partyFin.expense))}</span>
                <span class="ab-fin-pill ab-fin-pill--balance">${t('المجموع المتبقي', 'Net balance')}: ${escHtml(summaryAmtOm(partyFin.balance))}</span>
            </div>
            ${rows}
        </div>`;
    }

    function printBankAccountStatement(bankAccountId) {
        const ba = getBankAccountById(bankAccountId);
        if (!ba) return;
        const reg = loadAccountingRegistry();
        const led = computeBankAccountLedger(bankAccountId);
        const lines = [];
        (reg.entries || []).forEach((e) => {
            if (toStr(e.bankAccountId) !== toStr(bankAccountId)) return;
            lines.push({
                date: e.dueDate,
                desc: e.title,
                type: e.type,
                amount: e.amount,
                party: e.partyName
            });
        });
        (reg.cheques || []).forEach((ch) => {
            (ch.actions || []).forEach((a) => {
                if (toStr(a.bankAccountId) !== toStr(bankAccountId)) return;
                lines.push({
                    date: a.actionDate,
                    desc: `${accountingActionTypeLabel(a.actionType)} — ${ch.chequeNo || ''}`,
                    type: a.actionType === 'bank_deposit' ? 'income' : 'other',
                    amount: ch.amount,
                    party: ch.tenant
                });
            });
        });
        lines.sort((a, b) => toStr(a.date).localeCompare(toStr(b.date)));
        const body = `
            <div class="section-header property-section-h">${t('كشف حساب بنكي', 'Bank account statement')}</div>
            <p class="property-report-meta">${escHtml(bankAccountLabel(ba))} · ${escHtml(ba.ownerName || '')}</p>
            <p class="property-report-meta">${t('دخل', 'Income')}: ${escHtml(summaryAmtOm(led.income))} · ${t('خصم', 'Debit')}: ${escHtml(summaryAmtOm(led.expense))} · ${t('المتبقي', 'Balance')}: ${escHtml(summaryAmtOm(led.balance))}</p>
            <table class="info-table property-report-table print-zebra"><thead><tr>
                <th>${t('التاريخ', 'Date')}</th><th>${t('البيان', 'Description')}</th><th>${t('الجهة', 'Party')}</th><th>${t('المبلغ', 'Amount')}</th>
            </tr></thead><tbody>${lines.length ? lines.map((ln) => `<tr>
                <td>${escHtml(ln.date || '—')}</td><td>${escHtml(ln.desc || '—')}</td><td>${escHtml(ln.party || '—')}</td>
                <td>${escHtml(summaryAmtOm(ln.amount))}</td></tr>`).join('') : `<tr><td colspan="4">${t('لا توجد حركات', 'No transactions')}</td></tr>`}</tbody></table>`;
        printWithSiteStandard(t('كشف حساب بنكي', 'Bank account statement'), body);
    }

    function printAccountingLedgerReport(kind) {
        const isIncome = kind === 'income';
        const reg = loadAccountingRegistry();
        const rows = reg.entries.filter((e) => toStr(e.type) === (isIncome ? 'income' : 'expense')).filter(accountingFilterRow);
        const dash = computeLiveAccountingDashboard();
        const title = isIncome ? t('تقرير الإيرادات', 'Income report') : t('تقرير المصروفات', 'Expense report');
        const body = `
            <div class="section-header property-section-h">${title}</div>
            <p class="property-report-meta">${isIncome ? t('المستلم', 'Received') : t('المصروف', 'Spent')}: ${escHtml(summaryAmtOm(isIncome ? dash.incomeReceived : dash.expensesPaid))}</p>
            <table class="info-table property-report-table print-zebra"><thead><tr>
                <th>#</th><th>${t('التاريخ', 'Date')}</th><th>${t('البند', 'Item')}</th><th>${t('الجهة', 'Party')}</th><th>${t('المبلغ', 'Amount')}</th>
            </tr></thead><tbody>${rows.map((e, i) => `<tr><td>${i + 1}</td><td>${escHtml(e.dueDate || '—')}</td><td>${escHtml(e.title)}</td><td>${escHtml(e.partyName || '—')}</td><td>${escHtml(summaryAmtOm(e.amount))}</td></tr>`).join('') || `<tr><td colspan="5">${t('لا توجد بيانات', 'No data')}</td></tr>`}</tbody></table>`;
        printWithSiteStandard(title, body, { orientation: 'landscape' });
    }

    function findParentReceiptAllocation(receivableKind, receivableId, regIn) {
        const reg = regIn || loadAccountingRegistry();
        const kind = toStr(receivableKind);
        const rid = toStr(receivableId);
        if (!kind || !rid) return null;
        for (const e of reg.entries || []) {
            if (toStr(e.type) !== 'income') continue;
            const allocs = (e.paymentAllocations || []).filter((a) => (parseFloat(a.amount) || 0) > 0);
            for (let i = 0; i < allocs.length; i++) {
                const a = allocs[i];
                if (a.kind === kind && toStr(a.id) === rid) {
                    return { entry: e, alloc: a, allocIndex: i };
                }
            }
        }
        const receivable =
            kind === 'cheque'
                ? (reg.cheques || []).find((c) => c.id === rid)
                : kind === 'invoice'
                  ? (reg.invoices || []).find((i) => i.id === rid)
                  : null;
        if (!receivable) return null;
        const histories = [...(receivable.paymentHistory || [])].reverse();
        for (const h of histories) {
            const entryId = toStr(h.entryId);
            const voucherNo = toStr(h.voucherNo);
            let entry = null;
            if (entryId) {
                entry = (reg.entries || []).find((x) => x.id === entryId && toStr(x.type) === 'income');
            }
            if (!entry && voucherNo) {
                entry = (reg.entries || []).find((x) => toStr(x.type) === 'income' && toStr(x.voucherNo) === voucherNo);
            }
            if (!entry) continue;
            const allocs = (entry.paymentAllocations || []).filter((a) => (parseFloat(a.amount) || 0) > 0);
            let allocIndex = allocs.findIndex((a) => a.kind === kind && toStr(a.id) === rid);
            let alloc = allocIndex >= 0 ? allocs[allocIndex] : null;
            if (!alloc) {
                const amt = parseFloat(h.amount) || 0;
                if (amt <= 0) continue;
                alloc = {
                    kind,
                    id: rid,
                    ref: kind === 'cheque' ? receivable.chequeNo : receivable.invoiceNo || rid,
                    amount: amt,
                    building: receivable.building,
                    unit: receivable.unit,
                    note: h.note
                };
                allocIndex = -1;
            }
            return { entry, alloc, allocIndex };
        }
        if (kind === 'cheque') {
            for (const act of receivable.actions || []) {
                if (toStr(act.actionType) !== 'manual_payment_alloc') continue;
                const amt = parseFloat(act.allocatedAmount) || 0;
                if (amt <= 0) continue;
                const entryId = toStr(act.entryId);
                const voucherNo = toStr(act.voucherNo);
                let entry = entryId
                    ? (reg.entries || []).find((x) => x.id === entryId && toStr(x.type) === 'income')
                    : null;
                if (!entry && voucherNo) {
                    entry = (reg.entries || []).find((x) => toStr(x.type) === 'income' && toStr(x.voucherNo) === voucherNo);
                }
                if (!entry) continue;
                const allocs = (entry.paymentAllocations || []).filter((a) => (parseFloat(a.amount) || 0) > 0);
                let allocIndex = allocs.findIndex((a) => a.kind === 'cheque' && toStr(a.id) === rid);
                const alloc =
                    allocIndex >= 0
                        ? allocs[allocIndex]
                        : {
                              kind: 'cheque',
                              id: rid,
                              ref: receivable.chequeNo,
                              amount: amt,
                              building: receivable.building,
                              unit: receivable.unit,
                              note: act.actionNote
                          };
                if (allocIndex < 0) allocIndex = -1;
                return { entry, alloc, allocIndex };
            }
        }
        return null;
    }

    function findParentReceiptAllocationForCheque(chequeId, regIn) {
        return findParentReceiptAllocationForChequeExtended(chequeId, regIn);
    }

    function findParentReceiptAllocationForInvoice(invoiceId, regIn) {
        return findParentReceiptAllocation('invoice', invoiceId, regIn);
    }

    function accountingChequeBuildingAliases(building) {
        const keys = new Set();
        const b = toStr(building).trim();
        if (!b) return keys;
        keys.add(b);
        const prof = getBuildingProfile(b);
        if (prof) {
            const no = toStr(prof.buildingNo).trim();
            if (no) keys.add(no);
            const name = toStr(prof.name).trim();
            if (name) keys.add(name);
        }
        const profiles = buildingProfiles && typeof buildingProfiles === 'object' ? buildingProfiles : {};
        Object.keys(profiles).forEach((k) => {
            const p = profiles[k];
            const no = toStr(p?.buildingNo).trim();
            const name = toStr(p?.name).trim();
            if (no === b || name === b || k === b) {
                keys.add(k);
                if (no) keys.add(no);
                if (name) keys.add(name);
            }
        });
        return keys;
    }

    function resolveAccountingChequeClientName(ch, parentEntry) {
        let name = toStr(ch.tenant).trim();
        if (name) return name;
        name = toStr(parentEntry?.partyName).trim();
        if (name) return name;
        const unitNorm = normalizeUnit(ch.unit);
        const buildingKeys = accountingChequeBuildingAliases(ch.building);
        for (const bk of buildingKeys) {
            const payload = getSavedContractPayloadForUnit({ building: bk, unit: ch.unit });
            if (payload) {
                name = toStr(payload.tenantNameAr).trim() || toStr(payload.tenantNameEn).trim();
                if (name) return name;
            }
        }
        const units = getUnitsData().filter(
            (u) => buildingKeys.has(toStr(u.building)) && normalizeUnit(u.unit) === unitNorm
        );
        const rented = units.find((u) => toStr(u.tenant).trim() || toStr(u.tenantEn).trim());
        if (rented) return toStr(rented.tenant).trim() || toStr(rented.tenantEn).trim();
        const ag = toStr(ch.agreementNo);
        if (ag) {
            const byAgUnit = units.find((u) => toStr(u.agreementNo) === ag);
            if (byAgUnit) {
                name = toStr(byAgUnit.tenant).trim() || toStr(byAgUnit.tenantEn).trim();
                if (name) return name;
            }
            const map = loadSavedContractsByUnitMap();
            for (const k of Object.keys(map)) {
                const p = map[k]?.payload;
                if (p && toStr(p.agreementNo) === ag) {
                    name = toStr(p.tenantNameAr).trim() || toStr(p.tenantNameEn).trim();
                    if (name) return name;
                }
            }
        }
        return '—';
    }

    function resolveAccountingReceiptClientName(allocSnap, entry) {
        const chLike = {
            building: allocSnap?.building || entry?.building,
            unit: allocSnap?.unit || entry?.unit,
            tenant: '',
            agreementNo: entry?.agreementNo || ''
        };
        const resolved = resolveAccountingChequeClientName(chLike, entry);
        return resolved !== '—' ? resolved : toStr(entry?.partyName).trim() || '—';
    }

    function resolveAccountingChequePropertyLabel(ch) {
        const b = toStr(ch.building);
        const u = toStr(ch.unit);
        if (!b && !u) return '—';
        const prof = b ? getBuildingProfile(b) : null;
        const bNo = toStr(prof?.buildingNo).trim() || b;
        const parts = [];
        if (bNo) parts.push(`${t('مبنى', 'Building')} ${bNo}`);
        if (u) parts.push(`${t('وحدة', 'Unit')} ${u}`);
        return parts.join(' — ') || '—';
    }

    function findParentReceiptAllocationForChequeExtended(chequeId, regIn) {
        const reg = regIn || loadAccountingRegistry();
        let parent = findParentReceiptAllocation('cheque', chequeId, reg);
        if (parent) return parent;
        const ch = (reg.cheques || []).find((c) => c.id === chequeId);
        if (!ch) return null;
        const uk = ch.unitKey || accountingUnitKey(ch.building, ch.unit);
        const ag = toStr(ch.agreementNo);
        const day = toStr(ch.lastActionDate || ch.dueDate);

        for (const e of reg.entries || []) {
            if (toStr(e.type) !== 'income') continue;
            if (!['confirmed', 'invoiced'].includes(toStr(e.status))) continue;
            const entryUk = e.unitKey || accountingUnitKey(e.building, e.unit);
            const unitMatch =
                (uk && entryUk === uk) ||
                (e.paymentAllocations || []).some((a) => accountingUnitKey(a.building, a.unit) === uk);
            const dayMatch = !day || !toStr(e.dueDate) || toStr(e.dueDate) === day;
            if (!unitMatch) continue;
            const allocs = (e.paymentAllocations || []).filter((a) => (parseFloat(a.amount) || 0) > 0);
            const idx = allocs.findIndex((a) => a.kind === 'cheque' && toStr(a.id) === chequeId);
            if (idx >= 0) return { entry: e, alloc: allocs[idx], allocIndex: idx };
            if (e.manualEntry && dayMatch) {
                const paidCheques = (reg.cheques || []).filter((c) => {
                    if (ag && toStr(c.agreementNo) !== ag) return false;
                    if (uk && (c.unitKey || accountingUnitKey(c.building, c.unit)) !== uk) return false;
                    const cd = toStr(c.lastActionDate || c.dueDate);
                    if (day && cd && cd !== day) return false;
                    return isAccountingChequePaidStatus(c.status);
                });
                const sum = paidCheques.reduce((s, c) => s + (parseFloat(c.paidAmount) || 0), 0);
                const entryAmt = parseFloat(e.amount) || 0;
                if (paidCheques.some((c) => c.id === chequeId) && Math.abs(sum - entryAmt) < 0.02) {
                    const amt = parseFloat(ch.paidAmount) || 0;
                    return {
                        entry: e,
                        alloc: {
                            kind: 'cheque',
                            id: ch.id,
                            ref: ch.chequeNo,
                            amount: amt,
                            building: ch.building,
                            unit: ch.unit
                        },
                        allocIndex: -1,
                        inferred: true
                    };
                }
            }
        }

        const cluster = collectChequeClusterForReceipt(ch, reg, null);
        if (cluster.some((c) => c.id === chequeId) && cluster.length >= 1) {
            const sum = cluster.reduce((s, c) => s + (parseFloat(c.paidAmount) || 0), 0);
            for (const e of reg.entries || []) {
                if (toStr(e.type) !== 'income') continue;
                if (!['confirmed', 'invoiced'].includes(toStr(e.status))) continue;
                const entryUk = e.unitKey || accountingUnitKey(e.building, e.unit);
                const unitMatch =
                    (uk && entryUk === uk) ||
                    (e.paymentAllocations || []).some((a) => accountingUnitKey(a.building, a.unit) === uk);
                const dayMatch = !day || !toStr(e.dueDate) || toStr(e.dueDate) === day;
                if (!unitMatch || !dayMatch) continue;
                const entryAmt = parseFloat(e.amount) || 0;
                if (Math.abs(sum - entryAmt) > 0.02) continue;
                const amt = parseFloat(ch.paidAmount) || 0;
                if (amt <= 0) continue;
                return {
                    entry: e,
                    alloc: {
                        kind: 'cheque',
                        id: ch.id,
                        ref: ch.chequeNo,
                        amount: amt,
                        building: ch.building,
                        unit: ch.unit
                    },
                    allocIndex: -1,
                    inferred: true
                };
            }
        }
        return null;
    }

    function collectChequeClusterForReceipt(ch, reg, parentEntry) {
        const ag = toStr(ch.agreementNo);
        const day = toStr(parentEntry?.dueDate || ch.lastActionDate || ch.dueDate);
        const uk = ch.unitKey || accountingUnitKey(ch.building, ch.unit);
        return (reg.cheques || []).filter((c) => {
            if (!isAccountingChequePaidStatus(c.status)) return false;
            if (uk && (c.unitKey || accountingUnitKey(c.building, c.unit)) !== uk) return false;
            if (ag && toStr(c.agreementNo) !== ag) return false;
            const cd = toStr(c.lastActionDate || c.dueDate);
            if (day && cd && cd !== day) return false;
            return (parseFloat(c.paidAmount) || 0) > 0;
        });
    }

    function buildChequeReceiptAllocDetails(parent, ch, reg) {
        const e = parent.entry;
        let allocDetails = (e.paymentAllocations || [])
            .filter((a) => (parseFloat(a.amount) || 0) > 0)
            .map((a) => resolvePaymentAllocationSnapshot(a, reg));
        if (!allocDetails.length || parent.inferred) {
            const cluster = collectChequeClusterForReceipt(ch, reg, e);
            cluster.forEach((c) => {
                if (allocDetails.some((d) => d.kind === 'cheque' && d.id === c.id)) return;
                const amt = parseFloat(c.paidAmount) || 0;
                const total = parseFloat(c.amount) || 0;
                allocDetails.push({
                    kind: 'cheque',
                    id: c.id,
                    ref: c.chequeNo,
                    amount: amt,
                    building: c.building,
                    unit: c.unit,
                    total,
                    paidBefore: 0,
                    remainingAfter: Math.max(0, total - amt),
                    note: ''
                });
            });
        }
        const snap = resolvePaymentAllocationSnapshot(parent.alloc, reg);
        if (!allocDetails.some((d) => d.kind === 'cheque' && d.id === ch.id)) {
            allocDetails.push(snap);
        }
        return allocDetails;
    }

    function appendAccountingEntryMetaNoteRows(rows, entry) {
        if (!entry || !rows) return rows;
        const desc = toStr(entry.title).trim();
        const ref = toStr(entry.referenceNo).trim();
        const payNote = toStr(entry.paymentNote).trim();
        if (desc) rows.push([t('الوصف', 'Description'), desc]);
        if (ref) rows.push([t('المرجع', 'Reference'), ref]);
        if (payNote) rows.push([t('ملاحظة الدفع', 'Payment note'), payNote]);
        return rows;
    }

    function accountingEntryPreservedOnContractSync(e, unitKey, incomingEntryKeys) {
        if (e.unitKey !== unitKey) return true;
        if (e.manualEntry) return true;
        if (toStr(e.type) === 'income' && toStr(e.voucherNo)) return true;
        return incomingEntryKeys.has(e.linkedKey);
    }

    function buildAccountingChequeReceiptNoteRows(parent, ch, reg, fallbackNote) {
        const rows = [];
        if (parent) {
            const e = parent.entry;
            const snap = resolvePaymentAllocationSnapshot(parent.alloc, reg);
            const allocDetails = buildChequeReceiptAllocDetails(parent, ch, reg);
            const thisAmt = parseFloat(snap.amount) || parseFloat(ch.paidAmount) || 0;
            const others = allocDetails.filter((a) => !(a.kind === 'cheque' && a.id === ch.id));
            rows.push([
                t('إجمالي الدفعة', 'Payment total'),
                `${summaryAmtOm(e.amount)} — ${t('سند', 'Voucher')} ${toStr(e.voucherNo) || '—'}`
            ]);
            rows.push([
                t('مقتطع لهذا الشيك', 'Applied to this cheque'),
                `${summaryAmtOm(thisAmt)} — ${t('شيك', 'Cheque')} ${ch.chequeNo || '—'}`
            ]);
            if (others.length) {
                const remainder = others.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
                const otherDesc = others
                    .map((a) => {
                        let ref = a.ref || '—';
                        if (a.kind === 'cheque') ref = `${t('شيك', 'Cheque')} ${ref}`;
                        else if (a.kind === 'invoice') ref = `${t('فاتورة', 'Invoice')} ${ref}`;
                        return `${summaryAmtOm(a.amount)} → ${ref}`;
                    })
                    .join(' · ');
                rows.push([
                    t('المتبقي موزّع على', 'Remainder allocated to'),
                    `${summaryAmtOm(remainder)} — ${otherDesc}`
                ]);
            } else {
                const noteLine =
                    snap.note ||
                    buildAllocationPaymentNoteLine(
                        { voucherNo: e.voucherNo, totalAmount: e.amount, entryId: e.id, date: e.dueDate },
                        snap,
                        (parseFloat(snap.remainingAfter) || 0) <= 0.001 ? 'full' : 'partial'
                    );
                if (noteLine) rows.push([t('ملاحظة', 'Note'), noteLine]);
            }
            appendAccountingEntryMetaNoteRows(rows, e);
            return rows;
        }
        const cluster = collectChequeClusterForReceipt(ch, reg, null);
        if (cluster.length >= 2) {
            const sum = cluster.reduce((s, c) => s + (parseFloat(c.paidAmount) || 0), 0);
            const thisAmt = parseFloat(ch.paidAmount) || 0;
            const others = cluster.filter((c) => c.id !== ch.id);
            if (others.length) {
                const otherDesc = others
                    .map((c) => `${t('شيك', 'Cheque')} ${c.chequeNo || '—'}: ${summaryAmtOm(c.paidAmount || c.amount)}`)
                    .join(' · ');
                rows.push([
                    t('هذا الشيك', 'This cheque'),
                    `${summaryAmtOm(thisAmt)} — ${t('شيك', 'Cheque')} ${ch.chequeNo || '—'}`
                ]);
                rows.push([t('إجمالي الدفعة المجمّعة', 'Combined payment total'), summaryAmtOm(sum)]);
                rows.push([t('المتبقي موزّع على', 'Remainder allocated to'), otherDesc]);
                return rows;
            }
        }
        const note = toStr(fallbackNote).trim();
        if (note) rows.push([t('ملاحظة', 'Note'), note]);
        return rows;
    }

    function refreshAccountingReceiptDetailModalIfOpen() {
        const st = _accountingReceiptDetailState;
        const modal = document.getElementById('accountingReceiptDetailModal');
        if (!st?.id || !modal?.classList.contains('open')) return;
        if (st.kind === 'entry') openAccountingReceiptDetailModal(st.id);
        else if (st.kind === 'cheque') openAccountingChequeReceiptDetailModal(st.id);
    }

    function buildAccountingNotePanelHtml(rows) {
        if (!rows || !rows.length) return '';
        return `<div class="section-header property-section-h">${t('ملاحظات الدفع', 'Payment notes')}</div>
            <div class="acct-voucher-note-panel">
                <table class="info-table property-report-table print-zebra-cells acct-voucher-print-table acct-voucher-note-panel-table">
                    <tbody>${rows
                        .map(
                            ([label, value]) =>
                                `<tr><th>${escHtml(label)}</th><td>${escHtml(value)}</td></tr>`
                        )
                        .join('')}</tbody>
                </table>
            </div>`;
    }

    function buildAccountingChequeReceiptNotePanelHtml(parent, ch, reg, fallbackNote) {
        const rows = buildAccountingChequeReceiptNoteRows(parent, ch, reg, fallbackNote);
        return buildAccountingNotePanelHtml(rows);
    }

    function buildChequeReceiptPaymentContextHtml(parent, ch, reg) {
        return buildAccountingChequeReceiptNotePanelHtml(parent, ch, reg, '');
    }

    function inferChequeClusterPaymentNote(ch, reg) {
        const cluster = collectChequeClusterForReceipt(ch, reg, null);
        if (cluster.length < 2) return '';
        const sum = cluster.reduce((s, c) => s + (parseFloat(c.paidAmount) || 0), 0);
        const thisAmt = parseFloat(ch.paidAmount) || 0;
        const others = cluster.filter((c) => c.id !== ch.id);
        if (!others.length) return '';
        const otherDesc = others
            .map((c) => `${t('شيك', 'Cheque')} ${c.chequeNo || '—'}: ${summaryAmtOm(c.paidAmount || c.amount)}`)
            .join(' · ');
        return t(
            `تم دفع هذا الشيك (${summaryAmtOm(thisAmt)}) ضمن دفعة مجمّعة بإجمالي ${summaryAmtOm(sum)} — الباقي وُزّع على: ${otherDesc}`,
            `This cheque (${summaryAmtOm(thisAmt)}) was part of a combined payment of ${summaryAmtOm(sum)} — remainder allocated to: ${otherDesc}`
        );
    }

    function buildAllocationNarrativeHtml(entry, allocDetails) {
        if (!allocDetails.length) return '';
        const lines = allocDetails.map((a) => {
            let ref = escHtml(a.ref || '—');
            if (a.kind === 'invoice') ref = `${t('فاتورة', 'Invoice')} ${ref}`;
            else if (a.kind === 'cheque') ref = `${t('شيك', 'Cheque')} ${ref}`;
            const payStatus =
                (parseFloat(a.remainingAfter) || 0) <= 0.001
                    ? t('مدفوع كامل', 'paid in full')
                    : t('مدفوع جزئي', 'partial payment');
            const note = a.note
                ? escHtml(a.note)
                : escHtml(
                      buildAllocationPaymentNoteLine(
                          { voucherNo: entry.voucherNo, totalAmount: entry.amount, entryId: entry.id, date: entry.dueDate },
                          a,
                          (parseFloat(a.remainingAfter) || 0) <= 0.001 ? 'full' : 'partial'
                      )
                  );
            return `<div>• <strong>${escHtml(summaryAmtOm(a.amount))}</strong> → ${ref} <span style="color:#555">(${payStatus})</span><br><small style="color:#444">${note}</small></div>`;
        }).join('');
        return `<div class="acct-voucher-narrative-box">
            <strong>${t('ملخص الدفعة الأصلية', 'Original payment summary')}</strong><br>
            ${t(`تم استلام مبلغ ${summaryAmtOm(entry.amount)} بسند ${toStr(entry.voucherNo) || '—'} وتوزيعه كالتالي:`, `Amount ${summaryAmtOm(entry.amount)} received on voucher ${toStr(entry.voucherNo) || '—'} was allocated as:`)}
            <div style="margin-top:8px">${lines}</div>
        </div>`;
    }

    function backfillReceiptAllocationNotes(reg) {
        let changed = false;
        (reg.entries || []).forEach((e) => {
            if (toStr(e.type) !== 'income') return;
            const hasAlloc = (e.paymentAllocations || []).some((a) => (parseFloat(a.amount) || 0) > 0);
            if (hasAlloc) return;
            const matching = [];
            const seenReceivableKeys = new Set();
            const receivableKey = (kind, id) => `${kind}|${id}`;
            (reg.cheques || []).forEach((ch) => {
                (ch.actions || []).forEach((act) => {
                    if (toStr(act.actionType) !== 'manual_payment_alloc') return;
                    const amt = parseFloat(act.allocatedAmount) || 0;
                    if (amt <= 0) return;
                    const linkedById = toStr(act.entryId) && toStr(act.entryId) === toStr(e.id);
                    const linkedByVoucher =
                        !linkedById &&
                        toStr(act.voucherNo) &&
                        toStr(act.voucherNo) === toStr(e.voucherNo);
                    const day = toStr(e.dueDate);
                    const linkedByDate =
                        !linkedById &&
                        !linkedByVoucher &&
                        day &&
                        toStr(act.actionDate) === day;
                    if (!linkedById && !linkedByVoucher && !linkedByDate) return;
                    const rk = receivableKey('cheque', ch.id);
                    if (seenReceivableKeys.has(rk)) return;
                    seenReceivableKeys.add(rk);
                    const chTotal = parseFloat(ch.amount) || 0;
                    const chPaid = parseFloat(ch.paidAmount) || 0;
                    matching.push({
                        kind: 'cheque',
                        id: ch.id,
                        ref: ch.chequeNo,
                        allocate: amt,
                        building: ch.building,
                        unit: ch.unit,
                        paidBefore: Math.max(0, chPaid - amt),
                        total: chTotal,
                        remainingAfter: Math.max(0, chTotal - chPaid),
                        note: toStr(act.actionNote)
                    });
                });
            });
            (reg.invoices || []).forEach((inv) => {
                (inv.paymentHistory || []).forEach((h) => {
                    if (toStr(h.entryId) !== toStr(e.id)) return;
                    const amt = parseFloat(h.amount) || 0;
                    if (amt <= 0) return;
                    const rk = receivableKey('invoice', inv.id);
                    if (seenReceivableKeys.has(rk)) return;
                    seenReceivableKeys.add(rk);
                    const invTotal = parseFloat(inv.total) || 0;
                    const invPaid = parseFloat(inv.paidAmount) || 0;
                    matching.push({
                        kind: 'invoice',
                        id: inv.id,
                        ref: inv.invoiceNo || inv.id,
                        allocate: amt,
                        building: inv.building,
                        unit: inv.unit,
                        paidBefore: Math.max(0, invPaid - amt),
                        total: invTotal,
                        remainingAfter: Math.max(0, invTotal - invPaid),
                        note: toStr(h.note)
                    });
                });
            });
            (reg.cheques || []).forEach((ch) => {
                (ch.paymentHistory || []).forEach((h) => {
                    if (toStr(h.entryId) !== toStr(e.id)) return;
                    const amt = parseFloat(h.amount) || 0;
                    if (amt <= 0) return;
                    const rk = receivableKey('cheque', ch.id);
                    if (seenReceivableKeys.has(rk)) return;
                    seenReceivableKeys.add(rk);
                    const chTotal = parseFloat(ch.amount) || 0;
                    const chPaid = parseFloat(ch.paidAmount) || 0;
                    matching.push({
                        kind: 'cheque',
                        id: ch.id,
                        ref: ch.chequeNo,
                        allocate: amt,
                        building: ch.building,
                        unit: ch.unit,
                        paidBefore: Math.max(0, chPaid - amt),
                        total: chTotal,
                        remainingAfter: Math.max(0, chTotal - chPaid),
                        note: toStr(h.note)
                    });
                });
            });
            const sum = matching.reduce((s, x) => s + (parseFloat(x.allocate) || 0), 0);
            if (matching.length && Math.abs(sum - (parseFloat(e.amount) || 0)) < 0.02) {
                e.paymentAllocations = buildPaymentAllocationSnapshotsFromAllocItems(matching, reg);
                changed = true;
            }
        });
        (reg.entries || []).forEach((e) => {
            if (toStr(e.type) !== 'income') return;
            const allocs = (e.paymentAllocations || []).filter((a) => (parseFloat(a.amount) || 0) > 0);
            if (!allocs.length) return;
            const ctx = {
                entryId: e.id,
                voucherNo: e.voucherNo || '—',
                totalAmount: e.amount,
                date: e.dueDate,
                partyName: e.partyName
            };
            allocs.forEach((a) => {
                const snap = resolvePaymentAllocationSnapshot(a, reg);
                const payStatus = (parseFloat(snap.remainingAfter) || 0) <= 0.001 ? 'full' : 'partial';
                const noteLine = buildAllocationPaymentNoteLine(ctx, { ...a, amount: a.amount, ref: a.ref || snap.ref }, payStatus);
                if (toStr(a.note) !== noteLine) {
                    a.note = noteLine;
                    changed = true;
                }
                if (a.kind === 'cheque' && a.id) {
                    const ch = (reg.cheques || []).find((c) => c.id === a.id);
                    if (ch) {
                        const hasHist = (ch.paymentHistory || []).some((h) => h.entryId === e.id);
                        if (!hasHist) {
                            appendReceivablePaymentHistoryRecord(ch, ctx, { ...a, ref: a.ref || ch.chequeNo }, payStatus, noteLine);
                            changed = true;
                        }
                    }
                }
                if (a.kind === 'invoice' && a.id) {
                    const inv = (reg.invoices || []).find((i) => i.id === a.id);
                    if (inv) {
                        const hasHist = (inv.paymentHistory || []).some((h) => h.entryId === e.id);
                        if (!hasHist) {
                            appendReceivablePaymentHistoryRecord(inv, ctx, { ...a, ref: inv.invoiceNo || a.ref }, payStatus, noteLine);
                            changed = true;
                        }
                    }
                }
            });
        });
        return changed;
    }

    function ensureReceiptAllocationNotesBackfill(reg) {
        reg.settings = reg.settings || defaultAccountingSettings();
        if (reg.settings.allocationNotesBackfillV5) return false;
        const changed = backfillReceiptAllocationNotes(reg);
        reg.settings.allocationNotesBackfillV5 = true;
        reg.settings.allocationNotesBackfillV4 = true;
        reg.settings.allocationNotesBackfillV3 = true;
        reg.settings.allocationNotesBackfillV2 = true;
        return changed || true;
    }

    function buildAllocationPaymentNoteLine(entryCtx, alloc, payStatus) {
        const total = summaryAmtOm(entryCtx.totalAmount);
        const part = summaryAmtOm(alloc.amount);
        const ref = toStr(alloc.ref) || '—';
        const kindLbl =
            alloc.kind === 'invoice' ? t('فاتورة', 'Invoice') : alloc.kind === 'cheque' ? t('شيك', 'Cheque') : t('بند', 'Item');
        const statusLbl =
            payStatus === 'full' || payStatus === 'paid'
                ? t('مدفوع كامل', 'Paid in full')
                : t('مدفوع جزئي', 'Partial payment');
        return t(
            `سند ${entryCtx.voucherNo}: استُلم ${total} — دُفع ${part} على ${kindLbl} ${ref} (${statusLbl})`,
            `Voucher ${entryCtx.voucherNo}: received ${total} — paid ${part} to ${kindLbl} ${ref} (${statusLbl})`
        );
    }

    function appendReceivablePaymentHistoryRecord(item, entryCtx, allocMeta, payStatus, noteLine) {
        if (!item) return;
        if (!Array.isArray(item.paymentHistory)) item.paymentHistory = [];
        item.paymentHistory.push({
            at: new Date().toISOString(),
            entryId: entryCtx.entryId,
            voucherNo: entryCtx.voucherNo,
            date: entryCtx.date,
            receiptTotal: parseFloat(entryCtx.totalAmount) || 0,
            amount: parseFloat(allocMeta.amount) || 0,
            payStatus,
            kind: allocMeta.kind,
            ref: allocMeta.ref,
            note: noteLine
        });
        const prev = toStr(item.paymentNote);
        item.paymentNote = prev ? `${prev}\n${noteLine}` : noteLine;
    }

    function getUnitIncomeReceiptEntries(building, unit) {
        const b = toStr(building);
        const u = toStr(unit);
        const uk = accountingUnitKey(b, u);
        return (loadAccountingRegistry().entries || [])
            .filter((e) => {
                if (toStr(e.type) !== 'income') return false;
                if (!['confirmed', 'invoiced'].includes(toStr(e.status))) return false;
                if (e.unitKey === uk) return true;
                return (e.paymentAllocations || []).some(
                    (a) => toStr(a.building) === b && toStr(a.unit) === u && (parseFloat(a.amount) || 0) > 0
                );
            })
            .sort((a, b) => toStr(b.dueDate || b.updatedAt).localeCompare(toStr(a.dueDate || a.updatedAt)));
    }

    function buildPaymentAllocationSnapshotsFromAllocItems(allocItems, reg) {
        return allocItems.map((x) => {
            const amt = parseFloat(x.allocate) || 0;
            const base = { kind: x.kind, id: x.id, ref: x.ref, amount: amt, building: x.building, unit: x.unit };
            if (x.kind === 'invoice') {
                const inv = (reg.invoices || []).find((i) => i.id === x.id);
                if (inv) {
                    const total = x.total != null ? parseFloat(x.total) || 0 : parseFloat(inv.total) || 0;
                    const paidNow = parseFloat(inv.paidAmount) || 0;
                    const paidBefore = x.paidBefore != null ? parseFloat(x.paidBefore) || 0 : paidNow;
                    const remainingAfter =
                        x.remainingAfter != null
                            ? parseFloat(x.remainingAfter) || 0
                            : Math.max(0, total - paidNow - amt);
                    return {
                        ...base,
                        total,
                        paidBefore,
                        remainingAfter,
                        note: toStr(x.note || inv.note || inv.paymentNote)
                    };
                }
            }
            if (x.kind === 'cheque') {
                const ch = (reg.cheques || []).find((c) => c.id === x.id);
                if (ch) {
                    const total = x.total != null ? parseFloat(x.total) || 0 : parseFloat(ch.amount) || 0;
                    const paidNow = parseFloat(ch.paidAmount) || 0;
                    const paidBefore =
                        x.paidBefore != null ? parseFloat(x.paidBefore) || 0 : paidNow;
                    const remainingAfter =
                        x.remainingAfter != null
                            ? parseFloat(x.remainingAfter) || 0
                            : Math.max(0, total - paidBefore - amt);
                    return {
                        ...base,
                        total,
                        paidBefore,
                        remainingAfter,
                        note: toStr(x.note || ch.note || ch.agreementNo)
                    };
                }
            }
            return {
                ...base,
                total: parseFloat(x.outstanding) || amt,
                paidBefore: 0,
                remainingAfter: Math.max(0, (parseFloat(x.outstanding) || amt) - amt),
                note: toStr(x.note)
            };
        });
    }

    function resolvePaymentAllocationSnapshot(alloc, reg) {
        const amt = parseFloat(alloc.amount) || parseFloat(alloc.allocate) || 0;
        const base = {
            kind: alloc.kind,
            id: alloc.id,
            ref: alloc.ref,
            amount: amt,
            building: alloc.building,
            unit: alloc.unit
        };
        if (alloc.total != null && alloc.paidBefore != null) {
            return {
                ...base,
                total: parseFloat(alloc.total) || 0,
                paidBefore: parseFloat(alloc.paidBefore) || 0,
                remainingAfter: parseFloat(alloc.remainingAfter ?? alloc.remaining) || 0,
                note: toStr(alloc.note)
            };
        }
        if (alloc.kind === 'invoice') {
            const inv = (reg.invoices || []).find((i) => i.id === alloc.id);
            if (inv) {
                const total = parseFloat(inv.total) || 0;
                const paidNow = parseFloat(inv.paidAmount) || 0;
                const paidBefore = Math.max(0, paidNow - amt);
                const remainingAfter = Math.max(0, total - paidNow);
                return { ...base, total, paidBefore, remainingAfter, note: toStr(inv.note || inv.paymentNote || inv.description) };
            }
        }
        if (alloc.kind === 'cheque') {
            const ch = (reg.cheques || []).find((c) => c.id === alloc.id);
            if (ch) {
                const total = parseFloat(ch.amount) || 0;
                const paidNow = parseFloat(ch.paidAmount) || 0;
                const paidBefore = Math.max(0, paidNow - amt);
                const remainingAfter = Math.max(0, total - paidNow);
                return { ...base, total, paidBefore, remainingAfter, note: toStr(ch.note || ch.agreementNo || ch.tenant) };
            }
        }
        return { ...base, total: amt, paidBefore: 0, remainingAfter: 0, note: '' };
    }

    function getIncomeLedgerRowAmounts(row, reg) {
        if (row.source === 'cheque') {
            const ch = row.data;
            const total = parseFloat(ch.amount) || 0;
            const paid = parseFloat(ch.paidAmount || ch.amount) || 0;
            return { paid, remaining: Math.max(0, total - paid), total };
        }
        const e = row.data;
        const paid = parseFloat(e.amount) || 0;
        const allocs = e.paymentAllocations || [];
        if (!allocs.length) return { paid, remaining: 0, total: paid };
        const remaining = allocs.reduce((s, a) => {
            if (a.remainingAfter != null) return s + (parseFloat(a.remainingAfter) || 0);
            const snap = resolvePaymentAllocationSnapshot(a, reg);
            return s + (parseFloat(snap.remainingAfter) || 0);
        }, 0);
        return { paid, remaining, total: paid };
    }

    function normalizePrintDocumentTitle(title) {
        if (title && typeof title === 'object' && !Array.isArray(title)) {
            return { ar: toStr(title.ar) || toStr(title.en), en: toStr(title.en) || toStr(title.ar) };
        }
        const s = toStr(title);
        return { ar: s, en: s };
    }

    function getAccountingVoucherPrintStylesCss() {
        return `
            .acct-voucher-print-root .property-section-h,
            .acct-voucher-print-root .section-header.property-section-h {
                margin: 8px 0 6px;
                padding: 4px 8px;
                font-size: 10pt;
            }
            .acct-voucher-print-root .info-table.property-report-table th,
            .acct-voucher-print-root .info-table.property-report-table td {
                font-size: 9.5pt;
                padding: 4px 6px;
                line-height: 1.35;
            }
            .acct-voucher-print-root .property-report-table thead th {
                font-size: 9pt;
                padding: 4px 5px;
            }
            .acct-voucher-amount-box {
                margin: 8px auto 10px;
                max-width: 340px;
                padding: 8px 12px;
                border: 1.5px solid var(--doc-accent);
                border-radius: 8px;
                background: var(--doc-soft-bg);
                text-align: center;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .acct-voucher-amount-box small { display: block; font-size: 9pt; color: #555; margin-bottom: 2px; }
            .acct-voucher-amount-box strong { font-size: 14pt; color: var(--doc-accent-dark); font-weight: 800; }
            .acct-voucher-narrative-box {
                margin: 8px 0 10px;
                padding: 8px 10px;
                border: 1px solid #c8d6e0;
                border-radius: 6px;
                background: #f7fafc;
                font-size: 9.5pt;
                line-height: 1.45;
                text-align: right;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .acct-voucher-narrative-box strong { color: var(--doc-accent-dark); }
            .acct-voucher-parent-banner {
                margin-bottom: 8px;
                padding: 6px 10px;
                border-right: 3px solid var(--doc-accent);
                background: #eef6ff;
                font-size: 9.5pt;
                line-height: 1.45;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .acct-voucher-note-panel {
                margin: 0 0 10px;
                width: 100%;
                border: 1px solid #c8d6e0;
                border-radius: 6px;
                overflow: hidden;
                background: #f7fafc;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .acct-voucher-note-panel-table {
                margin: 0 !important;
                width: 100%;
                table-layout: fixed;
            }
            .acct-voucher-note-panel-table th {
                width: 26%;
                vertical-align: top;
                white-space: normal;
                background: #eef4f8;
            }
            .acct-voucher-note-panel-table td {
                width: 74%;
                white-space: normal;
                word-break: break-word;
                line-height: 1.4;
                font-size: 9.5pt;
            }
            .acct-voucher-print-table th { width: 20%; text-align: right; font-size: 9pt; }
            .acct-voucher-print-table td { text-align: right; font-size: 9.5pt; }
            .acct-voucher-journal { margin-top: 8px; font-size: 9pt; }
            .acct-voucher-journal .property-report-table th,
            .acct-voucher-journal .property-report-table td { font-size: 9pt; padding: 3px 5px; }
        `;
    }

    function wrapAccountingVoucherPrintBody(html) {
        return `<div class="acct-voucher-print-root">${html}</div>`;
    }

    function buildAccountingEntryVoucherNotePanelHtml(entry, allocDetails) {
        const rows = [
            [
                t('إجمالي الدفعة', 'Payment total'),
                `${summaryAmtOm(entry.amount)} — ${t('سند', 'Voucher')} ${toStr(entry.voucherNo) || '—'}`
            ]
        ];
        allocDetails.forEach((a) => {
            let ref = a.ref || '—';
            if (a.kind === 'invoice') ref = `${t('فاتورة', 'Invoice')} ${ref}`;
            else if (a.kind === 'cheque') ref = `${t('شيك', 'Cheque')} ${ref}`;
            const payStatus =
                (parseFloat(a.remainingAfter) || 0) <= 0.001
                    ? t('مدفوع كامل', 'Paid in full')
                    : t('مدفوع جزئي', 'Partial payment');
            rows.push([ref, `${summaryAmtOm(a.amount)} (${payStatus})`]);
        });
        const allocTotal = allocDetails.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
        const unallocated = Math.max(0, (parseFloat(entry.amount) || 0) - allocTotal);
        if (unallocated > 0) {
            rows.push([t('غير موزّع', 'Unallocated'), summaryAmtOm(unallocated)]);
        }
        appendAccountingEntryMetaNoteRows(rows, entry);
        return buildAccountingNotePanelHtml(rows);
    }

    function buildAccountingEntryVoucherPrintHtml(entry) {
        const reg = loadAccountingRegistry();
        const isIncome = toStr(entry.type) === 'income';
        const bank = entry.bankAccountId ? getBankAccountById(entry.bankAccountId) : null;
        const bankLbl = bank ? bankAccountLabel(bank) : t('—', '—');
        const coaLbl = entry.coaAccountId ? coaAccountLabel(coaAccountById(entry.coaAccountId)) : '—';
        const counterLbl = entry.counterCoaAccountId ? coaAccountLabel(coaAccountById(entry.counterCoaAccountId)) : '—';
        const dateLbl = formatAccountingDisplayDate(entry.dueDate) || toStr(entry.dueDate) || '—';
        const voucherNo = toStr(entry.voucherNo) || '—';
        const referenceNo = toStr(entry.referenceNo) || '—';
        const description = toStr(entry.title) || (isIncome ? t('سند قبض', 'Receipt voucher') : t('سند صرف', 'Payment voucher'));
        const partyLbl = isIncome ? t('العميل', 'Client') : t('المورد / الجهة', 'Vendor / party');
        const amountLbl = isIncome ? t('المبلغ المستلم', 'Amount received') : t('المبلغ المدفوع', 'Amount paid');
        const allocs = (entry.paymentAllocations || []).filter((a) => (parseFloat(a.amount) || 0) > 0);
        const allocDetails = allocs.map((a) => resolvePaymentAllocationSnapshot(a, reg));
        const allocTotal = allocDetails.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
        const unallocated = Math.max(0, (parseFloat(entry.amount) || 0) - allocTotal);
        const allocRows = allocDetails.length
            ? allocDetails
                .map((a, i) => {
                    let itemTitle = escHtml(a.ref || '—');
                    if (a.kind === 'invoice') itemTitle = `${t('فاتورة', 'Invoice')} ${itemTitle}`;
                    else if (a.kind === 'cheque') itemTitle = `${t('شيك', 'Cheque')} ${itemTitle}`;
                    const loc = a.building && a.unit ? `${escHtml(a.building)} — ${escHtml(a.unit)}` : '—';
                    return `<tr>
                    <td class="print-num">${i + 1}</td>
                    <td>${itemTitle}</td>
                    <td>${loc}</td>
                    <td>${escHtml(summaryAmtOm(a.total))}</td>
                    <td>${escHtml(summaryAmtOm(a.paidBefore))}</td>
                    <td><strong>${escHtml(summaryAmtOm(a.amount))}</strong></td>
                    <td class="${(parseFloat(a.remainingAfter) || 0) > 0 ? 'acct-ledger-amt-remaining' : ''}">${escHtml(summaryAmtOm(a.remainingAfter))}</td>
                </tr>`;
                })
                .join('')
            : '';
        const allocSection = allocRows
            ? `<div class="section-header property-section-h">${t('تفصيل الدفعة على الفواتير والشيكات', 'Payment breakdown by invoice / cheque')}</div>
            <table class="info-table property-report-table print-zebra acct-voucher-print-table" style="margin-bottom:14px">
                <thead><tr>
                    <th class="print-num">#</th>
                    <th>${t('الفاتورة / المرجع', 'Invoice / reference')}</th>
                    <th>${t('العقار', 'Property')}</th>
                    <th>${t('الإجمالي', 'Total')}</th>
                    <th>${t('مدفوع سابقاً', 'Previously paid')}</th>
                    <th>${t('هذه الدفعة', 'This payment')}</th>
                    <th>${t('المتبقي', 'Remaining')}</th>
                </tr></thead>
                <tbody>${allocRows}</tbody>
                <tfoot>
                <tr>
                    <td colspan="5" style="font-weight:700;text-align:left">${t('إجمالي الموزّع على الفواتير', 'Total allocated')}</td>
                    <td style="font-weight:700">${escHtml(summaryAmtOm(allocTotal))}</td>
                    <td></td>
                </tr>
                ${unallocated > 0 ? `<tr>
                    <td colspan="5" style="font-weight:700;text-align:left;color:#c62828">${t('مبلغ غير موزّع', 'Unallocated amount')}</td>
                    <td style="font-weight:700;color:#c62828">${escHtml(summaryAmtOm(unallocated))}</td>
                    <td></td>
                </tr>` : ''}
                </tfoot>
            </table>`
            : '';
        const propertyRow =
            entry.building && entry.unit
                ? `<tr>
                    <th>${t('العقار', 'Property')}</th>
                    <td colspan="3">${escHtml(entry.building)} — ${escHtml(entry.unit)}</td>
                </tr>`
                : '';
        return `
            <div class="section-header property-section-h">${t('بيانات السند / Voucher details', 'Voucher details / بيانات السند')}</div>
            <table class="info-table property-report-table print-zebra-cells acct-voucher-print-table" style="margin-bottom:14px">
                <tbody>
                    <tr>
                        <th>${t('رقم السند', 'Voucher no.')}</th>
                        <td><strong>${escHtml(voucherNo)}</strong></td>
                        <th>${t('التاريخ', 'Date')}</th>
                        <td>${escHtml(dateLbl)}</td>
                    </tr>
                    <tr>
                        <th>${t('المرجع', 'Reference')}</th>
                        <td>${escHtml(referenceNo)}</td>
                        <th>${t('الحالة', 'Status')}</th>
                        <td>${escHtml(accountingEntryStatusLabel(entry.status))}</td>
                    </tr>
                </tbody>
            </table>
            <div class="section-header property-section-h">${t('بيانات الدفع / Payment details', 'Payment details / بيانات الدفع')}</div>
            <table class="info-table property-report-table print-zebra-cells acct-voucher-print-table" style="margin-bottom:10px">
                <tbody>
                    <tr>
                        <th>${partyLbl}</th>
                        <td colspan="3"><strong>${escHtml(entry.partyName || '—')}</strong></td>
                    </tr>
                    <tr>
                        <th>${t('تم الدفع من خلال', 'Paid through')}</th>
                        <td>${escHtml(bankLbl)}</td>
                        <th>${t('عملة الدفع', 'Currency')}</th>
                        <td>${t('ر.ع. OMR', 'OMR')}</td>
                    </tr>
                    ${propertyRow}
                    <tr>
                        <th>${t('الوصف', 'Description')}</th>
                        <td colspan="3">${escHtml(description)}</td>
                    </tr>
                    ${entry.paymentNote ? `<tr><th>${t('ملاحظة الدفع', 'Payment note')}</th><td colspan="3">${escHtml(entry.paymentNote)}</td></tr>` : ''}
                </tbody>
            </table>
            <div class="acct-voucher-amount-box">
                <small>${amountLbl}</small>
                <strong>${escHtml(summaryAmtOm(entry.amount))}</strong>
            </div>
            ${allocSection}
            ${buildAccountingEntryVoucherNotePanelHtml(entry, allocDetails)}
            <p class="property-muted" style="margin-top:6px;text-align:center;font-size:10pt">${t('حساب الإيراد/المصروف', 'Revenue / expense')}: ${escHtml(coaLbl)} · ${t('الحساب المقابل', 'Counter')}: ${escHtml(counterLbl)}</p>`;
    }

    function buildAccountingChequeReceiptPrintHtml(ch) {
        const reg = loadAccountingRegistry();
        const parent = findParentReceiptAllocationForChequeExtended(ch.id, reg);
        const clientName = resolveAccountingChequeClientName(ch, parent?.entry);
        const propertyLbl = resolveAccountingChequePropertyLabel(ch);
        const total = parseFloat(ch.amount) || 0;
        const paid = parseFloat(ch.paidAmount || ch.amount) || 0;
        const remaining = Math.max(0, total - paid);
        const dateLbl = formatAccountingDisplayDate(ch.lastActionDate || ch.dueDate) || toStr(ch.lastActionDate || ch.dueDate) || '—';
        const statusLbl = accountingChequeStatusLabel(ch.status);
        const propertyRow = propertyLbl !== '—'
            ? `<tr><th>${t('العقار', 'Property')}</th><td colspan="3"><strong>${escHtml(propertyLbl)}</strong></td></tr>`
            : '';
        let notePanelHtml = '';
        let thisPayment = paid;
        let paidBefore = 0;
        if (parent) {
            const e = parent.entry;
            const snap = resolvePaymentAllocationSnapshot(parent.alloc, reg);
            thisPayment = parseFloat(snap.amount) || paid;
            paidBefore = parseFloat(snap.paidBefore) || 0;
            notePanelHtml = buildAccountingChequeReceiptNotePanelHtml(parent, ch, reg, '');
        } else {
            const payHist = ch.paymentHistory || [];
            const lastHist = payHist.length ? payHist[payHist.length - 1] : null;
            let fallbackNote = '';
            if (lastHist?.note) fallbackNote = lastHist.note;
            else if (ch.paymentNote) fallbackNote = toStr(ch.paymentNote).split('\n').pop();
            notePanelHtml = buildAccountingChequeReceiptNotePanelHtml(null, ch, reg, fallbackNote);
        }
        const breakdownRow = `<tr>
            <td class="print-num">1</td>
            <td>${t('شيك', 'Cheque')} ${escHtml(ch.chequeNo || '—')}</td>
            <td>${escHtml(propertyLbl)}</td>
            <td>${escHtml(summaryAmtOm(total))}</td>
            <td>${escHtml(summaryAmtOm(paidBefore))}</td>
            <td><strong>${escHtml(summaryAmtOm(thisPayment))}</strong></td>
            <td class="${remaining > 0 ? 'acct-ledger-amt-remaining' : ''}">${escHtml(summaryAmtOm(remaining))}</td>
        </tr>`;
        return `
            <div class="section-header property-section-h">${t('بيانات الإيصال', 'Receipt details')}</div>
            <table class="info-table property-report-table print-zebra-cells acct-voucher-print-table" style="margin-bottom:14px">
                <tbody>
                    <tr>
                        <th>${t('رقم الشيك', 'Cheque no.')}</th>
                        <td><strong>${escHtml(ch.chequeNo || '—')}</strong></td>
                        <th>${t('التاريخ', 'Date')}</th>
                        <td>${escHtml(dateLbl)}</td>
                    </tr>
                    <tr>
                        <th>${t('العميل', 'Client')}</th>
                        <td colspan="3"><strong>${escHtml(clientName)}</strong></td>
                    </tr>
                    ${propertyRow}
                    <tr>
                        <th>${t('الحالة', 'Status')}</th>
                        <td>${escHtml(statusLbl)}</td>
                        <th>${t('عقد الإيجار', 'Lease')}</th>
                        <td>${escHtml(ch.agreementNo || '—')}</td>
                    </tr>
                    ${parent ? `<tr>
                        <th>${t('سند القبض', 'Receipt voucher')}</th>
                        <td><strong>${escHtml(parent.entry.voucherNo || '—')}</strong></td>
                        <th>${t('إجمالي الدفعة', 'Payment total')}</th>
                        <td><strong>${escHtml(summaryAmtOm(parent.entry.amount))}</strong></td>
                    </tr>` : ''}
                    ${parent && toStr(parent.entry.title).trim() ? `<tr><th>${t('الوصف', 'Description')}</th><td colspan="3">${escHtml(parent.entry.title)}</td></tr>` : ''}
                </tbody>
            </table>
            <div class="acct-voucher-amount-box">
                <small>${parent ? t('مبلغ هذه الدفعة على الشيك', 'Amount from receipt for this cheque') : t('المبلغ المستلم', 'Amount received')}</small>
                <strong>${escHtml(summaryAmtOm(thisPayment))}</strong>
                ${parent ? `<div style="font-size:10pt;margin-top:6px;color:#555">${t('إجمالي السند الأصلي', 'Parent voucher total')}: ${escHtml(summaryAmtOm(parent.entry.amount))}</div>` : ''}
            </div>
            <div class="section-header property-section-h">${t('تفصيل الدفعة', 'Payment breakdown')}</div>
            <table class="info-table property-report-table print-zebra acct-voucher-print-table" style="margin-bottom:14px">
                <thead><tr>
                    <th class="print-num">#</th>
                    <th>${t('المرجع', 'Reference')}</th>
                    <th>${t('العقار', 'Property')}</th>
                    <th>${t('الإجمالي', 'Total')}</th>
                    <th>${t('مدفوع سابقاً', 'Previously paid')}</th>
                    <th>${t('هذه الدفعة', 'This payment')}</th>
                    <th>${t('المتبقي', 'Remaining')}</th>
                </tr></thead>
                <tbody>${breakdownRow}</tbody>
            </table>
            ${notePanelHtml}`;
    }

    function buildAccountingDepositReceiptPrintHtml(deposits, payloadOpt) {
        const list = Array.isArray(deposits) ? deposits.filter(Boolean) : [];
        if (!list.length) return '';
        const first = list[0];
        const payload = payloadOpt || getSavedContractPayloadForUnit({ building: first.building, unit: first.unit }) || {};
        const tenant = first.tenant || payload.tenantNameAr || payload.tenantName || '—';
        const agreementNo = first.agreementNo || payload.agreementNo || '—';
        const total = list.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
        const confirmMeta = getAccountingDepositReceiptConfirmationMeta(list[0]);
        const rows = list
            .map((d, i) => {
                const typeLbl =
                    d.type === 'security' ? t('ضمان', 'Security') : d.type === 'insurance' ? t('تأمين', 'Insurance') : d.type;
                const metaD = getAccountingDepositReceiptConfirmationMeta(d);
                return `<tr>
                    <td class="print-num">${i + 1}</td>
                    <td>${escHtml(typeLbl)}</td>
                    <td>${escHtml(d.reference || '—')}</td>
                    <td><strong>${escHtml(summaryAmtOm(d.amount))}</strong></td>
                    <td>${escHtml(formatAccountingDisplayDate(metaD.at))}</td>
                    <td>${escHtml(metaD.by || '—')}</td>
                </tr>`;
            })
            .join('');
        const notes = list
            .map((d) => getAccountingDepositReceiptConfirmationMeta(d).note)
            .filter(Boolean)
            .join(' · ');
        return `
            <div class="section-header property-section-h">${t('إيصال استلام ضمان / Deposit receipt', 'Deposit receipt / إيصال استلام ضمان')}</div>
            <table class="info-table property-report-table print-zebra-cells acct-voucher-print-table" style="margin-bottom:14px">
                <tbody>
                    <tr>
                        <th>${t('العقار', 'Property')}</th>
                        <td colspan="3"><strong>${escHtml(first.building)} — ${escHtml(first.unit)}</strong></td>
                    </tr>
                    <tr>
                        <th>${t('المستأجر', 'Tenant')}</th>
                        <td colspan="3"><strong>${escHtml(tenant)}</strong></td>
                    </tr>
                    <tr>
                        <th>${t('عقد الإيجار', 'Lease')}</th>
                        <td>${escHtml(agreementNo)}</td>
                        <th>${t('تاريخ الاعتماد', 'Approval date')}</th>
                        <td>${escHtml(formatAccountingDisplayDate(confirmMeta.at))}</td>
                    </tr>
                    <tr>
                        <th>${t('اعتمد بواسطة', 'Approved by')}</th>
                        <td colspan="3">${escHtml(confirmMeta.by || '—')}</td>
                    </tr>
                    ${notes ? `<tr><th>${t('ملاحظات الاعتماد', 'Approval notes')}</th><td colspan="3">${escHtml(notes)}</td></tr>` : ''}
                </tbody>
            </table>
            <div class="section-header property-section-h">${t('تفاصيل الضمان / Deposit lines', 'Deposit lines / تفاصيل الضمان')}</div>
            <table class="info-table property-report-table print-zebra acct-voucher-print-table" style="margin-bottom:14px">
                <thead><tr>
                    <th class="print-num">#</th>
                    <th>${t('النوع', 'Type')}</th>
                    <th>${t('مرجع الإيصال', 'Receipt ref.')}</th>
                    <th>${t('المبلغ', 'Amount')}</th>
                    <th>${t('تاريخ الاستلام', 'Receipt date')}</th>
                    <th>${t('المعتمد', 'Approver')}</th>
                </tr></thead>
                <tbody>${rows}</tbody>
                <tfoot><tr>
                    <td colspan="3" style="font-weight:700;text-align:left">${t('الإجمالي', 'Total')}</td>
                    <td style="font-weight:700">${escHtml(summaryAmtOm(total))}</td>
                    <td colspan="2"></td>
                </tr></tfoot>
            </table>
            <p class="property-muted" style="margin-top:6px;text-align:center;font-size:10pt;line-height:1.55">${t('يُقرّ باستلام مبالغ الضمان أعلاه فعلياً واعتمادها محاسبياً كوديعة محتجزة.', 'The above deposit amounts are confirmed as physically received and approved for accounting hold.')}</p>`;
    }

    function buildAccountingContractChequesReceiptReportPrintHtml(cheques, payloadOpt) {
        const list = Array.isArray(cheques) ? cheques.slice() : [];
        if (!list.length) return '';
        list.sort((a, b) => toStr(a.dueDate).localeCompare(toStr(b.dueDate)) || toStr(a.chequeNo).localeCompare(toStr(b.chequeNo)));
        const first = list[0];
        const payload = payloadOpt || getSavedContractPayloadForUnit({ building: first.building, unit: first.unit }) || {};
        const tenant = first.tenant || payload.tenantNameAr || payload.tenantName || '—';
        const agreementNo = first.agreementNo || payload.agreementNo || '—';
        const total = list.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
        const rows = list
            .map((c, i) => {
                const srcLbl = c.sourceType === 'vat' ? t('ضريبة', 'VAT') : t('إيجار', 'Rent');
                const meta = getAccountingChequeReceiptConfirmationMeta(c);
                const confirmLbl = meta.at
                    ? `${formatAccountingDisplayDate(meta.at)}${meta.by ? ` — ${meta.by}` : ''}`
                    : t('معتمد سابقاً', 'Previously approved');
                return `<tr>
                    <td class="print-num">${i + 1}</td>
                    <td>${escHtml(srcLbl)}</td>
                    <td>${escHtml(c.chequeNo || '—')}</td>
                    <td>${escHtml(c.dueDate || '—')}</td>
                    <td>${escHtml(summaryAmtOm(c.amount))}</td>
                    <td>${escHtml(confirmLbl)}</td>
                    <td>${escHtml(meta.note || '—')}</td>
                    <td>${escHtml(accountingChequeStatusLabel(c.status))}</td>
                </tr>`;
            })
            .join('');
        return `
            <div class="section-header property-section-h">${t('كشف الشيكات — تأكيد الاستلام / Cheques receipt confirmation', 'Cheques receipt confirmation / كشف الشيكات')}</div>
            <table class="info-table property-report-table print-zebra-cells acct-voucher-print-table" style="margin-bottom:14px">
                <tbody>
                    <tr>
                        <th>${t('العقار', 'Property')}</th>
                        <td colspan="3"><strong>${escHtml(first.building)} — ${escHtml(first.unit)}</strong></td>
                    </tr>
                    <tr>
                        <th>${t('المستأجر', 'Tenant')}</th>
                        <td colspan="3"><strong>${escHtml(tenant)}</strong></td>
                    </tr>
                    <tr>
                        <th>${t('عقد الإيجار', 'Lease')}</th>
                        <td>${escHtml(agreementNo)}</td>
                        <th>${t('عدد الشيكات', 'Cheques')}</th>
                        <td>${list.length}</td>
                    </tr>
                </tbody>
            </table>
            <table class="info-table property-report-table print-zebra acct-voucher-print-table" style="margin-bottom:14px">
                <thead><tr>
                    <th class="print-num">#</th>
                    <th>${t('النوع', 'Type')}</th>
                    <th>${t('رقم الشيك', 'Cheque no.')}</th>
                    <th>${t('الاستحقاق', 'Due')}</th>
                    <th>${t('المبلغ', 'Amount')}</th>
                    <th>${t('تأكيد الاستلام', 'Receipt confirmed')}</th>
                    <th>${t('ملاحظات', 'Notes')}</th>
                    <th>${t('حالة التحصيل', 'Collection status')}</th>
                </tr></thead>
                <tbody>${rows}</tbody>
                <tfoot><tr>
                    <td colspan="4" style="font-weight:700;text-align:left">${t('الإجمالي', 'Total')}</td>
                    <td style="font-weight:700">${escHtml(summaryAmtOm(total))}</td>
                    <td colspan="3"></td>
                </tr></tfoot>
            </table>
            <p class="property-muted" style="margin-top:6px;text-align:center;font-size:10pt;line-height:1.55">${t('يُقرّ باستلام الشيكات أعلاه والتحقق من سلامتها ومطابقتها لبيانات العقد.', 'The above cheques are confirmed as received and verified against contract data.')}</p>`;
    }

    function printAccountingDepositReceipt(depositId) {
        const reg = loadAccountingRegistry();
        const dep = (reg.deposits || []).find((d) => d.id === depositId);
        if (!dep || !isAccountingDepositReceiptConfirmed(dep)) {
            alert(t('لا يوجد ضمان معتمد الاستلام للطباعة.', 'No deposit with confirmed receipt to print.'));
            return;
        }
        printAccountingDepositReceiptForUnit(dep.building, dep.unit, [dep.id]);
    }

    function printAccountingDepositReceiptForUnit(building, unit, depositIdsOpt) {
        try {
            let deps = getAccountingDepositsForContractReceiptPrint(building, unit);
            if (depositIdsOpt && depositIdsOpt.length) {
                const idSet = new Set(depositIdsOpt);
                deps = deps.filter((d) => idSet.has(d.id));
            }
            if (!deps.length) {
                alert(t('لا يوجد ضمان معتمد الاستلام للطباعة.', 'No deposit with confirmed receipt to print.'));
                return;
            }
            const payload = getSavedContractPayloadForUnit({ building, unit });
            const title = { ar: 'إيصال استلام ضمان', en: 'Deposit receipt' };
            const body = wrapAccountingVoucherPrintBody(buildAccountingDepositReceiptPrintHtml(deps, payload));
            printWithSiteStandard(title, body, { extraStyles: getAccountingVoucherPrintStylesCss() });
        } catch (e) {
            console.error('printAccountingDepositReceiptForUnit', e);
            alert(t(`تعذرت الطباعة: ${toStr(e && e.message) || 'خطأ'}`, `Print failed: ${toStr(e && e.message) || 'error'}`));
        }
    }

    function printAccountingContractChequesReceiptReport(building, unit) {
        try {
            const cheques = getAccountingChequesForContractReceiptPrint(building, unit);
            if (!cheques.length) {
                alert(
                    t(
                        'لا توجد شيكات معتمدة الاستلام للطباعة. اعتمد استلام الشيكات من المحاسبة أولاً.',
                        'No cheques with confirmed receipt to print. Approve cheque receipt in accounting first.'
                    )
                );
                return;
            }
            const payload = getSavedContractPayloadForUnit({ building, unit });
            const title = { ar: 'كشف الشيكات — تأكيد الاستلام', en: 'Cheques receipt confirmation' };
            const body = wrapAccountingVoucherPrintBody(buildAccountingContractChequesReceiptReportPrintHtml(cheques, payload));
            printWithSiteStandard(title, body, {
                orientation: 'landscape',
                extraStyles: getAccountingVoucherPrintStylesCss()
            });
        } catch (e) {
            console.error('printAccountingContractChequesReceiptReport', e);
            alert(t(`تعذرت الطباعة: ${toStr(e && e.message) || 'خطأ'}`, `Print failed: ${toStr(e && e.message) || 'error'}`));
        }
    }

    function printAccountingChequeReceipt(chequeId) {
        try {
            const reg = loadAccountingRegistry();
            const ch = (reg.cheques || []).find((x) => x.id === chequeId);
            if (!ch) {
                alert(t('الشيك غير موجود.', 'Cheque not found.'));
                return;
            }
            const parent = findParentReceiptAllocationForCheque(chequeId, reg);
            const title = parent
                ? {
                      ar: `إيصال شيك — ${toStr(ch.chequeNo) || ''} (من سند ${toStr(parent.entry.voucherNo) || ''})`,
                      en: `Cheque receipt — ${toStr(ch.chequeNo) || ''} (from ${toStr(parent.entry.voucherNo) || ''})`
                  }
                : { ar: 'إيصال قبض — شيك', en: 'Cheque receipt' };
            const body = wrapAccountingVoucherPrintBody(buildAccountingChequeReceiptPrintHtml(ch));
            printWithSiteStandard(title, body, { extraStyles: getAccountingVoucherPrintStylesCss() });
        } catch (e) {
            console.error('printAccountingChequeReceipt', e);
            alert(
                t(
                    `تعذرت الطباعة: ${toStr(e && e.message) || 'خطأ غير معروف'}`,
                    `Print failed: ${toStr(e && e.message) || 'unknown error'}`
                )
            );
        }
    }

    let _accountingReceiptDetailState = { kind: '', id: '' };

    function buildAccountingReceiptDetailBodyHtml(kind, id) {
        const reg = loadAccountingRegistry();
        if (kind === 'entry') {
            const e = reg.entries.find((x) => x.id === id);
            if (!e) return '';
            const bank = e.bankAccountId ? getBankAccountById(e.bankAccountId) : null;
            const allocDetails = (e.paymentAllocations || [])
                .filter((a) => (parseFloat(a.amount) || 0) > 0)
                .map((a) => resolvePaymentAllocationSnapshot(a, reg));
            const allocTotal = allocDetails.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
            const unallocated = Math.max(0, (parseFloat(e.amount) || 0) - allocTotal);
            const isPendingEdit = accountingEntryHasPendingRequest(e) && toStr(e.pendingRequest?.action) === 'edit' && e.pendingRequest?.revision;
            const allocTable = isPendingEdit
                ? buildAccountingEditDiffAllocationTableHtml(e, reg)
                : allocDetails.length
                  ? `<div style="display:flex;justify-content:space-between;align-items:center;margin:10px 0 6px;flex-wrap:wrap;gap:8px">
                    <h4 style="margin:0">${t('تفصيل التوزيع', 'Allocation breakdown')}</h4>
                    ${toStr(e.status) === 'confirmed' || toStr(e.status) === 'invoiced' ? `<button type="button" class="btn-primary mini-btn" onclick="printAccountingEntryVoucher('${escHtml(e.id)}')">🖨️ ${t('إيصال كامل', 'Full receipt')}</button>` : ''}
                </div>
                <table class="data-table" style="width:100%;font-size:12px;margin-top:4px">
                <thead><tr>
                    <th>#</th><th>${t('المرجع', 'Reference')}</th><th>${t('العقار', 'Property')}</th>
                    <th>${t('الإجمالي', 'Total')}</th><th>${t('مدفوع سابقاً', 'Prev. paid')}</th>
                    <th>${t('هذه الدفعة', 'This pay.')}</th><th>${t('المتبقي', 'Remaining')}</th><th>${t('إيصال', 'Receipt')}</th>
                </tr></thead>
                <tbody>${allocDetails.map((a, i) => {
                    let ref = escHtml(a.ref || '—');
                    if (a.kind === 'invoice') ref = `${t('فاتورة', 'Invoice')} ${ref}`;
                    else if (a.kind === 'cheque') ref = `${t('شيك', 'Cheque')} ${ref}`;
                    return `<tr>
                        <td>${i + 1}</td><td>${ref}</td>
                        <td>${a.building && a.unit ? `${escHtml(a.building)} — ${escHtml(a.unit)}` : '—'}</td>
                        <td>${escHtml(summaryAmtOm(a.total))}</td>
                        <td>${escHtml(summaryAmtOm(a.paidBefore))}</td>
                        <td class="acct-ledger-amt-paid">${escHtml(summaryAmtOm(a.amount))}</td>
                        <td class="acct-ledger-amt-remaining">${escHtml(summaryAmtOm(a.remainingAfter))}</td>
                        <td>${toStr(e.status) === 'confirmed' || toStr(e.status) === 'invoiced' ? `<button type="button" class="btn-outline mini-btn" onclick="printAccountingAllocationSubReceipt('${escHtml(e.id)}',${i})" title="${t('طباعة إيصال هذا البند', 'Print this allocation receipt')}">🖨️</button>` : '—'}</td>
                    </tr>`;
                }).join('')}</tbody>
                <tfoot><tr>
                    <td colspan="5" style="font-weight:700">${t('إجمالي الموزّع', 'Total allocated')}</td>
                    <td class="acct-ledger-amt-paid" style="font-weight:700">${escHtml(summaryAmtOm(allocTotal))}</td>
                    <td colspan="2"></td>
                </tr>${unallocated > 0 ? `<tr>
                    <td colspan="5" style="font-weight:700;color:#c62828">${t('غير موزّع', 'Unallocated')}</td>
                    <td style="font-weight:700;color:#c62828">${escHtml(summaryAmtOm(unallocated))}</td>
                    <td colspan="2"></td>
                </tr>` : ''}</tfoot>
            </table>
            ${buildAccountingEntryVoucherNotePanelHtml(e, allocDetails)}`
                  : `<p style="color:#666;margin-top:10px">${t('لا يوجد توزيع على فواتير', 'No invoice allocation')}</p>${buildAccountingEntryVoucherNotePanelHtml(e, allocDetails)}`;
            const summaryCards = isPendingEdit
                ? (() => {
                      const diff = computeAccountingEntryRevisionDiff(e, e.pendingRequest.revision, reg);
                      return `<div class="acct-live-dashboard" style="margin-bottom:12px">
                    <div class="acct-live-card acct-live-card--income"><small>${t('المبلغ الحالي', 'Current amount')}</small><strong>${escHtml(summaryAmtOm(e.amount))}</strong></div>
                    <div class="acct-live-card acct-live-card--income"><small>${t('المبلغ المقترح', 'Proposed amount')}</small><strong>${diff.amountChanged ? `<span class="acct-diff-old">${escHtml(summaryAmtOm(diff.oldAmount))}</span> → <span class="acct-diff-new">${escHtml(summaryAmtOm(diff.newAmount))}</span>` : escHtml(summaryAmtOm(diff.newAmount))}</strong></div>
                    <div class="acct-live-card"><small>${t('موزّع حالياً', 'Currently allocated')}</small><strong>${escHtml(summaryAmtOm(allocTotal))}</strong></div>
                </div>`;
                  })()
                : `<div class="acct-live-dashboard" style="margin-bottom:12px">
                    <div class="acct-live-card acct-live-card--income"><small>${t('المبلغ المستلم', 'Received')}</small><strong>${escHtml(summaryAmtOm(e.amount))}</strong></div>
                    <div class="acct-live-card"><small>${t('موزّع', 'Allocated')}</small><strong>${escHtml(summaryAmtOm(allocTotal))}</strong></div>
                    <div class="acct-live-card acct-live-card--net"><small>${t('متبقي غير موزّع', 'Unallocated')}</small><strong style="color:${unallocated > 0 ? '#c62828' : 'inherit'}">${escHtml(summaryAmtOm(unallocated))}</strong></div>
                </div>`;
            const pendingActions = canEditAccountingManualEntry(e)
                ? `<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
                    <button type="button" class="btn-outline mini-btn" onclick="editAccountingManualEntry('${escHtml(e.id)}')">✏️ ${t('تعديل', 'Edit')}</button>
                    <button type="button" class="btn-outline mini-btn" onclick="deleteAccountingManualEntry('${escHtml(e.id)}')">🗑️ ${t('حذف', 'Delete')}</button>
                    ${canApproveAccountingEntry() ? `<button type="button" class="btn-primary mini-btn" onclick="openAccountingApprovalModal('${escHtml(e.id)}')">✅ ${t('اعتماد', 'Approve')}</button>` : ''}
                </div>`
                : canRequestAccountingManualEntryChange(e)
                  ? `<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
                    <button type="button" class="btn-outline mini-btn" onclick="requestEditAccountingManualEntry('${escHtml(e.id)}')">✏️ ${t('طلب تعديل', 'Request edit')}</button>
                    <button type="button" class="btn-outline mini-btn" onclick="requestDeleteAccountingManualEntry('${escHtml(e.id)}')">🗑️ ${t('طلب حذف', 'Request delete')}</button>
                </div>`
                  : accountingEntryHasPendingRequest(e) && canApproveAccountingEntry()
                    ? `<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
                    <button type="button" class="btn-primary mini-btn" onclick="openAccountingApprovalModal('${escHtml(e.id)}')">✅ ${t('اعتماد / رفض', 'Approve / reject')}</button>
                </div>`
                    : '';
            const auditPanelHtml = buildAccountingEntryAuditPanelHtml(e);
            return `
                ${summaryCards}
                <table class="info-table" style="width:100%;font-size:12px">
                    <tr><th>${t('رقم السند', 'Voucher')}</th><td>${escHtml(e.voucherNo || '—')}</td><th>${t('التاريخ', 'Date')}</th><td>${escHtml(e.dueDate || '—')}</td></tr>
                    <tr><th>${t('العميل', 'Client')}</th><td>${escHtml(e.partyName || '—')}</td><th>${t('تم الدفع من خلال', 'Paid through')}</th><td>${escHtml(bank ? bankAccountLabel(bank) : '—')}</td></tr>
                    <tr><th>${t('المرجع', 'Reference')}</th><td>${escHtml(e.referenceNo || '—')}</td><th>${t('الحالة', 'Status')}</th><td>${escHtml(accountingEntryDisplayStatusLabel(e))}</td></tr>
                    ${toStr(e.title).trim() ? `<tr><th>${t('الوصف', 'Description')}</th><td colspan="3">${escHtml(e.title)}</td></tr>` : ''}
                </table>
                ${auditPanelHtml ? `<div id="accountingEntryAuditPanelHost">${auditPanelHtml}</div>` : ''}
                ${pendingActions}
                ${allocTable}`;
        }
        if (kind === 'cheque') {
            const ch = (reg.cheques || []).find((x) => x.id === id);
            if (!ch) return '';
            const parent = findParentReceiptAllocationForChequeExtended(ch.id, reg);
            const clientName = resolveAccountingChequeClientName(ch, parent?.entry);
            const propertyLbl = resolveAccountingChequePropertyLabel(ch);
            const total = parseFloat(ch.amount) || 0;
            const paid = parseFloat(ch.paidAmount || ch.amount) || 0;
            const remaining = Math.max(0, total - paid);
            const payNotes = (ch.paymentHistory || []).map((h) => h.note).filter(Boolean).join('\n') || toStr(ch.paymentNote);
            let parentSection = '';
            let notePanelSection = '';
            if (parent) {
                const pe = parent.entry;
                const parentEditBtns = canRequestAccountingManualEntryChange(pe)
                    ? `<button type="button" class="btn-outline mini-btn" onclick="requestEditAccountingManualEntry('${escHtml(pe.id)}')">✏️ ${t('طلب تعديل السند', 'Request voucher edit')}</button>
                        <button type="button" class="btn-outline mini-btn" onclick="requestDeleteAccountingManualEntry('${escHtml(pe.id)}')">🗑️ ${t('طلب حذف السند', 'Request voucher delete')}</button>`
                    : '';
                parentSection = `<div class="acct-voucher-parent-banner" style="margin-bottom:12px">
                    <strong>${t('مرتبط بسند قبض', 'Linked to receipt voucher')}</strong><br>
                    ${t(`سند ${toStr(pe.voucherNo) || '—'} — إجمالي ${summaryAmtOm(pe.amount)}`, `Voucher ${toStr(pe.voucherNo) || '—'} — total ${summaryAmtOm(pe.amount)}`)}
                    <p style="font-size:12px;color:#666;margin:6px 0 0">${t('لتعديل أو حذف هذا الشيك، استخدم طلب تعديل/حذف السند الرئيسي أدناه.', 'To edit or delete this cheque, use the voucher edit/delete request on the parent receipt below.')}</p>
                    <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
                        <button type="button" class="btn-outline mini-btn" onclick="openAccountingReceiptDetailModal('${escHtml(pe.id)}')">${t('تفاصيل السند', 'Voucher details')}</button>
                        <button type="button" class="btn-outline mini-btn" onclick="printAccountingEntryVoucher('${escHtml(pe.id)}')">🖨️ ${t('إيصال كامل', 'Full receipt')}</button>
                        <button type="button" class="btn-primary mini-btn" onclick="printAccountingAllocationSubReceipt('${escHtml(pe.id)}',${parent.allocIndex})">🖨️ ${t('إيصال هذا الشيك', 'This cheque receipt')}</button>
                        ${parentEditBtns}
                    </div>
                </div>`;
                notePanelSection = buildAccountingChequeReceiptNotePanelHtml(parent, ch, reg, '');
            } else {
                const payHist = ch.paymentHistory || [];
                const lastHist = payHist.length ? payHist[payHist.length - 1] : null;
                let fallbackNote = '';
                if (lastHist?.note) fallbackNote = lastHist.note;
                else if (ch.paymentNote) fallbackNote = toStr(ch.paymentNote).split('\n').pop();
                notePanelSection = buildAccountingChequeReceiptNotePanelHtml(null, ch, reg, fallbackNote);
            }
            const historyRows = (ch.paymentHistory || []).length
                ? `<h4 style="margin:14px 0 6px">${t('سجل الدفعات', 'Payment log')}</h4>
                <table class="data-table" style="width:100%;font-size:11px"><thead><tr>
                    <th>${t('التاريخ', 'Date')}</th><th>${t('السند', 'Voucher')}</th><th>${t('المبلغ', 'Amount')}</th><th>${t('ملاحظة', 'Note')}</th>
                </tr></thead><tbody>${(ch.paymentHistory || []).map((h) => `<tr>
                    <td>${escHtml(h.date || '—')}</td><td>${escHtml(h.voucherNo || '—')}</td>
                    <td class="acct-ledger-amt-paid">${escHtml(summaryAmtOm(h.amount))}</td>
                    <td style="font-size:11px">${escHtml(h.note || '—')}</td>
                </tr>`).join('')}</tbody></table>`
                : payNotes
                    ? `<p style="margin-top:12px;font-size:12px"><strong>${t('ملاحظات الدفع', 'Payment notes')}:</strong><br>${escHtml(payNotes).replace(/\n/g, '<br>')}</p>`
                    : '';
            return `
                ${parentSection}
                <div class="acct-live-dashboard" style="margin-bottom:12px">
                    <div class="acct-live-card acct-live-card--income"><small>${t('المدفوع', 'Paid')}</small><strong>${escHtml(summaryAmtOm(paid))}</strong></div>
                    <div class="acct-live-card acct-live-card--net"><small>${t('المتبقي', 'Remaining')}</small><strong style="color:${remaining > 0 ? '#c62828' : 'inherit'}">${escHtml(summaryAmtOm(remaining))}</strong></div>
                    <div class="acct-live-card"><small>${t('إجمالي الشيك', 'Cheque total')}</small><strong>${escHtml(summaryAmtOm(total))}</strong></div>
                </div>
                <table class="info-table" style="width:100%;font-size:12px">
                    <tr><th>${t('رقم الشيك', 'Cheque')}</th><td>${escHtml(ch.chequeNo || '—')}</td><th>${t('التاريخ', 'Date')}</th><td>${escHtml(ch.lastActionDate || ch.dueDate || '—')}</td></tr>
                    <tr><th>${t('العميل', 'Client')}</th><td>${escHtml(clientName)}</td><th>${t('الحالة', 'Status')}</th><td>${escHtml(accountingChequeStatusLabel(ch.status))}</td></tr>
                    <tr><th>${t('العقار', 'Property')}</th><td colspan="3">${escHtml(propertyLbl)}</td></tr>
                    <tr><th>${t('عقد الإيجار', 'Lease')}</th><td colspan="3">${escHtml(ch.agreementNo || '—')}</td></tr>
                </table>
                ${notePanelSection}
                ${historyRows}
                <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
                    <button type="button" class="btn-primary mini-btn" onclick="printAccountingChequeReceipt('${escHtml(ch.id)}')">🖨️ ${parent ? t('طباعة إيصال الشيك (فرعي)', 'Print sub-receipt') : t('طباعة إيصال الشيك', 'Print cheque receipt')}</button>
                </div>`;
        }
        return '';
    }

    function openAccountingReceiptDetailModal(entryId) {
        _accountingReceiptDetailState = { kind: 'entry', id: entryId };
        const reg = loadAccountingRegistry();
        const e = reg.entries.find((x) => x.id === entryId);
        if (!e) return;
        const titleEl = document.getElementById('accountingReceiptDetailTitle');
        if (titleEl) titleEl.textContent = e.voucherNo ? `${t('سند قبض', 'Receipt')} ${e.voucherNo}` : t('تفاصيل الإيصال', 'Receipt details');
        const body = document.getElementById('accountingReceiptDetailBody');
        if (body) body.innerHTML = buildAccountingReceiptDetailBodyHtml('entry', entryId);
        document.getElementById('accountingReceiptDetailModal')?.classList.add('open');
        applyAppLanguage();
    }

    function openAccountingChequeReceiptDetailModal(chequeId) {
        _accountingReceiptDetailState = { kind: 'cheque', id: chequeId };
        const reg = loadAccountingRegistry();
        const ch = (reg.cheques || []).find((x) => x.id === chequeId);
        if (!ch) return;
        const parent = findParentReceiptAllocationForCheque(chequeId, reg);
        const titleEl = document.getElementById('accountingReceiptDetailTitle');
        if (titleEl) {
            titleEl.textContent = parent
                ? `${t('إيصال شيك', 'Cheque receipt')} ${ch.chequeNo || ''} — ${t('سند', 'Voucher')} ${parent.entry.voucherNo || ''}`
                : `${t('إيصال شيك', 'Cheque receipt')} ${ch.chequeNo || ''}`;
        }
        const body = document.getElementById('accountingReceiptDetailBody');
        if (body) body.innerHTML = buildAccountingReceiptDetailBodyHtml('cheque', chequeId);
        document.getElementById('accountingReceiptDetailModal')?.classList.add('open');
        applyAppLanguage();
    }

    function closeAccountingReceiptDetailModal() {
        document.getElementById('accountingReceiptDetailModal')?.classList.remove('open');
        _accountingReceiptDetailState = { kind: '', id: '' };
    }

    function printAccountingReceiptDetailModal() {
        try {
            const st = _accountingReceiptDetailState;
            const reg = loadAccountingRegistry();
            if (st.kind === 'entry' && st.id) {
                const e = reg.entries.find((x) => x.id === st.id);
                if (e && toStr(e.status) === 'pending_accountant') {
                    alert(
                        t(
                            'لا يمكن طباعة السند قبل اعتماد مدير الحسابات.',
                            'Cannot print until the accounting manager approves this voucher.'
                        )
                    );
                    return;
                }
                printAccountingEntryVoucher(st.id);
            } else if (st.kind === 'cheque' && st.id) {
                printAccountingChequeReceipt(st.id);
            } else {
                alert(t('لا يوجد إيصال للطباعة.', 'Nothing to print.'));
            }
        } catch (e) {
            console.error('printAccountingReceiptDetailModal', e);
            alert(
                t(
                    `تعذرت الطباعة: ${toStr(e && e.message) || 'خطأ غير معروف'}`,
                    `Print failed: ${toStr(e && e.message) || 'unknown error'}`
                )
            );
        }
    }

    function printAccountingEntryVoucher(entryId) {
        try {
            const reg = loadAccountingRegistry();
            const e = reg.entries.find((x) => x.id === entryId);
            if (!e) {
                alert(t('السند غير موجود.', 'Voucher not found.'));
                return;
            }
            const isIncome = toStr(e.type) === 'income';
            const title = isIncome
                ? { ar: 'سند قبض من عميل', en: 'Receipt voucher' }
                : { ar: 'سند صرف', en: 'Payment voucher' };
            const body = wrapAccountingVoucherPrintBody(buildAccountingEntryVoucherPrintHtml(e));
            printWithSiteStandard(title, body, { extraStyles: getAccountingVoucherPrintStylesCss() });
        } catch (err) {
            console.error('printAccountingEntryVoucher', err);
            alert(
                t(
                    `تعذرت الطباعة: ${toStr(err && err.message) || 'خطأ غير معروف'}`,
                    `Print failed: ${toStr(err && err.message) || 'unknown error'}`
                )
            );
        }
    }

    function printAccountingAllocationSubReceiptCore(entry, alloc, allocIndex) {
        if (!entry || !alloc) return;
        const title = {
            ar: `إيصال فرعي — ${toStr(entry.voucherNo) || 'سند قبض'}`,
            en: `Sub-receipt — ${toStr(entry.voucherNo) || 'receipt'}`
        };
        const body = wrapAccountingVoucherPrintBody(buildAccountingAllocationSubReceiptPrintHtml(entry, alloc, allocIndex));
        printWithSiteStandard(title, body, { extraStyles: getAccountingVoucherPrintStylesCss() });
    }

    function buildAccountingAllocationSubReceiptPrintHtml(entry, alloc, allocIndex) {
        const reg = loadAccountingRegistry();
        const snap = resolvePaymentAllocationSnapshot(alloc, reg);
        const isIncome = toStr(entry.type) === 'income';
        const bank = entry.bankAccountId ? getBankAccountById(entry.bankAccountId) : null;
        const dateLbl = formatAccountingDisplayDate(entry.dueDate) || toStr(entry.dueDate) || '—';
        const voucherNo = toStr(entry.voucherNo) || '—';
        let itemTitle = escHtml(snap.ref || '—');
        if (snap.kind === 'invoice') itemTitle = `${t('فاتورة', 'Invoice')} ${itemTitle}`;
        else if (snap.kind === 'cheque') itemTitle = `${t('شيك', 'Cheque')} ${itemTitle}`;
        const payStatus =
            (parseFloat(snap.remainingAfter) || 0) <= 0.001
                ? t('مدفوع كامل', 'Paid in full')
                : t('مدفوع جزئي', 'Partial payment');
        const noteLine = snap.note || buildAllocationPaymentNoteLine(
            { voucherNo, totalAmount: entry.amount, entryId: entry.id, date: entry.dueDate },
            snap,
            (parseFloat(snap.remainingAfter) || 0) <= 0.001 ? 'full' : 'partial'
        );
        let notePanelHtml = '';
        if (snap.kind === 'cheque' && snap.id) {
            const ch = (reg.cheques || []).find((c) => c.id === snap.id);
            if (ch) {
                notePanelHtml = buildAccountingChequeReceiptNotePanelHtml(
                    { entry, alloc, allocIndex, inferred: allocIndex < 0 },
                    ch,
                    reg,
                    noteLine
                );
            }
        }
        if (!notePanelHtml) {
            const rows = [
                [t('إجمالي السند', 'Voucher total'), `${summaryAmtOm(entry.amount)} — ${t('سند', 'Voucher')} ${voucherNo}`],
                [t('هذه الدفعة', 'This payment'), summaryAmtOm(snap.amount)],
                [t('ملاحظة التوزيع', 'Allocation note'), noteLine]
            ];
            appendAccountingEntryMetaNoteRows(rows, entry);
            notePanelHtml = buildAccountingNotePanelHtml(rows);
        }
        return `
            <div class="section-header property-section-h">${t('إيصال فرعي — جزء من سند القبض', 'Sub-receipt — part of receipt voucher')}</div>
            <table class="info-table property-report-table print-zebra-cells acct-voucher-print-table" style="margin-bottom:14px">
                <tbody>
                    <tr>
                        <th>${t('سند القبض الأصلي', 'Parent voucher')}</th>
                        <td><strong>${escHtml(voucherNo)}</strong></td>
                        <th>${t('التاريخ', 'Date')}</th>
                        <td>${escHtml(dateLbl)}</td>
                    </tr>
                    <tr>
                        <th>${t('العميل', 'Client')}</th>
                        <td colspan="3"><strong>${escHtml(resolveAccountingReceiptClientName(snap, entry))}</strong></td>
                    </tr>
                    <tr>
                        <th>${t('إجمالي السند', 'Voucher total')}</th>
                        <td>${escHtml(summaryAmtOm(entry.amount))}</td>
                        <th>${t('تم الدفع من خلال', 'Paid through')}</th>
                        <td>${escHtml(bank ? bankAccountLabel(bank) : '—')}</td>
                    </tr>
                </tbody>
            </table>
            <div class="acct-voucher-amount-box">
                <small>${isIncome ? t('مبلغ هذه الدفعة', 'This payment amount') : t('المبلغ', 'Amount')}</small>
                <strong>${escHtml(summaryAmtOm(snap.amount))}</strong>
            </div>
            <div class="section-header property-section-h">${t('تفاصيل التوزيع', 'Allocation details')}</div>
            <table class="info-table property-report-table print-zebra acct-voucher-print-table" style="margin-bottom:14px">
                <thead><tr>
                    <th>${t('المرجع', 'Reference')}</th>
                    <th>${t('العقار', 'Property')}</th>
                    <th>${t('الإجمالي', 'Total')}</th>
                    <th>${t('مدفوع سابقاً', 'Previously paid')}</th>
                    <th>${t('هذه الدفعة', 'This payment')}</th>
                    <th>${t('المتبقي', 'Remaining')}</th>
                    <th>${t('الحالة', 'Status')}</th>
                </tr></thead>
                <tbody><tr>
                    <td>${itemTitle}</td>
                    <td>${snap.building && snap.unit ? `${escHtml(snap.building)} — ${escHtml(snap.unit)}` : '—'}</td>
                    <td>${escHtml(summaryAmtOm(snap.total))}</td>
                    <td>${escHtml(summaryAmtOm(snap.paidBefore))}</td>
                    <td><strong>${escHtml(summaryAmtOm(snap.amount))}</strong></td>
                    <td>${escHtml(summaryAmtOm(snap.remainingAfter))}</td>
                    <td>${escHtml(payStatus)}</td>
                </tr></tbody>
            </table>
            ${notePanelHtml}
            ${entry.paymentNote ? `<p class="property-muted">${t('ملاحظة السند', 'Voucher note')}: ${escHtml(entry.paymentNote)}</p>` : ''}`;
    }

    function printAccountingAllocationSubReceipt(entryId, allocIndex) {
        const reg = loadAccountingRegistry();
        const e = reg.entries.find((x) => x.id === entryId);
        if (!e) return;
        const allocs = (e.paymentAllocations || []).filter((a) => (parseFloat(a.amount) || 0) > 0);
        const alloc = allocs[allocIndex];
        if (!alloc) return;
        printAccountingAllocationSubReceiptCore(e, alloc, allocIndex);
    }

    function renderCoaSelectOptions(kind, selectedId) {
        const type = kind === 'income' ? 'revenue' : (kind === 'expense' ? 'expense' : '');
        const counterType = kind === 'income' ? 'asset' : (kind === 'expense' ? 'asset' : '');
        const accounts = getChartOfAccounts().filter((a) => {
            if (!a.allowPost) return false;
            if (type && a.type === type) return true;
            if (counterType && a.type === counterType) return true;
            return !type && !counterType;
        });
        return `<option value="">—</option>${accounts.map((a) =>
            `<option value="${escHtml(a.id)}"${a.id === selectedId ? ' selected' : ''}>${escHtml(a.code)} — ${escHtml(coaAccountLabel(a))}</option>`
        ).join('')}`;
    }

    function renderCounterCoaSelectOptions(kind, selectedId) {
        const defaultId = kind === 'income' ? 'coa_111' : 'coa_111';
        const accounts = getChartOfAccounts().filter((a) => a.allowPost && (a.type === 'asset' || a.type === 'liability'));
        const sel = selectedId || defaultId;
        return accounts.map((a) =>
            `<option value="${escHtml(a.id)}"${a.id === sel ? ' selected' : ''}>${escHtml(a.code)} — ${escHtml(coaAccountLabel(a))}</option>`
        ).join('');
    }

    function buildJournalLinesForManualEntry(entryType, coaAccountId, counterCoaId, amount, opts) {
        const o = opts || {};
        const fakeEntry = {
            type: entryType,
            amount,
            coaAccountId,
            counterCoaAccountId: counterCoaId,
            bankAccountId: o.bankAccountId,
            paymentAllocations: o.paymentAllocations || [],
            partyName: o.partyName,
            partyType: o.partyType,
            title: o.title || '',
            status: o.status || 'confirmed',
            collectionOnly: !!o.collectionOnly,
            settlePayable: !!o.settlePayable
        };
        return buildJournalLinesFromAccountingEntry(fakeEntry, o.reg || loadAccountingRegistry());
    }

    function resolveOwnerNameForBuilding(building) {
        const bKey = normalizeReservationBuildingKey(building);
        let found = '';
        (ownersList || []).forEach((ownerName) => {
            if (found) return;
            const buildings = ownerBuildingMap[ownerName] || [];
            if (buildings.some((b) => normalizeReservationBuildingKey(b) === bKey)) found = toStr(ownerName);
        });
        if (found) return found;
        const row = collectAddressBookRowsFromSystem().find((r) =>
            r.type === 'owner' && normalizeReservationBuildingKey(r.building) === bKey
        );
        return row ? toStr(row.name) : '';
    }

    function getDefaultBankAccountForOwner(ownerName) {
        const accounts = getBankAccounts(true).filter((b) => toStr(b.ownerName) === toStr(ownerName));
        return accounts.find((b) => b.isDefault) || accounts[0] || null;
    }

    function resolveDefaultBankAccountIdForBuilding(building) {
        const ownerName = resolveOwnerNameForBuilding(building);
        const ba = getDefaultBankAccountForOwner(ownerName);
        return ba?.id || '';
    }

    function resolveDefaultBankAccountIdForCheque(cheque) {
        if (!cheque) return '';
        if (toStr(cheque.receiptBankAccountId)) return toStr(cheque.receiptBankAccountId);
        return resolveDefaultBankAccountIdForBuilding(cheque.building);
    }

    function resolveDefaultBankAccountIdForDeposit(dep) {
        if (!dep) return '';
        if (toStr(dep.receiptBankAccountId)) return toStr(dep.receiptBankAccountId);
        return resolveDefaultBankAccountIdForBuilding(dep.building);
    }

    function resolveBankCoaAccountId(bankAccountId, regOpt) {
        const ba = getBankAccountById(bankAccountId);
        if (!ba) return '';
        const reg = regOpt || loadAccountingRegistry();
        return ensureCoaForBankAccount(ba, reg) || ba.coaAccountId || '';
    }

    function cacheAccountingReceiptAttachment(att) {
        if (!window._accountingReceiptAttachmentCache) window._accountingReceiptAttachmentCache = {};
        const key = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        window._accountingReceiptAttachmentCache[key] = normalizeContractAttachmentRef(att) || att;
        return key;
    }

    function openAccountingReceiptAttachmentByCacheKey(key) {
        const att = window._accountingReceiptAttachmentCache?.[key];
        if (!att) {
            alert(t('تعذر فتح المرفق.', 'Could not open attachment.'));
            return;
        }
        openAttachmentPreviewModal(att, t('مرفق الاعتماد', 'Approval attachment'));
    }

    async function openAccountingChequeAttachmentPreview(chequeId) {
        const reg = loadAccountingRegistry();
        const ch = (reg.cheques || []).find((c) => c.id === chequeId);
        if (!ch) {
            alert(t('تعذر فتح المرفق.', 'Could not open attachment.'));
            return;
        }
        const att = await resolveAccountingChequeAttachmentForPreview(ch);
        if (!att) {
            alert(t('تعذر فتح المرفق — لا يوجد ملف محفوظ.', 'Could not open attachment — no saved file.'));
            return;
        }
        await openAttachmentPreviewModal(
            att,
            `${t('شيك', 'Cheque')} ${toStr(ch.chequeNo) || '—'}`
        );
    }

    function getAccountingChequeAttachmentStoreKeyCandidates(ch) {
        const keys = [];
        const primary = getAccountingChequeAttachmentStoreKey(ch);
        if (primary) keys.push(primary);
        if (!ch) return keys;
        const mi = parseInt(ch.monthIndex, 10);
        const ci = parseInt(ch.chequeIndex, 10);
        if (ch.sourceType === 'vat') {
            if (Number.isFinite(ci)) {
                keys.push(`vat_chq_${ci}`);
                if (ci > 0) keys.push(`vat_chq_${ci - 1}`);
                keys.push(`vat_chq_${ci + 1}`);
            }
        } else if (Number.isFinite(mi)) {
            keys.push(`pay_chq_${mi}`);
            if (mi > 0) keys.push(`pay_chq_${mi - 1}`);
            keys.push(`pay_chq_${mi + 1}`);
        }
        return [...new Set(keys.filter(Boolean))];
    }

    function buildAccountingChequeAttachmentStoreFromPayload(payload) {
        const store = {};
        if (!payload || typeof payload !== 'object') return store;
        pushPrintAttachmentToStore(store, 'deposit_receipt', {
            name: payload.depositAttachmentName,
            dataUrl: payload.depositAttachmentDataUrl,
            relativePath: payload.depositAttachmentRelativePath,
            fileId: payload.depositAttachmentFileId,
            storedOnDisk: payload.depositStoredOnDisk
        });
        parsePayloadJsonArrayField(payload, 'paymentScheduleJson', 'paymentSchedule').forEach((r) => {
            pushPrintAttachmentToStore(store, `pay_chq_${r.monthIndex || 0}`, r);
        });
        parsePayloadJsonArrayField(payload, 'vatChequeScheduleJson', 'vatChequeSchedule').forEach((r) => {
            pushPrintAttachmentToStore(store, `vat_chq_${r.chequeIndex || 0}`, r);
        });
        const payloadStore = getMandatoryDocStoreFromPayload(payload);
        Object.keys(payloadStore).forEach((k) => {
            if (/^(deposit_receipt|pay_chq_|vat_chq_|ins_print_)/.test(k)) {
                pushPrintAttachmentToStore(store, k, payloadStore[k]);
            }
        });
        return store;
    }

    async function resolveAccountingChequeAttachmentForPreview(ch) {
        if (!ch) return null;
        const tryResolved = async (att, fallbackName) => {
            const norm = finalizeAccountingAttachmentRef(att, fallbackName);
            if (!norm) return null;
            const hasRef =
                contractAttachmentPresent(norm) || toStr(norm.fileId) || toStr(norm.relativePath) || toStr(norm.dataUrl);
            if (!hasRef) return null;
            const dataUrl = await bhdResolveAttachmentUrl(norm);
            return toStr(dataUrl) ? norm : null;
        };
        let hit = await tryResolved(getAccountingChequeAttachmentRef(ch), ch.chequeNo);
        if (hit) return hit;

        const payload = getContractPayloadForUnit({ building: ch.building, unit: ch.unit });
        if (payload) {
            const store = buildAccountingChequeAttachmentStoreFromPayload(payload);
            const schedule =
                ch.sourceType === 'vat'
                    ? parsePayloadJsonArrayField(payload, 'vatChequeScheduleJson', 'vatChequeSchedule')
                    : parsePayloadJsonArrayField(payload, 'paymentScheduleJson', 'paymentSchedule');
            for (const key of getAccountingChequeAttachmentStoreKeyCandidates(ch)) {
                hit = await tryResolved(store[key], ch.chequeNo);
                if (hit) return hit;
            }
            const chequeNo = toStr(ch.chequeNo).trim();
            for (const row of schedule) {
                const rowNo = toStr(row.checkNo || row.chequeNo).trim();
                if (!chequeNo || !rowNo || rowNo !== chequeNo) continue;
                const rowKey =
                    ch.sourceType === 'vat'
                        ? `vat_chq_${parseInt(row.chequeIndex || row.monthIndex, 10) || 0}`
                        : `pay_chq_${parseInt(row.monthIndex, 10) || 0}`;
                const merged = mergeChequeRowAttachmentFields(store[rowKey] || {}, row);
                hit = await tryResolved(merged, ch.chequeNo);
                if (hit) return hit;
            }
        }

        const ctx = {
            building: ch.building,
            buildingNo: ch.building,
            unit: ch.unit,
            flatNo: ch.unit,
            agreementNo: ch.agreementNo || payload?.agreementNo || ''
        };
        for (const key of getAccountingChequeAttachmentStoreKeyCandidates(ch)) {
            let items = [{ key, name: toStr(ch.chequeNo) || key, label: key }];
            items = await repairContractPrintAttachmentItemsFromDisk(items, ctx);
            hit = await tryResolved(items[0], ch.chequeNo);
            if (hit) return hit;
        }
        try {
            const diskItems = await collectContractAttachmentsFromDiskDirect(ctx);
            const chequeNo = toStr(ch.chequeNo).trim().toLowerCase();
            const keySet = new Set(getAccountingChequeAttachmentStoreKeyCandidates(ch));
            const diskHit =
                diskItems.find((it) => keySet.has(toStr(it.key))) ||
                (chequeNo
                    ? diskItems.find((it) => {
                          const nm = toStr(it.name).toLowerCase();
                          const no = toStr(it.checkNo).toLowerCase();
                          return (nm && nm.includes(chequeNo)) || (no && no === chequeNo);
                      })
                    : null);
            hit = await tryResolved(diskHit, ch.chequeNo);
            if (hit) return hit;
        } catch (_eDiskAcct) {}
        return null;
    }

    function setAccountingChequeReceiptPrivateNote(chequeId, value) {
        const reg = loadAccountingRegistry();
        const ch = (reg.cheques || []).find((c) => c.id === chequeId);
        if (!ch) return;
        ch.receiptPrivateNote = toStr(value);
        saveAccountingRegistry(reg, { skipJournalRebuild: true });
    }

    function getAccountingChequeReceiptPrivateNoteFromUi(chequeId) {
        const nodes = document.querySelectorAll('#accountingBulkChequeReceiptTable [data-cheque-private-note]');
        for (const el of nodes) {
            if (toStr(el.getAttribute('data-cheque-id')) === toStr(chequeId)) return toStr(el.value).trim();
        }
        return '';
    }

    function buildAccountingReceiptAttachmentBlock(att, label) {
        const norm = normalizeContractAttachmentRef(att);
        if (!norm || !contractAttachmentPresent(norm)) {
            return `<p style="font-size:12px;color:#888;margin:8px 0">${t('لا يوجد مرفق', 'No attachment')}</p>`;
        }
        const cacheKey = cacheAccountingReceiptAttachment(norm);
        const name = toStr(norm.name) || label;
        return `<div style="margin:10px 0;padding:10px;border:1px dashed #90caf9;border-radius:8px;background:#f5f9ff">
            <strong style="font-size:12px;display:block;margin-bottom:4px">📎 ${escHtml(label)}</strong>
            <span style="font-size:12px;word-break:break-all;color:#37474f">${escHtml(name)}</span>
            <div style="margin-top:8px">
                <button type="button" class="btn-outline mini-btn" onclick="openAccountingReceiptAttachmentByCacheKey('${escHtml(cacheKey)}')">🔍 ${t('معاينة المرفق', 'Preview attachment')}</button>
            </div>
        </div>`;
    }

    function buildReceiptBankAccountFieldHtml(building, selectedId, selectId) {
        const ownerName = resolveOwnerNameForBuilding(building);
        const sel = selectedId || resolveDefaultBankAccountIdForBuilding(building);
        return `<div class="input-group" style="margin-top:12px">
            <label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px">${t('حساب الإيداع البنكي', 'Deposit bank account')}</label>
            <select id="${escHtml(selectId)}" style="width:100%;max-width:420px">${renderBankAccountSelectOptions(sel, ownerName)}</select>
            ${ownerName ? `<small style="display:block;margin-top:4px;color:#666">${t('المالك', 'Owner')}: ${escHtml(ownerName)}</small>` : ''}
        </div>`;
    }

    function buildAccountingDepositReceiptVerificationContextHtml(dep) {
        const b0 = toStr(dep?.building);
        const u0 = toStr(dep?.unit);
        if (!b0 || !u0) return '';
        const payload =
            enrichPayloadWithResolvedLinkedContractUnits(
                enrichPayloadDepositFromAccounting(getContractPayloadForUnit({ building: b0, unit: u0 })) ||
                    getSavedContractPayloadForUnit({ building: b0, unit: u0 })
            ) || {};
        const linked = resolveLinkedContractUnitsForWorkspace(
            { ...payload, buildingNo: b0, flatNo: u0, agreementNo: payload.agreementNo || dep?.agreementNo },
            { skipForm: true }
        );
        const units =
            linked.length > 1
                ? linked
                : [
                      {
                          unit: u0,
                          floorDetails: payload?.floorDetails,
                          unitType: payload?.unitType,
                          monthlyRent: payload?.monthlyRent,
                          electricityMeter: payload?.electricityMeter,
                          waterMeter: payload?.waterMeter
                      }
                  ];
        const totalRent = units.reduce((s, lu) => s + (parseFloat(lu.monthlyRent) || 0), 0);
        const owner = formatOwnerNamesForBuilding(b0) || '—';
        const tenant = toStr(payload?.tenantNameAr || payload?.tenantNameEn || dep?.tenant || '—');
        const agreement = toStr(payload?.agreementNo || dep?.agreementNo || '—');
        const start = formatDate(payload?.startDate, 'ar') || toStr(payload?.startDate) || '—';
        const end = formatDate(payload?.endDate, 'ar') || toStr(payload?.endDate) || '—';
        const pm = toStr(payload?.paymentMethod) || '—';
        const reservation =
            (unitReservations || []).find(
                (r) =>
                    reservationCoversUnit(r, b0, u0) ||
                    (agreement && toStr(r.agreementNo) === agreement)
            ) || null;
        const unitRows = units
            .map((lu, idx) => {
                const isPrimary = idx === 0 && units.length > 1;
                const luUnit = toStr(lu.unit);
                return `<tr>
                    <td>${escHtml(luUnit)}${isPrimary ? ` <span class="chip" style="font-size:10px">${t('رئيسية', 'Primary')}</span>` : ''}</td>
                    <td>${escHtml(lu.floorDetails || lu.floor || '—')}</td>
                    <td>${escHtml(lu.unitType || '—')}</td>
                    <td>${escHtml(formatOMR(lu.monthlyRent))}</td>
                    <td>${escHtml(lu.electricityMeter || '—')}</td>
                    <td>${escHtml(lu.waterMeter || '—')}</td>
                    <td><button type="button" class="btn-outline mini-btn" onclick="openAccountingDepositReceiptLinkedUnitDetails(${JSON.stringify(b0)},${JSON.stringify(luUnit)})">${t('تفاصيل الوحدة', 'Unit details')}</button></td>
                </tr>`;
            })
            .join('');
        const resNote = reservation
            ? `<p style="font-size:11px;color:#555;margin:8px 0 0;line-height:1.5">${t('مرتبط بحجز', 'Linked reservation')}: ${escHtml(toStr(reservation.reservedBy || tenant))} · ${escHtml(toStr(reservation.phone || payload?.tenantMobile || '—'))}${reservation.agreementNo ? ` · ${escHtml(toStr(reservation.agreementNo))}` : ''}</p>`
            : '';
        const multiNote =
            units.length > 1
                ? `<p style="font-size:12px;font-weight:700;color:#6b1f35;margin:0 0 8px">${t(`ضمان عقد يشمل ${units.length} وحدات في المبنى`, `Deposit for ${units.length} units in building`)} — ${escHtml(formatLinkedContractUnitsLabel(payload || { flatNo: u0, linkedContractUnits: units }))}</p>`
                : '';
        return `<div class="details-section" style="margin:12px 0;padding:12px;border:1px solid #dce5ec;border-radius:10px;background:#fafcfd">
            ${multiNote}
            <h5 style="margin:0 0 10px;font-size:13px">${t('بيانات العقد/الحجز للمطابقة قبل الاعتماد', 'Contract / reservation data — verify before approval')}</h5>
            <div class="details-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:12px;font-size:12px">
                <div><small>${t('المبنى', 'Building')}</small><strong style="display:block">${escHtml(b0)}</strong></div>
                <div><small>${t('المالك', 'Owner')}</small><strong style="display:block">${escHtml(owner)}</strong></div>
                <div><small>${t('المستأجر', 'Tenant')}</small><strong style="display:block">${escHtml(tenant)}</strong></div>
                <div><small>${t('رقم العقد/الحجز', 'Agreement')}</small><strong style="display:block">${escHtml(agreement)}</strong></div>
                <div><small>${t('بداية العقد', 'Start')}</small><strong style="display:block">${escHtml(start)}</strong></div>
                <div><small>${t('نهاية العقد', 'End')}</small><strong style="display:block">${escHtml(end)}</strong></div>
                <div><small>${t('طريقة الدفع', 'Payment')}</small><strong style="display:block">${escHtml(pm)}</strong></div>
                <div><small>${t('عدد الوحدات', 'Units')}</small><strong style="display:block">${units.length}</strong></div>
                <div><small>${t('إجمالي الإيجار الشهري', 'Total monthly rent')}</small><strong style="display:block">${escHtml(formatOMR(totalRent))}</strong></div>
                <div><small>${t('مبلغ الضمان', 'Deposit')}</small><strong style="display:block">${escHtml(summaryAmtOm(dep.amount))}</strong></div>
            </div>
            ${resNote}
            <div class="table-wrap" style="margin-top:8px">
                <table class="data-table" style="width:100%;font-size:11px">
                    <thead><tr>
                        <th>${t('الوحدة', 'Unit')}</th><th>${t('الطابق', 'Floor')}</th><th>${t('النوع', 'Type')}</th>
                        <th>${t('الإيجار الشهري', 'Monthly rent')}</th><th>${t('كهرباء', 'Electricity')}</th><th>${t('ماء', 'Water')}</th><th>${t('عرض', 'View')}</th>
                    </tr></thead>
                    <tbody>${unitRows}</tbody>
                </table>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
                <button type="button" class="btn-outline mini-btn" onclick="openAccountingDepositReceiptContractWorkspace(${JSON.stringify(b0)},${JSON.stringify(u0)})">${t('فتح بيانات العقد/الحجز', 'Open contract / reservation data')}</button>
            </div>
        </div>`;
    }

    function openAccountingDepositReceiptLinkedUnitDetails(building, unit) {
        openUnitDetailsByKey(building, unit);
    }

    function openAccountingDepositReceiptContractWorkspace(building, unit) {
        const b = toStr(building);
        const u = toStr(unit);
        if (!b || !u) return;
        const unitRow = getUnitsData().find(
            (x) =>
                normalizeReservationBuildingKey(x.building) === normalizeReservationBuildingKey(b) &&
                normalizeUnit(x.unit) === normalizeUnit(u)
        );
        const payload = getSavedContractPayloadForUnit({ building: b, unit: u }) || getContractPayloadForUnit({ building: b, unit: u });
        if (getSavedContractPayloadForUnit({ building: b, unit: u })) {
            openContractFullViewModal({ building: b, unit: u });
            return;
        }
        if (payload) {
            selectedUnitDetailsRecord = unitRow || { building: b, unit: u, status: 'Rented' };
            completeTenancyDraftFromUnitDetails();
            return;
        }
        alert(t('لا توجد بيانات عقد أو حجز مرتبطة بهذا الضمان.', 'No contract or reservation data linked to this deposit.'));
    }

    function getAccountingDepositAttachmentRef(dep) {
        if (!dep) return null;
        const inlineOnDep = finalizeAccountingAttachmentRef(
            {
                name: dep.attachmentName,
                relativePath: dep.attachmentRelativePath,
                fileId: dep.attachmentFileId,
                storedOnDisk: dep.storedOnDisk
            },
            dep.reference
        );
        if (inlineOnDep) return inlineOnDep;
        const payload = getContractPayloadForUnit({ building: dep.building, unit: dep.unit });
        if (!payload) {
            const att = getDepositAttachmentFieldsForUnit(dep.building, dep.unit);
            if (att) {
                return finalizeAccountingAttachmentRef(
                    {
                        name: att.depositAttachmentName,
                        relativePath: att.depositAttachmentRelativePath,
                        fileId: att.depositAttachmentFileId,
                        storedOnDisk: att.depositStoredOnDisk
                    },
                    dep.reference
                );
            }
            return null;
        }
        if (dep.type === 'security') {
            const storeAtt = getMandatoryDocStoreFromPayload(payload).deposit_receipt;
            const inline = {
                name: payload.depositAttachmentName,
                dataUrl: payload.depositAttachmentDataUrl,
                relativePath: payload.depositAttachmentRelativePath,
                fileId: payload.depositAttachmentFileId,
                storedOnDisk: payload.depositStoredOnDisk
            };
            return finalizeAccountingAttachmentRef({ ...(storeAtt || {}), ...inline }, dep.reference);
        }
        if (dep.type === 'insurance') {
            const insRows = parsePayloadJsonArrayField(payload, 'insuranceDepositItemsJson', 'insuranceDepositItems');
            const row = insRows.find((r, i) => {
                const itemId = toStr(r.id || r.rowId || i + 1);
                return accountingDepositLinkedKey(dep.building, dep.unit, `ins_${itemId}`) === dep.linkedKey;
            });
            if (!row) return null;
            return normalizeContractAttachmentRef({
                name: row.attachmentName,
                dataUrl: row.attachmentDataUrl,
                relativePath: row.attachmentRelativePath,
                fileId: row.attachmentFileId
            });
        }
        return null;
    }

    function getMandatoryDocStoreFromPayload(payload) {
        if (!payload || typeof payload !== 'object') return {};
        try {
            const raw = JSON.parse(toStr(payload.contractMandatoryDocsJson) || '{}');
            return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
        } catch (_eMandStore) {
            return {};
        }
    }

    function getAccountingChequeAttachmentStoreKey(ch) {
        if (!ch) return '';
        if (ch.sourceType === 'vat') {
            const idx = parseInt(ch.chequeIndex, 10);
            return `vat_chq_${Number.isFinite(idx) ? idx : 0}`;
        }
        const mi = parseInt(ch.monthIndex, 10);
        return `pay_chq_${Number.isFinite(mi) ? mi : 0}`;
    }

    function finalizeAccountingAttachmentRef(att, fallbackName) {
        let norm = normalizeContractAttachmentRef(att);
        if (!norm) return null;
        if (!contractAttachmentPresent(norm) && (toStr(norm.fileId) || toStr(norm.relativePath))) {
            norm = {
                ...norm,
                storedOnDisk: !!(norm.relativePath || norm.fileId),
                name: toStr(norm.name) || toStr(fallbackName) || 'attachment'
            };
        }
        if (!contractAttachmentPresent(norm) && !toStr(norm.fileId) && !toStr(norm.relativePath)) return null;
        return norm;
    }

    function getAccountingChequeAttachmentRef(ch) {
        if (!ch) return null;
        const payload = getContractPayloadForUnit({ building: ch.building, unit: ch.unit });
        if (!payload) return null;
        const storeKey = getAccountingChequeAttachmentStoreKey(ch);
        const store = { ...getMandatoryDocStoreFromPayload(payload), ...buildAccountingChequeAttachmentStoreFromPayload(payload) };
        const storeAtt =
            getAccountingChequeAttachmentStoreKeyCandidates(ch)
                .map((k) => store[k])
                .find((att) => att && (contractAttachmentPresent(normalizeContractAttachmentRef(att)) || toStr(att.fileId) || toStr(att.relativePath))) ||
            store[storeKey] ||
            null;
        let row = null;
        if (ch.sourceType === 'vat') {
            const schedule = parsePayloadJsonArrayField(payload, 'vatChequeScheduleJson', 'vatChequeSchedule');
            const idx = ch.chequeIndex != null ? parseInt(ch.chequeIndex, 10) : null;
            row =
                schedule.find((r, i) => {
                    const ri = parseInt(r.chequeIndex || r.monthIndex, 10);
                    const riUse = Number.isFinite(ri) ? ri : i;
                    const no = toStr(r.checkNo || r.chequeNo).trim();
                    return (idx != null && riUse === idx) || (no && no === toStr(ch.chequeNo).trim());
                }) || null;
        } else {
            const schedule = parsePayloadJsonArrayField(payload, 'paymentScheduleJson', 'paymentSchedule');
            const idx = ch.monthIndex != null ? parseInt(ch.monthIndex, 10) : null;
            row =
                schedule.find((r, i) => {
                    const mi = parseInt(r.monthIndex, 10);
                    const miUse = Number.isFinite(mi) ? mi : i;
                    const no = toStr(r.checkNo || r.chequeNo).trim();
                    return (idx != null && miUse === idx) || (no && no === toStr(ch.chequeNo).trim());
                }) || null;
        }
        const merged = mergeChequeRowAttachmentFields(storeAtt || {}, row || {});
        const mergedRef = finalizeAccountingAttachmentRef(merged, ch.chequeNo);
        if (mergedRef) return mergedRef;
        for (const key of getAccountingChequeAttachmentStoreKeyCandidates(ch)) {
            const cand = finalizeAccountingAttachmentRef(store[key], ch.chequeNo);
            if (cand) return cand;
        }
        return finalizeAccountingAttachmentRef(storeAtt, ch.chequeNo);
    }

    function approveAccountingContractDepositReceipt(dep, reg, note, bankAccountId, actor, now) {
        let receiptNo = toStr(dep.reference).trim();
        if (!receiptNo) {
            receiptNo = commitNextManualVoucherNo('income');
        }
        dep.reference = receiptNo;
        dep.receiptVoucherNo = receiptNo;
        dep.status = 'held';
        dep.receiptApprovedAt = now;
        dep.receiptApprovedByName = actor.staffName;
        dep.receiptApprovalNote = note;
        dep.receiptBankAccountId = bankAccountId;
        dep.updatedAt = now;
        reg._journalLedgerDirty = true;
        try {
            applyDepositReceiptRefToContractUnits(dep.building, dep.unit, receiptNo);
        } catch (_eDepRef) {}
    }

    function applyDepositReceiptRefToContractUnits(building, unit, receiptNo) {
        const ref = toStr(receiptNo).trim();
        const b0 = toStr(building);
        const u0 = toStr(unit);
        if (!ref || !b0 || !u0) return;
        const attFields = getDepositAttachmentFieldsForUnit(b0, u0);
        const targets = [{ building: b0, unit: u0 }];
        const primaryPayload = getContractPayloadForUnit({ building: b0, unit: u0 });
        if (primaryPayload) {
            const linked = getLinkedContractUnitsFromPayload(primaryPayload);
            linked.forEach((lu) => {
                const lb = toStr(lu.building) || b0;
                const luUnit = toStr(lu.unit);
                if (luUnit) targets.push({ building: lb, unit: luUnit });
            });
        }
        const seen = new Set();
        targets.forEach(({ building: b, unit: u }) => {
            const key = normalizeReservationBuildingKey(b) + '\t' + normalizeUnit(u);
            if (seen.has(key)) return;
            seen.add(key);
            const patch = { depositReceiptRef: ref };
            if (attFields) Object.assign(patch, attFields);
            const saved = getSavedContractPayloadForUnit({ building: b, unit: u });
            if (saved) {
                const merged = { ...saved, ...patch };
                upsertSavedContractForUnit(b, u, merged, merged.contractSavedStatus || 'active');
            }
            const draftMap = loadTenancyContractDraftsMap();
            const draft = getTenancyDraftMapEntry(draftMap, b, u);
            if (draft?.payload) {
                draft.payload = { ...draft.payload, ...patch };
                draftMap[_tenancyDraftStorageKey(b, u)] = draft;
                saveTenancyContractDraftsMap(draftMap);
            }
            updateReservationDepositFieldsForUnit(b, u, patch);
        });
        try {
            repairLinkedContractUnitsLifecycleConsistency();
        } catch (_eDepRefSync) {}
        try {
            const bel = toStr(document.getElementById('buildingNo')?.value);
            const fel = toStr(document.getElementById('flatNo')?.value);
            const wsMatches =
                isContractsWorkspaceScreenActive() &&
                normalizeReservationBuildingKey(bel) === normalizeReservationBuildingKey(b0);
            if (wsMatches) {
                const wsUnits = new Set(
                    resolveLinkedContractUnitsForWorkspace({ buildingNo: b0, flatNo: u0, agreementNo: primaryPayload?.agreementNo })
                        .map((lu) => normalizeUnit(lu.unit))
                        .filter(Boolean)
                );
                wsUnits.add(normalizeUnit(u0));
                if (wsUnits.has(normalizeUnit(fel))) {
                    const el = document.getElementById('depositReceiptRef');
                    if (el) el.value = ref;
                    if (attFields) {
                        try {
                            syncContractDepositFieldsFromAccountingToDom({
                                buildingNo: bel,
                                flatNo: fel,
                                depositReceiptRef: ref,
                                ...attFields
                            });
                        } catch (_eDomAtt) {}
                    }
                    try {
                        applyContractDepositAttachmentFieldLock();
                    } catch (_eDomLock) {}
                    if (contractAdditionalDataMode) {
                        try {
                            applyContractAdditionalDataFieldLocks();
                        } catch (_eReGap) {}
                    }
                }
            }
            if (
                !wsMatches &&
                normalizeReservationBuildingKey(bel) === normalizeReservationBuildingKey(b0) &&
                normalizeUnit(fel) === normalizeUnit(u0)
            ) {
                const el = document.getElementById('depositReceiptRef');
                if (el) el.value = ref;
            }
            if (
                isReservationsWorkspaceScreenActive() &&
                normalizeReservationBuildingKey(resFormVal('buildingNo')) === normalizeReservationBuildingKey(b0) &&
                normalizeUnit(resFormVal('flatNo')) === normalizeUnit(u0)
            ) {
                resFormSet('depositReceiptRef', ref);
            }
        } catch (_eDomRef) {}
        try {
            const raw = localStorage.getItem('bhd_contract_full');
            if (raw) {
                const full = JSON.parse(raw);
                if (
                    full &&
                    normalizeReservationBuildingKey(full.buildingNo) === normalizeReservationBuildingKey(b0) &&
                    normalizeUnit(full.flatNo) === normalizeUnit(u0)
                ) {
                    full.depositReceiptRef = ref;
                    localStorage.setItem('bhd_contract_full', JSON.stringify(full));
                }
            }
        } catch (_eFullRef) {}
    }

    function approveAccountingContractChequeReceipt(ch, note, bankAccountId, actor, now, privateNoteOpt) {
        const prevStatus = ch.status;
        const privateNote = toStr(privateNoteOpt ?? ch.receiptPrivateNote).trim();
        const actionNote = privateNote
            ? `${note}\n\n[${t('ملاحظة خاصة', 'Private note')}: ${privateNote}]`
            : note;
        ch.status = 'pending';
        appendAccountingChequeAction(ch, {
            actionDate: getCurrentAccountingActionDate(),
            actionType: 'receipt_confirmed',
            previousStatus: prevStatus,
            newStatus: ch.status,
            actionNote,
            reason: '',
            bankAccountId
        });
        ch.receiptApprovedAt = now;
        ch.receiptApprovedByName = actor.staffName;
        ch.receiptBankAccountId = bankAccountId;
        ch.receiptApprovalNote = note;
        ch.receiptPrivateNote = privateNote;
        ch.receiptReviewChecked = false;
        ch.updatedAt = now;
    }

    function rejectAccountingContractDepositReceipt(dep, note, actor, now) {
        dep.status = 'receipt_rejected';
        dep.receiptRejectedAt = now;
        dep.receiptRejectedByName = actor.staffName;
        dep.receiptRejectionNote = note;
        dep.updatedAt = now;
    }

    function rejectAccountingContractChequeReceipt(ch, note, actor, now) {
        const prevStatus = ch.status;
        ch.status = 'receipt_rejected';
        appendAccountingChequeAction(ch, {
            actionDate: getCurrentAccountingActionDate(),
            actionType: 'receipt_rejected',
            previousStatus: prevStatus,
            newStatus: ch.status,
            actionNote: note,
            reason: ''
        });
        ch.receiptRejectedAt = now;
        ch.receiptRejectedByName = actor.staffName;
        ch.receiptReviewChecked = false;
        ch.updatedAt = now;
    }

    function finalizeAccountingContractReceiptSideEffects(building, unit, ref, decision, note) {
        const reg = loadAccountingRegistry();
        const unitKey = accountingUnitKey(building, unit);
        recomputeAccountingAccountSummary(reg, unitKey);
        reg._journalLedgerDirty = true;
        saveAccountingRegistry(reg, { deferJournalRebuild: true });
        mirrorAccountingStatusToContractPayload(building, unit);
        refreshContractLifecycleAfterAccountingApproval(building, unit);
        recordSystemActivity({
            actionKey: decision === 'approve' ? 'accounting_contract_receipt_approved' : 'accounting_contract_receipt_rejected',
            actionAr: decision === 'approve' ? 'اعتماد استلام ضمان/شيك عقد' : 'رفض استلام ضمان/شيك عقد',
            actionEn: decision === 'approve' ? 'Contract deposit/cheque receipt approved' : 'Contract deposit/cheque receipt rejected',
            building,
            unit,
            ref,
            note
        });
        if (isAccountingContractReceiptModalOpen()) {
            _accountingWorkspaceRenderPending = true;
        } else {
            renderAccountingWorkspace();
        }
        scheduleAccountingJournalRebuild(reg, true);
        try {
            refreshContractsAccountingReceiptPrintUi();
        } catch (_eCrCw) {}
        try {
            if (selectedUnitDetailsRecord) refreshUnitDetailsAccountingReceiptPrintUi(selectedUnitDetailsRecord);
        } catch (_eCrUd) {}
    }

    function setBankAccountAsDefault(id) {
        if (!effectivePermission('manage_accounting')) return;
        const reg = loadAccountingRegistry();
        const ba = getBankAccountById(id);
        if (!ba) return;
        (reg.bankAccounts || []).forEach((b) => {
            if (toStr(b.ownerName) === toStr(ba.ownerName)) b.isDefault = b.id === id;
        });
        saveAccountingRegistry(reg);
        renderAccountingWorkspace();
    }

    function canWaiveChequePenalty() {
        const u = getLoggedInUser();
        if (!u) return false;
        if (u.role === 'system_admin') return true;
        return effectivePermission('waive_cheque_penalty');
    }

    function canManageChartOfAccounts() {
        if (!getLoggedInUser()) return false;
        if (getLoggedInUser().role === 'system_admin') return true;
        return effectivePermission('manage_coa') || effectivePermission('manage_accounting');
    }

    function loadAccountingRegistry(forceReload) {
        try {
            const raw = localStorage.getItem(ACCOUNTING_REGISTRY_KEY);
            if (!forceReload && _accountingRegistryCache && raw === _accountingRegistryCacheRaw) {
                return _accountingRegistryCache;
            }
            const o = raw ? JSON.parse(raw) : null;
            if (!o || typeof o !== 'object') {
                _accountingRegistryCache = emptyAccountingRegistry();
                _accountingRegistryCacheRaw = raw;
                return _accountingRegistryCache;
            }
            const reg = {
                version: o.version || 1,
                accounts: o.accounts && typeof o.accounts === 'object' ? o.accounts : {},
                cheques: Array.isArray(o.cheques) ? o.cheques.map(normalizeAccountingCheque) : [],
                entries: Array.isArray(o.entries) ? o.entries : [],
                deposits: Array.isArray(o.deposits) ? o.deposits : [],
                invoices: Array.isArray(o.invoices) ? o.invoices : [],
                bankAccounts: Array.isArray(o.bankAccounts) ? o.bankAccounts : [],
                chartOfAccounts: Array.isArray(o.chartOfAccounts) ? o.chartOfAccounts : [],
                settings: o.settings && typeof o.settings === 'object' ? o.settings : defaultAccountingSettings(),
                branches: Array.isArray(o.branches) ? o.branches : [],
                costCenters: Array.isArray(o.costCenters) ? o.costCenters : [],
                projects: Array.isArray(o.projects) ? o.projects : [],
                employees: Array.isArray(o.employees) ? o.employees : [],
                payrollRuns: Array.isArray(o.payrollRuns) ? o.payrollRuns : [],
                inventoryItems: Array.isArray(o.inventoryItems) ? o.inventoryItems : [],
                warehouses: Array.isArray(o.warehouses) ? o.warehouses : [],
                stockMovements: Array.isArray(o.stockMovements) ? o.stockMovements : [],
                openingBalances: Array.isArray(o.openingBalances) ? o.openingBalances : [],
                bankTransfers: Array.isArray(o.bankTransfers) ? o.bankTransfers : [],
                journals: [],
                journalLedgerVersion: o.journalLedgerVersion || 0
            };
            ensureChartOfAccounts(reg);
            migrateChartOfAccounts(reg);
            ensureAccountingRegistryExtensions(reg);
            getAccountingSettings(reg);
            reg._journalLedgerDirty = true;
            if (ensureReceiptAllocationNotesBackfill(reg)) {
                try {
                    saveAccountingRegistry(reg, { silent: true });
                } catch (_eBackfillSave) {}
            }
            _accountingRegistryCache = reg;
            _accountingRegistryCacheRaw = raw;
            scheduleAccountingJournalRebuild(reg, false);
            return reg;
        } catch (_eAcctLoad) {
            _accountingRegistryCache = emptyAccountingRegistry();
            _accountingRegistryCacheRaw = null;
            return _accountingRegistryCache;
        }
    }

    function isStorageQuotaError(err) {
        if (!err) return false;
        return err.name === 'QuotaExceededError' || err.code === 22 || /quota/i.test(toStr(err.message));
    }

    /** القيود تُعاد بناؤها عند التحميل — لا نخزّن نسخة مكررة على القرص لتقليل الحجم */
    function slimAccountingRegistryForStorage(reg) {
        const entries = (reg.entries || []).map((e) => {
            if (!e || !Array.isArray(e.journalLines) || !e.journalLines.length) return e;
            if (e.payrollEmployeeId) return e;
            const copy = { ...e };
            delete copy.journalLines;
            return copy;
        });
        return { ...reg, journals: [], entries };
    }

    function trimAccountingRegistryForQuota(reg) {
        const entries = (reg.entries || []).map((e) => {
            if (!e) return e;
            const copy = { ...e };
            if (Array.isArray(copy.approvalHistory) && copy.approvalHistory.length > 40) {
                copy.approvalHistory = copy.approvalHistory.slice(-40);
            }
            if (copy.pendingRequest?.revision) {
                copy.pendingRequest = { ...copy.pendingRequest };
                delete copy.pendingRequest.revision;
            }
            delete copy.journalLines;
            return copy;
        });
        const cheques = (reg.cheques || []).map((ch) => {
            if (!ch || !Array.isArray(ch.actions) || ch.actions.length <= 50) return ch;
            return { ...ch, actions: ch.actions.slice(-50) };
        });
        return { ...reg, entries, cheques, journals: [] };
    }

    function saveAccountingRegistry(reg, opts) {
        const options = opts || {};
        if (_accountingRegistrySaving) return false;
        _accountingRegistrySaving = true;
        try {
            const payload = reg || emptyAccountingRegistry();
            if (options.skipJournalRebuild) {
                payload._journalLedgerDirty = true;
            } else {
                try {
                    if (options.deferJournalRebuild && isAccountingContractReceiptModalOpen()) {
                        payload._journalLedgerDirty = true;
                    } else {
                        ensureAccountingJournalLedger(payload, true);
                    }
                } catch (eRebuild) {
                    console.error('ensureAccountingJournalLedger on save', eRebuild);
                }
            }
            let slim = slimAccountingRegistryForStorage(payload);
            let json = JSON.stringify(slim);
            bhdAuditMute();
            try {
                localStorage.setItem(ACCOUNTING_REGISTRY_KEY, json);
            } catch (eSet) {
                if (isStorageQuotaError(eSet)) {
                    slim = trimAccountingRegistryForQuota(slim);
                    json = JSON.stringify(slim);
                    localStorage.setItem(ACCOUNTING_REGISTRY_KEY, json);
                } else {
                    throw eSet;
                }
            } finally {
                bhdAuditUnmute();
            }
            _accountingRegistryCache = payload;
            _accountingRegistryCacheRaw = json;
            scheduleBhdKvToServer();
            scheduleBhdCloudDataPush();
            if (payload._journalLedgerDirty && !options.skipJournalRebuild) {
                scheduleAccountingJournalRebuild(payload, !options.deferJournalRebuild);
            }
            return true;
        } catch (eAcctSave) {
            console.error('saveAccountingRegistry', eAcctSave);
            if (!options.silent) {
                const quota = isStorageQuotaError(eAcctSave);
                alert(
                    quota
                        ? t(
                              'تعذّر حفظ بيانات المحاسبة — مساحة التخزين المحلي ممتلئة. جرّب حذف مرفقات العقود القديمة أو تنظيف التخزين من الإعدادات، ثم أعد المحاولة.',
                              'Could not save accounting data — local storage is full. Try removing old contract attachments or clearing storage from settings, then retry.'
                          )
                        : t(
                              'تعذّر حفظ بيانات المحاسبة. راجع وحدة التحكم (Console) للتفاصيل.',
                              'Could not save accounting data. See the browser console for details.'
                          )
                );
            }
            return false;
        } finally {
            _accountingRegistrySaving = false;
        }
    }

    function accountingUnitKey(building, unit) {
        return `${toStr(building)}\t${toStr(unit)}`;
    }

    function normalizeAccountingCheque(c) {
        if (!c || typeof c !== 'object') return c;
        if (!Array.isArray(c.actions)) c.actions = [];
        if (!Array.isArray(c.paymentHistory)) c.paymentHistory = [];
        if (!toStr(c.originalDueDate)) c.originalDueDate = toStr(c.dueDate);
        if (c.deferred == null) c.deferred = toStr(c.status) === 'deferred';
        return c;
    }

    function accountingTenantKey(tenant, agreementNo) {
        return `${toStr(agreementNo).trim()}|${toStr(tenant).trim()}`;
    }

    function accountingActionTypeLabel(type) {
        const map = {
            bank_deposit: t('إيداع بنكي', 'Bank deposit'),
            bounced: t('ارتجاع بنكي', 'Bounced'),
            tenant_contact: t('تواصل مع المستأجر', 'Tenant contact'),
            defer: t('تأجيل', 'Defer'),
            cash_convert: t('تحويل نقداً', 'Cash conversion'),
            status_change: t('تغيير حالة', 'Status change'),
            reschedule: t('إعادة جدولة', 'Reschedule'),
            receipt_confirmed: t('اعتماد استلام الشيك', 'Cheque receipt confirmed'),
            receipt_rejected: t('رفض استلام الشيك', 'Cheque receipt rejected'),
            other: t('أخرى', 'Other')
        };
        return map[toStr(type)] || toStr(type) || '—';
    }

    function formatAccountingDisplayDate(ymdOrIso) {
        const s = toStr(ymdOrIso);
        if (!s) return '—';
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
        return s.slice(0, 16).replace('T', ' ');
    }

    function getCurrentAccountingActionDate() {
        const el = document.getElementById('acctActionDateInput');
        return toStr(el?.value) || new Date().toISOString().slice(0, 10);
    }

    function appendAccountingChequeAction(cheque, actionData) {
        if (!cheque) return;
        const actor = getCurrentActorLedgerRecord();
        const act = {
            id: newAccountingId('act'),
            at: new Date().toISOString(),
            actionDate: toStr(actionData.actionDate) || getCurrentAccountingActionDate(),
            actionType: toStr(actionData.actionType) || 'status_change',
            previousStatus: toStr(actionData.previousStatus),
            newStatus: toStr(actionData.newStatus),
            previousDueDate: toStr(actionData.previousDueDate),
            newDueDate: toStr(actionData.newDueDate),
            actionNote: toStr(actionData.actionNote),
            reason: toStr(actionData.reason),
            paidAmount: actionData.paidAmount != null ? parseFloat(actionData.paidAmount) || 0 : null,
            bankAccountId: toStr(actionData.bankAccountId) || '',
            cashAmount: actionData.cashAmount != null ? parseFloat(actionData.cashAmount) || 0 : null,
            penaltyAmount: actionData.penaltyAmount != null ? parseFloat(actionData.penaltyAmount) || 0 : null,
            penaltyWaived: !!actionData.penaltyWaived,
            penaltyEntryId: toStr(actionData.penaltyEntryId) || '',
            invoiceId: toStr(actionData.invoiceId) || '',
            invoiceNo: toStr(actionData.invoiceNo) || '',
            actorName: actor.staffName,
            actorUserId: actor.staffUserId
        };
        if (!Array.isArray(cheque.actions)) cheque.actions = [];
        cheque.actions.push(act);
        cheque.lastActionAt = act.at;
        cheque.lastActionDate = act.actionDate;
        cheque.lastActionType = act.actionType;
        return act;
    }

    function ownerKeyFromAddressBookName(name) {
        return `owner|${toStr(name)}`;
    }

    function getAddressBookOwnersForBankAccounts() {
        const seen = new Set();
        return collectAddressBookRowsFromSystem()
            .filter((r) => r.type === 'owner' && toStr(r.name))
            .filter((r) => {
                if (seen.has(r.name)) return false;
                seen.add(r.name);
                return true;
            });
    }

    function getBankAccounts(activeOnly) {
        const reg = loadAccountingRegistry();
        let list = Array.isArray(reg.bankAccounts) ? reg.bankAccounts : [];
        if (activeOnly) list = list.filter((b) => b.active !== false);
        return list.slice().sort((a, b) => toStr(a.ownerName).localeCompare(toStr(b.ownerName), 'ar'));
    }

    function getBankAccountById(id) {
        return getBankAccounts(false).find((b) => b.id === id) || null;
    }

    function bankAccountLabel(ba) {
        if (!ba) return '—';
        const label = toStr(ba.label);
        const bank = toStr(ba.bankName);
        const acc = toStr(ba.accountNo);
        if (label) return `${label} — ${bank} ${acc}`.trim();
        return [bank, acc].filter(Boolean).join(' — ') || '—';
    }

    function renderBankAccountSelectOptions(selectedId, ownerNameOpt) {
        const accounts = getBankAccounts(true);
        if (!accounts.length) {
            return `<option value="">${t('— لا توجد حسابات — أضف من تبويب الحسابات البنكية', '— No accounts — add under Bank accounts tab')}</option>`;
        }
        let sel = toStr(selectedId);
        if (!sel && ownerNameOpt) {
            const def = getDefaultBankAccountForOwner(ownerNameOpt);
            if (def) sel = def.id;
        }
        return `<option value="">—</option>${accounts.map((ba) =>
            `<option value="${escHtml(ba.id)}"${ba.id === sel ? ' selected' : ''}>${escHtml(bankAccountLabel(ba))}${ba.ownerName ? ` · ${escHtml(ba.ownerName)}` : ''}${ba.isDefault ? ` ★` : ''}</option>`
        ).join('')}`;
    }

    function accountingActionTypeIcon(type) {
        const map = {
            bank_deposit: '🏦',
            bounced: '↩️',
            tenant_contact: '📞',
            defer: '⏳',
            cash_convert: '💵',
            reschedule: '📅',
            status_change: '🔄',
            other: '📝'
        };
        return map[toStr(type)] || '•';
    }

    function renderAccountingChequeTimelineItem(a) {
        const bankLbl = a.bankAccountId ? getBankAccountById(a.bankAccountId) : null;
        const penaltyLine = a.penaltyAmount != null && parseFloat(a.penaltyAmount) > 0
            ? `<div style="margin-top:4px"><small style="color:#c62828">⚠️ ${t('غرامة', 'Penalty')}: ${escHtml(summaryAmtOm(a.penaltyAmount))}${a.penaltyWaived ? ` (${t('مُعفاة/مُخفّضة', 'waived/reduced')})` : ''}</small></div>`
            : '';
        const invLine = a.invoiceId
            ? `<div style="margin-top:4px"><small style="color:#1565c0">🧾 ${t('فاتورة', 'Invoice')}: ${escHtml(a.invoiceNo || a.invoiceId)}</small></div>`
            : '';
        const bankLine = bankLbl
            ? `<div style="margin-top:4px"><small>🏦 ${escHtml(bankAccountLabel(bankLbl))}</small></div>`
            : '';
        const statusChange = a.previousStatus !== a.newStatus && a.newStatus
            ? `<div><small>${escHtml(accountingChequeStatusLabel(a.previousStatus))} → <strong>${escHtml(accountingChequeStatusLabel(a.newStatus))}</strong></small></div>`
            : '';
        const dueChange = a.previousDueDate || a.newDueDate
            ? `<div><small>📅 ${t('الاستحقاق', 'Due')}: ${escHtml(a.previousDueDate || '—')} → ${escHtml(a.newDueDate || '—')}</small></div>`
            : '';
        const cashLine = a.cashAmount != null && parseFloat(a.cashAmount) > 0
            ? `<div><small>💵 ${escHtml(summaryAmtOm(a.cashAmount))}</small></div>`
            : '';
        return `<div class="acct-timeline-step">
            <div class="acct-timeline-step-icon">${accountingActionTypeIcon(a.actionType)}</div>
            <div class="acct-timeline-step-body">
                <div class="acct-timeline-step-head">
                    <strong>${escHtml(accountingActionTypeLabel(a.actionType))}</strong>
                    <span class="acct-timeline-step-date">${escHtml(formatAccountingDisplayDate(a.actionDate || a.at))}</span>
                </div>
                ${statusChange}${dueChange}${cashLine}${bankLine}${penaltyLine}${invLine}
                ${a.actionNote ? `<div class="acct-timeline-note">${escHtml(a.actionNote)}</div>` : ''}
                ${a.reason ? `<div class="acct-timeline-reason"><em>${t('السبب', 'Reason')}: ${escHtml(a.reason)}</em></div>` : ''}
                <small style="color:#888">👤 ${escHtml(a.actorName || '—')}</small>
            </div>
        </div>`;
    }

    function renderAccountingChequeTimelineHtml(cheque) {
        const acts = Array.isArray(cheque?.actions) ? cheque.actions.slice() : [];
        if (!acts.length) {
            return `<p class="acct-timeline-empty">${t('لا توجد عمليات بعد — أضف أول إجراء من اللوحة.', 'No actions yet — add the first action from the panel.')}</p>`;
        }
        return `<div class="acct-cheque-timeline">${acts.slice().reverse().map((a) => renderAccountingChequeTimelineItem(a)).join('')}</div>`;
    }

    function createBouncePenaltyEntry(reg, cheque, actionDate, amount, fixedAmount, actionId) {
        const linkedKey = `penalty|bounce|${cheque.linkedKey}|${actionId || actionDate}`;
        if (reg.entries.some((e) => e.linkedKey === linkedKey)) return reg.entries.find((e) => e.linkedKey === linkedKey);
        const entry = {
            id: newAccountingId('ent'),
            unitKey: cheque.unitKey,
            building: cheque.building,
            unit: cheque.unit,
            linkedKey,
            sourceKey: cheque.chequeNo,
            type: 'income',
            title: t(`غرامة ارتجاع شيك ${cheque.chequeNo || ''}`, `Bounced cheque penalty ${cheque.chequeNo || ''}`),
            amount: parseFloat(amount) || 0,
            dueDate: actionDate,
            status: 'pending_accountant',
            coaAccountId: 'coa_414',
            agreementNo: cheque.agreementNo,
            tenant: cheque.tenant,
            penaltyKind: 'bounce',
            chequeId: cheque.id,
            penaltyFixedAmount: getBouncePenaltyFixedAmount(fixedAmount),
            penaltyOriginalAmount: parseFloat(amount) || 0,
            penaltyWaived: false,
            penaltyWaiveReason: '',
            updatedAt: new Date().toISOString()
        };
        reg.entries.push(entry);
        return entry;
    }

    function createCashPaymentEntryAndInvoice(reg, cheque, cashAmount, actionDate, actionNote) {
        const amt = parseFloat(cashAmount) || 0;
        if (amt <= 0) return { entry: null, invoice: null };
        const entry = {
            id: newAccountingId('ent'),
            unitKey: cheque.unitKey,
            building: cheque.building,
            unit: cheque.unit,
            linkedKey: `cash|cheque|${cheque.id}|${actionDate}`,
            sourceKey: cheque.chequeNo,
            type: 'income',
            title: t(`دفع نقدي — شيك ${cheque.chequeNo || ''}`, `Cash payment — cheque ${cheque.chequeNo || ''}`),
            amount: amt,
            dueDate: actionDate,
            status: 'confirmed',
            agreementNo: cheque.agreementNo,
            tenant: cheque.tenant,
            chequeId: cheque.id,
            updatedAt: new Date().toISOString()
        };
        reg.entries.push(entry);
        const actor = getCurrentActorLedgerRecord();
        const inv = {
            id: newAccountingId('inv'),
            entryIds: [entry.id],
            unitKey: cheque.unitKey,
            building: cheque.building,
            unit: cheque.unit,
            agreementNo: cheque.agreementNo,
            tenant: cheque.tenant,
            total: parseFloat(amt.toFixed(3)),
            status: 'approved',
            createdAt: new Date().toISOString(),
            approvedAt: new Date().toISOString(),
            approvedBy: actor.staffName,
            invoiceNo: `INV-${Date.now().toString().slice(-8)}`,
            note: toStr(actionNote)
        };
        reg.invoices.push(inv);
        entry.status = 'invoiced';
        return { entry, invoice: inv };
    }

    function onAcctActionTypeChange() {
        const ty = toStr(document.getElementById('acctActType')?.value) || 'other';
        const setVis = (id, on) => {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('hidden', !on);
        };
        setVis('acctFieldBank', ty === 'bank_deposit');
        setVis('acctFieldNewDue', ty === 'defer' || ty === 'reschedule');
        setVis('acctFieldReason', ['defer', 'reschedule', 'bounced', 'tenant_contact', 'bank_deposit'].includes(ty));
        setVis('acctFieldPenalty', ty === 'bounced');
        setVis('acctFieldCash', ty === 'cash_convert');
        setVis('acctFieldStatus', ty === 'status_change' || ty === 'other');
        const bounceAmt = parseFloat(document.getElementById('acctPenaltyAmount')?.value);
        const ctx = _accountingChequeActionCtx;
        if (ctx?.chequeId && ty === 'bounced') {
            const preview = document.getElementById('acctPenaltyPreview');
            if (preview) {
                const amt = getBouncePenaltyFixedAmount(
                    Number.isFinite(bounceAmt) ? bounceAmt : getDefaultBouncePenaltyAmount()
                );
                preview.textContent = t(
                    `سيتم احتساب غرامة تلقائية بمبلغ ثابت: ${summaryAmtOm(amt)}`,
                    `Auto fixed penalty: ${summaryAmtOm(amt)}`
                );
                preview.style.display = amt > 0 ? '' : 'none';
            }
        }
        document.querySelectorAll('.acct-action-type-chip').forEach((btn) => {
            btn.classList.toggle('active', btn.getAttribute('data-act-type') === ty);
        });
    }

    function setAcctActionType(type) {
        const sel = document.getElementById('acctActType');
        if (sel) sel.value = type;
        onAcctActionTypeChange();
    }

    function buildAccountingChequeWorkspaceHtml(ch, presetType) {
        const overdue = isAccountingChequeOverdue(ch);
        const st = toStr(ch.status) || 'pending';
        const initialType = presetType === 'defer' ? 'defer' : (presetType || 'tenant_contact');
        const settings = getAccountingSettings();
        const bounceAmt = getDefaultBouncePenaltyAmount(settings);
        const ownerForBank = resolveOwnerNameForBuilding(ch.building);
        const defaultBankId = resolveDefaultBankAccountIdForCheque(ch);
        const actionChips = ACCOUNTING_ACTION_TYPES.map((k) =>
            `<button type="button" class="acct-action-type-chip${k === initialType ? ' active' : ''}" data-act-type="${escHtml(k)}" onclick="setAcctActionType('${escHtml(k)}')">${accountingActionTypeIcon(k)} ${escHtml(accountingActionTypeLabel(k))}</button>`
        ).join('');
        return `
            <div class="acct-cheque-hero">
                <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px">
                    <span class="bhd-task-no-badge">💳 ${escHtml(ch.chequeNo || '—')}</span>
                    ${accountingChequeStatusChip(st, overdue)}
                    <span class="bhd-task-pill src-cheque">${escHtml(ch.sourceType === 'vat' ? t('ضريبة', 'VAT') : t('إيجار', 'Rent'))}</span>
                </div>
                <div style="font-size:12px;color:#445;line-height:1.55">
                    <strong>${escHtml(ch.building)} / ${escHtml(ch.unit)}</strong> · ${escHtml(ch.tenant || '—')} · ${t('عقد', 'Agreement')}: ${escHtml(ch.agreementNo || '—')}<br>
                    📅 ${t('الاستحقاق', 'Due')}: <strong>${escHtml(ch.dueDate || '—')}</strong>
                    ${ch.originalDueDate && ch.originalDueDate !== ch.dueDate ? ` <small>(${t('أصلي', 'Orig')}: ${escHtml(ch.originalDueDate)})</small>` : ''}
                    · 💵 <strong>${escHtml(summaryAmtOm(ch.amount))}</strong>
                </div>
            </div>
            <div class="acct-cheque-workspace">
                <div>
                    <h5 style="margin:0 0 8px;font-size:13px">📜 ${t('سجل العمليات / Operations log', 'Operations log / سجل العمليات')} <small style="color:#888">(${(ch.actions || []).length})</small></h5>
                    <div id="acctChequeTimelineHost">${renderAccountingChequeTimelineHtml(ch)}</div>
                    <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
                        <button type="button" class="btn-outline mini-btn" onclick="printAccountingChequeMovementReport('${escHtml(ch.id)}')">🖨️ ${t('طباعة', 'Print')}</button>
                    </div>
                </div>
                <div class="acct-action-form-panel">
                    <h5 style="margin:0 0 8px;font-size:13px">➕ ${t('إضافة إجراء / Add action', 'Add action / إضافة')}</h5>
                    <div class="acct-action-type-grid">${actionChips}</div>
                    <input type="hidden" id="acctActType" value="${escHtml(initialType)}">
                    <div class="acct-act-field">
                        <label>${t('تاريخ الإجراء / Action date', 'Action date / التاريخ')}</label>
                        <input type="date" id="acctActDate" value="${new Date().toISOString().slice(0, 10)}">
                    </div>
                    <div class="acct-act-field" id="acctFieldBank">
                        <label>${t('الحساب البنكي / Bank account', 'Bank account / حساب بنكي')}</label>
                        <select id="acctActBankAccount">${renderBankAccountSelectOptions(defaultBankId, ownerForBank)}</select>
                    </div>
                    <div class="acct-act-field hidden" id="acctFieldNewDue">
                        <label>${t('تاريخ استحقاق جديد / New due date', 'New due date / تاريخ جديد')}</label>
                        <input type="date" id="acctActNewDue" value="${escHtml(ch.dueDate || '')}">
                    </div>
                    <div class="acct-act-field" id="acctFieldReason">
                        <label>${t('السبب / Reason', 'Reason / السبب')}</label>
                        <textarea id="acctActReason" rows="2" placeholder="${t('مثال: طلب المستأجر التأجيل', 'e.g. Tenant deferral request')}"></textarea>
                    </div>
                    <div class="acct-act-field hidden" id="acctFieldPenalty">
                        <label>${t('مبلغ الغرامة / Penalty amount', 'Penalty amount / مبلغ الغرامة')}</label>
                        <input type="number" id="acctPenaltyAmount" min="0" step="0.001" value="${bounceAmt}" oninput="onAcctActionTypeChange()">
                        <div class="acct-penalty-preview" id="acctPenaltyPreview" style="display:none;margin-top:6px"></div>
                    </div>
                    <div class="acct-act-field hidden" id="acctFieldCash">
                        <label>${t('المبلغ النقدي / Cash amount', 'Cash amount / المبلغ')}</label>
                        <input type="number" id="acctActCashAmount" min="0" step="0.001" value="${parseFloat(ch.amount) || 0}">
                        <label style="display:flex;align-items:center;gap:6px;margin-top:6px;font-weight:600">
                            <input type="checkbox" id="acctActIssueInvoice" checked>
                            ${t('إصدار فاتورة تلقائياً / Auto-issue invoice', 'Auto-issue invoice / فاتورة')}
                        </label>
                    </div>
                    <div class="acct-act-field hidden" id="acctFieldStatus">
                        <label>${t('حالة جديدة / New status', 'New status / حالة')}</label>
                        <select id="acctActStatus">
                            <option value="">—</option>
                            ${ACCOUNTING_CHEQUE_STATUSES.map((s) => `<option value="${s}">${escHtml(accountingChequeStatusLabel(s))}</option>`).join('')}
                        </select>
                    </div>
                    <div class="acct-act-field">
                        <label>${t('ما تم / Details', 'Details / ما تم')}</label>
                        <textarea id="acctActNote" rows="2" placeholder="${t('تفاصيل العملية...', 'Action details...')}"></textarea>
                    </div>
                    <button type="button" class="btn-primary" style="width:100%" onclick="submitAccountingChequeDeferOrAction(true)">✅ ${t('إضافة الإجراء / Add action', 'Add action / إضافة')}</button>
                </div>
            </div>`;
    }

    function refreshAccountingChequeActionModal() {
        const ctx = _accountingChequeActionCtx;
        if (!ctx?.chequeId) return;
        const reg = loadAccountingRegistry();
        const ch = reg.cheques.find((c) => c.id === ctx.chequeId);
        const body = document.getElementById('accountingChequeActionBody');
        if (!ch || !body) return;
        if (ctx.mode === 'detail') {
            body.innerHTML = buildAccountingChequeDetailBodyHtml(ch);
        } else {
            body.innerHTML = buildAccountingChequeWorkspaceHtml(ch, ctx.presetType || ctx.mode);
            onAcctActionTypeChange();
        }
    }

    function saveAccountingPenaltySettingsFromForm() {
        if (!effectivePermission('manage_accounting')) return;
        const reg = loadAccountingRegistry();
        getAccountingSettings(reg);
        reg.settings.penalties.autoPenaltyOnBounce = !!document.getElementById('acctSetAutoPenalty')?.checked;
        reg.settings.penalties.bounceFixedAmount = getBouncePenaltyFixedAmount(
            document.getElementById('acctSetBounceAmount')?.value
        ) || getDefaultBouncePenaltyAmount(reg.settings);
        saveAccountingRegistry(reg);
        alert(t('تم حفظ إعدادات الغرامات.', 'Penalty settings saved.'));
        renderAccountingWorkspace();
    }

    function saveBankAccountFromForm() {
        if (!effectivePermission('manage_accounting')) return;
        const bankName = toStr(document.getElementById('bankAcctBankName')?.value);
        const accountNo = toStr(document.getElementById('bankAcctAccountNo')?.value);
        const ownerName = toStr(document.getElementById('bankAcctOwner')?.value);
        if (!bankName || !accountNo || !ownerName) {
            alert(t('أدخل اسم البنك ورقم الحساب والمالك.', 'Enter bank name, account no., and owner.'));
            return;
        }
        const reg = loadAccountingRegistry();
        if (!Array.isArray(reg.bankAccounts)) reg.bankAccounts = [];
        const editId = toStr(document.getElementById('bankAcctEditId')?.value);
        const payload = {
            id: editId || newAccountingId('bank'),
            label: toStr(document.getElementById('bankAcctLabel')?.value),
            bankName,
            accountNo,
            iban: toStr(document.getElementById('bankAcctIban')?.value),
            ownerKey: ownerKeyFromAddressBookName(ownerName),
            ownerName,
            currency: 'OMR',
            active: document.getElementById('bankAcctActive')?.checked !== false,
            isDefault: !!document.getElementById('bankAcctDefault')?.checked,
            notes: toStr(document.getElementById('bankAcctNotes')?.value),
            statementBalance: parseFloat(document.getElementById('bankAcctStatementBalance')?.value) || 0,
            updatedAt: new Date().toISOString()
        };
        const ownerAccounts = (reg.bankAccounts || []).filter((b) => toStr(b.ownerName) === ownerName && b.id !== payload.id);
        if (!ownerAccounts.length) payload.isDefault = true;
        if (payload.isDefault) {
            (reg.bankAccounts || []).forEach((b) => {
                if (toStr(b.ownerName) === ownerName) b.isDefault = false;
            });
        }
        const idx = reg.bankAccounts.findIndex((b) => b.id === payload.id);
        if (idx >= 0) reg.bankAccounts[idx] = { ...reg.bankAccounts[idx], ...payload };
        else reg.bankAccounts.push(payload);
        try {
            ensureCoaForBankAccount(reg.bankAccounts.find((b) => b.id === payload.id) || payload, reg);
        } catch (_eCoaBank) {}
        saveAccountingRegistry(reg);
        renderAccountingWorkspace();
    }

    function editBankAccount(id) {
        const ba = getBankAccountById(id);
        if (!ba) return;
        _accountingUiState.tab = 'bankAccounts';
        renderAccountingWorkspace();
        setTimeout(() => {
            const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val; };
            set('bankAcctEditId', ba.id);
            set('bankAcctLabel', ba.label || '');
            set('bankAcctBankName', ba.bankName || '');
            set('bankAcctAccountNo', ba.accountNo || '');
            set('bankAcctIban', ba.iban || '');
            set('bankAcctOwner', ba.ownerName || '');
            set('bankAcctNotes', ba.notes || '');
            set('bankAcctStatementBalance', ba.statementBalance != null ? ba.statementBalance : '');
            const act = document.getElementById('bankAcctActive');
            if (act) act.checked = ba.active !== false;
            const def = document.getElementById('bankAcctDefault');
            if (def) def.checked = !!ba.isDefault;
        }, 50);
    }

    function deleteBankAccount(id) {
        if (!effectivePermission('manage_accounting')) return;
        if (!confirm(t('حذف هذا الحساب البنكي؟', 'Delete this bank account?'))) return;
        const reg = loadAccountingRegistry();
        reg.bankAccounts = (reg.bankAccounts || []).filter((b) => b.id !== id);
        const coaId = `coa_bank_${id}`;
        reg.chartOfAccounts = (reg.chartOfAccounts || []).filter((a) => a.id !== coaId);
        saveAccountingRegistry(reg);
        renderAccountingWorkspace();
    }

    let _accountingManualEntryKind = 'income';
    let _manualEntryEditEntryId = '';
    let _manualEntryEditMode = '';
    let _accountingApprovalEntryId = '';
    let _manualEntryAllocState = { items: [], pool: [], mode: 'note' };
    let _manualEntryPartyState = { contactKey: '', building: '', unit: '', partyName: '' };
    let _manualEntryClientComboDocBound = false;

    function manualAbContactKey(row) {
        return `${toStr(row?.type)}|${toStr(row?.name)}`;
    }

    function collectAddressBookContactsForAccounting() {
        const seen = new Set();
        const rows = [];
        const push = (r) => {
            if (!toStr(r?.name)) return;
            const key = manualAbContactKey(r);
            if (seen.has(key)) return;
            seen.add(key);
            rows.push({
                type: toStr(r.type) || 'other',
                name: toStr(r.name),
                building: toStr(r.building),
                unit: toStr(r.unit),
                mobile: toStr(r.mobile),
                source: toStr(r.source) || 'system'
            });
        };
        collectAddressBookRowsFromSystem().forEach(push);
        (addressBookEntries || []).forEach((e) => push(e));
        return rows.sort((a, b) => toStr(a.name).localeCompare(toStr(b.name), 'ar'));
    }

    function getManualEntryAbContactsList() {
        return collectAddressBookContactsForAccounting().map((row) => {
            const typeLbl = addressBookTypeLabel(row.type);
            const loc = row.building
                ? row.unit
                    ? ` | ${row.building} / ${row.unit}`
                    : ` | ${row.building}`
                : '';
            return {
                key: manualAbContactKey(row),
                label: `${row.name} — ${typeLbl}${loc}`,
                row
            };
        });
    }

    function resolveContactPropertyLinks(contactRow) {
        if (!contactRow) return [];
        const links = [];
        const add = (building, unit) => {
            const b = toStr(building).trim();
            const u = toStr(unit).trim();
            if (!b || !u) return;
            const key = `${b}\t${u}`;
            if (links.some((x) => `${x.building}\t${x.unit}` === key)) return;
            links.push({ building: b, unit: u });
        };
        if (contactRow.building && contactRow.unit) {
            add(contactRow.building, contactRow.unit);
        } else if (contactRow.building) {
            toStr(contactRow.building)
                .split(/[،,]/)
                .map((x) => x.trim())
                .filter(Boolean)
                .forEach((b) => {
                    collectUnitsForBuildingName(b).forEach((u) => add(b, u));
                });
        }
        getUnitsData().forEach((u) => {
            if (toStr(u.tenant) === toStr(contactRow.name)) add(u.building, u.unit);
        });
        (loadAccountingRegistry().cheques || []).forEach((ch) => {
            if (toStr(ch.tenant) === toStr(contactRow.name)) add(ch.building, ch.unit);
        });
        return links.sort((a, b) =>
            `${a.building}\t${a.unit}`.localeCompare(`${b.building}\t${b.unit}`, undefined, { numeric: true })
        );
    }

    function formatReceivablePropertyLabel(building, unit) {
        return resolveAccountingChequePropertyLabel({ building, unit });
    }

    function sortReceivableItemsByProperty(items) {
        return (items || []).slice().sort((a, b) => {
            const pb = toStr(a.building).localeCompare(toStr(b.building), undefined, { numeric: true });
            if (pb !== 0) return pb;
            const pu = normalizeUnit(a.unit).localeCompare(normalizeUnit(b.unit), undefined, { numeric: true });
            if (pu !== 0) return pu;
            return toStr(a.dueDate).localeCompare(toStr(b.dueDate));
        });
    }

    function buildReceivableItemFromCheque(c) {
        const amt = parseFloat(c.amount) || 0;
        const paid = parseFloat(c.paidAmount) || 0;
        const outstanding = Math.max(0, parseFloat((amt - paid).toFixed(3)));
        const st = toStr(c.status);
        if (outstanding <= 0) return null;
        if (st === 'bounced' || st === 'returned') return null;
        return {
            kind: 'cheque',
            id: c.id,
            ref: toStr(c.chequeNo) || c.linkedKey || c.id,
            label: `${t('شيك', 'Cheque')} ${c.chequeNo || '—'}`,
            issueDate: (c.dueDate || '').slice(0, 10),
            dueDate: (c.dueDate || '').slice(0, 10),
            amount: amt,
            outstanding,
            allocate: 0,
            building: toStr(c.building),
            unit: toStr(c.unit),
            unitKey: c.unitKey,
            reference: toStr(c.sourceType) || toStr(c.agreementNo) || ''
        };
    }

    function buildReceivableItemFromInvoice(inv) {
        const total = parseFloat(inv.total) || 0;
        const paid = parseFloat(inv.paidAmount) || 0;
        const outstanding = Math.max(0, parseFloat((total - paid).toFixed(3)));
        const st = toStr(inv.status);
        if (outstanding <= 0) return null;
        if (st === 'paid' || st === 'cancelled') return null;
        return {
            kind: 'invoice',
            id: inv.id,
            ref: inv.invoiceNo || inv.id,
            label: `${t('فاتورة', 'Invoice')} ${inv.invoiceNo || inv.id}`,
            issueDate: (inv.issueDate || inv.createdAt || '').slice(0, 10),
            dueDate: (inv.dueDate || inv.issueDate || inv.createdAt || '').slice(0, 10),
            amount: total,
            outstanding,
            allocate: 0,
            building: toStr(inv.building),
            unit: toStr(inv.unit),
            unitKey: inv.unitKey,
            reference: toStr(inv.note) || toStr(inv.agreementNo) || ''
        };
    }

    function accountingReceivableBelongsToParty(rec, partyName) {
        const name = toStr(partyName).trim();
        if (!name || !rec) return false;
        const tenant = toStr(rec.tenant);
        if (tenant) return tenant === name;
        const party = toStr(rec.partyName);
        if (party) return party === name;
        const b = toStr(rec.building);
        const u = toStr(rec.unit);
        if (!b || !u) return false;
        const unitRow = getUnitsData().find(
            (x) => toStr(x.building) === b && normalizeUnit(x.unit) === normalizeUnit(u)
        );
        return unitRow && toStr(unitRow.tenant) === name;
    }

    function collectUnitOpenReceivables(building, unit, partyNameFilter) {
        const b = toStr(building);
        const u = toStr(unit);
        if (!b || !u) return [];
        const partyFilter = toStr(partyNameFilter).trim();
        const reg = loadAccountingRegistry();
        const uk = accountingUnitKey(b, u);
        const items = [];
        (reg.cheques || [])
            .filter((c) => c.unitKey === uk)
            .filter((c) => !partyFilter || accountingReceivableBelongsToParty(c, partyFilter))
            .forEach((c) => {
                const row = buildReceivableItemFromCheque(c);
                if (row) items.push(row);
            });
        (reg.invoices || [])
            .filter((inv) => inv.unitKey === uk)
            .filter((inv) => !partyFilter || accountingReceivableBelongsToParty(inv, partyFilter))
            .forEach((inv) => {
                const row = buildReceivableItemFromInvoice(inv);
                if (row) items.push(row);
            });
        items.sort((a, b) => toStr(a.dueDate).localeCompare(toStr(b.dueDate)));
        return sortReceivableItemsByProperty(items);
    }

    function collectPartyOpenReceivables(partyName, contactRow) {
        const name = toStr(partyName).trim();
        if (!name) return [];
        const reg = loadAccountingRegistry();
        const seen = new Set();
        const items = [];
        const push = (row) => {
            if (!row) return;
            const key = `${row.kind}|${row.id}`;
            if (seen.has(key)) return;
            seen.add(key);
            items.push(row);
        };
        const links = contactRow ? resolveContactPropertyLinks(contactRow) : [];
        links.forEach(({ building, unit }) => {
            collectUnitOpenReceivables(building, unit, name).forEach(push);
        });
        (reg.cheques || []).forEach((c) => {
            if (!accountingReceivableBelongsToParty(c, name)) return;
            push(buildReceivableItemFromCheque(c));
        });
        (reg.invoices || []).forEach((inv) => {
            if (!accountingReceivableBelongsToParty(inv, name)) return;
            push(buildReceivableItemFromInvoice(inv));
        });
        return sortReceivableItemsByProperty(items);
    }

    function loadManualEntryReceivablePool(partyName, contactRow) {
        _manualEntryPartyState.partyName = toStr(partyName);
        _manualEntryAllocState.pool = collectPartyOpenReceivables(partyName, contactRow);
        _manualEntryAllocState.items = [];
        _manualEntryAllocState.mode = 'note';
        refreshManualEntryContactBanner();
        refreshManualEntryAllocationPanel();
    }

    function countOpenInvoicesInPool(pool) {
        return (pool || []).filter((x) => x.kind === 'invoice').length;
    }

    function countOpenChequesInPool(pool) {
        return (pool || []).filter((x) => x.kind === 'cheque').length;
    }

    function refreshManualEntryContactBanner() {
        const host = document.getElementById('manualEntryAddressBookSummary');
        const pool = _manualEntryAllocState.pool || [];
        const invN = countOpenInvoicesInPool(pool);
        const chqN = countOpenChequesInPool(pool);
        let html = '';
        if (!pool.length) {
            html = `<div class="acct-party-summary-banner acct-party-summary-banner--ok">${t('لا توجد فواتير أو شيكات مفتوحة لهذه الجهة.', 'No open invoices or cheques for this party.')}</div>`;
        } else if (invN > 0) {
            const extra = chqN ? ` · ${chqN} ${t('شيك', 'cheque')}(s)` : '';
            html = `<div class="acct-party-summary-banner acct-party-summary-banner--warn">⚠️ ${t('هذا العميل لديه', 'This customer has')} <strong>${invN}</strong> ${t('فاتورة غير مدفوعة', 'unpaid invoice(s)')}${escHtml(extra)}</div>`;
        } else {
            html = `<div class="acct-party-summary-banner acct-party-summary-banner--warn">⚠️ ${t('هذا العميل لديه', 'This customer has')} <strong>${chqN}</strong> ${t('شيك غير مسدّد', 'open cheque(s)')}</div>`;
        }
        if (host) host.innerHTML = html;
    }

    function getManualEntryAllocTotalsFromDom() {
        let totalAlloc = 0;
        (_manualEntryAllocState.items || []).forEach((it, idx) => {
            const inp = document.getElementById(`manualAllocAmt_${idx}`);
            const raw = inp ? toStr(inp.value).replace(/,/g, '').trim() : '';
            const num = !raw || raw === '.' ? 0 : parseFloat(raw);
            totalAlloc += Number.isFinite(num) ? Math.max(0, num) : 0;
        });
        const payAmt = getManualEntryPaymentAmount();
        return {
            totalAlloc,
            payAmt,
            remaining: parseFloat((payAmt - totalAlloc).toFixed(3))
        };
    }

    function updateManualEntryAllocFooter() {
        const footer = document.querySelector('#manualEntryAllocHost .acct-wafeq-alloc-footer');
        if (!footer) return;
        const { totalAlloc, payAmt, remaining } = getManualEntryAllocTotalsFromDom();
        const divs = footer.querySelectorAll(':scope > div');
        if (divs[0]) {
            divs[0].innerHTML = `${t('إجمالي المبالغ الموزعة', 'Total allocated')}: <strong>${escHtml(summaryAmtOm(totalAlloc))}</strong>`;
        }
        if (divs[1]) {
            divs[1].innerHTML = `${t('المبلغ المدفوع', 'Amount received')}: <strong>${escHtml(summaryAmtOm(payAmt))}</strong>`;
        }
        if (divs[2]) {
            divs[2].className = Math.abs(remaining) > 0.001 ? 'remaining--warn' : '';
            divs[2].innerHTML = `${t('المتبقي', 'Remaining')}: <strong>${escHtml(summaryAmtOm(remaining))}</strong>`;
        }
    }

    function syncManualEntryAllocFromDom() {
        (_manualEntryAllocState.items || []).forEach((it, idx) => {
            const inp = document.getElementById(`manualAllocAmt_${idx}`);
            if (!inp) return;
            const raw = toStr(inp.value).replace(/,/g, '').trim();
            const num = !raw || raw === '.' ? 0 : parseFloat(raw);
            it.allocate = Math.max(0, Math.min(Number.isFinite(num) ? num : 0, it.outstanding));
        });
    }

    function getManualEntryPaymentAmount() {
        return parseFloat(document.getElementById('manualEntryAmount')?.value) || 0;
    }

    function renderManualEntryAllocationPanelHtml() {
        const kind = toStr(document.getElementById('manualEntryKind')?.value) || 'income';
        if (kind !== 'income') {
            return `<div class="input-group" style="margin-top:8px">
                <label>${t('ملاحظة الدفع', 'Payment note')}</label>
                <input type="text" id="manualEntryPayNote" placeholder="${t('مثال: مصروف نقدي', 'e.g. Cash expense')}">
            </div>`;
        }
        const partyName = _manualEntryPartyState.partyName || getSelectedManualEntryAddressBookRow()?.name || '';
        if (!partyName) {
            return `<p style="margin:0;font-size:12px;color:#666">${t('اختر العميل أولاً.', 'Select a client first.')}</p>`;
        }
        const pool = _manualEntryAllocState.pool || [];
        const items = _manualEntryAllocState.items || [];
        const payAmt = getManualEntryPaymentAmount();
        const totalAlloc = items.reduce((s, x) => s + (parseFloat(x.allocate) || 0), 0);
        const remaining = parseFloat((payAmt - totalAlloc).toFixed(3));
        const invN = countOpenInvoicesInPool(pool);
        const rows = items.length
            ? items
                .map((it, idx) => {
                    const propLbl = formatReceivablePropertyLabel(it.building, it.unit);
                    const dateLbl = it.dueDate && it.dueDate !== it.issueDate
                        ? `${escHtml(it.issueDate || '—')}<br><small style="color:#888">${t('استحقاق', 'Due')}: ${escHtml(it.dueDate)}</small>`
                        : escHtml(it.dueDate || it.issueDate || '—');
                    return `<tr>
                    <td>${escHtml(propLbl)}</td>
                    <td>${escHtml(it.ref)}<br><small style="color:#666">${escHtml(it.label)}</small></td>
                    <td>${dateLbl}</td>
                    <td>${escHtml(summaryAmtOm(it.amount))}</td>
                    <td>${escHtml(summaryAmtOm(it.outstanding))}<br><button type="button" class="acct-wafeq-pay-full" onclick="payManualEntryAllocFull(${idx})">${t('الدفع بالكامل', 'Pay in full')}</button></td>
                    <td><input type="text" inputmode="decimal" autocomplete="off" id="manualAllocAmt_${idx}" value="${escHtml(it.allocate || 0)}" style="width:100px" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" oninput="onManualEntryAllocAmountInput(${idx}, this.value)" onblur="onManualEntryAllocAmountBlur(${idx})"></td>
                    <td><button type="button" class="btn-outline mini-btn" onclick="removeManualEntryAllocItem(${idx})" title="${t('إزالة', 'Remove')}">✕</button></td>
                </tr>`;
                })
                .join('')
            : `<tr><td colspan="7" style="text-align:center;color:#666;padding:16px">${t('اضغط «إظهار الفواتير» لاختيار فاتورة أو شيك.', 'Click «Show invoices» to pick an invoice or cheque.')}</td></tr>`;
        const showAddBtn = pool.length > 0;
        return `
            <div class="acct-wafeq-alloc-section">
                <div class="acct-wafeq-alloc-head">
                    <h5 style="margin:0;font-size:14px;font-weight:700">${t('سجّل هذه الدفعة للفواتير التالية', 'Record this payment for the following invoices')}</h5>
                    ${showAddBtn ? `<button type="button" class="btn-outline mini-btn" onclick="openManualEntryReceivablePickerModal()">➕ ${t('إظهار الفواتير', 'Show invoices')}</button>` : ''}
                </div>
                ${invN > 0 ? `<p style="margin:0 0 10px;font-size:12px;color:#555">${t('هذا العميل لديه', 'This customer has')} <strong>${invN}</strong> ${t('فاتورة غير مدفوعة', 'unpaid invoice(s)')}</p>` : ''}
                <div class="acct-wafeq-alloc-actions" style="margin-bottom:8px">
                    <button type="button" class="linkish" onclick="autoDistributeManualEntryPayment()">${t('توزيع تلقائي', 'Auto-distribute')}</button>
                    <button type="button" class="linkish" onclick="clearManualEntryAllocations()">${t('مسح التوزيعات', 'Clear distributions')}</button>
                </div>
                <div class="table-wrap" style="max-height:260px;overflow:auto">
                    <table class="data-table" style="width:100%;font-size:11px">
                        <thead><tr>
                            <th>${t('العقار', 'Property')}</th>
                            <th>${t('الفاتورة', 'Invoice')}</th>
                            <th>${t('التاريخ', 'Date')}</th>
                            <th>${t('المبلغ', 'Amount')}</th>
                            <th>${t('الرصيد', 'Balance')}</th>
                            <th>${t('توزيع المبلغ المدفوع', 'Allocate payment')}</th>
                            <th></th>
                        </tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                <div class="acct-wafeq-alloc-footer">
                    <div>${t('إجمالي المبالغ الموزعة', 'Total allocated')}: <strong>${escHtml(summaryAmtOm(totalAlloc))}</strong></div>
                    <div>${t('المبلغ المدفوع', 'Amount received')}: <strong>${escHtml(summaryAmtOm(payAmt))}</strong></div>
                    <div class="${Math.abs(remaining) > 0.001 ? 'remaining--warn' : ''}">${t('المتبقي', 'Remaining')}: <strong>${escHtml(summaryAmtOm(remaining))}</strong></div>
                </div>
                <div class="input-group" style="margin-top:10px">
                    <label>${t('ملاحظة الدفع', 'Payment note')}</label>
                    <input type="text" id="manualEntryPayNote" placeholder="${t('مثال: دفعة نقدية جزئية', 'e.g. Partial cash payment')}">
                </div>
            </div>`;
    }

    function refreshManualEntryAllocationPanel() {
        const host = document.getElementById('manualEntryAllocHost');
        if (!host) return;
        const kind = toStr(document.getElementById('manualEntryKind')?.value) || 'income';
        const hasParty = !!_manualEntryPartyState.partyName;
        host.innerHTML = renderManualEntryAllocationPanelHtml();
        host.style.display = kind === 'income' && hasParty ? '' : kind === 'expense' ? '' : 'none';
        if (kind === 'income' && hasParty) {
            _manualEntryAllocState.mode = (_manualEntryAllocState.items || []).some((x) => (parseFloat(x.allocate) || 0) > 0) ? 'link' : 'note';
        }
        syncManualEntryIncomeCoaFromAllocations();
    }

    function onManualEntryAmountChange() {
        refreshManualEntryAllocationPanel();
    }

    function sortReceivableItemsByProperty(items) {
        return (items || []).slice().sort((a, b) => {
            const pb = toStr(a.building).localeCompare(toStr(b.building), undefined, { numeric: true });
            if (pb !== 0) return pb;
            const pu = normalizeUnit(a.unit).localeCompare(normalizeUnit(b.unit), undefined, { numeric: true });
            if (pu !== 0) return pu;
            return toStr(a.dueDate).localeCompare(toStr(b.dueDate));
        });
    }

    function isReceivableItemPropertyLinked(item) {
        return !!(toStr(item?.building).trim() || toStr(item?.unit).trim());
    }

    function groupReceivablePoolForPicker(pool) {
        const unitMap = new Map();
        const unlinked = [];
        (pool || []).forEach((it, poolIdx) => {
            const item = { ...it, poolIdx };
            if (!isReceivableItemPropertyLinked(item)) {
                unlinked.push(item);
                return;
            }
            const b = toStr(item.building).trim();
            const u = toStr(item.unit).trim();
            const key = `${b}\t${u}`;
            if (!unitMap.has(key)) {
                unitMap.set(key, {
                    key,
                    building: b,
                    unit: u,
                    label: formatReceivablePropertyLabel(b, u),
                    items: []
                });
            }
            unitMap.get(key).items.push(item);
        });
        const unitGroups = [...unitMap.values()].sort((a, b) => {
            const pb = a.building.localeCompare(b.building, undefined, { numeric: true });
            if (pb !== 0) return pb;
            return normalizeUnit(a.unit).localeCompare(normalizeUnit(b.unit), undefined, { numeric: true });
        });
        const sortItems = (arr) => arr.sort((a, b) => toStr(a.dueDate).localeCompare(toStr(b.dueDate)));
        unitGroups.forEach((g) => sortItems(g.items));
        sortItems(unlinked);
        return { unitGroups, unlinked };
    }

    function formatReceivablePickerGroupCount(items) {
        const list = items || [];
        const invN = list.filter((x) => x.kind === 'invoice').length;
        const chqN = list.filter((x) => x.kind === 'cheque').length;
        const parts = [];
        if (invN) parts.push(`${invN} ${invN === 1 ? t('فاتورة', 'invoice') : t('فواتير', 'invoices')}`);
        if (chqN) parts.push(`${chqN} ${chqN === 1 ? t('شيك', 'cheque') : t('شيكات', 'cheques')}`);
        if (!parts.length) return `0 ${t('بنود', 'items')}`;
        return parts.join(' · ');
    }

    function renderReceivablePickerItemRow(it, picked) {
        const key = `${it.kind}|${it.id}`;
        const checked = picked.has(key) ? 'checked' : '';
        const disabled = picked.has(key) ? 'disabled' : '';
        const ref = it.kind === 'cheque' ? `${t('شيك', 'Cheque')} ${escHtml(it.ref || '—')}` : `${t('فاتورة', 'Invoice')} ${escHtml(it.ref || '—')}`;
        return `<tr>
            <td><label style="display:flex;align-items:flex-start;gap:6px;margin:0;cursor:pointer">
                <input type="checkbox" data-pick-idx="${it.poolIdx}" ${checked} ${disabled}>
                <span>${ref}<br><small style="color:#666">${escHtml(it.label)}</small></span>
            </label></td>
            <td>${escHtml(it.issueDate || '—')}</td>
            <td>${escHtml(summaryAmtOm(it.amount))}</td>
            <td>${escHtml(summaryAmtOm(it.outstanding))}</td>
            <td>${escHtml(it.reference || '—')}</td>
        </tr>`;
    }

    function renderReceivablePickerGroupTable(items, picked) {
        if (!items.length) return '';
        return `<div class="table-wrap">
            <table class="data-table" style="width:100%;font-size:12px">
                <thead><tr>
                    <th>${t('الفاتورة / الشيك', 'Invoice / cheque')}</th>
                    <th>${t('التاريخ', 'Date')}</th>
                    <th>${t('المبلغ', 'Amount')}</th>
                    <th>${t('الرصيد', 'Balance')}</th>
                    <th>${t('المرجع', 'Reference')}</th>
                </tr></thead>
                <tbody>${items.map((it) => renderReceivablePickerItemRow(it, picked)).join('')}</tbody>
            </table>
        </div>`;
    }

    function buildManualEntryReceivablePickerHtml(pool) {
        const picked = new Set((_manualEntryAllocState.items || []).map((x) => `${x.kind}|${x.id}`));
        const { unitGroups, unlinked } = groupReceivablePoolForPicker(pool);
        const groupBlocks = unitGroups
            .map((group, idx) => {
                const countLbl = formatReceivablePickerGroupCount(group.items);
                const openAttr = idx === 0 ? ' open' : '';
                return `<details class="acct-receivable-picker-group"${openAttr}>
                    <summary>
                        <span>${escHtml(group.label)}</span>
                        <span class="acct-receivable-picker-count">${escHtml(countLbl)}</span>
                    </summary>
                    ${renderReceivablePickerGroupTable(group.items, picked)}
                </details>`;
            })
            .join('');
        const otherBlock = unlinked.length
            ? `<details class="acct-receivable-picker-group acct-receivable-picker-group--other"${unitGroups.length ? '' : ' open'}>
                <summary>
                    <span>${t('فواتير شخصية / غير مرتبطة بعقار', 'Personal / non-property invoices')}</span>
                    <span class="acct-receivable-picker-count">${escHtml(formatReceivablePickerGroupCount(unlinked))}</span>
                </summary>
                ${renderReceivablePickerGroupTable(unlinked, picked)}
            </details>`
            : '';
        const emptyMsg =
            !unitGroups.length && !unlinked.length
                ? `<p style="text-align:center;padding:20px;color:#666">${t('لا توجد فواتير أو شيكات مفتوحة.', 'No open invoices or cheques.')}</p>`
                : '';
        return `
            <div class="acct-receivable-picker-toolbar">
                <button type="button" class="btn-outline mini-btn" onclick="expandAllReceivablePickerGroups(true)">${t('فتح الكل', 'Expand all')}</button>
                <button type="button" class="btn-outline mini-btn" onclick="expandAllReceivablePickerGroups(false)">${t('طي الكل', 'Collapse all')}</button>
                <small style="color:#666;margin-inline-start:auto">${t('اضغط على القسم لفتحه أو طيه', 'Click a section to expand or collapse')}</small>
            </div>
            <div class="acct-receivable-picker-groups" id="manualEntryReceivablePickerGroups">
                ${groupBlocks}${otherBlock}${emptyMsg}
            </div>
            <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
                <button type="button" class="btn-outline" onclick="closeManualEntryReceivablePickerModal()">${t('إلغاء', 'Cancel')}</button>
                <button type="button" class="btn-primary" onclick="confirmManualEntryReceivablePicker()">${t('أضف', 'Add')}</button>
            </div>`;
    }

    function expandAllReceivablePickerGroups(expand) {
        document.querySelectorAll('#manualEntryReceivablePickerGroups .acct-receivable-picker-group').forEach((el) => {
            if (expand) el.setAttribute('open', 'open');
            else el.removeAttribute('open');
        });
    }

    function openManualEntryReceivablePickerModal() {
        const pool = _manualEntryAllocState.pool || [];
        if (!pool.length) {
            alert(t('لا توجد فواتير أو شيكات مفتوحة.', 'No open invoices or cheques.'));
            return;
        }
        const body = document.getElementById('manualEntryReceivablePickerBody');
        const modal = document.getElementById('manualEntryReceivablePickerModal');
        if (!body || !modal) return;
        body.innerHTML = buildManualEntryReceivablePickerHtml(pool);
        modal.classList.add('open');
        try { localizeBilingualUi(); } catch (_e) {}
    }

    function closeManualEntryReceivablePickerModal() {
        document.getElementById('manualEntryReceivablePickerModal')?.classList.remove('open');
    }

    function confirmManualEntryReceivablePicker() {
        const pool = _manualEntryAllocState.pool || [];
        const body = document.getElementById('manualEntryReceivablePickerBody');
        if (!body) return;
        const pickedIdx = [...body.querySelectorAll('input[data-pick-idx]:checked')].map((inp) =>
            parseInt(inp.getAttribute('data-pick-idx'), 10)
        );
        pickedIdx.forEach((idx) => {
            const row = pool[idx];
            if (!row) return;
            const key = `${row.kind}|${row.id}`;
            if ((_manualEntryAllocState.items || []).some((x) => `${x.kind}|${x.id}` === key)) return;
            _manualEntryAllocState.items.push({ ...row, allocate: 0 });
        });
        if (_manualEntryAllocState.items.length) {
            const first = _manualEntryAllocState.items[0];
            _manualEntryPartyState.building = first.building;
            _manualEntryPartyState.unit = first.unit;
        }
        closeManualEntryReceivablePickerModal();
        _manualEntryAllocState.mode = 'link';
        refreshManualEntryAllocationPanel();
    }

    function clearManualEntryAllocations() {
        syncManualEntryAllocFromDom();
        (_manualEntryAllocState.items || []).forEach((it) => {
            it.allocate = 0;
        });
        _manualEntryAllocState.mode = 'note';
        refreshManualEntryAllocationPanel();
    }

    function removeManualEntryAllocItem(idx) {
        syncManualEntryAllocFromDom();
        if (!_manualEntryAllocState.items || idx < 0 || idx >= _manualEntryAllocState.items.length) return;
        _manualEntryAllocState.items.splice(idx, 1);
        if (!_manualEntryAllocState.items.length) {
            _manualEntryAllocState.mode = 'note';
        }
        refreshManualEntryAllocationPanel();
    }

    function payManualEntryAllocFull(idx) {
        const it = _manualEntryAllocState.items[idx];
        if (!it) return;
        const pay = getManualEntryPaymentAmount();
        const already = (_manualEntryAllocState.items || []).reduce((s, x, i) => s + (i === idx ? 0 : parseFloat(x.allocate) || 0), 0);
        const left = Math.max(0, pay - already);
        it.allocate = parseFloat(Math.min(it.outstanding, left).toFixed(3));
        refreshManualEntryAllocationPanel();
    }

    function setManualEntryAllocMode(mode) {
        _manualEntryAllocState.mode = mode === 'link' ? 'link' : 'note';
        refreshManualEntryAllocationPanel();
    }

    function fetchManualEntryLinkedReceivables() {
        openManualEntryReceivablePickerModal();
    }

    function onManualEntryAllocAmountInput(idx, val) {
        const it = _manualEntryAllocState.items[idx];
        if (!it) return;
        const raw = toStr(val).replace(/,/g, '').trim();
        if (raw !== '' && raw !== '.' && !Number.isFinite(parseFloat(raw))) return;
        if (raw !== '' && raw !== '.') {
            const num = Math.max(0, Math.min(parseFloat(raw) || 0, it.outstanding));
            it.allocate = num;
            const pay = getManualEntryPaymentAmount();
            let total = 0;
            (_manualEntryAllocState.items || []).forEach((x, i) => {
                total += i === idx ? num : parseFloat(x.allocate) || 0;
            });
            if (total > pay + 0.001) {
                it.allocate = Math.max(0, parseFloat((num - (total - pay)).toFixed(3)));
            }
        }
        _manualEntryAllocState.mode = (_manualEntryAllocState.items || []).some((x, i) => {
            if (i === idx) return (parseFloat(raw) || 0) > 0;
            return (parseFloat(x.allocate) || 0) > 0;
        })
            ? 'link'
            : 'note';
        updateManualEntryAllocFooter();
    }

    function onManualEntryAllocAmountBlur(idx) {
        const it = _manualEntryAllocState.items[idx];
        const inp = document.getElementById(`manualAllocAmt_${idx}`);
        if (!it || !inp) return;
        syncManualEntryAllocFromDom();
        const pay = getManualEntryPaymentAmount();
        let total = (_manualEntryAllocState.items || []).reduce((s, x) => s + (parseFloat(x.allocate) || 0), 0);
        if (total > pay + 0.001) {
            it.allocate = Math.max(0, parseFloat((it.allocate - (total - pay)).toFixed(3)));
        }
        inp.value = it.allocate ? String(it.allocate) : '0';
        _manualEntryAllocState.mode = (_manualEntryAllocState.items || []).some((x) => (parseFloat(x.allocate) || 0) > 0) ? 'link' : 'note';
        updateManualEntryAllocFooter();
    }

    function autoDistributeManualEntryPayment() {
        syncManualEntryAllocFromDom();
        const pay = getManualEntryPaymentAmount();
        if (!Number.isFinite(pay) || pay <= 0) {
            alert(t('أدخل مبلغ الدفع أولاً.', 'Enter payment amount first.'));
            return;
        }
        if (!_manualEntryAllocState.items.length) {
            if ((_manualEntryAllocState.pool || []).length === 1) {
                _manualEntryAllocState.items = [{ ..._manualEntryAllocState.pool[0], allocate: 0 }];
            } else if ((_manualEntryAllocState.pool || []).length > 1) {
                openManualEntryReceivablePickerModal();
                return;
            } else {
                alert(t('لا توجد فواتير لتوزيع الدفع عليها.', 'No invoices to allocate payment to.'));
                return;
            }
        }
        let left = pay;
        _manualEntryAllocState.items.forEach((it) => {
            const slice = Math.min(left, it.outstanding);
            it.allocate = parseFloat(slice.toFixed(3));
            left = parseFloat((left - slice).toFixed(3));
        });
        _manualEntryAllocState.mode = 'link';
        if (_manualEntryAllocState.items[0]) {
            _manualEntryPartyState.building = _manualEntryAllocState.items[0].building;
            _manualEntryPartyState.unit = _manualEntryAllocState.items[0].unit;
        }
        refreshManualEntryAllocationPanel();
    }

    function applyManualPaymentAllocations(reg, building, unit, paymentNote, entryCtx, itemsIn) {
        const items = (itemsIn || (_manualEntryAllocState.items || [])).filter((x) => (parseFloat(x.allocate ?? x.amount) || 0) > 0);
        if (!items.length) return;
        const ctx = entryCtx || {
            entryId: '',
            voucherNo: '—',
            totalAmount: items.reduce((s, x) => s + (parseFloat(x.allocate ?? x.amount) || 0), 0),
            date: toStr(document.getElementById('manualEntryDate')?.value) || new Date().toISOString().slice(0, 10),
            partyName: ''
        };
        items.forEach((it) => {
            const amt = parseFloat(it.allocate ?? it.amount) || 0;
            if (amt <= 0) return;
            const b = it.building || building;
            const u = it.unit || unit;
            const uk = accountingUnitKey(b, u);
            const allocMeta = { kind: it.kind, id: it.id, ref: it.ref, amount: amt, building: b, unit: u };
            if (it.kind === 'cheque') {
                const idx = reg.cheques.findIndex((c) => c.id === it.id);
                if (idx < 0) return;
                const ch = reg.cheques[idx];
                const prevPaid = parseFloat(ch.paidAmount) || 0;
                const total = parseFloat(ch.amount) || 0;
                ch.paidAmount = parseFloat(Math.min(total, prevPaid + amt).toFixed(3));
                const payStatus = ch.paidAmount >= total - 0.001 ? 'full' : 'partial';
                if (ch.paidAmount >= total - 0.001) {
                    ch.status = 'paid_cash';
                    ch.deferred = false;
                } else {
                    ch.status = 'paid_partial';
                }
                const noteLine = buildAllocationPaymentNoteLine(ctx, allocMeta, payStatus);
                appendReceivablePaymentHistoryRecord(ch, ctx, allocMeta, payStatus, noteLine);
                appendAccountingChequeAction(ch, {
                    actionDate: ctx.date,
                    actionType: 'manual_payment_alloc',
                    actionNote: noteLine,
                    paidAmount: ch.paidAmount,
                    allocatedAmount: amt,
                    voucherNo: ctx.voucherNo,
                    entryId: ctx.entryId
                });
                it._paymentNoteLine = noteLine;
                ch.updatedAt = new Date().toISOString();
            } else if (it.kind === 'invoice') {
                const inv = reg.invoices.find((i) => i.id === it.id);
                if (inv) {
                    inv.paidAmount = (parseFloat(inv.paidAmount) || 0) + amt;
                    const invTotal = parseFloat(inv.total) || 0;
                    const payStatus = (parseFloat(inv.paidAmount) || 0) >= invTotal - 0.001 ? 'paid' : 'partial';
                    if ((parseFloat(inv.paidAmount) || 0) >= invTotal - 0.001) inv.status = 'paid';
                    const noteLine = buildAllocationPaymentNoteLine(ctx, { ...allocMeta, ref: inv.invoiceNo || it.ref }, payStatus);
                    appendReceivablePaymentHistoryRecord(inv, ctx, { ...allocMeta, ref: inv.invoiceNo || it.ref }, payStatus, noteLine);
                    it._paymentNoteLine = noteLine;
                    inv.updatedAt = new Date().toISOString();
                }
            }
            recomputeAccountingAccountSummary(reg, uk);
        });
        if (ctx.entryId) {
            const ent = reg.entries.find((e) => e.id === ctx.entryId);
            if (ent && Array.isArray(ent.paymentAllocations)) {
                ent.paymentAllocations.forEach((a) => {
                    const match = items.find((it) => it.id === a.id && it.kind === a.kind);
                    if (match && match._paymentNoteLine) a.note = match._paymentNoteLine;
                });
            }
        }
    }

    function renderManualEntryClientDropdownHtml(query) {
        const q = toStr(query).trim().toLowerCase();
        let list = getManualEntryAbContactsList();
        if (q) {
            list = list.filter(
                (c) =>
                    c.label.toLowerCase().includes(q) ||
                    c.row.name.toLowerCase().includes(q) ||
                    toStr(c.row.building).toLowerCase().includes(q) ||
                    toStr(c.row.mobile).toLowerCase().includes(q)
            );
        }
        const createBtn = `<button type="button" class="acct-client-combobox-create" data-action="create-contact">+ ${t('إنشاء جهة اتصال', 'Create contact')}</button>`;
        const items = list
            .slice(0, 100)
            .map((c) => {
                const typeLbl = addressBookTypeLabel(c.row.type);
                const loc = c.row.building
                    ? c.row.unit
                        ? `${c.row.building} / ${c.row.unit}`
                        : c.row.building
                    : '';
                const sub = [typeLbl, loc].filter(Boolean).join(' · ');
                const keyAttr = escHtml(encodeURIComponent(c.key));
                return `<button type="button" class="acct-ab-search-item" data-contact-key="${keyAttr}">${escHtml(c.row.name)}${sub ? `<span class="acct-ab-search-item-sub">${escHtml(sub)}</span>` : ''}</button>`;
            })
            .join('');
        const empty = list.length
            ? ''
            : `<div class="acct-ab-search-empty">${q ? t('لا نتائج مطابقة', 'No matching contacts') : t('لا توجد جهات في دفتر العناوين', 'No contacts in address book')}</div>`;
        return `${createBtn}${items}${empty}`;
    }

    function openManualEntryClientDropdown() {
        const host = document.getElementById('manualEntryAbResults');
        const inp = document.getElementById('manualEntryAbSearch');
        const combo = document.getElementById('manualEntryClientCombo');
        if (!host || !inp) return;
        host.innerHTML = renderManualEntryClientDropdownHtml(inp.value);
        host.style.display = 'block';
        combo?.classList.add('open');
    }

    function closeManualEntryClientDropdown() {
        const host = document.getElementById('manualEntryAbResults');
        const combo = document.getElementById('manualEntryClientCombo');
        if (host) host.style.display = 'none';
        combo?.classList.remove('open');
    }

    function toggleManualEntryClientDropdown(ev) {
        if (ev) ev.stopPropagation();
        const host = document.getElementById('manualEntryAbResults');
        if (host && host.style.display === 'block') closeManualEntryClientDropdown();
        else openManualEntryClientDropdown();
    }

    function onManualEntryClientSearchInput() {
        const keyEl = document.getElementById('manualEntryAddressBookKey');
        if (keyEl) keyEl.value = '';
        _manualEntryPartyState = { contactKey: '', building: '', unit: '', partyName: '' };
        _manualEntryAllocState.pool = [];
        _manualEntryAllocState.items = [];
        _manualEntryAllocState.mode = 'note';
        const abSum = document.getElementById('manualEntryAddressBookSummary');
        if (abSum) abSum.innerHTML = '';
        openManualEntryClientDropdown();
        refreshManualEntryAllocationPanel();
    }

    function onManualEntryClientSearchKeydown(ev) {
        if (!ev) return;
        if (ev.key === 'Escape') {
            closeManualEntryClientDropdown();
            return;
        }
        if (ev.key === 'ArrowDown') {
            ev.preventDefault();
            openManualEntryClientDropdown();
            const host = document.getElementById('manualEntryAbResults');
            const first = host?.querySelector('.acct-ab-search-item');
            if (first) first.focus();
        }
    }

    function bindManualEntryClientComboEvents() {
        const combo = document.getElementById('manualEntryClientCombo');
        if (!combo || combo._pickBound) return;
        combo._pickBound = true;
        combo.addEventListener('mousedown', (e) => {
            if (e.target.closest('[data-contact-key], [data-action="create-contact"]')) {
                e.preventDefault();
            }
        });
        combo.addEventListener('click', (e) => {
            const item = e.target.closest('[data-contact-key]');
            if (item) {
                e.preventDefault();
                e.stopPropagation();
                const rawKey = item.getAttribute('data-contact-key') || '';
                try {
                    pickManualEntryAddressBookContact(decodeURIComponent(rawKey));
                } catch (_eKey) {
                    pickManualEntryAddressBookContact(rawKey);
                }
                return;
            }
            if (e.target.closest('[data-action="create-contact"]')) {
                e.preventDefault();
                e.stopPropagation();
                openAddressBookEntryModal('add', -1);
                closeManualEntryClientDropdown();
            }
        });
    }

    function initManualEntryClientCombobox() {
        bindManualEntryClientComboEvents();
        if (_manualEntryClientComboDocBound) return;
        _manualEntryClientComboDocBound = true;
        document.addEventListener('click', (e) => {
            const combo = document.getElementById('manualEntryClientCombo');
            if (combo && !combo.contains(e.target)) closeManualEntryClientDropdown();
        });
    }

    function filterManualEntryAddressBookList() {
        onManualEntryClientSearchInput();
    }

    function pickManualEntryAddressBookContact(key) {
        const hit = getManualEntryAbContactsList().find((c) => c.key === key);
        if (!hit) return;
        _manualEntryPartyState.contactKey = key;
        const search = document.getElementById('manualEntryAbSearch');
        const keyEl = document.getElementById('manualEntryAddressBookKey');
        const results = document.getElementById('manualEntryAbResults');
        if (search) search.value = hit.row.name;
        if (keyEl) keyEl.value = key;
        if (results) {
            results.innerHTML = '';
            results.style.display = 'none';
        }
        closeManualEntryClientDropdown();
        onManualEntryAddressBookContactSelected(hit.row);
    }

    function onManualEntryAddressBookContactSelected(row) {
        loadManualEntryReceivablePool(row.name, row);
        const links = resolveContactPropertyLinks(row);
        if (links.length === 1) {
            _manualEntryPartyState.building = links[0].building;
            _manualEntryPartyState.unit = links[0].unit;
            const bankSel = document.getElementById('manualEntryBankAccount');
            if (bankSel) {
                const owner = resolveOwnerNameForBuilding(links[0].building);
                bankSel.innerHTML = renderBankAccountSelectOptions('', owner);
            }
        }
    }

    function getSelectedManualEntryAddressBookRow() {
        const key = toStr(document.getElementById('manualEntryAddressBookKey')?.value);
        if (key) {
            const hit = getManualEntryAbContactsList().find((c) => c.key === key);
            if (hit) return hit.row;
        }
        const name = toStr(document.getElementById('manualEntryAbSearch')?.value);
        return collectAddressBookContactsForAccounting().find((r) => r.name === name) || null;
    }

    function getManualEntryResolvedBuildingUnit() {
        const firstItem = (_manualEntryAllocState.items || [])[0];
        return {
            building: _manualEntryPartyState.building || firstItem?.building || '',
            unit: _manualEntryPartyState.unit || firstItem?.unit || ''
        };
    }

    function buildManualEntryClientSearchHtml(kind) {
        const isIncome = kind === 'income';
        return `
            <div class="input-group acct-ab-search-wrap" style="grid-column:1/-1">
                <label>${isIncome ? t('العميل', 'Client') : t('المورد / الجهة', 'Vendor / party')} *</label>
                <div class="acct-client-combobox" id="manualEntryClientCombo">
                    <button type="button" class="acct-client-combobox-toggle" onclick="toggleManualEntryClientDropdown(event)" aria-label="${t('عرض القائمة', 'Show list')}">▼</button>
                    <input type="text" id="manualEntryAbSearch" autocomplete="off" placeholder="${t('مطلوب', 'Required')}" onfocus="openManualEntryClientDropdown()" oninput="onManualEntryClientSearchInput()" onkeydown="onManualEntryClientSearchKeydown(event)">
                    <input type="hidden" id="manualEntryAddressBookKey" value="">
                    <div id="manualEntryAbResults" class="acct-client-combobox-panel" style="display:none"></div>
                </div>
            </div>
            <div id="manualEntryAddressBookSummary" style="grid-column:1/-1"></div>`;
    }

    function getManualEntrySaveButtonLabel() {
        if (_manualEntryEditMode === 'revision') {
            return `✅ ${t('إرسال طلب التعديل', 'Submit edit request')}`;
        }
        if (_manualEntryEditEntryId) {
            return `✅ ${t('حفظ التعديل', 'Save changes')}`;
        }
        return `✅ ${t('حفظ السند', 'Save voucher')}`;
    }

    function ensureManualEntrySelectValue(selectId, value, label) {
        const el = document.getElementById(selectId);
        const v = toStr(value);
        if (!el) return v;
        if (v && ![...el.options].some((o) => o.value === v)) {
            const opt = document.createElement('option');
            opt.value = v;
            opt.textContent = label || v;
            el.appendChild(opt);
        }
        if (v) el.value = v;
        return toStr(el.value) || v;
    }

    function resolveExistingManualEntryForEdit(reg) {
        if (!_manualEntryEditEntryId) return null;
        return (reg?.entries || []).find((e) => e.id === _manualEntryEditEntryId) || null;
    }

    function resolveManualEntryAddressBookRow(existingEntry) {
        const key = toStr(document.getElementById('manualEntryAddressBookKey')?.value);
        if (key) {
            const hit = getManualEntryAbContactsList().find((c) => c.key === key);
            if (hit) return hit.row;
        }
        const searchName = toStr(document.getElementById('manualEntryAbSearch')?.value).trim();
        const list = collectAddressBookContactsForAccounting();
        if (searchName) {
            let hit = list.find((r) => r.name === searchName);
            if (!hit) {
                hit = list.find((r) => toStr(r.name).trim().toLowerCase() === searchName.toLowerCase());
            }
            if (hit) return hit;
        }
        const fallbackName = toStr(existingEntry?.partyName).trim();
        if (fallbackName) {
            let hit = list.find((r) => r.name === fallbackName);
            if (!hit) {
                hit = list.find((r) => toStr(r.name).trim().toLowerCase() === fallbackName.toLowerCase());
            }
            if (hit) return hit;
        }
        return null;
    }

    function bindManualEntryAddressBookRow(row) {
        if (!row) return;
        _manualEntryPartyState.partyName = toStr(row.name);
        _manualEntryPartyState.contactKey = toStr(row.id || row.name);
        const search = document.getElementById('manualEntryAbSearch');
        const keyEl = document.getElementById('manualEntryAddressBookKey');
        if (search) search.value = toStr(row.name);
        if (keyEl) {
            const hit = getManualEntryAbContactsList().find((c) => c.row === row || c.row.name === row.name);
            keyEl.value = hit ? hit.key : toStr(row.name);
        }
    }

    function accountingPendingFilterRow(row) {
        const pendingType = toStr(_accountingUiState.pendingType);
        if (pendingType && toStr(row.type) !== pendingType) return false;
        return accountingFilterRow(row);
    }

    function accountingDepositMatchesFilters(row) {
        const typeF = toStr(_accountingUiState.depositType);
        const statusF = toStr(_accountingUiState.depositStatus);
        if (typeF && toStr(row.type) !== typeF) return false;
        if (statusF && toStr(row.status) !== statusF) return false;
        return accountingFilterRow(row);
    }

    function accountingInvoiceMatchesFilters(inv) {
        const statusF = toStr(_accountingUiState.invoiceStatus);
        if (statusF) {
            const paid = parseFloat(inv.paidAmount) || 0;
            const total = parseFloat(inv.total) || 0;
            const rem = Math.max(0, total - paid);
            if (statusF === 'paid' && rem > 0.001) return false;
            if (statusF === 'open' && (paid > 0.001 || rem <= 0.001)) return false;
            if (statusF === 'partial' && (paid <= 0.001 || rem <= 0.001)) return false;
        }
        return accountingFilterRow(inv);
    }

    function accountingJournalMatchesToolbarFilters(j) {
        const q = toStr(_accountingUiState.search).trim().toLowerCase();
        if (q) {
            const hay = [j.entryNo, j.description, j.referenceType, j.referenceId, j.partyName, j.building, j.unit]
                .map((v) => toStr(v).toLowerCase())
                .join(' ');
            if (!hay.includes(q)) return false;
        }
        const from = toStr(_accountingUiState.dueDateFrom);
        const to = toStr(_accountingUiState.dueDateTo);
        const d = toStr(j.date);
        if (from && d && d < from) return false;
        if (to && d && d > to) return false;
        return true;
    }

    function setAccountingEntryPendingRequest(reg, entryId, pendingRequest) {
        const idx = reg.entries.findIndex((e) => e.id === entryId);
        if (idx < 0) return false;
        const nextPending = ensureAccountingPendingRequestNo(reg, pendingRequest);
        reg.entries[idx].pendingRequest = nextPending;
        reg.entries[idx].approvalWorkflowState = nextPending?.action ? `pending_${nextPending.action}` : '';
        attachAccountingApprovalChainToEntry(reg.entries[idx], nextPending?.action || 'create');
        reg.entries[idx].updatedAt = new Date().toISOString();
        return true;
    }

    function getDefaultManualIncomeCoaId(hasRentAllocations) {
        return hasRentAllocations ? 'coa_411' : 'coa_413';
    }

    function onManualEntryCoaUserChange() {
        const coaEl = document.getElementById('manualEntryCoa');
        if (coaEl) coaEl.dataset.userPicked = '1';
    }

    function syncManualEntryIncomeCoaFromAllocations() {
        const kind = toStr(document.getElementById('manualEntryKind')?.value) || 'income';
        if (kind !== 'income') return;
        const coaEl = document.getElementById('manualEntryCoa');
        if (!coaEl || coaEl.dataset.userPicked === '1') return;
        const allocItems = (_manualEntryAllocState?.items || []).filter((x) => (parseFloat(x.allocate) || 0) > 0);
        const nextId = getDefaultManualIncomeCoaId(allocItems.length > 0);
        ensureManualEntrySelectValue('manualEntryCoa', nextId, coaAccountLabel(coaAccountById(nextId)));
    }

    function buildAccountingManualEntryBodyHtml(kind) {
        const k = kind === 'expense' ? 'expense' : 'income';
        const defaultCoa = k === 'income' ? 'coa_413' : 'coa_526';
        const voucherNo = peekNextManualVoucherNo(k);
        const counterCoa = resolveManualEntryCounterCoaId('');
        if (k === 'income') {
            return `
            <input type="hidden" id="manualEntryKind" value="income">
            <input type="hidden" id="manualEntryCounterCoa" value="${escHtml(counterCoa)}">
            <section class="acct-wafeq-basic-section">
                <h5>${t('معلومات أساسية', 'Basic information')}</h5>
                <div class="row-2cols">
                    <div class="input-group acct-voucher-no-field"><label>${t('رقم السند', 'Voucher no.')}</label>
                        <input type="text" id="manualEntryVoucherNo" readonly value="${escHtml(voucherNo)}"></div>
                    <div class="input-group"><label>${t('المرجع', 'Reference')}</label>
                        <input type="text" id="manualEntryRefNo" placeholder="${t('اختياري — رقم مرجع خارجي', 'Optional — external reference no.')}"></div>
                    ${buildManualEntryClientSearchHtml('income')}
                    <div class="input-group"><label>${t('تم الدفع من خلال', 'Paid through')}</label>
                        <select id="manualEntryBankAccount" onchange="onManualEntryBankAccountChange()">${renderBankAccountSelectOptions('')}</select></div>
                    <div class="input-group"><label>${t('عملة الدفع', 'Payment currency')}</label>
                        <input type="text" class="acct-currency-readonly" readonly value="${t('ر.ع. OMR', 'OMR')}"></div>
                    <div class="input-group"><label>${t('المبلغ المستلم', 'Amount received')}</label>
                        <input type="number" id="manualEntryAmount" min="0" step="0.001" placeholder="0.000" oninput="onManualEntryAmountChange()"></div>
                    <div class="input-group"><label>${t('التاريخ', 'Date')}</label>
                        <input type="date" id="manualEntryDate" value="${new Date().toISOString().slice(0, 10)}"></div>
                    <div class="input-group" style="grid-column:1/-1"><label>${t('الوصف', 'Description')}</label>
                        <input type="text" id="manualEntryTitle" placeholder="${t('غير محدد', 'Not specified')}"></div>
                    <div class="input-group" style="grid-column:1/-1"><label>${t('حساب الإيراد (تصنيف محاسبي)', 'Revenue account (accounting classification)')}</label>
                        <select id="manualEntryCoa" onchange="onManualEntryCoaUserChange()">${renderCoaSelectOptions('income', defaultCoa)}</select>
                        <small style="display:block;margin-top:6px;font-size:11px;color:#666;line-height:1.45">${t('لا يعني ربط الإيجار تلقائياً — يُستخدم للتصنيف في الدفاتر. الافتراضي: إيرادات أخرى؛ عند ربط شيك/فاتورة إيجار يُختار إيرادات الإيجار تلقائياً.', 'Does not auto-link rent — used for ledger classification. Default: other income; when you link a rent cheque/invoice, rent income is selected automatically.')}</small></div>
                </div>
            </section>
            <details class="acct-wafeq-optional-section">
                <summary>${t('معلومات إضافية (اختياري)', 'Additional information (optional)')}</summary>
                <div class="optional-inner row-2cols">
                </div>
            </details>
            <div id="manualEntryAllocHost" style="display:none">${renderManualEntryAllocationPanelHtml()}</div>
            <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end">
                <button type="button" class="btn-outline" onclick="closeAccountingManualEntryModal()">${t('إلغاء', 'Cancel')}</button>
                <button type="button" class="btn-primary" id="manualEntrySaveBtn" onclick="submitAccountingManualEntry()">${getManualEntrySaveButtonLabel()}</button>
            </div>`;
        }
        return `
            <input type="hidden" id="manualEntryKind" value="expense">
            <input type="hidden" id="manualEntryCounterCoa" value="${escHtml(counterCoa)}">
            <section class="acct-wafeq-basic-section">
                <h5>${t('معلومات أساسية', 'Basic information')}</h5>
                <div class="row-2cols">
                    <div class="input-group acct-voucher-no-field"><label>${t('رقم السند', 'Voucher no.')}</label>
                        <input type="text" id="manualEntryVoucherNo" readonly value="${escHtml(voucherNo)}"></div>
                    <div class="input-group"><label>${t('المرجع', 'Reference')}</label>
                        <input type="text" id="manualEntryRefNo" placeholder="${t('اختياري — رقم مرجع خارجي', 'Optional — external reference no.')}"></div>
                    ${buildManualEntryClientSearchHtml('expense')}
                    <div class="input-group"><label>${t('تم الدفع من خلال', 'Paid through')}</label>
                        <select id="manualEntryBankAccount" onchange="onManualEntryBankAccountChange()">${renderBankAccountSelectOptions('')}</select></div>
                    <div class="input-group"><label>${t('عملة الدفع', 'Payment currency')}</label>
                        <input type="text" class="acct-currency-readonly" readonly value="${t('ر.ع. OMR', 'OMR')}"></div>
                    <div class="input-group"><label>${t('المبلغ المدفوع', 'Amount paid')}</label>
                        <input type="number" id="manualEntryAmount" min="0" step="0.001" placeholder="0.000"></div>
                    <div class="input-group"><label>${t('التاريخ', 'Date')}</label>
                        <input type="date" id="manualEntryDate" value="${new Date().toISOString().slice(0, 10)}"></div>
                    <div class="input-group" style="grid-column:1/-1"><label>${t('الوصف', 'Description')}</label>
                        <input type="text" id="manualEntryTitle" placeholder="${t('غير محدد', 'Not specified')}"></div>
                </div>
            </section>
            <details class="acct-wafeq-optional-section">
                <summary>${t('معلومات إضافية (اختياري)', 'Additional information (optional)')}</summary>
                <div class="optional-inner row-2cols">
                    <div class="input-group"><label>${t('حساب المصروف', 'Expense account')}</label>
                        <select id="manualEntryCoa">${renderCoaSelectOptions('expense', defaultCoa)}</select></div>
                </div>
            </details>
            <div class="input-group" style="margin-top:8px">
                <label>${t('ملاحظة الدفع', 'Payment note')}</label>
                <input type="text" id="manualEntryPayNote" placeholder="${t('مثال: مصروف نقدي', 'e.g. Cash expense')}">
            </div>
            <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end">
                <button type="button" class="btn-outline" onclick="closeAccountingManualEntryModal()">${t('إلغاء', 'Cancel')}</button>
                <button type="button" class="btn-primary" id="manualEntrySaveBtn" onclick="submitAccountingManualEntry()">${getManualEntrySaveButtonLabel()}</button>
            </div>`;
    }

    function openAccountingManualEntryModal(kind) {
        if (!assertPermissionOrAlert('manage_accounting', 'لا تملك صلاحية المحاسبة.', 'No accounting permission.')) return;
        if (!_manualEntryEditEntryId) _manualEntryEditEntryId = '';
        _accountingManualEntryKind = kind === 'expense' ? 'expense' : 'income';
        const modal = document.getElementById('accountingManualEntryModal');
        const body = document.getElementById('accountingManualEntryBody');
        const title = document.getElementById('accountingManualEntryTitle');
        if (!modal || !body) return;
        if (title) {
            if (_manualEntryEditMode === 'revision') {
                title.textContent = t('طلب تعديل سند محاسبي', 'Request accounting voucher edit');
            } else {
                title.textContent = _accountingManualEntryKind === 'expense'
                    ? t('تسجيل سند صرف', 'Record payment voucher')
                    : t('تسجيل سند قبض من عميل', 'Record receipt from client');
            }
        }
        body.innerHTML = buildAccountingManualEntryBodyHtml(_accountingManualEntryKind);
        if (!_manualEntryEditEntryId) {
            _manualEntryEditMode = '';
            _manualEntryAllocState = { items: [], pool: [], mode: 'note' };
            _manualEntryPartyState = { contactKey: '', building: '', unit: '', partyName: '' };
            resetManualEntryClientState();
        }
        initManualEntryClientCombobox();
        modal.classList.add('open');
        try { localizeBilingualUi(); } catch (_e) {}
    }

    function closeAccountingManualEntryModal() {
        document.getElementById('accountingManualEntryModal')?.classList.remove('open');
        _manualEntryEditEntryId = '';
        _manualEntryEditMode = '';
    }

    function resetManualEntryClientState() {
        const abSearch = document.getElementById('manualEntryAbSearch');
        const abKey = document.getElementById('manualEntryAddressBookKey');
        const abResults = document.getElementById('manualEntryAbResults');
        const abSum = document.getElementById('manualEntryAddressBookSummary');
        if (abSearch) abSearch.value = '';
        if (abKey) abKey.value = '';
        if (abResults) {
            abResults.innerHTML = '';
            abResults.style.display = 'none';
        }
        if (abSum) abSum.innerHTML = '';
        closeManualEntryClientDropdown();
        refreshManualEntryAllocationPanel();
    }

    function onManualEntryPartyTypeChange() {
        resetManualEntryClientState();
    }

    async function submitAccountingManualEntry() {
        try {
            if (!assertPermissionOrAlert('manage_accounting', 'لا تملك صلاحية المحاسبة.', 'No accounting permission.')) return;
            const reg = loadAccountingRegistry();
            const existingEntry = resolveExistingManualEntryForEdit(reg);
            const kind = toStr(document.getElementById('manualEntryKind')?.value) || toStr(existingEntry?.type) || 'income';
            const amount = parseFloat(document.getElementById('manualEntryAmount')?.value);
            const entryDate = toStr(document.getElementById('manualEntryDate')?.value);
            let coaAccountId = toStr(document.getElementById('manualEntryCoa')?.value) || toStr(existingEntry?.coaAccountId);
            let bankAccountId = toStr(document.getElementById('manualEntryBankAccount')?.value) || toStr(existingEntry?.bankAccountId);
            const counterCoaId = resolveManualEntryCounterCoaId(bankAccountId || existingEntry?.bankAccountId);
            const title = toStr(document.getElementById('manualEntryTitle')?.value);
            const referenceNo = toStr(document.getElementById('manualEntryRefNo')?.value);
            const paymentNote = toStr(document.getElementById('manualEntryPayNote')?.value) || toStr(existingEntry?.paymentNote);
            const allocState = _manualEntryAllocState || { items: [], pool: [], mode: 'note' };
            if (kind === 'income') syncManualEntryAllocFromDom();
            const allocItems = (allocState.items || []).filter((x) => (parseFloat(x.allocate) || 0) > 0);
            if (kind === 'income' && allocState.mode === 'link') {
                const allocTotal = (allocState.items || []).reduce((s, x) => s + (parseFloat(x.allocate) || 0), 0);
                if (allocTotal > amount + 0.001) {
                    alert(t('مجموع التوزيع أكبر من مبلغ الدفع.', 'Allocated total exceeds payment amount.'));
                    return;
                }
            }
            if (!entryDate || !Number.isFinite(amount) || amount <= 0) {
                alert(t('أدخل التاريخ والمبلغ.', 'Enter date and amount.'));
                return;
            }
            if (!coaAccountId) {
                coaAccountId = kind === 'income' ? getDefaultManualIncomeCoaId(allocItems.length > 0) : 'coa_526';
            } else if (kind === 'income' && document.getElementById('manualEntryCoa')?.dataset.userPicked !== '1') {
                coaAccountId = getDefaultManualIncomeCoaId(allocItems.length > 0);
            }
            if (!bankAccountId) {
                alert(t('اختر حساب الدفع (تم الدفع من خلال).', 'Select the paid-through bank account.'));
                return;
            }
            const abRow = resolveManualEntryAddressBookRow(existingEntry);
            if (!abRow) {
                alert(
                    kind === 'income'
                        ? t('اختر العميل من دفتر العناوين.', 'Select a client from the address book.')
                        : t('اختر المورد أو الجهة من دفتر العناوين.', 'Select a vendor or party from the address book.')
                );
                return;
            }
            const partyName = abRow.name;
            const partyType = kind === 'income' ? 'client' : 'vendor';
            const resolved = getManualEntryResolvedBuildingUnit();
            let building = resolved.building || toStr(existingEntry?.building);
            let unit = resolved.unit || toStr(existingEntry?.unit);
            if (kind === 'income' && allocItems.length && (!building || !unit)) {
                building = allocItems[0].building || building;
                unit = allocItems[0].unit || unit;
            }
            const voucherNo =
                toStr(document.getElementById('manualEntryVoucherNo')?.value) ||
                toStr(existingEntry?.voucherNo) ||
                peekNextManualVoucherNo(kind);
            if (!_manualEntryEditEntryId) commitNextManualVoucherNo(kind);
            const entryTitle =
                title ||
                (kind === 'income'
                    ? `${t('سند قبض', 'Receipt voucher')} ${voucherNo}${partyName ? ` — ${partyName}` : ''}`
                    : `${t('سند صرف', 'Payment voucher')} ${voucherNo}${partyName ? ` — ${partyName}` : ''}`);
            const unitKey = building && unit ? accountingUnitKey(building, unit) : toStr(existingEntry?.unitKey);
            const unitCoaId = building && unit ? ensureCoaForPropertyUnit(building, unit) : toStr(existingEntry?.unitCoaAccountId);
            const partyCoaId = ensureCoaForAddressBookParty(partyName, partyType, reg) || '';
            const journalLines = buildJournalLinesForManualEntry(kind, coaAccountId, counterCoaId, amount, {
                reg,
                bankAccountId,
                partyName,
                partyType,
                paymentAllocations: buildPaymentAllocationSnapshotsFromAllocItems(allocItems, reg),
                title: entryTitle
            });
            const journalCheck = validateAccountingJournalLines(journalLines);
            if (!journalCheck.ok) {
                alert(
                    t('القيد غير متوازن أو غير صالح:', 'Journal entry is invalid or unbalanced:') +
                        '\n' +
                        (journalCheck.errors || []).join('\n')
                );
                return;
            }
            const entryPayload = {
                unitKey,
                building,
                unit,
                sourceKey: partyName || entryTitle,
                type: kind,
                title: entryTitle,
                amount: parseFloat(amount.toFixed(3)),
                dueDate: entryDate,
                status: 'pending_accountant',
                partyType,
                partyName,
                coaAccountId,
                counterCoaAccountId: resolveCoaAccountId(counterCoaId) || 'coa_111',
                partyCoaAccountId: partyCoaId,
                journalLines,
                bankAccountId,
                manualEntry: true,
                voucherNo,
                referenceNo,
                paymentNote,
                unitCoaAccountId: unitCoaId || '',
                allocationMode: allocState.mode || 'note',
                paymentAllocations: buildPaymentAllocationSnapshotsFromAllocItems(allocItems, reg),
                allocationsPending: allocItems.length > 0,
                updatedAt: new Date().toISOString()
            };
            let entry;
            if (_manualEntryEditEntryId) {
                const idx = reg.entries.findIndex((e) => e.id === _manualEntryEditEntryId);
                if (idx < 0) {
                    alert(t('السند غير موجود.', 'Voucher not found.'));
                    return;
                }
                const existing = reg.entries[idx];
                if (_manualEntryEditMode === 'revision') {
                    if (!canRequestAccountingManualEntryChange(existing)) {
                        alert(t('لا يمكن إرسال طلب تعديل لهذا السند.', 'Cannot submit an edit request for this voucher.'));
                        return;
                    }
                    const dlg = await showAppRequestNoteDialog({
                        title: t('طلب تعديل سند', 'Edit voucher request'),
                        message: t(
                            'إرسال طلب تعديل هذا السند؟ سيُراجعه مدير الحسابات قبل التطبيق.',
                            'Submit an edit request? The accounting manager must approve before changes apply.'
                        ),
                        reasonLabel: t('سبب طلب التعديل (اختياري)', 'Reason for edit request (optional)')
                    });
                    if (!dlg.confirmed) return;
                    const submitNote = dlg.note || '';
                    const actor = getCurrentActorLedgerRecord();
                    existing.pendingRequest = ensureAccountingPendingRequestNo(reg, {
                        action: 'edit',
                        submittedAt: new Date().toISOString(),
                        submittedById: actor.staffUserId,
                        submittedByName: actor.staffName,
                        submitNote,
                        thread: [],
                        clarificationAwaitingFrom: null,
                        revision: {
                            ...entryPayload,
                            status: 'confirmed',
                            allocationsPending: allocItems.length > 0
                        }
                    });
                    existing.approvalWorkflowState = 'pending_edit';
                    existing.pendingRequest = normalizeAccountingPendingRequest(existing.pendingRequest);
                    attachAccountingApprovalChainToEntry(existing, 'edit');
                    existing.updatedAt = new Date().toISOString();
                    entry = existing;
                } else {
                    if (!canEditAccountingManualEntry(existing)) {
                        alert(t('لا يمكن تعديل هذا السند.', 'This voucher cannot be edited.'));
                        return;
                    }
                    if (toStr(existing.status) === 'rejected') entryPayload.status = 'pending_accountant';
                    entryPayload.approvalWorkflowState = 'pending_create';
                    entry = {
                        ...existing,
                        ...entryPayload,
                        id: existing.id,
                        linkedKey: existing.linkedKey || `manual|${kind}|${Date.now()}`,
                        createdByAt: existing.createdByAt,
                        createdByName: existing.createdByName,
                        createdById: existing.createdById,
                        approvalHistory: existing.approvalHistory
                    };
                    reg.entries[idx] = entry;
                }
            } else {
                entry = {
                    id: newAccountingId('ent'),
                    linkedKey: `manual|${kind}|${Date.now()}`,
                    approvalWorkflowState: 'pending_create',
                    ...entryPayload
                };
                stampAccountingEntryCreatedBy(entry);
                entry.pendingRequest = normalizeAccountingPendingRequest(
                    ensureAccountingPendingRequestNo(reg, {
                        action: 'create',
                        submittedAt: entry.createdByAt,
                        submittedById: entry.createdById,
                        submittedByName: entry.createdByName,
                        submitNote: '',
                        thread: [],
                        clarificationAwaitingFrom: null
                    })
                );
                attachAccountingApprovalChainToEntry(entry, 'create');
                reg.entries.push(entry);
            }
            if (unitKey) recomputeAccountingAccountSummary(reg, unitKey);
            if (!saveAccountingRegistry(reg)) return;
            recordSystemActivity({
                actionKey: _manualEntryEditEntryId
                    ? _manualEntryEditMode === 'revision'
                        ? 'accounting_manual_entry_edit_request'
                        : 'accounting_manual_entry_edit'
                    : 'accounting_manual_entry',
                actionAr:
                    _manualEntryEditMode === 'revision'
                        ? 'طلب تعديل سند محاسبي'
                        : kind === 'income'
                          ? 'إيراد يدوي'
                          : 'مصروف يدوي',
                actionEn:
                    _manualEntryEditMode === 'revision'
                        ? 'Accounting voucher edit request'
                        : kind === 'income'
                          ? 'Manual income'
                          : 'Manual expense',
                building,
                unit,
                ref: entryTitle,
                note: summaryAmtOm(amount)
            });
            const wasRevisionRequest = _manualEntryEditMode === 'revision';
            closeAccountingManualEntryModal();
            _accountingUiState.tab = wasRevisionRequest ? 'pending' : kind === 'expense' ? 'expense' : 'income';
            renderAccountingWorkspace();
            refreshAccountingReceiptDetailModalIfOpen();
            try {
                updateNotificationsNavBadge();
                refreshNotificationsIfVisible();
            } catch (_eN) {}
            alert(
                wasRevisionRequest
                    ? t(
                          'تم إرسال طلب التعديل وبانتظار اعتماد مدير الحسابات.',
                          'Edit request submitted and awaiting accounting manager approval.'
                      )
                    : t(
                          'تم حفظ السند وبانتظار اعتماد مدير الحسابات.',
                          'Voucher saved and awaiting accounting manager approval.'
                      )
            );
        } catch (eSubmitManual) {
            console.error('submitAccountingManualEntry', eSubmitManual);
            alert(
                t(
                    `تعذّر حفظ السند: ${toStr(eSubmitManual?.message) || 'خطأ غير معروف'}`,
                    `Could not save voucher: ${toStr(eSubmitManual?.message) || 'unknown error'}`
                )
            );
        }
    }

    function openPenaltyAdjustModal(entryId) {
        if (!canWaiveChequePenalty()) {
            alert(t('ليس لديك صلاحية إعفاء أو تخفيض الغرامة.', 'You cannot waive or reduce penalties.'));
            return;
        }
        const reg = loadAccountingRegistry();
        const ent = reg.entries.find((e) => e.id === entryId);
        if (!ent || ent.penaltyKind !== 'bounce') return;
        const waived = !!ent.penaltyWaived;
        const newAmt = prompt(
            t(`المبلغ الجديد للغرامة (الأصلي ${summaryAmtOm(ent.penaltyOriginalAmount || ent.amount)}):`, `New penalty amount (original ${summaryAmtOm(ent.penaltyOriginalAmount || ent.amount)}):`),
            String(ent.amount)
        );
        if (newAmt == null) return;
        const reason = toStr(prompt(t('سبب التخفيض/الإعفاء:', 'Reason for reduction/waiver:'), ent.penaltyWaiveReason || ''));
        const amt = Math.max(0, parseFloat(newAmt) || 0);
        ent.amount = amt;
        ent.penaltyWaived = amt === 0 || amt < (parseFloat(ent.penaltyOriginalAmount) || 0);
        ent.penaltyWaiveReason = reason;
        ent.updatedAt = new Date().toISOString();
        saveAccountingRegistry(reg);
        recomputeAccountingAccountSummary(reg, ent.unitKey);
        saveAccountingRegistry(reg);
        renderAccountingWorkspace();
    }

    function accountingChequeBucket(cheque) {
        if (!cheque) return 'other';
        const st = toStr(cheque.status) || 'pending';
        if (isAccountingChequePaidStatus(st)) return 'paid';
        if (st === 'deferred') return 'deferred';
        if (st === 'bounced' || st === 'returned') return 'claims';
        if (isAccountingChequeOverdue(cheque)) return 'overdue';
        const due = toStr(cheque.dueDate);
        if (due) {
            const dueDt = parseYmdToLocalDate(due);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (dueDt && dueDt > today) return 'upcoming';
        }
        return 'due';
    }

    function getAccountingTenantsForUnit(building, unit) {
        const b = toStr(building);
        const u = toStr(unit);
        const unitKey = accountingUnitKey(b, u);
        const reg = loadAccountingRegistry();
        const map = new Map();
        const addPeriod = (tenant, agreementNo, start, end, active, source) => {
            const tk = accountingTenantKey(tenant, agreementNo);
            if (!tk || tk === '|') return;
            const prev = map.get(tk) || {
                tenantKey: tk,
                tenant: toStr(tenant),
                agreementNo: toStr(agreementNo),
                startDate: toStr(start),
                endDate: toStr(end),
                active: !!active,
                source: source || 'registry'
            };
            if (active) prev.active = true;
            if (!prev.startDate && start) prev.startDate = toStr(start);
            if (!prev.endDate && end) prev.endDate = toStr(end);
            map.set(tk, prev);
        };
        const current = getSavedContractPayloadForUnit({ building: b, unit: u });
        if (current) {
            addPeriod(
                current.tenantName || current.tenant,
                current.agreementNo,
                current.startDate,
                current.endDate,
                true,
                'current'
            );
        }
        try {
            const hlist = loadContractHistoryByUnitMap()[unitKey];
            if (Array.isArray(hlist)) {
                hlist.forEach((h) => {
                    const p = h?.payload;
                    if (!p) return;
                    addPeriod(p.tenantName || p.tenant, p.agreementNo, p.startDate, p.endDate, false, 'history');
                });
            }
        } catch (_eHist) {}
        reg.cheques.filter((c) => c.unitKey === unitKey).forEach((c) => {
            addPeriod(c.tenant, c.agreementNo, '', '', false, 'cheque');
        });
        reg.deposits.filter((d) => d.unitKey === unitKey).forEach((d) => {
            addPeriod(d.tenant, d.agreementNo, '', '', false, 'deposit');
        });
        reg.entries.filter((e) => e.unitKey === unitKey).forEach((e) => {
            addPeriod(e.tenant, e.agreementNo, '', '', false, 'entry');
        });
        return [...map.values()].sort((a, b) => {
            if (a.active !== b.active) return a.active ? -1 : 1;
            return toStr(b.endDate).localeCompare(toStr(a.endDate));
        });
    }

    function accountingRowsForTenant(unitKey, tenantKey) {
        const reg = loadAccountingRegistry();
        const matchTenant = (row) => {
            if (!tenantKey) return true;
            return accountingTenantKey(row.tenant, row.agreementNo) === tenantKey;
        };
        return {
            cheques: reg.cheques.filter((c) => c.unitKey === unitKey && matchTenant(c)),
            entries: reg.entries.filter((e) => e.unitKey === unitKey && matchTenant(e)),
            deposits: reg.deposits.filter((d) => d.unitKey === unitKey && matchTenant(d))
        };
    }

    function newAccountingId(prefix) {
        return `acct_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    function accountingChequeLinkedKey(building, unit, sourceType, index, chequeNo) {
        void chequeNo;
        return `${accountingUnitKey(building, unit)}|${toStr(sourceType)}|${parseInt(index, 10) || 0}`;
    }

    function accountingEntryLinkedKey(building, unit, sourceKey) {
        return `${accountingUnitKey(building, unit)}|entry|${toStr(sourceKey)}`;
    }

    function accountingDepositLinkedKey(building, unit, itemId) {
        return `${accountingUnitKey(building, unit)}|deposit|${toStr(itemId)}`;
    }

    function isAccountingChequePaidStatus(status) {
        const s = toStr(status);
        return s === 'paid_full' || s === 'paid_partial' || s === 'paid_cash';
    }

    function isAccountingDepositHeldStatus(status) {
        return toStr(status) === 'held';
    }

    function isAccountingDepositPendingReceipt(status) {
        return toStr(status) === 'pending_receipt';
    }

    function isAccountingChequePendingReceipt(status) {
        return toStr(status) === 'pending_receipt';
    }

    function accountingChequeStatusLabel(status) {
        const map = {
            awaiting_contract_data: t('بانتظار بيانات العقد (رقم/مرفق)', 'Awaiting contract data (no./file)'),
            pending_receipt: t('بانتظار اعتماد الاستلام', 'Awaiting receipt confirmation'),
            pending: t('معلق', 'Pending'),
            deferred: t('مؤجّل', 'Deferred'),
            paid_full: t('مدفوع كامل', 'Paid in full'),
            paid_partial: t('مدفوع جزئي', 'Partial'),
            paid_cash: t('نقداً', 'Cash'),
            bounced: t('مرتجع بنكي', 'Bounced'),
            returned: t('مُعاد', 'Returned'),
            receipt_rejected: t('استلام مرفوض', 'Receipt rejected')
        };
        return map[toStr(status)] || toStr(status) || '—';
    }

    function accountingDepositStatusLabel(status) {
        const map = {
            pending_receipt: t('بانتظار اعتماد الاستلام', 'Awaiting receipt confirmation'),
            held: t('محتجَز', 'Held'),
            released: t('مُعاد', 'Released'),
            refunded: t('مُسترد', 'Refunded'),
            receipt_rejected: t('استلام مرفوض', 'Receipt rejected')
        };
        return map[toStr(status)] || toStr(status) || '—';
    }

    /** اعتماد الضمان وبنود/شيكات الضمان فقط — دون شيكات الإيجار / Deposit + deposit-cheque lines only (not rent cheques) */
    function contractDepositAccountingApprovalsComplete(building, unit, payloadOpt) {
        const payload =
            payloadOpt ||
            getContractPayloadForUnit({ building, unit }) ||
            getSavedContractPayloadForUnit({ building, unit });
        const acct = resolveContractWorkflowPrimaryUnit(building, unit, payload);
        const b = acct.building;
        const u = acct.unit;
        if (!b || !u) return true;
        const unitKey = accountingUnitKey(b, u);
        const reg = loadAccountingRegistry();
        const deposits = (reg.deposits || []).filter((d) => d.unitKey === unitKey);
        const relevantKeys = new Set();
        const depositAmount = parseFloat(payload?.depositAmount) || 0;
        if (depositAmount > 0) {
            relevantKeys.add(accountingDepositLinkedKey(b, u, 'security'));
        }
        const insRows = payload ? parsePayloadJsonArrayField(payload, 'insuranceDepositItemsJson', 'insuranceDepositItems') : [];
        insRows.forEach((row, i) => {
            const amt = parseFloat(row.amount) || 0;
            if (amt <= 0) return;
            const itemId = toStr(row.id || row.rowId || i + 1);
            relevantKeys.add(accountingDepositLinkedKey(b, u, `ins_${itemId}`));
        });
        if (!relevantKeys.size) return true;
        const relevant = deposits.filter((d) => relevantKeys.has(d.linkedKey));
        if (relevant.some((d) => isAccountingDepositPendingReceipt(d.status))) return false;
        if (relevant.some((d) => toStr(d.status) === 'receipt_rejected')) return false;
        for (const key of relevantKeys) {
            const dep = deposits.find((d) => d.linkedKey === key);
            if (!dep || !isAccountingDepositHeldStatus(dep.status)) return false;
        }
        return true;
    }

    function contractSaveRequiresDepositAccountingBeforeSave(building, unit, payloadOpt) {
        const primary = resolveContractWorkflowPrimaryUnit(building, unit, payloadOpt);
        const b = primary.building;
        const u = primary.unit;
        if (!b || !u) return false;
        if (!unitHasTenancyDraftForUnit(b, u)) return false;
        if (getSavedContractMapEntry(loadSavedContractsByUnitMap(), b, u)) return false;
        return true;
    }

    function describeContractDepositAccountingApprovalGaps(building, unit, payloadOpt) {
        const gaps = [];
        const payload =
            payloadOpt ||
            getContractPayloadForUnit({ building, unit }) ||
            getSavedContractPayloadForUnit({ building, unit });
        const acct = resolveContractWorkflowPrimaryUnit(building, unit, payload);
        const b = acct.building;
        const u = acct.unit;
        if (!b || !u) return gaps;
        const unitKey = accountingUnitKey(b, u);
        const reg = loadAccountingRegistry();
        const deposits = (reg.deposits || []).filter((d) => d.unitKey === unitKey);
        const depositAmount = parseFloat(payload?.depositAmount) || 0;
        if (depositAmount > 0) {
            const sec = deposits.find((d) => d.type === 'security');
            if (!sec) {
                gaps.push(t('مبلغ الضمان — لم يُرسَل بعد إلى المحاسبة', 'Security deposit — not queued to accounting yet'));
            } else if (toStr(sec.status) === 'receipt_rejected') {
                gaps.push(t('مبلغ الضمان — استلام مرفوض (راجع المحاسبة)', 'Security deposit — receipt rejected (see Accounting)'));
            } else if (isAccountingDepositPendingReceipt(sec.status)) {
                gaps.push(t('مبلغ الضمان — بانتظار اعتماد المحاسب', 'Security deposit — awaiting accountant approval'));
            } else if (!isAccountingDepositHeldStatus(sec.status)) {
                gaps.push(t('مبلغ الضمان — لم يُعتمد استلامه بعد', 'Security deposit — receipt not confirmed yet'));
            }
        }
        const insRows = payload ? parsePayloadJsonArrayField(payload, 'insuranceDepositItemsJson', 'insuranceDepositItems') : [];
        insRows.forEach((row, i) => {
            const amt = parseFloat(row.amount) || 0;
            if (amt <= 0) return;
            const payType = toStr(row.payType);
            const title = toStr(row.title || row.label) || t(`بند ضمان ${i + 1}`, `Deposit line ${i + 1}`);
            const itemId = toStr(row.id || row.rowId || i + 1);
            const linkedKey = accountingDepositLinkedKey(b, u, `ins_${itemId}`);
            const dep = deposits.find((d) => d.linkedKey === linkedKey);
            const kindLbl =
                payType === 'cheque' || payType === 'cheque_group'
                    ? t('شيك ضمان', 'Deposit cheque')
                    : t('بند ضمان', 'Deposit line');
            if (!dep) {
                gaps.push(`${kindLbl}: ${title} — ${t('لم يُرسَل إلى المحاسبة', 'not queued to accounting')}`);
            } else if (toStr(dep.status) === 'receipt_rejected') {
                gaps.push(`${kindLbl}: ${title} — ${t('استلام مرفوض', 'receipt rejected')}`);
            } else if (isAccountingDepositPendingReceipt(dep.status)) {
                gaps.push(`${kindLbl}: ${title} — ${t('بانتظار اعتماد المحاسب', 'awaiting accountant approval')}`);
            } else if (!isAccountingDepositHeldStatus(dep.status)) {
                gaps.push(`${kindLbl}: ${title} — ${t('لم يُعتمد استلامه', 'receipt not confirmed')}`);
            }
        });
        return gaps;
    }

    function assertContractDepositAccountingApprovedForSaveOrAlert(data) {
        const primary = resolveContractWorkflowPrimaryUnit(data?.buildingNo, data?.flatNo, data);
        const b = primary.building;
        const u = primary.unit;
        if (!contractSaveRequiresDepositAccountingBeforeSave(b, u, data)) return true;
        try {
            syncAccountingFromContractPayload(b, u, data);
        } catch (_eSyncDepSav) {}
        if (contractDepositAccountingApprovalsComplete(b, u, data)) return true;
        const gaps = describeContractDepositAccountingApprovalGaps(b, u, data);
        const body = gaps.length
            ? gaps.map((g) => '• ' + g).join('\n')
            : t('مبلغ الضمان و/أو شيكات الضمان', 'Security deposit and/or deposit cheques');
        alert(
            t(
                '⏳ لا يمكن حفظ بيانات العقد قبل اعتماد المحاسب على استلام مبلغ الضمان وشيك الضمان (إن وُجد).\n\nالبنود المعلّقة:\n' +
                    body +
                    '\n\nافتح المحاسبة → بانتظار الاعتماد لإتمام التأكيد.',
                '⏳ Cannot save contract data until accounting confirms security deposit receipt and deposit cheque (if any).\n\nPending items:\n' +
                    body +
                    '\n\nOpen Accounting → Pending to complete confirmation.'
            )
        );
        return false;
    }

    function refreshContractSaveDockAccountingGateUi() {
        const saveBtn = document.getElementById('contractsSaveDockPrimaryBtn');
        const draftBtn = document.getElementById('contractsSaveDockDraftBtn');
        const hint = document.getElementById('contractsSaveDockHint');
        if (!saveBtn || !isContractsWorkspaceScreenActive()) return;
        const setDraftVisible = (visible) => {
            if (!draftBtn) return;
            draftBtn.style.display = visible ? '' : 'none';
            if (visible) {
                draftBtn.textContent = t(
                    draftBtn.getAttribute('data-ar') || '💾 حفظ كمسودة',
                    draftBtn.getAttribute('data-en') || '💾 Save as draft'
                );
            }
        };
        const restoreHint = () => {
            if (!hint) return;
            hint.textContent = t(hint.getAttribute('data-ar') || '', hint.getAttribute('data-en') || '');
        };
        const lockedBySaved = isCurrentUnitSavedContractLocked() && !contractAdditionalDataMode && !contractActivationDataMode;
        const root = document.getElementById('contractsWorkspace');
        const wsLocked = !!(root && root.classList.contains('contracts-workspace--reservation-locked'));
        if (lockedBySaved) {
            setDraftVisible(false);
            saveBtn.classList.remove('contracts-save-dock-primary--accounting-pending');
            restoreHint();
            return;
        }
        if (wsLocked) {
            setDraftVisible(false);
            saveBtn.disabled = true;
            saveBtn.classList.remove('contracts-save-dock-primary--accounting-pending');
            return;
        }
        const b = toStr(document.getElementById('buildingNo')?.value);
        const u = toStr(document.getElementById('flatNo')?.value);
        if (!contractSaveRequiresDepositAccountingBeforeSave(b, u)) {
            setDraftVisible(false);
            saveBtn.disabled = false;
            saveBtn.classList.remove('contracts-save-dock-primary--accounting-pending');
            saveBtn.title = '';
            restoreHint();
            return;
        }
        let payload = null;
        try {
            payload = collectStorableContractFullFromDom();
            const primary = resolveContractWorkflowPrimaryUnit(b, u, payload);
            syncAccountingFromContractPayload(primary.building, primary.unit, payload, undefined, { skipSave: false });
        } catch (_eGateUi) {}
        const primary = resolveContractWorkflowPrimaryUnit(b, u, payload);
        const blocked = !contractDepositAccountingApprovalsComplete(primary.building, primary.unit, payload);
        saveBtn.disabled = false;
        saveBtn.classList.toggle('contracts-save-dock-primary--accounting-pending', blocked);
        if (blocked) {
            setDraftVisible(true);
            saveBtn.title = t(
                'اضغط لعرض البنود المعلّقة — بانتظار اعتماد المحاسب على استلام الضمان وشيك الضمان',
                'Click to see pending items — awaiting accountant confirmation of deposit and deposit cheque receipt'
            );
            if (hint) {
                hint.textContent = t(
                    '⏳ الحفظ النهائي معطّل حتى يعتمد المحاسب استلام مبلغ الضمان وشيك الضمان (إن وُجد) من شاشة المحاسبة. استخدم «حفظ كمسودة» للاحتفاظ ببياناتك، أو اضغط «حفظ بيانات العقد» لعرض التفاصيل.',
                    '⏳ Final save is blocked until accounting confirms security deposit and deposit cheque (if any). Use «Save as draft» to keep your data, or click «Save contract data» for details.'
                );
            }
        } else {
            setDraftVisible(false);
            saveBtn.title = '';
            saveBtn.classList.remove('contracts-save-dock-primary--accounting-pending');
            restoreHint();
        }
    }

    function contractAccountingApprovalsComplete(building, unit, payloadOpt) {
        if (!contractDepositAccountingApprovalsComplete(building, unit, payloadOpt)) return false;
        const b = toStr(building);
        const u = toStr(unit);
        if (!b || !u) return true;
        const unitKey = accountingUnitKey(b, u);
        const reg = loadAccountingRegistry();
        const cheques = (reg.cheques || []).filter((c) => c.unitKey === unitKey);
        if (cheques.some((c) => isAccountingChequePendingReceipt(c.status))) return false;
        if (cheques.some((c) => toStr(c.status) === 'receipt_rejected')) return false;
        return true;
    }

    function countAccountingContractReceiptPending(regOpt) {
        const reg = regOpt || loadAccountingRegistry();
        let n = 0;
        (reg.deposits || []).forEach((d) => {
            if (isAccountingDepositPendingReceipt(d.status)) n++;
        });
        (reg.cheques || []).forEach((c) => {
            if (isAccountingChequePendingReceipt(c.status)) n++;
        });
        return n;
    }

    function countAccountingContractReceiptPendingForUnit(building, unit, regOpt) {
        const unitKey = accountingUnitKey(building, unit);
        const reg = regOpt || loadAccountingRegistry();
        let n = 0;
        (reg.deposits || []).forEach((d) => {
            if (d.unitKey === unitKey && isAccountingDepositPendingReceipt(d.status)) n++;
        });
        (reg.cheques || []).forEach((c) => {
            if (c.unitKey === unitKey && isAccountingChequePendingReceipt(c.status)) n++;
        });
        return n;
    }

    function isAccountingDepositReceiptConfirmed(dep) {
        if (!dep) return false;
        return isAccountingDepositHeldStatus(dep.status) || !!dep.receiptApprovedAt;
    }

    function isAccountingChequeReceiptConfirmedForPrint(ch) {
        if (!ch) return false;
        if (isAccountingChequePendingReceipt(ch.status) || toStr(ch.status) === 'receipt_rejected') return false;
        if (ch.receiptApprovedAt) return true;
        if ((ch.actions || []).some((a) => a.actionType === 'receipt_confirmed')) return true;
        return !!ch.linkedKey;
    }

    function getAccountingDepositsForContractReceiptPrint(building, unit) {
        const unitKey = accountingUnitKey(building, unit);
        return (loadAccountingRegistry().deposits || []).filter(
            (d) => d.unitKey === unitKey && isAccountingDepositReceiptConfirmed(d)
        );
    }

    function getAccountingChequesForContractReceiptPrint(building, unit) {
        const unitKey = accountingUnitKey(building, unit);
        return (loadAccountingRegistry().cheques || []).filter(
            (c) => c.unitKey === unitKey && isAccountingChequeReceiptConfirmedForPrint(c)
        );
    }

    function getAccountingDepositReceiptConfirmationMeta(dep) {
        return {
            at: dep.receiptApprovedAt || dep.updatedAt || '',
            by: dep.receiptApprovedByName || '',
            note: dep.receiptApprovalNote || ''
        };
    }

    function getAccountingChequeReceiptConfirmationMeta(ch) {
        if (ch.receiptApprovedAt) {
            return {
                at: ch.receiptApprovedAt,
                by: ch.receiptApprovedByName || '',
                note: ''
            };
        }
        const act = (ch.actions || []).slice().reverse().find((a) => a.actionType === 'receipt_confirmed');
        if (act) {
            return {
                at: act.actionDate || act.at || '',
                by: act.actorName || '',
                note: act.actionNote || ''
            };
        }
        return { at: '', by: '', note: '' };
    }

    function getCurrentContractWorkspaceUnit() {
        const b = toStr(document.getElementById('buildingNo')?.value);
        const u = toStr(document.getElementById('flatNo')?.value);
        return b && u ? { building: b, unit: u } : null;
    }

    function refreshContractsAccountingReceiptPrintUi() {
        const wrap = document.getElementById('contractsAccountingReceiptPrintWrap');
        if (!wrap) return;
        const showWs = typeof isContractsWorkspaceScreenActive === 'function' && isContractsWorkspaceScreenActive();
        const loc = showWs ? getCurrentContractWorkspaceUnit() : null;
        if (!loc) {
            wrap.style.display = 'none';
            return;
        }
        const deps = getAccountingDepositsForContractReceiptPrint(loc.building, loc.unit);
        const chqs = getAccountingChequesForContractReceiptPrint(loc.building, loc.unit);
        const depBtn = document.getElementById('contractsPrintDepositReceiptBtn');
        const chqBtn = document.getElementById('contractsPrintChequesReceiptBtn');
        if (depBtn) depBtn.style.display = deps.length ? '' : 'none';
        if (chqBtn) chqBtn.style.display = chqs.length ? '' : 'none';
        wrap.style.display = deps.length || chqs.length ? 'flex' : 'none';
        try {
            refreshContractSaveDockAccountingGateUi();
        } catch (_eSavDockGate) {}
    }

    function refreshUnitDetailsAccountingReceiptPrintUi(unit) {
        const host = document.getElementById('unitDetailsAccountingReceiptPrintHost');
        if (!host) return;
        if (unit && isLinkedContractSecondaryUnitForDisplay(unit)) {
            host.style.display = 'none';
            return;
        }
        const prim = unit ? getLinkedContractDisplayPrimaryUnit(unit) : null;
        const b = toStr(prim?.building || unit?.building);
        const u = toStr(prim?.unit || unit?.unit);
        if (!b || !u) {
            host.style.display = 'none';
            return;
        }
        const deps = getAccountingDepositsForContractReceiptPrint(b, u);
        const chqs = getAccountingChequesForContractReceiptPrint(b, u);
        const depBtn = document.getElementById('unitDetailsPrintDepositReceiptBtn');
        const chqBtn = document.getElementById('unitDetailsPrintChequesReceiptBtn');
        if (depBtn) depBtn.style.display = deps.length ? '' : 'none';
        if (chqBtn) chqBtn.style.display = chqs.length ? '' : 'none';
        host.style.display = deps.length || chqs.length ? 'flex' : 'none';
    }

    function printUnitDetailsDepositReceipt() {
        const unit = selectedUnitDetailsRecord;
        if (!unit) return;
        printAccountingDepositReceiptForUnit(unit.building, unit.unit);
    }

    function printUnitDetailsChequesReceiptReport() {
        const unit = selectedUnitDetailsRecord;
        if (!unit) return;
        printAccountingContractChequesReceiptReport(unit.building, unit.unit);
    }

    function printContractDepositReceiptFromWorkspace() {
        const loc = getCurrentContractWorkspaceUnit();
        if (!loc) {
            alert(t('أكمل المبنى والوحدة أولاً.', 'Enter building and unit first.'));
            return;
        }
        printAccountingDepositReceiptForUnit(loc.building, loc.unit);
    }

    function printContractChequesReceiptReportFromWorkspace() {
        const loc = getCurrentContractWorkspaceUnit();
        if (!loc) {
            alert(t('أكمل المبنى والوحدة أولاً.', 'Enter building and unit first.'));
            return;
        }
        printAccountingContractChequesReceiptReport(loc.building, loc.unit);
    }

    function refreshContractLifecycleAfterAccountingApproval(building, unit) {
        const b = toStr(building);
        const u = toStr(unit);
        const payload = getSavedContractPayloadForUnit({ building: b, unit: u });
        if (payload) {
            const newStatus = resolveContractLifecycleStatus(payload);
            const map = loadSavedContractsByUnitMap();
            const k = _tenancyDraftStorageKey(b, u);
            const entry = map[k];
            if (entry) {
                if (toStr(entry.lifecycleStatus) !== newStatus || toStr(payload.contractSavedStatus) !== newStatus) {
                    payload.contractSavedStatus = newStatus;
                    entry.payload = payload;
                    entry.lifecycleStatus = newStatus;
                    entry.updatedAt = new Date().toISOString();
                    map[k] = entry;
                    saveSavedContractsByUnitMap(map);
                }
            }
        }
        try {
            repairLinkedContractUnitsLifecycleConsistency();
        } catch (_eRepLinkedLife) {}
        try {
            if (typeof refreshUnitsViewIfNeeded === 'function') refreshUnitsViewIfNeeded();
        } catch (_eRefUnits) {}
        try {
            if (typeof renderRentedUnitsTable === 'function') renderRentedUnitsTable();
        } catch (_eRefRent) {}
        try {
            if (typeof renderContractsListPanel === 'function') renderContractsListPanel();
        } catch (_eRefCList) {}
    }

    function isAccountingChequeOverdue(cheque) {
        if (!cheque) return false;
        const st = toStr(cheque.status) || 'pending';
        if (st === 'pending_receipt' || st === 'receipt_rejected') return false;
        if (st !== 'pending' && st !== 'paid_partial' && st !== 'deferred') return false;
        const due = toStr(cheque.dueDate);
        if (!due) return false;
        const dueDt = parseYmdToLocalDate(due);
        if (!dueDt) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dueDt < today;
    }

    function accountingChequeStatusChip(status, overdue) {
        const st = toStr(status) || 'pending';
        const cls = overdue && (st === 'pending' || st === 'paid_partial') ? 'acct-status-overdue' : `acct-status-${st}`;
        const label = overdue && (st === 'pending' || st === 'paid_partial')
            ? t('متأخر', 'Overdue')
            : accountingChequeStatusLabel(st);
        return `<span class="acct-status-chip ${cls}">${escHtml(label)}</span>`;
    }

    function accountingEntryStatusLabel(status) {
        const map = {
            pending: t('معلق', 'Pending'),
            pending_accountant: t('غير معتمد', 'Not approved'),
            confirmed: t('معتمد', 'Approved'),
            invoiced: t('معتمد', 'Approved'),
            rejected: t('مرفوض', 'Rejected')
        };
        return map[toStr(status)] || toStr(status) || '—';
    }

    function accountingEntryHasPendingRequest(entry) {
        if (entry && entry.pendingRequest && toStr(entry.pendingRequest.action)) return true;
        const wf = toStr(entry?.approvalWorkflowState);
        return wf === 'pending_edit' || wf === 'pending_delete' || wf === 'pending_create';
    }

    function isAccountingEntryPendingApproval(entry) {
        if (!entry) return false;
        if (toStr(entry.status) === 'pending_accountant' || toStr(entry.status) === 'rejected') return true;
        return accountingEntryHasPendingRequest(entry);
    }

    function accountingPendingActionLabel(entry) {
        const wf = toStr(entry?.approvalWorkflowState);
        if (accountingEntryHasPendingRequest(entry)) {
            const act = toStr(entry.pendingRequest?.action) || wf.replace('pending_', '');
            if (act === 'edit') return t('طلب تعديل', 'Edit request');
            if (act === 'delete') return t('طلب حذف', 'Delete request');
        }
        if (toStr(entry.status) === 'rejected') return t('مرفوض', 'Rejected');
        return t('معاملة جديدة', 'New transaction');
    }

    function accountingEntryDisplayStatusLabel(entry) {
        const wf = toStr(entry?.approvalWorkflowState);
        if (accountingEntryHasPendingRequest(entry)) {
            const act = toStr(entry.pendingRequest?.action) || wf.replace('pending_', '');
            if (act === 'edit') return t('تعديل غير معتمد', 'Edit not approved');
            if (act === 'delete') return t('حذف غير معتمد', 'Delete not approved');
            return t('غير معتمد', 'Not approved');
        }
        if (toStr(entry.status) === 'pending_accountant') return t('غير معتمد', 'Not approved');
        if (toStr(entry.status) === 'rejected') return t('مرفوض', 'Rejected');
        if (toStr(entry.status) === 'confirmed' || toStr(entry.status) === 'invoiced') return t('معتمد', 'Approved');
        return accountingEntryStatusLabel(entry.status);
    }

    function accountingEntryLedgerStatusCell(entry) {
        const label = accountingEntryDisplayStatusLabel(entry);
        const st = toStr(entry?.status);
        const pending = isAccountingEntryPendingApproval(entry) && st !== 'rejected';
        const approved = st === 'confirmed' || st === 'invoiced';
        const cls = pending ? 'acct-status--unapproved' : approved ? 'acct-status--approved' : '';
        return cls ? `<span class="acct-status-chip ${cls}">${escHtml(label)}</span>` : escHtml(label);
    }

    function formatAccountingAuditDateTime(iso) {
        const s = toStr(iso);
        if (!s) return '—';
        return s.slice(0, 16).replace('T', ' ');
    }

    function stampAccountingEntryCreatedBy(entry) {
        const actor = getCurrentActorLedgerRecord();
        entry.createdByAt = entry.createdByAt || new Date().toISOString();
        entry.createdByName = entry.createdByName || actor.staffName;
        entry.createdById = entry.createdById || actor.staffUserId;
    }

    function pushAccountingApprovalHistory(entry, item) {
        if (!entry) return;
        entry.approvalHistory = Array.isArray(entry.approvalHistory) ? entry.approvalHistory : [];
        entry.approvalHistory.push(item);
    }

    function snapshotAccountingEntryForAudit(entry) {
        if (!entry) return null;
        return {
            amount: entry.amount,
            dueDate: entry.dueDate,
            title: entry.title,
            paymentNote: entry.paymentNote,
            referenceNo: entry.referenceNo,
            partyName: entry.partyName,
            bankAccountId: entry.bankAccountId,
            voucherNo: entry.voucherNo,
            paymentAllocations: JSON.parse(JSON.stringify(entry.paymentAllocations || []))
        };
    }

    function snapshotAccountingPendingRequestForHistory(entry, pendingReq) {
        if (!pendingReq) return null;
        const pr = normalizeAccountingPendingRequest(JSON.parse(JSON.stringify(pendingReq)));
        return {
            action: pr.action,
            requestNo: toStr(pr.requestNo),
            submittedAt: pr.submittedAt,
            submittedById: pr.submittedById,
            submittedByName: pr.submittedByName,
            submitNote: pr.submitNote,
            thread: Array.isArray(pr.thread) ? pr.thread : [],
            revision: pr.revision ? JSON.parse(JSON.stringify(pr.revision)) : null,
            beforeEntry: snapshotAccountingEntryForAudit(entry)
        };
    }

    function buildAccountingAuditRequestActionLabel(action) {
        if (action === 'edit') return t('طلب تعديل', 'Edit request');
        if (action === 'delete') return t('طلب حذف', 'Delete request');
        return t('طلب اعتماد', 'Approval request');
    }

    function buildAccountingAuditCycleDetailEvents(cycle) {
        const events = [];
        const snap = cycle?.requestSnapshot;
        if (snap) {
            events.push({
                type: 'request',
                at: snap.submittedAt,
                by: snap.submittedByName,
                title: buildAccountingAuditRequestActionLabel(snap.action),
                text: snap.submitNote || '—',
                requestNo: toStr(snap.requestNo)
            });
            (snap.thread || []).forEach((m) => {
                if (
                    toStr(m.text) === toStr(snap.submitNote) &&
                    toStr(m.at).slice(0, 16) === toStr(snap.submittedAt).slice(0, 16)
                ) {
                    return;
                }
                events.push({
                    type: m.role === 'admin' ? 'clarification-admin' : 'clarification-requester',
                    at: m.at,
                    by: toStr(m.byUserName) || toStr(m.byUserId),
                    title:
                        m.role === 'admin'
                            ? t('طلب توضيح من المسؤول', 'Clarification request from manager')
                            : t('رد مقدم الطلب', 'Requester reply'),
                    text: toStr(m.text)
                });
            });
        }
        const resp = cycle?.response;
        if (resp) {
            const actLbl =
                resp.action === 'edit' ? t('تعديل', 'Edit') : resp.action === 'delete' ? t('حذف', 'Delete') : t('إنشاء', 'Create');
            events.push({
                type: resp.decision === 'approved' ? 'response-approve' : 'response-reject',
                at: resp.at,
                by: resp.byName,
                title:
                    resp.decision === 'approved'
                        ? t(`رد الاعتماد — ${actLbl}`, `Approval response — ${actLbl}`)
                        : t(`رد الرفض — ${actLbl}`, `Rejection response — ${actLbl}`),
                text: resp.note || '—',
                requestNo: toStr(resp.requestNo) || toStr(snap?.requestNo)
            });
        }
        events.sort((a, b) => toStr(a.at).localeCompare(toStr(b.at)));
        return events;
    }

    function buildAccountingAuditCycleEditDiffHtml(entry, requestSnapshot, reg) {
        if (!requestSnapshot || requestSnapshot.action !== 'edit' || !requestSnapshot.revision) return '';
        const beforeEntry = {
            ...(entry || {}),
            ...(requestSnapshot.beforeEntry || {}),
            id: entry?.id,
            manualEntry: true
        };
        const fakeEntry = {
            ...beforeEntry,
            pendingRequest: { action: 'edit', revision: requestSnapshot.revision }
        };
        return buildAccountingEditDiffAllocationTableHtml(fakeEntry, reg);
    }

    function buildAccountingAuditCycleDetailBodyHtml(entryId, cycleKey, forPrint) {
        const reg = loadAccountingRegistry();
        const entry = reg.entries.find((e) => e.id === entryId);
        if (!entry) return '';
        let cycle = null;
        if (toStr(cycleKey) === 'pending' && entry.pendingRequest) {
            const pr = normalizeAccountingPendingRequest({ ...entry.pendingRequest });
            cycle = {
                requestSnapshot: {
                    action: pr.action,
                    requestNo: toStr(pr.requestNo),
                    submittedAt: pr.submittedAt,
                    submittedById: pr.submittedById,
                    submittedByName: pr.submittedByName,
                    submitNote: pr.submitNote,
                    thread: pr.thread || [],
                    revision: pr.revision || null,
                    beforeEntry: snapshotAccountingEntryForAudit(entry)
                },
                response: null,
                active: true
            };
        } else if (toStr(cycleKey).startsWith('hist-')) {
            const idx = parseInt(toStr(cycleKey).replace('hist-', ''), 10);
            const hist = Array.isArray(entry.approvalHistory) ? entry.approvalHistory : [];
            const h = hist[idx];
            if (!h) return '';
            cycle = {
                requestSnapshot: h.requestSnapshot || null,
                response: h,
                active: false
            };
        }
        if (!cycle) return '';
        const voucher = toStr(entry.voucherNo) || toStr(entry.title) || '—';
        const cycleRequestNo =
            toStr(cycle.requestSnapshot?.requestNo) ||
            toStr(cycle.response?.requestNo) ||
            (cycleKey === 'pending' ? getAccountingEntryActiveRequestNo(entry) : '');
        const events = buildAccountingAuditCycleDetailEvents(cycle);
        const timeline = events.length
            ? `<div class="acct-audit-timeline">${events
                  .map((ev) => {
                      const when = escHtml(formatAccountingAuditDateTime(ev.at));
                      const who = escHtml(ev.by || '—');
                      const reqNoBadge = ev.requestNo ? formatAccountingApprovalRequestNoBadge(ev.requestNo) : '';
                      return `<div class="acct-audit-event acct-audit-event--${ev.type}">
                        <div class="acct-audit-event-meta"><strong>${who}</strong> · ${when}</div>
                        <div class="acct-audit-event-title">${reqNoBadge}${escHtml(ev.title)}</div>
                        ${ev.text ? `<div>${escHtml(ev.text)}</div>` : ''}
                    </div>`;
                  })
                  .join('')}</div>`
            : '';
        const diffBlock =
            cycle.requestSnapshot?.action === 'edit'
                ? buildAccountingAuditCycleEditDiffHtml(entry, cycle.requestSnapshot, reg)
                : '';
        const legacyNote =
            !cycle.requestSnapshot && cycle.response
                ? `<p style="margin:0 0 10px;padding:10px;background:#fff8e1;border-radius:8px;border:1px solid #ffe082;font-size:12px;color:#666">${t(
                      'تفاصيل الطلب الأصلي غير محفوظة في هذا السجل القديم — يُعرض رد المسؤول فقط.',
                      'Original request details were not archived in this older log entry — showing the manager response only.'
                  )}</p>`
                : '';
        const metaCls = forPrint ? 'property-report-meta' : '';
        const metaStyle = forPrint ? '' : 'style="margin:0 0 12px;font-size:12px;color:#555;line-height:1.6"';
        return `
            <p class="${metaCls}" ${metaStyle}>
                ${cycleRequestNo ? `<strong>${t('رقم الطلب', 'Request no.')}:</strong> ${formatAccountingApprovalRequestNoBadge(cycleRequestNo)} · ` : ''}
                <strong>${t('السند', 'Voucher')}:</strong> ${escHtml(voucher)} ·
                <strong>${t('العميل', 'Client')}:</strong> ${escHtml(entry.partyName || '—')} ·
                <strong>${t('المبلغ', 'Amount')}:</strong> ${escHtml(summaryAmtOm(entry.amount))}
            </p>
            ${legacyNote}
            <h4 style="margin:0 0 8px;font-size:13px">${t('تسلسل الطلب والأحداث', 'Request & events sequence')}</h4>
            ${timeline}
            ${diffBlock}`;
    }

    let _accountingAuditCycleState = { entryId: '', cycleKey: '' };

    function jsAttrSingleQuoted(value) {
        return toStr(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }

    function handleAccountingAuditEventClick(event, entryId, cycleKey) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        openAccountingAuditCycleDetail(entryId, cycleKey);
    }

    function openAccountingAuditCycleDetail(entryId, cycleKey) {
        const reg = loadAccountingRegistry();
        const entry = reg.entries.find((e) => e.id === entryId);
        if (!entry) {
            alert(t('السند غير موجود.', 'Voucher not found.'));
            return;
        }
        _accountingAuditCycleState = { entryId, cycleKey };
        const modal = document.getElementById('accountingAuditCycleModal');
        const body = document.getElementById('accountingAuditCycleBody');
        const title = document.getElementById('accountingAuditCycleTitle');
        if (!modal || !body) return;
        const state = { entryId, key: cycleKey };
        const html = buildAccountingAuditCycleDetailBodyHtml(entryId, cycleKey, false);
        if (!html) {
            alert(t('لا توجد تفاصيل لهذا الحدث.', 'No details for this event.'));
            return;
        }
        let cycleTitle = t('تفاصيل الطلب والأحداث', 'Request & events details');
        if (cycleKey === 'pending') {
            cycleTitle = t('تفاصيل الطلب الجاري', 'Current request details');
        } else if (cycleKey.startsWith('hist-')) {
            const idx = parseInt(cycleKey.replace('hist-', ''), 10);
            const h = (entry.approvalHistory || [])[idx];
            if (h) {
                const actLbl =
                    h.action === 'edit' ? t('تعديل', 'Edit') : h.action === 'delete' ? t('حذف', 'Delete') : t('إنشاء', 'Create');
                cycleTitle =
                    h.decision === 'approved'
                        ? t(`تفاصيل اعتماد ${actLbl}`, `Approval details — ${actLbl}`)
                        : t(`تفاصيل رفض ${actLbl}`, `Rejection details — ${actLbl}`);
            }
        }
        if (title) {
            const reqNo =
                cycleKey === 'pending'
                    ? getAccountingEntryActiveRequestNo(entry)
                    : toStr((entry.approvalHistory || [])[parseInt(cycleKey.replace('hist-', ''), 10)]?.requestNo);
            title.textContent = `${cycleTitle}${reqNo ? ` (${reqNo})` : ''} — ${entry.voucherNo || entry.title || '—'}`;
        }
        body.innerHTML = html;
        modal.classList.add('open');
        try {
            modal.style.zIndex = '10105';
        } catch (_eZ) {}
        try {
            localizeBilingualUi();
        } catch (_eL) {}
    }

    function closeAccountingAuditCycleModal() {
        _accountingAuditCycleState = { entryId: '', cycleKey: '' };
        document.getElementById('accountingAuditCycleModal')?.classList.remove('open');
    }

    function printAccountingAuditCycleDetail() {
        const { entryId, cycleKey } = _accountingAuditCycleState;
        if (!entryId || !cycleKey) return;
        const reg = loadAccountingRegistry();
        const entry = reg.entries.find((e) => e.id === entryId);
        if (!entry) return;
        const inner = buildAccountingAuditCycleDetailBodyHtml(entryId, cycleKey, true);
        if (!inner) return;
        const voucher = toStr(entry.voucherNo) || toStr(entry.title) || '—';
        const body = `
            <div class="section-header property-section-h">${t('تفاصيل الطلب والأحداث — سجل الاعتماد', 'Request & events — approval audit log')}</div>
            ${inner}`;
        const title = t(`سجل اعتماد — ${voucher}`, `Approval audit log — ${voucher}`);
        try {
            printWithSiteStandard(title, body);
        } catch (e) {
            console.error('printAccountingAuditCycleDetail', e);
            alert(
                t(
                    `تعذرت الطباعة: ${toStr(e && e.message) || 'خطأ غير معروف'}`,
                    `Print failed: ${toStr(e && e.message) || 'unknown error'}`
                )
            );
        }
    }

    function accountingAllocRefLabel(a) {
        if (!a) return '—';
        if (a.kind === 'cheque') return `${t('شيك', 'Cheque')} ${toStr(a.ref) || '—'}`;
        if (a.kind === 'invoice') return `${t('فاتورة', 'Invoice')} ${toStr(a.ref) || '—'}`;
        return toStr(a.ref) || '—';
    }

    function accountingAllocRowKey(a) {
        return `${toStr(a?.kind)}|${toStr(a?.id)}`;
    }

    function normalizeAccountingAllocList(list) {
        return (list || []).filter((a) => (parseFloat(a.amount) || 0) > 0);
    }

    function computeAccountingEntryRevisionDiff(beforeEntry, afterRevision, reg) {
        const before = beforeEntry || {};
        const after = afterRevision || {};
        const autoNotes = [];
        const fieldChanges = [];
        const addFieldChange = (field, labelAr, labelEn, beforeVal, afterVal) => {
            const b = toStr(beforeVal);
            const a = toStr(afterVal);
            if (b === a) return;
            fieldChanges.push({ field, label: t(labelAr, labelEn), before: b || '—', after: a || '—' });
            autoNotes.push(
                t(`تعديل ${labelAr}: من «${b || '—'}» إلى «${a || '—'}»`, `Changed ${labelEn}: from «${b || '—'}» to «${a || '—'}»`)
            );
        };
        const beforeAmt = parseFloat(before.amount) || 0;
        const afterAmt = parseFloat(after.amount) || 0;
        const amountChanged = Math.abs(beforeAmt - afterAmt) > 0.001;
        if (amountChanged) {
            autoNotes.unshift(
                t(
                    `تعديل المبلغ الإجمالي من ${summaryAmtOm(beforeAmt)} إلى ${summaryAmtOm(afterAmt)}`,
                    `Total amount changed from ${summaryAmtOm(beforeAmt)} to ${summaryAmtOm(afterAmt)}`
                )
            );
        }
        addFieldChange('dueDate', 'التاريخ', 'Date', before.dueDate, after.dueDate);
        addFieldChange('title', 'الوصف', 'Description', before.title, after.title);
        addFieldChange('paymentNote', 'ملاحظة الدفع', 'Payment note', before.paymentNote, after.paymentNote);
        addFieldChange('referenceNo', 'المرجع', 'Reference', before.referenceNo, after.referenceNo);
        addFieldChange('partyName', 'الجهة', 'Party', before.partyName, after.partyName);
        if (toStr(before.bankAccountId) !== toStr(after.bankAccountId)) {
            const bBank = before.bankAccountId ? bankAccountLabel(getBankAccountById(before.bankAccountId)) : '—';
            const aBank = after.bankAccountId ? bankAccountLabel(getBankAccountById(after.bankAccountId)) : '—';
            fieldChanges.push({ field: 'bankAccountId', label: t('تم الدفع من خلال', 'Paid through'), before: bBank, after: aBank });
            autoNotes.push(
                t(`تعديل حساب الدفع من «${bBank}» إلى «${aBank}»`, `Paid-through account changed from «${bBank}» to «${aBank}»`)
            );
        }

        const beforeMap = new Map();
        normalizeAccountingAllocList(before.paymentAllocations).forEach((a) => beforeMap.set(accountingAllocRowKey(a), a));
        const afterMap = new Map();
        normalizeAccountingAllocList(after.paymentAllocations).forEach((a) => afterMap.set(accountingAllocRowKey(a), a));
        const allocRows = [];
        const allKeys = new Set([...beforeMap.keys(), ...afterMap.keys()]);
        allKeys.forEach((key) => {
            const b = beforeMap.get(key);
            const a = afterMap.get(key);
            if (b && !a) {
                allocRows.push({ status: 'removed', before: b, after: null });
                autoNotes.push(
                    t(
                        `شطب ${accountingAllocRefLabel(b)} — كانت هذه الدفعة ${summaryAmtOm(b.amount)}`,
                        `Removed ${accountingAllocRefLabel(b)} — this payment was ${summaryAmtOm(b.amount)}`
                    )
                );
            } else if (!b && a) {
                allocRows.push({ status: 'added', before: null, after: a });
                autoNotes.push(
                    t(
                        `إضافة ${accountingAllocRefLabel(a)} — مبلغ هذه الدفعة ${summaryAmtOm(a.amount)}`,
                        `Added ${accountingAllocRefLabel(a)} — payment amount ${summaryAmtOm(a.amount)}`
                    )
                );
            } else if (b && a) {
                const bAmt = parseFloat(b.amount) || 0;
                const aAmt = parseFloat(a.amount) || 0;
                if (Math.abs(bAmt - aAmt) > 0.001) {
                    allocRows.push({ status: 'modified', before: b, after: a });
                    autoNotes.push(
                        t(
                            `تعديل مبلغ ${accountingAllocRefLabel(a)} من ${summaryAmtOm(bAmt)} إلى ${summaryAmtOm(aAmt)}`,
                            `Changed ${accountingAllocRefLabel(a)} amount from ${summaryAmtOm(bAmt)} to ${summaryAmtOm(aAmt)}`
                        )
                    );
                } else {
                    allocRows.push({ status: 'unchanged', before: b, after: a });
                }
            }
        });
        const statusOrder = { removed: 0, modified: 1, added: 2, unchanged: 3 };
        allocRows.sort((x, y) => (statusOrder[x.status] ?? 9) - (statusOrder[y.status] ?? 9));
        const hasChanges = amountChanged || fieldChanges.length > 0 || allocRows.some((r) => r.status !== 'unchanged');
        if (!hasChanges) {
            autoNotes.push(t('لا توجد فروقات واضحة في البيانات المقترحة.', 'No clear differences in the proposed data.'));
        }
        return {
            hasChanges,
            autoNotes,
            fieldChanges,
            amountChanged,
            oldAmount: beforeAmt,
            newAmount: afterAmt,
            allocRows
        };
    }

    function buildAccountingEntryRevisionDiffPanelHtml(entry, reg) {
        if (!entry?.pendingRequest || toStr(entry.pendingRequest.action) !== 'edit' || !entry.pendingRequest.revision) {
            return '';
        }
        const diff = computeAccountingEntryRevisionDiff(entry, entry.pendingRequest.revision, reg);
        const notesHtml = diff.autoNotes.length
            ? `<ul class="acct-revision-diff-notes">${diff.autoNotes.map((n) => `<li>${escHtml(n)}</li>`).join('')}</ul>`
            : '';
        return `<div class="acct-revision-diff-panel">
            <h4>🔍 ${t('ملخص التعديلات المقترحة (تلقائي من النظام)', 'Proposed changes summary (system-generated)')}</h4>
            <div class="acct-revision-diff-legend">
                <span><span class="acct-diff-badge acct-diff-badge--removed">✕</span> ${t('مشطوب / محذوف', 'Removed')}</span>
                <span><span class="acct-diff-badge acct-diff-badge--modified">✎</span> ${t('معدّل', 'Modified')}</span>
                <span><span class="acct-diff-badge acct-diff-badge--added">+</span> ${t('مضاف', 'Added')}</span>
            </div>
            ${notesHtml}
        </div>`;
    }

    function buildAccountingEditDiffAllocationTableHtml(entry, reg) {
        const revision = entry.pendingRequest?.revision;
        if (!revision || toStr(entry.pendingRequest.action) !== 'edit') return '';
        const diff = computeAccountingEntryRevisionDiff(entry, revision, reg);
        const diffPanel = buildAccountingEntryRevisionDiffPanelHtml(entry, reg);
        const proposedAllocDetails = normalizeAccountingAllocList(revision.paymentAllocations).map((a) =>
            resolvePaymentAllocationSnapshot(a, reg)
        );
        const proposedAllocTotal = proposedAllocDetails.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
        const rowHtml = diff.allocRows
            .map((row, i) => {
                const src = row.after || row.before;
                const snap = resolvePaymentAllocationSnapshot(src, reg);
                let ref = escHtml(snap.ref || '—');
                if (snap.kind === 'invoice') ref = `${t('فاتورة', 'Invoice')} ${ref}`;
                else if (snap.kind === 'cheque') ref = `${t('شيك', 'Cheque')} ${ref}`;
                const badge =
                    row.status === 'removed'
                        ? `<span class="acct-diff-badge acct-diff-badge--removed">✕ ${t('مشطوب', 'Removed')}</span>`
                        : row.status === 'added'
                          ? `<span class="acct-diff-badge acct-diff-badge--added">+ ${t('مضاف', 'Added')}</span>`
                          : row.status === 'modified'
                            ? `<span class="acct-diff-badge acct-diff-badge--modified">✎ ${t('معدّل', 'Modified')}</span>`
                            : '';
                let payCell = '';
                if (row.status === 'modified') {
                    payCell = `<span class="acct-diff-old">${escHtml(summaryAmtOm(row.before.amount))}</span> → <span class="acct-diff-new">${escHtml(summaryAmtOm(row.after.amount))}</span>`;
                } else if (row.status === 'removed') {
                    payCell = `<span class="acct-diff-old">${escHtml(summaryAmtOm(row.before.amount))}</span>`;
                } else {
                    payCell = `<span class="${row.status === 'added' ? 'acct-diff-new' : ''}">${escHtml(summaryAmtOm(snap.amount))}</span>`;
                }
                return `<tr class="acct-diff-row acct-diff-row--${row.status}">
                    <td>${i + 1}</td>
                    <td>${ref}${badge}</td>
                    <td>${snap.building && snap.unit ? `${escHtml(snap.building)} — ${escHtml(snap.unit)}` : '—'}</td>
                    <td>${escHtml(summaryAmtOm(snap.total))}</td>
                    <td>${escHtml(summaryAmtOm(snap.paidBefore))}</td>
                    <td class="acct-ledger-amt-paid">${payCell}</td>
                    <td class="acct-ledger-amt-remaining">${escHtml(summaryAmtOm(snap.remainingAfter))}</td>
                    <td>—</td>
                </tr>`;
            })
            .join('');
        return `
            ${diffPanel}
            <div style="display:flex;justify-content:space-between;align-items:center;margin:10px 0 6px;flex-wrap:wrap;gap:8px">
                <h4 style="margin:0">${t('تفصيل التوزيع — قبل وبعد التعديل', 'Allocation breakdown — before & after')}</h4>
            </div>
            <table class="data-table" style="width:100%;font-size:12px;margin-top:4px">
                <thead><tr>
                    <th>#</th><th>${t('المرجع', 'Reference')}</th><th>${t('العقار', 'Property')}</th>
                    <th>${t('الإجمالي', 'Total')}</th><th>${t('مدفوع سابقاً', 'Prev. paid')}</th>
                    <th>${t('هذه الدفعة', 'This pay.')}</th><th>${t('المتبقي', 'Remaining')}</th><th>${t('إيصال', 'Receipt')}</th>
                </tr></thead>
                <tbody>${rowHtml || `<tr><td colspan="8" style="text-align:center;padding:14px;color:#666">${t('لا يوجد توزيع', 'No allocation')}</td></tr>`}</tbody>
                <tfoot><tr>
                    <td colspan="5" style="font-weight:700">${t('إجمالي الموزّع (مقترح)', 'Total allocated (proposed)')}</td>
                    <td class="acct-ledger-amt-paid" style="font-weight:700">${escHtml(summaryAmtOm(proposedAllocTotal))}</td>
                    <td colspan="2"></td>
                </tr></tfoot>
            </table>`;
    }

    function accountingInvoiceStatusLabel(status) {
        const map = {
            draft: t('مسودة', 'Draft'),
            approved: t('معتمدة', 'Approved'),
            printed: t('مطبوعة', 'Printed'),
            paid: t('مدفوعة', 'Paid')
        };
        return map[toStr(status)] || toStr(status) || '—';
    }

    function accountingInvoiceStatusChip(status) {
        const st = toStr(status) || 'draft';
        return `<span class="acct-status-chip acct-inv-status--${st}">${escHtml(accountingInvoiceStatusLabel(st))}</span>`;
    }

    let _accountingPendingThreadFocusEntryId = '';

    function generateAccountingThreadMessageId() {
        return `acctm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    }

    function normalizeAccountingPendingRequest(pendingReq) {
        if (!pendingReq || typeof pendingReq !== 'object') return pendingReq;
        if (!Array.isArray(pendingReq.thread)) {
            const seed = [];
            if (toStr(pendingReq.submitNote)) {
                seed.push({
                    id: `msg_${toStr(pendingReq.submittedAt) || 'legacy'}_0`,
                    byUserId: toStr(pendingReq.submittedById),
                    byUserName: toStr(pendingReq.submittedByName) || toStr(pendingReq.submittedById),
                    role: 'requester',
                    text: toStr(pendingReq.submitNote),
                    at: toStr(pendingReq.submittedAt) || new Date().toISOString()
                });
            }
            pendingReq.thread = seed;
        }
        if (!pendingReq.clarificationAwaitingFrom) pendingReq.clarificationAwaitingFrom = null;
        return pendingReq;
    }

    function getAccountingPendingRequestStatusLabels(pendingReq) {
        if (!pendingReq) return { ar: '—', en: '—' };
        if (pendingReq.clarificationAwaitingFrom === 'requester') {
            return { ar: 'بانتظار رد مقدم الطلب', en: 'Awaiting requester reply' };
        }
        if (pendingReq.clarificationAwaitingFrom === 'admin') {
            return { ar: 'بانتظار رد المسؤول', en: 'Awaiting admin reply' };
        }
        return { ar: 'طلب قيد المراجعة', en: 'Request under review' };
    }

    function canComposeOnAccountingPendingThread(entry, user) {
        if (!entry || !user || !entry.pendingRequest) return false;
        const uid = toStr(user.id);
        const pr = normalizeAccountingPendingRequest({ ...entry.pendingRequest });
        if (canApproveAccountingEntry()) return true;
        const submitterId = toStr(pr.submittedById) || toStr(entry.createdById);
        if (uid && submitterId === uid && pr.clarificationAwaitingFrom === 'requester') return true;
        return false;
    }

    function getAccountingPendingThreadComposeHint(entry, user) {
        if (!entry || !user) return '';
        if (canApproveAccountingEntry()) {
            return t(
                'اطلب توضيحاً إضافياً من مقدم الطلب. ستصل الرسالة إليه داخل نفس السجل.',
                'Ask the requester for more clarification. The message will appear in this audit log.'
            );
        }
        return t('أجب على استفسار المسؤول بأكبر قدر من التفاصيل.', 'Reply to the administrator’s question with as much detail as possible.');
    }

    function collectAccountingEntryRelatedProperties(entry) {
        const seen = new Set();
        const out = [];
        const push = (building, unit) => {
            const b = toStr(building);
            const u = toStr(unit);
            if (!b || !u) return;
            const uk = accountingUnitKey(b, u);
            if (seen.has(uk)) return;
            seen.add(uk);
            out.push({ building: b, unit: u, unitKey: uk });
        };
        if (!entry) return out;
        push(entry.building, entry.unit);
        (entry.paymentAllocations || []).forEach((a) => push(a.building || entry.building, a.unit || entry.unit));
        const rev = entry.pendingRequest?.revision;
        if (rev) {
            push(rev.building, rev.unit);
            (rev.paymentAllocations || []).forEach((a) => push(a.building || rev.building, a.unit || rev.unit));
        }
        return out;
    }

    function getAccountingEntryHighlightKeys(entry) {
        const chequeIds = new Set();
        const invoiceIds = new Set();
        const addAllocs = (list) => {
            (list || []).forEach((a) => {
                if (a.kind === 'cheque' && a.id) chequeIds.add(a.id);
                if (a.kind === 'invoice' && a.id) invoiceIds.add(a.id);
            });
        };
        addAllocs(entry?.paymentAllocations);
        addAllocs(entry?.pendingRequest?.revision?.paymentAllocations);
        return { entryId: entry?.id || '', chequeIds, invoiceIds };
    }

    function buildAccountingAuditTimelineEvents(entry) {
        const events = [];
        if (entry.createdByAt || entry.createdByName) {
            events.push({
                type: 'created',
                at: entry.createdByAt || entry.updatedAt,
                by: entry.createdByName,
                title: t('إدخال المعاملة', 'Transaction entered'),
                text: ''
            });
        }
        const hist = Array.isArray(entry.approvalHistory) ? [...entry.approvalHistory] : [];
        hist.sort((a, b) => toStr(a.at).localeCompare(toStr(b.at)));
        hist.forEach((h, i) => {
            const actLbl =
                h.action === 'edit' ? t('تعديل', 'Edit') : h.action === 'delete' ? t('حذف', 'Delete') : t('إنشاء', 'Create');
            events.push({
                type: h.decision === 'approved' ? 'response-approve' : 'response-reject',
                at: h.at,
                by: h.byName,
                title:
                    h.decision === 'approved'
                        ? t(`رد الاعتماد — ${actLbl}`, `Approval response — ${actLbl}`)
                        : t(`رد الرفض — ${actLbl}`, `Rejection response — ${actLbl}`),
                text: h.note || '—',
                requestNo: toStr(h.requestNo) || toStr(h.requestSnapshot?.requestNo),
                cycleKey: `hist-${i}`,
                clickable: true
            });
        });
        const pr = entry.pendingRequest ? normalizeAccountingPendingRequest({ ...entry.pendingRequest }) : null;
        if (pr) {
            const actLbl = buildAccountingAuditRequestActionLabel(pr.action);
            events.push({
                type: 'request',
                at: pr.submittedAt,
                by: pr.submittedByName,
                title: actLbl,
                text: pr.submitNote || '—',
                requestNo: toStr(pr.requestNo),
                cycleKey: 'pending',
                clickable: true
            });
            (pr.thread || []).forEach((m) => {
                if (
                    toStr(m.text) === toStr(pr.submitNote) &&
                    toStr(m.at).slice(0, 16) === toStr(pr.submittedAt).slice(0, 16)
                ) {
                    return;
                }
                events.push({
                    type: m.role === 'admin' ? 'clarification-admin' : 'clarification-requester',
                    at: m.at,
                    by: toStr(m.byUserName) || toStr(m.byUserId),
                    title:
                        m.role === 'admin'
                            ? t('طلب توضيح من المسؤول', 'Clarification request from manager')
                            : t('رد مقدم الطلب', 'Requester reply'),
                    text: toStr(m.text),
                    requestNo: toStr(pr.requestNo),
                    cycleKey: 'pending',
                    clickable: true
                });
            });
        } else if (entry.approvedAt && entry.approvalNote && !hist.length) {
            events.push({
                type: 'response-approve',
                at: entry.approvedAt,
                by: entry.approvedByName,
                title: t('رد الاعتماد', 'Approval response'),
                text: entry.approvalNote
            });
        } else if (entry.rejectedAt && entry.rejectionNote && !hist.length) {
            events.push({
                type: 'response-reject',
                at: entry.rejectedAt,
                by: entry.rejectedByName,
                title: t('رد الرفض', 'Rejection response'),
                text: entry.rejectionNote
            });
        }
        events.sort((a, b) => toStr(a.at).localeCompare(toStr(b.at)));
        return events;
    }

    function buildAccountingAuditTimelineHtml(entry) {
        const events = buildAccountingAuditTimelineEvents(entry);
        if (!events.length) {
            return `<p style="margin:8px 0 0;font-size:12px;color:#666">${t('لا يوجد سجل بعد.', 'No audit log yet.')}</p>`;
        }
        const entryId = entry.id;
        const safeEntryId = jsAttrSingleQuoted(entryId);
        return `<div class="acct-audit-timeline">${events
            .map((ev) => {
                const when = escHtml(formatAccountingAuditDateTime(ev.at));
                const who = escHtml(ev.by || '—');
                const clickCls = ev.clickable ? ' acct-audit-event--clickable' : '';
                const safeCycleKey = jsAttrSingleQuoted(ev.cycleKey || '');
                const clickAttr =
                    ev.clickable && ev.cycleKey
                        ? ` role="button" tabindex="0" onclick="handleAccountingAuditEventClick(event, '${safeEntryId}', '${safeCycleKey}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();handleAccountingAuditEventClick(event, '${safeEntryId}', '${safeCycleKey}');}"`
                        : '';
                const hint = ev.clickable
                    ? `<div class="acct-audit-event-hint">📋 ${t('انقر لعرض التفاصيل الكاملة والطباعة', 'Click for full details & print')}</div>`
                    : '';
                const reqNoBadge = ev.requestNo ? formatAccountingApprovalRequestNoBadge(ev.requestNo) : '';
                return `<div class="acct-audit-event acct-audit-event--${ev.type}${clickCls}"${clickAttr}>
                    <div class="acct-audit-event-meta"><strong>${who}</strong> · ${when}</div>
                    <div class="acct-audit-event-title">${reqNoBadge}${escHtml(ev.title)}</div>
                    ${ev.text ? `<div>${escHtml(ev.text)}</div>` : ''}
                    ${hint}
                </div>`;
            })
            .join('')}</div>`;
    }

    function accountingPendingThreadScope() {
        return document.getElementById('accountingApprovalModal')?.classList.contains('open') ? 'approval' : 'detail';
    }

    function accountingPendingThreadComposeId(entryId, scope) {
        const s = scope || accountingPendingThreadScope();
        return s === 'approval' ? `acctPendingThreadCompose-approval-${entryId}` : `acctPendingThreadCompose-${entryId}`;
    }

    function accountingPendingThreadInputId(entryId, scope) {
        const s = scope || accountingPendingThreadScope();
        return s === 'approval' ? `acctPendingThreadInput-approval-${entryId}` : `acctPendingThreadInput-${entryId}`;
    }

    function getAccountingPendingThreadInput(entryId, scope) {
        return document.getElementById(accountingPendingThreadInputId(entryId, scope));
    }

    function wireAccountingApprovalTextarea(el) {
        wireAccountingApprovalComposeInput(el);
    }

    function wireAccountingApprovalComposeInput(el) {
        if (!el || el.dataset.acctComposeWired === '1') return;
        const tag = toStr(el.tagName).toUpperCase();
        if (tag !== 'TEXTAREA' && tag !== 'INPUT') return;
        const inputType = toStr(el.type).toLowerCase();
        if (tag === 'INPUT' && inputType && !['text', 'search', ''].includes(inputType)) return;
        el.dataset.acctComposeWired = '1';
        el.disabled = false;
        el.readOnly = false;
        el.style.pointerEvents = 'auto';
        ['click', 'mousedown', 'pointerdown', 'mouseup', 'keydown', 'keyup', 'input'].forEach((evt) => {
            el.addEventListener(evt, (e) => e.stopPropagation());
        });
        el.addEventListener('focus', () => {
            el.disabled = false;
            el.readOnly = false;
        });
    }

    function wireAccountingApprovalComposeFields(root) {
        const host = root || document.getElementById('accountingApprovalModal');
        if (!host) return;
        host.querySelectorAll('textarea, input[type="text"], input:not([type])').forEach((el) => wireAccountingApprovalComposeInput(el));
    }

    function ensureAccountingApprovalInputsWritable(root) {
        const host = root || document.getElementById('accountingApprovalModal');
        if (!host) return;
        host.querySelectorAll('textarea, input[type="text"], input:not([type])').forEach((el) => {
            el.disabled = false;
            el.readOnly = false;
            el.style.pointerEvents = 'auto';
            wireAccountingApprovalComposeInput(el);
        });
    }

    function ensureAccountingReceiptModalComposeWritable(root) {
        const host = root || document;
        ensureAccountingApprovalInputsWritable(host);
        host.querySelectorAll('.acct-cheque-private-note-input').forEach((el) => {
            el.disabled = false;
            el.readOnly = false;
            el.style.pointerEvents = 'auto';
            wireAccountingApprovalComposeInput(el);
        });
    }

    function buildAccountingPendingThreadComposeHtml(entry, entryId, scope = 'detail') {
        const u = getLoggedInUser();
        const canCompose = canComposeOnAccountingPendingThread(entry, u);
        if (!entry.pendingRequest) return '';
        const pr = normalizeAccountingPendingRequest({ ...entry.pendingRequest });
        const st = getAccountingPendingRequestStatusLabels(pr);
        const safeId = escHtml(entryId);
        const composeId = escHtml(accountingPendingThreadComposeId(entryId, scope));
        const inputId = escHtml(accountingPendingThreadInputId(entryId, scope));
        const hintId = scope === 'approval' ? `acctPendingThreadHint-approval-${safeId}` : `acctPendingThreadHint-${safeId}`;
        const clarifyBtn = canApproveAccountingEntry()
            ? `<button type="button" class="btn-outline mini-btn" onclick="focusAccountingPendingClarification('${safeId}')">💬 ${t('طلب مزيد من الإيضاحات', 'Request clarification')}</button>`
            : '';
        return `<div class="acct-pending-thread-compose" id="${composeId}" style="${canCompose ? '' : 'display:none'}" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()" onpointerdown="event.stopPropagation()">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">
                <strong style="font-size:12px">${t('الردود والتوضيحات', 'Replies & clarifications')}</strong>
                <span style="font-size:11px;color:#e65100">${escHtml(t(st.ar, st.en))}</span>
            </div>
            <small id="${hintId}" style="display:${canCompose ? 'block' : 'none'};margin-bottom:8px;font-size:11px;color:#666;line-height:1.45">${escHtml(getAccountingPendingThreadComposeHint(entry, u))}</small>
            <textarea id="${inputId}" rows="3" autocomplete="off" placeholder="${t('اكتب الاستفسار أو الرد هنا...', 'Type your question or reply here...')}"></textarea>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
                ${clarifyBtn}
                <button type="button" class="btn-primary mini-btn" onclick="submitAccountingPendingThreadMessage('${safeId}')">${t('إرسال', 'Send')}</button>
            </div>
        </div>`;
    }

    function refreshAccountingPendingThreadUi(entryId) {
        const reg = loadAccountingRegistry();
        const entry = reg.entries.find((e) => e.id === entryId);
        if (!entry) return;
        const detailHost = document.getElementById('accountingEntryAuditPanelHost');
        const approvalHost = document.getElementById('accountingApprovalAuditHost');
        if (detailHost) detailHost.innerHTML = buildAccountingEntryAuditPanelHtml(entry, 'detail');
        if (approvalHost) {
            approvalHost.innerHTML = buildAccountingEntryAuditPanelHtml(entry, 'approval');
            ensureAccountingApprovalInputsWritable(document.getElementById('accountingApprovalModal'));
        }
        try {
            updateNotificationsNavBadge();
            refreshNotificationsIfVisible();
        } catch (_eN) {}
    }

    function appendAccountingPendingThreadMessage(entryId, text, options = {}) {
        const body = toStr(text).trim();
        if (!body) return null;
        const u = getLoggedInUser();
        if (!u) {
            openAuthLoginModal();
            return null;
        }
        const reg = loadAccountingRegistry();
        const idx = reg.entries.findIndex((e) => e.id === entryId);
        if (idx < 0) return null;
        const entry = reg.entries[idx];
        if (!canComposeOnAccountingPendingThread(entry, u)) {
            alert(t('لا يمكنك إرسال رسالة على هذا الطلب.', 'You cannot send a message on this request.'));
            return null;
        }
        const isAdmin = canApproveAccountingEntry();
        const role = options.role || (isAdmin ? 'admin' : 'requester');
        const msg = {
            id: generateAccountingThreadMessageId(),
            byUserId: u.id,
            byUserName: toStr(u.displayName) || toStr(u.email) || u.id,
            role,
            text: body,
            at: new Date().toISOString()
        };
        const pr = normalizeAccountingPendingRequest({ ...(entry.pendingRequest || {}) });
        const thread = Array.isArray(pr.thread) ? [...pr.thread] : [];
        thread.push(msg);
        let clarificationAwaitingFrom = pr.clarificationAwaitingFrom || null;
        if (role === 'admin') clarificationAwaitingFrom = 'requester';
        else if (role === 'requester') clarificationAwaitingFrom = 'admin';
        reg.entries[idx].pendingRequest = {
            ...pr,
            thread,
            clarificationAwaitingFrom,
            lastMessageAt: msg.at
        };
        reg.entries[idx].updatedAt = new Date().toISOString();
        if (!saveAccountingRegistry(reg)) return null;
        refreshAccountingPendingThreadUi(entryId);
        return reg.entries[idx];
    }

    function submitAccountingPendingThreadMessage(entryId) {
        const input = getAccountingPendingThreadInput(entryId);
        const text = toStr(input?.value);
        if (!text.trim()) {
            alert(t('اكتب الرسالة أولاً.', 'Enter a message first.'));
            return;
        }
        const isAdmin = canApproveAccountingEntry();
        const updated = appendAccountingPendingThreadMessage(entryId, text, { role: isAdmin ? 'admin' : 'requester' });
        if (!updated) return;
        if (input) input.value = '';
        alert(
            isAdmin
                ? t('تم إرسال طلب التوضيح إلى مقدم الطلب.', 'Clarification request sent to the requester.')
                : t('تم إرسال ردك إلى المسؤول.', 'Your reply was sent to the manager.')
        );
    }

    function focusAccountingPendingClarification(entryId) {
        const scope = accountingPendingThreadScope();
        const compose = document.getElementById(accountingPendingThreadComposeId(entryId, scope));
        const input = getAccountingPendingThreadInput(entryId, scope);
        if (compose) compose.style.display = 'block';
        if (input) {
            setTimeout(() => {
                try {
                    input.focus();
                } catch (_eF) {}
            }, 60);
        }
    }

    function buildAccountingPropertyReviewSectionHtml(building, unit, reg, highlight, forPrint) {
        const b = toStr(building);
        const u = toStr(unit);
        const uk = accountingUnitKey(b, u);
        const invoices = (reg.invoices || []).filter((inv) => inv.unitKey === uk);
        const cheques = (reg.cheques || []).filter((c) => c.unitKey === uk);
        const vouchers = (reg.entries || []).filter(
            (e) =>
                e.manualEntry &&
                toStr(e.type) === 'income' &&
                (e.unitKey === uk ||
                    (e.paymentAllocations || []).some((a) => accountingUnitKey(a.building, a.unit) === uk))
        );
        const rowCls = (kind, id, entryId) => {
            if (forPrint) return '';
            if (entryId && highlight.entryId === entryId) return 'acct-property-row--current';
            if (kind === 'cheque' && highlight.chequeIds.has(id)) return 'acct-property-row--highlight';
            if (kind === 'invoice' && highlight.invoiceIds.has(id)) return 'acct-property-row--highlight';
            return '';
        };
        const statusCell = (label) => (forPrint ? escHtml(label) : label);
        const invRows = invoices
            .map((inv) => {
                const paid = parseFloat(inv.paidAmount) || 0;
                const total = parseFloat(inv.total) || 0;
                const rem = Math.max(0, total - paid);
                const comments = [inv.note, inv.paymentNote].filter(Boolean).join(' · ') || '—';
                const mark =
                    forPrint && highlight.invoiceIds.has(inv.id)
                        ? ` *`
                        : '';
                return `<tr class="${rowCls('invoice', inv.id)}">
                    <td>${t('فاتورة', 'Invoice')}</td>
                    <td>${escHtml(inv.invoiceNo || inv.id)}${mark}</td>
                    <td>${escHtml((inv.issueDate || inv.dueDate || '—').slice(0, 10))}</td>
                    <td>${escHtml(summaryAmtOm(total))}</td>
                    <td class="acct-ledger-amt-paid">${escHtml(summaryAmtOm(paid))}</td>
                    <td class="acct-ledger-amt-remaining">${rem > 0 ? escHtml(summaryAmtOm(rem)) : '—'}</td>
                    <td>${statusCell(forPrint ? accountingInvoiceStatusLabel(inv.status) : accountingInvoiceStatusChip(inv.status))}</td>
                    <td style="font-size:11px;max-width:220px">${escHtml(comments)}</td>
                </tr>`;
            })
            .join('');
        const chqRows = cheques
            .map((ch) => {
                const paid = parseFloat(ch.paidAmount) || 0;
                const total = parseFloat(ch.amount) || 0;
                const rem = Math.max(0, total - paid);
                const overdue = isAccountingChequeOverdue(ch);
                const stLbl = accountingChequeStatusLabel(ch.status) + (overdue ? ` (${t('متأخر', 'Overdue')})` : '');
                const comments = [ch.paymentNote, ch.accountantNote].filter(Boolean).join(' · ') || '—';
                const mark =
                    forPrint && highlight.chequeIds.has(ch.id)
                        ? ` *`
                        : '';
                return `<tr class="${rowCls('cheque', ch.id)}">
                    <td>${t('شيك', 'Cheque')}</td>
                    <td>${escHtml(ch.chequeNo || '—')}${mark}</td>
                    <td>${escHtml(ch.dueDate || '—')}</td>
                    <td>${escHtml(summaryAmtOm(total))}</td>
                    <td class="acct-ledger-amt-paid">${escHtml(summaryAmtOm(paid))}</td>
                    <td class="acct-ledger-amt-remaining">${rem > 0 ? escHtml(summaryAmtOm(rem)) : '—'}</td>
                    <td>${forPrint ? escHtml(stLbl) : accountingChequeStatusChip(ch.status, overdue)}</td>
                    <td style="font-size:11px;max-width:220px">${escHtml(comments)}</td>
                </tr>`;
            })
            .join('');
        const vchRows = vouchers
            .map((ent) => {
                const comments = [ent.paymentNote, ent.title, ent.approvalNote].filter(Boolean).join(' · ') || '—';
                const st = accountingEntryHasPendingRequest(ent)
                    ? accountingPendingActionLabel(ent)
                    : accountingEntryDisplayStatusLabel(ent);
                const mark =
                    forPrint && highlight.entryId === ent.id
                        ? ` *`
                        : '';
                const refCell = forPrint
                    ? `${escHtml(ent.voucherNo || ent.title || '—')}${mark}`
                    : `<span class="acct-ledger-amt-link" onclick="openAccountingReceiptDetailModal('${escHtml(ent.id)}')">${escHtml(ent.voucherNo || ent.title || '—')}</span>`;
                const stCell = forPrint
                    ? escHtml(st)
                    : `<span class="acct-status-chip acct-status-${accountingEntryHasPendingRequest(ent) ? 'pending' : 'paid_cash'}">${escHtml(st)}</span>`;
                return `<tr class="${rowCls('entry', '', ent.id)}">
                    <td>${t('سند قبض', 'Receipt')}</td>
                    <td>${refCell}</td>
                    <td>${escHtml((ent.dueDate || '—').slice(0, 10))}</td>
                    <td>${escHtml(summaryAmtOm(ent.amount))}</td>
                    <td colspan="2">—</td>
                    <td>${stCell}</td>
                    <td style="font-size:11px;max-width:220px">${escHtml(comments)}</td>
                </tr>`;
            })
            .join('');
        const rows = invRows + chqRows + vchRows;
        const legend = forPrint
            ? `<p class="property-report-meta" style="margin:0 0 8px">* ${t('مرتبط بالسند قيد المراجعة', 'Linked to voucher under review')}</p>`
            : `<div class="acct-revision-diff-legend" style="margin-bottom:8px">
                <span><span class="acct-diff-badge acct-diff-badge--modified">●</span> ${t('مرتبط بالسند الحالي', 'Linked to current voucher')}</span>
                <span><span class="acct-diff-badge acct-diff-badge--added">●</span> ${t('السند الحالي', 'Current voucher')}</span>
            </div>`;
        const tableCls = forPrint ? 'info-table property-report-table print-zebra' : 'data-table';
        const tableStyle = forPrint ? 'width:100%;font-size:11px;margin-bottom:14px' : 'width:100%;font-size:11px';
        return `<div class="acct-property-review-section">
            <h4 style="margin:0 0 8px">${escHtml(b)} — ${t('وحدة', 'Unit')} ${escHtml(u)}</h4>
            ${legend}
            <table class="${tableCls}" style="${tableStyle}">
                <thead><tr>
                    <th>${t('النوع', 'Type')}</th><th>${t('المرجع', 'Reference')}</th><th>${t('التاريخ', 'Date')}</th>
                    <th>${t('الإجمالي', 'Total')}</th><th>${t('مدفوع', 'Paid')}</th><th>${t('متبقي', 'Remaining')}</th>
                    <th>${t('الحالة', 'Status')}</th><th>${t('ملاحظات / تعليقات', 'Notes / comments')}</th>
                </tr></thead>
                <tbody>${rows || `<tr><td colspan="8" style="text-align:center;padding:14px;color:#666">${t('لا توجد معاملات', 'No transactions')}</td></tr>`}</tbody>
            </table>
        </div>`;
    }

    function buildAccountingPropertyReviewBodyHtml(entryId, forPrint) {
        const reg = loadAccountingRegistry();
        const entry = reg.entries.find((e) => e.id === entryId);
        if (!entry) return '';
        const props = collectAccountingEntryRelatedProperties(entry);
        if (!props.length) {
            return `<p style="color:#666;margin:0">${t('لا يوجد عقار مرتبط بهذا السند.', 'No property linked to this voucher.')}</p>`;
        }
        const highlight = getAccountingEntryHighlightKeys(entry);
        return props.map((p) => buildAccountingPropertyReviewSectionHtml(p.building, p.unit, reg, highlight, forPrint)).join('');
    }

    function buildAccountingPropertyReviewPrintHtml(entryId) {
        const reg = loadAccountingRegistry();
        const entry = reg.entries.find((e) => e.id === entryId);
        if (!entry) return '';
        const voucher = toStr(entry.voucherNo) || toStr(entry.title) || '—';
        const meta = [
            `${t('السند', 'Voucher')}: ${voucher}`,
            `${t('العميل', 'Client')}: ${toStr(entry.partyName) || '—'}`,
            `${t('المبلغ', 'Amount')}: ${summaryAmtOm(entry.amount)}`,
            `${t('التاريخ', 'Date')}: ${(entry.dueDate || '—').slice(0, 10)}`,
            `${t('الحالة', 'Status')}: ${accountingEntryDisplayStatusLabel(entry)}`
        ].join(' · ');
        return `
            <div class="section-header property-section-h">${t('مراجعة معاملات العقار', 'Property transactions review')}</div>
            <p class="property-report-meta">${escHtml(meta)}</p>
            ${buildAccountingPropertyReviewBodyHtml(entryId, true)}`;
    }

    let _accountingPropertyReviewEntryId = '';

    function printAccountingPropertyReview(entryIdOpt) {
        const entryId = toStr(entryIdOpt) || _accountingPropertyReviewEntryId;
        if (!entryId) return;
        const reg = loadAccountingRegistry();
        const entry = reg.entries.find((e) => e.id === entryId);
        if (!entry) {
            alert(t('السند غير موجود.', 'Voucher not found.'));
            return;
        }
        const body = buildAccountingPropertyReviewPrintHtml(entryId);
        if (!body) return;
        const voucher = toStr(entry.voucherNo) || toStr(entry.title) || '—';
        const title = t(`مراجعة معاملات العقار — ${voucher}`, `Property transactions review — ${voucher}`);
        try {
            printWithSiteStandard(title, body, { orientation: 'landscape' });
        } catch (e) {
            console.error('printAccountingPropertyReview', e);
            alert(
                t(
                    `تعذرت الطباعة: ${toStr(e && e.message) || 'خطأ غير معروف'}`,
                    `Print failed: ${toStr(e && e.message) || 'unknown error'}`
                )
            );
        }
    }

    function openAccountingPropertyReviewModal(entryId) {
        const reg = loadAccountingRegistry();
        const entry = reg.entries.find((e) => e.id === entryId);
        if (!entry) {
            alert(t('السند غير موجود.', 'Voucher not found.'));
            return;
        }
        const modal = document.getElementById('accountingPropertyReviewModal');
        const body = document.getElementById('accountingPropertyReviewBody');
        const title = document.getElementById('accountingPropertyReviewTitle');
        if (!modal || !body) return;
        _accountingPropertyReviewEntryId = entryId;
        if (title) {
            title.textContent = t(
                `مراجعة معاملات العقار — ${entry.voucherNo || entry.title || '—'}`,
                `Property transactions review — ${entry.voucherNo || entry.title || '—'}`
            );
        }
        body.innerHTML = buildAccountingPropertyReviewBodyHtml(entryId);
        modal.classList.add('open');
        try {
            localizeBilingualUi();
        } catch (_eL) {}
    }

    function closeAccountingPropertyReviewModal() {
        _accountingPropertyReviewEntryId = '';
        document.getElementById('accountingPropertyReviewModal')?.classList.remove('open');
    }

    function buildAccountingEntryAuditPanelHtml(entry, scope = 'detail') {
        if (!entry || !entry.manualEntry) return '';
        if (entry.pendingRequest) entry.pendingRequest = normalizeAccountingPendingRequest(entry.pendingRequest);
        const props = collectAccountingEntryRelatedProperties(entry);
        const showPropertyBtn = props.length > 0 && accountingEntryHasPendingRequest(entry);
        const propertyBtn = showPropertyBtn
            ? `<button type="button" class="btn-outline mini-btn" onclick="openAccountingPropertyReviewModal('${escHtml(entry.id)}')">🏢 ${t('عرض جميع فواتير ومعاملات العقار', 'Show all property invoices & transactions')}</button>`
            : '';
        const timeline = buildAccountingAuditTimelineHtml(entry);
        const threadCompose = buildAccountingPendingThreadComposeHtml(entry, entry.id, scope);
        return `<div style="margin-top:14px;padding:12px;background:#f8f9fa;border-radius:8px;border:1px solid #e8e8e8">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">
                <h4 style="margin:0">${t('سجل الاعتماد والتدقيق', 'Approval & audit log')}</h4>
                ${propertyBtn}
            </div>
            <div class="acct-revision-diff-legend" style="margin-bottom:8px">
                <span><span class="acct-diff-badge" style="background:#e3f2fd;color:#1565c0">●</span> ${t('إدخال', 'Entry')}</span>
                <span><span class="acct-diff-badge acct-diff-badge--modified">●</span> ${t('طلب', 'Request')}</span>
                <span><span class="acct-diff-badge acct-diff-badge--added">●</span> ${t('اعتماد', 'Approved')}</span>
                <span><span class="acct-diff-badge acct-diff-badge--removed">●</span> ${t('رفض', 'Rejected')}</span>
            </div>
            ${timeline}
            ${threadCompose}
        </div>`;
    }

    function canApproveAccountingEntry() {
        if (!usersRegistryHasRows()) return true;
        const u = getLoggedInUser();
        if (!u) return false;
        if (userIsSystemAdmin(u)) return true;
        return canApproveModule(u, 'accounting_pending') || effectivePermission('approve_accounting');
    }

    function canApproveAccountingEntryNow(entry) {
        if (!canApproveAccountingEntry()) return false;
        if (!entry) return true;
        return userCanApproveCurrentAccountingStage(getLoggedInUser(), entry);
    }

    function canRequestAccountingManualEntryChange(entry) {
        const st = toStr(entry?.status);
        return (
            entry &&
            entry.manualEntry &&
            (st === 'confirmed' || st === 'invoiced') &&
            !accountingEntryHasPendingRequest(entry)
        );
    }

    function revertManualPaymentAllocationsForEntry(reg, entry) {
        if (!reg || !entry) return;
        (entry.paymentAllocations || []).forEach((a) => {
            const amt = parseFloat(a.amount) || 0;
            if (amt <= 0) return;
            const b = a.building || entry.building;
            const u = a.unit || entry.unit;
            const uk = accountingUnitKey(b, u);
            if (a.kind === 'cheque') {
                const ch = reg.cheques.find((c) => c.id === a.id);
                if (ch) {
                    const prevPaid = parseFloat(ch.paidAmount) || 0;
                    const total = parseFloat(ch.amount) || 0;
                    ch.paidAmount = parseFloat(Math.max(0, prevPaid - amt).toFixed(3));
                    if (ch.paidAmount <= 0.001) {
                        ch.paidAmount = 0;
                        ch.status = 'pending';
                    } else if (ch.paidAmount >= total - 0.001) {
                        ch.status = 'paid_cash';
                    } else {
                        ch.status = 'paid_partial';
                    }
                    ch.paymentHistory = (ch.paymentHistory || []).filter((h) => toStr(h.entryId) !== toStr(entry.id));
                    if (Array.isArray(ch.actions)) {
                        ch.actions = ch.actions.filter((x) => toStr(x.entryId) !== toStr(entry.id));
                    }
                    ch.updatedAt = new Date().toISOString();
                }
            } else if (a.kind === 'invoice') {
                const inv = reg.invoices.find((i) => i.id === a.id);
                if (inv) {
                    inv.paidAmount = parseFloat(Math.max(0, (parseFloat(inv.paidAmount) || 0) - amt).toFixed(3));
                    const invTotal = parseFloat(inv.total) || 0;
                    if ((parseFloat(inv.paidAmount) || 0) < invTotal - 0.001) {
                        inv.status = inv.status === 'paid' ? 'approved' : inv.status;
                    }
                    if (Array.isArray(inv.paymentHistory)) {
                        inv.paymentHistory = inv.paymentHistory.filter((h) => toStr(h.entryId) !== toStr(entry.id));
                    }
                    inv.updatedAt = new Date().toISOString();
                }
            }
            if (uk) recomputeAccountingAccountSummary(reg, uk);
        });
    }

    function applyManualPaymentAllocationsFromEntry(reg, entry) {
        if (!reg || !entry) return;
        const items = (entry.paymentAllocations || [])
            .filter((a) => (parseFloat(a.amount) || 0) > 0)
            .map((a) => ({
                kind: a.kind,
                id: a.id,
                ref: a.ref,
                allocate: parseFloat(a.amount) || 0,
                building: a.building || entry.building,
                unit: a.unit || entry.unit
            }));
        if (!items.length) return;
        applyManualPaymentAllocations(reg, entry.building, entry.unit, entry.paymentNote || entry.title, {
            entryId: entry.id,
            voucherNo: entry.voucherNo,
            totalAmount: entry.amount,
            date: entry.dueDate,
            partyName: entry.partyName
        }, items);
    }

    function applyAccountingEntryRevision(reg, ent, revision) {
        if (!reg || !ent || !revision) return;
        const hadAppliedAllocs =
            ent.manualEntry &&
            !ent.allocationsPending &&
            (ent.paymentAllocations || []).some((a) => (parseFloat(a.amount) || 0) > 0);
        if (hadAppliedAllocs) revertManualPaymentAllocationsForEntry(reg, ent);
        const keepId = ent.id;
        const keepLinked = ent.linkedKey;
        const keepCreated = {
            createdByAt: ent.createdByAt,
            createdByName: ent.createdByName,
            createdById: ent.createdById,
            approvalHistory: ent.approvalHistory
        };
        Object.assign(ent, revision, {
            id: keepId,
            linkedKey: keepLinked,
            status: 'confirmed',
            allocationsPending: false,
            pendingRequest: null,
            approvalWorkflowState: 'confirmed',
            ...keepCreated,
            updatedAt: new Date().toISOString()
        });
        const newAllocItems = (ent.paymentAllocations || []).filter((a) => (parseFloat(a.amount) || 0) > 0);
        if (newAllocItems.length) applyManualPaymentAllocationsFromEntry(reg, ent);
        if (ent.unitKey) recomputeAccountingAccountSummary(reg, ent.unitKey);
    }

    function recomputeAccountingAccountSummary(reg, unitKey) {
        if (!reg || !unitKey) return reg;
        const cheques = reg.cheques.filter((c) => c.unitKey === unitKey);
        const entries = reg.entries.filter((e) => e.unitKey === unitKey);
        const deposits = reg.deposits.filter((d) => d.unitKey === unitKey);
        let paid = 0;
        let remaining = 0;
        let overdue = 0;
        let claims = 0;
        cheques.forEach((c) => {
            const amt = parseFloat(c.amount) || 0;
            const paidAmt = parseFloat(c.paidAmount) || 0;
            const st = toStr(c.status) || 'pending';
            if (st === 'pending_receipt' || st === 'receipt_rejected') return;
            if (isAccountingChequePaidStatus(st)) {
                paid += paidAmt > 0 ? paidAmt : amt;
            } else if (st === 'bounced' || st === 'returned') {
                claims += amt;
            } else if (isAccountingChequeOverdue(c)) {
                overdue += Math.max(0, amt - paidAmt);
            } else {
                remaining += Math.max(0, amt - paidAmt);
            }
        });
        entries.forEach((e) => {
            const amt = parseFloat(e.amount) || 0;
            if (toStr(e.status) === 'confirmed' || toStr(e.status) === 'invoiced') {
                if (toStr(e.type) === 'expense' || toStr(e.type) === 'adjustment_discount') paid -= amt;
                else paid += amt;
            } else if (toStr(e.status) === 'pending_accountant') {
                remaining += amt;
            }
        });
        const depositsHeld = deposits
            .filter((d) => toStr(d.status) === 'held')
            .reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
        const acct = reg.accounts[unitKey] || {};
        reg.accounts[unitKey] = {
            ...acct,
            unitKey,
            paid: parseFloat(paid.toFixed(3)),
            remaining: parseFloat(Math.max(0, remaining).toFixed(3)),
            overdue: parseFloat(Math.max(0, overdue).toFixed(3)),
            claims: parseFloat(Math.max(0, claims).toFixed(3)),
            depositsHeld: parseFloat(depositsHeld.toFixed(3)),
            updatedAt: new Date().toISOString()
        };
        return reg;
    }

    function mergeAccountingChequeFromContract(existing, incoming) {
        if (!existing) {
            return normalizeAccountingCheque({
                ...incoming,
                originalDueDate: incoming.dueDate,
                actions: []
            });
        }
        const keepDue =
            existing.deferred ||
            toStr(existing.status) === 'deferred' ||
            (Array.isArray(existing.actions) &&
                existing.actions.some((a) => a.actionType === 'defer' || a.actionType === 'reschedule'));
        return normalizeAccountingCheque({
            ...incoming,
            id: existing.id,
            status: resolveAccountingChequeStatusOnContractSync(existing, incoming),
            paidAmount: existing.paidAmount != null ? existing.paidAmount : 0,
            accountantNote: existing.accountantNote || '',
            dueDate: keepDue ? existing.dueDate : incoming.dueDate,
            originalDueDate: existing.originalDueDate || incoming.dueDate,
            deferred: existing.deferred || toStr(existing.status) === 'deferred',
            tenant: existing.tenant || incoming.tenant,
            agreementNo: existing.agreementNo || incoming.agreementNo,
            actions: Array.isArray(existing.actions) ? existing.actions : [],
            lastActionAt: existing.lastActionAt,
            lastActionDate: existing.lastActionDate,
            lastActionType: existing.lastActionType,
            receiptBankAccountId: existing.receiptBankAccountId || '',
            receiptReviewChecked: !!existing.receiptReviewChecked,
            receiptPrivateNote: existing.receiptPrivateNote || '',
            receiptApprovedAt: existing.receiptApprovedAt,
            receiptApprovedByName: existing.receiptApprovedByName
        });
    }

    function syncAccountingFromContractPayload(building, unit, payload, regOpt, optionsOpt) {
        const b = toStr(building);
        const u = toStr(unit);
        if (!b || !u || !payload || typeof payload !== 'object') return false;
        const reg = regOpt || loadAccountingRegistry();
        const options = optionsOpt || {};
        const linked = getLinkedContractUnitsFromPayload(payload);
        const agreementNo = toStr(payload.agreementNo);
        const tenant = toStr(payload.tenantName || payload.tenant);
        if (linked.length > 1) {
            const primaryU = normalizeUnit(linked[0]?.unit || payload.flatNo);
            if (normalizeUnit(u) !== primaryU) {
                const unitKey = accountingUnitKey(b, u);
                const primaryKey = accountingUnitKey(b, primaryU);
                const primaryAcct = reg.accounts[primaryKey] || {};
                reg.accounts[unitKey] = {
                    ...(reg.accounts[unitKey] || {}),
                    unitKey,
                    building: b,
                    unit: u,
                    agreementNo,
                    tenant,
                    linkedPrimaryUnit: primaryU,
                    contractTotal: parseFloat(primaryAcct.contractTotal) || parseFloat(getSmartTotalsFromPayload(payload).contractTotal) || 0,
                    municipal: parseFloat(primaryAcct.municipal) || 0,
                    depositRefAmount: parseFloat(primaryAcct.depositRefAmount) || 0,
                    updatedAt: new Date().toISOString()
                };
                recomputeAccountingAccountSummary(reg, unitKey);
                if (options.skipSave !== true) saveAccountingRegistry(reg);
                return true;
            }
            purgeDuplicateLinkedUnitAccountingEntries(reg, b, agreementNo, linked);
        }
        const unitKey = accountingUnitKey(b, u);
        const existingChequeMap = new Map(reg.cheques.map((c) => [c.linkedKey, c]));
        const existingEntryMap = new Map(reg.entries.map((e) => [e.linkedKey, e]));
        const existingDepositMap = new Map(reg.deposits.map((d) => [d.linkedKey, d]));
        const incomingChequeKeys = new Set();
        const incomingEntryKeys = new Set();
        const incomingDepositKeys = new Set();
        const paymentSchedule = parsePayloadJsonArrayField(payload, 'paymentScheduleJson', 'paymentSchedule');
        const vatSchedule = parsePayloadJsonArrayField(payload, 'vatChequeScheduleJson', 'vatChequeSchedule');
        const byChq = isPaymentMethodCheque(payload.paymentMethod);
        const vatChequesEnabled =
            toStr(payload.contractSubjectToVat) === 'yes' && toStr(payload.vatPaymentMode) === 'separate';

        if (byChq) {
            paymentSchedule.forEach((row) => {
                const idx = parseInt(row.monthIndex, 10) || 0;
                const chequeNo = toStr(row.checkNo || row.chequeNo).trim();
                const linkedKey = accountingChequeLinkedKey(b, u, 'rent', idx, chequeNo);
                const ready = contractRentChequeRowReadyForAccounting(row, payload);
                const existing = existingChequeMap.get(linkedKey);
                if (!ready) {
                    if (existing && isAccountingChequePendingReceipt(existing.status)) {
                        existingChequeMap.set(
                            linkedKey,
                            normalizeAccountingCheque({
                                ...existing,
                                chequeNo,
                                dueDate: toStr(row.dueDate || row.paymentDate),
                                amount: parseFloat(row.amount) || 0,
                                status: 'awaiting_contract_data',
                                updatedAt: new Date().toISOString()
                            })
                        );
                        incomingChequeKeys.add(linkedKey);
                    }
                    return;
                }
                incomingChequeKeys.add(linkedKey);
                const incoming = {
                    id: existing?.id || newAccountingId('chq'),
                    unitKey,
                    building: b,
                    unit: u,
                    linkedKey,
                    sourceType: 'rent',
                    chequeNo,
                    dueDate: toStr(row.dueDate || row.paymentDate),
                    amount: parseFloat(row.amount) || 0,
                    status: 'pending_receipt',
                    paidAmount: 0,
                    accountantNote: '',
                    agreementNo,
                    tenant,
                    monthIndex: idx,
                    updatedAt: new Date().toISOString()
                };
                const merged = mergeAccountingChequeFromContract(existing, incoming);
                existingChequeMap.set(linkedKey, merged);
            });
        }

        if (vatChequesEnabled) {
            vatSchedule.forEach((row) => {
                const idx = parseInt(row.chequeIndex || row.monthIndex, 10) || 0;
                const chequeNo = toStr(row.checkNo || row.chequeNo).trim();
                const linkedKey = accountingChequeLinkedKey(b, u, 'vat', idx, chequeNo);
                const ready = contractVatChequeRowReadyForAccounting(row, payload);
                const existing = existingChequeMap.get(linkedKey);
                if (!ready) {
                    if (existing && isAccountingChequePendingReceipt(existing.status)) {
                        existingChequeMap.set(
                            linkedKey,
                            normalizeAccountingCheque({
                                ...existing,
                                chequeNo,
                                dueDate: toStr(row.dueDate || row.paymentDate),
                                amount: parseFloat(row.amount) || 0,
                                status: 'awaiting_contract_data',
                                updatedAt: new Date().toISOString()
                            })
                        );
                        incomingChequeKeys.add(linkedKey);
                    }
                    return;
                }
                incomingChequeKeys.add(linkedKey);
                const incoming = {
                    id: existing?.id || newAccountingId('chq'),
                    unitKey,
                    building: b,
                    unit: u,
                    linkedKey,
                    sourceType: 'vat',
                    chequeNo,
                    dueDate: toStr(row.dueDate || row.paymentDate),
                    amount: parseFloat(row.amount) || 0,
                    status: 'pending_receipt',
                    paidAmount: 0,
                    accountantNote: '',
                    agreementNo,
                    tenant,
                    chequeIndex: idx,
                    updatedAt: new Date().toISOString()
                };
                const merged = mergeAccountingChequeFromContract(existing, incoming);
                existingChequeMap.set(linkedKey, merged);
            });
        }

        const depositAmount = parseFloat(payload.depositAmount) || 0;
        if (depositAmount > 0) {
            const linkedKey = accountingDepositLinkedKey(b, u, 'security');
            incomingDepositKeys.add(linkedKey);
            const existing = existingDepositMap.get(linkedKey);
            existingDepositMap.set(linkedKey, {
                id: existing?.id || newAccountingId('dep'),
                unitKey,
                building: b,
                unit: u,
                linkedKey,
                type: 'security',
                amount: depositAmount,
                reference: toStr(payload.depositReceiptRef) || toStr(existing?.reference),
                status: existing?.status || 'pending_receipt',
                agreementNo: existing?.agreementNo || agreementNo,
                tenant: existing?.tenant || tenant,
                attachmentName: toStr(payload.depositAttachmentName) || toStr(existing?.attachmentName),
                attachmentRelativePath: toStr(payload.depositAttachmentRelativePath) || toStr(existing?.attachmentRelativePath),
                attachmentFileId: toStr(payload.depositAttachmentFileId) || toStr(existing?.attachmentFileId),
                storedOnDisk: payload.depositStoredOnDisk || existing?.storedOnDisk,
                receiptBankAccountId: existing?.receiptBankAccountId || '',
                receiptApprovedAt: existing?.receiptApprovedAt,
                receiptApprovedByName: existing?.receiptApprovedByName,
                receiptApprovalNote: existing?.receiptApprovalNote,
                updatedAt: new Date().toISOString()
            });
        }

        const insRows = parsePayloadJsonArrayField(payload, 'insuranceDepositItemsJson', 'insuranceDepositItems');
        insRows.forEach((row, i) => {
            const itemId = toStr(row.id || row.rowId || i + 1);
            const linkedKey = accountingDepositLinkedKey(b, u, `ins_${itemId}`);
            incomingDepositKeys.add(linkedKey);
            const existing = existingDepositMap.get(linkedKey);
            existingDepositMap.set(linkedKey, {
                id: existing?.id || newAccountingId('dep'),
                unitKey,
                building: b,
                unit: u,
                linkedKey,
                type: 'insurance',
                amount: parseFloat(row.amount) || 0,
                reference: toStr(row.receiptRef || row.reference),
                status: existing?.status || 'pending_receipt',
                agreementNo: existing?.agreementNo || agreementNo,
                tenant: existing?.tenant || tenant,
                title: toStr(row.title || row.label),
                receiptBankAccountId: existing?.receiptBankAccountId || '',
                receiptApprovedAt: existing?.receiptApprovedAt,
                receiptApprovedByName: existing?.receiptApprovedByName,
                receiptApprovalNote: existing?.receiptApprovalNote,
                updatedAt: new Date().toISOString()
            });
        });

        const extraRows = parsePayloadJsonArrayField(payload, 'extraAdjustmentsJson', 'extraAdjustments');
        extraRows.forEach((row, i) => {
            const sourceKey = toStr(row.id || row.key || `extra_${i + 1}`);
            const linkedKey = accountingEntryLinkedKey(b, u, sourceKey);
            incomingEntryKeys.add(linkedKey);
            const kind = toStr(row.kind);
            const amt = Math.abs(computeExtraAdjustmentLineTotal(row, payload) || parseFloat(row.amount) || 0);
            if (amt <= 0) return;
            const existing = existingEntryMap.get(linkedKey);
            const entryType = kind === 'discount' ? 'adjustment_discount' : kind === 'add' ? 'adjustment_add' : 'income';
            const entryStatus = kind === 'add' ? (existing?.status || 'pending_accountant') : (existing?.status || 'pending');
            existingEntryMap.set(linkedKey, {
                id: existing?.id || newAccountingId('ent'),
                unitKey,
                building: b,
                unit: u,
                linkedKey,
                sourceKey,
                type: entryType,
                title: toStr(row.title || row.label || row.description) || t('بند إضافي / Extra item', 'Extra item / بند إضافي'),
                amount: amt,
                dueDate: toStr(row.dueDate),
                status: entryStatus,
                agreementNo: existing?.agreementNo || agreementNo,
                tenant: existing?.tenant || tenant,
                updatedAt: new Date().toISOString()
            });
        });

        reg.cheques = reg.cheques.filter((c) => {
            if (c.unitKey !== unitKey) return true;
            if (incomingChequeKeys.has(c.linkedKey)) return true;
            return (
                !isAccountingChequePendingReceipt(c.status) &&
                !isAccountingChequeAwaitingContractData(c.status)
            );
        });
        incomingChequeKeys.forEach((k) => {
            const row = existingChequeMap.get(k);
            if (!row) return;
            const idx = reg.cheques.findIndex((c) => c.linkedKey === k);
            if (idx >= 0) reg.cheques[idx] = row;
            else reg.cheques.push(row);
        });

        reg.entries = reg.entries.filter((e) => accountingEntryPreservedOnContractSync(e, unitKey, incomingEntryKeys));
        incomingEntryKeys.forEach((k) => {
            if (existingEntryMap.has(k)) {
                const idx = reg.entries.findIndex((e) => e.linkedKey === k);
                const row = existingEntryMap.get(k);
                if (idx >= 0) reg.entries[idx] = row;
                else reg.entries.push(row);
            }
        });

        reg.deposits = reg.deposits.filter((d) => d.unitKey !== unitKey || incomingDepositKeys.has(d.linkedKey));
        incomingDepositKeys.forEach((k) => {
            if (existingDepositMap.has(k)) {
                const idx = reg.deposits.findIndex((d) => d.linkedKey === k);
                const row = existingDepositMap.get(k);
                if (idx >= 0) reg.deposits[idx] = row;
                else reg.deposits.push(row);
            }
        });

        const totals = getSmartTotalsFromPayload(payload);
        reg.accounts[unitKey] = {
            ...(reg.accounts[unitKey] || {}),
            unitKey,
            building: b,
            unit: u,
            agreementNo,
            tenant,
            contractTotal: parseFloat(totals.contractTotal) || 0,
            municipal: parseFloat(totals.municipal) || 0,
            depositRefAmount: parseFloat(totals.depositRefAmount) || 0,
            updatedAt: new Date().toISOString()
        };
        recomputeAccountingAccountSummary(reg, unitKey);
        if (options.skipSave !== true) saveAccountingRegistry(reg);
        return true;
    }

    function syncAllAccountingFromSavedContracts() {
        const map = loadSavedContractsByUnitMap();
        const reg = loadAccountingRegistry();
        let touched = false;
        Object.keys(map || {}).forEach((k) => {
            const entry = map[k];
            const p = entry?.payload;
            if (!p) return;
            const b = toStr(p.buildingNo);
            const u = toStr(p.flatNo);
            if (!b || !u) return;
            try {
                if (syncAccountingFromContractPayload(b, u, p, reg, { skipSave: true })) touched = true;
            } catch (_eAllSync) {}
        });
        if (touched) {
            saveAccountingRegistry(reg);
            _accountingRegistryCache = reg;
        }
        return touched;
    }

    function getAccountingSummaryForUnit(building, unit) {
        const unitKey = accountingUnitKey(building, unit);
        const reg = loadAccountingRegistry();
        recomputeAccountingAccountSummary(reg, unitKey);
        return reg.accounts[unitKey] || {
            unitKey,
            building: toStr(building),
            unit: toStr(unit),
            paid: 0,
            remaining: 0,
            overdue: 0,
            claims: 0,
            depositsHeld: 0
        };
    }

    function getAccountingChequesForUnit(building, unit) {
        const unitKey = accountingUnitKey(building, unit);
        return loadAccountingRegistry().cheques.filter((c) => c.unitKey === unitKey);
    }

    function getAccountingEntriesForUnit(building, unit) {
        const unitKey = accountingUnitKey(building, unit);
        return loadAccountingRegistry().entries.filter((e) => e.unitKey === unitKey);
    }

    function getAccountingDepositsForUnit(building, unit) {
        const unitKey = accountingUnitKey(building, unit);
        return loadAccountingRegistry().deposits.filter((d) => d.unitKey === unitKey);
    }

    function mirrorAccountingStatusToContractPayload(building, unit) {
        const b = toStr(building);
        const u = toStr(unit);
        const payload = getSavedContractPayloadForUnit({ building: b, unit: u });
        if (!payload) return;
        const unitKey = accountingUnitKey(b, u);
        const reg = loadAccountingRegistry();
        const chequeMirror = {};
        reg.cheques.filter((c) => c.unitKey === unitKey).forEach((c) => {
            chequeMirror[c.linkedKey] = {
                status: c.status,
                paidAmount: c.paidAmount,
                accountantNote: c.accountantNote || '',
                dueDate: c.dueDate,
                originalDueDate: c.originalDueDate,
                deferred: !!c.deferred,
                lastActionDate: c.lastActionDate,
                lastActionType: c.lastActionType,
                actionsCount: Array.isArray(c.actions) ? c.actions.length : 0
            };
        });
        payload.accountingChequeMirror = chequeMirror;
        payload.accountingChequeActionsByKey = {};
        reg.cheques.filter((c) => c.unitKey === unitKey).forEach((c) => {
            if (Array.isArray(c.actions) && c.actions.length) {
                payload.accountingChequeActionsByKey[c.linkedKey] = c.actions.slice(-5);
            }
        });
        const pendingEntries = reg.entries.filter(
            (e) => e.unitKey === unitKey && toStr(e.status) === 'pending_accountant'
        ).length;
        payload.accountingPendingApprovalCount = pendingEntries;
        payload.accountingPendingReceiptCount = countAccountingContractReceiptPendingForUnit(b, u, reg);
        _accountingSyncMuted = true;
        try {
            upsertSavedContractForUnit(b, u, payload, payload.contractSavedStatus || 'active');
        } finally {
            _accountingSyncMuted = false;
        }
    }

    function setAccountingChequeStatus(chequeId, status, opt = {}) {
        if (!assertPermissionOrAlert('manage_accounting', 'لا تملك صلاحية المحاسبة.', 'No accounting permission.')) return;
        const reg = loadAccountingRegistry();
        const idx = reg.cheques.findIndex((c) => c.id === chequeId);
        if (idx < 0) return;
        const ch = reg.cheques[idx];
        const prevStatus = ch.status;
        const prevDue = ch.dueDate;
        ch.status = ACCOUNTING_CHEQUE_STATUSES.includes(status) ? status : ch.status;
        if (opt.paidAmount != null) ch.paidAmount = parseFloat(opt.paidAmount) || 0;
        if (opt.accountantNote != null) ch.accountantNote = toStr(opt.accountantNote);
        if (ch.status === 'deferred') ch.deferred = true;
        else if (isAccountingChequePaidStatus(ch.status)) ch.deferred = false;
        appendAccountingChequeAction(ch, {
            actionDate: opt.actionDate || getCurrentAccountingActionDate(),
            actionType: 'status_change',
            previousStatus: prevStatus,
            newStatus: ch.status,
            previousDueDate: prevDue,
            newDueDate: ch.dueDate,
            actionNote: opt.actionNote || opt.accountantNote || accountingChequeStatusLabel(ch.status),
            reason: opt.reason || '',
            paidAmount: ch.paidAmount
        });
        ch.updatedAt = new Date().toISOString();
        recomputeAccountingAccountSummary(reg, ch.unitKey);
        saveAccountingRegistry(reg);
        mirrorAccountingStatusToContractPayload(ch.building, ch.unit);
        recordSystemActivity({
            actionKey: 'accounting_cheque_status',
            actionAr: 'تحديث حالة شيك / Cheque status update',
            actionEn: 'Cheque status update / تحديث حالة شيك',
            building: ch.building,
            unit: ch.unit,
            ref: ch.chequeNo || ch.linkedKey,
            note: `${formatAccountingDisplayDate(ch.lastActionDate)} — ${accountingChequeStatusLabel(ch.status)}${ch.accountantNote ? ' — ' + ch.accountantNote : ''}`
        });
        renderAccountingWorkspace();
        try {
            if (selectedUnitDetailsRecord && selectedUnitDetailsRecord.building === ch.building && selectedUnitDetailsRecord.unit === ch.unit) {
                const uidx = (window._unitsViewRows || []).findIndex(
                    (r) => r && r.building === ch.building && r.unit === ch.unit
                );
                if (uidx >= 0) openUnitDetailsModal(uidx);
            }
        } catch (_eUdRef) {}
    }

    function submitAccountingChequeDeferOrAction(keepOpen) {
        const ctx = _accountingChequeActionCtx;
        if (!ctx?.chequeId) return;
        if (!assertPermissionOrAlert('manage_accounting', 'لا تملك صلاحية المحاسبة.', 'No accounting permission.')) return;
        const reg = loadAccountingRegistry();
        const idx = reg.cheques.findIndex((c) => c.id === ctx.chequeId);
        if (idx < 0) return;
        const ch = reg.cheques[idx];
        const actionDate = toStr(document.getElementById('acctActDate')?.value);
        const actionType = toStr(document.getElementById('acctActType')?.value) || 'other';
        const actionNote = toStr(document.getElementById('acctActNote')?.value);
        const reason = toStr(document.getElementById('acctActReason')?.value);
        const newDueDate = toStr(document.getElementById('acctActNewDue')?.value);
        const newStatus = toStr(document.getElementById('acctActStatus')?.value);
        const bankAccountId = toStr(document.getElementById('acctActBankAccount')?.value);
        const cashAmount = parseFloat(document.getElementById('acctActCashAmount')?.value);
        const issueInvoice = !!document.getElementById('acctActIssueInvoice')?.checked;
        const penaltyAmountInput = parseFloat(document.getElementById('acctPenaltyAmount')?.value);
        if (!actionDate) {
            alert(t('أدخل تاريخ الإجراء.', 'Enter action date.'));
            return;
        }
        if ((actionType === 'defer' || actionType === 'reschedule') && !newDueDate) {
            alert(t('أدخل تاريخ الاستحقاق الجديد.', 'Enter new due date.'));
            return;
        }
        if (actionType === 'bank_deposit' && !bankAccountId) {
            alert(t('اختر الحساب البنكي الذي أُودِع فيه الشيك.', 'Select the bank account for deposit.'));
            return;
        }
        const prevStatus = ch.status;
        const prevDue = ch.dueDate;
        let penaltyAmount = null;
        let penaltyEntryId = '';
        let invoiceId = '';
        let invoiceNo = '';
        let cashAmt = null;

        if (actionType === 'cash_convert') {
            cashAmt = Number.isFinite(cashAmount) ? cashAmount : (parseFloat(ch.amount) || 0);
            ch.status = 'paid_cash';
            ch.deferred = false;
            ch.paidAmount = cashAmt;
            if (issueInvoice) {
                const cashRes = createCashPaymentEntryAndInvoice(reg, ch, cashAmt, actionDate, actionNote);
                if (cashRes.invoice) {
                    invoiceId = cashRes.invoice.id;
                    invoiceNo = cashRes.invoice.invoiceNo;
                }
            }
        } else if (actionType === 'defer' || actionType === 'reschedule') {
            ch.dueDate = newDueDate;
            ch.status = 'deferred';
            ch.deferred = true;
        } else if (actionType === 'bounced') {
            ch.status = 'bounced';
            ch.deferred = false;
            const settings = getAccountingSettings(reg);
            if (settings.penalties.autoPenaltyOnBounce !== false) {
                const fixedAmt = Number.isFinite(penaltyAmountInput)
                    ? penaltyAmountInput
                    : getDefaultBouncePenaltyAmount(settings);
                penaltyAmount = getBouncePenaltyFixedAmount(fixedAmt);
                const actId = newAccountingId('act');
                const pent = createBouncePenaltyEntry(reg, ch, actionDate, penaltyAmount, fixedAmt, actId);
                penaltyEntryId = pent?.id || '';
            }
        } else if (actionType === 'bank_deposit') {
            ch.status = 'paid_full';
            ch.deferred = false;
            ch.paidAmount = parseFloat(ch.amount) || 0;
        } else if (newStatus && ACCOUNTING_CHEQUE_STATUSES.includes(newStatus)) {
            ch.status = newStatus;
            ch.deferred = newStatus === 'deferred';
        }

        const act = appendAccountingChequeAction(ch, {
            actionDate,
            actionType,
            previousStatus: prevStatus,
            newStatus: ch.status,
            previousDueDate: prevDue,
            newDueDate: ch.dueDate,
            actionNote,
            reason,
            paidAmount: ch.paidAmount,
            bankAccountId,
            cashAmount: cashAmt,
            penaltyAmount,
            penaltyEntryId,
            invoiceId,
            invoiceNo
        });
        if (actionNote) ch.accountantNote = actionNote;
        ch.updatedAt = new Date().toISOString();
        recomputeAccountingAccountSummary(reg, ch.unitKey);
        saveAccountingRegistry(reg);
        mirrorAccountingStatusToContractPayload(ch.building, ch.unit);
        recordSystemActivity({
            actionKey: 'accounting_cheque_action',
            actionAr: 'إجراء على شيك / Cheque action',
            actionEn: 'Cheque action / إجراء على شيك',
            building: ch.building,
            unit: ch.unit,
            ref: ch.chequeNo || ch.linkedKey,
            note: `${formatAccountingDisplayDate(actionDate)} — ${accountingActionTypeLabel(actionType)}${reason ? ' — ' + reason : ''}`
        });
        if (keepOpen) {
            ctx.mode = 'action';
            ctx.presetType = actionType;
            refreshAccountingChequeActionModal();
            const host = document.getElementById('acctChequeTimelineHost');
            if (host) host.innerHTML = renderAccountingChequeTimelineHtml(ch);
            document.getElementById('acctActNote') && (document.getElementById('acctActNote').value = '');
            document.getElementById('acctActReason') && (document.getElementById('acctActReason').value = '');
        } else {
            closeAccountingChequeActionModal();
        }
        renderAccountingWorkspace();
    }

    function openAccountingChequeActionModal(chequeId, mode) {
        const reg = loadAccountingRegistry();
        const ch = reg.cheques.find((c) => c.id === chequeId);
        if (!ch) return;
        if (isAccountingChequePendingReceipt(ch.status) && mode !== 'detail' && mode !== 'history') {
            alert(
                t(
                    'يجب اعتماد استلام الشيك من المحاسب أولاً قبل إدارة التحصيل.',
                    'Cheque receipt must be confirmed by the accountant before collection actions.'
                )
            );
            if (canApproveAccountingEntry()) openAccountingContractReceiptApprovalModal('cheque', chequeId);
            return;
        }
        _accountingChequeActionCtx = { chequeId, mode: mode || 'action', presetType: mode === 'defer' ? 'defer' : (mode || 'action') };
        const modal = document.getElementById('accountingChequeActionModal');
        const body = document.getElementById('accountingChequeActionBody');
        const title = document.getElementById('accountingChequeActionTitle');
        if (!modal || !body) return;
        if (title) {
            title.textContent = mode === 'detail'
                ? t('بيانات الشيك / Cheque details', 'Cheque details / بيانات الشيك')
                : mode === 'history'
                    ? t('سجل حركة الشيك / Cheque log', 'Cheque log / سجل الشيك')
                    : t('إدارة الشيك / Cheque management', 'Cheque management / إدارة الشيك');
        }
        if (mode === 'detail') {
            body.innerHTML = buildAccountingChequeDetailBodyHtml(ch);
        } else if (mode === 'history') {
            body.innerHTML = `
                <div class="acct-cheque-hero" style="margin-bottom:12px">
                    <strong>💳 ${escHtml(ch.chequeNo || '—')}</strong> · ${escHtml(ch.building)} / ${escHtml(ch.unit)} · ${escHtml(summaryAmtOm(ch.amount))}
                </div>
                ${renderAccountingChequeTimelineHtml(ch)}
                <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
                    <button type="button" class="btn-outline mini-btn" onclick="printAccountingChequeMovementReport('${escHtml(ch.id)}')">${t('طباعة', 'Print')}</button>
                    <button type="button" class="btn-primary mini-btn" onclick="openAccountingChequeActionModal('${escHtml(ch.id)}','action')">${t('إضافة إجراء', 'Add action')}</button>
                </div>`;
        } else {
            body.innerHTML = buildAccountingChequeWorkspaceHtml(ch, mode === 'defer' ? 'defer' : 'tenant_contact');
            onAcctActionTypeChange();
        }
        modal.classList.add('open');
    }

    function closeAccountingChequeActionModal() {
        _accountingChequeActionCtx = null;
        document.getElementById('accountingChequeActionModal')?.classList.remove('open');
    }

    function openAccountingContractReceiptApprovalModal(kind, id) {
        if (!assertPermissionOrAlert('approve_accounting', 'لا تملك صلاحية اعتماد استلام الضمان والشيكات.', 'No permission to approve deposit/cheque receipt.')) {
            return;
        }
        const reg = loadAccountingRegistry();
        const k = toStr(kind);
        let detailHtml = '';
        let title = '';
        let building = '';
        let defaultBankId = '';
        let extraFieldsHtml = '';
        if (k === 'deposit') {
            const dep = (reg.deposits || []).find((d) => d.id === id);
            if (!dep || !isAccountingDepositPendingReceipt(dep.status)) {
                alert(t('لا يوجد ضمان بانتظار اعتماد الاستلام.', 'No deposit awaiting receipt confirmation.'));
                return;
            }
            building = dep.building;
            defaultBankId = resolveDefaultBankAccountIdForDeposit(dep);
            title = t('اعتماد استلام الضمان', 'Confirm deposit receipt');
            const typeLbl = dep.type === 'security' ? t('ضمان', 'Security') : dep.type === 'insurance' ? t('تأمين', 'Insurance') : dep.type;
            const attBlock = buildAccountingReceiptAttachmentBlock(
                getAccountingDepositAttachmentRef(dep),
                t('مرفق الضمان / الإيصال', 'Deposit / receipt attachment')
            );
            const verifyBlock = buildAccountingDepositReceiptVerificationContextHtml(dep);
            detailHtml = `
                <div style="margin-bottom:12px;padding:12px;background:#e8f5e9;border-radius:8px;border:1px solid #a5d6a7">
                    <strong>${escHtml(typeLbl)} — ${escHtml(summaryAmtOm(dep.amount))}</strong><br>
                    <span style="font-size:12px">${escHtml(dep.building)} / ${escHtml(dep.unit)} · ${escHtml(dep.tenant || '—')}</span><br>
                    <span style="font-size:12px;color:#666">${t('مرجع', 'Reference')}: ${escHtml(dep.reference || '—')} · ${t('عقد', 'Contract')}: ${escHtml(dep.agreementNo || '—')}</span>
                </div>
                ${verifyBlock}
                ${attBlock}
                <p style="font-size:12px;color:#444;margin:0 0 10px;line-height:1.55">${t('أكّد أن مبلغ الضمان وصل فعلياً وطابق المرفق قبل تقييده في الحساب البنكي. بعد الاعتماد يُولَّد رقم إيصال التأمين تلقائياً (سند قبض محاسبي) ويُسجَّل في العقد. يُحتجَز المبلغ في المحاسبة ويُفعَّل العقد عند اكتمال اعتماد الشيكات أيضاً.', 'Confirm the deposit was received and matches the attachment before posting to the bank account. After approval, the deposit receipt number is auto-generated (accounting receipt voucher) and saved on the contract. The amount is held in accounting and the contract activates once cheques are approved too.')}</p>`;
        } else if (k === 'cheque') {
            const ch = (reg.cheques || []).find((c) => c.id === id);
            if (!ch || !isAccountingChequePendingReceipt(ch.status)) {
                alert(t('لا يوجد شيك بانتظار اعتماد الاستلام.', 'No cheque awaiting receipt confirmation.'));
                return;
            }
            building = ch.building;
            defaultBankId = resolveDefaultBankAccountIdForCheque(ch);
            title = t('اعتماد استلام الشيك', 'Confirm cheque receipt');
            const srcLbl = ch.sourceType === 'vat' ? t('ضريبة', 'VAT') : t('إيجار', 'Rent');
            const chAtt = getAccountingChequeAttachmentRef(ch);
            const hasAtt = accountingChequeAttachmentLooksPresent(chAtt);
            const previewOnClick = safeOnClickJs(`openAccountingChequeAttachmentPreview(${JSON.stringify(ch.id)})`);
            const attBlock = hasAtt
                ? `<div style="margin:10px 0;padding:10px;border:1px dashed #90caf9;border-radius:8px;background:#f5f9ff">
                    <strong style="font-size:12px;display:block;margin-bottom:6px">📎 ${t('مرفق الشيك', 'Cheque attachment')}</strong>
                    <button type="button" class="btn-outline mini-btn" ${previewOnClick}>🔍 ${t('معاينة المرفق', 'Preview attachment')}</button>
                </div>`
                : `<p style="font-size:12px;color:#888;margin:8px 0">${t('لا يوجد مرفق', 'No attachment')}</p>`;
            extraFieldsHtml = `<div class="acct-approval-compose-block" style="margin-top:10px">
                <span class="acct-approval-compose-label" style="display:block;font-size:12px;font-weight:700;margin-bottom:6px;color:#555">${t('ملاحظة خاصة بهذا الشيك (اختياري)', 'Private note for this cheque (optional)')}</span>
                <input type="text" id="accountingContractReceiptPrivateNote" value="${escHtml(toStr(ch.receiptPrivateNote))}" autocomplete="off" placeholder="${t('مثال: فرق بسيط في التاريخ...', 'e.g. minor date difference...')}" style="width:100%;padding:8px 10px;font-size:12px">
            </div>`;
            detailHtml = `
                <div style="margin-bottom:12px;padding:12px;background:#e8f5e9;border-radius:8px;border:1px solid #a5d6a7">
                    <strong>💳 ${escHtml(ch.chequeNo || '—')} — ${escHtml(summaryAmtOm(ch.amount))}</strong><br>
                    <span style="font-size:12px">${escHtml(ch.building)} / ${escHtml(ch.unit)} · ${escHtml(ch.tenant || '—')}</span><br>
                    <span style="font-size:12px;color:#666">${srcLbl} · ${t('استحقاق', 'Due')}: ${escHtml(ch.dueDate || '—')} · ${t('عقد', 'Contract')}: ${escHtml(ch.agreementNo || '—')}</span>
                </div>
                ${attBlock}
                <p style="font-size:12px;color:#444;margin:0 0 10px;line-height:1.55">${t('أكّد أن الشيك استُلم فعلياً وأنه سليم ومطابق للمرفق والعقد. حدّد الحساب البنكي الذي سيُودَع فيه الشيك. الشيكات غير المعتمدة تبقى في طلبات الاعتماد.', 'Confirm the cheque was received and matches the attachment and contract. Select the bank account for deposit. Unapproved cheques remain in pending requests.')}</p>`;
        } else {
            return;
        }
        _accountingContractReceiptCtx = { kind: k, id, building, defaultBankId };
        const modal = document.getElementById('accountingContractReceiptModal');
        const body = document.getElementById('accountingContractReceiptBody');
        const titleEl = document.getElementById('accountingContractReceiptTitle');
        if (!modal || !body) return;
        if (titleEl) titleEl.textContent = title;
        body.innerHTML = `${detailHtml}
            ${buildReceiptBankAccountFieldHtml(building, defaultBankId, 'accountingContractReceiptBankAccount')}
            ${extraFieldsHtml}
            <div class="acct-approval-compose-block" style="margin-top:14px">
                <span class="acct-approval-compose-label" style="display:block;font-size:12px;font-weight:700;margin-bottom:6px;color:var(--primary)">${t('ملاحظات الاعتماد / سبب الرفض (إلزامي)', 'Approval notes / rejection reason (required)')}</span>
                <textarea id="accountingContractReceiptNote" rows="4" autocomplete="off" placeholder="${t('اكتب تأكيد الاستلام أو سبب الرفض...', 'Enter receipt confirmation or rejection reason...')}"></textarea>
            </div>
            <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
                <button type="button" class="btn-outline" onclick="closeAccountingContractReceiptModal()">${t('إلغاء', 'Cancel')}</button>
                <button type="button" class="btn-outline" style="border-color:#c62828;color:#c62828" onclick="submitAccountingContractReceiptDecision('reject')">❌ ${t('رفض الاستلام', 'Reject receipt')}</button>
                <button type="button" class="btn-primary" onclick="submitAccountingContractReceiptDecision('approve')">✅ ${t('اعتماد الاستلام', 'Confirm receipt')}</button>
            </div>`;
        modal.classList.add('open');
        ensureAccountingReceiptModalComposeWritable(modal);
        requestAnimationFrame(() => ensureAccountingReceiptModalComposeWritable(modal));
    }

    function closeAccountingContractReceiptModal() {
        _accountingContractReceiptCtx = null;
        document.getElementById('accountingContractReceiptModal')?.classList.remove('open');
        flushPendingAccountingWorkspaceRender();
    }

    function submitAccountingContractReceiptDecision(decision) {
        if (!assertPermissionOrAlert('approve_accounting', 'لا تملك صلاحية اعتماد استلام الضمان والشيكات.', 'No permission to approve deposit/cheque receipt.')) {
            return;
        }
        const note = toStr(document.getElementById('accountingContractReceiptNote')?.value).trim();
        if (!note) {
            alert(t('يجب كتابة ملاحظات الاعتماد أو سبب الرفض قبل المتابعة.', 'You must enter approval notes or a rejection reason before continuing.'));
            return;
        }
        const bankAccountId = toStr(document.getElementById('accountingContractReceiptBankAccount')?.value);
        if (decision === 'approve' && !bankAccountId) {
            alert(t('يجب اختيار الحساب البنكي الذي أُودِع فيه المبلغ.', 'You must select the bank account where the amount was deposited.'));
            return;
        }
        const ctx = _accountingContractReceiptCtx;
        if (!ctx?.id) return;
        const reg = loadAccountingRegistry();
        const actor = getCurrentActorLedgerRecord();
        const now = new Date().toISOString();
        let building = '';
        let unit = '';
        let ref = '';
        if (ctx.kind === 'deposit') {
            const idx = (reg.deposits || []).findIndex((d) => d.id === ctx.id);
            if (idx < 0) return;
            const dep = reg.deposits[idx];
            if (!isAccountingDepositPendingReceipt(dep.status)) return;
            building = dep.building;
            unit = dep.unit;
            ref = dep.reference || dep.type;
            if (decision === 'approve') approveAccountingContractDepositReceipt(dep, reg, note, bankAccountId, actor, now);
            else rejectAccountingContractDepositReceipt(dep, note, actor, now);
        } else if (ctx.kind === 'cheque') {
            const idx = (reg.cheques || []).findIndex((c) => c.id === ctx.id);
            if (idx < 0) return;
            const ch = reg.cheques[idx];
            if (!isAccountingChequePendingReceipt(ch.status)) return;
            building = ch.building;
            unit = ch.unit;
            ref = ch.chequeNo || ch.linkedKey;
            const privateNote = toStr(document.getElementById('accountingContractReceiptPrivateNote')?.value).trim();
            if (decision === 'approve') approveAccountingContractChequeReceipt(ch, note, bankAccountId, actor, now, privateNote);
            else rejectAccountingContractChequeReceipt(ch, note, actor, now);
        } else {
            return;
        }
        closeAccountingContractReceiptModal();
        saveAccountingRegistry(reg, { deferJournalRebuild: true });
        finalizeAccountingContractReceiptSideEffects(building, unit, ref, decision, note);
    }

    function toggleAccountingChequeReceiptReview(chequeId, checked) {
        const reg = loadAccountingRegistry();
        const ch = (reg.cheques || []).find((c) => c.id === chequeId);
        if (!ch || !isAccountingChequePendingReceipt(ch.status)) return;
        ch.receiptReviewChecked = !!checked;
        saveAccountingRegistry(reg, { skipJournalRebuild: true });
        const row = document.querySelector(`[data-cheque-review-row="${cssEscAttr(chequeId)}"]`);
        if (row) row.classList.toggle('acct-cheque-review-row--checked', !!checked);
        refreshAccountingBulkChequeReceiptApproveBtn();
    }

    function refreshAccountingBulkChequeReceiptApproveBtn() {
        const btn = document.getElementById('accountingBulkChequeReceiptApproveBtn');
        if (!btn) return;
        const n = document.querySelectorAll('#accountingBulkChequeReceiptTable input[data-cheque-review-check]:checked').length;
        btn.disabled = n < 1;
        btn.textContent = `✅ ${t('اعتماد المحدد', 'Approve selected')} (${n})`;
    }

    function accountingRecordMatchesUnit(rec, building, unit) {
        if (!rec) return false;
        const b = toStr(building);
        const u = toStr(unit);
        const uk = accountingUnitKey(b, u);
        if (toStr(rec.unitKey) === uk) return true;
        return toStr(rec.building) === b && toStr(rec.unit) === u;
    }

    function getAccountingPendingReceiptChequesForUnit(building, unit, regOpt) {
        const reg = regOpt || loadAccountingRegistry();
        return (reg.cheques || []).filter((c) => accountingRecordMatchesUnit(c, building, unit) && isAccountingChequePendingReceipt(c.status));
    }

    function openAccountingContractChequeBulkReceiptModal(building, unit) {
        if (!assertPermissionOrAlert('approve_accounting', 'لا تملك صلاحية اعتماد استلام الشيكات.', 'No permission to approve cheque receipt.')) {
            return;
        }
        const b = toStr(building);
        const u = toStr(unit);
        if (!b || !u) return;
        const reg = loadAccountingRegistry();
        const cheques = getAccountingPendingReceiptChequesForUnit(b, u, reg);
        if (!cheques.length) {
            alert(t('لا توجد شيكات بانتظار الاعتماد لهذه الوحدة.', 'No cheques awaiting approval for this unit.'));
            return;
        }
        _accountingContractBulkReceiptCtx = { building: b, unit: u };
        const defaultBankId = resolveDefaultBankAccountIdForBuilding(b);
        const rows = cheques
            .map((c) => {
                const srcLbl = c.sourceType === 'vat' ? t('ضريبة', 'VAT') : t('إيجار', 'Rent');
                const att = getAccountingChequeAttachmentRef(c);
                const hasAtt = accountingChequeAttachmentLooksPresent(att);
                const previewOnClick = safeOnClickJs(`openAccountingChequeAttachmentPreview(${JSON.stringify(c.id)})`);
                const checked = !!c.receiptReviewChecked;
                const privateNoteVal = escHtml(toStr(c.receiptPrivateNote));
                return `<tr class="acct-cheque-review-row${checked ? ' acct-cheque-review-row--checked' : ''}" data-cheque-review-row="${escHtml(c.id)}">
                    <td style="text-align:center">
                        <input type="checkbox" data-cheque-review-check data-cheque-id="${escHtml(c.id)}" ${checked ? 'checked' : ''} onchange="toggleAccountingChequeReceiptReview('${escHtml(c.id)}', this.checked); refreshAccountingBulkChequeReceiptApproveBtn()" title="${t('تمت المراجعة والمطابقة', 'Reviewed & matched')}">
                    </td>
                    <td>${escHtml(c.chequeNo || '—')}</td>
                    <td>${escHtml(srcLbl)}</td>
                    <td>${escHtml(c.dueDate || '—')}</td>
                    <td>${escHtml(summaryAmtOm(c.amount))}</td>
                    <td>${hasAtt ? `<button type="button" class="btn-outline mini-btn" ${previewOnClick}>📎 ${t('معاينة', 'Preview')}</button>` : `<span style="color:#999;font-size:11px">${t('بدون مرفق', 'No file')}</span>`}</td>
                    <td>
                        <input type="text" class="acct-cheque-private-note-input" data-cheque-private-note data-cheque-id="${escHtml(c.id)}" value="${privateNoteVal}" placeholder="${t('اختياري', 'Optional')}" style="width:100%;min-width:100px;font-size:11px;padding:4px 6px">
                    </td>
                    <td><button type="button" class="btn-outline mini-btn" style="border-color:#c62828;color:#c62828" onclick="rejectAccountingContractChequeFromBulk('${escHtml(c.id)}')">❌</button></td>
                </tr>`;
            })
            .join('');
        const modal = document.getElementById('accountingContractChequeBulkReceiptModal');
        const body = document.getElementById('accountingContractChequeBulkReceiptBody');
        const titleEl = document.getElementById('accountingContractChequeBulkReceiptTitle');
        if (!modal || !body) return;
        if (titleEl) {
            titleEl.textContent = `${t('مراجعة شيكات العقد', 'Review contract cheques')} — ${b} / ${u}`;
        }
        body.innerHTML = `
            <p style="font-size:12px;color:#444;margin:0 0 12px;line-height:1.55">${t('راجع كل شيك مع مرفقه وضع علامة ✓ عند المطابقة. ثم اختر الحساب البنكي واعتمد المحدد دفعة واحدة. الشيكات غير المحددة تبقى في طلبات الاعتماد.', 'Review each cheque with its attachment and check ✓ when matched. Then select the bank account and approve selected in one step. Unchecked cheques stay in pending approval.')}</p>
            ${buildReceiptBankAccountFieldHtml(b, defaultBankId, 'accountingBulkChequeReceiptBankAccount')}
            <div class="table-wrap" style="margin:12px 0">
                <table class="data-table" id="accountingBulkChequeReceiptTable" style="width:100%;font-size:12px">
                    <thead><tr>
                        <th style="width:42px">✓</th>
                        <th>${t('رقم الشيك', 'Cheque no.')}</th>
                        <th>${t('النوع', 'Type')}</th>
                        <th>${t('الاستحقاق', 'Due')}</th>
                        <th>${t('المبلغ', 'Amount')}</th>
                        <th>${t('مرفق', 'Attachment')}</th>
                        <th>${t('ملاحظة خاصة', 'Private note')}</th>
                        <th>${t('رفض', 'Reject')}</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <div class="acct-approval-compose-block">
                <span class="acct-approval-compose-label" style="display:block;font-size:12px;font-weight:700;margin-bottom:6px;color:var(--primary)">${t('ملاحظات الاعتماد الجماعي (إلزامي)', 'Bulk approval notes (required)')}</span>
                <textarea id="accountingBulkChequeReceiptNote" rows="3" autocomplete="off" placeholder="${t('تأكيد مطابقة الشيكات المحددة...', 'Confirm matched cheques...')}"></textarea>
                <small style="display:block;margin-top:6px;color:#666;font-size:11px;line-height:1.45">${t('للملاحظة على شيك معيّن فقط، استخدم عمود «ملاحظة خاصة» في الجدول (اختياري).', 'For a note on one cheque only, use the Private note column in the table (optional).')}</small>
            </div>
            <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
                <button type="button" class="btn-outline" onclick="closeAccountingContractChequeBulkReceiptModal()">${t('إغلاق', 'Close')}</button>
                <button type="button" class="btn-primary" id="accountingBulkChequeReceiptApproveBtn" onclick="submitAccountingContractChequeBulkReceiptApproval()">✅ ${t('اعتماد المحدد', 'Approve selected')} (0)</button>
            </div>`;
        modal.classList.add('open');
        ensureAccountingReceiptModalComposeWritable(modal);
        refreshAccountingBulkChequeReceiptApproveBtn();
        requestAnimationFrame(() => {
            ensureAccountingReceiptModalComposeWritable(modal);
            const noteEl = document.getElementById('accountingBulkChequeReceiptNote');
            if (noteEl) {
                noteEl.disabled = false;
                noteEl.readOnly = false;
                noteEl.style.pointerEvents = 'auto';
            }
        });
    }

    function closeAccountingContractChequeBulkReceiptModal() {
        _accountingContractBulkReceiptCtx = null;
        document.getElementById('accountingContractChequeBulkReceiptModal')?.classList.remove('open');
        flushPendingAccountingWorkspaceRender();
    }

    function rejectAccountingContractChequeFromBulk(chequeId) {
        const note = prompt(t('سبب رفض استلام الشيك:', 'Reason for rejecting cheque receipt:'));
        if (!note || !toStr(note).trim()) return;
        const reg = loadAccountingRegistry();
        const ch = (reg.cheques || []).find((c) => c.id === chequeId);
        if (!ch || !isAccountingChequePendingReceipt(ch.status)) return;
        const actor = getCurrentActorLedgerRecord();
        const now = new Date().toISOString();
        rejectAccountingContractChequeReceipt(ch, toStr(note).trim(), actor, now);
        const ctx = _accountingContractBulkReceiptCtx;
        if (ctx) {
            saveAccountingRegistry(reg, { deferJournalRebuild: true });
            finalizeAccountingContractReceiptSideEffects(ch.building, ch.unit, ch.chequeNo || ch.linkedKey, 'reject', toStr(note).trim());
            openAccountingContractChequeBulkReceiptModal(ctx.building, ctx.unit);
        } else {
            renderAccountingWorkspace();
        }
    }

    function submitAccountingContractChequeBulkReceiptApproval() {
        if (!assertPermissionOrAlert('approve_accounting', 'لا تملك صلاحية اعتماد استلام الشيكات.', 'No permission to approve cheque receipt.')) {
            return;
        }
        const note = toStr(document.getElementById('accountingBulkChequeReceiptNote')?.value).trim();
        if (!note) {
            alert(t('يجب كتابة ملاحظات الاعتماد قبل المتابعة.', 'You must enter approval notes before continuing.'));
            return;
        }
        const bankAccountId = toStr(document.getElementById('accountingBulkChequeReceiptBankAccount')?.value);
        if (!bankAccountId) {
            alert(t('يجب اختيار الحساب البنكي الذي ستُودَع فيه الشيكات.', 'You must select the bank account for cheque deposit.'));
            return;
        }
        const checkedIds = Array.from(document.querySelectorAll('#accountingBulkChequeReceiptTable input[data-cheque-review-check]:checked'))
            .map((el) => toStr(el.getAttribute('data-cheque-id')))
            .filter(Boolean);
        if (!checkedIds.length) {
            alert(t('حدّد شيكاً واحداً على الأقل بعد المراجعة.', 'Select at least one reviewed cheque.'));
            return;
        }
        const ctx = _accountingContractBulkReceiptCtx;
        if (!ctx) return;
        const reg = loadAccountingRegistry();
        const actor = getCurrentActorLedgerRecord();
        const now = new Date().toISOString();
        let approved = 0;
        checkedIds.forEach((id) => {
            const ch = (reg.cheques || []).find((c) => c.id === id);
            if (!ch || !isAccountingChequePendingReceipt(ch.status)) return;
            const privateNote = getAccountingChequeReceiptPrivateNoteFromUi(id);
            approveAccountingContractChequeReceipt(ch, note, bankAccountId, actor, now, privateNote);
            approved++;
        });
        if (!approved) {
            alert(t('لم يُعتمد أي شيك — ربما تغيّرت حالتها.', 'No cheques approved — status may have changed.'));
            return;
        }
        saveAccountingRegistry(reg, { deferJournalRebuild: true });
        closeAccountingContractChequeBulkReceiptModal();
        finalizeAccountingContractReceiptSideEffects(ctx.building, ctx.unit, `${approved} cheques`, 'approve', note);
        const remaining = countAccountingContractReceiptPendingForUnit(ctx.building, ctx.unit, reg);
        if (remaining > 0) {
            setTimeout(() => {
                alert(
                    t(
                        `تم اعتماد ${approved} شيك. ما زال ${remaining} بنداً بانتظار الاعتماد في طلبات الاعتماد.`,
                        `Approved ${approved} cheque(s). ${remaining} item(s) still pending approval.`
                    )
                );
            }, 0);
        }
    }

    function renderAccountingContractReceiptPendingSection(reg) {
        const deposits = (reg.deposits || []).filter((d) => isAccountingDepositPendingReceipt(d.status));
        const cheques = (reg.cheques || []).filter((c) => isAccountingChequePendingReceipt(c.status));
        if (!deposits.length && !cheques.length) return '';
        const canApprove = canApproveAccountingEntry();
        const depRows = deposits.map((d) => {
            const typeLbl = d.type === 'security' ? t('ضمان', 'Security') : d.type === 'insurance' ? t('تأمين', 'Insurance') : d.type;
            const approveBtn = canApprove
                ? `<button type="button" class="btn-primary mini-btn" onclick="openAccountingContractReceiptApprovalModal('deposit','${escHtml(d.id)}')">${t('اعتماد الاستلام', 'Confirm receipt')}</button>`
                : '';
            return `<tr>
                <td>${t('ضمان', 'Deposit')}</td>
                <td>${escHtml(d.building)}</td><td>${escHtml(d.unit)}</td>
                <td>${escHtml(d.tenant || '—')}</td><td>${escHtml(d.agreementNo || '—')}</td>
                <td>${escHtml(typeLbl)}</td><td>${escHtml(d.reference || '—')}</td>
                <td>${escHtml(summaryAmtOm(d.amount))}</td>
                <td>${escHtml(accountingDepositStatusLabel(d.status))}</td>
                <td>${approveBtn}</td>
            </tr>`;
        }).join('');
        const chqByUnit = new Map();
        cheques.forEach((c) => {
            const uk = c.unitKey || accountingUnitKey(c.building, c.unit);
            if (!chqByUnit.has(uk)) chqByUnit.set(uk, []);
            chqByUnit.get(uk).push(c);
        });
        const bulkBannerRows = [];
        chqByUnit.forEach((list) => {
            if (!list.length) return;
            const c0 = list[0];
            const bulkOnClick = safeOnClickJs(`openAccountingContractChequeBulkReceiptModal(${JSON.stringify(c0.building)},${JSON.stringify(c0.unit)})`);
            const bulkBtn =
                canApprove && list.length
                    ? `<button type="button" class="btn-primary mini-btn" ${bulkOnClick}>✓ ${t('مراجعة واعتماد الشيكات', 'Review & approve cheques')} (${list.length})</button>`
                    : '';
            if (list.length > 1 && bulkBtn) {
                bulkBannerRows.push(`<tr style="background:#e3f2fd"><td colspan="10" style="padding:10px 12px">
                    <strong>${escHtml(c0.building)} / ${escHtml(c0.unit)}</strong>
                    <span style="font-size:12px;color:#1565c0;margin:0 8px">${list.length} ${t('شيك بانتظار المراجعة', 'cheques awaiting review')}</span>
                    ${bulkBtn}
                </td></tr>`);
            }
        });
        const chqRows = cheques.map((c) => {
            const srcLbl = c.sourceType === 'vat' ? t('ضريبة', 'VAT') : t('إيجار', 'Rent');
            const att = getAccountingChequeAttachmentRef(c);
            const attLbl = att && contractAttachmentPresent(att) ? `📎 ${t('مرفق', 'File')}` : '—';
            const approveBtn = canApprove
                ? `<button type="button" class="btn-primary mini-btn" onclick="openAccountingContractReceiptApprovalModal('cheque','${escHtml(c.id)}')">${t('اعتماد', 'Approve')}</button>`
                : '';
            const unitList = chqByUnit.get(c.unitKey || accountingUnitKey(c.building, c.unit)) || [];
            const bulkMiniOnClick = safeOnClickJs(`openAccountingContractChequeBulkReceiptModal(${JSON.stringify(c.building)},${JSON.stringify(c.unit)})`);
            const bulkMini =
                canApprove && unitList.length > 1
                    ? ` <button type="button" class="btn-outline mini-btn" ${bulkMiniOnClick}>✓ ${t('جماعي', 'Bulk')}</button>`
                    : '';
            return `<tr>
                <td>${t('شيك', 'Cheque')}</td>
                <td>${escHtml(c.building)}</td><td>${escHtml(c.unit)}</td>
                <td>${escHtml(c.tenant || '—')}</td><td>${escHtml(c.agreementNo || '—')}</td>
                <td>${escHtml(srcLbl)} · ${escHtml(c.chequeNo || '—')} ${attLbl !== '—' ? `<span style="font-size:11px;color:#1565c0">${attLbl}</span>` : ''}</td><td>${escHtml(c.dueDate || '—')}</td>
                <td>${escHtml(summaryAmtOm(c.amount))}</td>
                <td>${escHtml(accountingChequeStatusLabel(c.status))}${c.receiptReviewChecked ? ` <span title="${t('تمت المراجعة', 'Reviewed')}">✓</span>` : ''}</td>
                <td>${approveBtn}${bulkMini}</td>
            </tr>`;
        }).join('');
        return `
            <div style="margin-bottom:16px;padding:12px 14px;border:1px solid #a5d6a7;border-radius:10px;background:linear-gradient(135deg,#f1f8e9 0%,#e8f5e9 100%)">
                <strong style="display:block;margin-bottom:6px;color:#1b5e20">${t('اعتماد استلام الضمان والشيكات (عقود جديدة)', 'Deposit & cheque receipt approval (new contracts)')}</strong>
                <p style="font-size:12px;color:#33691e;margin:0 0 10px;line-height:1.5">${t('راجع المرفقات واختر الحساب البنكي للإيداع. للشيكات الكثيرة: راجع واحداً واحداً ثم اعتماد جماعي. غير المعتمد يبقى هنا.', 'Review attachments and select the deposit bank account. For many cheques: review one by one then bulk approve. Unapproved items stay here.')}</p>
                <div class="table-wrap"><table class="data-table" style="width:100%;font-size:12px">
                    <thead><tr>
                        <th>${t('النوع', 'Type')}</th><th>${t('مبنى', 'Building')}</th><th>${t('وحدة', 'Unit')}</th>
                        <th>${t('مستأجر', 'Tenant')}</th><th>${t('عقد', 'Contract')}</th>
                        <th>${t('البند', 'Item')}</th><th>${t('مرجع / استحقاق', 'Ref / due')}</th>
                        <th>${t('المبلغ', 'Amount')}</th><th>${t('الحالة', 'Status')}</th><th>${t('إجراء', 'Action')}</th>
                    </tr></thead>
                    <tbody>${bulkBannerRows.join('')}${depRows}${chqRows}</tbody>
                </table></div>
            </div>`;
    }

    function confirmAccountingEntry(entryId) {
        openAccountingApprovalModal(entryId);
    }

    function openAccountingApprovalModal(entryId) {
        if (!assertPermissionOrAlert('approve_accounting', 'لا تملك صلاحية اعتماد المعاملات المحاسبية.', 'No permission to approve accounting transactions.')) {
            return;
        }
        const reg = loadAccountingRegistry();
        const ent = reg.entries.find((e) => e.id === entryId);
        if (!ent || !isAccountingEntryPendingApproval(ent)) {
            alert(t('لا توجد معاملة بانتظار الاعتماد.', 'No transaction pending approval.'));
            return;
        }
        _accountingApprovalEntryId = entryId;
        const modal = document.getElementById('accountingApprovalModal');
        const body = document.getElementById('accountingApprovalBody');
        if (!modal || !body) return;
        closeAccountingReceiptDetailModal();
        const actionLbl = accountingPendingActionLabel(ent);
        const editDiffBlock =
            toStr(ent.pendingRequest?.action) === 'edit' && ent.pendingRequest?.revision
                ? buildAccountingEditDiffAllocationTableHtml(ent, reg)
                : '';
        body.innerHTML = `
            <div style="margin-bottom:12px;padding:12px;background:#fff8e1;border-radius:8px;border:1px solid #ffe082">
                <strong>${escHtml(actionLbl)}</strong><br>
                <span style="font-size:12px">${escHtml(ent.voucherNo || ent.title || '—')} — ${escHtml(summaryAmtOm(ent.amount))}</span><br>
                <span style="font-size:12px;color:#666">${t('أُدخلت بواسطة', 'Entered by')}: ${escHtml(ent.createdByName || ent.pendingRequest?.submittedByName || '—')}
                ${ent.createdByAt || ent.pendingRequest?.submittedAt ? ` — ${escHtml(formatAccountingAuditDateTime(ent.createdByAt || ent.pendingRequest?.submittedAt))}` : ''}</span>
                ${ent.pendingRequest?.submitNote ? `<br><span style="font-size:12px;color:#666">${t('سبب الطلب', 'Request reason')}: ${escHtml(ent.pendingRequest.submitNote)}</span>` : ''}
            </div>
            ${editDiffBlock}
            <div id="accountingApprovalAuditHost">${buildAccountingEntryAuditPanelHtml(ent, 'approval')}</div>
            <div class="acct-approval-compose-block" style="margin-top:14px">
                <span class="acct-approval-compose-label" style="display:block;font-size:12px;font-weight:700;margin-bottom:6px;color:var(--primary)">${t('ملاحظات الاعتماد / سبب الرفض (إلزامي)', 'Approval notes / rejection reason (required)')}</span>
                <textarea id="accountingApprovalNote" rows="4" autocomplete="off" placeholder="${t('اكتب تعليقك وأسباب الاعتماد أو الرفض...', 'Enter your comments and reasons for approval or rejection...')}"></textarea>
            </div>
            <p style="font-size:12px;color:#666;margin:8px 0 0">${t('يجب على المعتمد كتابة ملاحظاته حتى لو كان نفس الشخص الذي أدخل المعاملة.', 'The approver must enter notes even if they entered the transaction.')}</p>
            <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
                <button type="button" class="btn-outline" onclick="closeAccountingApprovalModal()">${t('إلغاء', 'Cancel')}</button>
                <button type="button" class="btn-outline" style="border-color:#c62828;color:#c62828" onclick="submitAccountingApprovalDecision('reject')">❌ ${t('رفض', 'Reject')}</button>
                <button type="button" class="btn-primary" onclick="submitAccountingApprovalDecision('approve')">✅ ${t('اعتماد وتأكيد', 'Approve & confirm')}</button>
            </div>`;
        modal.classList.add('open');
        ensureAccountingApprovalInputsWritable(modal);
        setTimeout(() => {
            const noteEl = document.getElementById('accountingApprovalNote');
            if (noteEl) {
                noteEl.disabled = false;
                noteEl.readOnly = false;
                noteEl.style.pointerEvents = 'auto';
                try {
                    noteEl.focus();
                } catch (_eApprFocus) {}
            }
        }, 80);
        try { localizeBilingualUi(); } catch (_e) {}
    }

    function closeAccountingApprovalModal() {
        _accountingApprovalEntryId = '';
        document.getElementById('accountingApprovalModal')?.classList.remove('open');
    }

    function submitAccountingApprovalDecision(decision) {
        const entryId = _accountingApprovalEntryId;
        if (!entryId) return;
        const reg = loadAccountingRegistry();
        const idx = reg.entries.findIndex((e) => e.id === entryId);
        if (idx < 0) return;
        const ent = reg.entries[idx];
        if (!isAccountingEntryPendingApproval(ent)) return;
        if (!canApproveAccountingEntryNow(ent)) {
            const stageLbl = accountingApprovalChainStatusLabel(ent);
            alert(
                t(
                    `لا تملك صلاحية اعتماد هذه المرحلة. ${stageLbl.ar}`,
                    `You cannot approve at this stage. ${stageLbl.en}`
                )
            );
            return;
        }
        const note = toStr(document.getElementById('accountingApprovalNote')?.value).trim();
        if (!note) {
            alert(
                t(
                    'يجب كتابة ملاحظات الاعتماد أو سبب الرفض قبل المتابعة.',
                    'You must enter approval notes or a rejection reason before continuing.'
                )
            );
            return;
        }
        const actor = getCurrentActorLedgerRecord();
        const now = new Date().toISOString();
        const pendingReq = ent.pendingRequest;
        const pendingAction = pendingReq
            ? toStr(pendingReq.action)
            : toStr(ent.approvalWorkflowState).replace('pending_', '') || 'create';
        const historyItem = {
            at: now,
            byId: actor.staffUserId,
            byName: actor.staffName,
            decision: decision === 'approve' ? 'approved' : 'rejected',
            action: pendingAction,
            note,
            requestNo: pendingReq?.requestNo || null,
            requestSnapshot: pendingReq ? snapshotAccountingPendingRequestForHistory(ent, pendingReq) : null
        };
        if (decision === 'approve') {
            const stageResult = processAccountingApprovalStageAdvance(ent, actor, note, pendingAction);
            historyItem.stageRole = stageResult.stageRole || getCurrentAccountingApprovalStage(ent)?.roleKey || '';
            historyItem.stageIndex = ent.approvalChain ? ent.approvalChain.currentIndex : 0;
            pushAccountingApprovalHistory(ent, historyItem);
            if (!stageResult.finalize) {
                saveAccountingRegistry(reg);
                closeAccountingApprovalModal();
                const nextLbl = getApprovalStageRoleLabel(stageResult.nextStage?.roleKey || '');
                alert(
                    t(
                        `تم اعتماد المرحلة الحالية. الطلب بانتظار: ${nextLbl}`,
                        `Current stage approved. Awaiting: ${nextLbl}`
                    )
                );
                renderAccountingWorkspace();
                return;
            }
            if (pendingReq && pendingAction === 'delete') {
                revertManualPaymentAllocationsForEntry(reg, ent);
                const delMeta = {
                    building: ent.building,
                    unit: ent.unit,
                    unitKey: ent.unitKey,
                    title: ent.title,
                    voucherNo: ent.voucherNo
                };
                reg.entries = reg.entries.filter((e) => e.id !== entryId);
                removeAccountingJournalForReference(reg, 'entry', entryId);
                if (delMeta.unitKey) recomputeAccountingAccountSummary(reg, delMeta.unitKey);
                saveAccountingRegistry(reg);
                recordSystemActivity({
                    actionKey: 'accounting_entry_delete_approved',
                    actionAr: 'اعتماد حذف سند محاسبي',
                    actionEn: 'Approve accounting voucher deletion',
                    building: delMeta.building,
                    unit: delMeta.unit,
                    ref: delMeta.voucherNo || delMeta.title,
                    note
                });
            } else if (pendingReq && pendingAction === 'edit') {
                applyAccountingEntryRevision(reg, ent, pendingReq.revision || {});
                ent.approvedByName = actor.staffName;
                ent.approvedById = actor.staffUserId;
                ent.approvedAt = now;
                ent.approvalNote = note;
                ent.rejectedAt = '';
                ent.rejectedByName = '';
                ent.rejectionNote = '';
                saveAccountingRegistry(reg);
                mirrorAccountingStatusToContractPayload(ent.building, ent.unit);
                recordSystemActivity({
                    actionKey: 'accounting_entry_edit_approved',
                    actionAr: 'اعتماد تعديل سند محاسبي',
                    actionEn: 'Approve accounting voucher edit',
                    building: ent.building,
                    unit: ent.unit,
                    ref: ent.voucherNo || ent.title,
                    note
                });
            } else if (toStr(ent.status) === 'pending_accountant') {
                ent.status = 'confirmed';
                ent.approvalWorkflowState = 'confirmed';
                ent.pendingRequest = null;
                ent.approvedByName = actor.staffName;
                ent.approvedById = actor.staffUserId;
                ent.approvedAt = now;
                ent.approvalNote = note;
                ent.rejectedAt = '';
                ent.rejectedByName = '';
                ent.rejectionNote = '';
                ent.updatedAt = now;
                if (ent.manualEntry && toStr(ent.type) === 'income' && ent.allocationsPending) {
                    const allocItems = (ent.paymentAllocations || []).filter((a) => (parseFloat(a.amount) || 0) > 0);
                    if (allocItems.length) {
                        applyManualPaymentAllocationsFromEntry(reg, ent);
                    }
                    ent.allocationsPending = false;
                }
                ent.approvalChain = null;
                recomputeAccountingAccountSummary(reg, ent.unitKey);
                saveAccountingRegistry(reg);
                mirrorAccountingStatusToContractPayload(ent.building, ent.unit);
                recordSystemActivity({
                    actionKey: 'accounting_entry_confirm',
                    actionAr: 'اعتماد بند محاسبي',
                    actionEn: 'Approve accounting entry',
                    building: ent.building,
                    unit: ent.unit,
                    ref: ent.sourceKey || ent.title,
                    note
                });
            }
        } else {
            if (pendingReq) {
                ent.pendingRequest = null;
                ent.approvalWorkflowState = '';
                ent.rejectedByName = actor.staffName;
                ent.rejectedById = actor.staffUserId;
                ent.rejectedAt = now;
                ent.rejectionNote = note;
                ent.updatedAt = now;
                pushAccountingApprovalHistory(ent, historyItem);
                saveAccountingRegistry(reg);
                recordSystemActivity({
                    actionKey: 'accounting_entry_request_rejected',
                    actionAr: 'رفض طلب محاسبي',
                    actionEn: 'Reject accounting request',
                    building: ent.building,
                    unit: ent.unit,
                    ref: ent.voucherNo || ent.title,
                    note
                });
            } else if (toStr(ent.status) === 'pending_accountant') {
                ent.status = 'rejected';
                ent.approvalWorkflowState = 'rejected';
                ent.pendingRequest = null;
                ent.rejectedByName = actor.staffName;
                ent.rejectedById = actor.staffUserId;
                ent.rejectedAt = now;
                ent.rejectionNote = note;
                ent.updatedAt = now;
                pushAccountingApprovalHistory(ent, historyItem);
                if (ent.unitKey) recomputeAccountingAccountSummary(reg, ent.unitKey);
                saveAccountingRegistry(reg);
                recordSystemActivity({
                    actionKey: 'accounting_entry_rejected',
                    actionAr: 'رفض بند محاسبي',
                    actionEn: 'Reject accounting entry',
                    building: ent.building,
                    unit: ent.unit,
                    ref: ent.sourceKey || ent.title,
                    note
                });
            }
        }
        closeAccountingApprovalModal();
        closeAccountingReceiptDetailModal();
        renderAccountingWorkspace();
        refreshAccountingReceiptDetailModalIfOpen();
        try {
            updateNotificationsNavBadge();
            refreshNotificationsIfVisible();
        } catch (_eN) {}
    }

    function createAccountingInvoiceFromEntries(entryIds) {
        if (!assertPermissionOrAlert('manage_accounting', 'لا تملك صلاحية المحاسبة.', 'No accounting permission.')) return null;
        const ids = Array.isArray(entryIds) ? entryIds : [];
        const reg = loadAccountingRegistry();
        const rows = reg.entries.filter((e) => ids.includes(e.id) && toStr(e.status) === 'confirmed');
        if (!rows.length) return null;
        const total = rows.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
        const inv = {
            id: newAccountingId('inv'),
            entryIds: rows.map((e) => e.id),
            unitKey: rows[0].unitKey,
            building: rows[0].building,
            unit: rows[0].unit,
            agreementNo: rows[0].agreementNo,
            tenant: rows[0].tenant,
            total: parseFloat(total.toFixed(3)),
            status: 'draft',
            createdAt: new Date().toISOString()
        };
        reg.invoices.push(inv);
        saveAccountingRegistry(reg);
        return inv;
    }

    function approveAccountingInvoice(invoiceId) {
        if (!assertPermissionOrAlert('manage_accounting', 'لا تملك صلاحية المحاسبة.', 'No accounting permission.')) return;
        const reg = loadAccountingRegistry();
        const inv = reg.invoices.find((i) => i.id === invoiceId);
        if (!inv || inv.status === 'approved') return;
        const actor = getCurrentActorLedgerRecord();
        inv.status = 'approved';
        inv.approvedAt = new Date().toISOString();
        inv.approvedBy = actor.staffName;
        inv.invoiceNo = inv.invoiceNo || `INV-${Date.now().toString().slice(-8)}`;
        reg.entries.forEach((e) => {
            if (inv.entryIds.includes(e.id)) e.status = 'invoiced';
        });
        saveAccountingRegistry(reg);
        const payload = getSavedContractPayloadForUnit({ building: inv.building, unit: inv.unit });
        if (payload) {
            payload.accountingInvoiceApprovedAt = inv.approvedAt;
            payload.accountingInvoiceNo = inv.invoiceNo;
            payload.accountingInvoiceTotal = inv.total;
            _accountingSyncMuted = true;
            try {
                upsertSavedContractForUnit(inv.building, inv.unit, payload, payload.contractSavedStatus || 'active');
            } finally {
                _accountingSyncMuted = false;
            }
        }
        recordSystemActivity({
            actionKey: 'accounting_invoice_approve',
            actionAr: 'اعتماد فاتورة / Approve invoice',
            actionEn: 'Approve invoice / اعتماد فاتورة',
            building: inv.building,
            unit: inv.unit,
            ref: inv.invoiceNo,
            note: summaryAmtOm(inv.total)
        });
        renderAccountingWorkspace();
    }

    function printAccountingInvoice(invoiceId) {
        const reg = loadAccountingRegistry();
        const inv = reg.invoices.find((i) => i.id === invoiceId);
        if (!inv) return;
        const maintEntry = reg.entries.find((e) => inv.entryIds.includes(e.id) && e.maintenanceRequestId);
        if (maintEntry) {
            const req = loadMaintenanceRegistry().requests.find((r) => r.id === maintEntry.maintenanceRequestId);
            if (req) {
                printMaintenanceInvoiceDocument(req, inv);
                return;
            }
        }
        const rows = reg.entries.filter((e) => inv.entryIds.includes(e.id));
        const body = `
            <div class="section-header property-section-h">${t('بيانات الفاتورة / Invoice details', 'Invoice details / بيانات الفاتورة')}</div>
            <table class="info-table property-report-table print-zebra-cells" style="margin-bottom:14px">
                <tbody>
                    <tr>
                        <th style="width:22%">${t('رقم الفاتورة / Invoice no.', 'Invoice no. / رقم الفاتورة')}</th>
                        <td style="width:28%">${escHtml(inv.invoiceNo || inv.id)}</td>
                        <th style="width:22%">${t('تاريخ الفاتورة / Invoice date', 'Invoice date / تاريخ الفاتورة')}</th>
                        <td style="width:28%">${escHtml(toStr(inv.approvedAt || inv.createdAt).slice(0, 10))}</td>
                    </tr>
                    <tr>
                        <th>${t('العقار / Property', 'Property / العقار')}</th>
                        <td>${escHtml(inv.building)} — ${escHtml(inv.unit)}</td>
                        <th>${t('المستأجر / Tenant', 'Tenant / المستأجر')}</th>
                        <td>${escHtml(inv.tenant || '—')}</td>
                    </tr>
                    <tr>
                        <th>${t('رقم العقد / Contract no.', 'Contract no. / رقم العقد')}</th>
                        <td colspan="3">${escHtml(inv.agreementNo || '—')}</td>
                    </tr>
                </tbody>
            </table>
            <div class="section-header property-section-h">${t('البنود / Items', 'Items / البنود')}</div>
            <table class="info-table property-report-table print-zebra">
                <thead><tr>
                    <th class="print-num">#</th>
                    <th>${t('البند / Item', 'Item / البند')}</th>
                    <th>${t('المبلغ / Amount', 'Amount / المبلغ')}</th>
                </tr></thead>
                <tbody>${rows.map((e, i) => `<tr><td class="print-num">${i + 1}</td><td>${escHtml(e.title)}</td><td>${escHtml(summaryAmtOm(e.amount))}</td></tr>`).join('')}</tbody>
                <tfoot><tr><td colspan="2" style="font-weight:700">${t('الإجمالي / Total', 'Total / الإجمالي')}</td><td style="font-weight:700">${escHtml(summaryAmtOm(inv.total))}</td></tr></tfoot>
            </table>
            ${inv.approvedAt ? `<p class="property-report-meta" style="margin-top:12px">${t('معتمدة في / Approved at', 'Approved at / معتمدة في')}: ${escHtml(inv.approvedAt.slice(0, 16).replace('T', ' '))} — ${escHtml(inv.approvedBy || '')}</p>` : ''}
        `;
        printWithSiteStandard({ ar: 'فاتورة محاسبية', en: 'Accounting Invoice' }, body);
        inv.status = 'printed';
        inv.printedAt = new Date().toISOString();
        saveAccountingRegistry(reg);
        renderAccountingWorkspace();
    }

    function accountingGlobalSummary(regIn) {
        const reg = regIn || loadAccountingRegistry();
        let paid = 0;
        let remaining = 0;
        let overdue = 0;
        let depositsHeld = 0;
        Object.keys(reg.accounts || {}).forEach((k) => {
            const a = reg.accounts[k];
            if (!a) return;
            paid += parseFloat(a.paid) || 0;
            remaining += parseFloat(a.remaining) || 0;
            overdue += parseFloat(a.overdue) || 0;
            depositsHeld += parseFloat(a.depositsHeld) || 0;
        });
        const pendingApproval = (reg.entries || []).filter((e) => isAccountingEntryPendingApproval(e)).length + countAccountingContractReceiptPending(reg);
        return { paid, remaining, overdue, depositsHeld, pendingApproval };
    }

    function accountingMatchesSearch(row, search) {
        const q = toStr(search).trim().toLowerCase();
        if (!q) return true;
        const allocHay = (row.paymentAllocations || [])
            .map((a) => [a.ref, a.kind, a.building, a.unit].join(' '))
            .join(' ');
        const hay = [
            row.building,
            row.unit,
            row.agreementNo,
            row.tenant,
            row.partyName,
            row.chequeNo,
            row.title,
            row.sourceType,
            row.type,
            row.reference,
            row.referenceNo,
            row.voucherNo,
            row.paymentNote,
            row.accountantNote,
            collectAccountingEntryRequestNoHaystack(row),
            allocHay
        ]
            .map((v) => toStr(v).toLowerCase())
            .join(' ');
        return hay.includes(q);
    }

    function getManualEntryCoveredChequeIds(reg) {
        const ids = new Set();
        (reg.entries || []).forEach((e) => {
            if (toStr(e.type) !== 'income') return;
            (e.paymentAllocations || []).forEach((a) => {
                if (a.kind !== 'cheque') return;
                if (a.id) ids.add(a.id);
                else if (a.ref) {
                    const ch = (reg.cheques || []).find((c) => toStr(c.chequeNo) === toStr(a.ref));
                    if (ch) ids.add(ch.id);
                }
            });
        });
        (reg.cheques || []).forEach((ch) => {
            const p = findParentReceiptAllocation('cheque', ch.id, reg);
            if (p && p.allocIndex >= 0) ids.add(ch.id);
        });
        return ids;
    }

    /** شيك مدفوع يُعرض ويُحسب كإيراد مستقل (غير مضمّن في سند قبض مؤكد) */
    function isAccountingStandaloneIncomeCheque(reg, ch) {
        if (!ch || !isAccountingChequePaidStatus(ch.status)) return false;
        const paid = parseFloat(ch.paidAmount || ch.amount) || 0;
        if (paid <= 0) return false;
        if (getManualEntryCoveredChequeIds(reg).has(ch.id)) return false;
        const parent = findParentReceiptAllocationForChequeExtended(ch.id, reg);
        if (!parent) return true;
        if (parent.allocIndex >= 0) return false;
        if (parent.inferred) {
            const e = parent.entry;
            const cluster = collectChequeClusterForReceipt(ch, reg, e);
            const sum = cluster.reduce((s, c) => s + (parseFloat(c.paidAmount) || 0), 0);
            const entryAmt = parseFloat(e?.amount) || 0;
            if (cluster.some((c) => c.id === ch.id) && Math.abs(sum - entryAmt) < 0.02) return false;
        }
        return true;
    }

    function accountingEntryMatchesFilters(row) {
        const st = _accountingUiState;
        const ledgerStatus = toStr(st.ledgerStatus);
        if (ledgerStatus) {
            const pending = isAccountingEntryPendingApproval(row);
            if (ledgerStatus === 'pending' && !pending) return false;
            if (ledgerStatus === 'rejected' && toStr(row.status) !== 'rejected') return false;
            if (ledgerStatus === 'confirmed' && (pending || toStr(row.status) === 'rejected')) return false;
        }
        if (!accountingMatchesSearch(row, st.search)) return false;
        const bFilter = toStr(st.building).trim();
        const uFilter = toStr(st.unit).trim();
        const tenantFilter = toStr(st.tenant).trim();
        const due = toStr(row.dueDate);
        if (toStr(st.dueDateFrom) && due && due < toStr(st.dueDateFrom)) return false;
        if (toStr(st.dueDateTo) && due && due > toStr(st.dueDateTo)) return false;
        const party = toStr(row.partyName || row.tenant);
        if (tenantFilter && party && !party.toLowerCase().includes(tenantFilter.toLowerCase())) return false;
        const rowBuilding = toStr(row.building).trim();
        const rowUnit = toStr(row.unit).trim();
        if (!bFilter && !uFilter) return true;
        if (rowBuilding || rowUnit) {
            if (bFilter && !accountingFilterFieldMatches(rowBuilding, bFilter)) return false;
            if (uFilter && !accountingFilterFieldMatches(rowUnit, uFilter)) return false;
            return true;
        }
        if (row.manualEntry) {
            const allocs = row.paymentAllocations || [];
            if (allocs.length) {
                return allocs.some((a) => {
                    if (bFilter && !accountingFilterFieldMatches(a.building, bFilter)) return false;
                    if (uFilter && !accountingFilterFieldMatches(a.unit, uFilter)) return false;
                    return true;
                });
            }
            return !bFilter && !uFilter;
        }
        if (bFilter && !accountingFilterFieldMatches(rowBuilding, bFilter)) return false;
        if (uFilter && !accountingFilterFieldMatches(rowUnit, uFilter)) return false;
        return true;
    }

    function collectAccountingIncomeLedgerRows(reg) {
        const rows = [];
        (reg.entries || []).forEach((e) => {
            if (toStr(e.type) !== 'income') return;
            rows.push({ source: 'entry', data: e, sortDate: toStr(e.dueDate || e.updatedAt) });
        });
        (reg.cheques || []).forEach((ch) => {
            if (!isAccountingStandaloneIncomeCheque(reg, ch)) return;
            const paid = parseFloat(ch.paidAmount || ch.amount) || 0;
            if (paid <= 0) return;
            rows.push({
                source: 'cheque',
                data: ch,
                amount: paid,
                sortDate: toStr(ch.lastActionDate || ch.dueDate || ch.updatedAt)
            });
        });
        rows.sort((a, b) => toStr(b.sortDate).localeCompare(toStr(a.sortDate)));
        return rows;
    }

    function collectAccountingExpenseLedgerRows(reg) {
        return (reg.entries || [])
            .filter((e) => toStr(e.type) === 'expense')
            .map((e) => ({ source: 'entry', data: e, sortDate: toStr(e.dueDate || e.updatedAt) }))
            .sort((a, b) => toStr(b.sortDate).localeCompare(toStr(a.sortDate)));
    }

    function canEditAccountingManualEntry(entry) {
        return (
            entry &&
            entry.manualEntry &&
            (toStr(entry.status) === 'pending_accountant' || toStr(entry.status) === 'rejected')
        );
    }

    function deleteAccountingManualEntry(entryId) {
        if (!assertPermissionOrAlert('manage_accounting', 'لا تملك صلاحية المحاسبة.', 'No accounting permission.')) return;
        const reg = loadAccountingRegistry();
        const ent = reg.entries.find((e) => e.id === entryId);
        if (!canEditAccountingManualEntry(ent)) {
            alert(t('لا يمكن حذف هذا السند.', 'This voucher cannot be deleted.'));
            return;
        }
        if (!confirm(t('حذف السند؟', 'Delete this voucher?'))) return;
        reg.entries = reg.entries.filter((e) => e.id !== entryId);
        if (ent.unitKey) recomputeAccountingAccountSummary(reg, ent.unitKey);
        saveAccountingRegistry(reg);
        closeAccountingReceiptDetailModal();
        _accountingUiState.tab = 'pending';
        renderAccountingWorkspace();
    }

    async function requestDeleteAccountingManualEntry(entryId) {
        if (!assertPermissionOrAlert('manage_accounting', 'لا تملك صلاحية المحاسبة.', 'No accounting permission.')) return;
        const reg = loadAccountingRegistry();
        const ent = reg.entries.find((e) => e.id === entryId);
        if (!canRequestAccountingManualEntryChange(ent)) {
            alert(t('لا يمكن إرسال طلب حذف لهذا السند.', 'Cannot submit a delete request for this voucher.'));
            return;
        }
        const dlg = await showAppRequestNoteDialog({
            title: t('طلب حذف سند', 'Delete voucher request'),
            message: t(
                'إرسال طلب حذف هذا السند؟ سيُراجعه مدير الحسابات قبل التنفيذ.',
                'Submit a delete request? The accounting manager must approve before it takes effect.'
            ),
            reasonLabel: t('سبب طلب الحذف (اختياري)', 'Reason for delete request (optional)')
        });
        if (!dlg.confirmed) return;
        const submitNote = dlg.note || '';
        const actor = getCurrentActorLedgerRecord();
        const pendingRequest = normalizeAccountingPendingRequest({
            action: 'delete',
            submittedAt: new Date().toISOString(),
            submittedById: actor.staffUserId,
            submittedByName: actor.staffName,
            submitNote,
            thread: [],
            clarificationAwaitingFrom: null
        });
        if (!setAccountingEntryPendingRequest(reg, entryId, pendingRequest)) {
            alert(t('السند غير موجود.', 'Voucher not found.'));
            return;
        }
        if (!saveAccountingRegistry(reg)) return;
        closeAccountingReceiptDetailModal();
        _accountingUiState.tab = 'pending';
        renderAccountingWorkspace();
        try {
            updateNotificationsNavBadge();
            refreshNotificationsIfVisible();
        } catch (_eN) {}
        alert(
            t(
                'تم إرسال طلب الحذف وبانتظار اعتماد مدير الحسابات.',
                'Delete request submitted and awaiting accounting manager approval.'
            )
        );
    }

    function fillManualEntryFormFromEntry(entry) {
        if (!entry) return;
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = toStr(val);
        };
        set('manualEntryKind', entry.type || 'income');
        set('manualEntryAmount', entry.amount);
        set('manualEntryDate', (entry.dueDate || '').slice(0, 10));
        ensureManualEntrySelectValue(
            'manualEntryCoa',
            entry.coaAccountId,
            entry.coaAccountId ? coaAccountLabel(coaAccountById(entry.coaAccountId)) : ''
        );
        const coaEl = document.getElementById('manualEntryCoa');
        if (coaEl && entry.coaAccountId) coaEl.dataset.userPicked = '1';
        ensureManualEntrySelectValue(
            'manualEntryBankAccount',
            entry.bankAccountId,
            entry.bankAccountId ? bankAccountLabel(getBankAccountById(entry.bankAccountId)) : ''
        );
        set('manualEntryTitle', entry.title);
        set('manualEntryRefNo', entry.referenceNo);
        set('manualEntryVoucherNo', entry.voucherNo);
        _manualEntryPartyState.partyName = toStr(entry.partyName);
        _manualEntryPartyState.building = toStr(entry.building);
        _manualEntryPartyState.unit = toStr(entry.unit);
        const abRow = resolveManualEntryAddressBookRow(entry);
        if (abRow) bindManualEntryAddressBookRow(abRow);
        else {
            const abSearch = document.getElementById('manualEntryAbSearch');
            if (abSearch) abSearch.value = toStr(entry.partyName);
        }
        const allocs = (entry.paymentAllocations || []).filter((a) => (parseFloat(a.amount) || 0) > 0);
        loadManualEntryReceivablePool(entry.partyName, abRow);
        _manualEntryAllocState.items = [];
        allocs.forEach((a) => {
            const poolRow = (_manualEntryAllocState.pool || []).find((p) => p.kind === a.kind && p.id === a.id);
            if (poolRow) {
                _manualEntryAllocState.items.push({ ...poolRow, allocate: parseFloat(a.amount) || 0 });
            } else {
                _manualEntryAllocState.items.push({
                    kind: a.kind,
                    id: a.id,
                    ref: a.ref,
                    label:
                        a.kind === 'cheque'
                            ? `${t('شيك', 'Cheque')} ${a.ref || ''}`
                            : `${t('فاتورة', 'Invoice')} ${a.ref || ''}`,
                    issueDate: '',
                    dueDate: '',
                    amount: parseFloat(a.amount) || 0,
                    outstanding: parseFloat(a.amount) || 0,
                    allocate: parseFloat(a.amount) || 0,
                    building: a.building,
                    unit: a.unit,
                    unitKey: accountingUnitKey(a.building, a.unit),
                    reference: ''
                });
            }
        });
        _manualEntryAllocState.mode = _manualEntryAllocState.items.length ? 'link' : 'note';
        refreshManualEntryAllocationPanel();
        set('manualEntryPayNote', entry.paymentNote);
        const saveBtn = document.getElementById('manualEntrySaveBtn');
        if (saveBtn) saveBtn.textContent = getManualEntrySaveButtonLabel();
    }

    function editAccountingManualEntry(entryId) {
        if (!assertPermissionOrAlert('manage_accounting', 'لا تملك صلاحية المحاسبة.', 'No accounting permission.')) return;
        const reg = loadAccountingRegistry();
        const entry = reg.entries.find((e) => e.id === entryId);
        if (!canEditAccountingManualEntry(entry)) {
            alert(t('لا يمكن تعديل هذا السند.', 'This voucher cannot be edited.'));
            return;
        }
        _manualEntryEditEntryId = entryId;
        _manualEntryEditMode = 'pending';
        openAccountingManualEntryModal(entry.type === 'expense' ? 'expense' : 'income');
        fillManualEntryFormFromEntry(entry);
    }

    function requestEditAccountingManualEntry(entryId) {
        if (!assertPermissionOrAlert('manage_accounting', 'لا تملك صلاحية المحاسبة.', 'No accounting permission.')) return;
        const reg = loadAccountingRegistry();
        const entry = reg.entries.find((e) => e.id === entryId);
        if (!canRequestAccountingManualEntryChange(entry)) {
            alert(t('لا يمكن إرسال طلب تعديل لهذا السند.', 'Cannot submit an edit request for this voucher.'));
            return;
        }
        _manualEntryEditEntryId = entryId;
        _manualEntryEditMode = 'revision';
        openAccountingManualEntryModal(entry.type === 'expense' ? 'expense' : 'income');
        fillManualEntryFormFromEntry(entry);
    }

    function accountingLedgerRowMatchesFilters(row) {
        if (row.source === 'entry') return accountingEntryMatchesFilters(row.data);
        if (row.source === 'cheque') {
            const ch = row.data;
            const tenantFilter = toStr(_accountingUiState.tenant).trim();
            if (tenantFilter && !toStr(ch.tenant).toLowerCase().includes(tenantFilter.toLowerCase())) return false;
            return accountingFilterRow(ch) && accountingChequeMatchesFilters(ch);
        }
        return true;
    }

    function accountingChequeMatchesFilters(c) {
        const st = _accountingUiState;
        if (toStr(st.chequeStatus) && toStr(c.status) !== toStr(st.chequeStatus)) return false;
        if (toStr(st.tenant) && !toStr(c.tenant).toLowerCase().includes(toStr(st.tenant).toLowerCase())) return false;
        if (toStr(st.agreementNo) && !toStr(c.agreementNo).toLowerCase().includes(toStr(st.agreementNo).toLowerCase())) return false;
        const due = toStr(c.dueDate);
        if (toStr(st.dueMonth) && due) {
            const parts = due.split('-');
            const mm = parts[1] || '';
            const yy = parts[0] || '';
            const dm = toStr(st.dueMonth);
            if (dm.length === 7 && due.slice(0, 7) !== dm) return false;
            if (dm.length <= 2 && mm !== dm.padStart(2, '0')) return false;
            if (dm.length === 4 && yy !== dm) return false;
        }
        if (toStr(st.dueDay) && due && !due.endsWith(`-${toStr(st.dueDay).padStart(2, '0')}`) && due !== toStr(st.dueDay)) {
            if (due.slice(8, 10) !== toStr(st.dueDay).padStart(2, '0')) return false;
        }
        if (toStr(st.dueDateFrom) && due && due < toStr(st.dueDateFrom)) return false;
        if (toStr(st.dueDateTo) && due && due > toStr(st.dueDateTo)) return false;
        if (toStr(st.bucket)) {
            const b = accountingChequeBucket(c);
            if (toStr(st.bucket) !== b) return false;
        }
        return true;
    }

    function accountingFilterRow(row) {
        const st = _accountingUiState;
        if (!accountingFilterFieldMatches(row.building, st.building)) return false;
        if (!accountingFilterFieldMatches(row.unit, st.unit)) return false;
        if (!accountingMatchesSearch(row, st.search)) return false;
        return true;
    }

    function buildAccountingPrintTableRows(cheques) {
        return cheques
            .map((c, i) => {
                const overdue = isAccountingChequeOverdue(c);
                const lastAct = Array.isArray(c.actions) && c.actions.length ? c.actions[c.actions.length - 1] : null;
                return `<tr>
                    <td>${i + 1}</td>
                    <td>${escHtml(c.building)}</td>
                    <td>${escHtml(c.unit)}</td>
                    <td>${escHtml(c.tenant || '—')}</td>
                    <td>${escHtml(c.chequeNo || '—')}</td>
                    <td>${escHtml(c.dueDate || '—')}</td>
                    <td>${escHtml(summaryAmtOm(c.amount))}</td>
                    <td>${escHtml(accountingChequeStatusLabel(c.status))}${overdue ? ' (' + t('متأخر', 'Overdue') + ')' : ''}</td>
                    <td>${escHtml(lastAct ? formatAccountingDisplayDate(lastAct.actionDate) : '—')}</td>
                    <td>${escHtml(lastAct ? accountingActionTypeLabel(lastAct.actionType) : '—')}</td>
                </tr>`;
            })
            .join('');
    }

    function printAccountingChequeMovementReport(chequeId) {
        const reg = loadAccountingRegistry();
        const ch = reg.cheques.find((c) => c.id === chequeId);
        if (!ch) return;
        const acts = Array.isArray(ch.actions) ? ch.actions : [];
        const body = `
            <div class="section-header property-section-h">${t('كشف حركة شيك / Cheque movement statement', 'Cheque movement statement / كشف حركة شيك')}</div>
            <p class="property-report-meta">${escHtml(ch.building)} — ${t('وحدة', 'Unit')} ${escHtml(ch.unit)} · ${t('مستأجر', 'Tenant')}: ${escHtml(ch.tenant || '—')} · ${t('شيك', 'Cheque')}: ${escHtml(ch.chequeNo || '—')}</p>
            <p class="property-report-meta">${t('الاستحقاق', 'Due')}: ${escHtml(ch.dueDate || '—')} · ${t('المبلغ', 'Amount')}: ${escHtml(summaryAmtOm(ch.amount))} · ${t('الحالة', 'Status')}: ${escHtml(accountingChequeStatusLabel(ch.status))}</p>
            <table class="info-table property-report-table print-zebra">
                <thead><tr><th>#</th><th>${t('تاريخ الإجراء', 'Action date')}</th><th>${t('النوع', 'Type')}</th><th>${t('ما تم', 'Done')}</th><th>${t('السبب', 'Reason')}</th><th>${t('من تاريخ', 'From date')}</th><th>${t('إلى تاريخ', 'To date')}</th><th>${t('الموظف', 'Staff')}</th></tr></thead>
                <tbody>${acts.length ? acts.map((a, i) => {
                    const bankLbl = a.bankAccountId ? bankAccountLabel(getBankAccountById(a.bankAccountId)) : '';
                    const extra = [
                        bankLbl ? `${t('حساب', 'Account')}: ${bankLbl}` : '',
                        a.penaltyAmount != null && parseFloat(a.penaltyAmount) > 0 ? `${t('غرامة', 'Penalty')}: ${summaryAmtOm(a.penaltyAmount)}` : '',
                        a.cashAmount != null && parseFloat(a.cashAmount) > 0 ? `${t('نقداً', 'Cash')}: ${summaryAmtOm(a.cashAmount)}` : '',
                        a.invoiceNo ? `${t('فاتورة', 'Invoice')}: ${a.invoiceNo}` : ''
                    ].filter(Boolean).join(' · ');
                    const done = [a.actionNote, extra].filter(Boolean).join(' — ') || '—';
                    return `<tr>
                    <td>${i + 1}</td>
                    <td>${escHtml(formatAccountingDisplayDate(a.actionDate || a.at))}</td>
                    <td>${escHtml(accountingActionTypeLabel(a.actionType))}</td>
                    <td>${escHtml(done)}</td>
                    <td>${escHtml(a.reason || '—')}</td>
                    <td>${escHtml(a.previousDueDate || '—')}</td>
                    <td>${escHtml(a.newDueDate || '—')}</td>
                    <td>${escHtml(a.actorName || '—')}</td>
                </tr>`;
                }).join('') : `<tr><td colspan="8">${t('لا توجد حركات', 'No actions')}</td></tr>`}</tbody>
            </table>`;
        printWithSiteStandard(t('كشف حركة شيك / Cheque movement', 'Cheque movement / كشف حركة شيك'), body);
    }

    function printAccountingAllChequesMovementReport() {
        const reg = loadAccountingRegistry();
        const rows = reg.cheques.filter(accountingFilterRow).filter(accountingChequeMatchesFilters);
        const body = `
            <div class="section-header property-section-h">${t('كشف حركة الشيكات / All cheques movement', 'All cheques movement / كشف الشيكات')}</div>
            <p class="property-report-meta">${t('عدد الشيكات', 'Cheques')}: ${rows.length}</p>
            <table class="info-table property-report-table print-zebra">
                <thead><tr><th>#</th><th>${t('مبنى', 'Building')}</th><th>${t('وحدة', 'Unit')}</th><th>${t('مستأجر', 'Tenant')}</th><th>${t('شيك', 'Cheque')}</th><th>${t('استحقاق', 'Due')}</th><th>${t('مبلغ', 'Amount')}</th><th>${t('حالة', 'Status')}</th><th>${t('آخر إجراء', 'Last action')}</th><th>${t('نوع الإجراء', 'Action type')}</th></tr></thead>
                <tbody>${buildAccountingPrintTableRows(rows) || `<tr><td colspan="10">${t('لا توجد بيانات', 'No data')}</td></tr>`}</tbody>
            </table>`;
        printWithSiteStandard(t('كشف حركة الشيكات / Cheques movement', 'Cheques movement / كشف الشيكات'), body, { orientation: 'landscape' });
    }

    function printAccountingDueChequesReport() {
        const month = toStr(document.getElementById('acctPrintDueMonth')?.value || _accountingUiState.dueMonth);
        const day = toStr(document.getElementById('acctPrintDueDay')?.value || _accountingUiState.dueDay);
        const reg = loadAccountingRegistry();
        let rows = reg.cheques.filter(accountingFilterRow);
        rows = rows.filter((c) => {
            const due = toStr(c.dueDate);
            if (!due) return false;
            if (month && month.length === 7 && due.slice(0, 7) !== month) return false;
            if (day && day.length === 10 && due !== day) return false;
            const st = toStr(c.status);
            return st === 'pending' || st === 'deferred' || st === 'paid_partial';
        });
        const label =
            day && day.length === 10
                ? `${t('يوم', 'Day')} ${day}`
                : month
                  ? `${t('شهر', 'Month')} ${month}`
                  : t('الفترة الحالية', 'Current period');
        const body = `
            <div class="section-header property-section-h">${t('كشف الشيكات المستحقة / Due cheques report', 'Due cheques report / كشف المستحقات')}</div>
            <p class="property-report-meta">${label} · ${t('عدد الشيكات', 'Cheques')}: ${rows.length}</p>
            <table class="info-table property-report-table print-zebra">
                <thead><tr><th>#</th><th>${t('مبنى', 'Building')}</th><th>${t('وحدة', 'Unit')}</th><th>${t('مستأجر', 'Tenant')}</th><th>${t('شيك', 'Cheque')}</th><th>${t('استحقاق', 'Due')}</th><th>${t('مبلغ', 'Amount')}</th><th>${t('حالة', 'Status')}</th></tr></thead>
                <tbody>${rows.map((c, i) => `<tr><td>${i + 1}</td><td>${escHtml(c.building)}</td><td>${escHtml(c.unit)}</td><td>${escHtml(c.tenant || '—')}</td><td>${escHtml(c.chequeNo || '—')}</td><td>${escHtml(c.dueDate || '—')}</td><td>${escHtml(summaryAmtOm(c.amount))}</td><td>${escHtml(accountingChequeStatusLabel(c.status))}</td></tr>`).join('') || `<tr><td colspan="8">${t('لا توجد بيانات', 'No data')}</td></tr>`}</tbody>
            </table>`;
        printWithSiteStandard(t('كشف الشيكات المستحقة / Due cheques', 'Due cheques / كشف المستحقات'), body, { orientation: 'landscape' });
        closeAccountingPrintMenu();
    }

    function printAccountingUnitAccountReport(building, unit, tenantKey) {
        const b = toStr(building);
        const u = toStr(unit);
        const unitKey = accountingUnitKey(b, u);
        const data = accountingRowsForTenant(unitKey, tenantKey || '');
        const tenantLabel = tenantKey
            ? getAccountingTenantsForUnit(b, u).find((x) => x.tenantKey === tenantKey)
            : null;
        const body = `
            <div class="section-header property-section-h">${t('كشف حساب الوحدة / Unit account statement', 'Unit account statement / كشف حساب الوحدة')}</div>
            <p class="property-report-meta">${escHtml(b)} — ${t('وحدة', 'Unit')} ${escHtml(u)}${tenantLabel ? ` · ${escHtml(tenantLabel.tenant)} (${escHtml(tenantLabel.agreementNo || '—')})` : ''}</p>
            <h4 style="margin:12px 0 6px">${t('الشيكات / Cheques', 'Cheques / الشيكات')}</h4>
            <table class="info-table property-report-table print-zebra"><thead><tr><th>#</th><th>${t('شيك', 'Cheque')}</th><th>${t('استحقاق', 'Due')}</th><th>${t('مبلغ', 'Amount')}</th><th>${t('حالة', 'Status')}</th></tr></thead>
            <tbody>${data.cheques.map((c, i) => `<tr><td>${i + 1}</td><td>${escHtml(c.chequeNo || '—')}</td><td>${escHtml(c.dueDate || '—')}</td><td>${escHtml(summaryAmtOm(c.amount))}</td><td>${escHtml(accountingChequeStatusLabel(c.status))}</td></tr>`).join('') || `<tr><td colspan="5">—</td></tr>`}</tbody></table>
            <h4 style="margin:12px 0 6px">${t('الضمان / Deposits', 'Deposits / الضمان')}</h4>
            <table class="info-table property-report-table print-zebra"><thead><tr><th>#</th><th>${t('النوع', 'Type')}</th><th>${t('مبلغ', 'Amount')}</th><th>${t('مرجع', 'Ref')}</th></tr></thead>
            <tbody>${data.deposits.map((d, i) => `<tr><td>${i + 1}</td><td>${escHtml(d.type)}</td><td>${escHtml(summaryAmtOm(d.amount))}</td><td>${escHtml(d.reference || '—')}</td></tr>`).join('') || `<tr><td colspan="4">—</td></tr>`}</tbody></table>`;
        printWithSiteStandard(t('كشف حساب الوحدة / Unit account', 'Unit account / كشف حساب'), body);
    }

    function toggleAccountingPrintMenu(ev) {
        ev?.stopPropagation?.();
        const panel = document.getElementById('accountingPrintPanel');
        if (!panel) return;
        panel.hidden = !panel.hidden;
    }

    function closeAccountingPrintMenu() {
        const panel = document.getElementById('accountingPrintPanel');
        if (panel) panel.hidden = true;
    }

    function getAccountingReportDateFilters() {
        return {
            from: toStr(_accountingUiState.dueDateFrom).trim(),
            to: toStr(_accountingUiState.dueDateTo).trim()
        };
    }

    function accountingReportDateInRange(dateStr, from, to) {
        const d = toStr(dateStr).slice(0, 10);
        if (!d) return true;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
    }

    const ACCOUNTING_JOURNAL_ENGINE_VERSION = 3;

    function accountingJournalStatusLabel(status) {
        const map = {
            posted: t('مرحّل', 'Posted'),
            draft: t('مسودة', 'Draft'),
            reversed: t('ملغي', 'Reversed')
        };
        return map[toStr(status)] || toStr(status) || '—';
    }

    function normalizeAccountingJournalLine(ln, idx) {
        const d = parseFloat(ln?.debit) || 0;
        const c = parseFloat(ln?.credit) || 0;
        return {
            id: toStr(ln?.id) || `jl_${idx}`,
            coaAccountId: resolveCoaAccountId(ln?.coaAccountId),
            debit: parseFloat(d.toFixed(3)),
            credit: parseFloat(c.toFixed(3)),
            memo: toStr(ln?.memo || ln?.note),
            costCenterId: toStr(ln?.costCenterId || ln?.unit),
            projectId: toStr(ln?.projectId || ln?.project),
            lineOrder: idx + 1
        };
    }

    function validateAccountingJournalLines(lines) {
        const errors = [];
        let totalDebit = 0;
        let totalCredit = 0;
        (lines || []).forEach((ln, i) => {
            const d = parseFloat(ln.debit) || 0;
            const c = parseFloat(ln.credit) || 0;
            if (d > 0 && c > 0) errors.push(t(`السطر ${i + 1}: لا يجوز أن يكون مديناً ودائناً معاً`, `Line ${i + 1}: cannot be both debit and credit`));
            if (d <= 0 && c <= 0) errors.push(t(`السطر ${i + 1}: أدخل مبلغ مدين أو دائن`, `Line ${i + 1}: enter debit or credit`));
            const coaId = resolveCoaAccountId(ln.coaAccountId);
            if (!coaId || !coaAccountById(coaId)) errors.push(t(`السطر ${i + 1}: حساب غير صالح`, `Line ${i + 1}: invalid account`));
            else if (!isCoaPostable(coaId)) errors.push(t(`السطر ${i + 1}: الحساب غير قابل للترحيل`, `Line ${i + 1}: account is not postable`));
            totalDebit += d;
            totalCredit += c;
        });
        const balanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;
        if (!balanced) errors.push(t('مجموع المدين يجب أن يساوي مجموع الدائن', 'Total debit must equal total credit'));
        return {
            ok: balanced && !errors.length,
            totalDebit: parseFloat(totalDebit.toFixed(3)),
            totalCredit: parseFloat(totalCredit.toFixed(3)),
            errors
        };
    }

    function resolveAccountingEntryCounterCoa(e, reg) {
        const bankId = toStr(e.bankAccountId);
        if (bankId) {
            const ba = (reg.bankAccounts || []).find((b) => b.id === bankId);
            if (ba) {
                const coaId = ba.coaAccountId || ensureCoaForBankAccount(ba, reg);
                if (coaId) return coaId;
            }
        }
        return resolveCoaAccountId(e.counterCoaAccountId || 'coa_111');
    }

    function buildJournalLinesFromAccountingEntry(e, reg) {
        const amt = parseFloat(e.amount) || 0;
        if (amt <= 0) return [];
        if (Array.isArray(e.journalLines) && e.journalLines.length) {
            return e.journalLines.map((ln, i) => normalizeAccountingJournalLine(ln, i));
        }
        const regUse = reg || loadAccountingRegistry();
        const status = toStr(e.status);
        const entryType = toStr(e.type);
        const mainCoa = resolveCoaAccountId(e.coaAccountId || (entryType === 'income' ? 'coa_411' : 'coa_526'));
        const counterCoa = resolveAccountingEntryCounterCoa(e, regUse);
        const partyCoa = resolvePartyCoaForEntry(e, regUse);
        let lineIdx = 0;
        const pushLine = (spec) => normalizeAccountingJournalLine(spec, lineIdx++);

        if (status === 'invoiced' && entryType === 'income' && partyCoa) {
            return [
                pushLine({ coaAccountId: partyCoa, debit: amt, credit: 0, memo: e.title }),
                pushLine({ coaAccountId: mainCoa, debit: 0, credit: amt, memo: e.title })
            ];
        }

        if (entryType === 'income') {
            const allocs = (e.paymentAllocations || []).filter((a) => (parseFloat(a.amount) || 0) > 0);
            const allocTotal = allocs.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
            const unallocated = Math.max(0, amt - allocTotal);
            const lines = [pushLine({ coaAccountId: counterCoa, debit: amt, credit: 0, memo: e.title })];

            if (e.collectionOnly && partyCoa) {
                lines.push(pushLine({ coaAccountId: partyCoa, debit: 0, credit: amt, memo: e.title }));
                return lines;
            }
            if (allocTotal > 0) {
                lines.push(pushLine({ coaAccountId: mainCoa, debit: 0, credit: allocTotal, memo: e.title }));
                if (unallocated > 0 && partyCoa) {
                    lines.push(pushLine({
                        coaAccountId: partyCoa,
                        debit: 0,
                        credit: unallocated,
                        memo: t('دفعة مقدمة / غير موزّعة', 'Prepayment / unallocated')
                    }));
                }
                return lines;
            }
            if (partyCoa && e.settleReceivable) {
                lines.push(pushLine({ coaAccountId: partyCoa, debit: 0, credit: amt, memo: e.title }));
                return lines;
            }
            lines.push(pushLine({ coaAccountId: mainCoa, debit: 0, credit: amt, memo: e.title }));
            return lines;
        }

        if (entryType === 'expense') {
            if (partyCoa && e.settlePayable) {
                return [
                    pushLine({ coaAccountId: partyCoa, debit: amt, credit: 0, memo: e.title }),
                    pushLine({ coaAccountId: counterCoa, debit: 0, credit: amt, memo: e.title })
                ];
            }
            return [
                pushLine({ coaAccountId: mainCoa, debit: amt, credit: 0, memo: e.title }),
                pushLine({ coaAccountId: counterCoa, debit: 0, credit: amt, memo: e.title })
            ];
        }

        return [];
    }

    function buildJournalFromAccountingEntry(e, reg) {
        if (!e || !['confirmed', 'invoiced'].includes(toStr(e.status))) return null;
        const lines = buildJournalLinesFromAccountingEntry(e, reg);
        const check = validateAccountingJournalLines(lines);
        if (!check.ok) return null;
        const actor = e.approvedByName || e.createdByName || '';
        return {
            id: `je_entry_${e.id}`,
            entryNo: toStr(e.voucherNo) || e.id,
            date: toStr(e.dueDate || e.approvedAt || e.createdAt).slice(0, 10),
            description: toStr(e.title),
            referenceType: 'entry',
            referenceId: e.id,
            status: 'posted',
            lines,
            partyName: toStr(e.partyName),
            building: toStr(e.building),
            unit: toStr(e.unit),
            project: toStr(e.agreementNo || e.projectId),
            costCenterId: toStr(e.unit),
            totalDebit: check.totalDebit,
            totalCredit: check.totalCredit,
            postedAt: e.approvedAt || e.updatedAt || e.createdAt || new Date().toISOString(),
            postedByName: actor,
            createdAt: e.createdAt || new Date().toISOString()
        };
    }

    function buildJournalFromCheque(ch, reg) {
        if (!ch || !isAccountingChequePaidStatus(ch.status)) return null;
        const amt = parseFloat(ch.paidAmount || ch.amount) || 0;
        if (amt <= 0) return null;
        if (findParentReceiptAllocationForChequeExtended(ch.id, reg)) return null;
        const depositAction = (ch.actions || []).find((a) => a.actionType === 'bank_deposit' && toStr(a.bankAccountId));
        const bankIdFromAction = depositAction ? toStr(depositAction.bankAccountId) : '';
        const bankId = bankIdFromAction || toStr(ch.receiptBankAccountId);
        const bankCoa = bankId ? resolveBankCoaAccountId(bankId, reg) : 'coa_111';
        const revenueCoa = resolveCoaAccountId(ch.sourceType === 'vat' ? 'coa_413' : 'coa_411');
        const lines = [
            normalizeAccountingJournalLine({ coaAccountId: bankCoa, debit: amt, credit: 0, memo: t('تحصيل شيك', 'Cheque collection') }, 0),
            normalizeAccountingJournalLine({ coaAccountId: revenueCoa, debit: 0, credit: amt, memo: t('إيراد تحصيل', 'Collection revenue') }, 1)
        ];
        const check = validateAccountingJournalLines(lines);
        if (!check.ok) return null;
        return {
            id: `je_cheque_${ch.id}`,
            entryNo: toStr(ch.chequeNo) || ch.id,
            date: toStr(ch.lastActionDate || ch.dueDate).slice(0, 10),
            description: `${t('تحصيل شيك', 'Cheque collection')} — ${toStr(ch.tenant)}`,
            referenceType: 'cheque',
            referenceId: ch.id,
            status: 'posted',
            lines,
            partyName: toStr(ch.tenant),
            building: toStr(ch.building),
            unit: toStr(ch.unit),
            project: toStr(ch.agreementNo),
            costCenterId: toStr(ch.unit),
            totalDebit: check.totalDebit,
            totalCredit: check.totalCredit,
            postedAt: ch.lastActionDate || ch.updatedAt || new Date().toISOString(),
            postedByName: '',
            createdAt: ch.createdAt || new Date().toISOString()
        };
    }

    function buildJournalFromDepositReceipt(dep, reg) {
        if (!dep || !isAccountingDepositHeldStatus(dep.status)) return null;
        const bankId = toStr(dep.receiptBankAccountId);
        if (!bankId) return null;
        const bankCoa = resolveBankCoaAccountId(bankId, reg);
        if (!bankCoa) return null;
        const amt = parseFloat(dep.amount) || 0;
        if (amt <= 0) return null;
        const liabilityCoa = 'coa_212';
        const typeLbl =
            dep.type === 'security' ? t('ضمان', 'Security') : dep.type === 'insurance' ? t('تأمين', 'Insurance') : t('وديعة', 'Deposit');
        const lines = [
            normalizeAccountingJournalLine({ coaAccountId: bankCoa, debit: amt, credit: 0, memo: typeLbl }, 0),
            normalizeAccountingJournalLine({ coaAccountId: liabilityCoa, debit: 0, credit: amt, memo: typeLbl }, 1)
        ];
        const check = validateAccountingJournalLines(lines);
        if (!check.ok) return null;
        const actor = dep.receiptApprovedByName || '';
        return {
            id: `je_deposit_${dep.id}`,
            entryNo: toStr(dep.reference) || dep.id,
            date: toStr(dep.receiptApprovedAt || dep.updatedAt).slice(0, 10) || new Date().toISOString().slice(0, 10),
            description: `${t('استلام', 'Receipt')} ${typeLbl} — ${toStr(dep.tenant)}`,
            referenceType: 'deposit',
            referenceId: dep.id,
            status: 'posted',
            lines,
            partyName: toStr(dep.tenant),
            building: toStr(dep.building),
            unit: toStr(dep.unit),
            project: toStr(dep.agreementNo),
            costCenterId: toStr(dep.unit),
            totalDebit: check.totalDebit,
            totalCredit: check.totalCredit,
            postedAt: dep.receiptApprovedAt || dep.updatedAt || new Date().toISOString(),
            postedByName: actor,
            createdAt: dep.receiptApprovedAt || dep.updatedAt || new Date().toISOString()
        };
    }

    function buildJournalFromBankTransfer(bt, reg) {
        if (!bt) return null;
        const amt = parseFloat(bt.amount) || 0;
        if (amt <= 0) return null;
        const fromCoa = resolveBankCoaAccountId(bt.fromBankAccountId, reg);
        const toCoa = resolveBankCoaAccountId(bt.toBankAccountId, reg);
        if (!fromCoa || !toCoa) return null;
        const lines = [
            normalizeAccountingJournalLine({ coaAccountId: toCoa, debit: amt, credit: 0, memo: toStr(bt.note) || t('تحويل بين حسابات', 'Inter-account transfer') }, 0),
            normalizeAccountingJournalLine({ coaAccountId: fromCoa, debit: 0, credit: amt, memo: toStr(bt.note) || t('تحويل بين حسابات', 'Inter-account transfer') }, 1)
        ];
        const check = validateAccountingJournalLines(lines);
        if (!check.ok) return null;
        return {
            id: `je_xfer_${bt.id}`,
            entryNo: toStr(bt.id).slice(-8),
            date: toStr(bt.date).slice(0, 10) || new Date().toISOString().slice(0, 10),
            description: toStr(bt.note) || t('تحويل بين حسابات بنكية', 'Bank account transfer'),
            referenceType: 'bank_transfer',
            referenceId: bt.id,
            status: 'posted',
            lines,
            totalDebit: check.totalDebit,
            totalCredit: check.totalCredit,
            postedAt: bt.createdAt || new Date().toISOString(),
            postedByName: bt.createdByName || '',
            createdAt: bt.createdAt || new Date().toISOString()
        };
    }

    function buildJournalFromOpeningBalance(ob) {
        if (!ob || !ob.coaAccountId) return null;
        const d = parseFloat(ob.debit) || 0;
        const c = parseFloat(ob.credit) || 0;
        if (d <= 0 && c <= 0) return null;
        const lines = [normalizeAccountingJournalLine({ coaAccountId: ob.coaAccountId, debit: d, credit: c, memo: t('رصيد افتتاحي', 'Opening balance') }, 0)];
        if (d > 0) {
            lines.push(normalizeAccountingJournalLine({ coaAccountId: 'coa_311', debit: 0, credit: d, memo: t('موازنة افتتاحية', 'Opening offset') }, 1));
        } else if (c > 0) {
            lines.push(normalizeAccountingJournalLine({ coaAccountId: 'coa_311', debit: c, credit: 0, memo: t('موازنة افتتاحية', 'Opening offset') }, 1));
        }
        const check = validateAccountingJournalLines(lines);
        if (!check.ok) return null;
        return {
            id: `je_open_${ob.id || ob.coaAccountId}`,
            entryNo: toStr(ob.ref || 'OPEN'),
            date: toStr(ob.date || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
            description: t('قيد افتتاحي', 'Opening entry'),
            referenceType: 'opening',
            referenceId: toStr(ob.id || ob.coaAccountId),
            status: 'posted',
            lines,
            totalDebit: check.totalDebit,
            totalCredit: check.totalCredit,
            postedAt: ob.createdAt || new Date().toISOString(),
            postedByName: '',
            createdAt: ob.createdAt || new Date().toISOString()
        };
    }

    function rebuildAccountingJournalLedger(reg) {
        if (!reg) return false;
        const journals = [];
        (reg.entries || []).forEach((e) => {
            const j = buildJournalFromAccountingEntry(e, reg);
            if (j) journals.push(j);
        });
        (reg.cheques || []).forEach((ch) => {
            const j = buildJournalFromCheque(ch, reg);
            if (j) journals.push(j);
        });
        (reg.deposits || []).forEach((dep) => {
            const j = buildJournalFromDepositReceipt(dep, reg);
            if (j) journals.push(j);
        });
        (reg.bankTransfers || []).forEach((bt) => {
            const j = buildJournalFromBankTransfer(bt, reg);
            if (j) journals.push(j);
        });
        (reg.openingBalances || []).forEach((ob) => {
            const j = buildJournalFromOpeningBalance(ob);
            if (j) journals.push(j);
        });
        reg.journals = journals;
        reg.journalLedgerVersion = ACCOUNTING_JOURNAL_ENGINE_VERSION;
        return true;
    }

    function ensureAccountingJournalLedger(reg, forceRebuild) {
        if (!reg) return reg;
        if (!Array.isArray(reg.journals)) reg.journals = [];
        const needs =
            forceRebuild ||
            reg._journalLedgerDirty ||
            reg.journalLedgerVersion !== ACCOUNTING_JOURNAL_ENGINE_VERSION ||
            !reg.journals.length;
        if (!needs) return reg;
        try {
            rebuildAccountingJournalLedger(reg);
            reg._journalLedgerDirty = false;
        } catch (eJl) {
            console.error('ensureAccountingJournalLedger', eJl);
        }
        return reg;
    }

    function upsertAccountingJournalForReference(reg, journal) {
        if (!reg || !journal) return;
        ensureAccountingJournalLedger(reg, false);
        const idx = (reg.journals || []).findIndex((j) =>
            j.referenceType === journal.referenceType && j.referenceId === journal.referenceId
        );
        if (idx >= 0) reg.journals[idx] = journal;
        else reg.journals.push(journal);
    }

    function removeAccountingJournalForReference(reg, referenceType, referenceId) {
        if (!reg || !Array.isArray(reg.journals)) return;
        reg.journals = reg.journals.filter((j) =>
            !(j.referenceType === referenceType && j.referenceId === referenceId)
        );
    }

    function accountingCoaNormalBalance(section) {
        return ['liability', 'equity', 'revenue'].includes(toStr(section)) ? 'credit' : 'debit';
    }

    function accountingCoaSignedBalance(account, balMap) {
        const id = resolveCoaAccountId(account.id);
        const raw = balMap[id] || { debit: 0, credit: 0 };
        const nb = account.normalBalance || accountingCoaNormalBalance(account.section);
        const val = nb === 'credit' ? (raw.credit - raw.debit) : (raw.debit - raw.credit);
        return parseFloat(val.toFixed(3));
    }

    function collectAccountingJournalMovements(regIn, filtersOpt) {
        const reg = regIn || loadAccountingRegistry();
        ensureAccountingJournalLedger(reg, false);
        const filters = filtersOpt || getAccountingReportDateFilters();
        const lines = [];
        (reg.journals || []).filter((j) => toStr(j.status) === 'posted').forEach((j) => {
            if (!accountingReportDateInRange(j.date, filters.from, filters.to)) return;
            const base = {
                date: j.date,
                party: toStr(j.partyName),
                building: toStr(j.building),
                unit: toStr(j.unit),
                project: toStr(j.project),
                ref: toStr(j.entryNo),
                desc: toStr(j.description),
                entryId: j.referenceId,
                entryType: j.referenceType,
                journalId: j.id,
                status: 'posted'
            };
            (j.lines || []).forEach((ln) => {
                lines.push({
                    ...base,
                    coaAccountId: resolveCoaAccountId(ln.coaAccountId),
                    debit: parseFloat(ln.debit) || 0,
                    credit: parseFloat(ln.credit) || 0,
                    memo: toStr(ln.memo),
                    costCenterId: toStr(ln.costCenterId),
                    projectId: toStr(ln.projectId)
                });
            });
        });
        lines.sort((a, b) => toStr(a.date).localeCompare(toStr(b.date)) || toStr(a.ref).localeCompare(toStr(b.ref)));
        return lines;
    }

    function getAccountingWafeqReportPrintCss() {
        return `
            .acct-wafeq-meta { font-size: 11pt; color: #444; margin: 0 0 12px; text-align: center; line-height: 1.6; }
            .acct-wafeq-report-wrap { margin: 8px 0 16px; }
            .acct-wafeq-table { width: 100%; border-collapse: collapse; font-size: 11pt; margin-bottom: 14px; }
            .acct-wafeq-table th, .acct-wafeq-table td { border: 1px solid #333; padding: 5px 8px; vertical-align: middle; }
            .acct-wafeq-table thead th { background: #ebe4e7; color: #4a1525; font-weight: 700; text-align: center; }
            .acct-wafeq-table .acct-wafeq-amt { text-align: left; direction: ltr; font-family: 'Roboto', sans-serif; white-space: nowrap; }
            .acct-wafeq-table .acct-wafeq-code { text-align: center; width: 72px; font-family: 'Roboto', sans-serif; }
            .acct-wafeq-table .acct-wafeq-name { text-align: right; }
            .acct-wafeq-table .acct-wafeq-cat { text-align: center; font-size: 10pt; color: #444; }
            .acct-wafeq-row--subtotal td { background: #f3ecef; font-weight: 700; }
            .acct-wafeq-row--grand td { background: #e8dce1; font-weight: 800; font-size: 11.5pt; }
            .acct-wafeq-row--section td { background: #faf6f8; font-weight: 600; }
            .acct-wafeq-row--metric td { background: #fff; font-weight: 700; border-top: 2px solid #6b1f35; }
            .acct-wafeq-indent-0 { padding-right: 6px; }
            .acct-wafeq-indent-1 { padding-right: 18px; }
            .acct-wafeq-indent-2 { padding-right: 30px; }
            .acct-wafeq-indent-3 { padding-right: 42px; }
            .acct-wafeq-indent-4 { padding-right: 54px; }
            .acct-wafeq-indent-5 { padding-right: 66px; }
            html[dir="ltr"] .acct-wafeq-name.acct-wafeq-indent-0 { padding-right: 0; padding-left: 6px; text-align: left; }
            html[dir="ltr"] .acct-wafeq-name.acct-wafeq-indent-1 { padding-right: 0; padding-left: 18px; text-align: left; }
            html[dir="ltr"] .acct-wafeq-name.acct-wafeq-indent-2 { padding-right: 0; padding-left: 30px; text-align: left; }
            html[dir="ltr"] .acct-wafeq-name.acct-wafeq-indent-3 { padding-right: 0; padding-left: 42px; text-align: left; }
            html[dir="ltr"] .acct-wafeq-name.acct-wafeq-indent-4 { padding-right: 0; padding-left: 54px; text-align: left; }
            html[dir="ltr"] .acct-wafeq-name.acct-wafeq-indent-5 { padding-right: 0; padding-left: 66px; text-align: left; }
        `;
    }

    function printAccountingWafeqReport(title, bodyHtml, opts) {
        const options = opts || {};
        printWithSiteStandard(title, bodyHtml, {
            ...options,
            extraStyles: getAccountingWafeqReportPrintCss() + (options.extraStyles || '')
        });
    }

    function accountingReportMetaLine(filters, extras) {
        const parts = [];
        if (extras && extras.asOf) {
            parts.push(`${t('كما في تاريخ', 'As of')}: ${extras.asOf}`);
        } else {
            if (filters.from) parts.push(`${t('من', 'From')}: ${filters.from}`);
            if (filters.to) parts.push(`${t('إلى', 'To')}: ${filters.to}`);
            if (!filters.from && !filters.to) {
                parts.push(`${t('للفترة المنتهية في', 'For the period ended')}: ${new Date().toISOString().slice(0, 10)}`);
            }
        }
        return `<p class="acct-wafeq-meta property-report-meta">${escHtml(parts.join(' · '))}</p>`;
    }

    function accountingReportTableWrap(headHtml, bodyHtml) {
        return `<table class="info-table property-report-table print-zebra"><thead>${headHtml}</thead><tbody>${bodyHtml}</tbody></table>`;
    }

    function accountingWafeqTableWrap(headHtml, bodyHtml) {
        return `<div class="acct-wafeq-report-wrap"><table class="acct-wafeq-table"><thead>${headHtml}</thead><tbody>${bodyHtml}</tbody></table></div>`;
    }

    function accountingWafeqAmtCell(amt, blankZero) {
        const n = parseFloat(amt) || 0;
        if (blankZero && Math.abs(n) < 0.0005) return '<td class="acct-wafeq-amt">—</td>';
        return `<td class="acct-wafeq-amt">${escHtml(summaryAmtOm(n))}</td>`;
    }

    function accountingWafeqDrCrCells(raw, blankZero) {
        const d = parseFloat((raw?.debit || 0).toFixed(3));
        const c = parseFloat((raw?.credit || 0).toFixed(3));
        const dCell = d ? escHtml(summaryAmtOm(d)) : (blankZero ? '—' : '0.000');
        const cCell = c ? escHtml(summaryAmtOm(c)) : (blankZero ? '—' : '0.000');
        return `<td class="acct-wafeq-amt">${dCell}</td><td class="acct-wafeq-amt">${cCell}</td>`;
    }

    function accountingCoaSectionLabel(section) {
        const map = {
            asset: t('أصل', 'Asset'),
            liability: t('التزام', 'Liability'),
            equity: t('حقوق ملكية', 'Equity'),
            revenue: t('إيراد', 'Revenue'),
            expense: t('مصروف', 'Expense')
        };
        return map[toStr(section)] || coaAccountTypeLabel({ section, type: section });
    }

    function accountingCoaSubcategoryLabel(account) {
        const parent = coaAccountById(account?.parentId);
        return parent ? coaAccountLabel(parent) : '—';
    }

    function getCoaSortedChildren(parentId) {
        const pid = resolveCoaAccountId(parentId);
        return getChartOfAccounts()
            .filter((a) => resolveCoaAccountId(a.parentId) === pid)
            .sort((a, b) => toStr(a.code).localeCompare(toStr(b.code), undefined, { numeric: true }));
    }

    function rollupCoaSignedBalance(accountId, balMap, cache) {
        const id = resolveCoaAccountId(accountId);
        if (cache[id] !== undefined) return cache[id];
        const acct = coaAccountById(id);
        if (!acct) {
            cache[id] = 0;
            return 0;
        }
        let sum = 0;
        if (acct.leaf || acct.allowPost) sum += accountingCoaSignedBalance(acct, balMap);
        getCoaSortedChildren(id).forEach((child) => {
            sum += rollupCoaSignedBalance(child.id, balMap, cache);
        });
        cache[id] = parseFloat(sum.toFixed(3));
        return cache[id];
    }

    function buildCoaBalanceMapFromMovements(reg, filters, dimension) {
        const movements = collectAccountingJournalMovements(reg, filters);
        const balMap = {};
        const add = (coaId, debit, credit) => {
            const id = resolveCoaAccountId(coaId);
            if (!balMap[id]) balMap[id] = { debit: 0, credit: 0 };
            balMap[id].debit += parseFloat(debit) || 0;
            balMap[id].credit += parseFloat(credit) || 0;
        };
        movements.forEach((ln) => {
            if (dimension === 'branch') {
                const branch = toStr(_accountingUiState.reportBranch);
                if (branch && toStr(ln.building) !== branch) return;
            }
            if (dimension === 'cost_center') {
                const cc = toStr(_accountingUiState.reportCostCenter);
                if (cc && toStr(ln.unit) !== cc) return;
            }
            if (dimension === 'project') {
                const proj = toStr(_accountingUiState.reportProject);
                if (proj && toStr(ln.project) !== proj) return;
            }
            add(ln.coaAccountId, ln.debit, ln.credit);
        });
        return balMap;
    }

    function buildCoaClosingBalanceMap(asOfDate, dimension) {
        const asOf = asOfDate || new Date().toISOString().slice(0, 10);
        const today = new Date().toISOString().slice(0, 10);
        if (!dimension && (!asOfDate || asOf >= today)) {
            return computeCoaAccountBalances();
        }
        const reg = loadAccountingRegistry();
        const filters = { from: '', to: asOf };
        return buildCoaBalanceMapFromMovements(reg, filters, dimension);
    }

    function buildCoaOpeningAndPeriodMaps(filters, dimension) {
        const reg = loadAccountingRegistry();
        const periodMap = buildCoaBalanceMapFromMovements(reg, filters, dimension);
        const closingMap = buildCoaClosingBalanceMap(filters.to || new Date().toISOString().slice(0, 10), dimension);
        const openingMap = {};
        const allIds = new Set([...Object.keys(periodMap), ...Object.keys(closingMap)]);
        allIds.forEach((id) => {
            const p = periodMap[id] || { debit: 0, credit: 0 };
            const c = closingMap[id] || { debit: 0, credit: 0 };
            openingMap[id] = {
                debit: parseFloat(Math.max(0, c.debit - p.debit).toFixed(3)),
                credit: parseFloat(Math.max(0, c.credit - p.credit).toFixed(3))
            };
        });
        return { periodMap, closingMap, openingMap };
    }

    function wafeqDisplayAmount(account, signed, opts) {
        const o = opts || {};
        if (o.positiveExpenses && account && account.section === 'expense') return Math.abs(signed);
        if (o.positiveRevenue && account && account.section === 'revenue') return Math.abs(signed);
        return signed;
    }

    function wafeqIndentClass(depth) {
        return `acct-wafeq-indent-${Math.min(Math.max(depth, 0), 5)}`;
    }

    function buildWafeqCoaHierarchyRows(rootIds, balMap, opts) {
        const o = opts || {};
        const hideZero = o.hideZero !== false;
        const cache = {};
        const rows = [];
        const showCode = o.showCode !== false;

        function walk(accountId, depth) {
            const acct = coaAccountById(accountId);
            if (!acct) return 0;
            const children = getCoaSortedChildren(accountId);
            const rolled = rollupCoaSignedBalance(accountId, balMap, cache);
            const displayAmt = wafeqDisplayAmount(acct, rolled, o);

            if (children.length) {
                if (o.showParents !== false && (!hideZero || rolled)) {
                    rows.push(`<tr class="acct-wafeq-row--section">
                        ${showCode ? `<td class="acct-wafeq-code">${escHtml(acct.code)}</td>` : ''}
                        <td class="acct-wafeq-name ${wafeqIndentClass(depth)}">${escHtml(coaAccountLabel(acct))}</td>
                        ${o.extraCols || ''}
                        ${accountingWafeqAmtCell(displayAmt, hideZero)}
                    </tr>`);
                }
                children.forEach((child) => walk(child.id, depth + (o.showParents === false ? 0 : 1)));
                if (o.subtotalLabels && o.subtotalLabels[accountId]) {
                    if (!hideZero || rolled) {
                        rows.push(`<tr class="acct-wafeq-row--subtotal">
                            ${showCode ? '<td class="acct-wafeq-code">—</td>' : ''}
                            <td class="acct-wafeq-name ${wafeqIndentClass(depth)}">${escHtml(o.subtotalLabels[accountId])}</td>
                            ${o.extraColsBlank || ''}
                            ${accountingWafeqAmtCell(displayAmt, hideZero)}
                        </tr>`);
                    }
                }
                return rolled;
            }
            if (!hideZero || rolled) {
                rows.push(`<tr>
                    ${showCode ? `<td class="acct-wafeq-code">${escHtml(acct.code)}</td>` : ''}
                    <td class="acct-wafeq-name ${wafeqIndentClass(depth)}">${escHtml(coaAccountLabel(acct))}</td>
                    ${o.extraCols || ''}
                    ${accountingWafeqAmtCell(displayAmt, hideZero)}
                </tr>`);
            }
            return rolled;
        }

        let sectionTotal = 0;
        rootIds.forEach((rid) => { sectionTotal += walk(rid, 0); });
        return { html: rows.join(''), total: parseFloat(sectionTotal.toFixed(3)) };
    }

    function buildWafeqMetricRow(label, amount, colSpan, rowClass) {
        const cls = rowClass || 'acct-wafeq-row--metric';
        return `<tr class="${cls}">
            <td class="acct-wafeq-name" colspan="${colSpan}">${escHtml(label)}</td>
            ${accountingWafeqAmtCell(amount, false)}
        </tr>`;
    }

    function accountingCollectUniqueParties(kind) {
        const reg = loadAccountingRegistry();
        const set = new Set();
        (reg.entries || []).forEach((e) => {
            const name = toStr(e.partyName).trim();
            if (!name) return;
            if (kind === 'client' && toStr(e.type) !== 'income') return;
            if (kind === 'vendor' && toStr(e.type) !== 'expense') return;
            if (kind === 'employee' && toStr(e.payrollEmployeeId)) set.add(name);
            else if (kind !== 'employee') set.add(name);
        });
        (reg.cheques || []).forEach((c) => {
            const name = toStr(c.tenant).trim();
            if (name && (kind === 'client' || !kind)) set.add(name);
        });
        (reg.employees || []).forEach((emp) => {
            if (kind === 'employee' || kind === 'vendor') {
                const n = toStr(emp.nameAr || emp.nameEn || emp.name).trim();
                if (n) set.add(n);
            }
        });
        return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }

    function accountingAgingBucketFromDays(days) {
        const d = parseInt(days, 10) || 0;
        if (d <= 0) return 'current';
        if (d <= 29) return 'd1_29';
        if (d <= 89) return 'd30_89';
        if (d <= 179) return 'd90_179';
        if (d <= 269) return 'd180_269';
        if (d <= 359) return 'd270_359';
        return 'd360p';
    }

    function emptyAccountingAgingBuckets() {
        return { current: 0, d1_29: 0, d30_89: 0, d90_179: 0, d180_269: 0, d270_359: 0, d360p: 0 };
    }

    function accountingAgingBucketLabels() {
        return [
            ['current', t('حالي', 'Current')],
            ['d1_29', t('1–29 يوم', '1–29 days')],
            ['d30_89', t('30–89 يوم', '30–89 days')],
            ['d90_179', t('90–179 يوم', '90–179 days')],
            ['d180_269', t('180–269 يوم', '180–269 days')],
            ['d270_359', t('270–359 يوم', '270–359 days')],
            ['d360p', t('360+ يوم', '360+ days')]
        ];
    }

    function collectAccountingReceivableAgingRows(detail) {
        const reg = loadAccountingRegistry();
        const today = new Date();
        const buckets = emptyAccountingAgingBuckets();
        const partyMap = {};
        const rows = [];
        const addItem = (party, ref, dueDate, amount, kind, building, unit) => {
            const due = dueDate ? new Date(dueDate.slice(0, 10)) : today;
            const days = Math.floor((today - due) / 86400000);
            const bucket = accountingAgingBucketFromDays(days);
            buckets[bucket] += amount;
            const pKey = toStr(party).trim() || '—';
            if (!partyMap[pKey]) partyMap[pKey] = emptyAccountingAgingBuckets();
            partyMap[pKey][bucket] += amount;
            if (detail) rows.push({ party: pKey, ref, dueDate, amount, days, bucket, kind, building, unit });
        };
        (reg.cheques || []).forEach((c) => {
            const item = buildReceivableItemFromCheque(c);
            if (!item) return;
            addItem(toStr(c.tenant), item.ref, item.dueDate, item.outstanding, 'cheque', c.building, c.unit);
        });
        (reg.invoices || []).forEach((inv) => {
            const item = buildReceivableItemFromInvoice(inv);
            if (!item) return;
            addItem(toStr(inv.partyName || inv.tenant), item.ref, item.dueDate, item.outstanding, 'invoice', inv.building, inv.unit);
        });
        return { buckets, partyMap, rows };
    }

    function collectAccountingPayableAgingRows(detail) {
        const reg = loadAccountingRegistry();
        const today = new Date();
        const buckets = emptyAccountingAgingBuckets();
        const partyMap = {};
        const rows = [];
        const expenseByParty = {};
        (reg.entries || []).forEach((e) => {
            if (toStr(e.type) !== 'expense') return;
            if (!['confirmed', 'invoiced', 'pending_accountant'].includes(toStr(e.status))) return;
            const name = toStr(e.partyName).trim();
            if (!name) return;
            expenseByParty[name] = (expenseByParty[name] || 0) + (parseFloat(e.amount) || 0);
        });
        (reg.entries || []).forEach((e) => {
            if (toStr(e.type) !== 'income') return;
            if (!['confirmed', 'invoiced'].includes(toStr(e.status))) return;
            const name = toStr(e.partyName).trim();
            if (!name || !expenseByParty[name]) return;
            expenseByParty[name] = Math.max(0, parseFloat((expenseByParty[name] - (parseFloat(e.amount) || 0)).toFixed(3)));
        });
        Object.keys(expenseByParty).forEach((party) => {
            const amount = expenseByParty[party];
            if (amount <= 0) return;
            const dueDate = today.toISOString().slice(0, 10);
            const bucket = 'current';
            buckets[bucket] += amount;
            if (!partyMap[party]) partyMap[party] = emptyAccountingAgingBuckets();
            partyMap[party][bucket] += amount;
            if (detail) rows.push({ party, ref: '—', dueDate, amount, days: 0, bucket, kind: 'expense' });
        });
        return { buckets, partyMap, rows };
    }

    function printAccountingTrialBalance() {
        const filters = getAccountingReportDateFilters();
        const { periodMap, closingMap, openingMap } = buildCoaOpeningAndPeriodMaps(filters);
        const accounts = getChartOfAccounts().filter((a) => a.leaf || a.allowPost);
        let totOpenD = 0;
        let totOpenC = 0;
        let totMoveD = 0;
        let totMoveC = 0;
        let totCloseD = 0;
        let totCloseC = 0;
        const bodyRows = accounts.map((a) => {
            const id = resolveCoaAccountId(a.id);
            const open = openingMap[id] || { debit: 0, credit: 0 };
            const move = periodMap[id] || { debit: 0, credit: 0 };
            const close = closingMap[id] || { debit: 0, credit: 0 };
            const openD = parseFloat(open.debit.toFixed(3));
            const openC = parseFloat(open.credit.toFixed(3));
            const moveD = parseFloat(move.debit.toFixed(3));
            const moveC = parseFloat(move.credit.toFixed(3));
            const closeD = parseFloat(close.debit.toFixed(3));
            const closeC = parseFloat(close.credit.toFixed(3));
            if (!openD && !openC && !moveD && !moveC && !closeD && !closeC) return '';
            totOpenD += openD;
            totOpenC += openC;
            totMoveD += moveD;
            totMoveC += moveC;
            totCloseD += closeD;
            totCloseC += closeC;
            return `<tr>
                <td class="acct-wafeq-code">${escHtml(a.code)}</td>
                <td class="acct-wafeq-name">${escHtml(coaAccountLabel(a))}</td>
                <td class="acct-wafeq-cat">${escHtml(accountingCoaSectionLabel(a.section))}</td>
                <td class="acct-wafeq-cat">${escHtml(accountingCoaSubcategoryLabel(a))}</td>
                ${accountingWafeqDrCrCells(open, true)}
                ${accountingWafeqDrCrCells(move, true)}
                ${accountingWafeqDrCrCells(close, true)}
            </tr>`;
        }).filter(Boolean).join('');
        const title = t('ميزان المراجعة', 'Trial balance');
        const head = `<tr>
            <th rowspan="2">${t('رقم الحساب', 'Account #')}</th>
            <th rowspan="2">${t('الحساب', 'Account')}</th>
            <th rowspan="2">${t('صنف الحساب', 'Category')}</th>
            <th rowspan="2">${t('الصنف الفرعي', 'Sub-category')}</th>
            <th colspan="2">${t('الرصيد الافتتاحي', 'Opening balance')}</th>
            <th colspan="2">${t('حركات الفترة', 'Period movement')}</th>
            <th colspan="2">${t('الرصيد الختامي', 'Closing balance')}</th>
        </tr>
        <tr>
            <th>${t('مدين', 'Debit')}</th><th>${t('دائن', 'Credit')}</th>
            <th>${t('مدين', 'Debit')}</th><th>${t('دائن', 'Credit')}</th>
            <th>${t('مدين', 'Debit')}</th><th>${t('دائن', 'Credit')}</th>
        </tr>`;
        const footer = `<tr class="acct-wafeq-row--grand">
            <td colspan="4">${t('الإجمالي', 'Total')}</td>
            <td class="acct-wafeq-amt">${escHtml(summaryAmtOm(totOpenD))}</td>
            <td class="acct-wafeq-amt">${escHtml(summaryAmtOm(totOpenC))}</td>
            <td class="acct-wafeq-amt">${escHtml(summaryAmtOm(totMoveD))}</td>
            <td class="acct-wafeq-amt">${escHtml(summaryAmtOm(totMoveC))}</td>
            <td class="acct-wafeq-amt">${escHtml(summaryAmtOm(totCloseD))}</td>
            <td class="acct-wafeq-amt">${escHtml(summaryAmtOm(totCloseC))}</td>
        </tr>`;
        const body = `${accountingReportMetaLine(filters)}
            ${accountingWafeqTableWrap(head, (bodyRows || `<tr><td colspan="10">${t('لا توجد أرصدة', 'No balances')}</td></tr>`) + footer)}`;
        printAccountingWafeqReport(title, body, { orientation: 'landscape' });
    }

    function printAccountingIncomeStatement(dimension) {
        const filters = getAccountingReportDateFilters();
        const balMap = buildCoaBalanceMapFromMovements(loadAccountingRegistry(), filters, dimension);
        const dimLabel = dimension === 'branch' ? t('بحسب الفرع', 'By branch')
            : dimension === 'cost_center' ? t('بحسب مركز التكلفة', 'By cost center')
            : dimension === 'project' ? t('بحسب المشروع', 'By project') : '';
        const title = dimLabel ? `${t('قائمة الدخل', 'Income statement')} — ${dimLabel}` : t('قائمة الدخل', 'Income statement');
        const head = `<tr><th>${t('رقم الحساب', 'Account #')}</th><th>${t('الحساب', 'Account')}</th><th>${t('الإجمالي', 'Total')}</th></tr>`;
        const hierOpts = { positiveRevenue: true, positiveExpenses: true };
        const revBlock = buildWafeqCoaHierarchyRows(['coa_4'], balMap, hierOpts);
        const cogsBlock = buildWafeqCoaHierarchyRows(['coa_51'], balMap, hierOpts);
        const opexBlock = buildWafeqCoaHierarchyRows(['coa_52'], balMap, hierOpts);
        const grossProfit = parseFloat((revBlock.total - cogsBlock.total).toFixed(3));
        const netIncome = parseFloat((grossProfit - opexBlock.total).toFixed(3));
        const bodyRows = revBlock.html
            + buildWafeqMetricRow(t('إجمالي الإيرادات', 'Total revenue'), revBlock.total, 2, 'acct-wafeq-row--subtotal')
            + cogsBlock.html
            + buildWafeqMetricRow(t('إجمالي تكلفة المبيعات', 'Total cost of sales'), cogsBlock.total, 2, 'acct-wafeq-row--subtotal')
            + buildWafeqMetricRow(t('مجمل الربح', 'Gross profit'), grossProfit, 2)
            + opexBlock.html
            + buildWafeqMetricRow(t('إجمالي المصروفات التشغيلية', 'Total operating expenses'), opexBlock.total, 2, 'acct-wafeq-row--subtotal')
            + buildWafeqMetricRow(t('صافي الربح (الخسارة)', 'Net profit (loss)'), netIncome, 2, 'acct-wafeq-row--grand');
        const body = `${accountingReportMetaLine(filters)}
            ${accountingWafeqTableWrap(head, bodyRows)}`;
        printAccountingWafeqReport(title, body);
    }

    function printAccountingBalanceSheet() {
        const filters = getAccountingReportDateFilters();
        const asOf = filters.to || new Date().toISOString().slice(0, 10);
        const balMap = buildCoaClosingBalanceMap(asOf);
        const sections = [
            { root: 'coa_1', label: t('الأصول', 'Assets'), totalLabel: t('إجمالي الأصول', 'Total assets') },
            { root: 'coa_2', label: t('الالتزامات', 'Liabilities'), totalLabel: t('إجمالي الالتزامات', 'Total liabilities') },
            { root: 'coa_3', label: t('حقوق الملكية', 'Equity'), totalLabel: t('إجمالي حقوق الملكية', 'Total equity') }
        ];
        const head = `<tr><th>${t('رقم الحساب', 'Account #')}</th><th>${t('الحساب', 'Account')}</th><th>${t('كما في تاريخ', 'As of')}</th></tr>`;
        let bodyRows = '';
        sections.forEach((sec) => {
            const block = buildWafeqCoaHierarchyRows([sec.root], balMap, { hideZero: true });
            bodyRows += `<tr class="acct-wafeq-row--section"><td colspan="3"><strong>${escHtml(sec.label)}</strong></td></tr>`;
            bodyRows += block.html;
            bodyRows += buildWafeqMetricRow(sec.totalLabel, block.total, 2, 'acct-wafeq-row--subtotal');
        });
        const body = `${accountingReportMetaLine(filters, { asOf })}
            ${accountingWafeqTableWrap(head, bodyRows)}`;
        printAccountingWafeqReport(t('قائمة المركز المالي', 'Balance sheet'), body);
    }

    function printAccountingCashFlowReport(indirect) {
        const filters = getAccountingReportDateFilters();
        const reg = loadAccountingRegistry();
        const movements = collectAccountingJournalMovements(reg, filters);
        const balMap = buildCoaBalanceMapFromMovements(reg, filters);
        const cashIds = new Set(['coa_111', 'coa_112']);
        getChartOfAccounts().filter((a) => a.linkedBankAccountId || resolveCoaAccountId(a.parentId) === 'coa_112').forEach((a) => cashIds.add(a.id));

        function sumCashFlow(category) {
            let inflow = 0;
            let outflow = 0;
            movements.forEach((ln) => {
                const acct = coaAccountById(ln.coaAccountId);
                if (!acct) return;
                const isCash = cashIds.has(acct.id) || acct.linkedBankAccountId;
                if (isCash) {
                    inflow += parseFloat(ln.debit) || 0;
                    outflow += parseFloat(ln.credit) || 0;
                    return;
                }
                const cf = acct.cashFlow || 'operating';
                if (cf !== category) return;
                const net = (parseFloat(ln.debit) || 0) - (parseFloat(ln.credit) || 0);
                if (net > 0) inflow += net;
                else outflow += Math.abs(net);
            });
            return { inflow, outflow, net: parseFloat((inflow - outflow).toFixed(3)) };
        }

        const operating = sumCashFlow('operating');
        const investing = sumCashFlow('investing');
        const financing = sumCashFlow('financing');
        const netChange = parseFloat((operating.net + investing.net + financing.net).toFixed(3));

        let netIncome = 0;
        getChartOfAccounts().filter((a) => a.leaf && (a.section === 'revenue' || a.section === 'expense')).forEach((a) => {
            const signed = accountingCoaSignedBalance(a, balMap);
            if (a.section === 'revenue') netIncome += signed;
            else netIncome -= signed;
        });
        netIncome = parseFloat(netIncome.toFixed(3));

        const title = indirect
            ? t('التدفقات النقدية — الطريقة غير المباشرة', 'Cash flow — indirect method')
            : t('التدفقات النقدية', 'Cash flow statement');
        const head = `<tr><th>${t('البند', 'Item')}</th><th>${t('المبلغ', 'Amount')}</th></tr>`;
        let bodyRows = '';
        if (indirect) {
            bodyRows += buildWafeqMetricRow(t('صافي الدخل', 'Net income'), netIncome, 1, 'acct-wafeq-row--section');
            bodyRows += buildWafeqMetricRow(t('تعديلات لتسوية صافي الدخل إلى التدفق النقدي من الأنشطة التشغيلية', 'Adjustments to reconcile net income to operating cash'), 0, 1, 'acct-wafeq-row--section');
            bodyRows += `<tr><td class="acct-wafeq-name acct-wafeq-indent-1">${t('استهلاك وإطفاء (عند التوفر)', 'Depreciation & amortization (when available)')}</td>${accountingWafeqAmtCell(0, true)}</tr>`;
            bodyRows += `<tr><td class="acct-wafeq-name acct-wafeq-indent-1">${t('تغيرات في رأس المال العامل', 'Changes in working capital')}</td>${accountingWafeqAmtCell(0, true)}</tr>`;
        }
        bodyRows += `<tr class="acct-wafeq-row--section"><td class="acct-wafeq-name"><strong>${t('التدفقات النقدية من الأنشطة التشغيلية', 'Cash flows from operating activities')}</strong></td><td></td></tr>`;
        bodyRows += `<tr><td class="acct-wafeq-name acct-wafeq-indent-1">${t('تدفقات نقدية داخلة', 'Cash inflows')}</td>${accountingWafeqAmtCell(operating.inflow, true)}</tr>`;
        bodyRows += `<tr><td class="acct-wafeq-name acct-wafeq-indent-1">${t('تدفقات نقدية خارجة', 'Cash outflows')}</td>${accountingWafeqAmtCell(-operating.outflow, false)}</tr>`;
        bodyRows += buildWafeqMetricRow(t('صافي التدفق من الأنشطة التشغيلية', 'Net cash from operating activities'), operating.net, 1, 'acct-wafeq-row--subtotal');
        bodyRows += `<tr class="acct-wafeq-row--section"><td class="acct-wafeq-name"><strong>${t('التدفقات النقدية من الأنشطة الاستثمارية', 'Cash flows from investing activities')}</strong></td><td></td></tr>`;
        bodyRows += buildWafeqMetricRow(t('صافي التدفق من الأنشطة الاستثمارية', 'Net cash from investing activities'), investing.net, 1, 'acct-wafeq-row--subtotal');
        bodyRows += `<tr class="acct-wafeq-row--section"><td class="acct-wafeq-name"><strong>${t('التدفقات النقدية من الأنشطة التمويلية', 'Cash flows from financing activities')}</strong></td><td></td></tr>`;
        bodyRows += buildWafeqMetricRow(t('صافي التدفق من الأنشطة التمويلية', 'Net cash from financing activities'), financing.net, 1, 'acct-wafeq-row--subtotal');
        bodyRows += buildWafeqMetricRow(t('صافي الزيادة (النقص) في النقد وما يعادله', 'Net increase (decrease) in cash and equivalents'), netChange, 1, 'acct-wafeq-row--grand');

        const body = `${accountingReportMetaLine(filters)}
            ${accountingWafeqTableWrap(head, bodyRows)}`;
        printAccountingWafeqReport(title, body);
    }

    function printAccountingCashForecast() {
        const reg = loadAccountingRegistry();
        const today = new Date().toISOString().slice(0, 10);
        const rows = [];
        (reg.cheques || []).forEach((c) => {
            if (isAccountingChequePaidStatus(c.status)) return;
            const st = toStr(c.status);
            if (st === 'bounced' || st === 'returned') return;
            const item = buildReceivableItemFromCheque(c);
            if (!item) return;
            rows.push({ date: item.dueDate, party: c.tenant, ref: c.chequeNo, amount: item.outstanding, kind: t('شيك', 'Cheque') });
        });
        rows.sort((a, b) => toStr(a.date).localeCompare(toStr(b.date)));
        const total = rows.reduce((s, r) => s + r.amount, 0);
        const title = t('التوقعات النقدية', 'Cash forecast');
        const body = `<div class="section-header property-section-h">${title}</div>
            <p class="property-report-meta">${t('من اليوم', 'From today')}: ${escHtml(today)} · ${t('المتوقع من الشيكات المستحقة', 'Expected from due cheques')}: ${escHtml(summaryAmtOm(total))}</p>
            ${accountingReportTableWrap(`<tr><th>${t('التاريخ', 'Date')}</th><th>${t('النوع', 'Type')}</th><th>${t('المرجع', 'Ref')}</th><th>${t('الجهة', 'Party')}</th><th>${t('المبلغ', 'Amount')}</th></tr>`,
            rows.map((r) => `<tr><td>${escHtml(r.date)}</td><td>${escHtml(r.kind)}</td><td>${escHtml(r.ref || '—')}</td><td>${escHtml(r.party || '—')}</td><td>${escHtml(summaryAmtOm(r.amount))}</td></tr>`).join('') || `<tr><td colspan="5">${t('لا توجد توقعات', 'No forecast items')}</td></tr>`)}`;
        printWithSiteStandard(title, body, { orientation: 'landscape' });
    }

    function printAccountingPartyStatement(partyName, detailed) {
        const name = toStr(partyName).trim();
        if (!name) return;
        const filters = getAccountingReportDateFilters();
        const reg = loadAccountingRegistry();
        const rows = [];
        (reg.entries || []).forEach((e) => {
            if (toStr(e.partyName) !== name) return;
            if (!accountingReportDateInRange(e.dueDate, filters.from, filters.to)) return;
            rows.push({
                date: e.dueDate,
                desc: e.title,
                debit: toStr(e.type) === 'expense' ? e.amount : 0,
                credit: toStr(e.type) === 'income' ? e.amount : 0,
                ref: e.voucherNo || e.id,
                status: accountingEntryStatusLabel(e.status),
                building: e.building,
                unit: e.unit
            });
        });
        (reg.cheques || []).forEach((c) => {
            if (toStr(c.tenant) !== name) return;
            if (!accountingReportDateInRange(c.dueDate, filters.from, filters.to)) return;
            rows.push({
                date: c.dueDate,
                desc: t('شيك', 'Cheque'),
                debit: 0,
                credit: c.amount,
                ref: c.chequeNo,
                status: accountingChequeStatusLabel(c.status),
                building: c.building,
                unit: c.unit
            });
        });
        rows.sort((a, b) => toStr(a.date).localeCompare(toStr(b.date)));
        const sum = computePartyFinancialSummary(name);
        const title = detailed
            ? `${t('كشف حساب', 'Account statement')} — ${name} (${t('مفصّل', 'Detailed')})`
            : `${t('كشف حساب', 'Account statement')} — ${name}`;
        const extraCols = detailed ? `<th>${t('مبنى', 'Building')}</th><th>${t('وحدة', 'Unit')}</th><th>${t('الحالة', 'Status')}</th>` : '';
        const body = `<div class="section-header property-section-h">${escHtml(title)}</div>${accountingReportMetaLine(filters)}
            <p class="property-report-meta">${t('إيرادات/مدين للعميل', 'Income / client debit')}: ${escHtml(summaryAmtOm(sum.income))} · ${t('مصروفات', 'Expenses')}: ${escHtml(summaryAmtOm(sum.expense))} · ${t('الرصيد', 'Balance')}: ${escHtml(summaryAmtOm(sum.balance))}</p>
            ${accountingReportTableWrap(`<tr><th>${t('التاريخ', 'Date')}</th><th>${t('البيان', 'Description')}</th><th>${t('مرجع', 'Ref')}</th><th>${t('مدين', 'Debit')}</th><th>${t('دائن', 'Credit')}</th>${extraCols}</tr>`,
            rows.map((r) => `<tr><td>${escHtml(r.date || '—')}</td><td>${escHtml(r.desc || '—')}</td><td>${escHtml(r.ref || '—')}</td><td>${r.debit ? escHtml(summaryAmtOm(r.debit)) : '—'}</td><td>${r.credit ? escHtml(summaryAmtOm(r.credit)) : '—'}</td>${detailed ? `<td>${escHtml(r.building || '—')}</td><td>${escHtml(r.unit || '—')}</td><td>${escHtml(r.status || '—')}</td>` : ''}</tr>`).join('') || `<tr><td colspan="${detailed ? 8 : 5}">${t('لا توجد حركات', 'No transactions')}</td></tr>`)}`;
        printWithSiteStandard(title, body, { orientation: detailed ? 'landscape' : 'portrait' });
    }

    function printAccountingAgingReport(kind, detailed) {
        const isAr = kind === 'ar';
        const data = isAr ? collectAccountingReceivableAgingRows(detailed) : collectAccountingPayableAgingRows(detailed);
        const b = data.buckets;
        const partyMap = data.partyMap || {};
        const title = isAr
            ? (detailed ? t('تقادم الحسابات المدينة — مفصّل', 'AR aging — detailed') : t('تقادم الحسابات المدينة', 'AR aging'))
            : (detailed ? t('تقادم الحسابات الدائنة — مفصّل', 'AP aging — detailed') : t('تقادم الحسابات الدائنة', 'AP aging'));
        const bucketCols = accountingAgingBucketLabels();
        const headCells = bucketCols.map(([, lbl]) => `<th>${escHtml(lbl)}</th>`).join('');
        const grand = emptyAccountingAgingBuckets();
        const summaryRows = Object.keys(partyMap).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })).map((party) => {
            const pb = partyMap[party];
            let rowTotal = 0;
            const cells = bucketCols.map(([key]) => {
                const v = parseFloat((pb[key] || 0).toFixed(3));
                rowTotal += v;
                grand[key] += v;
                return accountingWafeqAmtCell(v, true);
            }).join('');
            return `<tr>
                <td class="acct-wafeq-name">${escHtml(party)}</td>
                ${cells}
                <td class="acct-wafeq-amt">${escHtml(summaryAmtOm(rowTotal))}</td>
            </tr>`;
        }).join('');
        const grandTotal = bucketCols.reduce((s, [key]) => s + (grand[key] || 0), 0);
        const footerCells = bucketCols.map(([key]) => `<td class="acct-wafeq-amt">${escHtml(summaryAmtOm(grand[key] || 0))}</td>`).join('');
        const summaryHead = `<tr>
            <th>${t('الإسم', 'Name')}</th>
            ${headCells}
            <th>${t('الإجمالي', 'Total')}</th>
        </tr>`;
        let body = `${accountingReportMetaLine(getAccountingReportDateFilters())}
            ${accountingWafeqTableWrap(summaryHead, (summaryRows || `<tr><td colspan="${bucketCols.length + 2}">${t('لا توجد أرصدة', 'No balances')}</td></tr>`)
                + `<tr class="acct-wafeq-row--grand"><td>${t('الإجمالي', 'Total')}</td>${footerCells}<td class="acct-wafeq-amt">${escHtml(summaryAmtOm(grandTotal))}</td></tr>`)}`;
        if (detailed) {
            body += `<h4 style="margin:16px 0 8px;text-align:center">${t('تفاصيل المستندات', 'Document details')}</h4>`;
            body += accountingReportTableWrap(
                `<tr><th>${t('الجهة', 'Party')}</th><th>${t('المرجع', 'Ref')}</th><th>${t('الاستحقاق', 'Due')}</th><th>${t('أيام', 'Days')}</th><th>${t('المبلغ', 'Amount')}</th><th>${t('النوع', 'Type')}</th></tr>`,
                data.rows.map((r) => `<tr><td>${escHtml(r.party)}</td><td>${escHtml(r.ref)}</td><td>${escHtml(r.dueDate)}</td><td>${r.days}</td><td>${escHtml(summaryAmtOm(r.amount))}</td><td>${escHtml(r.kind)}</td></tr>`).join('') || `<tr><td colspan="6">—</td></tr>`
            );
        }
        printAccountingWafeqReport(title, body, { orientation: 'landscape' });
    }

    function printAccountingGroupedSalesReport(groupBy) {
        const filters = getAccountingReportDateFilters();
        const reg = loadAccountingRegistry();
        const map = {};
        (reg.entries || []).forEach((e) => {
            if (toStr(e.type) !== 'income') return;
            if (!['confirmed', 'invoiced'].includes(toStr(e.status))) return;
            if (!accountingReportDateInRange(e.dueDate, filters.from, filters.to)) return;
            let key = '—';
            if (groupBy === 'client') key = toStr(e.partyName) || '—';
            else if (groupBy === 'branch') key = toStr(e.building) || '—';
            else if (groupBy === 'project') key = toStr(e.agreementNo) || '—';
            else if (groupBy === 'product') {
                const acct = coaAccountById(e.coaAccountId || 'coa_411');
                key = acct ? coaAccountLabel(acct) : '—';
            }
            map[key] = (map[key] || 0) + (parseFloat(e.amount) || 0);
        });
        const titleMap = {
            client: t('المبيعات بحسب العميل', 'Sales by client'),
            branch: t('المبيعات بحسب الفرع', 'Sales by branch'),
            project: t('المبيعات بحسب المشروع', 'Sales by project'),
            product: t('المبيعات بحسب المنتج أو الخدمة', 'Sales by product/service')
        };
        const title = titleMap[groupBy] || titleMap.client;
        const rows = Object.keys(map).sort().map((k) => `<tr><td>${escHtml(k)}</td><td>${escHtml(summaryAmtOm(map[k]))}</td></tr>`).join('');
        const body = `<div class="section-header property-section-h">${title}</div>${accountingReportMetaLine(filters)}
            ${accountingReportTableWrap(`<tr><th>${t('البند', 'Item')}</th><th>${t('المبلغ', 'Amount')}</th></tr>`, rows || `<tr><td colspan="2">—</td></tr>`)}`;
        printWithSiteStandard(title, body);
    }

    function printAccountingGroupedPurchasesReport(groupBy) {
        const filters = getAccountingReportDateFilters();
        const reg = loadAccountingRegistry();
        const map = {};
        (reg.entries || []).forEach((e) => {
            if (toStr(e.type) !== 'expense') return;
            if (!['confirmed', 'invoiced'].includes(toStr(e.status))) return;
            if (!accountingReportDateInRange(e.dueDate, filters.from, filters.to)) return;
            let key = '—';
            if (groupBy === 'vendor') key = toStr(e.partyName) || '—';
            else if (groupBy === 'branch') key = toStr(e.building) || '—';
            else if (groupBy === 'product') {
                const acct = coaAccountById(e.coaAccountId || 'coa_526');
                key = acct ? coaAccountLabel(acct) : '—';
            }
            map[key] = (map[key] || 0) + (parseFloat(e.amount) || 0);
        });
        const titleMap = {
            vendor: t('الفواتير بحسب المورد', 'Invoices by vendor'),
            branch: t('الفواتير بحسب الفرع', 'Invoices by branch'),
            expense_vendor: t('المصروفات بحسب مورد', 'Expenses by vendor'),
            expense_branch: t('المصروفات بحسب الفرع', 'Expenses by branch'),
            product: t('مشتريات بحسب المنتج أو الخدمة', 'Purchases by product/service')
        };
        const title = titleMap[groupBy] || titleMap.vendor;
        const rows = Object.keys(map).sort().map((k) => `<tr><td>${escHtml(k)}</td><td>${escHtml(summaryAmtOm(map[k]))}</td></tr>`).join('');
        const body = `<div class="section-header property-section-h">${title}</div>${accountingReportMetaLine(filters)}
            ${accountingReportTableWrap(`<tr><th>${t('البند', 'Item')}</th><th>${t('المبلغ', 'Amount')}</th></tr>`, rows || `<tr><td colspan="2">—</td></tr>`)}`;
        printWithSiteStandard(title, body);
    }

    function printAccountingGeneralLedger(coaId, detailed) {
        const id = resolveCoaAccountId(coaId);
        const acct = coaAccountById(id);
        if (!acct) return;
        const filters = getAccountingReportDateFilters();
        const movements = collectAccountingJournalMovements(loadAccountingRegistry(), filters)
            .filter((ln) => ln.coaAccountId === id);
        let runBal = 0;
        const title = detailed
            ? `${t('كشف الحساب', 'Account statement')} — ${coaAccountLabel(acct)} (${t('مفصّل', 'Detailed')})`
            : `${t('دفتر الأستاذ العام', 'General ledger')} — ${coaAccountLabel(acct)}`;
        const rows = movements.map((ln) => {
            runBal += (parseFloat(ln.debit) || 0) - (parseFloat(ln.credit) || 0);
            return `<tr><td>${escHtml(ln.date)}</td><td>${escHtml(ln.ref)}</td><td>${escHtml(ln.desc)}</td><td>${escHtml(ln.party || '—')}</td><td>${ln.debit ? escHtml(summaryAmtOm(ln.debit)) : '—'}</td><td>${ln.credit ? escHtml(summaryAmtOm(ln.credit)) : '—'}</td><td>${escHtml(summaryAmtOm(runBal))}</td>${detailed ? `<td>${escHtml(ln.building || '—')}</td><td>${escHtml(ln.unit || '—')}</td>` : ''}</tr>`;
        }).join('');
        const body = `<div class="section-header property-section-h">${escHtml(title)}</div>${accountingReportMetaLine(filters)}
            ${accountingReportTableWrap(`<tr><th>${t('التاريخ', 'Date')}</th><th>${t('مرجع', 'Ref')}</th><th>${t('البيان', 'Description')}</th><th>${t('الجهة', 'Party')}</th><th>${t('مدين', 'Debit')}</th><th>${t('دائن', 'Credit')}</th><th>${t('الرصيد', 'Balance')}</th>${detailed ? `<th>${t('مبنى', 'Building')}</th><th>${t('وحدة', 'Unit')}</th>` : ''}</tr>`, rows || `<tr><td colspan="${detailed ? 9 : 7}">—</td></tr>`)}`;
        printWithSiteStandard(title, body, { orientation: 'landscape' });
    }

    function printAccountingAuditLogReport() {
        const filters = getAccountingReportDateFilters();
        const reg = loadAccountingRegistry();
        const rows = [];
        (reg.entries || []).forEach((e) => {
            (e.approvalHistory || []).forEach((h) => {
                const dt = (h.at || h.date || '').slice(0, 10);
                if (!accountingReportDateInRange(dt, filters.from, filters.to)) return;
                rows.push({
                    date: dt,
                    requestNo: h.requestNo || e.approvalRequestNo || '—',
                    action: h.action || h.status || '—',
                    user: h.by || h.user || '—',
                    note: h.note || h.comment || '',
                    entry: e.voucherNo || e.title || e.id
                });
            });
        });
        rows.sort((a, b) => toStr(b.date).localeCompare(toStr(a.date)));
        const title = t('سجل التدقيق', 'Audit log');
        const body = `<div class="section-header property-section-h">${title}</div>${accountingReportMetaLine(filters)}
            ${accountingReportTableWrap(`<tr><th>${t('التاريخ', 'Date')}</th><th>${t('طلب', 'Request')}</th><th>${t('السند', 'Voucher')}</th><th>${t('الإجراء', 'Action')}</th><th>${t('المستخدم', 'User')}</th><th>${t('ملاحظة', 'Note')}</th></tr>`,
            rows.map((r) => `<tr><td>${escHtml(r.date)}</td><td>${escHtml(r.requestNo)}</td><td>${escHtml(r.entry)}</td><td>${escHtml(r.action)}</td><td>${escHtml(r.user)}</td><td>${escHtml(r.note)}</td></tr>`).join('') || `<tr><td colspan="6">${t('لا توجد سجلات', 'No records')}</td></tr>`)}`;
        printWithSiteStandard(title, body, { orientation: 'landscape' });
    }

    function printAccountingJournalRegister() {
        const reg = loadAccountingRegistry();
        ensureAccountingJournalLedger(reg, false);
        const filters = getAccountingReportDateFilters();
        const journals = (reg.journals || []).filter((j) => {
            if (toStr(j.status) !== 'posted') return false;
            return accountingReportDateInRange(j.date, filters.from, filters.to);
        });
        const title = t('دفتر القيود اليومية', 'Journal register');
        const head = `<tr>
            <th>${t('التاريخ', 'Date')}</th>
            <th>${t('رقم القيد', 'Entry #')}</th>
            <th>${t('البيان', 'Description')}</th>
            <th>${t('الحساب', 'Account')}</th>
            <th>${t('مدين', 'Debit')}</th>
            <th>${t('دائن', 'Credit')}</th>
            <th>${t('المرجع', 'Reference')}</th>
        </tr>`;
        let rows = '';
        journals.forEach((j) => {
            const lineRows = (j.lines || []).map((ln, idx) => {
                const acct = coaAccountById(ln.coaAccountId);
                const prefix = idx === 0
                    ? `<td rowspan="${(j.lines || []).length}">${escHtml(j.date || '—')}</td>
                       <td rowspan="${(j.lines || []).length}">${escHtml(j.entryNo || '—')}</td>
                       <td rowspan="${(j.lines || []).length}">${escHtml(j.description || '—')}</td>`
                    : '';
                return `<tr>${prefix}
                    <td>${escHtml(acct ? `${acct.code} — ${coaAccountLabel(acct)}` : ln.coaAccountId)}</td>
                    <td class="acct-wafeq-amt">${ln.debit ? escHtml(summaryAmtOm(ln.debit)) : '—'}</td>
                    <td class="acct-wafeq-amt">${ln.credit ? escHtml(summaryAmtOm(ln.credit)) : '—'}</td>
                    ${idx === 0 ? `<td rowspan="${(j.lines || []).length}">${escHtml(j.referenceType)} / ${escHtml(j.referenceId)}</td>` : ''}
                </tr>`;
            }).join('');
            rows += lineRows;
        });
        const unbalanced = journals.filter((j) => Math.abs((j.totalDebit || 0) - (j.totalCredit || 0)) > 0.001);
        const warn = unbalanced.length
            ? `<p class="acct-wafeq-meta" style="color:#c62828">${t('تحذير: يوجد قيود غير متوازنة', 'Warning: unbalanced entries')}: ${unbalanced.length}</p>`
            : `<p class="acct-wafeq-meta">${t('جميع القيود متوازنة (مدين = دائن)', 'All entries balanced (debit = credit)')}</p>`;
        const body = `${accountingReportMetaLine(filters)}${warn}
            ${accountingWafeqTableWrap(head, rows || `<tr><td colspan="7">${t('لا توجد قيود مرحّلة', 'No posted journal entries')}</td></tr>`)}`;
        printAccountingWafeqReport(title, body, { orientation: 'landscape' });
    }

    function printAccountingBankAccountsReport() {
        const reg = loadAccountingRegistry();
        const filters = getAccountingReportDateFilters();
        const asOf = filters.to || new Date().toISOString().slice(0, 10);
        const banks = getBankAccounts(false);
        const title = t('الحسابات البنكية', 'Bank accounts');
        const head = `<tr>
            <th>${t('الحساب', 'Account')}</th>
            <th>${t('المالك', 'Owner')}</th>
            <th>${t('رصيد الدفاتر', 'Book balance')}</th>
            <th>${t('رصيد كشف الحساب', 'Statement balance')}</th>
            <th>${t('الفرق', 'Difference')}</th>
        </tr>`;
        let totBook = 0;
        let totStmt = 0;
        const rows = banks.map((ba) => {
            const book = computeBankAccountBookBalance(ba, reg, asOf);
            const stmt = parseFloat(ba.statementBalance) || 0;
            const diff = parseFloat((book - stmt).toFixed(3));
            totBook += book;
            totStmt += stmt;
            const name = ba.label ? `${ba.label} — ${ba.bankName}` : bankAccountLabel(ba);
            return `<tr>
                <td class="acct-wafeq-name">${escHtml(name)}${ba.accountNo ? `<br><small>${escHtml(ba.accountNo)}</small>` : ''}</td>
                <td class="acct-wafeq-cat">${escHtml(ba.ownerName || '—')}</td>
                ${accountingWafeqAmtCell(book, false).replace('acct-wafeq-amt', 'acct-wafeq-amt')}
                ${accountingWafeqAmtCell(stmt, true)}
                ${accountingWafeqAmtCell(diff, false)}
            </tr>`;
        }).join('');
        const cashBook = computeCashOnHandBookBalance(asOf);
        let cashRow = '';
        if (Math.abs(cashBook) > 0.0005) {
            totBook += cashBook;
            cashRow = `<tr>
                <td class="acct-wafeq-name">${t('الصندوق — نقد في اليد', 'Cash on hand')}</td>
                <td class="acct-wafeq-cat">—</td>
                ${accountingWafeqAmtCell(cashBook, false)}
                ${accountingWafeqAmtCell(0, true)}
                ${accountingWafeqAmtCell(cashBook, false)}
            </tr>`;
        }
        const footer = `<tr class="acct-wafeq-row--grand">
            <td colspan="2">${t('الإجمالي', 'Total')}</td>
            <td class="acct-wafeq-amt">${escHtml(summaryAmtOm(totBook))}</td>
            <td class="acct-wafeq-amt">${escHtml(summaryAmtOm(totStmt))}</td>
            <td class="acct-wafeq-amt">${escHtml(summaryAmtOm(parseFloat((totBook - totStmt).toFixed(3))))}</td>
        </tr>`;
        const body = `${accountingReportMetaLine(filters, { asOf })}
            <p class="acct-wafeq-meta">${t('رصيد الدفاتر من القيود المحاسبية. أدخل رصيد كشف الحساب من تبويب الحسابات البنكية لمقارنة الفرق.', 'Book balance from journal entries. Enter statement balance in Bank accounts tab to compare.')}</p>
            ${accountingWafeqTableWrap(head, (rows + cashRow || `<tr><td colspan="5">${t('لا توجد حسابات بنكية.', 'No bank accounts.')}</td></tr>`) + footer)}`;
        printAccountingWafeqReport(title, body);
    }

    function printAccountingBankReconciliationReport() {
        const reg = loadAccountingRegistry();
        const asOf = getAccountingReportDateFilters().to || new Date().toISOString().slice(0, 10);
        const banks = getBankAccounts(false);
        const title = t('تقرير تسوية مصرفية', 'Bank reconciliation');
        const head = `<tr><th>${t('الحساب', 'Account')}</th><th>${t('رصيد الدفاتر', 'Book balance')}</th><th>${t('رصيد كشف الحساب', 'Statement balance')}</th><th>${t('الفرق', 'Difference')}</th></tr>`;
        const rows = banks.map((ba) => {
            const book = computeBankAccountBookBalance(ba, reg, asOf);
            const stmt = parseFloat(ba.statementBalance) || 0;
            const diff = parseFloat((book - stmt).toFixed(3));
            return `<tr>
                <td class="acct-wafeq-name">${escHtml(bankAccountLabel(ba))}</td>
                ${accountingWafeqAmtCell(book, false)}
                ${accountingWafeqAmtCell(stmt, true)}
                ${accountingWafeqAmtCell(diff, false)}
            </tr>`;
        }).join('');
        const body = `${accountingReportMetaLine(getAccountingReportDateFilters(), { asOf })}
            ${accountingWafeqTableWrap(head, rows || `<tr><td colspan="4">${t('لا توجد حسابات بنكية.', 'No bank accounts.')}</td></tr>`)}`;
        printAccountingWafeqReport(title, body);
    }

    function printAccountingInventoryMovementReport(byWarehouse) {
        const reg = loadAccountingRegistry();
        const items = reg.inventoryItems || [];
        const whs = reg.warehouses || [];
        const movs = (reg.stockMovements || []).slice().sort((a, b) => toStr(a.date).localeCompare(toStr(b.date)));
        const itemLabel = (id) => {
            const it = items.find((x) => x.id === id);
            return it ? (appUiLanguage === 'en' ? (it.nameEn || it.nameAr) : (it.nameAr || it.nameEn)) : id;
        };
        const whLabel = (id) => {
            const w = whs.find((x) => x.id === id);
            return w ? (appUiLanguage === 'en' ? (w.nameEn || w.nameAr) : (w.nameAr || w.nameEn)) : id || '—';
        };
        const title = byWarehouse
            ? t('حركة المخزون بحسب المستودع', 'Inventory movement by warehouse')
            : t('حركة المخزون', 'Inventory movement');
        const filtered = byWarehouse && _accountingUiState.warehouseId
            ? movs.filter((m) => m.warehouseId === _accountingUiState.warehouseId)
            : movs;
        const body = `<div class="section-header property-section-h">${title}</div>${accountingReportMetaLine(getAccountingReportDateFilters())}
            ${accountingReportTableWrap(`<tr><th>${t('التاريخ', 'Date')}</th><th>${t('الصنف', 'Item')}</th><th>${t('المستودع', 'Warehouse')}</th><th>${t('النوع', 'Type')}</th><th>${t('الكمية', 'Qty')}</th><th>${t('التكلفة', 'Cost')}</th><th>${t('مرجع', 'Ref')}</th></tr>`,
            filtered.map((m) => `<tr><td>${escHtml(m.date || '—')}</td><td>${escHtml(itemLabel(m.itemId))}</td><td>${escHtml(whLabel(m.warehouseId))}</td><td>${escHtml(m.type || '—')}</td><td>${escHtml(m.qty)}</td><td>${escHtml(summaryAmtOm((parseFloat(m.qty) || 0) * (parseFloat(m.unitCost) || 0)))}</td><td>${escHtml(m.ref || '—')}</td></tr>`).join('') || `<tr><td colspan="7">${t('لا توجد حركات — أضف أصنافاً ومستودعاتاً من تبويب المخزون.', 'No movements — add items/warehouses in Inventory tab.')}</td></tr>`)}`;
        printWithSiteStandard(title, body, { orientation: 'landscape' });
    }

    function printAccountingInventoryMonthlySummary() {
        const reg = loadAccountingRegistry();
        const map = {};
        (reg.stockMovements || []).forEach((m) => {
            const mo = toStr(m.date).slice(0, 7);
            if (!mo) return;
            const val = (parseFloat(m.qty) || 0) * (parseFloat(m.unitCost) || 0);
            const sign = toStr(m.type) === 'out' ? -1 : 1;
            map[mo] = (map[mo] || 0) + sign * val;
        });
        const title = t('الملخص الشهري للمخزون', 'Monthly inventory summary');
        const rows = Object.keys(map).sort().map((mo) => `<tr><td>${escHtml(mo)}</td><td>${escHtml(summaryAmtOm(map[mo]))}</td></tr>`).join('');
        const body = `<div class="section-header property-section-h">${title}</div>${accountingReportMetaLine(getAccountingReportDateFilters())}
            ${accountingReportTableWrap(`<tr><th>${t('الشهر', 'Month')}</th><th>${t('صافي الحركة', 'Net movement')}</th></tr>`, rows || `<tr><td colspan="2">—</td></tr>`)}`;
        printWithSiteStandard(title, body);
    }

    function printAccountingConsolidatedReport(kind) {
        const titleMap = {
            income: t('قائمة الدخل الموحدة', 'Consolidated income statement'),
            cash: t('التدفق النقدي الموحد', 'Consolidated cash flow'),
            balance: t('قائمة المركز المالي الموحدة', 'Consolidated balance sheet')
        };
        const title = titleMap[kind] || titleMap.income;
        const note = t('تقرير موحّد على مستوى الكيان الحالي (الفروع من المباني). لعدة كيانات قانونية أضف فروعاً في الإعدادات.', 'Consolidated at current entity level (branches from buildings). Add branches in settings for multi-entity.');
        if (kind === 'income') printAccountingIncomeStatement();
        else if (kind === 'cash') printAccountingCashFlowReport(false);
        else printAccountingBalanceSheet();
    }

    function accountingReportBadgeHtml(status) {
        const map = {
            ready: ['acct-report-badge--ready', t('جاهز', 'Ready')],
            partial: ['acct-report-badge--partial', t('جزئي', 'Partial')],
            soon: ['acct-report-badge--soon', t('قريباً', 'Soon')],
            new: ['acct-report-badge--new', t('جديد', 'New')]
        };
        const hit = map[status] || map.ready;
        return `<span class="acct-report-badge ${hit[0]}">${hit[1]}</span>`;
    }

    function getAccountingReportCatalog() {
        return [
            {
                id: 'financial',
                title: t('تقارير مالية', 'Financial reports'),
                reports: [
                    { id: 'income_statement', title: t('قائمة الدخل', 'Income statement'), status: 'ready' },
                    { id: 'income_by_branch', title: t('قائمة الدخل بحسب الفرع', 'Income statement by branch'), status: 'partial', hint: t('الفرع = المبنى', 'Branch = building') },
                    { id: 'income_by_cost_center', title: t('قائمة الدخل بحسب مركز التكلفة', 'Income by cost center'), status: 'partial', hint: t('مركز التكلفة = الوحدة', 'Cost center = unit') },
                    { id: 'income_by_project', title: t('قائمة الدخل بحسب المشروع', 'Income by project'), status: 'partial', hint: t('المشروع = رقم العقد', 'Project = contract no.') },
                    { id: 'cash_flow_direct', title: t('التدفق النقدي', 'Cash flow'), status: 'ready' },
                    { id: 'cash_flow_indirect', title: t('التدفقات النقدية — الطريقة غير المباشرة', 'Cash flow — indirect'), status: 'ready', badge: 'new' },
                    { id: 'balance_sheet', title: t('قائمة المركز المالي', 'Balance sheet'), status: 'ready' },
                    { id: 'bank_accounts', title: t('الحسابات البنكية', 'Bank accounts'), status: 'ready', badge: 'new' },
                    { id: 'cash_forecast', title: t('التوقعات النقدية', 'Cash forecast'), status: 'ready' },
                    { id: 'management_pdf', title: t('تقارير الإدارة (PDF)', 'Management reports (PDF)'), status: 'soon' }
                ]
            },
            {
                id: 'consolidated',
                title: t('التقارير المالية الموحدة', 'Consolidated financial reports'),
                reports: [
                    { id: 'consolidated_income', title: t('قائمة الدخل الموحدة', 'Consolidated P&L'), status: 'partial' },
                    { id: 'consolidated_cash', title: t('التدفق النقدي الموحد', 'Consolidated cash flow'), status: 'partial' },
                    { id: 'consolidated_balance', title: t('قائمة المركز المالي الموحدة', 'Consolidated balance sheet'), status: 'partial' }
                ]
            },
            {
                id: 'sales',
                title: t('مبيعات', 'Sales'),
                reports: [
                    { id: 'client_statement', title: t('كشف حساب عميل', 'Client statement'), status: 'ready' },
                    { id: 'client_statement_detail', title: t('كشف حساب عميل — مفصّل', 'Client statement — detailed'), status: 'ready', badge: 'new' },
                    { id: 'ar_aging', title: t('تقادم الحسابات المدينة', 'AR aging'), status: 'ready' },
                    { id: 'ar_aging_detail', title: t('تقادم الحسابات المدينة — مفصّل', 'AR aging — detailed'), status: 'ready' },
                    { id: 'sales_by_client', title: t('المبيعات بحسب العميل', 'Sales by client'), status: 'ready' },
                    { id: 'sales_by_branch', title: t('المبيعات بحسب الفرع', 'Sales by branch'), status: 'ready' },
                    { id: 'sales_by_project', title: t('المبيعات بحسب المشروع', 'Sales by project'), status: 'partial' },
                    { id: 'sales_by_product', title: t('المبيعات بحسب المنتج أو الخدمة', 'Sales by product/service'), status: 'ready' }
                ]
            },
            {
                id: 'purchases',
                title: t('مشتريات', 'Purchases'),
                reports: [
                    { id: 'vendor_statement', title: t('كشف حساب مورد', 'Vendor statement'), status: 'ready' },
                    { id: 'vendor_statement_detail', title: t('كشف حساب مورد — مفصّل', 'Vendor statement — detailed'), status: 'ready', badge: 'new' },
                    { id: 'ap_aging', title: t('تقادم الحسابات الدائنة', 'AP aging'), status: 'partial' },
                    { id: 'ap_aging_detail', title: t('تقادم الحسابات الدائنة — مفصّل', 'AP aging — detailed'), status: 'partial' },
                    { id: 'invoices_by_vendor', title: t('الفواتير بحسب المورد', 'Invoices by vendor'), status: 'ready' },
                    { id: 'invoices_by_branch', title: t('الفواتير بحسب الفرع', 'Invoices by branch'), status: 'ready' },
                    { id: 'expenses_by_vendor', title: t('المصروفات بحسب مورد', 'Expenses by vendor'), status: 'ready' },
                    { id: 'expenses_by_branch', title: t('المصروفات بحسب الفرع', 'Expenses by branch'), status: 'ready' },
                    { id: 'purchases_by_product', title: t('مشتريات بحسب المنتج أو الخدمة', 'Purchases by product'), status: 'ready' }
                ]
            },
            {
                id: 'payroll',
                title: t('الرواتب', 'Payroll'),
                reports: [
                    { id: 'employee_statement', title: t('كشف حساب موظف', 'Employee statement'), status: 'partial' },
                    { id: 'employee_statement_detail', title: t('كشف حساب موظف — مفصّل', 'Employee statement — detailed'), status: 'partial', badge: 'new' }
                ]
            },
            {
                id: 'forecast',
                title: t('توقعات', 'Forecast'),
                reports: [
                    { id: 'cash_forecast_tab', title: t('التوقعات النقدية', 'Cash forecast'), status: 'ready' }
                ]
            },
            {
                id: 'tax',
                title: t('تقارير الضرائب', 'Tax reports'),
                reports: [
                    { id: 'tax_summary', title: t('الضرائب', 'Taxes'), status: 'soon' },
                    { id: 'tax_detail', title: t('الضرائب — مفصّل', 'Taxes — detailed'), status: 'soon' }
                ]
            },
            {
                id: 'accountant',
                title: t('للمحاسب', 'For accountant'),
                reports: [
                    { id: 'journal_register', title: t('دفتر القيود اليومية', 'Journal register'), status: 'ready', badge: 'new' },
                    { id: 'trial_balance', title: t('ميزان المراجعة', 'Trial balance'), status: 'ready' },
                    { id: 'account_statement', title: t('كشف الحساب', 'Account statement'), status: 'ready' },
                    { id: 'account_statement_detail', title: t('كشف الحساب — مفصّل', 'Account statement — detailed'), status: 'ready', badge: 'new' },
                    { id: 'general_ledger', title: t('دفتر الأستاذ العام', 'General ledger'), status: 'ready' },
                    { id: 'audit_log', title: t('سجل التدقيق', 'Audit log'), status: 'ready' },
                    { id: 'bank_reconciliation', title: t('تقرير تسوية مصرفية', 'Bank reconciliation'), status: 'ready' },
                    { id: 'fx_revaluation', title: t('إعادة تقييم العملة الأجنبية', 'FX revaluation'), status: 'soon' }
                ]
            },
            {
                id: 'inventory',
                title: t('مخزون', 'Inventory'),
                reports: [
                    { id: 'inventory_movement', title: t('حركة المخزون', 'Inventory movement'), status: 'partial' },
                    { id: 'inventory_by_warehouse', title: t('حركة المخزون بحسب المستودع', 'Movement by warehouse'), status: 'partial' },
                    { id: 'inventory_monthly', title: t('الملخص الشهري للمخزون', 'Monthly inventory summary'), status: 'partial' }
                ]
            }
        ];
    }

    function runAccountingReport(reportId) {
        const needsParty = ['client_statement', 'client_statement_detail', 'vendor_statement', 'vendor_statement_detail', 'employee_statement', 'employee_statement_detail'];
        const needsCoa = ['account_statement', 'account_statement_detail', 'general_ledger'];
        const needsDimension = ['income_by_branch', 'income_by_cost_center', 'income_by_project'];
        if (needsParty.includes(reportId)) {
            const kind = reportId.startsWith('client') ? 'client' : reportId.startsWith('vendor') ? 'vendor' : 'employee';
            openAccountingReportPartyPicker(reportId, kind);
            return;
        }
        if (needsCoa.includes(reportId)) {
            openAccountingReportCoaPicker(reportId);
            return;
        }
        if (needsDimension.includes(reportId)) {
            openAccountingReportDimensionPicker(reportId);
            return;
        }
        if (reportId === 'inventory_by_warehouse') {
            openAccountingReportWarehousePicker();
            return;
        }
        const handlers = {
            income_statement: () => printAccountingIncomeStatement(),
            income_by_branch: () => printAccountingIncomeStatement('branch'),
            income_by_cost_center: () => printAccountingIncomeStatement('cost_center'),
            income_by_project: () => printAccountingIncomeStatement('project'),
            cash_flow_direct: () => printAccountingCashFlowReport(false),
            cash_flow_indirect: () => printAccountingCashFlowReport(true),
            balance_sheet: () => printAccountingBalanceSheet(),
            bank_accounts: () => printAccountingBankAccountsReport(),
            cash_forecast: () => printAccountingCashForecast(),
            cash_forecast_tab: () => printAccountingCashForecast(),
            consolidated_income: () => printAccountingConsolidatedReport('income'),
            consolidated_cash: () => printAccountingConsolidatedReport('cash'),
            consolidated_balance: () => printAccountingConsolidatedReport('balance'),
            ar_aging: () => printAccountingAgingReport('ar', false),
            ar_aging_detail: () => printAccountingAgingReport('ar', true),
            ap_aging: () => printAccountingAgingReport('ap', false),
            ap_aging_detail: () => printAccountingAgingReport('ap', true),
            sales_by_client: () => printAccountingGroupedSalesReport('client'),
            sales_by_branch: () => printAccountingGroupedSalesReport('branch'),
            sales_by_project: () => printAccountingGroupedSalesReport('project'),
            sales_by_product: () => printAccountingGroupedSalesReport('product'),
            invoices_by_vendor: () => printAccountingGroupedPurchasesReport('vendor'),
            invoices_by_branch: () => printAccountingGroupedPurchasesReport('branch'),
            expenses_by_vendor: () => printAccountingGroupedPurchasesReport('expense_vendor'),
            expenses_by_branch: () => printAccountingGroupedPurchasesReport('expense_branch'),
            purchases_by_product: () => printAccountingGroupedPurchasesReport('product'),
            trial_balance: () => printAccountingTrialBalance(),
            journal_register: () => printAccountingJournalRegister(),
            audit_log: () => printAccountingAuditLogReport(),
            bank_reconciliation: () => printAccountingBankReconciliationReport(),
            inventory_movement: () => printAccountingInventoryMovementReport(false),
            inventory_monthly: () => printAccountingInventoryMonthlySummary(),
            tax_summary: () => alert(t('تقرير الضرائب يتطلب إعداد حقول الضريبة على الفواتير — قيد التطوير.', 'Tax report requires invoice tax fields — in development.')),
            tax_detail: () => alert(t('تقرير الضرائب المفصّل — قيد التطوير.', 'Detailed tax report — in development.')),
            management_pdf: () => {
                printAccountingIncomeStatement();
                setTimeout(() => printAccountingBalanceSheet(), 400);
            },
            fx_revaluation: () => alert(t('إعادة تقييم العملة الأجنبية — قيد التطوير.', 'FX revaluation — in development.'))
        };
        const fn = handlers[reportId];
        if (fn) fn();
        else alert(t('التقرير غير متوفر بعد.', 'Report not available yet.'));
    }

    function closeAccountingReportModal() {
        document.getElementById('accountingReportModal')?.classList.remove('open');
    }

    function openAccountingReportPartyPicker(reportId, kind) {
        const modal = document.getElementById('accountingReportModal');
        const body = document.getElementById('accountingReportModalBody');
        const title = document.getElementById('accountingReportModalTitle');
        if (!modal || !body || !title) return;
        const parties = accountingCollectUniqueParties(kind);
        title.textContent = t('اختر الجهة', 'Select party');
        const opts = parties.map((p) => `<option value="${escHtml(p)}">${escHtml(p)}</option>`).join('');
        body.innerHTML = `
            <div class="input-group"><label>${t('الجهة', 'Party')}</label>
                <select id="acctReportPartyPick">${opts || `<option value="">${t('لا توجد جهات', 'No parties')}</option>`}</select></div>
            <button type="button" class="btn-primary mini-btn" onclick="confirmAccountingReportParty('${escHtml(reportId)}')">${t('عرض التقرير', 'Run report')}</button>`;
        modal.classList.add('open');
    }

    function confirmAccountingReportParty(reportId) {
        const party = toStr(document.getElementById('acctReportPartyPick')?.value).trim();
        if (!party) return;
        closeAccountingReportModal();
        const detailed = reportId.includes('detail');
        if (reportId.startsWith('client')) printAccountingPartyStatement(party, detailed);
        else if (reportId.startsWith('vendor')) printAccountingPartyStatement(party, detailed);
        else printAccountingPartyStatement(party, detailed);
    }

    function openAccountingReportCoaPicker(reportId) {
        const modal = document.getElementById('accountingReportModal');
        const body = document.getElementById('accountingReportModalBody');
        const title = document.getElementById('accountingReportModalTitle');
        if (!modal || !body || !title) return;
        title.textContent = t('اختر الحساب', 'Select account');
        const accounts = getChartOfAccounts().filter((a) => a.leaf || a.allowPost);
        const opts = accounts.map((a) => `<option value="${escHtml(a.id)}">${escHtml(a.code)} — ${escHtml(coaAccountLabel(a))}</option>`).join('');
        body.innerHTML = `
            <div class="input-group"><label>${t('حساب الدفتر', 'GL account')}</label>
                <select id="acctReportCoaPick">${opts}</select></div>
            <button type="button" class="btn-primary mini-btn" onclick="confirmAccountingReportCoa('${escHtml(reportId)}')">${t('عرض التقرير', 'Run report')}</button>`;
        modal.classList.add('open');
    }

    function confirmAccountingReportCoa(reportId) {
        const coaId = toStr(document.getElementById('acctReportCoaPick')?.value);
        if (!coaId) return;
        closeAccountingReportModal();
        const detailed = reportId.includes('detail');
        if (reportId === 'general_ledger') printAccountingGeneralLedger(coaId, false);
        else printAccountingGeneralLedger(coaId, detailed);
    }

    function openAccountingReportDimensionPicker(reportId) {
        const modal = document.getElementById('accountingReportModal');
        const body = document.getElementById('accountingReportModalBody');
        const title = document.getElementById('accountingReportModalTitle');
        if (!modal || !body || !title) return;
        const reg = loadAccountingRegistry();
        let label = '';
        let opts = '';
        if (reportId === 'income_by_branch') {
            label = t('الفرع (مبنى)', 'Branch (building)');
            const set = new Set();
            getUnitsData().forEach((u) => { if (u.building) set.add(u.building); });
            (reg.cheques || []).forEach((c) => { if (c.building) set.add(c.building); });
            opts = [...set].sort().map((b) => `<option value="${escHtml(b)}">${escHtml(b)}</option>`).join('');
            _accountingUiState.reportBranch = '';
        } else if (reportId === 'income_by_cost_center') {
            label = t('مركز التكلفة (وحدة)', 'Cost center (unit)');
            const set = new Set();
            getUnitsData().forEach((u) => { if (u.unit) set.add(u.unit); });
            opts = [...set].sort((a, b) => normalizeUnit(a).localeCompare(normalizeUnit(b), undefined, { numeric: true }))
                .map((u) => `<option value="${escHtml(u)}">${escHtml(u)}</option>`).join('');
        } else {
            label = t('المشروع (رقم عقد)', 'Project (contract no.)');
            const set = new Set();
            getUnitsData().forEach((u) => { if (u.agreementNo) set.add(u.agreementNo); });
            (reg.entries || []).forEach((e) => { if (e.agreementNo) set.add(e.agreementNo); });
            opts = [...set].sort().map((p) => `<option value="${escHtml(p)}">${escHtml(p)}</option>`).join('');
        }
        title.textContent = label;
        body.innerHTML = `
            <div class="input-group"><label>${label}</label>
                <select id="acctReportDimPick">${opts || `<option value="">${t('لا توجد بيانات', 'No data')}</option>`}</select></div>
            <button type="button" class="btn-primary mini-btn" onclick="confirmAccountingReportDimension('${escHtml(reportId)}')">${t('عرض التقرير', 'Run report')}</button>`;
        modal.classList.add('open');
    }

    function confirmAccountingReportDimension(reportId) {
        const val = toStr(document.getElementById('acctReportDimPick')?.value);
        if (!val) return;
        if (reportId === 'income_by_branch') _accountingUiState.reportBranch = val;
        else if (reportId === 'income_by_cost_center') _accountingUiState.reportCostCenter = val;
        else _accountingUiState.reportProject = val;
        closeAccountingReportModal();
        const dim = reportId === 'income_by_branch' ? 'branch' : reportId === 'income_by_cost_center' ? 'cost_center' : 'project';
        printAccountingIncomeStatement(dim);
    }

    function openAccountingReportWarehousePicker() {
        const reg = loadAccountingRegistry();
        const modal = document.getElementById('accountingReportModal');
        const body = document.getElementById('accountingReportModalBody');
        const title = document.getElementById('accountingReportModalTitle');
        if (!modal || !body || !title) return;
        title.textContent = t('اختر المستودع', 'Select warehouse');
        const opts = (reg.warehouses || []).map((w) => {
            const lbl = appUiLanguage === 'en' ? (w.nameEn || w.nameAr) : (w.nameAr || w.nameEn);
            return `<option value="${escHtml(w.id)}">${escHtml(lbl)}</option>`;
        }).join('');
        body.innerHTML = `
            <div class="input-group"><label>${t('المستودع', 'Warehouse')}</label>
                <select id="acctReportWhPick">${opts || `<option value="">${t('أضف مستودعاً أولاً', 'Add a warehouse first')}</option>`}</select></div>
            <button type="button" class="btn-primary mini-btn" onclick="confirmAccountingReportWarehouse()">${t('عرض التقرير', 'Run report')}</button>`;
        modal.classList.add('open');
    }

    function confirmAccountingReportWarehouse() {
        _accountingUiState.warehouseId = toStr(document.getElementById('acctReportWhPick')?.value);
        closeAccountingReportModal();
        printAccountingInventoryMovementReport(true);
    }

    function renderAccountingReportsHub() {
        const q = toStr(_accountingUiState.reportSearch).trim().toLowerCase();
        const catalog = getAccountingReportCatalog();
        const sections = catalog.map((sec) => {
            const reports = sec.reports.filter((r) => {
                if (!q) return true;
                return toStr(r.title).toLowerCase().includes(q) || toStr(r.id).includes(q);
            });
            if (!reports.length) return '';
            const cards = reports.map((r) => {
                const disabled = r.status === 'soon';
                const badge = r.badge || r.status;
                const hint = r.hint ? `<span class="acct-report-card__meta">${escHtml(r.hint)}</span>` : '';
                return `<button type="button" class="acct-report-card${disabled ? ' acct-report-card--soon' : ''}" data-acct-report="${escHtml(r.id)}" ${disabled ? 'disabled' : ''}>
                    ${accountingReportBadgeHtml(badge)}
                    <span class="acct-report-card__title">${escHtml(r.title)}</span>${hint}
                </button>`;
            }).join('');
            return `<section><h4 class="acct-reports-section-title">${escHtml(sec.title)}</h4><div class="acct-reports-grid">${cards}</div></section>`;
        }).filter(Boolean).join('');
        return `<div class="acct-reports-hub">
            <div class="acct-reports-toolbar">
                <input type="search" placeholder="${t('بحث في التقارير...', 'Search reports...')}" value="${escHtml(_accountingUiState.reportSearch || '')}" oninput="_accountingUiState.reportSearch=this.value; scheduleAccountingWorkspaceRender()" style="min-width:220px;flex:1">
                <input type="date" title="${t('من تاريخ', 'From')}" value="${escHtml(_accountingUiState.dueDateFrom || '')}" onchange="_accountingUiState.dueDateFrom=this.value; renderAccountingWorkspace()">
                <input type="date" title="${t('إلى تاريخ', 'To')}" value="${escHtml(_accountingUiState.dueDateTo || '')}" onchange="_accountingUiState.dueDateTo=this.value; renderAccountingWorkspace()">
                <button type="button" class="btn-outline mini-btn" onclick="Object.assign(_accountingUiState,{dueDateFrom:'',dueDateTo:''}); renderAccountingWorkspace()">${t('مسح التاريخ', 'Clear dates')}</button>
            </div>
            ${sections || `<p style="color:#666;padding:12px">${t('لا توجد تقارير مطابقة.', 'No matching reports.')}</p>`}
        </div>`;
    }

    function renderAccountingPayrollHub() {
        const reg = loadAccountingRegistry();
        ensureAccountingRegistryExtensions(reg);
        const employees = reg.employees || [];
        const runs = reg.payrollRuns || [];
        const empRows = employees.map((e) => {
            const name = appUiLanguage === 'en' ? (e.nameEn || e.nameAr || e.name) : (e.nameAr || e.nameEn || e.name);
            return `<tr>
                <td>${escHtml(e.employeeNo || '—')}</td>
                <td>${escHtml(name || '—')}</td>
                <td>${e.active !== false ? t('نشط', 'Active') : t('موقوف', 'Inactive')}</td>
                <td><button type="button" class="btn-outline mini-btn" onclick="deleteAccountingEmployee('${escHtml(e.id)}')">${t('حذف', 'Delete')}</button></td>
            </tr>`;
        }).join('');
        const runRows = runs.slice(-20).reverse().map((r) => `<tr>
            <td>${escHtml(r.payDate || '—')}</td>
            <td>${escHtml(r.employeeName || '—')}</td>
            <td>${escHtml(summaryAmtOm(r.netAmount))}</td>
            <td>${escHtml(r.voucherNo || '—')}</td>
        </tr>`).join('');
        return `<div class="insight-nested" style="padding:12px;margin-bottom:14px;border-radius:10px">
            <p style="margin:0 0 8px;font-size:13px">${t('نظام الرواتب مرتبط بحسابات coa_213 (أجور مستحقة) و coa_123 (سلف الموظفين). سجّل الموظفين ثم أنشئ دفعة راتب لإنشاء قيد مصروف تلقائياً.', 'Payroll links to coa_213 (accrued wages) and coa_123 (employee advances). Register employees then create a pay run to post expense entries.')}</p>
        </div>
        <div class="row-2cols" style="margin-bottom:14px;padding:12px;border:1px solid #dce5ec;border-radius:10px">
            <h5 style="grid-column:1/-1;margin:0 0 8px">${t('إضافة موظف', 'Add employee')}</h5>
            <div class="input-group"><label>${t('الاسم', 'Name')}</label><input type="text" id="payrollEmpName"></div>
            <div class="input-group"><label>${t('رقم الموظف', 'Employee no.')}</label><input type="text" id="payrollEmpNo"></div>
            <div class="input-group" style="align-self:end"><button type="button" class="btn-primary mini-btn" onclick="saveAccountingEmployeeFromForm()">${t('حفظ', 'Save')}</button></div>
        </div>
        <div class="row-2cols" style="margin-bottom:14px;padding:12px;border:1px solid #dce5ec;border-radius:10px">
            <h5 style="grid-column:1/-1;margin:0 0 8px">${t('دفعة راتب', 'Pay run')}</h5>
            <div class="input-group"><label>${t('الموظف', 'Employee')}</label>
                <select id="payrollRunEmployee"><option value="">—</option>${employees.map((e) => {
                    const name = e.nameAr || e.nameEn || e.name;
                    return `<option value="${escHtml(e.id)}">${escHtml(name)}</option>`;
                }).join('')}</select></div>
            <div class="input-group"><label>${t('صافي الراتب', 'Net pay')}</label><input type="number" id="payrollRunAmount" min="0" step="0.001"></div>
            <div class="input-group"><label>${t('تاريخ الدفع', 'Pay date')}</label><input type="date" id="payrollRunDate" value="${new Date().toISOString().slice(0, 10)}"></div>
            <div class="input-group" style="align-self:end"><button type="button" class="btn-primary mini-btn" onclick="submitAccountingPayrollRun()">${t('تسجيل وإنشاء مصروف', 'Post pay run')}</button></div>
        </div>
        <h5 style="margin:0 0 8px">${t('الموظفون', 'Employees')}</h5>
        <div class="table-wrap" style="margin-bottom:16px"><table class="data-table" style="width:100%;font-size:12px">
            <thead><tr><th>${t('الرقم', 'No.')}</th><th>${t('الاسم', 'Name')}</th><th>${t('الحالة', 'Status')}</th><th>${t('إجراء', 'Action')}</th></tr></thead>
            <tbody>${empRows || `<tr><td colspan="4" style="text-align:center;color:#666">${t('لا يوجد موظفون', 'No employees')}</td></tr>`}</tbody>
        </table></div>
        <h5 style="margin:0 0 8px">${t('آخر دفعات الرواتب', 'Recent pay runs')}</h5>
        <div class="table-wrap"><table class="data-table" style="width:100%;font-size:12px">
            <thead><tr><th>${t('التاريخ', 'Date')}</th><th>${t('الموظف', 'Employee')}</th><th>${t('المبلغ', 'Amount')}</th><th>${t('السند', 'Voucher')}</th></tr></thead>
            <tbody>${runRows || `<tr><td colspan="4" style="text-align:center;color:#666">—</td></tr>`}</tbody>
        </table></div>`;
    }

    function saveAccountingEmployeeFromForm() {
        const reg = loadAccountingRegistry();
        ensureAccountingRegistryExtensions(reg);
        const name = toStr(document.getElementById('payrollEmpName')?.value).trim();
        const employeeNo = toStr(document.getElementById('payrollEmpNo')?.value).trim();
        if (!name) return alert(t('أدخل اسم الموظف.', 'Enter employee name.'));
        reg.employees.push({
            id: `emp_${Date.now()}`,
            nameAr: name,
            nameEn: name,
            employeeNo: employeeNo || `E${String(reg.employees.length + 1).padStart(3, '0')}`,
            active: true
        });
        saveAccountingRegistry(reg);
        renderAccountingWorkspace();
    }

    function deleteAccountingEmployee(id) {
        if (!confirm(t('حذف الموظف؟', 'Delete employee?'))) return;
        const reg = loadAccountingRegistry();
        reg.employees = (reg.employees || []).filter((e) => e.id !== id);
        saveAccountingRegistry(reg);
        renderAccountingWorkspace();
    }

    function submitAccountingPayrollRun() {
        const reg = loadAccountingRegistry();
        ensureAccountingRegistryExtensions(reg);
        const empId = toStr(document.getElementById('payrollRunEmployee')?.value);
        const amount = parseFloat(document.getElementById('payrollRunAmount')?.value);
        const payDate = toStr(document.getElementById('payrollRunDate')?.value) || new Date().toISOString().slice(0, 10);
        const emp = (reg.employees || []).find((e) => e.id === empId);
        if (!emp || !Number.isFinite(amount) || amount <= 0) return alert(t('اختر موظفاً ومبلغاً صحيحاً.', 'Select employee and valid amount.'));
        const name = emp.nameAr || emp.nameEn || emp.name;
        const voucherNo = commitNextManualVoucherNo('expense');
        const entry = {
            id: `ent_${Date.now()}`,
            type: 'expense',
            title: t('راتب', 'Payroll') + ` — ${name}`,
            partyName: name,
            amount,
            dueDate: payDate,
            status: 'pending_accountant',
            coaAccountId: 'coa_526',
            counterCoaAccountId: 'coa_213',
            payrollEmployeeId: emp.id,
            journalLines: [
                { coaAccountId: 'coa_526', debit: amount, credit: 0, memo: t('رواتب', 'Wages') },
                { coaAccountId: 'coa_213', debit: 0, credit: amount, memo: t('أجور مستحقة', 'Accrued wages') }
            ],
            voucherNo,
            createdAt: new Date().toISOString()
        };
        reg.entries.push(entry);
        reg.payrollRuns.push({
            id: `pr_${Date.now()}`,
            employeeId: emp.id,
            employeeName: name,
            netAmount: amount,
            payDate,
            entryId: entry.id,
            voucherNo
        });
        saveAccountingRegistry(reg);
        renderAccountingWorkspace();
        alert(t('تم إنشاء دفعة الراتب وبانتظار الاعتماد.', 'Pay run created and pending approval.'));
    }

    function renderOpeningBalanceCoaOptions(selectedId) {
        const sel = resolveCoaAccountId(selectedId);
        return getChartOfAccounts()
            .filter((a) => isCoaPostable(a.id))
            .map((a) => `<option value="${escHtml(a.id)}"${a.id === sel ? ' selected' : ''}>${escHtml(a.code)} — ${escHtml(coaAccountLabel(a))}</option>`)
            .join('');
    }

    function saveAccountingOpeningBalanceFromForm() {
        const reg = loadAccountingRegistry();
        const coaAccountId = resolveCoaAccountId(toStr(document.getElementById('obCoaAccount')?.value));
        const debit = parseFloat(document.getElementById('obDebit')?.value) || 0;
        const credit = parseFloat(document.getElementById('obCredit')?.value) || 0;
        const date = toStr(document.getElementById('obDate')?.value) || new Date().toISOString().slice(0, 10);
        if (!coaAccountId || !isCoaPostable(coaAccountId)) {
            alert(t('اختر حساباً تفصيلياً قابلاً للترحيل.', 'Select a postable detail account.'));
            return;
        }
        if ((debit <= 0 && credit <= 0) || (debit > 0 && credit > 0)) {
            alert(t('أدخل مبلغ مدين أو دائن فقط (ليس الاثنين).', 'Enter either debit or credit, not both.'));
            return;
        }
        const lines = [
            { coaAccountId, debit, credit: 0 },
            { coaAccountId: 'coa_311', debit: credit, credit: debit }
        ];
        const check = validateAccountingJournalLines(lines.map((ln, i) => normalizeAccountingJournalLine(ln, i)));
        if (!check.ok) {
            alert(t('القيد الافتتاحي غير متوازن.', 'Opening entry is not balanced.'));
            return;
        }
        reg.openingBalances.push({
            id: `ob_${Date.now()}`,
            coaAccountId,
            debit,
            credit,
            date,
            ref: 'OPEN',
            createdAt: new Date().toISOString()
        });
        saveAccountingRegistry(reg);
        renderAccountingWorkspace();
    }

    function removeAccountingOpeningBalance(obId) {
        if (!assertPermissionOrAlert('manage_accounting', 'لا تملك صلاحية تعديل المحاسبة.', 'No permission to edit accounting.')) return;
        const reg = loadAccountingRegistry();
        reg.openingBalances = (reg.openingBalances || []).filter((ob) => ob.id !== obId);
        saveAccountingRegistry(reg);
        renderAccountingWorkspace();
    }

    function submitAccountingBankTransferFromForm() {
        if (!assertPermissionOrAlert('manage_accounting', 'لا تملك صلاحية إدارة المحاسبة.', 'No permission to manage accounting.')) {
            return;
        }
        const fromId = toStr(document.getElementById('bankXferFrom')?.value);
        const toId = toStr(document.getElementById('bankXferTo')?.value);
        const amount = parseFloat(document.getElementById('bankXferAmount')?.value) || 0;
        const date = toStr(document.getElementById('bankXferDate')?.value) || new Date().toISOString().slice(0, 10);
        const note = toStr(document.getElementById('bankXferNote')?.value).trim();
        if (!fromId || !toId) {
            alert(t('اختر حسابي المصدر والوجهة.', 'Select source and destination accounts.'));
            return;
        }
        if (fromId === toId) {
            alert(t('لا يمكن التحويل إلى نفس الحساب.', 'Cannot transfer to the same account.'));
            return;
        }
        if (amount <= 0) {
            alert(t('أدخل مبلغاً صحيحاً.', 'Enter a valid amount.'));
            return;
        }
        const actor = getCurrentActorLedgerRecord();
        const reg = loadAccountingRegistry();
        if (!Array.isArray(reg.bankTransfers)) reg.bankTransfers = [];
        const xfer = {
            id: newAccountingId('bxfer'),
            fromBankAccountId: fromId,
            toBankAccountId: toId,
            amount,
            date,
            note,
            createdAt: new Date().toISOString(),
            createdByName: actor.staffName,
            createdByUserId: actor.staffUserId
        };
        reg.bankTransfers.push(xfer);
        reg._journalLedgerDirty = true;
        ensureAccountingJournalLedger(reg, true);
        saveAccountingRegistry(reg);
        recordSystemActivity({
            actionKey: 'accounting_bank_transfer',
            actionAr: 'تحويل بين حسابات بنكية',
            actionEn: 'Bank account transfer',
            note: `${summaryAmtOm(amount)} — ${note}`
        });
        renderAccountingWorkspace();
    }

    function renderAccountingJournalsHub() {
        const reg = loadAccountingRegistry();
        ensureAccountingJournalLedger(reg, false);
        const journals = (reg.journals || [])
            .filter((j) => toStr(j.status) === 'posted')
            .filter(accountingJournalMatchesToolbarFilters)
            .slice()
            .sort((a, b) => toStr(b.date).localeCompare(toStr(a.date)) || toStr(b.entryNo).localeCompare(toStr(a.entryNo)));
        const rows = journals.map((j) => {
            const balanced = Math.abs((j.totalDebit || 0) - (j.totalCredit || 0)) < 0.001;
            const lineSummary = (j.lines || []).map((ln) => {
                const acct = coaAccountById(ln.coaAccountId);
                const lbl = acct ? `${acct.code}` : ln.coaAccountId;
                return `${lbl} ${ln.debit ? 'D:' + summaryAmtOm(ln.debit) : ''}${ln.credit ? ' C:' + summaryAmtOm(ln.credit) : ''}`;
            }).join('<br>');
            return `<tr>
                <td>${escHtml(j.date || '—')}</td>
                <td>${escHtml(j.entryNo || '—')}</td>
                <td>${escHtml(j.description || '—')}</td>
                <td style="font-size:11px">${lineSummary || '—'}</td>
                <td class="acct-wafeq-amt">${escHtml(summaryAmtOm(j.totalDebit || 0))}</td>
                <td class="acct-wafeq-amt">${escHtml(summaryAmtOm(j.totalCredit || 0))}</td>
                <td>${balanced ? `<span style="color:#1b5e20">${t('متوازن', 'Balanced')}</span>` : `<span style="color:#c62828">${t('غير متوازن', 'Unbalanced')}</span>`}</td>
                <td>${escHtml(j.referenceType)} / ${escHtml(j.referenceId)}</td>
            </tr>`;
        }).join('');
        const obRows = (reg.openingBalances || []).map((ob) => {
            const acct = coaAccountById(ob.coaAccountId);
            const lbl = acct ? `${acct.code} — ${coaAccountLabel(acct)}` : ob.coaAccountId;
            return `<tr>
                <td>${escHtml(ob.date || '—')}</td>
                <td>${escHtml(lbl)}</td>
                <td class="acct-wafeq-amt">${ob.debit ? escHtml(summaryAmtOm(ob.debit)) : '—'}</td>
                <td class="acct-wafeq-amt">${ob.credit ? escHtml(summaryAmtOm(ob.credit)) : '—'}</td>
                <td><button type="button" class="btn-outline mini-btn" onclick="removeAccountingOpeningBalance('${escHtml(ob.id)}')">🗑️</button></td>
            </tr>`;
        }).join('');
        return `<div class="insight-nested" style="padding:12px;margin-bottom:14px;border-radius:10px">
            <p style="margin:0 0 8px;font-size:13px">${t('مصدر التقارير المالية هو القيود المرحّلة فقط. كل سند معتمد أو شيك محصّل أو ضمان معتمد يُولّد قيداً مزدوجاً (مدين = دائن).', 'Financial reports use posted journal entries only. Each approved voucher, collected cheque, or approved deposit generates a balanced double entry.')}</p>
            <button type="button" class="btn-outline mini-btn" onclick="printAccountingJournalRegister()">🖨️ ${t('طباعة دفتر القيود', 'Print journal register')}</button>
        </div>
        <div class="row-2cols" style="margin-bottom:14px;padding:12px;border:1px solid #dce5ec;border-radius:10px">
            <h5 style="grid-column:1/-1;margin:0 0 8px">↔️ ${t('تحويل بين حسابات بنكية', 'Transfer between bank accounts')}</h5>
            <div class="input-group"><label>${t('من حساب', 'From account')}</label>
                <select id="bankXferFrom">${renderBankAccountSelectOptions('', '')}</select></div>
            <div class="input-group"><label>${t('إلى حساب', 'To account')}</label>
                <select id="bankXferTo">${renderBankAccountSelectOptions('', '')}</select></div>
            <div class="input-group"><label>${t('المبلغ', 'Amount')}</label>
                <input type="number" id="bankXferAmount" min="0" step="0.001" placeholder="0.000"></div>
            <div class="input-group"><label>${t('التاريخ', 'Date')}</label>
                <input type="date" id="bankXferDate" value="${new Date().toISOString().slice(0, 10)}"></div>
            <div class="input-group" style="grid-column:1/-1"><label>${t('البيان', 'Description')}</label>
                <input type="text" id="bankXferNote" placeholder="${t('مثال: تحويل من حساب المالك إلى حساب التشغيل', 'e.g. Owner to operations account')}"></div>
            <div class="input-group" style="align-self:end"><button type="button" class="btn-primary mini-btn" onclick="submitAccountingBankTransferFromForm()">${t('تسجيل التحويل', 'Post transfer')}</button></div>
        </div>
        <div class="row-2cols" style="margin-bottom:14px;padding:12px;border:1px solid #dce5ec;border-radius:10px">
            <h5 style="grid-column:1/-1;margin:0 0 8px">${t('أرصدة افتتاحية', 'Opening balances')}</h5>
            <div class="input-group"><label>${t('الحساب', 'Account')}</label>
                <select id="obCoaAccount"><option value="">—</option>${renderOpeningBalanceCoaOptions('')}</select></div>
            <div class="input-group"><label>${t('التاريخ', 'Date')}</label>
                <input type="date" id="obDate" value="${new Date().toISOString().slice(0, 10)}"></div>
            <div class="input-group"><label>${t('مدين', 'Debit')}</label>
                <input type="number" id="obDebit" min="0" step="0.001" placeholder="0.000"></div>
            <div class="input-group"><label>${t('دائن', 'Credit')}</label>
                <input type="number" id="obCredit" min="0" step="0.001" placeholder="0.000"></div>
            <div class="input-group" style="align-self:end"><button type="button" class="btn-primary mini-btn" onclick="saveAccountingOpeningBalanceFromForm()">${t('إضافة رصيد افتتاحي', 'Add opening balance')}</button></div>
        </div>
        ${(reg.openingBalances || []).length ? `<div class="table-wrap" style="margin-bottom:14px"><table class="data-table" style="width:100%;font-size:12px">
            <thead><tr><th>${t('التاريخ', 'Date')}</th><th>${t('الحساب', 'Account')}</th><th>${t('مدين', 'Debit')}</th><th>${t('دائن', 'Credit')}</th><th></th></tr></thead>
            <tbody>${obRows}</tbody>
        </table></div>` : ''}
        <div class="table-wrap"><table class="data-table" style="width:100%;font-size:12px">
            <thead><tr>
                <th>${t('التاريخ', 'Date')}</th>
                <th>${t('رقم القيد', 'Entry #')}</th>
                <th>${t('البيان', 'Description')}</th>
                <th>${t('السطور', 'Lines')}</th>
                <th>${t('مدين', 'Debit')}</th>
                <th>${t('دائن', 'Credit')}</th>
                <th>${t('التوازن', 'Balance')}</th>
                <th>${t('المرجع', 'Reference')}</th>
            </tr></thead>
            <tbody>${rows || `<tr><td colspan="8" style="text-align:center;padding:16px;color:#666">${t('لا توجد قيود مرحّلة بعد — اعتمد سنداً أو حصّل شيكاً.', 'No posted entries yet — approve a voucher or collect a cheque.')}</td></tr>`}</tbody>
        </table></div>`;
    }

    function renderAccountingInventoryHub() {
        const reg = loadAccountingRegistry();
        ensureAccountingRegistryExtensions(reg);
        const items = reg.inventoryItems || [];
        const whs = reg.warehouses || [];
        const itemRows = items.map((it) => {
            const name = appUiLanguage === 'en' ? (it.nameEn || it.nameAr) : (it.nameAr || it.nameEn);
            const qty = computeInventoryItemQty(it.id);
            return `<tr><td>${escHtml(it.sku || '—')}</td><td>${escHtml(name)}</td><td>${escHtml(qty)}</td><td>${escHtml(summaryAmtOm(it.costPrice || 0))}</td></tr>`;
        }).join('');
        const whOpts = whs.map((w) => {
            const lbl = appUiLanguage === 'en' ? (w.nameEn || w.nameAr) : (w.nameAr || w.nameEn);
            return `<option value="${escHtml(w.id)}">${escHtml(lbl)}</option>`;
        }).join('');
        return `<div class="insight-nested" style="padding:12px;margin-bottom:14px;border-radius:10px">
            <p style="margin:0;font-size:13px">${t('المخزون مرتبط بحساب coa_121. سجّل الأصناف والمستودعات ثم حركات الإدخال/الإخراج.', 'Inventory links to coa_121. Register items, warehouses, then stock in/out movements.')}</p>
        </div>
        <div class="row-2cols" style="margin-bottom:14px;padding:12px;border:1px solid #dce5ec;border-radius:10px">
            <h5 style="grid-column:1/-1;margin:0 0 8px">${t('مستودع', 'Warehouse')}</h5>
            <div class="input-group"><label>${t('الاسم', 'Name')}</label><input type="text" id="invWhName"></div>
            <div class="input-group" style="align-self:end"><button type="button" class="btn-outline mini-btn" onclick="saveAccountingWarehouseFromForm()">${t('إضافة مستودع', 'Add warehouse')}</button></div>
        </div>
        <div class="row-2cols" style="margin-bottom:14px;padding:12px;border:1px solid #dce5ec;border-radius:10px">
            <h5 style="grid-column:1/-1;margin:0 0 8px">${t('صنف', 'Item')}</h5>
            <div class="input-group"><label>${t('رمز SKU', 'SKU')}</label><input type="text" id="invItemSku"></div>
            <div class="input-group"><label>${t('الاسم', 'Name')}</label><input type="text" id="invItemName"></div>
            <div class="input-group"><label>${t('تكلفة الوحدة', 'Unit cost')}</label><input type="number" id="invItemCost" min="0" step="0.001"></div>
            <div class="input-group" style="align-self:end"><button type="button" class="btn-outline mini-btn" onclick="saveAccountingInventoryItemFromForm()">${t('إضافة صنف', 'Add item')}</button></div>
        </div>
        <div class="row-2cols" style="margin-bottom:14px;padding:12px;border:1px solid #dce5ec;border-radius:10px">
            <h5 style="grid-column:1/-1;margin:0 0 8px">${t('حركة مخزون', 'Stock movement')}</h5>
            <div class="input-group"><label>${t('الصنف', 'Item')}</label>
                <select id="invMovItem"><option value="">—</option>${items.map((it) => `<option value="${escHtml(it.id)}">${escHtml(it.nameAr || it.nameEn || it.sku)}</option>`).join('')}</select></div>
            <div class="input-group"><label>${t('المستودع', 'Warehouse')}</label>
                <select id="invMovWh"><option value="">—</option>${whOpts}</select></div>
            <div class="input-group"><label>${t('النوع', 'Type')}</label>
                <select id="invMovType"><option value="in">${t('إدخال', 'In')}</option><option value="out">${t('إخراج', 'Out')}</option></select></div>
            <div class="input-group"><label>${t('الكمية', 'Qty')}</label><input type="number" id="invMovQty" min="0" step="0.001"></div>
            <div class="input-group"><label>${t('التاريخ', 'Date')}</label><input type="date" id="invMovDate" value="${new Date().toISOString().slice(0, 10)}"></div>
            <div class="input-group" style="align-self:end"><button type="button" class="btn-primary mini-btn" onclick="submitAccountingStockMovement()">${t('تسجيل الحركة', 'Post movement')}</button></div>
        </div>
        <h5 style="margin:0 0 8px">${t('الأصناف والأرصدة', 'Items & balances')}</h5>
        <div class="table-wrap"><table class="data-table" style="width:100%;font-size:12px">
            <thead><tr><th>SKU</th><th>${t('الصنف', 'Item')}</th><th>${t('الكمية', 'Qty')}</th><th>${t('التكلفة', 'Cost')}</th></tr></thead>
            <tbody>${itemRows || `<tr><td colspan="4" style="text-align:center;color:#666">${t('لا توجد أصناف', 'No items')}</td></tr>`}</tbody>
        </table></div>`;
    }

    function computeInventoryItemQty(itemId) {
        const reg = loadAccountingRegistry();
        let qty = 0;
        (reg.stockMovements || []).forEach((m) => {
            if (m.itemId !== itemId) return;
            const q = parseFloat(m.qty) || 0;
            qty += toStr(m.type) === 'out' ? -q : q;
        });
        return parseFloat(qty.toFixed(3));
    }

    function saveAccountingWarehouseFromForm() {
        const reg = loadAccountingRegistry();
        const name = toStr(document.getElementById('invWhName')?.value).trim();
        if (!name) return;
        reg.warehouses.push({ id: `wh_${Date.now()}`, nameAr: name, nameEn: name, active: true });
        saveAccountingRegistry(reg);
        renderAccountingWorkspace();
    }

    function saveAccountingInventoryItemFromForm() {
        const reg = loadAccountingRegistry();
        const sku = toStr(document.getElementById('invItemSku')?.value).trim();
        const name = toStr(document.getElementById('invItemName')?.value).trim();
        const costPrice = parseFloat(document.getElementById('invItemCost')?.value) || 0;
        if (!name) return;
        reg.inventoryItems.push({ id: `item_${Date.now()}`, sku, nameAr: name, nameEn: name, costPrice, unit: 'pcs' });
        saveAccountingRegistry(reg);
        renderAccountingWorkspace();
    }

    function submitAccountingStockMovement() {
        const reg = loadAccountingRegistry();
        const itemId = toStr(document.getElementById('invMovItem')?.value);
        const warehouseId = toStr(document.getElementById('invMovWh')?.value);
        const type = toStr(document.getElementById('invMovType')?.value) || 'in';
        const qty = parseFloat(document.getElementById('invMovQty')?.value);
        const date = toStr(document.getElementById('invMovDate')?.value) || new Date().toISOString().slice(0, 10);
        const item = (reg.inventoryItems || []).find((x) => x.id === itemId);
        if (!item || !warehouseId || !Number.isFinite(qty) || qty <= 0) return alert(t('أكمل بيانات الحركة.', 'Complete movement data.'));
        reg.stockMovements.push({
            id: `sm_${Date.now()}`,
            itemId,
            warehouseId,
            type,
            qty,
            unitCost: parseFloat(item.costPrice) || 0,
            date,
            ref: skuRef(item)
        });
        saveAccountingRegistry(reg);
        renderAccountingWorkspace();
    }

    function skuRef(item) {
        return toStr(item?.sku) || toStr(item?.id);
    }

    function openAccountingUnitAccountModal(building, unit, tenantKey) {
        const b = toStr(building);
        const u = toStr(unit);
        if (!b || !u) return;
        const modal = document.getElementById('accountingUnitAccountModal');
        const body = document.getElementById('accountingUnitAccountBody');
        const title = document.getElementById('accountingUnitAccountTitle');
        if (!modal || !body || !title) return;
        const unitKey = accountingUnitKey(b, u);
        const tenants = getAccountingTenantsForUnit(b, u);
        const data = accountingRowsForTenant(unitKey, tenantKey || '');
        const sum = getAccountingSummaryForUnit(b, u);
        title.textContent = `${t('حساب الوحدة / Unit account', 'Unit account / حساب الوحدة')} ${b} — ${u}`;
        const bucketLabel = {
            paid: t('مدفوع', 'Paid'),
            due: t('مستحق', 'Due'),
            upcoming: t('قادم', 'Upcoming'),
            deferred: t('مؤجّل', 'Deferred'),
            overdue: t('متأخر', 'Overdue'),
            claims: t('مطالبة', 'Claim')
        };
        const txnRows = [];
        data.cheques.forEach((c) => {
            txnRows.push({
                sort: toStr(c.dueDate) || '9999',
                kind: t('شيك', 'Cheque'),
                ref: c.chequeNo,
                date: c.dueDate,
                amount: c.amount,
                status: accountingChequeStatusLabel(c.status),
                bucket: bucketLabel[accountingChequeBucket(c)] || '—',
                id: c.id
            });
        });
        data.entries.forEach((e) => {
            txnRows.push({
                sort: toStr(e.dueDate) || '9999',
                kind: t('بند', 'Entry'),
                ref: e.title,
                date: e.dueDate,
                amount: e.amount,
                status: accountingEntryStatusLabel(e.status),
                bucket: '—',
                id: ''
            });
        });
        txnRows.sort((a, b) => toStr(a.sort).localeCompare(toStr(b.sort)));
        body.innerHTML = `
            <div class="accounting-summary" style="margin-bottom:12px">
                <div class="accounting-summary-card"><small>${t('مدفوع', 'Paid')}</small><strong>${escHtml(summaryAmtOm(sum.paid))}</strong></div>
                <div class="accounting-summary-card"><small>${t('متبقي', 'Remaining')}</small><strong>${escHtml(summaryAmtOm(sum.remaining))}</strong></div>
                <div class="accounting-summary-card"><small>${t('متأخر', 'Overdue')}</small><strong>${escHtml(summaryAmtOm(sum.overdue))}</strong></div>
                <div class="accounting-summary-card"><small>${t('ضمان', 'Deposits')}</small><strong>${escHtml(summaryAmtOm(sum.depositsHeld))}</strong></div>
            </div>
            <h5 style="margin:0 0 8px">${t('المستأجرون حسب فترة العقد / Tenants by contract period', 'Tenants by contract period / المستأجرون')}</h5>
            ${tenants.length ? tenants.map((tp) => `
                <div class="acct-tenant-period-card" onclick="openAccountingUnitAccountModal('${escHtml(b).replace(/'/g, "\\'")}','${escHtml(u).replace(/'/g, "\\'")}','${escHtml(tp.tenantKey).replace(/'/g, "\\'")}')">
                    <strong>${escHtml(tp.tenant || '—')}</strong>
                    <small style="display:block;color:#666">${t('عقد', 'Contract')}: ${escHtml(tp.agreementNo || '—')} · ${escHtml(tp.startDate || '—')} — ${escHtml(tp.endDate || '—')}${tp.active ? ' · ' + t('حالي', 'Current') : ''}</small>
                </div>`).join('') : `<p style="color:#666">${t('لا يوجد مستأجرون مسجلون.', 'No tenants recorded.')}</p>`}
            ${tenantKey ? `<p style="font-size:12px;color:var(--primary)">${t('عرض مفلتر لمستأجر محدد — اضغط بطاقة أخرى لعرض الكل', 'Filtered by tenant — click another card for all')}</p>` : ''}
            <h5 style="margin:14px 0 8px">${t('كل المعاملات / All transactions', 'All transactions / المعاملات')}</h5>
            <table class="data-table" style="width:100%;font-size:12px">
                <thead><tr><th>${t('التصنيف', 'Bucket')}</th><th>${t('النوع', 'Type')}</th><th>${t('المرجع', 'Ref')}</th><th>${t('التاريخ', 'Date')}</th><th>${t('المبلغ', 'Amount')}</th><th>${t('الحالة', 'Status')}</th><th>${t('إجراء', 'Action')}</th></tr></thead>
                <tbody>${txnRows.length ? txnRows.map((r) => `<tr>
                    <td>${escHtml(r.bucket)}</td><td>${escHtml(r.kind)}</td><td>${escHtml(r.ref || '—')}</td><td>${escHtml(r.date || '—')}</td><td>${escHtml(summaryAmtOm(r.amount))}</td><td>${escHtml(r.status)}</td>
                    <td>${r.id ? `<button type="button" class="btn-outline mini-btn" onclick="openAccountingChequeActionModal('${escHtml(r.id)}','history')">${t('الحركة', 'Log')}</button>` : '—'}</td>
                </tr>`).join('') : `<tr><td colspan="7">${t('لا توجد معاملات', 'No transactions')}</td></tr>`}</tbody>
            </table>
            <h5 style="margin:14px 0 8px">${t('الضمان / Deposits', 'Deposits / الضمان')}</h5>
            <table class="data-table" style="width:100%;font-size:12px"><thead><tr><th>${t('النوع', 'Type')}</th><th>${t('المبلغ', 'Amount')}</th><th>${t('مرجع', 'Ref')}</th><th>${t('حالة', 'Status')}</th></tr></thead>
            <tbody>${data.deposits.length ? data.deposits.map((d) => `<tr><td>${escHtml(d.type)}</td><td>${escHtml(summaryAmtOm(d.amount))}</td><td>${escHtml(d.reference || '—')}</td><td>${escHtml(d.status || 'held')}</td></tr>`).join('') : `<tr><td colspan="4">—</td></tr>`}</tbody></table>
            <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
                <button type="button" class="btn-outline mini-btn" onclick="printAccountingUnitAccountReport('${escHtml(b).replace(/'/g, "\\'")}','${escHtml(u).replace(/'/g, "\\'")}','${escHtml(tenantKey || '').replace(/'/g, "\\'")}')">${t('طباعة الكشف / Print statement', 'Print statement / طباعة')}</button>
                <button type="button" class="btn-outline mini-btn" onclick="printAccountingDepositReceiptForUnit('${escHtml(b).replace(/'/g, "\\'")}','${escHtml(u).replace(/'/g, "\\'")}')">🖨️ ${t('إيصال الضمان', 'Deposit receipt')}</button>
                <button type="button" class="btn-outline mini-btn" onclick="printAccountingContractChequesReceiptReport('${escHtml(b).replace(/'/g, "\\'")}','${escHtml(u).replace(/'/g, "\\'")}')">🖨️ ${t('كشف الشيكات', 'Cheques report')}</button>
                <button type="button" class="btn-outline mini-btn" onclick="openAccountingWorkspaceForUnit('${escHtml(b).replace(/'/g, "\\'")}','${escHtml(u).replace(/'/g, "\\'")}'); closeAccountingUnitAccountModal();">${t('فتح في المحاسبة / Open workspace', 'Open workspace / فتح')}</button>
            </div>`;
        modal.classList.add('open');
    }

    function closeAccountingUnitAccountModal() {
        document.getElementById('accountingUnitAccountModal')?.classList.remove('open');
    }

    function scheduleAccountingWorkspaceRender() {
        clearTimeout(_accountingRenderDebounceTimer);
        _accountingRenderDebounceTimer = setTimeout(() => {
            _accountingRenderDebounceTimer = 0;
            renderAccountingWorkspace();
        }, 150);
    }

    let _accountingWorkspaceRenderRaf = 0;

    function renderAccountingWorkspace() {
        if (isAccountingContractReceiptModalOpen()) {
            _accountingWorkspaceRenderPending = true;
            return;
        }
        if (_accountingWorkspaceRenderRaf) {
            cancelAnimationFrame(_accountingWorkspaceRenderRaf);
        }
        _accountingWorkspaceRenderRaf = requestAnimationFrame(() => {
            _accountingWorkspaceRenderRaf = 0;
            renderAccountingWorkspaceNow();
        });
    }

    function renderAccountingWorkspaceNow() {
        const host = document.getElementById('accountingPanelHost');
        if (!host) return;
        try {
        if (!canAccessAccountingWorkspace()) {
            host.innerHTML = `<div class="insight-nested" style="padding:16px;border:1px solid #e8c4c4;background:#fff8f8;border-radius:10px">
                <p style="margin:0;font-weight:700">${t('صلاحية مطلوبة', 'Permission required')}</p>
                <p style="font-size:13px;color:#444;margin:8px 0 0">${t('يجب تسجيل الدخول بحساب يملك صلاحية المحاسبة.', 'Sign in with an account that has Accounting permission.')}</p>
            </div>`;
            return;
        }
        const reg = loadAccountingRegistry();
        try {
            if (repairAccountingChequesPendingWithoutContractData(reg)) {
                saveAccountingRegistry(reg, { skipJournalRebuild: true });
            }
        } catch (_eRepChqAcct) {}
        const dash = computeLiveAccountingDashboard(reg);
        const tabNavMetrics = buildAccountingTabNavMetrics(reg, dash);
        const tab = _accountingUiState.tab || 'cheques';

        let tabBody = '';
        if (tab === 'cheques') {
            const unitLoc = getAccountingChequesUnitFilterForActions();
            const unitChequeReceiptBtn =
                unitLoc
                    ? `<div style="margin-bottom:10px"><button type="button" class="btn-outline mini-btn" onclick="printAccountingContractChequesReceiptReport(${JSON.stringify(unitLoc.building)},${JSON.stringify(unitLoc.unit)})">🖨️ ${t('كشف الشيكات — تأكيد الاستلام (الوحدة)', 'Cheques receipt confirmation (unit)')}</button></div>`
                    : '';
            tabBody = `${unitChequeReceiptBtn}${buildAccountingTabToolbar('cheques')}<div class="table-wrap"><table class="data-table" style="width:100%;font-size:12px">
                <thead>
                <tr>
                    ${accountingChequeColHeader(t('مبنى', 'Building'), 'building', true)}
                    ${accountingChequeColHeader(t('وحدة', 'Unit'), 'unit', true)}
                    ${accountingChequeColHeader(t('مستأجر', 'Tenant'), 'tenant', true)}
                    ${accountingChequeColHeader(t('نوع', 'Type'), 'sourceType', true)}
                    ${accountingChequeColHeader(t('رقم الشيك', 'Cheque no.'), 'chequeNo', true)}
                    ${accountingChequeColHeader(t('الاستحقاق', 'Due'), 'dueDate', true)}
                    ${accountingChequeColHeader(t('المبلغ', 'Amount'), 'amount', true)}
                    ${accountingChequeColHeader(t('الحالة', 'Status'), 'status', true)}
                    <th class="bhd-col-header"><div class="bhd-col-header__inner"><span class="bhd-col-header__label">${t('إجراء', 'Action')}</span></div></th>
                </tr>
                ${buildAccountingChequeFilterRowHtml()}
                </thead>
                <tbody id="accountingChequesTableBody">${buildAccountingChequesTbodyHtml(reg)}</tbody>
            </table></div>`;
        } else if (tab === 'income') {
            tabBody = renderAccountingLedgerTab('income', reg, dash);
        } else if (tab === 'expense') {
            tabBody = renderAccountingLedgerTab('expense', reg, dash);
        } else if (tab === 'coa') {
            tabBody = renderCoaWorkspaceHtml();
        } else if (tab === 'entries') {
            _accountingUiState.tab = 'income';
            tabBody = renderAccountingLedgerTab('income', reg, dash);
        } else if (tab === 'deposits') {
            const rows = reg.deposits.filter(accountingDepositMatchesFilters);
            const bF = toStr(_accountingUiState.building);
            const uF = toStr(_accountingUiState.unit);
            const unitReceiptBtns =
                bF && uF
                    ? `<div style="margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap">
                        <button type="button" class="btn-outline mini-btn" onclick="printAccountingDepositReceiptForUnit(${JSON.stringify(bF)},${JSON.stringify(uF)})">🖨️ ${t('إيصال استلام الضمان', 'Deposit receipt')}</button>
                        <button type="button" class="btn-outline mini-btn" onclick="printAccountingContractChequesReceiptReport(${JSON.stringify(bF)},${JSON.stringify(uF)})">🖨️ ${t('كشف الشيكات — تأكيد الاستلام', 'Cheques receipt confirmation')}</button>
                    </div>`
                    : '';
            tabBody = `${buildAccountingTabToolbar('deposits')}${unitReceiptBtns}<div class="table-wrap"><table class="data-table" style="width:100%;font-size:12px">
                <thead><tr>
                    <th>${t('مبنى', 'Building')}</th><th>${t('وحدة', 'Unit')}</th>
                    <th>${t('النوع', 'Type')}</th><th>${t('المبلغ', 'Amount')}</th>
                    <th>${t('مرجع', 'Reference')}</th><th>${t('الحالة', 'Status')}</th>
                </tr></thead>
                <tbody>${rows.length ? rows.map((d) => `<tr>
                    <td>${escHtml(d.building)}</td><td>${escHtml(d.unit)}</td>
                    <td>${escHtml(d.type === 'security' ? t('ضمان', 'Security') : d.type === 'insurance' ? t('تأمين', 'Insurance') : escHtml(d.type))}</td>
                    <td>${escHtml(summaryAmtOm(d.amount))}</td>                    <td>${escHtml(d.reference || '—')}</td>
                    <td>${escHtml(accountingDepositStatusLabel(d.status || 'held'))}${isAccountingDepositReceiptConfirmed(d) ? `<div style="margin-top:4px"><button type="button" class="btn-outline mini-btn" onclick="printAccountingDepositReceipt('${escHtml(d.id)}')">🖨️ ${t('إيصال الاستلام', 'Receipt')}</button></div>` : ''}${isAccountingDepositPendingReceipt(d.status) && canApproveAccountingEntry() ? `<div style="margin-top:4px"><button type="button" class="btn-primary mini-btn" onclick="openAccountingContractReceiptApprovalModal('deposit','${escHtml(d.id)}')">${t('اعتماد الاستلام', 'Confirm receipt')}</button></div>` : ''}</td>
                </tr>`).join('') : `<tr><td colspan="6" style="text-align:center;padding:16px;color:#666">${t('لا يوجد ضمان', 'No deposits')}</td></tr>`}</tbody>
            </table></div>`;
        } else if (tab === 'pending') {
            const rows = reg.entries.filter((e) => isAccountingEntryPendingApproval(e)).filter(accountingPendingFilterRow);
            const contractReceiptBlock = renderAccountingContractReceiptPendingSection(reg);
            const pendingTotal = parseInt(tabNavMetrics.pending?.badge, 10) || 0;
            const pendingBanner =
                pendingTotal > 0
                    ? `<div class="property-docs-pending-banner" style="margin-bottom:12px;border-color:#ef9a9a;background:#ffebee">
                        <strong>⏳ ${t('طلبات بانتظار اعتمادك', 'Requests awaiting your approval')}: ${pendingTotal}</strong>
                        <span style="display:block;font-size:12px;margin-top:4px;line-height:1.5;color:#5c1010">${t('يشمل: إيرادات/مصروفات يدوية، استلام الضمان والشيكات، وفواتير مسودة.', 'Includes: manual income/expense, deposit & cheque receipt, and draft invoices.')}</span>
                    </div>`
                    : '';
            tabBody = `${pendingBanner}${contractReceiptBlock}${buildAccountingTabToolbar('pending')}<div class="table-wrap"><table class="data-table" style="width:100%;font-size:12px">
                <thead><tr>
                    <th>${t('رقم الطلب', 'Request no.')}</th><th>${t('التاريخ', 'Date')}</th><th>${t('نوع الطلب', 'Request')}</th>
                    <th>${t('النوع', 'Type')}</th>
                    <th>${t('رقم السند', 'Voucher')}</th><th>${t('مبنى', 'Building')}</th><th>${t('وحدة', 'Unit')}</th>
                    <th>${t('البند', 'Item')}</th><th>${t('الجهة', 'Party')}</th><th>${t('المبلغ', 'Amount')}</th>
                    <th>${t('أُدخل بواسطة', 'Entered by')}</th><th>${t('الحالة', 'Status')}</th>
                    <th>${t('إجراء', 'Action')}</th>
                </tr></thead>
                <tbody>${rows.length ? rows.map((e) => {
                    const typeLbl = toStr(e.type) === 'expense' ? t('مصروف', 'Expense') : t('إيراد', 'Income');
                    const enteredBy = e.pendingRequest?.submittedByName || e.createdByName || '—';
                    const enteredAt = formatAccountingAuditDateTime(e.pendingRequest?.submittedAt || e.createdByAt || e.dueDate);
                    const reqNo = getAccountingEntryActiveRequestNo(e) || '—';
                    const actions = `<div style="display:flex;gap:4px;flex-wrap:wrap">
                        <button type="button" class="btn-outline mini-btn" onclick="openAccountingReceiptDetailModal('${escHtml(e.id)}')">${t('تفاصيل', 'Details')}</button>
                        ${canEditAccountingManualEntry(e) ? `<button type="button" class="btn-outline mini-btn" onclick="editAccountingManualEntry('${escHtml(e.id)}')">✏️ ${t('تعديل', 'Edit')}</button>
                        <button type="button" class="btn-outline mini-btn" onclick="deleteAccountingManualEntry('${escHtml(e.id)}')">🗑️ ${t('حذف', 'Delete')}</button>` : ''}
                        ${canApproveAccountingEntry() ? `<button type="button" class="btn-primary mini-btn" onclick="openAccountingApprovalModal('${escHtml(e.id)}')">${t('اعتماد / رفض', 'Approve / reject')}</button>` : ''}
                    </div>`;
                    return `<tr>
                    <td>${reqNo !== '—' ? formatAccountingApprovalRequestNoBadge(reqNo) : '—'}</td>
                    <td>${escHtml(e.dueDate || '—')}</td>
                    <td>${escHtml(accountingPendingActionLabel(e))}</td>
                    <td>${typeLbl}</td>
                    <td>${escHtml(e.voucherNo || '—')}</td>
                    <td>${escHtml(e.building || '—')}</td><td>${escHtml(e.unit || '—')}</td>
                    <td>${escHtml(e.title)}</td><td>${escHtml(e.partyName || '—')}</td>
                    <td>${escHtml(summaryAmtOm(e.amount))}</td>
                    <td style="font-size:11px">${escHtml(enteredBy)}<br><small style="color:#666">${escHtml(enteredAt)}</small></td>
                    <td>${escHtml(accountingEntryDisplayStatusLabel(e))}</td>
                    <td>${actions}</td>
                </tr>`;
                }).join('') : `<tr><td colspan="13" style="text-align:center;padding:16px;color:#666">${t('لا يوجد بانتظار الاعتماد', 'Nothing pending')}</td></tr>`}</tbody>
            </table></div>`;
        } else if (tab === 'invoices') {
            const rows = reg.invoices.filter(accountingInvoiceMatchesFilters);
            tabBody = `${buildAccountingTabToolbar('invoices')}<div class="table-wrap"><table class="data-table" style="width:100%;font-size:12px">
                <thead><tr>
                    <th>${t('مبنى', 'Building')}</th><th>${t('وحدة', 'Unit')}</th>
                    <th>${t('رقم الفاتورة', 'Invoice')}</th><th>${t('الإجمالي', 'Total')}</th>
                    <th>${t('المدفوع', 'Paid')}</th><th>${t('المتبقي', 'Remaining')}</th>
                    <th>${t('ملاحظات الدفع', 'Payment notes')}</th>
                    <th>${t('الحالة', 'Status')}</th><th>${t('إجراء', 'Action')}</th>
                </tr></thead>
                <tbody>${rows.length ? rows.map((inv) => {
                    const paid = parseFloat(inv.paidAmount) || 0;
                    const total = parseFloat(inv.total) || 0;
                    const rem = Math.max(0, total - paid);
                    const notePreview = toStr(inv.paymentNote).slice(0, 100);
                    const parent = findParentReceiptAllocationForInvoice(inv.id, reg);
                    const parentLbl = parent
                        ? `<br><small style="color:#1565c0">↳ ${t('من سند', 'From voucher')} ${escHtml(parent.entry.voucherNo || '—')}</small>`
                        : '';
                    const openDetail = parent
                        ? `openAccountingReceiptDetailModal('${escHtml(parent.entry.id)}')`
                        : '';
                    const paidCell = parent
                        ? `<td class="acct-ledger-amt-paid acct-ledger-amt-link" onclick="${openDetail}" title="${t('عرض تفصيل الدفع', 'View payment details')}">${escHtml(summaryAmtOm(paid))}</td>`
                        : `<td class="acct-ledger-amt-paid">${escHtml(summaryAmtOm(paid))}</td>`;
                    const receiptBtns = parent
                        ? `<button type="button" class="btn-outline mini-btn" onclick="printAccountingAllocationSubReceipt('${escHtml(parent.entry.id)}',${parent.allocIndex})">🖨️ ${t('إيصال الدفع', 'Payment receipt')}</button>
                        <button type="button" class="btn-outline mini-btn" onclick="openAccountingReceiptDetailModal('${escHtml(parent.entry.id)}')">${t('السند', 'Voucher')}</button>`
                        : '';
                    return `<tr>
                    <td>${escHtml(inv.building)}</td><td>${escHtml(inv.unit)}</td>
                    <td>${escHtml(inv.invoiceNo || inv.id)}${parentLbl}</td>
                    <td>${escHtml(summaryAmtOm(total))}</td>
                    ${paidCell}
                    <td class="acct-ledger-amt-remaining">${rem > 0 ? escHtml(summaryAmtOm(rem)) : '—'}</td>
                    <td style="font-size:11px;max-width:200px" title="${escHtml(inv.paymentNote || '')}">${notePreview ? escHtml(notePreview) + (toStr(inv.paymentNote).length > 100 ? '…' : '') : '—'}</td>
                    <td>${escHtml(inv.status)}</td>
                    <td>
                        ${inv.status === 'draft' ? `<button type="button" class="btn-primary mini-btn" onclick="approveAccountingInvoice('${escHtml(inv.id)}')">${t('اعتماد', 'Approve')}</button>` : ''}
                        ${receiptBtns}
                        <button type="button" class="btn-outline mini-btn" onclick="printAccountingInvoice('${escHtml(inv.id)}')">${t('طباعة', 'Print')}</button>
                    </td>
                </tr>`;
                }).join('') : `<tr><td colspan="9" style="text-align:center;padding:16px;color:#666">${t('لا توجد فواتير', 'No invoices')}</td></tr>`}</tbody>
            </table></div>
            <div style="margin-top:12px">
                <button type="button" class="btn-outline mini-btn" onclick="(function(){ const ids=[...document.querySelectorAll('[data-acct-inv-chk]:checked')].map(x=>x.value); const inv=createAccountingInvoiceFromEntries(ids); if(inv){ approveAccountingInvoice(inv.id); } else { alert(t('اختر بنوداً مؤكدة أولاً','Select confirmed entries first')); } })()">${t('إنشاء فاتورة من البنود المؤكدة', 'Create invoice from confirmed')}</button>
            </div>`;
        } else if (tab === 'maintenance') {
            tabBody = renderAccountingMaintenanceTab();
        } else if (tab === 'bankAccounts') {
            const settings = getAccountingSettings(reg);
            const owners = getAddressBookOwnersForBankAccounts();
            const ownerOpts = owners.map((o) => `<option value="${escHtml(o.name)}">${escHtml(o.name)}${o.building ? ` — ${escHtml(o.building)}` : ''}</option>`).join('');
            const rows = getBankAccounts(false);
            tabBody = `
                <div class="row-2cols" style="margin-bottom:14px;padding:12px;border:1px solid #dce5ec;border-radius:10px;background:#fafcfd">
                    <h5 style="grid-column:1/-1;margin:0 0 8px;font-size:13px">🏦 ${t('إضافة حساب بنكي', 'Add bank account')}</h5>
                    <input type="hidden" id="bankAcctEditId" value="">
                    <div class="input-group"><label>${t('المالك (دفتر العناوين)', 'Owner (address book)')}</label>
                        <select id="bankAcctOwner"><option value="">—</option>${ownerOpts}</select></div>
                    <div class="input-group"><label>${t('اسم مختصر', 'Label')}</label><input type="text" id="bankAcctLabel"></div>
                    <div class="input-group"><label>${t('اسم البنك', 'Bank name')}</label><input type="text" id="bankAcctBankName"></div>
                    <div class="input-group"><label>${t('رقم الحساب', 'Account no.')}</label><input type="text" id="bankAcctAccountNo"></div>
                    <div class="input-group"><label>${t('الآيبان', 'IBAN')}</label><input type="text" id="bankAcctIban"></div>
                    <div class="input-group"><label>${t('ملاحظات', 'Notes')}</label><input type="text" id="bankAcctNotes"></div>
                    <div class="input-group"><label>${t('رصيد كشف الحساب (آخر كشف)', 'Statement balance (last statement)')}</label><input type="number" id="bankAcctStatementBalance" min="0" step="0.001" placeholder="0.000"></div>
                    <div class="input-group" style="align-self:end"><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="bankAcctActive" checked> ${t('نشط', 'Active')}</label></div>
                    <div class="input-group" style="align-self:end"><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="bankAcctDefault"> ${t('حساب افتراضي للمالك', 'Default for owner')}</label></div>
                    <div class="input-group" style="align-self:end"><button type="button" class="btn-primary mini-btn" onclick="saveBankAccountFromForm()">${t('حفظ الحساب', 'Save account')}</button></div>
                </div>
                <div class="insight-nested" style="padding:12px;margin-bottom:14px;border-radius:10px">
                    <h5 style="margin:0 0 8px;font-size:13px">⚠️ ${t('إعدادات غرامة الارتجاع', 'Bounce penalty settings')}</h5>
                    <div class="row-2cols">
                        <div class="input-group"><label>${t('مبلغ الغرامة الثابت', 'Fixed penalty amount')}</label>
                            <input type="number" id="acctSetBounceAmount" min="0" step="0.001" value="${getDefaultBouncePenaltyAmount(settings)}"></div>
                        <div class="input-group" style="align-self:end"><label style="display:flex;gap:6px;align-items:center">
                            <input type="checkbox" id="acctSetAutoPenalty" ${settings.penalties.autoPenaltyOnBounce !== false ? 'checked' : ''}>
                            ${t('احتساب تلقائي عند الارتجاع', 'Auto on bounce')}
                        </label></div>
                        <div class="input-group" style="grid-column:1/-1;align-self:end">
                            <button type="button" class="btn-outline mini-btn" onclick="saveAccountingPenaltySettingsFromForm()">${t('حفظ الإعدادات', 'Save settings')}</button>
                            ${canWaiveChequePenalty() ? `<small style="display:block;margin-top:6px;color:#666">${t('لديك صلاحية إعفاء/تخفيض الغرامات من تبويب بانتظار الاعتماد.', 'You can waive/reduce penalties from Pending tab.')}</small>` : ''}
                        </div>
                    </div>
                </div>
                <div style="margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap">
                    <button type="button" class="btn-outline mini-btn" onclick="printAccountingBankAccountsReport()">🖨️ ${t('تقرير الحسابات البنكية', 'Bank accounts report')}</button>
                    <button type="button" class="btn-outline mini-btn" onclick="printAccountingBankReconciliationReport()">🖨️ ${t('تسوية مصرفية', 'Bank reconciliation')}</button>
                </div>
                <div class="table-wrap"><table class="data-table" style="width:100%;font-size:12px">
                    <thead><tr>
                        <th>${t('المالك', 'Owner')}</th>
                        <th>${t('البنك', 'Bank')}</th>
                        <th>${t('رقم الحساب', 'Account')}</th>
                        <th>${t('رصيد الدفاتر', 'Book balance')}</th>
                        <th>${t('رصيد الكشف', 'Statement bal.')}</th>
                        <th>${t('الفرق', 'Diff.')}</th>
                        <th>${t('الآيبان', 'IBAN')}</th>
                        <th>${t('افتراضي', 'Default')}</th>
                        <th>${t('الحالة', 'Status')}</th>
                        <th>${t('إجراء', 'Action')}</th>
                    </tr></thead>
                    <tbody>${rows.length ? rows.map((b) => {
                        const book = computeBankAccountBookBalance(b, reg);
                        const stmt = parseFloat(b.statementBalance) || 0;
                        const diff = parseFloat((book - stmt).toFixed(3));
                        return `<tr>
                        <td>${escHtml(b.ownerName || '—')}</td>
                        <td>${escHtml(b.bankName || '—')}${b.label ? `<br><small>${escHtml(b.label)}</small>` : ''}</td>
                        <td>${escHtml(b.accountNo || '—')}</td>
                        <td>${escHtml(summaryAmtOm(book))}</td>
                        <td>${stmt ? escHtml(summaryAmtOm(stmt)) : '—'}</td>
                        <td>${stmt ? escHtml(summaryAmtOm(diff)) : '—'}</td>
                        <td>${escHtml(b.iban || '—')}</td>
                        <td>${b.isDefault ? `<span class="bank-default-badge">★ ${t('افتراضي', 'Default')}</span>` : `<button type="button" class="btn-outline mini-btn" onclick="setBankAccountAsDefault('${escHtml(b.id)}')">${t('تعيين', 'Set')}</button>`}</td>
                        <td>${b.active !== false ? t('نشط', 'Active') : t('موقوف', 'Inactive')}</td>
                        <td>
                            <button type="button" class="btn-outline mini-btn" onclick="editBankAccount('${escHtml(b.id)}')">${t('تعديل', 'Edit')}</button>
                            <button type="button" class="btn-outline mini-btn" onclick="deleteBankAccount('${escHtml(b.id)}')">${t('حذف', 'Delete')}</button>
                        </td>
                    </tr>`;
                    }).join('') : `<tr><td colspan="10" style="text-align:center;padding:16px;color:#666">${t('لا توجد حسابات بنكية — أضف حساباً واربطه بمالك من دفتر العناوين.', 'No bank accounts — add one linked to an address book owner.')}</td></tr>`}</tbody>
                </table></div>`;
        } else if (tab === 'calendar') {
            tabBody = `<div class="bhd-calendar-panel" style="margin:0;border:none;background:transparent;padding:0">${buildBhdCalendarHtml('accounting')}</div>`;
        } else if (tab === 'reports') {
            tabBody = renderAccountingReportsHub();
        } else if (tab === 'payroll') {
            tabBody = renderAccountingPayrollHub();
        } else if (tab === 'inventory') {
            tabBody = renderAccountingInventoryHub();
        } else if (tab === 'journals') {
            tabBody = `${buildAccountingTabToolbar('journals')}${renderAccountingJournalsHub()}`;
        }

        const acctTabDefsAll = [
            ['cheques', '💳', t('الشيكات', 'Cheques')],
            ['income', '💚', t('الإيرادات', 'Income')],
            ['expense', '🔴', t('المصروفات', 'Expenses')],
            ['journals', '📒', t('القيود اليومية', 'Journal entries')],
            ['reports', '📊', t('التقارير', 'Reports')],
            ['coa', '🌳', t('شجرة الحسابات', 'Chart of accounts')],
            ['deposits', '🛡️', t('الضمان', 'Deposits')],
            ['pending', '⏳', t('بانتظار الاعتماد', 'Pending')],
            ['invoices', '🧾', t('الفواتير', 'Invoices')],
            ['bankAccounts', '🏦', t('الحسابات البنكية', 'Bank accounts')],
            ['payroll', '👥', t('الرواتب', 'Payroll')],
            ['inventory', '📦', t('المخزون', 'Inventory')],
            ['maintenance', '🔧', t('الصيانة', 'Maintenance')],
            ['calendar', '📅', t('التقويم', 'Calendar')]
        ];
        const acctTabDefs = acctTabDefsAll.filter(([k]) => canReadAccountingTab(k));
        if (acctTabDefs.length && !acctTabDefs.some(([k]) => k === tab)) {
            tab = acctTabDefs[0][0];
            _accountingUiState.tab = tab;
        }
        const pendingN = parseInt(tabNavMetrics.pending?.badge, 10) || 0;

        host.innerHTML = `
            <div class="acct-live-dashboard">
                <div class="acct-live-card acct-live-card--income"><small>${t('المبلغ المستلم', 'Received')}</small><strong>${escHtml(summaryAmtOm(dash.incomeReceived))}</strong></div>
                <div class="acct-live-card acct-live-card--expense"><small>${t('المبلغ المصروف', 'Spent')}</small><strong>${escHtml(summaryAmtOm(dash.expensesPaid))}</strong></div>
                <div class="acct-live-card acct-live-card--net"><small>${t('الصافي الحالي', 'Current net')}</small><strong>${escHtml(summaryAmtOm(dash.netBalance))}</strong></div>
                <div class="accounting-summary-card"><small>${t('المتبقي على المستأجرين', 'Tenant balance')}</small><strong>${escHtml(summaryAmtOm(dash.remaining))}</strong></div>
                <div class="accounting-summary-card"><small>${t('المتأخر', 'Overdue')}</small><strong>${escHtml(summaryAmtOm(dash.overdue))}</strong></div>
                <div class="accounting-summary-card accounting-summary-card--clickable${pendingN > 0 ? ' accounting-summary-card--alert' : ''}" role="button" tabindex="0" title="${escHtml(t('فتح بانتظار الاعتماد', 'Open pending approval'))}" onclick="_accountingUiState.tab='pending'; renderAccountingWorkspace();">
                    <small>${t('بانتظار الاعتماد', 'Pending approval')}</small>
                    <strong>${pendingN}</strong>
                </div>
            </div>
            <div class="acct-nav-shell">
                <div class="acct-nav-actions">
                    <button type="button" class="acct-nav-btn" onclick="syncAllAccountingFromSavedContracts(); renderAccountingWorkspace()">🔄 ${t('مزامنة من العقود', 'Sync contracts')}</button>
                    <div class="unit-details-ie-wrap" id="accountingPrintWrap">
                        <button type="button" class="acct-nav-btn" onclick="toggleAccountingPrintMenu(event)">🖨️ ${t('طباعة التقارير', 'Print reports')} ▾</button>
                        <div class="unit-details-ie-panel" id="accountingPrintPanel" role="menu" hidden>
                            <button type="button" class="btn-outline mini-btn" onclick="printAccountingAllChequesMovementReport(); closeAccountingPrintMenu();">${t('كشف حركة كل الشيكات', 'All cheques movement')}</button>
                            <button type="button" class="btn-outline mini-btn" onclick="printAccountingDueChequesReport();">${t('كشف الشيكات المستحقة', 'Due cheques (filtered)')}</button>
                            <button type="button" class="btn-outline mini-btn" onclick="printAccountingUnitAccountReport(_accountingUiState.building,_accountingUiState.unit,''); closeAccountingPrintMenu();">${t('كشف حساب الوحدة', 'Filtered unit account')}</button>
                            <button type="button" class="btn-outline mini-btn" onclick="printAccountingDepositReceiptForUnit(_accountingUiState.building,_accountingUiState.unit); closeAccountingPrintMenu();">${t('إيصال استلام الضمان (الوحدة)', 'Deposit receipt (unit)')}</button>
                            <button type="button" class="btn-outline mini-btn" onclick="printAccountingContractChequesReceiptReport(_accountingUiState.building,_accountingUiState.unit); closeAccountingPrintMenu();">${t('كشف الشيكات — تأكيد الاستلام', 'Cheques receipt confirmation')}</button>
                        </div>
                    </div>
                </div>
                <nav class="acct-tab-nav">
                    ${acctTabDefs.map(([k, icon, lbl]) => buildAccountingTabNavButtonHtml(k, icon, lbl, tab, tabNavMetrics)).join('')}
                </nav>
            </div>
            ${tabBody}
        `;
        wireAccountingReportsDelegation();
        initAccountingChequeFilterDelegation();
        focusAccountingChequeColFilterIfNeeded();
        } catch (eAcctRender) {
            console.error('renderAccountingWorkspace', eAcctRender);
            host.innerHTML = `<div class="insight-nested" style="padding:16px;border:1px solid #e8c4c4;background:#fff8f8;border-radius:10px">
                <p style="margin:0;font-weight:700">${t('تعذّر عرض المحاسبة', 'Could not render accounting')}</p>
                <p style="font-size:13px;color:#444;margin:8px 0 0">${escHtml(eAcctRender && eAcctRender.message ? eAcctRender.message : String(eAcctRender))}</p>
                <button type="button" class="btn-outline mini-btn" style="margin-top:10px" onclick="location.reload()">${t('تحديث الصفحة', 'Refresh page')}</button>
            </div>`;
        }
    }

    function openAccountingWorkspace() {
        if (
            !assertPermissionOrAlert(
                'manage_accounting',
                'لا تملك صلاحية المحاسبة.',
                'No permission to access accounting.'
            )
        ) {
            return;
        }
        setWorkspaceMode('accounting');
    }

    function openAccountingWorkspaceForUnit(building, unit) {
        const b = toStr(building);
        const u = toStr(unit);
        _accountingUiState.building = b;
        _accountingUiState.unit = u;
        _accountingUiState.tab = 'cheques';
        const st = ensureAccountingChequeTableState();
        st.filters.building = b;
        st.filters.unit = u;
        st.filterRowVisible = true;
        openAccountingWorkspace();
    }

    function renderUnitDetailsAccountingSection(unit) {
        if (!unit) return '';
        const sum = getAccountingSummaryForUnit(unit.building, unit.unit);
        const cheques = getAccountingChequesForUnit(unit.building, unit.unit).slice(0, 6);
        const tenants = getAccountingTenantsForUnit(unit.building, unit.unit);
        const bEsc = escHtml(unit.building).replace(/'/g, "\\'");
        const uEsc = escHtml(unit.unit).replace(/'/g, "\\'");
        const card = (kind, label, value) =>
            `<div class="ud-acct-fin-card" onclick="openUnitAccountingDetailModal('${kind}', '${bEsc}', '${uEsc}')" role="button" tabindex="0">
                <small>${label}</small><strong>${escHtml(summaryAmtOm(value))}</strong>
            </div>`;
        const receipts = getUnitIncomeReceiptEntries(unit.building, unit.unit).slice(0, 8);
        const receiptRows = receipts.length
            ? receipts
                  .map((ent) => {
                      const allocN = (ent.paymentAllocations || []).filter((a) => (parseFloat(a.amount) || 0) > 0).length;
                      const notes = (ent.paymentAllocations || [])
                          .map((a) => a.note)
                          .filter(Boolean)
                          .join(' · ');
                      return `<tr>
                        <td>${escHtml(ent.dueDate || '—')}</td>
                        <td><span class="acct-ledger-amt-link" onclick="openAccountingReceiptDetailModal('${escHtml(ent.id)}')">${escHtml(ent.voucherNo || '—')}</span></td>
                        <td>${escHtml(ent.partyName || '—')}</td>
                        <td><span class="acct-ledger-amt-link" onclick="openAccountingReceiptDetailModal('${escHtml(ent.id)}')">${escHtml(summaryAmtOm(ent.amount))}</span></td>
                        <td style="font-size:10px;color:#555">${allocN ? `${allocN} ${t('فاتورة/شيك', 'inv./chq')}` : '—'}${notes ? `<br>${escHtml(notes.slice(0, 120))}${notes.length > 120 ? '…' : ''}` : ''}</td>
                        <td>
                            <button type="button" class="btn-outline mini-btn" onclick="printAccountingEntryVoucher('${escHtml(ent.id)}')">🖨️ ${t('كامل', 'Full')}</button>
                            <button type="button" class="btn-outline mini-btn" onclick="openAccountingReceiptDetailModal('${escHtml(ent.id)}')">${t('تفصيل', 'Detail')}</button>
                        </td>
                    </tr>`;
                  })
                  .join('')
            : `<tr><td colspan="6" style="text-align:center;color:#666">${t('لا توجد إيصالات قبض بعد', 'No receipt vouchers yet')}</td></tr>`;
        const chequeRows = cheques.length
            ? cheques
                  .map((c) => {
                      const overdue = isAccountingChequeOverdue(c);
                      return `<tr>
                        <td>${escHtml(c.sourceType === 'vat' ? t('ضريبة', 'VAT') : t('إيجار', 'Rent'))}</td>
                        <td>${escHtml(c.chequeNo || '—')}</td>
                        <td>${escHtml(c.dueDate || '—')}</td>
                        <td>${escHtml(summaryAmtOm(c.amount))}</td>
                        <td>${accountingChequeStatusChip(c.status, overdue)}</td>
                        <td>${escHtml(c.lastActionDate ? formatAccountingDisplayDate(c.lastActionDate) : '—')}</td>
                    </tr>`;
                  })
                  .join('')
            : `<tr><td colspan="6" style="text-align:center;color:#666">${t('لا توجد شيكات محاسبية بعد', 'No accounting cheques yet')}</td></tr>`;
        const tenantCards = tenants.length
            ? tenants
                  .map(
                      (tp) =>
                          `<div class="acct-tenant-period-card" onclick="openAccountingUnitAccountModal('${bEsc}','${uEsc}','${escHtml(tp.tenantKey).replace(/'/g, "\\'")}')">
                        <strong>${escHtml(tp.tenant || '—')}</strong>
                        <small style="display:block;color:#666">${t('عقد', 'Contract')}: ${escHtml(tp.agreementNo || '—')} · ${escHtml(tp.startDate || '—')} — ${escHtml(tp.endDate || '—')}${tp.active ? ' · ' + t('حالي', 'Current') : ''}</small>
                    </div>`
                  )
                  .join('')
            : '';
        return `
            <div class="details-section">
                <h5>${t('الحسابات والأمور المالية / Accounts & finances', 'Accounts & finances / الحسابات')}</h5>
                <p style="margin:0 0 8px;font-size:12px">${t('وحدة', 'Unit')} <span class="acct-unit-link" onclick="openAccountingUnitAccountModal('${bEsc}','${uEsc}')">${escHtml(unit.unit)}</span> — ${t('اضغط لعرض كل المعاملات', 'Click for all transactions')}</p>
                <div class="ud-acct-fin-grid">
                    ${card('paid', t('المدفوع / Paid', 'Paid / المدفوع'), sum.paid)}
                    ${card('remaining', t('المتبقي / Remaining', 'Remaining / المتبقي'), sum.remaining)}
                    ${card('overdue', t('المتأخرات / Overdue', 'Overdue / المتأخرات'), sum.overdue)}
                    ${card('deposits', t('الضمان / Deposits', 'Deposits / الضمان'), sum.depositsHeld)}
                    ${card('claims', t('المطالبات / Claims', 'Claims / المطالبات'), sum.claims)}
                </div>
                ${tenantCards ? `<div style="margin-top:12px"><h6 style="margin:0 0 6px;font-size:12px">${t('المستأجرون / Tenants', 'Tenants / المستأجرون')}</h6>${tenantCards}</div>` : ''}
                <div class="table-wrap" style="margin-top:12px">
                    <h6 style="margin:0 0 6px;font-size:12px">${t('إيصالات القبض / Receipt vouchers', 'Receipt vouchers / إيصالات القبض')}</h6>
                    <table class="data-table" style="width:100%;font-size:11px">
                        <thead><tr>
                            <th>${t('التاريخ', 'Date')}</th>
                            <th>${t('رقم السند', 'Voucher')}</th>
                            <th>${t('العميل', 'Client')}</th>
                            <th>${t('المبلغ', 'Amount')}</th>
                            <th>${t('ملاحظة التوزيع', 'Allocation note')}</th>
                            <th>${t('إجراء', 'Action')}</th>
                        </tr></thead>
                        <tbody>${receiptRows}</tbody>
                    </table>
                </div>
                <div class="table-wrap" style="margin-top:12px">
                    <table class="data-table" style="width:100%;font-size:11px">
                        <thead><tr>
                            <th>${t('النوع / Type', 'Type / النوع')}</th>
                            <th>${t('رقم الشيك / Cheque', 'Cheque / رقم الشيك')}</th>
                            <th>${t('الاستحقاق / Due', 'Due / الاستحقاق')}</th>
                            <th>${t('المبلغ / Amount', 'Amount / المبلغ')}</th>
                            <th>${t('الحالة / Status', 'Status / الحالة')}</th>
                            <th>${t('آخر إجراء / Last action', 'Last action / آخر إجراء')}</th>
                        </tr></thead>
                        <tbody>${chequeRows}</tbody>
                    </table>
                </div>
                <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
                    <button type="button" class="btn-outline mini-btn" onclick="openAccountingUnitAccountModal('${escHtml(unit.building)}','${escHtml(unit.unit)}')">${t('كل معاملات الوحدة / All unit transactions', 'All unit transactions / كل المعاملات')}</button>
                    <button type="button" class="btn-outline mini-btn" onclick="openAccountingWorkspaceForUnit('${escHtml(unit.building)}','${escHtml(unit.unit)}')">${t('فتح في المحاسبة / Open in accounting', 'Open in accounting / فتح في المحاسبة')}</button>
                </div>
            </div>
        `;
    }

    function openUnitAccountingDetailModal(kind, building, unit) {
        const modal = document.getElementById('unitAccountingDetailModal');
        const body = document.getElementById('unitAccountingDetailBody');
        const title = document.getElementById('unitAccountingDetailTitle');
        if (!modal || !body || !title) return;
        const b = toStr(building);
        const u = toStr(unit);
        if (!b || !u) return;
        const labels = {
            paid: t('تفاصيل المدفوع / Paid details', 'Paid details / تفاصيل المدفوع'),
            remaining: t('تفاصيل المتبقي / Remaining details', 'Remaining details / تفاصيل المتبقي'),
            overdue: t('تفاصيل المتأخرات / Overdue details', 'Overdue details / تفاصيل المتأخرات'),
            deposits: t('تفاصيل الضمان / Deposit details', 'Deposit details / تفاصيل الضمان'),
            claims: t('تفاصيل المطالبات / Claims details', 'Claims details / تفاصيل المطالبات')
        };
        title.textContent = `${labels[kind] || kind} — ${b} / ${u}`;
        const cheques = getAccountingChequesForUnit(b, u);
        const entries = getAccountingEntriesForUnit(b, u);
        const deposits = getAccountingDepositsForUnit(b, u);
        const rows = [];
        if (kind === 'paid') {
            const regPaid = loadAccountingRegistry();
            getUnitIncomeReceiptEntries(b, u).forEach((ent) => {
                const allocN = (ent.paymentAllocations || []).filter((a) => (parseFloat(a.amount) || 0) > 0).length;
                rows.push({
                    html: `<tr>
                        <td>${t('سند قبض', 'Receipt')}</td>
                        <td><span class="acct-ledger-amt-link" onclick="openAccountingReceiptDetailModal('${escHtml(ent.id)}')">${escHtml(ent.voucherNo || ent.title)}</span></td>
                        <td>${escHtml(ent.dueDate || '—')}</td>
                        <td><span class="acct-ledger-amt-link" onclick="openAccountingReceiptDetailModal('${escHtml(ent.id)}')">${escHtml(summaryAmtOm(ent.amount))}</span></td>
                        <td>${escHtml(accountingEntryStatusLabel(ent.status))}${allocN ? ` · ${allocN} ${t('توزيع', 'alloc.')}` : ''}
                            <div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap">
                                <button type="button" class="btn-outline mini-btn" onclick="printAccountingEntryVoucher('${escHtml(ent.id)}')">🖨️ ${t('كامل', 'Full')}</button>
                                <button type="button" class="btn-outline mini-btn" onclick="openAccountingReceiptDetailModal('${escHtml(ent.id)}')">${t('تفصيل', 'Detail')}</button>
                            </div>
                        </td>
                    </tr>`
                });
            });
            cheques.filter((c) => isAccountingStandaloneIncomeCheque(regPaid, c)).forEach((c) => {
                const parent = findParentReceiptAllocationForCheque(c.id, regPaid);
                rows.push({
                    html: `<tr>
                        <td>${escHtml(c.sourceType === 'vat' ? t('ضريبة', 'VAT') : t('إيجار', 'Rent'))}</td>
                        <td>${escHtml(c.chequeNo || '—')}${parent ? `<br><small style="color:#1565c0">↳ ${t('من سند', 'From voucher')} ${escHtml(parent.entry.voucherNo || '—')}</small>` : ''}</td>
                        <td>${escHtml(c.dueDate || '—')}</td>
                        <td>${escHtml(summaryAmtOm(c.paidAmount || c.amount))}</td>
                        <td>${escHtml(accountingChequeStatusLabel(c.status))}
                            <button type="button" class="btn-outline mini-btn" style="margin-top:4px" onclick="printAccountingChequeReceipt('${escHtml(c.id)}')">🖨️ ${parent ? t('إيصال فرعي', 'Sub-receipt') : t('إيصال', 'Receipt')}</button>
                            ${parent ? `<button type="button" class="btn-outline mini-btn" style="margin-top:4px" onclick="openAccountingReceiptDetailModal('${escHtml(parent.entry.id)}')">${t('السند', 'Voucher')}</button>` : ''}
                        </td>
                    </tr>`
                });
            });
            entries.filter((e) => toStr(e.status) === 'confirmed' || toStr(e.status) === 'invoiced').forEach((e) => {
                if (e.manualEntry && toStr(e.type) === 'income') return;
                rows.push({
                    html: `<tr>
                        <td>${escHtml(e.type)}</td><td>${escHtml(e.title)}</td><td>${escHtml(e.dueDate || '—')}</td>
                        <td>${escHtml(summaryAmtOm(e.amount))}</td><td>${escHtml(accountingEntryStatusLabel(e.status))}</td>
                    </tr>`
                });
            });
        } else if (kind === 'remaining') {
            cheques.filter((c) => !isAccountingChequePendingReceipt(c.status) && !isAccountingChequePaidStatus(c.status) && !isAccountingChequeOverdue(c) && toStr(c.status) !== 'bounced' && toStr(c.status) !== 'returned' && toStr(c.status) !== 'receipt_rejected').forEach((c) => {
                rows.push([c.sourceType, c.chequeNo, c.dueDate, summaryAmtOm(c.amount), accountingChequeStatusLabel(c.status)]);
            });
            entries.filter((e) => toStr(e.status) === 'pending' || toStr(e.status) === 'pending_accountant').forEach((e) => {
                rows.push([e.type, e.title, e.dueDate || '—', summaryAmtOm(e.amount), accountingEntryStatusLabel(e.status)]);
            });
        } else if (kind === 'overdue') {
            cheques.filter((c) => isAccountingChequeOverdue(c)).forEach((c) => {
                rows.push([c.sourceType, c.chequeNo, c.dueDate, summaryAmtOm(c.amount), t('متأخر', 'Overdue')]);
            });
        } else if (kind === 'deposits') {
            deposits.forEach((d) => {
                rows.push([d.type, d.reference || d.title || '—', '—', summaryAmtOm(d.amount), accountingDepositStatusLabel(d.status || 'held')]);
            });
        } else if (kind === 'claims') {
            cheques.filter((c) => toStr(c.status) === 'bounced' || toStr(c.status) === 'returned').forEach((c) => {
                rows.push([c.sourceType, c.chequeNo, c.dueDate, summaryAmtOm(c.amount), accountingChequeStatusLabel(c.status)]);
            });
        }
        body.innerHTML = rows.length
            ? `<table class="data-table" style="width:100%;font-size:12px"><thead><tr>
                <th>${t('النوع', 'Type')}</th><th>${t('المرجع', 'Ref')}</th><th>${t('التاريخ', 'Date')}</th><th>${t('المبلغ', 'Amount')}</th><th>${t('الحالة / إجراء', 'Status / action')}</th>
            </tr></thead><tbody>${rows.map((r) => r.html || `<tr>${r.map((c) => `<td>${escHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
            : `<p style="color:#666;margin:0">${t('لا توجد بنود.', 'No items.')}</p>`;
        modal.classList.add('open');
    }

    function closeUnitAccountingDetailModal() {
        document.getElementById('unitAccountingDetailModal')?.classList.remove('open');
    }

