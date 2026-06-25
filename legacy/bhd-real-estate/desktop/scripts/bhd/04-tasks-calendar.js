    /** === نظام المهام والتقويم / Tasks & calendar system === */
    const TASKS_REGISTRY_KEY = 'bhd_tasks_registry';
    const TASK_OPEN_STATUSES = ['open', 'in_progress'];
    let _tasksSyncLastAt = 0;
    let _loadDashboardAuxLastAt = 0;
    let _unitsDataCache = null;
    const OPERATIONS_PAGE_SIZE_DEFAULT = 100;
    let _operationsPageSize = OPERATIONS_PAGE_SIZE_DEFAULT;
    let _operationsPageIndex = 0;

    function bumpUnitsDataCache() {
        _unitsDataCache = null;
        _loadDashboardAuxLastAt = 0;
    }

    function resetOperationsPageAndRender() {
        _operationsPageIndex = 0;
        renderOperationsTable();
    }

    function setOperationsPageSize(raw) {
        const n = parseInt(raw, 10);
        _operationsPageSize = Number.isFinite(n) && n > 0 ? Math.min(n, 500) : OPERATIONS_PAGE_SIZE_DEFAULT;
        _operationsPageIndex = 0;
        renderOperationsTable();
    }

    function changeOperationsPage(delta) {
        const rows = window._unitsViewRows || [];
        const totalPages = Math.max(1, Math.ceil(rows.length / _operationsPageSize));
        _operationsPageIndex = Math.max(0, Math.min(totalPages - 1, _operationsPageIndex + delta));
        renderOperationsTablePageSlice();
    }

    function renderOperationsTablePageSlice() {
        const tbody = document.getElementById('unitsTableBody');
        if (!tbody) return;
        const rows = window._unitsViewRows || [];
        const total = rows.length;
        const pageSize = _operationsPageSize;
        const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
        if (_operationsPageIndex >= totalPages) _operationsPageIndex = Math.max(0, totalPages - 1);
        const start = _operationsPageIndex * pageSize;
        const pageRows = rows.slice(start, start + pageSize);

        const pag = document.getElementById('operationsPagination');
        const info = document.getElementById('operationsPageInfo');
        const prevBtn = document.getElementById('operationsPrevPageBtn');
        const nextBtn = document.getElementById('operationsNextPageBtn');
        if (pag) pag.hidden = total <= pageSize;
        if (info) {
            info.textContent = total
                ? t(
                    `عرض ${start + 1}–${start + pageRows.length} من ${total} (صفحة ${_operationsPageIndex + 1}/${totalPages})`,
                    `Showing ${start + 1}–${start + pageRows.length} of ${total} (page ${_operationsPageIndex + 1}/${totalPages})`
                )
                : t('لا توجد وحدات مطابقة', 'No matching units');
        }
        if (prevBtn) prevBtn.disabled = _operationsPageIndex <= 0;
        if (nextBtn) nextBtn.disabled = _operationsPageIndex >= totalPages - 1;

        tbody.innerHTML = pageRows.map((u, pageIdx) => {
            const rowIndex = start + pageIdx;
            const days = daysUntil(u.endDate);
            const token = getStatusToken(u, days);
            const statusText = token === 'Expiring' ? t('قريب الانتهاء', 'Expiring soon')
                : token === 'Overdue' ? t('منتهي', 'Overdue')
                : token === 'NoEndDate' ? t('بدون تاريخ', 'No end date')
                : (u.status === 'Vacant' ? t('شاغر', 'Vacant') : t('مؤجر', 'Rented'));
            const statusClass = token === 'Expiring' || token === 'Overdue' ? 'expiring' : (u.status === 'Vacant' ? 'vacant' : 'rented');
            const ownerRaw = u.ownerNames || formatOwnerNamesForBuilding(u.building) || '—';
            const ownerCell = appUiLanguage === 'en'
                ? toStr(ownerRaw).split(/\s*-\s*/).slice(-1)[0] || ownerRaw
                : ownerRaw;
            const lifeKey = getContractLifecycleStateKey(u);
            const lifeChipTitle =
                lifeKey === 'renewal_pending'
                    ? t('اضغط لمتابعة تجديد العقد — الشيكات الجديدة / Click to continue renewal cheques', 'Click to continue renewal — new cheques / اضغط لمتابعة تجديد العقد')
                    : lifeKey === 'active_pending'
                      ? t('اضغط لإكمال البيانات الإضافية / Click to complete additional data', 'Click to complete additional data / اضغط لإكمال البيانات الإضافية')
                      : lifeKey === 'active_docs_pending'
                        ? t('اضغط لإكمال البلدية والمستندات قبل التفعيل / Click to complete municipal refs & docs', 'Click to complete municipal refs & docs before activation / اضغط لإكمال البلدية والمستندات')
                        : lifeKey === 'active_accounting_pending'
                          ? t('اضغط لفتح اعتماد المحاسب / Click for accountant approval', 'Click for accountant approval / اضغط لفتح اعتماد المحاسب')
                          : '';
            const lifeChipClick =
                lifeKey === 'renewal_pending'
                    ? ` onclick="openContractRenewalFinancialForUnit(${rowIndex})" role="button" tabindex="0"`
                    : lifeKey === 'active_pending'
                      ? ` onclick="openContractForAdditionalData(${rowIndex})" role="button" tabindex="0"`
                      : lifeKey === 'active_docs_pending'
                        ? ` onclick="openContractForActivation(${rowIndex})" role="button" tabindex="0"`
                        : lifeKey === 'active_accounting_pending'
                          ? ` onclick="_accountingUiState.tab='pending'; setWorkspaceMode('accounting'); renderAccountingWorkspace();" role="button" tabindex="0"`
                          : '';
            return `
                <tr>
                    <td>${escHtml(u.building || '')}</td>
                    <td>${escHtml(ownerCell)}</td>
                    <td>${escHtml(u.unit || '')}</td>
                    <td>${escHtml(u.tenant || '-')}</td>
                    <td><span class="chip ${statusClass}">${statusText}</span></td>
                    <td><span class="chip contract-state-${lifeKey}"${lifeChipClick} title="${escHtml(lifeChipTitle)}">${getContractLifecycleLabelForKey(lifeKey)}</span></td>
                    <td>${escHtml(u.endDate || '-')}</td>
                    <td>${days === null ? '-' : escHtml(String(days))}</td>
                    <td>${escHtml(u.electricity || '-')}</td>
                    <td>${escHtml(u.water || '-')}</td>
                    <td>
                        <div class="inline-actions">
                            <button class="mini-btn" onclick="openUnitDetailsModal(${rowIndex})">${t('تفاصيل', 'Details')}</button>
                            <button class="mini-btn" onclick="selectUnitFromTable(${rowIndex}, false, false)">${t('تعبئة', 'Fill')}</button>
                            <button class="mini-btn" onclick="selectUnitFromTable(${rowIndex}, true, true)">${t('تجديد', 'Renew')}</button>
                            <button class="mini-btn primary" onclick="selectUnitFromTable(${rowIndex}, false, true)">${t('طباعة', 'Print')}</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    let _autoDataSyncState = { inProgress: false, lastAt: 0, pending: false, timer: null };
    let _tasksUiState = { team: 'all', status: 'open', search: '', sortKey: 'dueDate', sortDir: 'asc' };
    let _taskComposeState = { taskId: '', noteDraft: '', followUpDate: '', files: [], pendingInvites: [], replyToMessageId: '', replyToStaffName: '', replyToUserId: '' };
    let _taskComposeAction = { taskId: '', mode: '' };
    let _taskCompletePending = { taskId: '' };

    /** استدعاء onclick آمن — لا تستخدم JSON.stringify داخل onclick="..." / Safe onclick attribute */
    function safeOnClick(fnName, ...args) {
        const call = fnName + '(' + args.map((a) => JSON.stringify(a)).join(', ') + ')';
        return `onclick='${call}'`;
    }

    function safeOnClickJs(js) {
        return `onclick='${String(js).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
    }

    function defaultTasksRegistry() {
        return {
            seq: 0,
            yearSeq: {},
            settings: {
                contractRenewalMonthsBefore: 3,
                documentExpiryMonthsBefore: 3,
                tenantOverdueFollowupDays: 7,
                chequeDepositDaysBefore: 0,
                occasions: []
            },
            tasks: [],
            userAlerts: []
        };
    }

    function ensureTasksUserAlerts(reg) {
        if (!reg || typeof reg !== 'object') return [];
        if (!Array.isArray(reg.userAlerts)) reg.userAlerts = [];
        return reg.userAlerts;
    }

    function newTaskUserAlertId() {
        return 'talert_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    }

    function pushTaskUserAlert(reg, opts) {
        const o = opts || {};
        const task = o.task;
        const uid = toStr(o.targetUserId);
        const actorId = toStr(o.actorUserId);
        if (!task || !uid || uid === actorId) return;
        const alerts = ensureTasksUserAlerts(reg);
        alerts.push({
            id: newTaskUserAlertId(),
            taskId: toStr(task.id),
            taskNo: toStr(task.taskNo),
            targetUserId: uid,
            kind: toStr(o.kind) || 'task_update',
            title: toStr(o.title),
            body: toStr(o.body),
            at: new Date().toISOString(),
            actorUserId: actorId,
            actorName: toStr(o.actorName),
            read: false
        });
        if (alerts.length > 800) reg.userAlerts = alerts.slice(-600);
    }

    function pushTaskUserAlertsForParticipants(reg, task, excludeUserId, alertOpts, alsoExcludeUserIds) {
        const skip = new Set([toStr(excludeUserId), ...((alsoExcludeUserIds || []).map((x) => toStr(x)))].filter(Boolean));
        const ids = [...new Set(
            [...(task.assigneeUserIds || []), ...(task.watcherUserIds || [])].map((x) => toStr(x)).filter(Boolean)
        )];
        ids.forEach((id) => {
            if (skip.has(id)) return;
            pushTaskUserAlert(reg, {
                task,
                targetUserId: id,
                actorUserId: alertOpts.actorUserId,
                actorName: alertOpts.actorName,
                kind: alertOpts.kind,
                title: alertOpts.title,
                body: alertOpts.body
            });
        });
    }

    function captureTaskParticipantSnapshot(task) {
        return {
            assignees: new Set((task.assigneeUserIds || []).map((x) => toStr(x)).filter(Boolean)),
            watchers: new Set((task.watcherUserIds || []).map((x) => toStr(x)).filter(Boolean))
        };
    }

    function emitTaskParticipantDiffAlerts(reg, task, before, actor) {
        if (!task || !before) return;
        const actorId = toStr(actor?.staffUserId);
        const actorName = toStr(actor?.staffName) || t('مستخدم', 'User');
        const afterA = new Set((task.assigneeUserIds || []).map((x) => toStr(x)).filter(Boolean));
        const afterW = new Set((task.watcherUserIds || []).map((x) => toStr(x)).filter(Boolean));
        const taskLabel = `${toStr(task.taskNo)} — ${toStr(task.title)}`;

        afterA.forEach((id) => {
            if (before.assignees.has(id) || id === actorId) return;
            pushTaskUserAlert(reg, {
                task,
                targetUserId: id,
                actorUserId: actorId,
                actorName,
                kind: 'assigned_assignee',
                title: t(`تعيينك مسؤولاً — ${task.taskNo}`, `Assigned as assignee — ${task.taskNo}`),
                body: t(
                    `${actorName} عيّنك مسؤولاً عن المهمة: ${taskLabel}`,
                    `${actorName} assigned you as assignee on task: ${taskLabel}`
                )
            });
        });

        before.assignees.forEach((id) => {
            if (afterA.has(id) || id === actorId) return;
            const demotedWatcher = afterW.has(id);
            pushTaskUserAlert(reg, {
                task,
                targetUserId: id,
                actorUserId: actorId,
                actorName,
                kind: 'role_changed',
                title: t(`تغيير دورك — ${task.taskNo}`, `Your role changed — ${task.taskNo}`),
                body: demotedWatcher
                    ? t(
                        `${actorName} أزالك من المسؤولية وأصبحت مطلعاً على: ${taskLabel}`,
                        `${actorName} removed you as assignee; you are now a watcher on: ${taskLabel}`
                    )
                    : t(
                        `${actorName} أزالك من المسؤولية على: ${taskLabel}`,
                        `${actorName} removed you as assignee from: ${taskLabel}`
                    )
            });
        });

        afterW.forEach((id) => {
            if (afterA.has(id) || before.watchers.has(id) || before.assignees.has(id) || id === actorId) return;
            pushTaskUserAlert(reg, {
                task,
                targetUserId: id,
                actorUserId: actorId,
                actorName,
                kind: 'invite_watcher',
                title: t(`دعوة للاطلاع — ${task.taskNo}`, `Invited as watcher — ${task.taskNo}`),
                body: t(
                    `${actorName} أضافك مطلعاً على المهمة: ${taskLabel}`,
                    `${actorName} added you as watcher on task: ${taskLabel}`
                )
            });
        });

        before.watchers.forEach((id) => {
            if (afterW.has(id) || afterA.has(id) || before.assignees.has(id) || id === actorId) return;
            pushTaskUserAlert(reg, {
                task,
                targetUserId: id,
                actorUserId: actorId,
                actorName,
                kind: 'removed',
                title: t(`إزالتك من المهمة — ${task.taskNo}`, `Removed from task — ${task.taskNo}`),
                body: t(
                    `${actorName} أزالك من المهمة: ${taskLabel}`,
                    `${actorName} removed you from task: ${taskLabel}`
                )
            });
        });
    }

    function markTaskUserAlertsReadForTask(taskId, userId) {
        const reg = loadTasksRegistry();
        const tid = toStr(taskId);
        const uid = toStr(userId);
        let changed = false;
        ensureTasksUserAlerts(reg).forEach((a) => {
            if (toStr(a.taskId) === tid && toStr(a.targetUserId) === uid && !a.read) {
                a.read = true;
                a.readAt = new Date().toISOString();
                changed = true;
            }
        });
        if (changed) saveTasksRegistry(reg);
    }

    function collectTaskUserAlertNotificationItems(uid) {
        const items = [];
        if (!uid) return items;
        const reg = loadTasksRegistry();
        ensureTasksUserAlerts(reg)
            .filter((a) => toStr(a.targetUserId) === uid && !a.read)
            .slice()
            .sort((a, b) => toStr(b.at).localeCompare(toStr(a.at)))
            .forEach((a) => {
                items.push({
                    id: `task-user-alert-${a.id}`,
                    category: 'task_alert',
                    priority: 'high',
                    at: a.at,
                    title: a.title || t('تحديث مهمة', 'Task update'),
                    body: a.body || '—',
                    searchText: `${a.title} ${a.body} ${a.taskNo} task alert`.toLowerCase(),
                    actions: [
                        {
                            label: t('فتح المهمة / Open task', 'Open task / فتح'),
                            onclick: `openTaskFromNotification(${JSON.stringify(a.taskId)})`,
                            primary: true
                        }
                    ]
                });
            });
        return items;
    }

    function loadTasksRegistry() {
        try {
            const raw = localStorage.getItem(TASKS_REGISTRY_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            if (!parsed || typeof parsed !== 'object') return defaultTasksRegistry();
            if (!Array.isArray(parsed.tasks)) parsed.tasks = [];
            if (!parsed.settings || typeof parsed.settings !== 'object') parsed.settings = defaultTasksRegistry().settings;
            if (!Array.isArray(parsed.settings.occasions)) parsed.settings.occasions = [];
            if (typeof parsed.seq !== 'number') parsed.seq = parsed.tasks.length;
            ensureTasksUserAlerts(parsed);
            parsed.tasks = parsed.tasks.map((task) => normalizeTaskRecord(task));
            return parsed;
        } catch (_eTr) {
            return defaultTasksRegistry();
        }
    }

    function normalizeTaskRecord(task) {
        if (!task || typeof task !== 'object') return task;
        if (!Array.isArray(task.messages)) task.messages = [];
        if (!Array.isArray(task.lockedViewerUserIds)) task.lockedViewerUserIds = [];
        if (!Array.isArray(task.assigneeUserIds)) task.assigneeUserIds = [];
        if (!Array.isArray(task.watcherUserIds)) task.watcherUserIds = [];
        if (!Array.isArray(task.assigneeNames)) task.assigneeNames = [];
        if (!Array.isArray(task.watcherNames)) task.watcherNames = [];
        if (!Array.isArray(task.events)) task.events = [];
        return task;
    }

    function newTaskMessageId() {
        return 'tmsg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    }

    function formatTaskMessageDateTime(iso) {
        const s = toStr(iso);
        if (!s) return '—';
        const d = new Date(s);
        if (Number.isNaN(d.getTime())) return s.slice(0, 19).replace('T', ' ');
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function taskUserDisplayName(userId, taskOpt) {
        const id = toStr(userId);
        const u = getAllUsersForTaskAssign().find((x) => toStr(x.id) === id);
        if (u) return toStr(u.displayName || u.email);
        if (taskOpt) {
            const aIdx = (taskOpt.assigneeUserIds || []).map((x) => toStr(x)).indexOf(id);
            if (aIdx >= 0 && taskOpt.assigneeNames && taskOpt.assigneeNames[aIdx]) return toStr(taskOpt.assigneeNames[aIdx]);
            const wIdx = (taskOpt.watcherUserIds || []).map((x) => toStr(x)).indexOf(id);
            if (wIdx >= 0 && taskOpt.watcherNames && taskOpt.watcherNames[wIdx]) return toStr(taskOpt.watcherNames[wIdx]);
        }
        return id;
    }

    function syncTaskParticipantNames(task) {
        const users = getAllUsersForTaskAssign();
        task.assigneeNames = (task.assigneeUserIds || []).map((id) => {
            const u = users.find((x) => x.id === id);
            return u ? toStr(u.displayName || u.email) : id;
        });
        task.watcherNames = (task.watcherUserIds || []).map((id) => {
            const u = users.find((x) => x.id === id);
            return u ? toStr(u.displayName || u.email) : id;
        });
    }

    function lockTaskViewer(task, userId) {
        if (!task || !userId) return;
        const id = toStr(userId);
        if (!Array.isArray(task.lockedViewerUserIds)) task.lockedViewerUserIds = [];
        if (!task.lockedViewerUserIds.includes(id)) task.lockedViewerUserIds.push(id);
        if (!Array.isArray(task.watcherUserIds)) task.watcherUserIds = [];
        if (!(task.assigneeUserIds || []).includes(id) && !task.watcherUserIds.includes(id)) {
            task.watcherUserIds.push(id);
        }
        syncTaskParticipantNames(task);
    }

    function ensureTaskParticipantOnOpen(taskId) {
        const u = getLoggedInUser();
        if (!u) return;
        const reg = loadTasksRegistry();
        const task = (reg.tasks || []).find((x) => x.id === taskId);
        if (!task) return;
        lockTaskViewer(task, u.id);
        saveTasksRegistry(reg);
    }

    function taskCanManageParticipants(task) {
        const u = getLoggedInUser();
        if (!u) return false;
        if (u.role === 'system_admin') return true;
        const uid = toStr(u.id);
        return (task.assigneeUserIds || []).map((x) => toStr(x)).includes(uid);
    }

    function taskUserHasAccess(task, user) {
        if (!task || !user) return false;
        if (taskVisibleToUser(task, user)) return true;
        const uid = toStr(user.id);
        return (task.lockedViewerUserIds || []).map((x) => toStr(x)).includes(uid);
    }

    function appendTaskMessage(task, payload) {
        const actor = getCurrentActorLedgerRecord();
        const parentMessageId = toStr(payload.parentMessageId);
        const msg = {
            id: newTaskMessageId(),
            at: new Date().toISOString(),
            staffUserId: actor.staffUserId || '',
            staffName: actor.staffName || t('مستخدم', 'User'),
            type: parentMessageId ? 'reply' : (toStr(payload.type) || 'note'),
            text: toStr(payload.text),
            followUpDate: toStr(payload.followUpDate) || '',
            parentMessageId,
            replyToStaffName: toStr(payload.replyToStaffName) || '',
            replyToUserId: toStr(payload.replyToUserId) || '',
            attachments: Array.isArray(payload.attachments) ? payload.attachments.filter(Boolean) : []
        };
        if (!Array.isArray(task.messages)) task.messages = [];
        task.messages.push(msg);
        task.events = task.events || [];
        task.events.push({
            at: msg.at,
            type: msg.type,
            staffName: msg.staffName,
            note: msg.text + (msg.followUpDate ? ` · ${t('متابعة', 'Follow-up')}: ${msg.followUpDate}` : '')
        });
        return msg;
    }

    function findTaskMessage(task, messageId) {
        return (task?.messages || []).find((m) => m.id === messageId) || null;
    }

    function taskMessageCanReply(msg) {
        const ty = toStr(msg?.type);
        return ty === 'note' || ty === 'reply' || !ty;
    }

    function renderTaskMessageLi(msg, taskId, depth, childrenByParent) {
        const follow = msg.followUpDate
            ? `<span class="task-msg-followup">📅 ${t('متابعة المهمة', 'Task follow-up')}: ${escHtml(msg.followUpDate)}</span>`
            : '';
        const ty = toStr(msg.type);
        const isReply = !!(toStr(msg.parentMessageId) || ty === 'reply' || depth > 0);
        const isSystem = ['transfer', 'invite', 'completed', 'snooze', 'participant_removed'].includes(ty);
        const typeLbl = ty === 'transfer'
            ? t('تحويل', 'Transfer')
            : ty === 'invite'
                ? t('دعوة', 'Invite')
                : ty === 'snooze'
                    ? t('تأجيل', 'Postpone')
                    : ty === 'completed'
                        ? t('إكمال المهمة', 'Task completed')
                        : isReply
                            ? t('رد', 'Reply')
                            : t('ملاحظة', 'Note');
        const typeBadge = typeLbl
            ? `<span class="task-msg-type-badge">${escHtml(typeLbl)}</span>`
            : '';
        const atts = Array.isArray(msg.attachments) ? msg.attachments : [];
        const attHtml = atts.length
            ? `<div class="task-msg-attachments">${atts.map((att, i) =>
                `<button type="button" class="btn-outline mini-btn" ${safeOnClick('openTaskMessageAttachment', taskId, msg.id, i)}>📎 ${escHtml(att.name || t('مرفق', 'Attachment') + ' ' + (i + 1))}</button>`
            ).join('')}</div>`
            : '';
        const replyRef = toStr(msg.parentMessageId)
            ? `<span class="task-msg-reply-ref">↪ ${t('رد على', 'Reply to')} @${escHtml(msg.replyToStaffName || '—')}</span>`
            : '';
        const replyBtn = taskMessageCanReply(msg)
            ? `<button type="button" class="btn-outline mini-btn task-msg-reply-btn" ${safeOnClick('startTaskThreadReply', taskId, msg.id)}>${t('رد / Reply', 'Reply / رد')}</button>`
            : '';
        const styleCls = isReply
            ? 'task-thread-msg--reply'
            : isSystem
                ? 'task-thread-msg--system'
                : 'task-thread-msg--note';
        const nestedCls = depth > 0 ? ' task-thread-msg--nested' : '';
        const children = (childrenByParent[msg.id] || [])
            .map((child) => renderTaskMessageLi(child, taskId, depth + 1, childrenByParent))
            .join('');
        return `<li class="task-thread-msg ${styleCls}${nestedCls}">
            ${replyRef}
            <span class="task-msg-meta"><strong>${escHtml(msg.staffName || '—')}</strong>${typeBadge} · ${escHtml(formatTaskMessageDateTime(msg.at))}</span>
            <span class="task-msg-body">${escHtml(msg.text || '')}</span>
            ${attHtml}
            ${follow}
            ${replyBtn}
        </li>${children}`;
    }

    function renderTaskThreadHtml(task) {
        const msgs = (task.messages || []).slice();
        const taskId = task.id;
        if (!msgs.length) {
            return `<p style="margin:0;font-size:12px;color:#666">${t('لا توجد ملاحظات بعد — ابدأ بكتابة أول متابعة.', 'No notes yet — write the first follow-up.')}</p>`;
        }
        const childrenByParent = {};
        const roots = [];
        msgs.forEach((msg) => {
            const pid = toStr(msg.parentMessageId);
            if (pid && msgs.some((m) => m.id === pid)) {
                if (!childrenByParent[pid]) childrenByParent[pid] = [];
                childrenByParent[pid].push(msg);
            } else {
                roots.push(msg);
            }
        });
        return `<ul class="task-thread-list">${roots.map((msg) => renderTaskMessageLi(msg, taskId, 0, childrenByParent)).join('')}</ul>`;
    }

    function renderTaskUserPickTable(users, tableId, options) {
        const opts = options || {};
        const roles = opts.roles || [
            { value: 'watcher', label: t('مطلع / Watcher', 'Watcher / مطلع') },
            { value: 'assignee', label: t('مسؤول / Assignee', 'Assignee / مسؤول') }
        ];
        const defaultRole = opts.defaultRole || 'watcher';
        const chkClass = opts.checkboxClass || 'task-user-pick-chk';
        if (!users.length) {
            return `<p style="margin:0;font-size:12px;color:#888">—</p>`;
        }
        return `<div class="table-wrap" style="max-height:220px;overflow:auto;border:1px solid #e8edf2;border-radius:8px">
            <table class="data-table task-user-pick-table" id="${escHtml(tableId)}" style="width:100%;font-size:12px;margin:0">
                <thead><tr>
                    <th style="width:40px;text-align:center">✓</th>
                    <th>${t('الشخص / Person', 'Person / شخص')}</th>
                    <th>${t('الدور / Role', 'Role / دور')}</th>
                </tr></thead>
                <tbody>${users.map((u) => {
                    const uid = escHtml(u.id);
                    const roleOpts = roles.map((r) =>
                        `<option value="${escHtml(r.value)}" ${r.value === defaultRole ? 'selected' : ''}>${escHtml(r.label)}</option>`
                    ).join('');
                    return `<tr>
                        <td style="text-align:center"><input type="checkbox" class="${chkClass}" value="${uid}" data-user-id="${uid}"></td>
                        <td>${escHtml(u.displayName || u.email)}</td>
                        <td><select data-user-id="${uid}" disabled style="min-width:150px;font-size:12px;width:100%">${roleOpts}</select></td>
                    </tr>`;
                }).join('')}</tbody>
            </table>
        </div>`;
    }

    function wireTaskUserPickTable(tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;
        table.querySelectorAll('input[type=checkbox]').forEach((chk) => {
            const uid = chk.getAttribute('data-user-id') || chk.value;
            const sel = table.querySelector(`select[data-user-id="${uid}"]`);
            const sync = () => { if (sel) sel.disabled = !chk.checked; };
            sync();
            chk.addEventListener('change', sync);
        });
    }

    function collectTaskUserPickSelections(tableId) {
        const table = document.getElementById(tableId);
        const out = { assignee: [], watcher: [] };
        if (!table) return out;
        table.querySelectorAll('input[type=checkbox]:checked').forEach((chk) => {
            const uid = chk.value;
            const role = table.querySelector(`select[data-user-id="${uid}"]`)?.value || 'watcher';
            if (role === 'assignee') out.assignee.push(uid);
            else out.watcher.push(uid);
        });
        return out;
    }

    function syncTaskComposeNoteDraft() {
        const el = document.getElementById('taskComposeNote');
        if (el) _taskComposeState.noteDraft = el.value;
    }

    function resetTaskComposeState(taskId, defaultFollowUp) {
        _taskComposeState = {
            taskId: toStr(taskId),
            noteDraft: '',
            followUpDate: toStr(defaultFollowUp),
            files: [],
            pendingInvites: [],
            replyToMessageId: '',
            replyToStaffName: '',
            replyToUserId: ''
        };
    }

    function renderTaskComposeBadgesHtml() {
        const parts = [];
        if (toStr(_taskComposeState.followUpDate)) {
            parts.push(`<span>📅 ${t('متابعة', 'Follow-up')}: ${escHtml(_taskComposeState.followUpDate)}</span>`);
        }
        (_taskComposeState.files || []).forEach((f, i) => {
            parts.push(`<span>📎 <button type="button" class="task-compose-att-link" ${safeOnClick('openTaskComposeDraftAttachment', i)}>${escHtml(f.name || t('مرفق', 'Attachment') + ' ' + (i + 1))}</button></span>`);
        });
        return parts.length ? `<div class="task-compose-badges" id="taskComposeBadges">${parts.join('')}</div>` : '<div class="task-compose-badges" id="taskComposeBadges"></div>';
    }

    function renderTaskComposePendingInvitesHtml() {
        const pending = _taskComposeState.pendingInvites || [];
        if (!pending.length) return '';
        const chips = pending.map((p, i) => {
            const prefix = p.role === 'assignee' ? '@' : '→';
            const roleLbl = p.role === 'assignee'
                ? t('مسؤول', 'Assignee')
                : t('مطلع', 'Watcher');
            return `<span class="task-compose-mention-chip ${escHtml(p.role)}">${prefix} ${escHtml(p.name)} <small>(${escHtml(roleLbl)})</small> <button type="button" title="${t('إزالة', 'Remove')}" ${safeOnClick('removeTaskComposePendingInvite', i)}>×</button></span>`;
        }).join('');
        return `<div class="task-compose-mentions" id="taskComposeMentions">${chips}</div>`;
    }

    function renderTaskComposeReplyBannerHtml() {
        if (!toStr(_taskComposeState.replyToMessageId)) return '';
        return `<div class="task-compose-reply-banner" id="taskComposeReplyBanner">
            <span>↪ ${t('رد على', 'Reply to')} <strong>@${escHtml(_taskComposeState.replyToStaffName || '—')}</strong></span>
            <button type="button" class="btn-outline mini-btn" onclick="clearTaskComposeReply()">${t('إلغاء / Cancel', 'Cancel / إلغاء')}</button>
        </div>`;
    }

    function startTaskThreadReply(taskId, messageId) {
        syncTaskComposeNoteDraft();
        const reg = loadTasksRegistry();
        const task = (reg.tasks || []).find((x) => x.id === taskId);
        const msg = findTaskMessage(task, messageId);
        if (!msg) return;
        _taskComposeState.taskId = toStr(taskId);
        _taskComposeState.replyToMessageId = toStr(messageId);
        _taskComposeState.replyToStaffName = toStr(msg.staffName);
        _taskComposeState.replyToUserId = toStr(msg.staffUserId);
        openTaskDetailModal(taskId);
        setTimeout(() => {
            const el = document.getElementById('taskComposeNote');
            if (el) {
                el.focus();
                el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }, 80);
    }

    function clearTaskComposeReply() {
        _taskComposeState.replyToMessageId = '';
        _taskComposeState.replyToStaffName = '';
        _taskComposeState.replyToUserId = '';
        const tid = _taskComposeState.taskId;
        if (tid) openTaskDetailModal(tid);
    }

    function removeTaskComposePendingInvite(index) {
        const pending = _taskComposeState.pendingInvites || [];
        if (index < 0 || index >= pending.length) return;
        pending.splice(index, 1);
        _taskComposeState.pendingInvites = pending;
        openTaskDetailModal(_taskComposeState.taskId);
    }

    async function openTaskComposeDraftAttachment(index) {
        const file = (_taskComposeState.files || [])[index];
        if (!file) return;
        try {
            const dataUrl = await bhdReadFileAsDataUrl(file);
            if (!showAttachmentPreviewInModal({
                label: toStr(file.name),
                name: toStr(file.name),
                type: toStr(file.type),
                dataUrl
            })) {
                alert(t('تعذر فتح المعاينة.', 'Could not open preview.'));
            }
        } catch (_eDraftAtt) {
            alert(t('تعذر فتح المرفق.', 'Could not open attachment.'));
        }
    }

    function renderTaskComposeToolbarHtml(taskId, canManage) {
        const fuActive = toStr(_taskComposeState.followUpDate) ? ' has-value' : '';
        const attActive = (_taskComposeState.files || []).length ? ' has-value' : '';
        const inviteActive = (_taskComposeState.pendingInvites || []).length ? ' has-value' : '';
        const icons = [
            `<button type="button" class="task-compose-icon-btn${fuActive}" title="${t('تاريخ متابعة المهمة / Task follow-up date', 'Task follow-up date / تاريخ المتابعة')}" aria-label="${t('تاريخ متابعة', 'Follow-up date')}" ${safeOnClick('openTaskComposeActionModal', 'followup', taskId)}>📅</button>`,
            `<button type="button" class="task-compose-icon-btn${attActive}" title="${t('مرفقات / Attachments', 'Attachments / مرفقات')}" aria-label="${t('مرفقات', 'Attachments')}" ${safeOnClick('openTaskComposeActionModal', 'attachments', taskId)}>📎</button>`
        ];
        if (canManage) {
            icons.push(`<button type="button" class="task-compose-icon-btn${inviteActive}" title="${t('دعوة مشارك / Invite participant', 'Invite participant / دعوة')}" aria-label="${t('دعوة', 'Invite')}" ${safeOnClick('openTaskComposeActionModal', 'invite', taskId)}>👥</button>`);
            icons.push(`<button type="button" class="task-compose-icon-btn" title="${t('تحويل المهمة بالكامل / Full task transfer', 'Full task transfer / تحويل')}" aria-label="${t('تحويل', 'Transfer')}" ${safeOnClick('openTaskComposeActionModal', 'transfer', taskId)}>↪</button>`);
        }
        return `<div class="task-compose-toolbar">${icons.join('')}</div>${renderTaskComposeBadgesHtml()}${renderTaskComposePendingInvitesHtml()}`;
    }

    function openTaskComposeActionModal(mode, taskId) {
        syncTaskComposeNoteDraft();
        _taskComposeState.taskId = toStr(taskId);
        _taskComposeAction = { taskId: toStr(taskId), mode: toStr(mode) };
        const modal = document.getElementById('taskComposeActionModal');
        const body = document.getElementById('taskComposeActionBody');
        const title = document.getElementById('taskComposeActionTitle');
        if (!modal || !body) return;
        const users = getAllUsersForTaskAssign();
        const reg = loadTasksRegistry();
        const task = (reg.tasks || []).find((x) => x.id === taskId);
        if (!task) return;

        if (mode === 'followup') {
            if (title) title.textContent = t('تاريخ متابعة المهمة / Task follow-up date', 'Task follow-up date / تاريخ المتابعة');
            body.innerHTML = `
                <p style="font-size:12px;color:#555;margin:0 0 10px">${t('يُطبَّق عند إضافة الملاحظة ويُحدَّث موعد المهمة.', 'Applied when you add the note and updates the task due date.')}</p>
                <div class="input-group">
                    <label>${t('تاريخ المتابعة / Follow-up date', 'Follow-up date / التاريخ')}</label>
                    <input type="date" id="taskComposeActionFollowUpDate" value="${escHtml(_taskComposeState.followUpDate || task.dueDate || formatDateYmdLocal(new Date()))}">
                </div>
                <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
                    <button type="button" class="btn-outline mini-btn" onclick="closeTaskComposeActionModal()">${t('إلغاء / Cancel', 'Cancel / إلغاء')}</button>
                    <button type="button" class="btn-primary mini-btn" onclick="saveTaskComposeFollowUpFromModal()">${t('حفظ / Save', 'Save / حفظ')}</button>
                </div>`;
        } else if (mode === 'attachments') {
            if (title) title.textContent = t('مرفقات الملاحظة / Note attachments', 'Note attachments / مرفقات');
            const fileRows = (_taskComposeState.files || []).map((f, i) =>
                `<li style="margin:4px 0"><button type="button" class="btn-outline mini-btn" ${safeOnClick('openTaskComposeDraftAttachment', i)}>📎 ${escHtml(f.name)}</button></li>`
            ).join('');
            body.innerHTML = `
                <p style="font-size:12px;color:#555;margin:0 0 10px">${t('صور، فيديو، أو PDF — تُرفق مع الملاحظة عند الضغط على إضافة. اضغط اسم الملف للمعاينة.', 'Images, video, or PDF — attached when you press Add. Click file name to preview.')}</p>
                <input type="file" id="taskComposeActionFiles" accept="image/*,video/*,.pdf" multiple>
                ${fileRows ? `<ul style="margin:10px 0 0;padding-inline-start:20px;font-size:12px">${fileRows}</ul>` : `<p style="font-size:11px;color:#666;margin:8px 0 0">${t('لا مرفقات بعد.', 'No attachments yet.')}</p>`}
                <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
                    <button type="button" class="btn-outline mini-btn" onclick="closeTaskComposeActionModal()">${t('إلغاء / Cancel', 'Cancel / إلغاء')}</button>
                    <button type="button" class="btn-primary mini-btn" onclick="saveTaskComposeAttachmentsFromModal()">${t('حفظ / Save', 'Save / حفظ')}</button>
                </div>`;
        } else if (mode === 'invite') {
            if (title) title.textContent = t('دعوة مشارك / Invite participant', 'Invite participant / دعوة');
            body.innerHTML = `
                <p style="font-size:11px;color:#666;margin:0 0 8px">${t('ضع ✓ أمام الشخص واختر دوره — سيظهر اسمه في المسودة بـ @ أو → قبل الإرسال.', 'Check person and choose role — their name appears in the draft with @ or → before you send.')}</p>
                ${renderTaskUserPickTable(users, 'taskInviteTable', { defaultRole: 'watcher', checkboxClass: 'task-invite-chk' })}
                <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
                    <button type="button" class="btn-outline mini-btn" onclick="closeTaskComposeActionModal()">${t('إلغاء / Cancel', 'Cancel / إلغاء')}</button>
                    <button type="button" class="btn-primary mini-btn" ${safeOnClick('savePendingInvitesFromModal', taskId)}>${t('إضافة للمسودة / Add to draft', 'Add to draft / إضافة للمسودة')}</button>
                </div>`;
            wireTaskUserPickTable('taskInviteTable');
        } else if (mode === 'transfer') {
            if (title) title.textContent = t('تحويل المهمة بالكامل / Full task transfer', 'Full task transfer / تحويل');
            body.innerHTML = `
                <p style="font-size:11px;color:#666;margin:0 0 8px;line-height:1.45">${t('حدد المسؤولين الجدد (الدور: مسؤول). يصبح المحوّل سابقاً مطلعاً مُقفلاً.', 'Select new assignees (role: Assignee). Transferor becomes locked watcher.')}</p>
                ${renderTaskUserPickTable(users, 'taskTransferTable', { defaultRole: 'assignee', checkboxClass: 'task-transfer-chk' })}
                <div class="input-group" style="margin-top:8px">
                    <label>${t('ملاحظة التحويل / Transfer note', 'Transfer note / ملاحظة')}</label>
                    <textarea id="taskFullTransferNote" rows="2" style="width:100%"></textarea>
                </div>
                <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
                    <button type="button" class="btn-outline mini-btn" onclick="closeTaskComposeActionModal()">${t('إلغاء / Cancel', 'Cancel / إلغاء')}</button>
                    <button type="button" class="btn-primary mini-btn" ${safeOnClick('confirmTaskFullTransferFromModal', taskId)}>${t('تحويل / Transfer', 'Transfer / تحويل')}</button>
                </div>`;
            wireTaskUserPickTable('taskTransferTable');
        }
        modal.classList.add('open');
    }

    function closeTaskComposeActionModal() {
        document.getElementById('taskComposeActionModal')?.classList.remove('open');
    }

    function saveTaskComposeFollowUpFromModal() {
        _taskComposeState.followUpDate = toStr(document.getElementById('taskComposeActionFollowUpDate')?.value);
        closeTaskComposeActionModal();
        openTaskDetailModal(_taskComposeState.taskId);
    }

    function saveTaskComposeAttachmentsFromModal() {
        const inp = document.getElementById('taskComposeActionFiles');
        if (inp?.files?.length) {
            _taskComposeState.files = [...(_taskComposeState.files || []), ...Array.from(inp.files)];
        }
        closeTaskComposeActionModal();
        openTaskDetailModal(_taskComposeState.taskId);
    }

    function savePendingInvitesFromModal(taskId) {
        const sel = collectTaskUserPickSelections('taskInviteTable');
        if (!sel.assignee.length && !sel.watcher.length) {
            alert(t('اختر شخصاً واحداً على الأقل وحدد دوره.', 'Select at least one person and set their role.'));
            return;
        }
        const pending = _taskComposeState.pendingInvites || [];
        const addOne = (userId, role) => {
            const id = toStr(userId);
            if (!id) return;
            if (pending.some((p) => p.userId === id)) return;
            pending.push({
                userId: id,
                role,
                name: taskUserDisplayName(id, (loadTasksRegistry().tasks || []).find((x) => x.id === taskId))
            });
        };
        sel.assignee.forEach((id) => addOne(id, 'assignee'));
        sel.watcher.forEach((id) => addOne(id, 'watcher'));
        _taskComposeState.taskId = toStr(taskId);
        _taskComposeState.pendingInvites = pending;
        closeTaskComposeActionModal();
        openTaskDetailModal(taskId);
    }

    function confirmTaskInviteFromModal(taskId) {
        savePendingInvitesFromModal(taskId);
    }

    function confirmTaskFullTransferFromModal(taskId) {
        syncTaskComposeNoteDraft();
        _taskComposeState.taskId = toStr(taskId);
        const note = toStr(document.getElementById('taskFullTransferNote')?.value);
        const sel = collectTaskUserPickSelections('taskTransferTable');
        if (!sel.assignee.length) {
            alert(t('اختر مسؤولاً جديداً واحداً على الأقل (الدور: مسؤول).', 'Select at least one new assignee (role: Assignee).'));
            return;
        }
        closeTaskComposeActionModal();
        transferTaskFully(taskId, sel.assignee, note);
        if (sel.watcher.length) inviteUsersToTask(taskId, sel.watcher, 'watcher');
    }

    function openTaskCompleteConfirmModal(taskId) {
        syncTaskComposeNoteDraft();
        const reg = loadTasksRegistry();
        const task = (reg.tasks || []).find((x) => x.id === taskId);
        if (!task) return;
        _taskCompletePending = { taskId: toStr(taskId) };
        const modal = document.getElementById('taskCompleteConfirmModal');
        const body = document.getElementById('taskCompleteConfirmBody');
        if (!modal || !body) return;
        body.innerHTML = `
            <p style="font-size:12px;color:#555;margin:0 0 12px;line-height:1.55">${t('أنت على وشك إكمال هذه المهمة. اكتب ملخصاً لما تم إنجازه — سيُسجَّل في سجل المراسلات.', 'You are about to complete this task. Summarize what was accomplished — it will be logged in the thread.')}</p>
            <div class="insight-nested" style="padding:10px 12px;margin-bottom:12px;font-size:12px;line-height:1.55;background:#f8fafc;border:1px solid #e8edf2;border-radius:8px">
                <strong>${escHtml(task.taskNo)} — ${escHtml(task.title)}</strong><br>
                <span style="color:#555">${escHtml(task.body || '—')}</span><br>
                <small style="color:#666">${escHtml(taskTeamLabel(task.team))} · ${t('موعد المتابعة', 'Due')}: ${escHtml(task.dueDate || '—')}${task.ref ? ` · ${escHtml(task.ref)}` : ''}</small>
            </div>
            <div class="input-group">
                <label>${t('تفاصيل الإنجاز / Completion details', 'Completion details / تفاصيل الإنجاز')} <span style="color:#c62828">*</span></label>
                <textarea id="taskCompleteNote" rows="5" style="width:100%;min-height:100px;padding:8px 10px;border:1px solid #ced8df;border-radius:8px;font-family:'Tajawal',sans-serif" placeholder="${t('مثال: تم التواصل مع المستأجر وتحصيل المتأخرات وتأجيل المتابعة...', 'e.g. Contacted tenant, collected arrears, rescheduled follow-up...')}"></textarea>
            </div>
            <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
                <button type="button" class="btn-outline mini-btn" onclick="closeTaskCompleteConfirmModal()">${t('إلغاء / Cancel', 'Cancel / إلغاء')}</button>
                <button type="button" class="btn-primary mini-btn" onclick="confirmTaskComplete()">${t('تأكيد الإكمال / Confirm complete', 'Confirm complete / تأكيد')}</button>
            </div>`;
        modal.classList.add('open');
    }

    function closeTaskCompleteConfirmModal() {
        document.getElementById('taskCompleteConfirmModal')?.classList.remove('open');
        _taskCompletePending = { taskId: '' };
    }

    function confirmTaskComplete() {
        const taskId = toStr(_taskCompletePending.taskId);
        const note = toStr(document.getElementById('taskCompleteNote')?.value).trim();
        if (!taskId) return;
        if (!note) {
            alert(t('تفاصيل الإنجاز إلزامية عند إكمال المهمة.', 'Completion details are required.'));
            return;
        }
        closeTaskCompleteConfirmModal();
        completeRegistryTask(taskId, note);
    }

    async function openTaskMessageAttachment(taskId, messageId, attIndex) {
        const reg = loadTasksRegistry();
        const task = (reg.tasks || []).find((x) => x.id === taskId);
        const msg = findTaskMessage(task, messageId);
        const att = Array.isArray(msg?.attachments) ? msg.attachments[attIndex] : null;
        if (!att) return;
        await openAttachmentPreviewModal(att, t('مرفق الملاحظة / Note attachment', 'Note attachment / مرفق'));
    }

    function renderTaskParticipantsHtml(task) {
        const locked = new Set((task.lockedViewerUserIds || []).map((x) => toStr(x)));
        const existingAssigneeIds = new Set((task.assigneeUserIds || []).map((x) => toStr(x)));
        const existingWatcherIds = new Set((task.watcherUserIds || []).map((x) => toStr(x)));
        const showPending = toStr(_taskComposeState.taskId) === toStr(task.id);
        const pending = showPending ? (_taskComposeState.pendingInvites || []) : [];
        const pendingAssigneeChips = pending.filter((p) => p.role === 'assignee' && !existingAssigneeIds.has(toStr(p.userId))).map((p) =>
            `<span class="task-participant-chip assignee draft">@ ${escHtml(p.name || taskUserDisplayName(p.userId, task))} <small>(${t('مسودة', 'Draft')})</small></span>`
        ).join('');
        const pendingWatcherChips = pending.filter((p) => p.role === 'watcher' && !existingAssigneeIds.has(toStr(p.userId)) && !existingWatcherIds.has(toStr(p.userId))).map((p) =>
            `<span class="task-participant-chip watcher draft">→ ${escHtml(p.name || taskUserDisplayName(p.userId, task))} <small>(${t('مسودة', 'Draft')})</small></span>`
        ).join('');
        const assigneeChips = (task.assigneeUserIds || []).map((id) => {
            const name = taskUserDisplayName(id, task);
            const canRemove = taskCanManageParticipants(task) && !locked.has(toStr(id));
            return `<span class="task-participant-chip assignee${locked.has(toStr(id)) ? ' locked' : ''}">${escHtml(name)}${canRemove ? ` <button type="button" class="mini-btn" style="padding:0 4px;font-size:10px" ${safeOnClick('removeUserFromTask', task.id, id)}>×</button>` : ''}</span>`;
        }).join('') + pendingAssigneeChips;
        const watcherChips = (task.watcherUserIds || []).filter((id) => !(task.assigneeUserIds || []).includes(id)).map((id) => {
            const name = taskUserDisplayName(id, task);
            const isLocked = locked.has(toStr(id));
            const canRemove = taskCanManageParticipants(task) && !isLocked;
            return `<span class="task-participant-chip watcher${isLocked ? ' locked' : ''}">${escHtml(name)}${canRemove ? ` <button type="button" class="mini-btn" style="padding:0 4px;font-size:10px" ${safeOnClick('removeUserFromTask', task.id, id)}>×</button>` : ''}</span>`;
        }).join('') + pendingWatcherChips;
        const assigneeBlock = assigneeChips || `<span style="font-size:12px;color:#888">—</span>`;
        const watcherBlock = watcherChips || `<span style="font-size:12px;color:#888">—</span>`;
        return `<div class="task-participants-panel">
            <h5 style="margin:0 0 8px;font-size:13px">${t('المشاركون / Participants', 'Participants / مشاركون')}</h5>
            <div style="margin-bottom:8px"><small style="color:#666">${t('مسؤولون', 'Assignees')}</small><br>${assigneeBlock}</div>
            <div><small style="color:#666">${t('مطلعون (🔒 = لا يمكن إزالتهم)', 'Watchers (🔒 = cannot remove)')}</small><br>${watcherBlock}</div>
        </div>`;
    }

    async function submitTaskFollowUpNote(taskId) {
        syncTaskComposeNoteDraft();
        const text = toStr(_taskComposeState.noteDraft).trim();
        const followUpDate = toStr(_taskComposeState.followUpDate).trim();
        const pending = (_taskComposeState.pendingInvites || []).slice();
        if (!text) {
            alert(t('اكتب ملاحظة المتابعة.', 'Write a follow-up note.'));
            return;
        }
        const reg = loadTasksRegistry();
        const task = (reg.tasks || []).find((x) => x.id === taskId);
        if (!task) return;
        const parentId = toStr(_taskComposeState.replyToMessageId);
        const parentMsg = parentId ? findTaskMessage(task, parentId) : null;
        const replyToName = toStr(_taskComposeState.replyToStaffName) || toStr(parentMsg?.staffName);
        const replyToUserId = toStr(_taskComposeState.replyToUserId) || toStr(parentMsg?.staffUserId);
        const attachments = [];
        const files = _taskComposeState.files || [];
        for (let i = 0; i < files.length; i++) {
            try {
                const ref = await bhdPersistUploadedFile(files[i], {
                    category: 'tasks',
                    docType: 'message',
                    buildingNo: task.building || 'tasks',
                    flatNo: task.unit || taskId,
                    agreementNo: task.taskNo || taskId
                });
                const saved = fileRefFromPersistResult(ref);
                if (saved) attachments.push(saved);
            } catch (_eTaskUp) {}
        }
        const msg = appendTaskMessage(task, {
            type: parentId ? 'reply' : 'note',
            text,
            followUpDate,
            attachments,
            parentMessageId: parentId,
            replyToStaffName: replyToName,
            replyToUserId
        });
        mirrorTaskMessageToMaintenanceRequest(task, msg);
        if (followUpDate) {
            task.dueDate = followUpDate;
        }
        if (toStr(task.status) === 'open') task.status = 'in_progress';
        lockTaskViewer(task, getLoggedInUser()?.id);
        const actor = getCurrentActorLedgerRecord();
        if (pending.length) {
            const assignees = pending.filter((p) => p.role === 'assignee').map((p) => p.userId);
            const watchers = pending.filter((p) => p.role === 'watcher').map((p) => p.userId);
            if (assignees.length) inviteUsersToTask(taskId, assignees, 'assignee', { skipUiRefresh: true, skipInviteMessage: true, deferSave: true, reg });
            if (watchers.length) inviteUsersToTask(taskId, watchers, 'watcher', { skipUiRefresh: true, skipInviteMessage: true, deferSave: true, reg });
            const inviteSummary = pending.map((p) => `${p.role === 'assignee' ? '@' : '→'}${p.name}`).join('، ');
            appendTaskMessage(task, {
                type: 'invite',
                text: t(`دعوة مشاركين: ${inviteSummary}`, `Invited participants: ${inviteSummary}`)
            });
        }
        const preview = text.length > 140 ? text.slice(0, 140) + '…' : text;
        const actorId = toStr(actor.staffUserId);
        if (parentId && replyToUserId && replyToUserId !== actorId) {
            pushTaskUserAlert(reg, {
                task,
                targetUserId: replyToUserId,
                actorUserId: actor.staffUserId,
                actorName: actor.staffName,
                kind: 'task_reply',
                title: t(`رد على ملاحظتك — ${task.taskNo}`, `Reply to your note — ${task.taskNo}`),
                body: t(
                    `${actor.staffName} ↪ ${preview}`,
                    `${actor.staffName} ↪ ${preview}`
                )
            });
        }
        pushTaskUserAlertsForParticipants(reg, task, actor.staffUserId, {
            actorUserId: actor.staffUserId,
            actorName: actor.staffName,
            kind: parentId ? 'task_reply' : 'task_note',
            title: parentId
                ? t(`رد جديد — ${task.taskNo}`, `New reply — ${task.taskNo}`)
                : t(`ملاحظة جديدة — ${task.taskNo}`, `New note — ${task.taskNo}`),
            body: t(
                `${actor.staffName}: ${preview}${followUpDate ? ` · ${t('متابعة', 'Follow-up')}: ${followUpDate}` : ''}`,
                `${actor.staffName}: ${preview}${followUpDate ? ` · ${t('Follow-up', 'Follow-up')}: ${followUpDate}` : ''}`
            )
        }, replyToUserId ? [replyToUserId] : []);
        saveTasksRegistry(reg);
        resetTaskComposeState(taskId, task.dueDate || formatDateYmdLocal(new Date()));
        refreshNotificationsIfVisible();
        renderTasksRegistryPanelIfVisible();
        openTaskDetailModal(taskId);
    }

    function inviteUsersToTask(taskId, userIds, role, opts) {
        const o = opts || {};
        const reg = o.reg || loadTasksRegistry();
        const task = (reg.tasks || []).find((x) => x.id === taskId);
        if (!task) return;
        if (!taskCanManageParticipants(task) && getLoggedInUser()?.role !== 'system_admin') {
            alert(t('فقط المسؤول عن المهمة يمكنه إدارة المشاركين.', 'Only task assignees can manage participants.'));
            return;
        }
        const ids = (userIds || []).map((x) => toStr(x)).filter(Boolean);
        if (!ids.length) return;
        const actor = getCurrentActorLedgerRecord();
        const taskLabel = `${toStr(task.taskNo)} — ${toStr(task.title)}`;
        ids.forEach((id) => {
            if (role === 'assignee') {
                if (!task.assigneeUserIds.includes(id)) task.assigneeUserIds.push(id);
                task.watcherUserIds = (task.watcherUserIds || []).filter((w) => w !== id);
            } else {
                if (!(task.assigneeUserIds || []).includes(id) && !(task.watcherUserIds || []).includes(id)) {
                    task.watcherUserIds.push(id);
                }
            }
            lockTaskViewer(task, id);
            if (!o.skipAlerts) {
                if (role === 'assignee') {
                    pushTaskUserAlert(reg, {
                        task,
                        targetUserId: id,
                        actorUserId: actor.staffUserId,
                        actorName: actor.staffName,
                        kind: 'assigned_assignee',
                        title: t(`تعيينك مسؤولاً — ${task.taskNo}`, `Assigned as assignee — ${task.taskNo}`),
                        body: t(
                            `${actor.staffName} عيّنك مسؤولاً عن المهمة: ${taskLabel}`,
                            `${actor.staffName} assigned you as assignee on task: ${taskLabel}`
                        )
                    });
                } else {
                    pushTaskUserAlert(reg, {
                        task,
                        targetUserId: id,
                        actorUserId: actor.staffUserId,
                        actorName: actor.staffName,
                        kind: 'invite_watcher',
                        title: t(`دعوة للاطلاع — ${task.taskNo}`, `Invited as watcher — ${task.taskNo}`),
                        body: t(
                            `${actor.staffName} دعاك للاطلاع على المهمة: ${taskLabel}`,
                            `${actor.staffName} invited you to watch task: ${taskLabel}`
                        )
                    });
                }
            }
        });
        syncTaskParticipantNames(task);
        const names = ids.map((id) => taskUserDisplayName(id, task)).join('، ');
        if (!o.skipInviteMessage) {
            appendTaskMessage(task, {
                type: 'invite',
                text: role === 'assignee'
                    ? t(`دعوة للمسؤولية: ${names}`, `Invited as assignee: ${names}`)
                    : t(`دعوة للاطلاع: ${names}`, `Invited as watcher: ${names}`)
            });
        }
        if (!o.deferSave) {
            saveTasksRegistry(reg);
            refreshNotificationsIfVisible();
            if (!o.skipUiRefresh) openTaskDetailModal(taskId);
        }
    }

    function confirmTaskInvite(taskId) {
        const sel = collectTaskUserPickSelections('taskInviteTable');
        if (!sel.assignee.length && !sel.watcher.length) {
            alert(t('اختر شخصاً واحداً على الأقل وحدد دوره.', 'Select at least one person and set their role.'));
            return;
        }
        if (sel.assignee.length) inviteUsersToTask(taskId, sel.assignee, 'assignee');
        if (sel.watcher.length) inviteUsersToTask(taskId, sel.watcher, 'watcher');
    }

    function removeUserFromTask(taskId, userId) {
        const reg = loadTasksRegistry();
        const task = (reg.tasks || []).find((x) => x.id === taskId);
        if (!task) return;
        const id = toStr(userId);
        if ((task.lockedViewerUserIds || []).includes(id)) {
            alert(t('لا يمكن إزالة مشارك مُقفل (فتح المهمة أو حوّلها سابقاً).', 'Cannot remove a locked participant (opened or transferred the task).'));
            return;
        }
        if (!taskCanManageParticipants(task)) {
            alert(t('فقط المسؤول عن المهمة يمكنه إزالة المشاركين.', 'Only assignees can remove participants.'));
            return;
        }
        task.assigneeUserIds = (task.assigneeUserIds || []).filter((x) => toStr(x) !== id);
        task.watcherUserIds = (task.watcherUserIds || []).filter((x) => toStr(x) !== id);
        syncTaskParticipantNames(task);
        const actor = getCurrentActorLedgerRecord();
        const taskLabel = `${toStr(task.taskNo)} — ${toStr(task.title)}`;
        appendTaskMessage(task, {
            type: 'participant_removed',
            text: t(`إزالة مشارك: ${taskUserDisplayName(id)}`, `Removed participant: ${taskUserDisplayName(id)}`)
        });
        pushTaskUserAlert(reg, {
            task,
            targetUserId: id,
            actorUserId: actor.staffUserId,
            actorName: actor.staffName,
            kind: 'removed',
            title: t(`إزالتك من المهمة — ${task.taskNo}`, `Removed from task — ${task.taskNo}`),
            body: t(
                `${actor.staffName} أزالك من المهمة: ${taskLabel}`,
                `${actor.staffName} removed you from task: ${taskLabel}`
            )
        });
        saveTasksRegistry(reg);
        refreshNotificationsIfVisible();
        openTaskDetailModal(taskId);
    }

    function transferTaskFully(taskId, newAssigneeIds, note) {
        const reg = loadTasksRegistry();
        const task = (reg.tasks || []).find((x) => x.id === taskId);
        if (!task) return;
        const actor = getCurrentActorLedgerRecord();
        const actorId = toStr(actor.staffUserId);
        const newIds = (newAssigneeIds || []).map((x) => toStr(x)).filter(Boolean);
        if (!newIds.length) {
            alert(t('اختر المسؤول الجديد.', 'Select the new assignee.'));
            return;
        }
        const prevAssignees = [...(task.assigneeUserIds || [])];
        prevAssignees.forEach((id) => lockTaskViewer(task, id));
        if (actorId) lockTaskViewer(task, actorId);
        prevAssignees.forEach((id) => {
            if (!newIds.includes(id) && !(task.watcherUserIds || []).includes(id)) {
                task.watcherUserIds.push(id);
            }
        });
        task.assigneeUserIds = newIds.filter((id, idx, arr) => arr.indexOf(id) === idx);
        newIds.forEach((id) => {
            task.watcherUserIds = (task.watcherUserIds || []).filter((w) => w !== id);
        });
        syncTaskParticipantNames(task);
        const newNames = newIds.map((id) => taskUserDisplayName(id, task)).join('، ');
        appendTaskMessage(task, {
            type: 'transfer',
            text: (toStr(note) || t('تحويل المهمة بالكامل', 'Full task transfer')) + ` → ${newNames}`
        });
        const beforeSnap = { assignees: new Set(prevAssignees.map((x) => toStr(x))), watchers: new Set() };
        emitTaskParticipantDiffAlerts(reg, task, beforeSnap, actor);
        saveTasksRegistry(reg);
        refreshNotificationsIfVisible();
        renderTasksRegistryPanelIfVisible();
        openTaskDetailModal(taskId);
    }

    function confirmTaskFullTransfer(taskId) {
        const note = toStr(document.getElementById('taskFullTransferNote')?.value);
        const sel = collectTaskUserPickSelections('taskTransferTable');
        if (!sel.assignee.length) {
            alert(t('اختر مسؤولاً جديداً واحداً على الأقل (الدور: مسؤول).', 'Select at least one new assignee (role: Assignee).'));
            return;
        }
        transferTaskFully(taskId, sel.assignee, note);
        if (sel.watcher.length) inviteUsersToTask(taskId, sel.watcher, 'watcher');
    }

    function saveTasksRegistry(reg) {
        bhdAuditMute();
        try {
            localStorage.setItem(TASKS_REGISTRY_KEY, JSON.stringify(reg || defaultTasksRegistry()));
        } finally {
            bhdAuditUnmute();
        }
        scheduleBhdKvToServer();
    }

    function getTaskSettings() {
        return loadTasksRegistry().settings || defaultTasksRegistry().settings;
    }

    function newTaskId() {
        return 'task_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    }

    function nextTaskNo(reg) {
        const year = new Date().getFullYear();
        if (!reg.yearSeq || typeof reg.yearSeq !== 'object') reg.yearSeq = {};
        reg.yearSeq[year] = (Number(reg.yearSeq[year]) || 0) + 1;
        reg.seq = (Number(reg.seq) || 0) + 1;
        return `TSK-${year}-${String(reg.yearSeq[year]).padStart(4, '0')}`;
    }

    function taskTeamMeta(team) {
        const tk = toStr(team);
        if (tk === 'maintenance') return { icon: '🔧', cls: 'team-maintenance' };
        if (tk === 'accounting') return { icon: '💰', cls: 'team-accounting' };
        return { icon: '🏢', cls: 'team-admin' };
    }

    function taskSourceKindMeta(kind) {
        const k = toStr(kind);
        const map = {
            maintenance_start: { icon: '🔧', cls: 'src-maintenance' },
            contract_renewal: { icon: '📄', cls: 'src-contract' },
            document_expiry: { icon: '📑', cls: 'src-document' },
            cheque_deposit: { icon: '💳', cls: 'src-cheque' },
            tenant_overdue: { icon: '⚠️', cls: 'src-overdue' },
            manual: { icon: '✏️', cls: 'src-manual' }
        };
        return map[k] || { icon: '📌', cls: 'src-manual' };
    }

    function taskPriorityMeta(priority) {
        if (priority === 'high') return { icon: '🔴', cls: 'pri-high', label: t('عالية / High', 'High / عالية') };
        if (priority === 'low') return { icon: '🟢', cls: 'pri-low', label: t('منخفضة / Low', 'Low / منخفضة') };
        return { icon: '🟡', cls: 'pri-normal', label: t('عادية / Normal', 'Normal / عادية') };
    }

    function taskChequeSourceTypeLabel(sourceType) {
        const st = toStr(sourceType);
        if (st === 'vat') return t('ضريبة / VAT', 'VAT / ضريبة');
        if (st === 'rent') return t('إيجار / Rent', 'Rent / إيجار');
        return st || '—';
    }

    let _taskCreateChequeCache = [];

    function collectBuildingNamesForTasks() {
        const set = new Set();
        (buildingsList || []).forEach((b) => { const s = toStr(b); if (s) set.add(s); });
        try {
            getUnitsData().forEach((u) => { const s = toStr(u.building); if (s) set.add(s); });
        } catch (_eBld) {}
        const smap = loadSavedContractsByUnitMap();
        Object.keys(smap).forEach((k) => {
            const entry = smap[k];
            const p = entry && entry.payload;
            const b = toStr(p?.buildingNo || k.split('\t')[0]);
            if (b) set.add(b);
        });
        return [...set].sort((a, b) => a.localeCompare(b, 'ar'));
    }

    function collectUnitsForBuildingName(building) {
        const bKey = normalizeReservationBuildingKey(building);
        const map = new Map();
        try {
            getUnitsData().forEach((u) => {
                if (normalizeReservationBuildingKey(u.building) === bKey && toStr(u.unit)) {
                    map.set(normalizeUnit(u.unit), toStr(u.unit));
                }
            });
        } catch (_eU) {}
        const smap = loadSavedContractsByUnitMap();
        Object.keys(smap).forEach((k) => {
            const entry = smap[k];
            const p = entry && entry.payload;
            const b = toStr(p?.buildingNo || k.split('\t')[0]);
            const u = toStr(p?.flatNo || k.split('\t')[1]);
            if (normalizeReservationBuildingKey(b) === bKey && u) {
                map.set(normalizeUnit(u), u);
            }
        });
        return [...map.values()].sort((a, b) => a.localeCompare(b, 'ar', { numeric: true }));
    }

    function collectChequesForTaskUnit(building, unit) {
        const b = toStr(building);
        const u = toStr(unit);
        if (!b || !u) return [];
        const reg = loadAccountingRegistry();
        let rows = reg.cheques.filter((c) =>
            normalizeReservationBuildingKey(c.building) === normalizeReservationBuildingKey(b) &&
            normalizeUnit(c.unit) === normalizeUnit(u)
        );
        if (!rows.length) {
            const payload = getSavedContractMapEntry(loadSavedContractsByUnitMap(), b, u)?.payload;
            if (payload) {
                const tenant = toStr(payload.tenantName || payload.tenant);
                const agreementNo = toStr(payload.agreementNo);
                parsePayloadJsonArrayField(payload, 'paymentScheduleJson', 'paymentSchedule').forEach((row, idx) => {
                    const chequeNo = toStr(row.checkNo || row.chequeNo).trim();
                    const dueDate = toStr(row.dueDate || row.paymentDate);
                    const amount = parseFloat(row.amount) || 0;
                    if (!chequeNo && !dueDate && !amount) return;
                    rows.push({
                        id: `contract_rent_${idx}`,
                        linkedKey: accountingChequeLinkedKey(b, u, 'rent', idx, chequeNo),
                        building: b,
                        unit: u,
                        sourceType: 'rent',
                        chequeNo,
                        dueDate,
                        amount,
                        status: 'pending',
                        tenant,
                        agreementNo
                    });
                });
                parsePayloadJsonArrayField(payload, 'vatChequeScheduleJson', 'vatChequeSchedule').forEach((row, idx) => {
                    const chequeNo = toStr(row.checkNo || row.chequeNo).trim();
                    const dueDate = toStr(row.dueDate || row.paymentDate);
                    const amount = parseFloat(row.amount) || 0;
                    if (!chequeNo && !dueDate && !amount) return;
                    rows.push({
                        id: `contract_vat_${idx}`,
                        linkedKey: accountingChequeLinkedKey(b, u, 'vat', idx, chequeNo),
                        building: b,
                        unit: u,
                        sourceType: 'vat',
                        chequeNo,
                        dueDate,
                        amount,
                        status: 'pending',
                        tenant,
                        agreementNo
                    });
                });
            }
        }
        return rows.slice().sort((a, c) => toStr(a.dueDate).localeCompare(toStr(c.dueDate)));
    }

    function resolveAccountingChequeForTask(c) {
        if (!c) return null;
        const reg = loadAccountingRegistry();
        const rawId = toStr(c.accountingChequeId || c.id);
        if (rawId && !rawId.startsWith('contract_')) {
            const byId = reg.cheques.find((x) => x.id === rawId);
            if (byId) return byId;
        }
        const lk = toStr(c.linkedKey);
        if (lk) {
            const byKey = reg.cheques.find((x) => x.linkedKey === lk);
            if (byKey) return byKey;
        }
        return {
            id: rawId,
            linkedKey: lk,
            building: toStr(c.building),
            unit: toStr(c.unit),
            sourceType: toStr(c.sourceType),
            chequeNo: toStr(c.chequeNo),
            dueDate: toStr(c.dueDate),
            amount: parseFloat(c.amount) || 0,
            status: toStr(c.status) || 'pending',
            tenant: toStr(c.tenant),
            agreementNo: toStr(c.agreementNo),
            deferred: !!c.deferred,
            actions: []
        };
    }

    function taskChequeInAccountingRegistry(c) {
        const resolved = resolveAccountingChequeForTask(c);
        if (!resolved) return false;
        const reg = loadAccountingRegistry();
        return reg.cheques.some((x) => x.id === resolved.id || (resolved.linkedKey && x.linkedKey === resolved.linkedKey));
    }

    function renderTaskChequeStatusChip(c) {
        const resolved = resolveAccountingChequeForTask(c);
        if (!resolved) return '—';
        return accountingChequeStatusChip(resolved.status, isAccountingChequeOverdue(resolved));
    }

    function renderTaskChequeActionsHint(c) {
        const resolved = resolveAccountingChequeForTask(c);
        const n = Array.isArray(resolved?.actions) ? resolved.actions.length : (Number(c.actionCount) || 0);
        if (!n) return '';
        return `<span class="task-cheque-actions-hint" title="${t('إجراءات سابقة — اضغط لعرض التفاصيل', 'Prior actions — click for details')}">📜 ${n}</span>`;
    }

    function buildAccountingChequeDetailBodyHtml(ch) {
        const overdue = isAccountingChequeOverdue(ch);
        const acts = Array.isArray(ch.actions) ? ch.actions.slice().reverse() : [];
        const st = toStr(ch.status) || 'pending';
        const paidAmt = parseFloat(ch.paidAmount) || 0;
        const remaining = Math.max(0, (parseFloat(ch.amount) || 0) - paidAmt);
        const timeline = renderAccountingChequeTimelineHtml(ch);
        const canAct = effectivePermission('manage_accounting');
        return `
            <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px">
                ${accountingChequeStatusChip(st, overdue)}
                <span class="bhd-task-pill src-cheque">${escHtml(taskChequeSourceTypeLabel(ch.sourceType))}</span>
                ${ch.deferred || st === 'deferred' ? `<span class="bhd-task-pill" style="background:#fff3e0;color:#e65100">⏳ ${t('مؤجّل', 'Deferred')}</span>` : ''}
            </div>
            <div class="row-2cols" style="margin-bottom:10px;font-size:12px">
                <div><small>${t('المبنى / Building', 'Building / مبنى')}</small><strong style="display:block">${escHtml(ch.building || '—')}</strong></div>
                <div><small>${t('الوحدة / Unit', 'Unit / وحدة')}</small><strong style="display:block">${escHtml(ch.unit || '—')}</strong></div>
                <div><small>${t('رقم الشيك / Cheque no.', 'Cheque no. / رقم')}</small><strong style="display:block">💳 ${escHtml(ch.chequeNo || '—')}</strong></div>
                <div><small>${t('الاستحقاق / Due', 'Due / استحقاق')}</small><strong style="display:block">📅 ${escHtml(ch.dueDate || '—')}</strong></div>
                <div><small>${t('المبلغ / Amount', 'Amount / مبلغ')}</small><strong style="display:block">💵 ${escHtml(summaryAmtOm(ch.amount))}</strong></div>
                <div><small>${t('المستأجر / Tenant', 'Tenant / مستأجر')}</small><strong style="display:block">${escHtml(ch.tenant || '—')}</strong></div>
                <div><small>${t('رقم العقد / Agreement', 'Agreement / عقد')}</small><strong style="display:block">${escHtml(ch.agreementNo || '—')}</strong></div>
                ${paidAmt > 0 ? `<div><small>${t('المدفوع / Paid', 'Paid / مدفوع')}</small><strong style="display:block;color:#2e7d32">${escHtml(summaryAmtOm(paidAmt))}</strong></div>` : ''}
                ${remaining > 0 && (st === 'paid_partial' || st === 'pending') ? `<div><small>${t('المتبقي / Remaining', 'Remaining / متبقي')}</small><strong style="display:block;color:#c62828">${escHtml(summaryAmtOm(remaining))}</strong></div>` : ''}
                ${toStr(ch.accountantNote) ? `<div style="grid-column:1/-1"><small>${t('ملاحظة المحاسب / Accountant note', 'Accountant note / ملاحظة')}</small><p style="margin:4px 0 0">${escHtml(ch.accountantNote)}</p></div>` : ''}
            </div>
            <h5 style="margin:12px 0 8px;font-size:13px">📜 ${t('سجل الإجراءات / Action log', 'Action log / سجل الإجراءات')}</h5>
            ${timeline}
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
                ${acts.length ? `<button type="button" class="btn-outline mini-btn" onclick="printAccountingChequeMovementReport('${escHtml(ch.id)}')">${t('طباعة كشف الحركة / Print log', 'Print log / طباعة')}</button>` : ''}
                ${canAct && taskChequeInAccountingRegistry(ch) ? `<button type="button" class="btn-primary mini-btn" onclick="openAccountingChequeActionModal('${escHtml(ch.id)}','action')">${t('إجراء جديد / New action', 'New action / إجراء')}</button>` : ''}
            </div>`;
    }

    function openTaskChequeDetail(chequeRef) {
        const c = typeof chequeRef === 'number'
            ? _taskCreateChequeCache[chequeRef]
            : chequeRef;
        if (!c) return;
        const resolved = resolveAccountingChequeForTask(c);
        if (!resolved) return;
        const modal = document.getElementById('accountingChequeActionModal');
        const body = document.getElementById('accountingChequeActionBody');
        const title = document.getElementById('accountingChequeActionTitle');
        if (!modal || !body || !title) return;
        const inReg = taskChequeInAccountingRegistry(c);
        _accountingChequeActionCtx = inReg ? { chequeId: resolved.id, mode: 'detail' } : null;
        title.textContent = t('بيانات الشيك / Cheque details', 'Cheque details / بيانات الشيك');
        if (!inReg) {
            body.innerHTML = `
                <p style="margin:0 0 10px;font-size:11px;color:#888;line-height:1.45">${t('هذا الشيك من بيانات العقد ولم يُزامَن بعد مع سجل المحاسبة.', 'This cheque is from contract data and is not yet synced to accounting.')}</p>
                ${buildAccountingChequeDetailBodyHtml(resolved)}`;
        } else {
            body.innerHTML = buildAccountingChequeDetailBodyHtml(resolved);
        }
        modal.classList.add('open');
    }

    function openTaskChequeDetailByTaskId(taskId, chequeIndex) {
        const task = (loadTasksRegistry().tasks || []).find((x) => x.id === taskId);
        const c = Array.isArray(task?.linkedCheques) ? task.linkedCheques[chequeIndex] : null;
        if (c) openTaskChequeDetail(c);
    }

    function normalizeTaskLinkedCheque(c) {
        const resolved = resolveAccountingChequeForTask(c);
        return {
            accountingChequeId: toStr(resolved?.id || c.id),
            linkedKey: toStr(c.linkedKey || resolved?.linkedKey),
            sourceType: toStr(c.sourceType || resolved?.sourceType),
            chequeNo: toStr(c.chequeNo || resolved?.chequeNo),
            dueDate: toStr(c.dueDate || resolved?.dueDate),
            amount: parseFloat(c.amount != null ? c.amount : resolved?.amount) || 0,
            status: toStr(c.status || resolved?.status) || 'pending',
            tenant: toStr(c.tenant || resolved?.tenant),
            agreementNo: toStr(c.agreementNo || resolved?.agreementNo),
            building: toStr(c.building || resolved?.building),
            unit: toStr(c.unit || resolved?.unit),
            deferred: !!(c.deferred || resolved?.deferred),
            actionCount: Array.isArray(resolved?.actions) ? resolved.actions.length : (Number(c.actionCount) || 0)
        };
    }

    function renderTaskLinkedChequesHtml(task) {
        const cheques = Array.isArray(task.linkedCheques) ? task.linkedCheques : [];
        if (!cheques.length) return '';
        const taskId = task.id;
        const rows = cheques.map((c, i) => `<div class="task-linked-cheque-row">
                <span>💳 <button type="button" class="task-cheque-link-btn" ${safeOnClick('openTaskChequeDetailByTaskId', taskId, i)} title="${t('عرض بيانات الشيك', 'View cheque details')}">${escHtml(c.chequeNo || '—')}</button>${renderTaskChequeActionsHint(c)}</span>
                <span class="bhd-task-pill src-cheque">${escHtml(taskChequeSourceTypeLabel(c.sourceType))}</span>
                <span>📅 ${escHtml(c.dueDate || '—')}</span>
                <span>💵 ${escHtml(summaryAmtOm(c.amount))}</span>
                <span>${renderTaskChequeStatusChip(c)}</span>
            </div>`).join('');
        const total = cheques.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
        return `<div class="task-linked-cheques-panel">
            <div class="task-create-section-head">💳 ${t('الشيكات المرتبطة / Linked cheques', 'Linked cheques / شيكات')} <small style="font-weight:600;color:#888">(${cheques.length})</small></div>
            ${rows}
            <div style="margin-top:8px;font-size:12px;font-weight:700;color:#6d4c00">${t('الإجمالي', 'Total')}: ${escHtml(summaryAmtOm(total))}</div>
        </div>`;
    }

    function renderTaskCreateChequePickerHtml(cheques) {
        _taskCreateChequeCache = cheques.map((c) => normalizeTaskLinkedCheque(c));
        if (!_taskCreateChequeCache.length) {
            return `<p style="margin:0;font-size:12px;color:#888">${t('لا توجد شيكات مسجّلة لهذه الوحدة.', 'No cheques recorded for this unit.')}</p>`;
        }
        const rows = _taskCreateChequeCache.map((c, i) => {
            const actsHint = renderTaskChequeActionsHint(c);
            return `<tr class="task-cheque-row-clickable" title="${t('اضغط رقم الشيك لعرض التفاصيل', 'Click cheque no. for details')}">
            <td style="text-align:center;width:36px" onclick="event.stopPropagation()"><input type="checkbox" class="task-create-cheque-chk" value="${i}" checked></td>
            <td><button type="button" class="task-cheque-link-btn" ${safeOnClick('openTaskChequeDetail', i)}>${escHtml(c.chequeNo || '—')}</button>${actsHint}</td>
            <td><span class="bhd-task-pill src-cheque">${escHtml(taskChequeSourceTypeLabel(c.sourceType))}</span></td>
            <td>${escHtml(c.dueDate || '—')}</td>
            <td>${escHtml(summaryAmtOm(c.amount))}</td>
            <td>${renderTaskChequeStatusChip(c)}</td>
        </tr>`;
        }).join('');
        return `<div class="task-create-cheque-toolbar">
            <button type="button" class="btn-outline mini-btn" onclick="taskCreateChequeSelectAll(true)">${t('تحديد الكل / Select all', 'Select all / الكل')}</button>
            <button type="button" class="btn-outline mini-btn" onclick="taskCreateChequeSelectAll(false)">${t('إلغاء التحديد / Clear', 'Clear selection / إلغاء')}</button>
        </div>
        <div class="table-wrap" style="max-height:240px;overflow:auto;border:1px solid #e8edf2;border-radius:8px">
            <table class="data-table" id="taskCreateChequeTable" style="width:100%;font-size:12px;margin:0">
                <thead><tr>
                    <th>✓</th>
                    <th>${t('رقم الشيك / Cheque no.', 'Cheque no. / رقم')}</th>
                    <th>${t('النوع / Type', 'Type / نوع')}</th>
                    <th>${t('الاستحقاق / Due', 'Due / استحقاق')}</th>
                    <th>${t('المبلغ / Amount', 'Amount / مبلغ')}</th>
                    <th>${t('الحالة / Status', 'Status / حالة')}</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    }

    function taskCreateChequeSelectAll(on) {
        document.querySelectorAll('#taskCreateChequeTable .task-create-cheque-chk').forEach((chk) => {
            chk.checked = !!on;
        });
    }

    function collectTaskCreateChequeSelections() {
        const table = document.getElementById('taskCreateChequeTable');
        if (!table) return [];
        const out = [];
        table.querySelectorAll('input.task-create-cheque-chk:checked').forEach((chk) => {
            const idx = parseInt(chk.value, 10);
            if (_taskCreateChequeCache[idx]) out.push({ ..._taskCreateChequeCache[idx] });
        });
        return out;
    }

    function refreshTaskCreateUnitSelect(building, selectedUnit) {
        const sel = document.getElementById('taskCreateUnit');
        if (!sel) return;
        const units = collectUnitsForBuildingName(building);
        sel.innerHTML = `<option value="">${t('— اختر الوحدة —', '— Select unit —')}</option>` +
            units.map((u) => `<option value="${escHtml(u)}"${toStr(selectedUnit) === u ? ' selected' : ''}>${escHtml(u)}</option>`).join('');
    }

    function onTaskCreateBuildingChange() {
        const building = toStr(document.getElementById('taskCreateBuilding')?.value);
        refreshTaskCreateUnitSelect(building, '');
        onTaskCreateUnitChange();
    }

    function onTaskCreateUnitChange() {
        const linkType = toStr(document.getElementById('taskCreateLinkType')?.value);
        const host = document.getElementById('taskCreateChequePickerHost');
        if (!host || linkType !== 'cheque_rent') return;
        const building = toStr(document.getElementById('taskCreateBuilding')?.value);
        const unit = toStr(document.getElementById('taskCreateUnit')?.value);
        if (!building || !unit) {
            host.innerHTML = `<p style="margin:0;font-size:12px;color:#888">${t('اختر المبنى والوحدة أولاً.', 'Select building and unit first.')}</p>`;
            _taskCreateChequeCache = [];
            return;
        }
        host.innerHTML = renderTaskCreateChequePickerHtml(collectChequesForTaskUnit(building, unit));
    }

    function taskTeamLabel(team) {
        if (team === 'maintenance') return t('فريق الصيانة / Maintenance', 'Maintenance team / فريق الصيانة');
        if (team === 'accounting') return t('فريق المحاسبة / Accounting', 'Accounting team / فريق المحاسبة');
        return t('فريق الإدارة / Admin', 'Admin team / فريق الإدارة');
    }

    function taskStatusLabel(st) {
        if (st === 'in_progress') return t('قيد التنفيذ / In progress', 'In progress / قيد التنفيذ');
        if (st === 'completed') return t('مكتملة / Completed', 'Completed / مكتملة');
        if (st === 'cancelled') return t('ملغاة / Cancelled', 'Cancelled / ملغاة');
        return t('مفتوحة / Open', 'Open / مفتوحة');
    }

    function taskSourceKindLabel(kind) {
        const map = {
            maintenance_start: t('تنفيذ صيانة / Maintenance', 'Maintenance execution / صيانة'),
            contract_renewal: t('تجديد عقد / Contract renewal', 'Contract renewal / تجديد عقد'),
            document_expiry: t('مستندات منتهية / Document expiry', 'Document expiry / مستندات'),
            cheque_deposit: t('إيداع شيك / Cheque deposit', 'Cheque deposit / إيداع شيك'),
            tenant_overdue: t('متأخرات مستأجر / Tenant overdue', 'Tenant overdue / متأخرات'),
            manual: t('يدوية / Manual', 'Manual / يدوية')
        };
        return map[kind] || kind || '—';
    }

    function getAllUsersForTaskAssign() {
        try { reloadUsersRegistryFromStorageForAuth(); } catch (_eTu) {}
        return (usersRegistry || [])
            .map((u) => normalizeUserRecord(u))
            .filter((u) => u && toStr(u.displayName || u.email))
            .sort((a, b) => toStr(a.displayName || a.email).localeCompare(toStr(b.displayName || b.email), 'ar'));
    }

    function userCanSeeTaskTeam(team) {
        const tk = toStr(team);
        if (tk === 'maintenance') return effectivePermission('manage_maintenance');
        if (tk === 'accounting') return effectivePermission('manage_accounting');
        return effectivePermission('manage_dashboard') || effectivePermission('manage_contracts');
    }

    function taskVisibleToUser(task, user) {
        if (!task || !user) return false;
        const uid = toStr(user.id);
        const assignees = (task.assigneeUserIds || []).map((x) => toStr(x));
        const watchers = (task.watcherUserIds || []).map((x) => toStr(x));
        if (assignees.includes(uid) || watchers.includes(uid)) return true;
        if (user.role === 'system_admin') return true;
        return userCanSeeTaskTeam(task.team);
    }

    function taskIsAssignedToUser(task, uid) {
        if (!task || !uid) return false;
        const id = toStr(uid);
        return (task.assigneeUserIds || []).map((x) => toStr(x)).includes(id)
            || (task.watcherUserIds || []).map((x) => toStr(x)).includes(id);
    }

    function findTaskBySourceKey(reg, sourceKey) {
        return (reg.tasks || []).find((x) => toStr(x.sourceKey) === toStr(sourceKey));
    }

    function subtractCalendarMonthsFromYmd(ymd, months) {
        const d = parseYmdToLocalDate(ymd);
        if (!d || !Number.isFinite(months)) return '';
        d.setMonth(d.getMonth() - Number(months));
        return formatDateYmdLocal(d);
    }

    function upsertAutoTask(reg, partial) {
        const sourceKey = toStr(partial.sourceKey);
        if (!sourceKey) return null;
        const actor = getCurrentActorLedgerRecord();
        let task = findTaskBySourceKey(reg, sourceKey);
        if (task && ['completed', 'cancelled'].includes(toStr(task.status)) && !partial.forceReopen) {
            return task;
        }
        const now = new Date().toISOString();
        if (!task) {
            task = {
                id: newTaskId(),
                taskNo: nextTaskNo(reg),
                sourceKey,
                sourceKind: toStr(partial.sourceKind) || 'manual',
                team: toStr(partial.team) || 'admin',
                title: toStr(partial.title),
                body: toStr(partial.body),
                status: 'open',
                priority: partial.priority || 'normal',
                dueDate: toStr(partial.dueDate),
                assigneeUserIds: Array.isArray(partial.assigneeUserIds) ? partial.assigneeUserIds.map((x) => toStr(x)).filter(Boolean) : [],
                assigneeNames: Array.isArray(partial.assigneeNames) ? partial.assigneeNames.map((x) => toStr(x)) : [],
                watcherUserIds: Array.isArray(partial.watcherUserIds) ? partial.watcherUserIds.map((x) => toStr(x)).filter(Boolean) : [],
                watcherNames: Array.isArray(partial.watcherNames) ? partial.watcherNames.map((x) => toStr(x)) : [],
                building: toStr(partial.building),
                unit: toStr(partial.unit),
                ref: toStr(partial.ref),
                relatedId: toStr(partial.relatedId),
                createdAt: now,
                createdBy: actor.staffName || t('النظام', 'System'),
                completedAt: null,
                completedBy: null,
                messages: [],
                lockedViewerUserIds: [],
                events: [{
                    at: now,
                    type: 'created',
                    staffName: actor.staffName || t('النظام', 'System'),
                    note: t('إنشاء مهمة تلقائية', 'Auto task created')
                }]
            };
            reg.tasks.push(task);
            const taskLabel = `${toStr(task.taskNo)} — ${toStr(task.title)}`;
            const actorName = actor.staffName || t('النظام', 'System');
            (task.assigneeUserIds || []).forEach((id) => {
                pushTaskUserAlert(reg, {
                    task,
                    targetUserId: id,
                    actorUserId: actor.staffUserId,
                    actorName,
                    kind: 'assigned_assignee',
                    title: t(`مهمة جديدة — ${task.taskNo}`, `New task — ${task.taskNo}`),
                    body: t(
                        `تم تعيينك مسؤولاً عن المهمة: ${taskLabel}`,
                        `You were assigned to task: ${taskLabel}`
                    )
                });
            });
        } else {
            const before = captureTaskParticipantSnapshot(task);
            task.title = toStr(partial.title) || task.title;
            task.body = toStr(partial.body) || task.body;
            task.priority = partial.priority || task.priority;
            task.dueDate = toStr(partial.dueDate) || task.dueDate;
            if (Array.isArray(partial.assigneeUserIds) && partial.assigneeUserIds.length) {
                task.assigneeUserIds = partial.assigneeUserIds.map((x) => toStr(x)).filter(Boolean);
                task.assigneeNames = (partial.assigneeNames || []).map((x) => toStr(x));
            }
            if (Array.isArray(partial.watcherUserIds)) {
                task.watcherUserIds = partial.watcherUserIds.map((x) => toStr(x)).filter(Boolean);
                task.watcherNames = (partial.watcherNames || []).map((x) => toStr(x));
            }
            if (toStr(task.status) === 'completed' && partial.forceReopen) {
                task.status = 'open';
                task.completedAt = null;
                task.completedBy = null;
            }
            emitTaskParticipantDiffAlerts(reg, task, before, actor);
        }
        return task;
    }

    function syncContractRenewalTasks(reg, settings) {
        const months = Math.max(0, parseInt(settings.contractRenewalMonthsBefore, 10) || 3);
        const activeKeys = new Set();
        getUnitsData().forEach((unit) => {
            const endDate = toStr(unit.endDate);
            if (!endDate) return;
            if (toStr(unit.status).toLowerCase() !== 'rented') return;
            const days = daysUntil(endDate);
            if (days === null || days < 0) return;
            const leadStart = subtractCalendarMonthsFromYmd(endDate, months);
            const today = formatDateYmdLocal(new Date());
            if (leadStart && today < leadStart) return;
            const b = toStr(unit.building);
            const un = toStr(unit.unit);
            const agr = toStr(unit.agreementNo) || getAgreementNoForSavedUnit(b, un);
            const sourceKey = `contract_renewal|${b}|${un}|${endDate}`;
            activeKeys.add(sourceKey);
            upsertAutoTask(reg, {
                sourceKey,
                sourceKind: 'contract_renewal',
                team: 'admin',
                title: t(`متابعة تجديد عقد — ${agr}`, `Follow up contract renewal — ${agr}`),
                body: t(
                    `${b} / ${un} — ${toStr(unit.tenant) || '—'} — ينتهي ${endDate} (≈ ${days} يوم)`,
                    `${b} / ${un} — ${toStr(unit.tenant) || '—'} — ends ${endDate} (≈ ${days} days)`
                ),
                priority: days <= 30 ? 'high' : 'normal',
                dueDate: endDate,
                building: b,
                unit: un,
                ref: agr,
                relatedId: `${b}|${un}`
            });
        });
        (reg.tasks || []).forEach((task) => {
            if (toStr(task.sourceKind) !== 'contract_renewal') return;
            if (!activeKeys.has(toStr(task.sourceKey)) && TASK_OPEN_STATUSES.includes(toStr(task.status))) {
                task.status = 'cancelled';
                task.events = task.events || [];
                task.events.push({ at: new Date().toISOString(), type: 'auto_cancelled', staffName: t('النظام', 'System'), note: t('لم يعد العقد ضمن نافذة التجديد', 'Contract no longer in renewal window') });
            }
        });
    }

    function collectAddressBookDocumentExpiries(entry) {
        const out = [];
        const name = toStr(entry?.name) || toStr(entry?.nameEn) || '—';
        const key = toStr(entry?.key) || name;
        if (toStr(entry?.idExpiryDate)) {
            out.push({ sourceKey: `doc_expiry|${key}|id|${entry.idExpiryDate}`, label: t('بطاقة', 'ID'), date: entry.idExpiryDate, name });
        }
        if (toStr(entry?.passportExpiryDate)) {
            out.push({ sourceKey: `doc_expiry|${key}|passport|${entry.passportExpiryDate}`, label: t('جواز', 'Passport'), date: entry.passportExpiryDate, name });
        }
        if (toStr(entry?.commercialRegExpiry)) {
            out.push({ sourceKey: `doc_expiry|${key}|cr|${entry.commercialRegExpiry}`, label: t('سجل تجاري', 'CR'), date: entry.commercialRegExpiry, name });
        }
        return out;
    }

    function syncDocumentExpiryTasks(reg, settings) {
        const months = Math.max(0, parseInt(settings.documentExpiryMonthsBefore, 10) || 3);
        const activeKeys = new Set();
        const today = formatDateYmdLocal(new Date());
        (addressBookEntries || []).forEach((entry) => {
            collectAddressBookDocumentExpiries(entry).forEach((doc) => {
                const days = daysUntil(doc.date);
                if (days === null) return;
                const leadStart = subtractCalendarMonthsFromYmd(doc.date, months);
                if (leadStart && today < leadStart) return;
                if (days < -30) return;
                activeKeys.add(doc.sourceKey);
                upsertAutoTask(reg, {
                    sourceKey: doc.sourceKey,
                    sourceKind: 'document_expiry',
                    team: 'admin',
                    title: t(`متابعة مستند منتهٍ — ${doc.label}`, `Follow up expiring document — ${doc.label}`),
                    body: t(`${doc.name} — ${doc.label} — ${doc.date}`, `${doc.name} — ${doc.label} — ${doc.date}`),
                    priority: days <= 30 ? 'high' : 'normal',
                    dueDate: doc.date,
                    ref: doc.name
                });
            });
        });
        (reg.tasks || []).forEach((task) => {
            if (toStr(task.sourceKind) !== 'document_expiry') return;
            if (!activeKeys.has(toStr(task.sourceKey)) && TASK_OPEN_STATUSES.includes(toStr(task.status))) {
                task.status = 'cancelled';
            }
        });
    }

    function syncChequeDepositTasks(reg, settings) {
        const daysBefore = Math.max(0, parseInt(settings.chequeDepositDaysBefore, 10) || 0);
        const activeKeys = new Set();
        const acct = loadAccountingRegistry();
        const today = formatDateYmdLocal(new Date());
        (acct.cheques || []).forEach((c) => {
            if (!c || isAccountingChequePaidStatus(c.status)) return;
            if (['bounced', 'returned'].includes(toStr(c.status))) return;
            const due = toStr(c.dueDate);
            if (!due) return;
            const taskDate = daysBefore ? addCalendarDaysToYmd(due, -daysBefore) : due;
            if (taskDate && today < taskDate) return;
            const sourceKey = `cheque_deposit|${c.id}`;
            activeKeys.add(sourceKey);
            upsertAutoTask(reg, {
                sourceKey,
                sourceKind: 'cheque_deposit',
                team: 'accounting',
                title: t(`إيداع شيك — ${toStr(c.chequeNo) || '—'}`, `Deposit cheque — ${toStr(c.chequeNo) || '—'}`),
                body: t(
                    `${c.building} / ${c.unit} — ${toStr(c.tenant) || '—'} — ${summaryAmtOm(c.amount)} — استحقاق ${due}`,
                    `${c.building} / ${c.unit} — ${toStr(c.tenant) || '—'} — ${summaryAmtOm(c.amount)} — due ${due}`
                ),
                priority: isAccountingChequeOverdue(c) ? 'high' : 'normal',
                dueDate: due,
                building: toStr(c.building),
                unit: toStr(c.unit),
                ref: toStr(c.chequeNo),
                relatedId: toStr(c.id)
            });
        });
        (reg.tasks || []).forEach((task) => {
            if (toStr(task.sourceKind) !== 'cheque_deposit') return;
            if (!activeKeys.has(toStr(task.sourceKey)) && TASK_OPEN_STATUSES.includes(toStr(task.status))) {
                task.status = 'cancelled';
            }
        });
    }

    function getAdminUserIdsForTasks() {
        return getAllUsersForTaskAssign()
            .filter((u) => u.role === 'system_admin' || effectivePermissionForUser(u, 'manage_dashboard'))
            .map((u) => toStr(u.id));
    }

    function getAccountingUserIdsForTasks() {
        return getAllUsersForTaskAssign()
            .filter((u) => effectivePermissionForUser(u, 'manage_accounting'))
            .map((u) => toStr(u.id));
    }

    function effectivePermissionForUser(user, permKey) {
        if (!user || !user.permissions) return false;
        return !!user.permissions[permKey];
    }

    function syncTenantOverdueTasks(reg, settings) {
        const followDays = Math.max(1, parseInt(settings.tenantOverdueFollowupDays, 10) || 7);
        const activeKeys = new Set();
        const acct = loadAccountingRegistry();
        const adminIds = getAdminUserIdsForTasks();
        const acctIds = getAccountingUserIdsForTasks();
        const adminNames = getAllUsersForTaskAssign().filter((u) => adminIds.includes(u.id)).map((u) => toStr(u.displayName || u.email));
        const acctNames = getAllUsersForTaskAssign().filter((u) => acctIds.includes(u.id)).map((u) => toStr(u.displayName || u.email));
        (acct.cheques || []).forEach((c) => {
            if (!c || isAccountingChequePaidStatus(c.status)) return;
            if (!isAccountingChequeOverdue(c)) return;
            const due = toStr(c.dueDate);
            const overdueDays = due ? -daysUntil(due) : 0;
            if (overdueDays < followDays) return;
            const sourceKey = `tenant_overdue|${c.id}|${due}`;
            activeKeys.add(sourceKey);
            upsertAutoTask(reg, {
                sourceKey,
                sourceKind: 'tenant_overdue',
                team: 'admin',
                title: t(`متابعة متأخرات — ${toStr(c.tenant) || '—'}`, `Follow up arrears — ${toStr(c.tenant) || '—'}`),
                body: t(
                    `${c.building} / ${c.unit} — شيك ${toStr(c.chequeNo) || '—'} — متأخر ${overdueDays} يوم — ${summaryAmtOm(c.amount)}`,
                    `${c.building} / ${c.unit} — cheque ${toStr(c.chequeNo) || '—'} — ${overdueDays} days overdue — ${summaryAmtOm(c.amount)}`
                ),
                priority: 'high',
                dueDate: formatDateYmdLocal(new Date()),
                assigneeUserIds: adminIds,
                assigneeNames: adminNames,
                watcherUserIds: acctIds,
                watcherNames: acctNames,
                building: toStr(c.building),
                unit: toStr(c.unit),
                ref: toStr(c.chequeNo),
                relatedId: toStr(c.id)
            });
        });
        (reg.tasks || []).forEach((task) => {
            if (toStr(task.sourceKind) !== 'tenant_overdue') return;
            if (!activeKeys.has(toStr(task.sourceKey)) && TASK_OPEN_STATUSES.includes(toStr(task.status))) {
                task.status = 'cancelled';
            }
        });
    }

    function syncAllAutoTasks() {
        const reg = loadTasksRegistry();
        const settings = reg.settings || defaultTasksRegistry().settings;
        syncContractRenewalTasks(reg, settings);
        syncDocumentExpiryTasks(reg, settings);
        syncChequeDepositTasks(reg, settings);
        syncTenantOverdueTasks(reg, settings);
        saveTasksRegistry(reg);
    }

    let _coaLinksSyncLastAt = 0;

    function shouldRunCoaLinksSync() {
        if (document.body.classList.contains('mode-accounting')) return true;
        return Date.now() - (_coaLinksSyncLastAt || 0) > 300000;
    }

    function scheduleCoaLinksSyncIfNeeded() {
        if (!shouldRunCoaLinksSync()) return;
        const run = () => {
            bhdAuditMute();
            let changed = false;
            try {
                changed = !!syncCoaLinksFromSystem();
            } catch (_eCoaSched) {
            } finally {
                bhdAuditUnmute();
            }
            if (changed && document.body.classList.contains('mode-accounting')) {
                renderAccountingWorkspace();
            }
        };
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(run, { timeout: 6000 });
        } else {
            setTimeout(run, 50);
        }
    }

    function refreshVisibleWorkspaceAfterAutoSync(touched) {
        if (!touched) return;
        try {
            if (document.body.classList.contains('mode-accounting')) {
                renderAccountingWorkspace();
                refreshAccountingReceiptDetailModalIfOpen();
            } else if (document.body.classList.contains('mode-dashboard')) {
                renderOperationsTable();
                renderRegistryTable();
                renderDashboardCalendar();
            } else if (document.body.classList.contains('mode-notifications')) {
                renderNotificationsPage();
                updateNotificationsNavBadge();
            } else if (document.body.classList.contains('mode-addressbook')) {
                renderAddressBookTable();
            } else if (document.body.classList.contains('mode-maintenance')) {
                renderMaintenanceWorkspace();
            }
        } catch (_eWsRefresh) {}
    }

    function runAutomaticDataSyncNow() {
        const st = _autoDataSyncState;
        if (st.inProgress) {
            st.pending = true;
            return;
        }
        st.inProgress = true;
        st.pending = false;
        let touched = false;
        const finish = () => {
            st.inProgress = false;
            st.lastAt = Date.now();
            _tasksSyncLastAt = st.lastAt;
            refreshVisibleWorkspaceAfterAutoSync(touched);
            scheduleBhdKvToServer();
            if (st.pending) setTimeout(runAutomaticDataSyncNow, 250);
        };
        bhdAuditMute();
        setTimeout(() => {
            try {
                touched = syncAllAccountingFromSavedContracts() || touched;
            } catch (_eAutoAcct) {
                console.warn('automatic accounting sync failed', _eAutoAcct);
            }
            setTimeout(() => {
                try {
                    syncAllAutoTasks();
                } catch (_eAutoTasks) {
                    console.warn('automatic tasks sync failed', _eAutoTasks);
                }
                setTimeout(() => {
                    try {
                        if (shouldRunCoaLinksSync()) {
                            touched = syncCoaLinksFromSystem() || touched;
                        }
                    } catch (_eAutoCoa) {
                        console.warn('automatic COA sync failed', _eAutoCoa);
                    } finally {
                        bhdAuditUnmute();
                        finish();
                    }
                }, 0);
            }, 0);
        }, 0);
    }

    /** مزامنة تلقائية في الخلفية — لا تعطل التنقل بين الصفحات / Background auto-sync without blocking navigation */
    function scheduleAutomaticDataSync(force) {
        const st = _autoDataSyncState;
        const now = Date.now();
        if (!force && now - (st.lastAt || 0) < 60000) return;
        if (st.inProgress) {
            st.pending = true;
            return;
        }
        if (st.timer) return;
        st.timer = setTimeout(() => {
            st.timer = null;
            const run = () => runAutomaticDataSyncNow();
            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(run, { timeout: force ? 10000 : 4000 });
            } else {
                setTimeout(run, force ? 300 : 60);
            }
        }, force ? 2500 : 120);
    }

    function syncAllAutoTasksIfStale() {
        scheduleAutomaticDataSync(false);
    }

    function createMaintenanceExecutionTask(req, note) {
        if (!req) return;
        const reg = loadTasksRegistry();
        const assigneeIds = [];
        const assigneeNames = [];
        if (toStr(req.assigneeUserId)) {
            assigneeIds.push(toStr(req.assigneeUserId));
            assigneeNames.push(toStr(req.assigneeName));
        }
        const itemSummary = (req.items || []).map((it) => t(it.labelAr, it.labelEn)).join(' · ');
        upsertAutoTask(reg, {
            sourceKey: `maintenance_exec|${req.id}`,
            sourceKind: 'maintenance_start',
            team: 'maintenance',
            title: t(`تنفيذ صيانة — ${req.requestNo}`, `Execute maintenance — ${req.requestNo}`),
            body: t(
                `${req.building} / ${req.unit} — ${itemSummary}${note ? ` — ${note}` : ''}`,
                `${req.building} / ${req.unit} — ${itemSummary}${note ? ` — ${note}` : ''}`
            ),
            priority: 'high',
            dueDate: formatDateYmdLocal(new Date()),
            assigneeUserIds: assigneeIds,
            assigneeNames: assigneeNames,
            building: req.building,
            unit: req.unit,
            ref: req.requestNo,
            relatedId: req.id,
            forceReopen: true
        });
        saveTasksRegistry(reg);
        const task = findTaskBySourceKey(reg, `maintenance_exec|${req.id}`);
        if (task) {
            appendMaintenanceTaskEvent(req.id, {
                at: task.createdAt,
                type: 'task_created',
                staffName: task.createdBy,
                note: `${task.taskNo} — ${task.title}${note ? ` — ${note}` : ''}`,
                taskNo: task.taskNo,
                taskId: task.id
            });
        }
        refreshNotificationsIfVisible();
    }

    function completeRegistryTask(taskId, note) {
        const reg = loadTasksRegistry();
        const task = (reg.tasks || []).find((x) => x.id === taskId);
        if (!task) return;
        const actor = getCurrentActorLedgerRecord();
        const noteText = toStr(note) || t('إكمال المهمة', 'Task completed');
        task.status = 'completed';
        task.completedAt = new Date().toISOString();
        task.completedBy = actor.staffName;
        const completedMsg = appendTaskMessage(task, { type: 'completed', text: noteText });
        mirrorTaskMessageToMaintenanceRequest(task, completedMsg);
        pushTaskUserAlertsForParticipants(reg, task, actor.staffUserId, {
            actorUserId: actor.staffUserId,
            actorName: actor.staffName,
            kind: 'task_completed',
            title: t(`إكمال المهمة — ${task.taskNo}`, `Task completed — ${task.taskNo}`),
            body: t(
                `${actor.staffName} أكمل المهمة: ${task.taskNo} — ${noteText.slice(0, 120)}`,
                `${actor.staffName} completed task: ${task.taskNo} — ${noteText.slice(0, 120)}`
            )
        });
        saveTasksRegistry(reg);
        resetTaskComposeState('', '');
        refreshNotificationsIfVisible();
        renderTasksRegistryPanelIfVisible();
        try { openTaskDetailModal(taskId); } catch (_eC) {}
    }

    function setRegistryTaskStatus(taskId, status, note) {
        const reg = loadTasksRegistry();
        const task = (reg.tasks || []).find((x) => x.id === taskId);
        if (!task) return;
        const actor = getCurrentActorLedgerRecord();
        task.status = status;
        task.events = task.events || [];
        task.events.push({ at: new Date().toISOString(), type: status, staffName: actor.staffName, note: toStr(note) });
        saveTasksRegistry(reg);
        refreshNotificationsIfVisible();
        renderTasksRegistryPanelIfVisible();
    }

    function transferRegistryTask(taskId, assigneeUserIds, watcherUserIds, note) {
        const reg = loadTasksRegistry();
        const task = (reg.tasks || []).find((x) => x.id === taskId);
        if (!task) return;
        const users = getAllUsersForTaskAssign();
        const actor = getCurrentActorLedgerRecord();
        const actorId = toStr(actor.staffUserId);
        const before = captureTaskParticipantSnapshot(task);
        const prevAssignees = [...(task.assigneeUserIds || [])];
        const aIds = (assigneeUserIds || []).map((x) => toStr(x)).filter(Boolean);
        let wIds = (watcherUserIds || []).map((x) => toStr(x)).filter(Boolean);
        prevAssignees.forEach((id) => {
            lockTaskViewer(task, id);
            if (!aIds.includes(id) && !wIds.includes(id)) wIds.push(id);
        });
        if (actorId) lockTaskViewer(task, actorId);
        aIds.forEach((id) => {
            wIds = wIds.filter((w) => w !== id);
        });
        task.assigneeUserIds = aIds;
        task.assigneeNames = aIds.map((id) => {
            const u = users.find((x) => x.id === id);
            return u ? toStr(u.displayName || u.email) : id;
        });
        task.watcherUserIds = [...new Set(wIds)];
        task.watcherNames = task.watcherUserIds.map((id) => {
            const u = users.find((x) => x.id === id);
            return u ? toStr(u.displayName || u.email) : id;
        });
        appendTaskMessage(task, {
            type: 'transfer',
            text: toStr(note) || t('تحديث المسؤولين والمطلعين', 'Updated assignees and watchers')
        });
        emitTaskParticipantDiffAlerts(reg, task, before, actor);
        saveTasksRegistry(reg);
        refreshNotificationsIfVisible();
        renderTasksRegistryPanelIfVisible();
        openTaskDetailModal(taskId);
    }

    function collectRegistryTaskNotificationItems(uid) {
        const items = [];
        if (!uid) return items;
        const reg = loadTasksRegistry();
        (reg.tasks || []).forEach((task) => {
            if (!TASK_OPEN_STATUSES.includes(toStr(task.status))) return;
            const assignees = (task.assigneeUserIds || []).map((x) => toStr(x));
            const watchers = (task.watcherUserIds || []).map((x) => toStr(x));
            if (!assignees.includes(uid) && !watchers.includes(uid)) return;
            const actions = [
                {
                    label: t('فتح المهمة / Open task', 'Open task / فتح'),
                    onclick: `openTaskFromNotification(${JSON.stringify(task.id)})`,
                    primary: true
                }
            ];
            if (toStr(task.sourceKind) === 'maintenance_start' && task.relatedId) {
                actions.push({
                    label: t('طلب الصيانة / Maintenance', 'Maintenance request / طلب'),
                    onclick: `openMaintenanceDetailModal(${JSON.stringify(task.relatedId)})`
                });
            }
            if (toStr(task.sourceKind) === 'cheque_deposit' && task.relatedId) {
                actions.push({
                    label: t('الشيك / Cheque', 'Cheque / شيك'),
                    onclick: `openAccountingChequeActionModal(${JSON.stringify(task.relatedId)},'action')`
                });
            }
            const lastMsg = (task.messages || []).slice(-1)[0];
            const preview = lastMsg ? lastMsg.text : (task.body || '');
            items.push({
                id: `registry-task-${task.id}`,
                category: 'task',
                priority: task.priority === 'high' ? 'high' : 'normal',
                at: lastMsg?.at || task.dueDate || task.createdAt,
                title: task.title,
                body: `${preview} · ${taskStatusLabel(task.status)} · ${taskTeamLabel(task.team)}`,
                searchText: `${task.title} ${task.body} ${task.taskNo} ${task.team} task registry`.toLowerCase(),
                actions
            });
        });
        return items;
    }

    function getFilteredRegistryTasks() {
        scheduleAutomaticDataSync(false);
        const reg = loadTasksRegistry();
        const u = getLoggedInUser();
        const q = toStr(_tasksUiState.search).toLowerCase();
        const team = toStr(_tasksUiState.team);
        const st = toStr(_tasksUiState.status);
        let rows = (reg.tasks || []).filter((task) => {
            if (!u || !taskUserHasAccess(task, u)) return false;
            if (team !== 'all' && toStr(task.team) !== team) return false;
            if (st === 'open' && !TASK_OPEN_STATUSES.includes(toStr(task.status))) return false;
            if (st === 'completed' && toStr(task.status) !== 'completed') return false;
            if (st === 'all') { /* keep */ }
            else if (st !== 'open' && st !== 'completed' && toStr(task.status) !== st) return false;
            const hay = `${task.title} ${task.body} ${task.taskNo} ${task.ref} ${task.building} ${task.unit}`.toLowerCase();
            return !q || hay.includes(q);
        });
        const sk = _tasksUiState.sortKey;
        const sd = _tasksUiState.sortDir === 'desc' ? -1 : 1;
        rows = rows.slice().sort((a, b) => {
            if (sk === 'priority') {
                const pri = { high: 0, normal: 1, low: 2 };
                return sd * ((pri[a.priority] || 9) - (pri[b.priority] || 9));
            }
            if (sk === 'status') return sd * toStr(a.status).localeCompare(toStr(b.status));
            return sd * toStr(a.dueDate || a.createdAt).localeCompare(toStr(b.dueDate || b.createdAt));
        });
        return rows;
    }

    function buildTaskRowsHtml(tasks) {
        if (!tasks.length) {
            return `<p style="margin:0;padding:24px 0;text-align:center;color:#666;font-size:13px">📋 ${t('لا توجد مهام مطابقة / No matching tasks', 'No matching tasks / لا توجد مهام')}</p>`;
        }
        return tasks.map((task) => {
            const team = taskTeamMeta(task.team);
            const src = taskSourceKindMeta(task.sourceKind);
            const pri = taskPriorityMeta(task.priority);
            const stClass = `bhd-task-status-${toStr(task.status).replace(/[^a-z_]/gi, '')}`;
            const assignees = (task.assigneeNames || []).join('، ') || t('غير معيّن / Unassigned', 'Unassigned / غير معيّن');
            const loc = [task.building, task.unit].filter(Boolean).join(' / ');
            const chequeCount = Array.isArray(task.linkedCheques) ? task.linkedCheques.length : 0;
            const chequeBadge = chequeCount
                ? `<span class="bhd-task-pill src-cheque">💳 ${chequeCount} ${t('شيك', 'cheque')}${chequeCount > 1 ? (t('ات', 's')) : ''}</span>`
                : '';
            return `<article class="bhd-task-card bhd-task-card--${escHtml(toStr(task.team))} ${pri.cls}">
                <div class="bhd-task-card-accent"></div>
                <div class="bhd-task-card-main">
                    <div style="flex:1;min-width:220px">
                        <div class="bhd-task-card-head">
                            <span class="bhd-task-no-badge">${escHtml(task.taskNo)}</span>
                            <span class="bhd-task-pill ${team.cls}">${team.icon} ${escHtml(taskTeamLabel(task.team))}</span>
                            <span class="bhd-task-pill ${src.cls}">${src.icon} ${escHtml(taskSourceKindLabel(task.sourceKind))}</span>
                            <span class="bhd-task-pill ${pri.cls}">${pri.icon} ${escHtml(pri.label)}</span>
                            ${chequeBadge}
                        </div>
                        <h4 class="bhd-task-card-title">${escHtml(task.title)}</h4>
                        <p class="bhd-task-card-body">${escHtml(task.body || '—')}</p>
                        <div class="bhd-task-card-meta">
                            👤 ${escHtml(assignees)}
                            ${loc ? ` · 🏠 ${escHtml(loc)}` : ''}
                            ${task.ref ? ` · 🔖 ${escHtml(task.ref)}` : ''}
                        </div>
                    </div>
                    <div class="bhd-task-card-side">
                        <div class="${stClass}" style="margin-bottom:4px">● ${escHtml(taskStatusLabel(task.status))}</div>
                        <small style="color:#667">📅 ${escHtml(task.dueDate || '—')}</small>
                        <div class="bhd-task-card-actions" style="margin-top:8px">
                            <button type="button" class="btn-primary mini-btn" ${safeOnClick('openTaskDetailModal', task.id)}>${t('فتح / Open', 'Open / فتح')}</button>
                            ${TASK_OPEN_STATUSES.includes(toStr(task.status)) ? `<button type="button" class="btn-outline mini-btn" ${safeOnClick('openTaskCompleteConfirmModal', task.id)}>${t('إكمال / Done', 'Done / إكمال')}</button>` : ''}
                        </div>
                    </div>
                </div>
            </article>`;
        }).join('');
    }

    function renderTasksRegistryPanelIfVisible() {
        const host = document.getElementById('tasksRegistryListBody');
        if (host) host.innerHTML = buildTaskRowsHtml(getFilteredRegistryTasks());
    }

    function setTasksRegistryView(view) {
        notificationsPageState.view = view || 'alerts';
        renderNotificationsPage();
    }

    function setTasksUiFilter(field, value) {
        _tasksUiState[field] = value;
        renderTasksRegistryPanelIfVisible();
    }

    function openTaskFromNotification(taskId) {
        openNotificationsWorkspace();
        notificationsPageState.view = 'tasks';
        renderNotificationsPage();
        openTaskDetailModal(taskId);
    }

    function taskLinkedMaintenanceRequestId(task) {
        const rid = toStr(task?.relatedId);
        if (!rid) return '';
        if (toStr(task.sourceKind) === 'maintenance_start') return rid;
        const req = loadMaintenanceRegistry().requests.find((r) => r.id === rid);
        return req ? rid : '';
    }

    function taskLinkedParentTaskId(task) {
        const rid = toStr(task?.relatedId);
        if (!rid || taskLinkedMaintenanceRequestId(task)) return '';
        const parent = loadTasksRegistry().tasks.find((tk) => tk.id === rid);
        return parent ? rid : '';
    }

    function openTaskDetailModal(taskId) {
        scheduleAutomaticDataSync(false);
        ensureTaskParticipantOnOpen(taskId);
        const u = getLoggedInUser();
        if (u) markTaskUserAlertsReadForTask(taskId, u.id);
        const reg = loadTasksRegistry();
        const task = (reg.tasks || []).find((x) => x.id === taskId);
        if (!task) return;
        syncTaskParticipantNames(task);
        const modal = document.getElementById('taskDetailModal');
        const body = document.getElementById('taskDetailBody');
        const title = document.getElementById('taskDetailTitle');
        if (!modal || !body) return;
        if (title) {
            const team = taskTeamMeta(task.team);
            const src = taskSourceKindMeta(task.sourceKind);
            title.innerHTML = `<span class="bhd-task-no-badge">${escHtml(task.taskNo)}</span> ${team.icon} ${escHtml(task.title)} <span class="bhd-task-pill ${src.cls}" style="font-size:11px;margin-inline-start:6px">${src.icon} ${escHtml(taskSourceKindLabel(task.sourceKind))}</span>`;
        }
        const canManage = taskCanManageParticipants(task);
        const isOpen = TASK_OPEN_STATUSES.includes(toStr(task.status));
        const defaultFollowUp = task.dueDate || formatDateYmdLocal(new Date());
        const team = taskTeamMeta(task.team);
        const pri = taskPriorityMeta(task.priority);
        const loc = [task.building, task.unit].filter(Boolean).join(' / ');
        if (toStr(_taskComposeState.taskId) !== toStr(taskId)) {
            resetTaskComposeState(taskId, defaultFollowUp);
        } else if (!_taskComposeState.followUpDate) {
            _taskComposeState.followUpDate = defaultFollowUp;
        }
        body.innerHTML = `
            <div class="bhd-task-detail-hero">
                <span class="bhd-task-pill ${team.cls}">${team.icon} ${escHtml(taskTeamLabel(task.team))}</span>
                <span class="${`bhd-task-status-${toStr(task.status).replace(/[^a-z_]/gi, '')}`}">● ${escHtml(taskStatusLabel(task.status))}</span>
                <span class="bhd-task-pill ${pri.cls}">${pri.icon} ${escHtml(pri.label)}</span>
                ${loc ? `<span>🏠 ${escHtml(loc)}</span>` : ''}
                ${task.ref ? `<span>🔖 ${escHtml(task.ref)}</span>` : ''}
            </div>
            <div class="row-2cols">
                <div><small>${t('موعد المتابعة / Follow-up due', 'Follow-up due / موعد')}</small><strong style="display:block" id="taskCurrentDueDisplay">📅 ${escHtml(task.dueDate || '—')}</strong></div>
                <div><small>${t('أُنشئت بواسطة / Created by', 'Created by / أنشأها')}</small><strong style="display:block">👤 ${escHtml(task.createdBy || '—')}</strong></div>
                <div style="grid-column:1/-1"><small>${t('التفاصيل / Details', 'Details / التفاصيل')}</small><p style="margin:4px 0 0">${escHtml(task.body || '—')}</p></div>
            </div>
            ${renderTaskLinkedChequesHtml(task)}
            ${renderTaskParticipantsHtml(task)}
            <div class="task-thread-wrap">
                <div class="task-thread-head">${t('سجل المراسلات والمتابعة / Correspondence & follow-up log', 'Correspondence & follow-up log / سجل المراسلات')}</div>
                ${renderTaskThreadHtml(task)}
                ${isOpen ? `<div class="task-compose">
                    <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px">${_taskComposeState.replyToMessageId ? t('رد / Reply', 'Reply / رد') : t('ملاحظة جديدة / New note', 'New note / ملاحظة')}</label>
                    ${renderTaskComposeReplyBannerHtml()}
                    <textarea id="taskComposeNote" placeholder="${t('مثال: تم التواصل مع المستأجر وأفاد بأنه سيدفع بتاريخ...', 'e.g. Contacted tenant — will pay on...')}">${escHtml(_taskComposeState.noteDraft || '')}</textarea>
                    ${renderTaskComposeToolbarHtml(taskId, canManage)}
                </div>` : ''}
            </div>
            ${isOpen ? `<div class="task-detail-foot-actions">
                <button type="button" class="btn-primary mini-btn" ${safeOnClick('submitTaskFollowUpNote', task.id)}>${t('إضافة / Add', 'Add / إضافة')}</button>
                <button type="button" class="btn-outline mini-btn" ${safeOnClick('openTaskCompleteConfirmModal', task.id)}>${t('إكمال المهمة / Complete task', 'Complete task / إكمال')}</button>
                ${taskLinkedMaintenanceRequestId(task) ? `<button type="button" class="btn-outline mini-btn" ${safeOnClick('openMaintenanceDetailModal', taskLinkedMaintenanceRequestId(task))}>${t('طلب الصيانة / Request', 'Maintenance request / طلب')}</button>` : ''}
                ${taskLinkedParentTaskId(task) ? `<button type="button" class="btn-outline mini-btn" ${safeOnClick('openTaskDetailModal', taskLinkedParentTaskId(task))}>${t('المهمة المرتبطة / Related task', 'Related task / مهمة')}</button>` : ''}
            </div>` : ''}`;
        modal.classList.add('open');
        const thread = body.querySelector('.task-thread-list');
        if (thread) thread.scrollTop = thread.scrollHeight;
    }

    function closeTaskDetailModal() {
        document.getElementById('taskDetailModal')?.classList.remove('open');
        resetTaskComposeState('', '');
    }

    function openTaskCreateModal() {
        const u = getLoggedInUser();
        if (!u) {
            alert(t('سجّل الدخول لإنشاء مهمة.', 'Sign in to create a task.'));
            return;
        }
        const modal = document.getElementById('taskCreateModal');
        const body = document.getElementById('taskCreateBody');
        if (!modal || !body) return;
        _taskCreateChequeCache = [];
        const users = getAllUsersForTaskAssign();
        const buildings = collectBuildingNamesForTasks();
        const buildingOpts = buildings.map((b) => `<option value="${escHtml(b)}">${escHtml(b)}</option>`).join('');
        const mreqs = loadMaintenanceRegistry().requests
            .filter((r) => r && r.id && toStr(r.status) !== 'cancelled')
            .slice()
            .sort((a, b) => toStr(b.date || b.createdAt).localeCompare(toStr(a.date || a.createdAt)));
        const mreqOpts = mreqs.map((r) =>
            `<option value="${escHtml(r.id)}">${escHtml(r.requestNo)} — ${escHtml(r.building)} / ${escHtml(r.unit)}</option>`
        ).join('');
        const parentTasks = loadTasksRegistry().tasks
            .filter((tk) => tk && tk.id && TASK_OPEN_STATUSES.includes(toStr(tk.status)))
            .slice()
            .sort((a, b) => toStr(a.taskNo).localeCompare(toStr(b.taskNo)));
        const parentTaskOpts = parentTasks.map((tk) =>
            `<option value="${escHtml(tk.id)}">${escHtml(tk.taskNo)} — ${escHtml(tk.title)}</option>`
        ).join('');
        const defaultDue = formatDateYmdLocal(new Date());
        body.innerHTML = `
            <p style="font-size:12px;color:#555;margin:0 0 12px;line-height:1.5">${t('أنشئ مهمة برقم متسلسل خاص واربطها بعقار أو إيجار/شيكات أو صيانة أو مهمة موجودة.', 'Create a task with its own serial number, linked to property, rent/cheques, maintenance, or an existing task.')}</p>
            <div class="row-2cols">
                <div class="input-group" style="grid-column:1/-1">
                    <label>📌 ${t('عنوان المهمة / Task title', 'Task title / عنوان')}</label>
                    <input type="text" id="taskCreateTitle" required placeholder="${t('مثال: متابعة إيداع شيكات الوحدة', 'e.g. Follow up unit cheque deposit')}">
                </div>
                <div class="input-group" style="grid-column:1/-1">
                    <label>📝 ${t('التفاصيل / Details', 'Details / تفاصيل')}</label>
                    <textarea id="taskCreateBodyText" rows="3" style="width:100%"></textarea>
                </div>
                <div class="input-group">
                    <label>👥 ${t('الفريق / Team', 'Team / الفريق')}</label>
                    <select id="taskCreateTeam">
                        <option value="admin">${t('الإدارة / Admin', 'Admin / إدارة')}</option>
                        <option value="maintenance">${t('الصيانة / Maintenance', 'Maintenance / صيانة')}</option>
                        <option value="accounting">${t('المحاسبة / Accounting', 'Accounting / محاسبة')}</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>⚡ ${t('الأولوية / Priority', 'Priority / أولوية')}</label>
                    <select id="taskCreatePriority">
                        <option value="normal">${t('عادية / Normal', 'Normal / عادية')}</option>
                        <option value="high">${t('عالية / High', 'High / عالية')}</option>
                        <option value="low">${t('منخفضة / Low', 'Low / منخفضة')}</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>📅 ${t('موعد المتابعة / Follow-up due', 'Follow-up due / موعد')}</label>
                    <input type="date" id="taskCreateDueDate" value="${escHtml(defaultDue)}">
                </div>
                <div class="input-group">
                    <label>🔗 ${t('الربط / Link', 'Link / ربط')}</label>
                    <select id="taskCreateLinkType" onchange="onTaskCreateLinkTypeChange()">
                        <option value="none">${t('بدون ربط / None', 'None / بدون')}</option>
                        <option value="property">${t('عقار / Property', 'Property / عقار')}</option>
                        <option value="cheque_rent">${t('إيجار / شيكات / Rent & cheques', 'Rent & cheques / إيجار وشيكات')}</option>
                        <option value="maintenance">${t('طلب صيانة / Maintenance request', 'Maintenance request / صيانة')}</option>
                        <option value="task">${t('مهمة موجودة / Existing task', 'Existing task / مهمة')}</option>
                    </select>
                </div>
            </div>
            <div id="taskCreatePropertyFields" style="display:none" class="task-create-section task-create-section--property">
                <div class="task-create-section-head">🏠 ${t('بيانات العقار / Property', 'Property / عقار')}</div>
                <div class="row-2cols">
                    <div class="input-group">
                        <label>${t('المبنى / Building', 'Building / مبنى')}</label>
                        <select id="taskCreateBuilding" onchange="onTaskCreateBuildingChange()"><option value="">${t('— اختر المبنى —', '— Select building —')}</option>${buildingOpts}</select>
                    </div>
                    <div class="input-group">
                        <label>${t('الوحدة / Unit', 'Unit / وحدة')}</label>
                        <select id="taskCreateUnit" onchange="onTaskCreateUnitChange()"><option value="">${t('— اختر الوحدة —', '— Select unit —')}</option></select>
                    </div>
                </div>
            </div>
            <div id="taskCreateChequeFields" style="display:none" class="task-create-section task-create-section--cheque">
                <div class="task-create-section-head">💳 ${t('اختيار الشيكات / Select cheques', 'Select cheques / شيكات')}</div>
                <p style="font-size:11px;color:#666;margin:0 0 8px;line-height:1.45">${t('اختر المبنى ثم الوحدة — تُعرض جميع الشيكات مع المبالغ والتواريخ. يمكن تحديد واحد أو أكثر أو الكل.', 'Select building then unit — all cheques with amounts and dates appear. Pick one, several, or all.')}</p>
                <div id="taskCreateChequePickerHost"><p style="margin:0;font-size:12px;color:#888">${t('اختر المبنى والوحدة أولاً.', 'Select building and unit first.')}</p></div>
            </div>
            <div id="taskCreateMaintenanceFields" style="display:none;margin-top:8px" class="input-group">
                <label>🔧 ${t('طلب الصيانة / Maintenance request', 'Maintenance request / طلب')}</label>
                <select id="taskCreateMaintenanceId"><option value="">—</option>${mreqOpts}</select>
            </div>
            <div id="taskCreateParentTaskFields" style="display:none;margin-top:8px" class="input-group">
                <label>📋 ${t('المهمة المرتبطة / Related task', 'Related task / مهمة')}</label>
                <select id="taskCreateParentTaskId"><option value="">—</option>${parentTaskOpts}</select>
            </div>
            <h5 style="margin:14px 0 8px;font-size:13px">👤 ${t('المسؤولون والمطلعون / Assignees & watchers', 'Assignees & watchers / مسؤولون')}</h5>
            ${renderTaskUserPickTable(users, 'taskCreateAssignTable', { defaultRole: 'assignee', checkboxClass: 'task-create-assign-chk' })}
            <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end">
                <button type="button" class="btn-outline" onclick="closeTaskCreateModal()">${t('إلغاء / Cancel', 'Cancel / إلغاء')}</button>
                <button type="button" class="btn-primary" onclick="submitManualTaskFromModal()">✅ ${t('إنشاء المهمة / Create task', 'Create task / إنشاء')}</button>
            </div>`;
        wireTaskUserPickTable('taskCreateAssignTable');
        modal.classList.add('open');
    }

    function closeTaskCreateModal() {
        document.getElementById('taskCreateModal')?.classList.remove('open');
        _taskCreateChequeCache = [];
    }

    function onTaskCreateLinkTypeChange() {
        const lt = toStr(document.getElementById('taskCreateLinkType')?.value) || 'none';
        const show = (id, on) => {
            const el = document.getElementById(id);
            if (el) el.style.display = on ? '' : 'none';
        };
        const needsProperty = lt === 'property' || lt === 'cheque_rent';
        show('taskCreatePropertyFields', needsProperty);
        show('taskCreateChequeFields', lt === 'cheque_rent');
        show('taskCreateMaintenanceFields', lt === 'maintenance');
        show('taskCreateParentTaskFields', lt === 'task');
        const teamEl = document.getElementById('taskCreateTeam');
        if (teamEl) {
            if (lt === 'maintenance') teamEl.value = 'maintenance';
            else if (lt === 'cheque_rent') teamEl.value = 'accounting';
        }
        if (lt === 'cheque_rent') onTaskCreateUnitChange();
    }

    function submitManualTaskFromModal() {
        const title = toStr(document.getElementById('taskCreateTitle')?.value).trim();
        let bodyText = toStr(document.getElementById('taskCreateBodyText')?.value).trim();
        const team = toStr(document.getElementById('taskCreateTeam')?.value) || 'admin';
        const priority = toStr(document.getElementById('taskCreatePriority')?.value) || 'normal';
        let dueDate = toStr(document.getElementById('taskCreateDueDate')?.value);
        const linkType = toStr(document.getElementById('taskCreateLinkType')?.value) || 'none';
        if (!title) {
            alert(t('أدخل عنوان المهمة.', 'Enter a task title.'));
            return;
        }
        let building = '';
        let unit = '';
        let ref = '';
        let relatedId = '';
        let sourceKind = 'manual';
        let linkedCheques = [];
        if (linkType === 'property' || linkType === 'cheque_rent') {
            building = toStr(document.getElementById('taskCreateBuilding')?.value);
            unit = toStr(document.getElementById('taskCreateUnit')?.value);
            if (!building || !unit) {
                alert(t('اختر المبنى والوحدة.', 'Select building and unit.'));
                return;
            }
            ref = `${building} / ${unit}`;
            if (linkType === 'cheque_rent') {
                linkedCheques = collectTaskCreateChequeSelections();
                if (!linkedCheques.length) {
                    alert(t('اختر شيكاً واحداً على الأقل أو استخدم «تحديد الكل».', 'Select at least one cheque or use Select all.'));
                    return;
                }
                sourceKind = 'cheque_deposit';
                const agreementNo = toStr(linkedCheques[0]?.agreementNo);
                if (agreementNo) ref = agreementNo;
                const chequeSummary = linkedCheques.map((c) =>
                    `${c.chequeNo || '—'} (${summaryAmtOm(c.amount)} · ${c.dueDate || '—'})`
                ).join('؛ ');
                const chequeBlock = t(`الشيكات المحددة (${linkedCheques.length}): ${chequeSummary}`, `Selected cheques (${linkedCheques.length}): ${chequeSummary}`);
                bodyText = bodyText ? `${bodyText}\n\n${chequeBlock}` : chequeBlock;
                const earliestDue = linkedCheques.map((c) => toStr(c.dueDate)).filter(Boolean).sort()[0];
                if (earliestDue && !dueDate) dueDate = earliestDue;
            }
        } else if (linkType === 'maintenance') {
            const reqId = toStr(document.getElementById('taskCreateMaintenanceId')?.value);
            const req = loadMaintenanceRegistry().requests.find((r) => r.id === reqId);
            if (!req) {
                alert(t('اختر طلب صيانة.', 'Select a maintenance request.'));
                return;
            }
            building = toStr(req.building);
            unit = toStr(req.unit);
            ref = toStr(req.requestNo);
            relatedId = reqId;
            sourceKind = 'manual';
        } else if (linkType === 'task') {
            const parentId = toStr(document.getElementById('taskCreateParentTaskId')?.value);
            const parent = loadTasksRegistry().tasks.find((tk) => tk.id === parentId);
            if (!parent) {
                alert(t('اختر مهمة مرتبطة.', 'Select a related task.'));
                return;
            }
            relatedId = parentId;
            ref = toStr(parent.taskNo);
            building = toStr(parent.building);
            unit = toStr(parent.unit);
        }
        const sel = collectTaskUserPickSelections('taskCreateAssignTable');
        const task = createManualTaskRecord({
            title,
            body: bodyText,
            team,
            priority,
            dueDate,
            building,
            unit,
            ref,
            relatedId,
            sourceKind,
            linkedCheques,
            assigneeUserIds: sel.assignee,
            watcherUserIds: sel.watcher
        });
        if (!task) return;
        closeTaskCreateModal();
        refreshNotificationsIfVisible();
        renderTasksRegistryPanelIfVisible();
        openTaskDetailModal(task.id);
    }

    function createManualTaskRecord(partial) {
        const reg = loadTasksRegistry();
        const actor = getCurrentActorLedgerRecord();
        const now = new Date().toISOString();
        const id = newTaskId();
        const task = {
            id,
            taskNo: nextTaskNo(reg),
            sourceKey: `manual|${id}`,
            sourceKind: toStr(partial.sourceKind) || 'manual',
            team: toStr(partial.team) || 'admin',
            title: toStr(partial.title),
            body: toStr(partial.body),
            status: 'open',
            priority: partial.priority || 'normal',
            dueDate: toStr(partial.dueDate),
            assigneeUserIds: Array.isArray(partial.assigneeUserIds) ? partial.assigneeUserIds.map((x) => toStr(x)).filter(Boolean) : [],
            assigneeNames: [],
            watcherUserIds: Array.isArray(partial.watcherUserIds) ? partial.watcherUserIds.map((x) => toStr(x)).filter(Boolean) : [],
            watcherNames: [],
            building: toStr(partial.building),
            unit: toStr(partial.unit),
            ref: toStr(partial.ref),
            relatedId: toStr(partial.relatedId),
            linkedCheques: Array.isArray(partial.linkedCheques) ? partial.linkedCheques.map(normalizeTaskLinkedCheque) : [],
            createdAt: now,
            createdBy: actor.staffName || t('مستخدم', 'User'),
            completedAt: null,
            completedBy: null,
            messages: [],
            lockedViewerUserIds: [],
            events: [{
                at: now,
                type: 'created',
                staffName: actor.staffName || t('مستخدم', 'User'),
                note: t('إنشاء مهمة يدوية', 'Manual task created')
            }]
        };
        if (task.linkedCheques.length) {
            const names = task.linkedCheques.map((c) => c.chequeNo).filter(Boolean).join('، ');
            appendTaskMessage(task, {
                type: 'note',
                text: t(
                    `تم ربط ${task.linkedCheques.length} شيك(ات): ${names}`,
                    `Linked ${task.linkedCheques.length} cheque(s): ${names}`
                )
            });
        }
        syncTaskParticipantNames(task);
        if (actor.staffUserId) lockTaskViewer(task, actor.staffUserId);
        (task.assigneeUserIds || []).forEach((uid) => lockTaskViewer(task, uid));
        (task.watcherUserIds || []).forEach((uid) => lockTaskViewer(task, uid));
        reg.tasks.push(task);
        const taskLabel = `${toStr(task.taskNo)} — ${toStr(task.title)}`;
        const actorName = actor.staffName || t('مستخدم', 'User');
        (task.assigneeUserIds || []).forEach((uid) => {
            pushTaskUserAlert(reg, {
                task,
                targetUserId: uid,
                actorUserId: actor.staffUserId,
                actorName,
                kind: 'assigned_assignee',
                title: t(`مهمة جديدة — ${task.taskNo}`, `New task — ${task.taskNo}`),
                body: t(`تم تعيينك مسؤولاً عن المهمة: ${taskLabel}`, `You were assigned to task: ${taskLabel}`)
            });
        });
        (task.watcherUserIds || []).forEach((uid) => {
            if ((task.assigneeUserIds || []).includes(uid)) return;
            pushTaskUserAlert(reg, {
                task,
                targetUserId: uid,
                actorUserId: actor.staffUserId,
                actorName,
                kind: 'invite_watcher',
                title: t(`مهمة جديدة — ${task.taskNo}`, `New task — ${task.taskNo}`),
                body: t(`دعوة للاطلاع على المهمة: ${taskLabel}`, `Invited to watch task: ${taskLabel}`)
            });
        });
        saveTasksRegistry(reg);
        return task;
    }

    function confirmTaskTransfer(taskId) {
        const aSel = document.getElementById('taskTransferAssignees');
        const wSel = document.getElementById('taskTransferWatchers');
        const note = toStr(document.getElementById('taskTransferNote')?.value);
        const assignees = aSel ? [...aSel.selectedOptions].map((o) => o.value) : [];
        const watchers = wSel ? [...wSel.selectedOptions].map((o) => o.value) : [];
        if (!assignees.length) {
            alert(t('اختر مسؤولاً واحداً على الأقل.', 'Select at least one assignee.'));
            return;
        }
        transferRegistryTask(taskId, assignees, watchers, note);
    }

    function openTaskSettingsModal() {
        if (!isMaintenanceSystemAdmin() && !effectivePermission('manage_users')) {
            alert(t('إعدادات المهام لمدير النظام فقط.', 'Task settings are for system admin only.'));
            return;
        }
        const reg = loadTasksRegistry();
        const s = reg.settings || defaultTasksRegistry().settings;
        const body = document.getElementById('taskSettingsBody');
        const modal = document.getElementById('taskSettingsModal');
        if (!body || !modal) return;
        const occRows = (s.occasions || []).map((oc, idx) => `<tr>
            <td>${escHtml(oc.titleAr || oc.titleEn || '—')}</td>
            <td>${escHtml(oc.date || '—')}</td>
            <td><button type="button" class="btn-outline mini-btn" onclick="removeTaskOccasion(${idx})">${t('حذف', 'Delete')}</button></td>
        </tr>`).join('') || `<tr><td colspan="3">—</td></tr>`;
        body.innerHTML = `
            <p style="font-size:12px;color:#555;margin:0 0 12px">${t('المهل الزمنية لإنشاء المهام التلقائية. تُحدَّث المهام عند فتح لوحة المعلومات أو المحاسبة أو التنبيهات.', 'Lead times for automatic tasks. Tasks refresh when opening dashboard, accounting, or notifications.')}</p>
            <div class="row-2cols">
                <div class="input-group"><label>${t('تجديد العقد (أشهر قبل الانتهاء) / Contract renewal (months before)', 'Contract renewal months before end / تجديد')}</label><input type="number" id="taskSetRenewalMonths" min="0" max="24" value="${Number(s.contractRenewalMonthsBefore) || 3}"></div>
                <div class="input-group"><label>${t('مستندات منتهية (أشهر قبل) / Document expiry (months before)', 'Document expiry months before / مستندات')}</label><input type="number" id="taskSetDocMonths" min="0" max="24" value="${Number(s.documentExpiryMonthsBefore) || 3}"></div>
                <div class="input-group"><label>${t('متأخرات المستأجر (أيام بعد الاستحقاق) / Tenant overdue (days after due)', 'Tenant overdue follow-up days / متأخرات')}</label><input type="number" id="taskSetOverdueDays" min="1" max="90" value="${Number(s.tenantOverdueFollowupDays) || 7}"></div>
                <div class="input-group"><label>${t('إيداع الشيك (أيام قبل الاستحقاق) / Cheque deposit (days before due)', 'Cheque deposit days before due / شيك')}</label><input type="number" id="taskSetChequeDays" min="0" max="30" value="${Number(s.chequeDepositDaysBefore) || 0}"></div>
            </div>
            <h5 style="margin:16px 0 8px">${t('مناسبات التقويم / Calendar occasions', 'Calendar occasions / مناسبات')}</h5>
            <div class="row-2cols" style="margin-bottom:8px">
                <div class="input-group"><label>${t('العنوان (عربي) / Title (Arabic)', 'Title Arabic / عنوان')}</label><input type="text" id="taskOccTitleAr"></div>
                <div class="input-group"><label>${t('العنوان (إنجليزي) / Title (English)', 'Title English / عنوان')}</label><input type="text" id="taskOccTitleEn"></div>
                <div class="input-group"><label>${t('التاريخ / Date', 'Date / تاريخ')}</label><input type="date" id="taskOccDate"></div>
                <div class="input-group" style="align-self:end"><button type="button" class="btn-outline mini-btn" onclick="addTaskOccasionFromForm()">${t('إضافة مناسبة / Add occasion', 'Add occasion / إضافة')}</button></div>
            </div>
            <table class="data-table" style="width:100%;font-size:12px"><thead><tr><th>${t('المناسبة', 'Occasion')}</th><th>${t('التاريخ', 'Date')}</th><th>${t('إجراء', 'Action')}</th></tr></thead><tbody id="taskOccasionsTableBody">${occRows}</tbody></table>
            <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end">
                <button type="button" class="btn-primary" onclick="saveTaskSettingsFromForm()">${t('حفظ / Save', 'Save / حفظ')}</button>
            </div>`;
        modal.classList.add('open');
    }

    function closeTaskSettingsModal() {
        document.getElementById('taskSettingsModal')?.classList.remove('open');
    }

    function saveTaskSettingsFromForm() {
        const reg = loadTasksRegistry();
        reg.settings = reg.settings || defaultTasksRegistry().settings;
        reg.settings.contractRenewalMonthsBefore = Math.max(0, parseInt(document.getElementById('taskSetRenewalMonths')?.value, 10) || 3);
        reg.settings.documentExpiryMonthsBefore = Math.max(0, parseInt(document.getElementById('taskSetDocMonths')?.value, 10) || 3);
        reg.settings.tenantOverdueFollowupDays = Math.max(1, parseInt(document.getElementById('taskSetOverdueDays')?.value, 10) || 7);
        reg.settings.chequeDepositDaysBefore = Math.max(0, parseInt(document.getElementById('taskSetChequeDays')?.value, 10) || 0);
        saveTasksRegistry(reg);
        syncAllAutoTasks();
        closeTaskSettingsModal();
        renderDashboardCalendar();
        refreshNotificationsIfVisible();
        alert(t('تم حفظ إعدادات المهام.', 'Task settings saved.'));
    }

    function addTaskOccasionFromForm() {
        const reg = loadTasksRegistry();
        reg.settings = reg.settings || defaultTasksRegistry().settings;
        if (!Array.isArray(reg.settings.occasions)) reg.settings.occasions = [];
        const titleAr = toStr(document.getElementById('taskOccTitleAr')?.value);
        const titleEn = toStr(document.getElementById('taskOccTitleEn')?.value);
        const date = toStr(document.getElementById('taskOccDate')?.value);
        if (!date || (!titleAr && !titleEn)) {
            alert(t('أدخل عنواناً وتاريخاً.', 'Enter title and date.'));
            return;
        }
        reg.settings.occasions.push({ id: newTaskId(), titleAr, titleEn, date });
        saveTasksRegistry(reg);
        openTaskSettingsModal();
    }

    function removeTaskOccasion(idx) {
        const reg = loadTasksRegistry();
        if (!Array.isArray(reg.settings?.occasions)) return;
        reg.settings.occasions.splice(idx, 1);
        saveTasksRegistry(reg);
        openTaskSettingsModal();
    }

    function getCalendarMonthState(scope) {
        const key = scope === 'accounting' ? '_acctCalMonth' : '_dashCalMonth';
        if (!window[key]) {
            const now = new Date();
            window[key] = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }
        return window[key];
    }

    function shiftCalendarMonth(scope, delta) {
        const key = scope === 'accounting' ? '_acctCalMonth' : '_dashCalMonth';
        const cur = getCalendarMonthState(scope);
        const [y, m] = cur.split('-').map((x) => parseInt(x, 10));
        const d = new Date(y, m - 1 + delta, 1);
        window[key] = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (scope === 'accounting') renderAccountingWorkspace();
        else if (document.body.classList.contains('mode-notifications')) renderNotificationsPage();
        else renderDashboardCalendar();
    }

    let _bhdCalendarEventStore = { scope: '', year: 0, month: 0, events: [] };

    function newCalendarEventId() {
        return 'calev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    }

    function mapBirthDateToCalendarYmd(birthYmd, year, month) {
        const bd = parseYmdToLocalDate(birthYmd);
        if (!bd) return '';
        if (bd.getMonth() + 1 !== month) return '';
        const day = bd.getDate();
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    function calendarAgeFromBirthDate(birthYmd, onYmd) {
        const bd = parseYmdToLocalDate(birthYmd);
        const on = parseYmdToLocalDate(onYmd);
        if (!bd || !on) return null;
        let age = on.getFullYear() - bd.getFullYear();
        const md = on.getMonth() - bd.getMonth();
        if (md < 0 || (md === 0 && on.getDate() < bd.getDate())) age -= 1;
        return age;
    }

    function calendarEventKindLabel(kind) {
        const map = {
            task: t('مهمة / Task', 'Task / مهمة'),
            rent: t('إيجار مستحق / Rent due', 'Rent due / إيجار'),
            cheque: t('شيك ضريبة / VAT cheque', 'VAT cheque / شيك ضريبة'),
            contract: t('انتهاء عقد / Contract end', 'Contract end / عقد'),
            document: t('انتهاء مستند / Document expiry', 'Document expiry / مستند'),
            birthday_user: t('ميلاد مستخدم / User birthday', 'User birthday / ميلاد مستخدم'),
            birthday_tenant: t('ميلاد مستأجر / Tenant birthday', 'Tenant birthday / ميلاد مستأجر'),
            birthday_contact: t('ميلاد / Birthday', 'Birthday / ميلاد'),
            occasion: t('مناسبة / Occasion', 'Occasion / مناسبة'),
            overdue: t('متأخر / Overdue', 'Overdue / متأخر')
        };
        return map[kind] || kind || '—';
    }

    function calendarEventKindBadgeClass(kind) {
        return `bhd-cal-ev ${escHtml(kind)}`;
    }

    function pushCalendarEvent(events, partial) {
        const ev = {
            id: newCalendarEventId(),
            date: toStr(partial.date).slice(0, 10),
            kind: toStr(partial.kind) || 'occasion',
            title: toStr(partial.title),
            subtitle: toStr(partial.subtitle),
            payload: partial.payload || {}
        };
        if (!ev.date) return;
        events.push(ev);
    }

    function collectCalendarEvents(scope, year, month) {
        const events = [];
        const reg = loadTasksRegistry();
        const u = getLoggedInUser();
        const showTasks = scope === 'admin' || scope === 'accounting';
        const showMoney = scope === 'accounting' || effectivePermission('manage_accounting');
        const showContracts = scope === 'admin' || effectivePermission('manage_contracts');
        const showPeople = true;

        if (showTasks) {
            (reg.tasks || []).forEach((task) => {
                if (!u || !taskUserHasAccess(task, u)) return;
                if (!TASK_OPEN_STATUSES.includes(toStr(task.status))) return;
                const dt = toStr(task.dueDate) || toStr(task.createdAt).slice(0, 10);
                if (!dt || dt.slice(0, 7) !== `${year}-${String(month).padStart(2, '0')}`) return;
                pushCalendarEvent(events, {
                    date: dt,
                    kind: 'task',
                    title: task.title,
                    subtitle: task.taskNo,
                    payload: { taskId: task.id, taskNo: task.taskNo, team: task.team, status: task.status, building: task.building, unit: task.unit }
                });
            });
        }

        if (showMoney) {
            const acct = loadAccountingRegistry();
            (acct.cheques || []).forEach((c) => {
                if (!c || !toStr(c.dueDate)) return;
                if (c.dueDate.slice(0, 7) !== `${year}-${String(month).padStart(2, '0')}`) return;
                if (isAccountingChequePaidStatus(c.status)) return;
                const isVat = toStr(c.sourceType) === 'vat';
                const overdue = isAccountingChequeOverdue(c);
                pushCalendarEvent(events, {
                    date: c.dueDate,
                    kind: overdue ? 'overdue' : (isVat ? 'cheque' : 'rent'),
                    title: isVat
                        ? t(`شيك ضريبة ${toStr(c.chequeNo) || '—'}`, `VAT cheque ${toStr(c.chequeNo) || '—'}`)
                        : t(`إيجار مستحق ${toStr(c.chequeNo) || '—'}`, `Rent due ${toStr(c.chequeNo) || '—'}`),
                    subtitle: `${c.building} / ${c.unit} — ${toStr(c.tenant) || '—'} — ${summaryAmtOm(c.amount)}`,
                    payload: {
                        chequeId: c.id,
                        chequeNo: c.chequeNo,
                        building: c.building,
                        unit: c.unit,
                        tenant: c.tenant,
                        amount: c.amount,
                        status: c.status,
                        overdue,
                        sourceType: c.sourceType
                    }
                });
            });
            (acct.entries || []).forEach((e) => {
                if (!e || !toStr(e.dueDate)) return;
                if (e.dueDate.slice(0, 7) !== `${year}-${String(month).padStart(2, '0')}`) return;
                if (toStr(e.status) === 'paid' || toStr(e.status) === 'cancelled') return;
                pushCalendarEvent(events, {
                    date: e.dueDate,
                    kind: 'rent',
                    title: t(`مستحق: ${toStr(e.title) || '—'}`, `Due: ${toStr(e.title) || '—'}`),
                    subtitle: `${e.building} / ${e.unit} — ${summaryAmtOm(e.amount)}`,
                    payload: {
                        entryId: e.id,
                        building: e.building,
                        unit: e.unit,
                        title: e.title,
                        amount: e.amount,
                        status: e.status
                    }
                });
            });
        }

        if (showContracts) {
            getUnitsData().forEach((unit) => {
                const end = toStr(unit.endDate);
                if (!end || end.slice(0, 7) !== `${year}-${String(month).padStart(2, '0')}`) return;
                if (toStr(unit.status).toLowerCase() !== 'rented') return;
                const days = daysUntil(end);
                pushCalendarEvent(events, {
                    date: end,
                    kind: 'contract',
                    title: t(`انتهاء عقد ${toStr(unit.agreementNo) || '—'}`, `Contract ends ${toStr(unit.agreementNo) || '—'}`),
                    subtitle: `${unit.building} / ${unit.unit} — ${toStr(unit.tenant) || '—'}${days !== null ? ` (${days} ${t('يوم', 'days')})` : ''}`,
                    payload: {
                        building: unit.building,
                        unit: unit.unit,
                        agreementNo: unit.agreementNo,
                        tenant: unit.tenant,
                        endDate: end,
                        daysLeft: days
                    }
                });
            });
        }

        (reg.settings?.occasions || []).forEach((oc) => {
            const dt = toStr(oc.date);
            if (!dt || dt.slice(0, 7) !== `${year}-${String(month).padStart(2, '0')}`) return;
            pushCalendarEvent(events, {
                date: dt,
                kind: 'occasion',
                title: t(oc.titleAr, oc.titleEn || oc.titleAr),
                subtitle: t('مناسبة محددة من الإعدادات', 'Occasion from settings'),
                payload: { occasionId: oc.id, titleAr: oc.titleAr, titleEn: oc.titleEn }
            });
        });

        (addressBookEntries || []).forEach((entry) => {
            collectAddressBookDocumentExpiries(entry).forEach((doc) => {
                if (doc.date.slice(0, 7) !== `${year}-${String(month).padStart(2, '0')}`) return;
                const days = daysUntil(doc.date);
                pushCalendarEvent(events, {
                    date: doc.date,
                    kind: 'document',
                    title: `${doc.name} — ${doc.label}`,
                    subtitle: days !== null && days < 0
                        ? t('منتهي', 'Expired')
                        : days !== null
                            ? t(`ينتهي خلال ${days} يوم`, `Expires in ${days} days`)
                            : '',
                    payload: { entryKey: addressBookEntryKey(entry), docType: doc.label, name: doc.name, expiryDate: doc.date }
                });
            });
            const bd = toStr(entry.birthDate);
            if (showPeople && bd) {
                const mapped = mapBirthDateToCalendarYmd(bd, year, month);
                if (!mapped) return;
                const age = calendarAgeFromBirthDate(bd, mapped);
                const entType = toStr(entry.type);
                const kind = entType === 'tenant'
                    ? 'birthday_tenant'
                    : entType === 'owner'
                        ? 'birthday_contact'
                        : 'birthday_contact';
                const typeLbl = entType === 'tenant'
                    ? t('مستأجر', 'Tenant')
                    : entType === 'owner'
                        ? t('مالك', 'Owner')
                        : t('جهة اتصال', 'Contact');
                pushCalendarEvent(events, {
                    date: mapped,
                    kind,
                    title: `🎂 ${toStr(entry.name) || toStr(entry.nameEn) || '—'}`,
                    subtitle: `${typeLbl}${age != null ? ` · ${t('العمر', 'Age')}: ${age}` : ''}`,
                    payload: {
                        entryKey: addressBookEntryKey(entry),
                        name: entry.name,
                        birthDate: bd,
                        age,
                        type: entType,
                        building: entry.building,
                        unit: entry.unit
                    }
                });
            }
        });

        if (showPeople) {
            try { reloadUsersRegistryFromStorageForAuth(); } catch (_eUsr) {}
            (usersRegistry || []).forEach((usr) => {
                const nu = normalizeUserRecord(usr);
                const bd = toStr(nu.birthDate);
                if (!bd) return;
                const mapped = mapBirthDateToCalendarYmd(bd, year, month);
                if (!mapped) return;
                const age = calendarAgeFromBirthDate(bd, mapped);
                pushCalendarEvent(events, {
                    date: mapped,
                    kind: 'birthday_user',
                    title: `🎂 ${toStr(nu.displayName || nu.email) || '—'}`,
                    subtitle: t('مستخدم النظام', 'System user') + (age != null ? ` · ${t('العمر', 'Age')}: ${age}` : ''),
                    payload: {
                        userId: nu.id,
                        name: nu.displayName || nu.email,
                        birthDate: bd,
                        age,
                        email: nu.email,
                        phone: nu.phone
                    }
                });
            });
        }

        const kindOrder = { overdue: 0, task: 1, rent: 2, cheque: 3, contract: 4, document: 5, birthday_user: 6, birthday_tenant: 7, birthday_contact: 8, occasion: 9 };
        events.sort((a, b) => {
            const ko = (kindOrder[a.kind] ?? 50) - (kindOrder[b.kind] ?? 50);
            if (ko !== 0) return ko;
            return toStr(a.title).localeCompare(toStr(b.title), 'ar');
        });
        return events;
    }

    function storeCalendarEvents(scope, year, month, events) {
        _bhdCalendarEventStore = { scope, year, month, events: events || [] };
    }

    function getCalendarEventById(eventId) {
        return (_bhdCalendarEventStore.events || []).find((x) => x.id === eventId) || null;
    }

    function getCalendarEventsForDate(ymd) {
        const d = toStr(ymd).slice(0, 10);
        return (_bhdCalendarEventStore.events || []).filter((x) => toStr(x.date).slice(0, 10) === d);
    }

    function buildCalendarEventDetailHtml(ev) {
        const p = ev.payload || {};
        const rows = [
            [t('النوع / Type', 'Type / النوع'), calendarEventKindLabel(ev.kind)],
            [t('التاريخ / Date', 'Date / التاريخ'), ev.date || '—'],
            [t('العنوان / Title', 'Title / العنوان'), ev.title || '—']
        ];
        if (ev.subtitle) rows.push([t('ملخص / Summary', 'Summary / ملخص'), ev.subtitle]);
        if (p.building) rows.push([t('المبنى / Building', 'Building / مبنى'), p.building]);
        if (p.unit) rows.push([t('الوحدة / Unit', 'Unit / وحدة'), p.unit]);
        if (p.tenant) rows.push([t('المستأجر / Tenant', 'Tenant / مستأجر'), p.tenant]);
        if (p.agreementNo) rows.push([t('رقم العقد / Contract no.', 'Contract no. / عقد'), p.agreementNo]);
        if (p.amount != null) rows.push([t('المبلغ / Amount', 'Amount / مبلغ'), summaryAmtOm(p.amount)]);
        if (p.chequeNo) rows.push([t('رقم الشيك / Cheque no.', 'Cheque no. / شيك'), p.chequeNo]);
        if (p.birthDate) rows.push([t('تاريخ الميلاد / Birth date', 'Birth date / ميلاد'), p.birthDate]);
        if (p.age != null) rows.push([t('العمر / Age', 'Age / عمر'), String(p.age)]);
        if (p.email) rows.push([t('البريد / Email', 'Email / بريد'), p.email]);
        if (p.phone) rows.push([t('الجوال / Phone', 'Phone / جوال'), p.phone]);
        if (p.status) rows.push([t('الحالة / Status', 'Status / حالة'), p.status]);
        if (p.daysLeft != null) rows.push([t('المتبقي / Remaining', 'Remaining / متبقي'), `${p.daysLeft} ${t('يوم', 'days')}`]);
        const table = `<table class="data-table" style="width:100%;font-size:12px;margin-top:8px"><tbody>${rows.map(([k, v]) =>
            `<tr><th style="width:38%;text-align:start">${escHtml(k)}</th><td>${escHtml(v)}</td></tr>`
        ).join('')}</tbody></table>`;
        const badge = `<span class="bhd-cal-ev-detail-badge ${calendarEventKindBadgeClass(ev.kind)}">${escHtml(calendarEventKindLabel(ev.kind))}</span>`;
        return `${badge}${table}`;
    }

    function buildCalendarEventActionsHtml(ev) {
        const p = ev.payload || {};
        const btns = [];
        const k = ev.kind;
        if (k === 'task' && p.taskId) {
            btns.push(`<button type="button" class="btn-primary mini-btn" ${safeOnClickJs(`closeCalendarEventModal();openTaskDetailModal(${JSON.stringify(p.taskId)})`)}>${t('فتح المهمة / Open task', 'Open task / مهمة')}</button>`);
        }
        if ((k === 'rent' || k === 'cheque' || k === 'overdue') && p.chequeId) {
            btns.push(`<button type="button" class="btn-primary mini-btn" ${safeOnClickJs(`closeCalendarEventModal();openAccountingChequeActionModal(${JSON.stringify(p.chequeId)},'action')`)}>${t('فتح الشيك / Open cheque', 'Open cheque / شيك')}</button>`);
            if (p.building && p.unit) {
                btns.push(`<button type="button" class="btn-outline mini-btn" ${safeOnClickJs(`closeCalendarEventModal();openAccountingUnitAccountModal(${JSON.stringify(p.building)},${JSON.stringify(p.unit)})`)}>${t('حساب الوحدة / Unit account', 'Unit account / حساب')}</button>`);
            }
        }
        if (k === 'rent' && p.entryId && p.building && p.unit) {
            btns.push(`<button type="button" class="btn-outline mini-btn" ${safeOnClickJs(`closeCalendarEventModal();openAccountingWorkspaceForUnit(${JSON.stringify(p.building)},${JSON.stringify(p.unit)})`)}>${t('المحاسبة / Accounting', 'Accounting / محاسبة')}</button>`);
        }
        if (k === 'contract' && p.building && p.unit) {
            btns.push(`<button type="button" class="btn-primary mini-btn" ${safeOnClickJs(`closeCalendarEventModal();openUnitDetailsByKey(${JSON.stringify(p.building)},${JSON.stringify(p.unit)})`)}>${t('تفاصيل الوحدة / Unit details', 'Unit details / وحدة')}</button>`);
            btns.push(`<button type="button" class="btn-outline mini-btn" ${safeOnClickJs('closeCalendarEventModal();openContractsWorkspace()')}>${t('شاشة العقود / Contracts', 'Contracts / عقود')}</button>`);
        }
        if (k === 'document' && p.entryKey) {
            btns.push(`<button type="button" class="btn-primary mini-btn" ${safeOnClickJs(`closeCalendarEventModal();openAddressBookEditFromNotification(${JSON.stringify(p.entryKey)})`)}>${t('فتح سجل الدفتر / Open address book', 'Open address book / دفتر')}</button>`);
        }
        if (k === 'birthday_user' && p.userId) {
            btns.push(`<button type="button" class="btn-primary mini-btn" ${safeOnClickJs(`closeCalendarEventModal();openUsersWorkspace();startEditUser(${JSON.stringify(p.userId)})`)}>${t('ملف المستخدم / User profile', 'User profile / مستخدم')}</button>`);
        }
        if ((k === 'birthday_tenant' || k === 'birthday_contact') && p.entryKey) {
            btns.push(`<button type="button" class="btn-primary mini-btn" ${safeOnClickJs(`closeCalendarEventModal();openAddressBookEditFromNotification(${JSON.stringify(p.entryKey)})`)}>${t('فتح جهة الاتصال / Open contact', 'Open contact / جهة اتصال')}</button>`);
            if (p.building && p.unit) {
                btns.push(`<button type="button" class="btn-outline mini-btn" ${safeOnClickJs(`closeCalendarEventModal();openUnitDetailsByKey(${JSON.stringify(p.building)},${JSON.stringify(p.unit)})`)}>${t('الوحدة / Unit', 'Unit / وحدة')}</button>`);
            }
        }
        if (!btns.length) return '';
        return `<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">${btns.join('')}</div>`;
    }

    function openCalendarEventDetail(eventId) {
        const ev = getCalendarEventById(eventId);
        if (!ev) return;
        const modal = document.getElementById('calendarEventModal');
        const body = document.getElementById('calendarEventModalBody');
        const title = document.getElementById('calendarEventModalTitle');
        if (!modal || !body) return;
        if (title) title.textContent = ev.title || t('تفاصيل الحدث', 'Event details');
        body.innerHTML = buildCalendarEventDetailHtml(ev) + buildCalendarEventActionsHtml(ev);
        modal.classList.add('open');
    }

    function openCalendarDayPanel(ymd, scope) {
        const events = getCalendarEventsForDate(ymd);
        const modal = document.getElementById('calendarEventModal');
        const body = document.getElementById('calendarEventModalBody');
        const title = document.getElementById('calendarEventModalTitle');
        if (!modal || !body) return;
        if (title) title.textContent = t(`أحداث ${ymd}`, `Events on ${ymd}`);
        if (!events.length) {
            body.innerHTML = `<p style="margin:0;color:#666;font-size:13px">${t('لا توجد أحداث في هذا اليوم.', 'No events on this day.')}</p>`;
        } else {
            body.innerHTML = events.map((ev) => `
                <div class="bhd-cal-day-event-row" ${safeOnClick('openCalendarEventDetail', ev.id)}>
                    <span class="${calendarEventKindBadgeClass(ev.kind)}" style="flex-shrink:0;padding:4px 8px;border-radius:6px;font-size:10px">${escHtml(calendarEventKindLabel(ev.kind))}</span>
                    <div style="flex:1;min-width:0">
                        <strong style="display:block;font-size:13px">${escHtml(ev.title)}</strong>
                        <small style="color:#666">${escHtml(ev.subtitle || '')}</small>
                    </div>
                    <span style="font-size:11px;color:var(--primary)">${t('فتح ›', 'Open ›')}</span>
                </div>`).join('');
        }
        modal.classList.add('open');
    }

    function closeCalendarEventModal() {
        document.getElementById('calendarEventModal')?.classList.remove('open');
    }

    function getDashboardModuleStats() {
        let accountingPending = 0;
        let accountingIncome = 0;
        try {
            const dash = computeLiveAccountingDashboard();
            accountingIncome = dash.incomeReceived || 0;
            const reg = loadAccountingRegistry();
            accountingPending = (reg.entries || []).filter((e) => isAccountingEntryPendingApproval(e)).length + countAccountingContractReceiptPending(reg);
        } catch (_eAcctDash) {}
        let maintOpen = 0;
        try {
            const mReg = loadMaintenanceRegistry();
            maintOpen = (mReg.requests || []).filter((r) => !['completed', 'cancelled'].includes(toStr(r.status))).length;
        } catch (_eMaintDash) {}
        let tasksOpen = 0;
        try {
            const tReg = loadTasksRegistry();
            tasksOpen = (tReg.tasks || []).filter((t) => ['open', 'in_progress'].includes(toStr(t.status))).length;
        } catch (_eTaskDash) {}
        let notifyCount = 0;
        try {
            notifyCount = getNotificationsBadgeCount();
        } catch (_eNfDash) {}
        let buildingsCount = 0;
        let unitsCount = 0;
        try {
            loadDashboardAux();
            buildingsCount = getRegisteredBuildings().length;
            unitsCount = getUnitsData().length;
        } catch (_eBldDash) {}
        return { accountingPending, accountingIncome, maintOpen, tasksOpen, notifyCount, buildingsCount, unitsCount };
    }

    function openDashboardPropertiesHub() {
        if (isViewerMode) return;
        if (
            !assertPermissionOrAlert(
                'manage_dashboard',
                'لا تملك صلاحية لوحة المعلومات.',
                'No permission to access the dashboard.'
            )
        ) {
            return;
        }
        if (!document.body.classList.contains('mode-dashboard')) {
            openDashboardWorkspace();
        }
        openDashboardInsight('buildings');
    }

    function openDashboardAddProperty() {
        if (!assertPermissionOrAlert('manage_properties', 'لا تملك صلاحية إضافة العقارات.', 'No permission to add properties.')) {
            return;
        }
        const modalOpen = document.getElementById('dashboardInsightModal')?.classList.contains('open');
        const onBuildings =
            modalOpen && insightNavStack.length && insightNavStack[insightNavStack.length - 1]?.mode === 'buildings';
        if (!onBuildings) {
            openDashboardPropertiesHub();
        }
        openBuildingEditor('');
    }

    function buildDashboardModuleHubHtml() {
        const s = getDashboardModuleStats();
        const cards = [];
        const push = (cls, icon, label, meta, badge, onclick, show) => {
            if (!show) return;
            const badgeCls = badge && parseInt(badge, 10) > 0 ? ' dash-module-card__badge--alert' : '';
            const badgeHtml = badge ? `<span class="dash-module-card__badge${badgeCls}">${escHtml(badge)}</span>` : '';
            cards.push(`<button type="button" class="dash-module-card ${cls}" onclick="${onclick}">
                <span class="dash-module-card__icon">${icon}</span>
                <span class="dash-module-card__label">${label}</span>
                <span class="dash-module-card__meta">${meta}</span>
                ${badgeHtml}
            </button>`);
        };
        push(
            'dash-module-card--properties',
            '🏢',
            t('العقارات', 'Properties'),
            t(`${s.buildingsCount} ${t('مبنى', 'buildings')} · ${s.unitsCount} ${t('وحدة', 'units')}`, `${s.buildingsCount} buildings · ${s.unitsCount} units`),
            '',
            'openDashboardPropertiesHub()',
            effectivePermissionAny(['manage_properties', 'manage_dashboard'])
        );
        push(
            'dash-module-card--contracts',
            '📝',
            t('العقود', 'Contracts'),
            t('إدارة العقود والمستندات', 'Contracts & documents'),
            '',
            'openContractsWorkspace({ view: \'list\' })',
            effectivePermissionAny(['manage_contracts', 'view_own_contract'])
        );
        push(
            'dash-module-card--contracts',
            '📌',
            t('الحجوزات', 'Reservations'),
            t('حجز الوحدات والإخلاء', 'Unit reservations'),
            '',
            'openReservationsWorkspace({ view: \'list\' })',
            effectivePermission('manage_contracts')
        );
        push(
            'dash-module-card--accounting',
            '💰',
            t('المحاسبة', 'Accounting'),
            t(`مستلم: ${summaryAmtOm(s.accountingIncome)}`, `Received: ${summaryAmtOm(s.accountingIncome)}`),
            s.accountingPending > 0 ? `${s.accountingPending} ${t('اعتماد', 'pending')}` : '',
            'openAccountingWorkspace()',
            effectivePermission('manage_accounting')
        );
        push(
            'dash-module-card--maintenance',
            '🔧',
            t('الصيانة', 'Maintenance'),
            t('طلبات الصيانة والمتابعة', 'Maintenance requests'),
            s.maintOpen > 0 ? `${s.maintOpen} ${t('مفتوحة', 'open')}` : '',
            'openMaintenanceWorkspace()',
            canAccessMaintenanceWorkspace()
        );
        push(
            'dash-module-card--tasks',
            '📋',
            t('المهام', 'Tasks'),
            t('مهام الفريق والمتابعة', 'Team tasks'),
            s.tasksOpen > 0 ? `${s.tasksOpen} ${t('نشطة', 'active')}` : '',
            "notificationsPageState.view='tasks'; openNotificationsWorkspace()",
            canAccessNotificationsPage()
        );
        push(
            'dash-module-card--notifications',
            '🔔',
            t('التنبيهات', 'Notifications'),
            t('طلبات واعتمادات النظام', 'System alerts & approvals'),
            s.notifyCount > 0 ? String(s.notifyCount) : '',
            'openNotificationsWorkspace()',
            canAccessNotificationsPage()
        );
        push(
            '',
            '📒',
            t('دفتر العناوين', 'Address book'),
            t('الملاك والمستأجرين والجهات', 'Owners, tenants & contacts'),
            '',
            'openAddressBookWorkspace()',
            effectivePermissionAny(['manage_owners', 'manage_contracts', 'view_address_book'])
        );
        if (!cards.length) {
            return `<p style="font-size:12px;color:#888;margin:0">${t('لا توجد وحدات متاحة لصلاحياتك الحالية.', 'No modules available for your current permissions.')}</p>`;
        }
        return cards.join('');
    }

    function renderDashboardModuleHub() {
        const host = document.getElementById('dashboardModuleHub');
        if (!host) return;
        if (!effectivePermission('manage_dashboard')) {
            host.innerHTML = '';
            return;
        }
        host.innerHTML = buildDashboardModuleHubHtml();
    }

    function buildBhdCalendarHtml(scope, optsIn) {
        const opts = optsIn && typeof optsIn === 'object' ? optsIn : {};
        const compact = !!opts.compact;
        const ym = getCalendarMonthState(scope);
        const [year, month] = ym.split('-').map((x) => parseInt(x, 10));
        const first = new Date(year, month - 1, 1);
        const startDow = first.getDay();
        const daysInMonth = new Date(year, month, 0).getDate();
        const events = collectCalendarEvents(scope, year, month);
        storeCalendarEvents(scope, year, month, events);
        const byDate = {};
        events.forEach((ev) => {
            const d = toStr(ev.date).slice(0, 10);
            if (!byDate[d]) byDate[d] = [];
            byDate[d].push(ev);
        });
        const todayYmd = formatDateYmdLocal(new Date());
        const dows = [
            t('أحد', 'Sun'), t('إثن', 'Mon'), t('ثلا', 'Tue'), t('أرب', 'Wed'),
            t('خمي', 'Thu'), t('جمع', 'Fri'), t('سبت', 'Sat')
        ];
        let cells = dows.map((d) => `<div class="bhd-calendar-dow">${escHtml(d)}</div>`).join('');
        const prevMonthDays = new Date(year, month - 1, 0).getDate();
        for (let i = 0; i < startDow; i++) {
            const dayNum = prevMonthDays - startDow + i + 1;
            cells += `<div class="bhd-calendar-day other-month"><div class="bhd-calendar-day-num">${dayNum}</div></div>`;
        }
        const maxShow = compact ? 0 : 3;
        for (let day = 1; day <= daysInMonth; day++) {
            const ymd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvs = byDate[ymd] || [];
            const hasEvents = dayEvs.length > 0;
            const evs = dayEvs.slice(0, maxShow).map((ev) =>
                `<span class="bhd-cal-ev ${escHtml(ev.kind)}" ${safeOnClickJs(`event.stopPropagation();openCalendarEventDetail(${JSON.stringify(ev.id)})`)} title="${escHtml(ev.subtitle || ev.title)}">${escHtml(ev.title)}</span>`
            ).join('');
            const more = dayEvs.length > maxShow
                ? `<small class="bhd-calendar-day-more" ${safeOnClickJs(`event.stopPropagation();openCalendarDayPanel(${JSON.stringify(ymd)},${JSON.stringify(scope)})`)}>+${dayEvs.length - maxShow} ${t('أخرى', 'more')}</small>`
                : '';
            const dayClick = hasEvents ? safeOnClick('openCalendarDayPanel', ymd, scope) : '';
            const countBadge = hasEvents ? `<span class="bhd-calendar-day-count">${dayEvs.length}</span>` : '';
            cells += `<div class="bhd-calendar-day${ymd === todayYmd ? ' today' : ''}${hasEvents ? ' has-events' : ''}" ${dayClick}>
                <div class="bhd-calendar-day-num${hasEvents ? ' clickable' : ''}">${day}${countBadge}</div>
                ${evs}${more}
            </div>`;
        }
        const monthLabel = `${year}-${String(month).padStart(2, '0')}`;
        const eventCount = events.length;
        const calTitle = compact
            ? t('التقويم', 'Calendar')
            : t('التقويم التفاعلي / Interactive calendar', 'Interactive calendar / التقويم');
        const calHint = compact
            ? t(`${eventCount} حدث — اضغط اليوم`, `${eventCount} events — click day`)
            : t(`${eventCount} حدث — اضغط على اليوم أو الحدث للتفاصيل`, `${eventCount} events — click day or event for details`);
        return `<div class="bhd-calendar-head">
            <div>
                <strong>${escHtml(calTitle)}${compact ? '' : ` — ${escHtml(monthLabel)}`}</strong>
                <small style="display:block;font-size:11px;color:#666;margin-top:2px">${calHint}${compact ? ` · ${escHtml(monthLabel)}` : ''}</small>
            </div>
            <div style="display:flex;gap:4px;flex-wrap:wrap">
                <button type="button" class="btn-outline mini-btn" ${safeOnClick('shiftCalendarMonth', scope, -1)}>◀</button>
                <button type="button" class="btn-outline mini-btn" ${safeOnClick('shiftCalendarMonth', scope, 1)}>▶</button>
                ${compact ? '' : `<button type="button" class="btn-outline mini-btn" ${safeOnClick('refreshActiveCalendarView')}>${t('تحديث', 'Refresh')}</button>`}
            </div>
        </div>
        <div class="bhd-calendar-grid">${cells}</div>
        <div class="bhd-cal-legend${compact ? ' bhd-cal-legend--compact' : ''}">
            <span class="lg-task">${t('مهام', 'Tasks')}</span>
            <span class="lg-rent">${t('إيجار', 'Rent')}</span>
            <span class="lg-cheque">${t('شيكات', 'Cheques')}</span>
            <span class="lg-contract">${t('عقود', 'Contracts')}</span>
            ${compact ? '' : `<span class="lg-document">${t('مستندات', 'Documents')}</span>
            <span class="lg-birthday">${t('أعياد', 'Birthdays')}</span>
            <span class="lg-occasion">${t('مناسبات', 'Occasions')}</span>`}
        </div>`;
    }

    function refreshActiveCalendarView() {
        if (document.body.classList.contains('mode-accounting')) renderAccountingWorkspace();
        else if (document.body.classList.contains('mode-notifications')) renderNotificationsPage();
        else renderDashboardCalendar();
    }

    function renderDashboardCalendar() {
        const host = document.getElementById('dashboardCalendarHost');
        if (!host || !effectivePermission('manage_dashboard')) {
            if (host) host.innerHTML = '';
            return;
        }
        scheduleAutomaticDataSync(false);
        host.innerHTML = buildBhdCalendarHtml('admin', { compact: true });
        renderDashboardModuleHub();
    }

