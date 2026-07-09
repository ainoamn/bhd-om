    /** === BhdDataStore — طبقة تخزين موحّدة (2B) — لا تُعرض في الواجهة === */
    const BHD_CLOUD_SESSION_KEY = 'bhd_cloud_session';
    let bhdCloudApiAvailable = false;
    let _bhdCloudApiBaseResolved = '/api/v1';
    let _bhdCloudHydratePromise = null;
    let _bhdCloudPushTimer = 0;

    function bhdCloudSessionLoad() {
        try {
            const raw = localStorage.getItem(BHD_CLOUD_SESSION_KEY);
            if (!raw) return null;
            const o = JSON.parse(raw);
            return o && typeof o === 'object' ? o : null;
        } catch (_e) {
            return null;
        }
    }

    function bhdCloudSessionSave(session) {
        if (!session) {
            localStorage.removeItem(BHD_CLOUD_SESSION_KEY);
            window.__bhdCloudApiActive = false;
            return;
        }
        localStorage.setItem(BHD_CLOUD_SESSION_KEY, JSON.stringify(session));
        window.__bhdCloudApiActive = !!(session.accessToken && session.companyId);
    }

    function bhdCloudApiBaseCandidates() {
        const list = ['/api/v1'];
        const host = location.hostname;
        if (host === 'localhost' || host === '127.0.0.1') {
            list.push('http://127.0.0.1:3790/api/v1', 'http://localhost:3790/api/v1');
        }
        return list;
    }

    async function bhdFetchWithTimeout(url, options = {}, timeoutMs = 2500) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
            return await fetch(url, { ...options, signal: ctrl.signal });
        } finally {
            clearTimeout(timer);
        }
    }

    function markBhdAppRefreshBoot() {
        try {
            sessionStorage.setItem('bhd_app_refresh_fast', '1');
            sessionStorage.setItem('bhd_app_refresh_done', String(Date.now()));
        } catch (_eMark) {}
    }

    function isBhdAppRefreshFastBoot() {
        try {
            return sessionStorage.getItem('bhd_app_refresh_fast') === '1';
        } catch (_eIs) {
            return false;
        }
    }

    function clearBhdAppRefreshFastBoot() {
        try {
            sessionStorage.removeItem('bhd_app_refresh_fast');
        } catch (_eClr) {}
    }

    async function probeBhdCloudApi() {
        bhdCloudApiAvailable = false;
        const list = [...bhdCloudApiBaseCandidates()];
        if (window.bhdDesktop) {
            try {
                const st = await window.bhdDesktop.syncGetStatus();
                const custom = toStr(st?.cloudApiUrl).replace(/\/$/, '');
                if (custom) list.unshift(`${custom}/api/v1`);
            } catch (_eDeskCloud) {}
        }
        for (const base of list) {
            try {
                const r = await bhdFetchWithTimeout(`${base}/health`, { method: 'GET', cache: 'no-store' });
                if (r.ok) {
                    bhdCloudApiAvailable = true;
                    _bhdCloudApiBaseResolved = base;
                    console.debug('[BHD] cloud api reachable', { base });
                    return;
                }
            } catch (_eProbe) {}
        }
        console.debug('[BHD] cloud api not used');
    }

    async function bhdCloudFetch(path, options = {}) {
        const session = bhdCloudSessionLoad();
        const headers = Object.assign({}, options.headers || {});
        if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
        if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
        const url = `${_bhdCloudApiBaseResolved}${path.startsWith('/') ? path : `/${path}`}`;
        let r = await fetch(url, { ...options, headers });
        if (r.status === 401 && session?.refreshToken) {
            try {
                const rr = await fetch(`${_bhdCloudApiBaseResolved}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken: session.refreshToken }),
                });
                if (rr.ok) {
                    const data = await rr.json();
                    session.accessToken = data.accessToken;
                    session.refreshToken = data.refreshToken || session.refreshToken;
                    bhdCloudSessionSave(session);
                    headers.Authorization = `Bearer ${session.accessToken}`;
                    r = await fetch(url, { ...options, headers });
                }
            } catch (_eRef) {}
        }
        return r;
    }

    async function bhdCloudSyncLoginBridge(email, password) {
        if (!bhdCloudApiAvailable) return false;
        try {
            const r = await fetch(`${_bhdCloudApiBaseResolved}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: normalizeAuthEmailInput(email), password: toStr(password) }),
            });
            if (!r.ok) return false;
            let data = await r.json();
            if (!data.accessToken && !data.needsCompanySelection) return false;

            if (data.needsCompanySelection && Array.isArray(data.companies) && data.companies.length) {
                const preferred = toStr(localStorage.getItem('bhd_internal_company_slug')).trim();
                const pick =
                    data.companies.find((c) => c.slug === preferred) ||
                    data.companies[0];
                const sr = await fetch(`${_bhdCloudApiBaseResolved}/auth/select-company`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${data.accessToken}`,
                    },
                    body: JSON.stringify({ companyId: pick.id }),
                });
                if (!sr.ok) return false;
                data = await sr.json();
            }

            if (!data.accessToken) return false;
            bhdCloudSessionSave({
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                companyId: data.company?.id || data.companyId || null,
                companySlug: data.company?.slug || null,
            });
            if (data.company?.slug) {
                localStorage.setItem('bhd_internal_company_slug', data.company.slug);
            }
            window.__bhdCloudApiActive = true;
            console.debug('[BHD] cloud session linked');
            await bhdCloudSyncAfterSessionReady();
            return true;
        } catch (e) {
            console.debug('[BHD] cloud login bridge skipped', e);
            return false;
        }
    }

    async function bhdCloudTryRestoreSession() {
        if (!bhdCloudApiAvailable) return false;
        const session = bhdCloudSessionLoad();
        if (!session?.accessToken) return false;
        try {
            const r = await bhdCloudFetch('/auth/me');
            if (!r.ok) {
                bhdCloudSessionSave(null);
                return false;
            }
            window.__bhdCloudApiActive = true;
            await bhdCloudSyncAfterSessionReady();
            return true;
        } catch (_e) {
            return false;
        }
    }

    function bhdCloudClearSession() {
        const session = bhdCloudSessionLoad();
        if (session?.refreshToken) {
            fetch(`${_bhdCloudApiBaseResolved}/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: session.refreshToken }),
            }).catch(() => {});
        }
        bhdCloudSessionSave(null);
    }

    async function bhdCloudFetchAllPages(pathPrefix, limit = 200) {
        const items = [];
        let page = 1;
        let totalPages = 1;
        while (page <= totalPages) {
            const r = await bhdCloudFetch(`${pathPrefix}${pathPrefix.includes('?') ? '&' : '?'}page=${page}&limit=${limit}`);
            if (!r.ok) break;
            const data = await r.json();
            if (Array.isArray(data.items)) items.push(...data.items);
            totalPages = data.totalPages || 1;
            page += 1;
        }
        return items;
    }

    async function bhdCloudHydrateProperties(force) {
        if (!window.__bhdCloudApiActive) return false;
        if (_bhdCloudHydratePromise && !force) return _bhdCloudHydratePromise;
        _bhdCloudHydratePromise = (async () => {
            try {
                const allBuildings = await bhdCloudFetchAllPages('/buildings', 200);
                const allUnits = await bhdCloudFetchAllPages('/units', 500);
                if (!allBuildings.length && !allUnits.length) return false;

                const cloudNames = allBuildings.map((b) => toStr(b.name)).filter(Boolean);
                const cloudProfiles = {};
                allBuildings.forEach((b) => {
                    const name = toStr(b.name);
                    if (!name) return;
                    const prof = b.profile && typeof b.profile === 'object' ? { ...b.profile } : {};
                    if (b.status) prof.buildingStatus = b.status;
                    prof._cloudId = b.id;
                    cloudProfiles[name] = prof;
                });

                let localProfiles = {};
                let localBuildings = [];
                let localUnits = [];
                try {
                    localProfiles = JSON.parse(localStorage.getItem('bhd_building_profiles') || '{}');
                } catch (_eLocBp) {}
                try {
                    localBuildings = JSON.parse(localStorage.getItem('bhd_buildings_list') || '[]');
                } catch (_eLocBl) {}
                try {
                    localUnits = JSON.parse(localStorage.getItem('bhd_managed_units') || '[]');
                } catch (_eLocMu) {}

                buildingProfiles = mergeBuildingProfilesObjects(localProfiles, cloudProfiles);
                buildingProfilesShadow = { ...buildingProfiles };
                buildingsList.splice(
                    0,
                    buildingsList.length,
                    ...mergeBuildingsListArrays(localBuildings, cloudNames)
                );

                const cloudUnits = allUnits.map((u) => {
                    const meta = u.managedMeta && typeof u.managedMeta === 'object' ? { ...u.managedMeta } : {};
                    return {
                        building: u.building?.name || meta.building || '',
                        unit: u.unitNo,
                        floor: u.floor || meta.floor || '',
                        unitType: u.unitType || meta.unitType || '',
                        status: u.status || meta.status || 'Vacant',
                        ownerNames: meta.ownerNames || '',
                        electricity: meta.electricity || '',
                        water: meta.water || '',
                        tenant: meta.tenant || '',
                        endDate: meta.endDate || '',
                        monthlyRent: meta.monthlyRent || 0,
                        _cloudId: u.id,
                        _cloudBuildingId: u.buildingId,
                        ...meta
                    };
                });
                managedUnitsData = Array.isArray(localUnits) && localUnits.length ? localUnits : cloudUnits;
                if (Array.isArray(localUnits) && localUnits.length && cloudUnits.length) {
                    const unitKey = (row) => `${normalizeReservationBuildingKey(row.building)}\t${normalizeUnit(row.unit)}`;
                    const mergedUnitsMap = new Map();
                    cloudUnits.forEach((row) => mergedUnitsMap.set(unitKey(row), row));
                    localUnits.forEach((row) => mergedUnitsMap.set(unitKey(row), row));
                    managedUnitsData = [...mergedUnitsMap.values()];
                }

                localStorage.setItem('bhd_buildings_list', JSON.stringify(buildingsList));
                localStorage.setItem('bhd_building_profiles', JSON.stringify(buildingProfiles));
                localStorage.setItem('bhd_managed_units', JSON.stringify(managedUnitsData));
                bumpUnitsDataCache();
                refreshDashboardIfVisible();
                return true;
            } catch (e) {
                console.warn('[BHD] cloud hydrate failed', e);
                return false;
            } finally {
                _bhdCloudHydratePromise = null;
            }
        })();
        return _bhdCloudHydratePromise;
    }

    async function bhdCloudPushPropertiesNow() {
        if (!window.__bhdCloudApiActive) return;
        try {
            loadDashboardAux(true);
            const nameToCloudId = new Map();
            Object.keys(buildingProfiles || {}).forEach((name) => {
                const prof = buildingProfiles[name];
                if (prof && prof._cloudId) nameToCloudId.set(name, prof._cloudId);
            });

            for (const name of buildingsList) {
                const n = toStr(name).trim();
                if (!n) continue;
                const prof = buildingProfiles[n] || {};
                const payload = {
                    name: n,
                    status: prof.buildingStatus || prof.status || null,
                    profile: prof,
                };
                let cloudId = nameToCloudId.get(n) || prof._cloudId;
                if (cloudId) {
                    await bhdCloudFetch(`/buildings/${cloudId}`, {
                        method: 'PATCH',
                        body: JSON.stringify(payload),
                    });
                } else {
                    const r = await bhdCloudFetch('/buildings', {
                        method: 'POST',
                        body: JSON.stringify(payload),
                    });
                    if (r.ok) {
                        const data = await r.json();
                        cloudId = data.building?.id;
                        if (cloudId) {
                            prof._cloudId = cloudId;
                            buildingProfiles[n] = prof;
                            nameToCloudId.set(n, cloudId);
                        }
                    }
                }
            }

            for (const u of managedUnitsData || []) {
                const buildingName = toStr(u.building).trim();
                const unitNo = toStr(u.unit).trim();
                if (!buildingName || !unitNo) continue;
                let buildingId = nameToCloudId.get(buildingName) || u._cloudBuildingId;
                if (!buildingId) {
                    const prof = buildingProfiles[buildingName] || {};
                    buildingId = prof._cloudId;
                }
                if (!buildingId) continue;

                const { building, unit, _cloudId, _cloudBuildingId, ...rest } = u;
                const body = {
                    buildingId,
                    unitNo,
                    floor: u.floor || null,
                    unitType: u.unitType || null,
                    status: u.status || 'Vacant',
                    managedMeta: rest,
                };
                if (_cloudId) {
                    await bhdCloudFetch(`/units/${_cloudId}`, {
                        method: 'PATCH',
                        body: JSON.stringify(body),
                    });
                } else {
                    const r = await bhdCloudFetch('/units', {
                        method: 'POST',
                        body: JSON.stringify(body),
                    });
                    if (r.ok) {
                        const data = await r.json();
                        if (data.unit?.id) u._cloudId = data.unit.id;
                        u._cloudBuildingId = buildingId;
                    }
                }
            }

            localStorage.setItem('bhd_building_profiles', JSON.stringify(buildingProfiles));
            localStorage.setItem('bhd_managed_units', JSON.stringify(managedUnitsData));
        } catch (e) {
            console.warn('[BHD] cloud push failed', e);
        }
    }

    function scheduleBhdCloudPropertiesPush(delayMs) {
        if (!window.__bhdCloudApiActive) return;
        clearTimeout(_bhdCloudPushTimer);
        _bhdCloudPushTimer = setTimeout(() => {
            _bhdCloudPushTimer = 0;
            bhdCloudPushPropertiesNow().catch(() => {});
        }, delayMs == null ? 3000 : delayMs);
    }

    const BHD_CLOUD_DATA_EXCLUDE = new Set(['bhd_auth_session', 'bhd_theme_mode', 'bhd_cloud_session']);
    const BHD_CLOUD_PROPERTY_KEYS = new Set(['bhd_buildings_list', 'bhd_building_profiles', 'bhd_managed_units']);
    let _bhdCloudDataPushTimer = 0;

    function bhdCloudDataKeysToSync() {
        return BHD_KV_KEYS.filter((k) => !BHD_CLOUD_DATA_EXCLUDE.has(k) && !BHD_CLOUD_PROPERTY_KEYS.has(k));
    }

    async function bhdCloudPullDataBlobs() {
        if (!window.__bhdCloudApiActive) return false;
        try {
            const keys = bhdCloudDataKeysToSync();
            if (!keys.length) return false;
            const r = await bhdCloudFetch(`/company-data?keys=${encodeURIComponent(keys.join(','))}`);
            if (!r.ok) return false;
            const payload = await r.json();
            const data = payload.data || {};
            let any = false;
            keys.forEach((k) => {
                const val = data[k];
                if (typeof val !== 'string') return;
                const local = localStorage.getItem(k);
                if (local === null || (bhdKvIsEmptyShell(local) && !bhdKvIsEmptyShell(val))) {
                    localStorage.setItem(k, val);
                    any = true;
                }
            });
            if (any) {
                _accountingRegistryCache = null;
                _accountingRegistryCacheRaw = null;
                bumpUnitsDataCache();
            }
            return any;
        } catch (e) {
            console.warn('[BHD] cloud data pull failed', e);
            return false;
        }
    }

    async function bhdCloudPushDataBlobsNow() {
        if (!window.__bhdCloudApiActive) return;
        const payload = {};
        bhdCloudDataKeysToSync().forEach((k) => {
            const v = localStorage.getItem(k);
            if (v !== null) payload[k] = v;
        });
        if (!Object.keys(payload).length) return;
        try {
            const r = await bhdCloudFetch('/company-data/bulk', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            if (!r.ok) console.warn('[BHD] cloud data bulk push status', r.status);
        } catch (e) {
            console.warn('[BHD] cloud data push failed', e);
        }
    }

    function scheduleBhdCloudDataPush(delayMs) {
        if (!window.__bhdCloudApiActive) return;
        clearTimeout(_bhdCloudDataPushTimer);
        _bhdCloudDataPushTimer = setTimeout(() => {
            _bhdCloudDataPushTimer = 0;
            bhdCloudPushDataBlobsNow().catch(() => {});
        }, delayMs == null ? 4000 : delayMs);
    }

    function scheduleBhdCloudSyncAll(delayMs) {
        scheduleBhdCloudPropertiesPush(delayMs);
        scheduleBhdCloudDataPush(delayMs);
    }

    async function bhdCloudSyncAfterSessionReady() {
        if (!window.__bhdCloudApiActive) return;
        const hydratedProps = await bhdCloudHydrateProperties(false);
        const pulledData = await bhdCloudPullDataBlobs();
        if (!hydratedProps && !pulledData) scheduleBhdCloudSyncAll(800);
        ensureBhdCloudBackgroundSync();
    }

    let _bhdCloudBgSyncStarted = false;
    /** سحب خفيف عند العودة للتبويب — للعمل الجماعي دون إظهار «مزامنة» */
    function ensureBhdCloudBackgroundSync() {
        if (_bhdCloudBgSyncStarted || !window.__bhdCloudApiActive) return;
        _bhdCloudBgSyncStarted = true;
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState !== 'visible' || !window.__bhdCloudApiActive) return;
            bhdCloudPullDataBlobs()
                .then((changed) => {
                    if (!changed) return;
                    bumpUnitsDataCache();
                    try {
                        loadDashboardAux(true);
                    } catch (_ePull) {}
                })
                .catch(() => {});
        });
    }

    const _bhdKvDirtyKeys = new Set();
    let _bhdKvDirtyHookInstalled = false;

    function ensureBhdKvDirtyTracking() {
        if (_bhdKvDirtyHookInstalled) return;
        _bhdKvDirtyHookInstalled = true;
        const origSet = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
            origSet.call(this, key, value);
            if (typeof key === 'string' && BHD_KV_KEYS.includes(key)) _bhdKvDirtyKeys.add(key);
        };
        const origRemove = Storage.prototype.removeItem;
        Storage.prototype.removeItem = function (key) {
            origRemove.call(this, key);
            if (typeof key === 'string' && BHD_KV_KEYS.includes(key)) _bhdKvDirtyKeys.add(key);
        };
    }

    function markBhdKvDirty(key) {
        if (typeof key === 'string' && BHD_KV_KEYS.includes(key)) _bhdKvDirtyKeys.add(key);
    }

    function takeBhdKvDirtyKeys() {
        const keys = [..._bhdKvDirtyKeys];
        _bhdKvDirtyKeys.clear();
        return keys;
    }

    function buildBhdKvPayload(keys) {
        const payload = {};
        const list = keys && keys.length ? keys : BHD_KV_KEYS;
        list.forEach((k) => {
            const v = localStorage.getItem(k);
            if (v !== null) payload[k] = v;
        });
        return payload;
    }

    function scheduleDesktopIdbMirror() {
        if (!window.bhdDesktop) return;
        const run = () => mirrorKvFromLocalStorageToIndexedDb().catch(() => {});
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(run, { timeout: 12000 });
        } else {
            setTimeout(run, 800);
        }
    }

    ensureBhdKvDirtyTracking();

    async function syncBhdKvToServer(options = {}) {
        const forceAll = options.forceAll === true;
        if (!window.bhdDesktop) {
            await mirrorKvFromLocalStorageToIndexedDb();
        }
        const dirty = takeBhdKvDirtyKeys();
        const keysToSync = forceAll || !dirty.length ? BHD_KV_KEYS : dirty;
        const payload = buildBhdKvPayload(keysToSync);
        if (window.bhdDesktop) {
            if (!Object.keys(payload).length) return;
            try {
                await window.bhdDesktop.kvPutBulk(payload);
            } catch (e) {
                console.warn('syncBhdKvToDesktop failed', e);
            }
            scheduleDesktopIdbMirror();
            return;
        }
        if (!bhdApiAvailable) return;
        try {
            await fetch('/api/kv/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.warn('syncBhdKvToServer failed', e);
        }
    }

    let _bhdKvSyncTimer = 0;
    function scheduleBhdKvToServer(delayMs) {
        clearTimeout(_bhdKvSyncTimer);
        _bhdKvSyncTimer = setTimeout(() => {
            _bhdKvSyncTimer = 0;
            syncBhdKvToServer().catch(() => {});
            scheduleBhdCloudDataPush(500);
        }, delayMs == null ? 2500 : delayMs);
    }

    async function pullBhdKvFromServer() {
        bhdAuditMute();
        try {
        if (window.bhdDesktop) {
            try {
                const all = await window.bhdDesktop.kvGetBulk();
                let any = false;
                Object.keys(all || {}).forEach((k) => {
                    if (BHD_KV_KEYS.includes(k) && typeof all[k] === 'string') {
                        localStorage.setItem(k, all[k]);
                        any = true;
                    }
                });
                await mirrorKvFromLocalStorageToIndexedDb();
                return any;
            } catch (e) {
                console.warn('pullBhdKvFromDesktop failed', e);
                return false;
            }
        }
        if (!bhdApiAvailable) return false;
        try {
            const r = await fetch('/api/kv?prefix=bhd_', { credentials: 'include', cache: 'no-store' });
            if (!r.ok) return false;
            const all = await r.json();
            let any = false;
            Object.keys(all).forEach((k) => {
                if (BHD_KV_KEYS.includes(k) && typeof all[k] === 'string') {
                    localStorage.setItem(k, all[k]);
                    any = true;
                }
            });
            await mirrorKvFromLocalStorageToIndexedDb();
            return any;
        } catch (e) {
            console.warn('pullBhdKvFromServer failed', e);
            return false;
        }
        } finally {
            bhdAuditUnmute();
        }
    }

    /** تحديث النظام — حفظ، ثم إعادة تحميل دون تسجيل الخروج / Refresh app: save, reload while staying signed in */
    async function refreshAppSystem() {
        if (_contractSaveInProgress) {
            alert(
                t('انتظر انتهاء حفظ العقد أولاً ثم أعد المحاولة.', 'Wait for the contract save to finish, then try again.')
            );
            return;
        }
        const btn = document.getElementById('appTopNavRefreshBtn');
        if (btn?.dataset.busy === '1') return;
        if (btn) {
            btn.dataset.busy = '1';
            btn.disabled = true;
            btn.textContent = t('🔄 جاري التحديث…', '🔄 Refreshing…');
        }
        try {
            try {
                flushContractWorkspaceDraftSave();
            } catch (_eFlush) {}
            markBhdAppRefreshBoot();
            if (btn) btn.textContent = t('🔄 جاري الحفظ…', '🔄 Saving…');
            if (window.bhdDesktop) {
                markBhdKvDirty('bhd_contract_full');
                markBhdKvDirty('bhd_tenancy_contract_drafts');
                await syncBhdKvToServer({ forceAll: false });
            } else {
                await syncBhdKvToServer({ forceAll: true });
            }
            await probeBhdApi();
            // البيانات المحلية هي المصدر — لا سحب كامل مكرر قبل إعادة التحميل
            // Local state was just persisted; skip redundant full pull + IndexedDB mirror
        } catch (e) {
            console.warn('refreshAppSystem pre-reload', e);
            if (btn) {
                btn.dataset.busy = '0';
                btn.disabled = false;
                btn.textContent = t('🔄 تحديث النظام / Refresh system', '🔄 Refresh system / تحديث النظام');
            }
            alert(
                t(
                    'تعذّر تحديث البيانات قبل إعادة التحميل. حاول مرة أخرى أو أعد تشغيل التطبيق.',
                    'Could not refresh data before reload. Try again or restart the app.'
                )
            );
            return;
        }
        location.reload();
    }

    function toStr(v) {
        if (v === null || v === undefined) return '';
        return String(v).trim();
    }

    function normalizeUnit(u) {
        return toStr(u).replace(/\s+/g, '').replace(/[-_]/g, '').toUpperCase();
    }

    /** مطابقة اسم المبنى بين الجدول وحجوزات الوحدات (مسافات متعددة، أحرف مخفية مثل LRM) / Normalize building labels for reservation ↔ row matching */
    function normalizeReservationBuildingKey(v) {
        return toStr(String(v).replace(/[\u200c\u200d\u200e\u200f]/g, '')).replace(/\s+/g, ' ');
    }

    function normalizeDate(value) {
        if (!value && value !== 0) return '';
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return value.toISOString().slice(0, 10);
        }
        if (typeof value === 'number') {
            const parsed = XLSX.SSF.parse_date_code(value);
            if (parsed) {
                const d = new Date(parsed.y, parsed.m - 1, parsed.d);
                return d.toISOString().slice(0, 10);
            }
        }
        const txt = toStr(value);
        const d = new Date(txt);
        if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
        return '';
    }

    function detectColumnIndex(headers, aliases) {
        const normalized = headers.map((h) => toStr(h).toLowerCase());
        for (const alias of aliases) {
            const idx = normalized.findIndex((h) => h.includes(alias));
            if (idx >= 0) return idx;
        }
        return -1;
    }

    function readWorkbook(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                    resolve(wb);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    function parseTenantWorkbook(workbook) {
        const records = [];
        workbook.SheetNames.forEach((sheetName) => {
            const ws = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            if (!rows.length) return;

            let currentBuilding = sheetName;
            for (let i = 0; i < rows.length; i++) {
                const headers = rows[i].map(toStr);
                const pIdx = headers.findIndex((c) => c.toLowerCase() === 'property:' || c.toLowerCase() === 'property');
                if (pIdx >= 0 && headers[pIdx + 1]) {
                    currentBuilding = headers[pIdx + 1];
                }
                const unitIdx = detectColumnIndex(headers, ['flat no', 'unit no', 'unit', 's.no', 'رقم الشقة', 'الوحدة']);
                const tenantIdx = detectColumnIndex(headers, ['tenant name', 'tenant', 'name', 'اسم المستأجر', 'المستأجر']);
                const endIdx = detectColumnIndex(headers, ['end date', 'to', 'تاريخ النهاية', 'ينتهي']);
                const statusIdx = detectColumnIndex(headers, ['status', 'الحالة']);
                const mobileIdx = detectColumnIndex(headers, ['contact no', 'mobile', 'رقم النقال', 'رقم الجوال']);
                const tenantEnIdx = detectColumnIndex(headers, ['tenant name en', 'english name']);
                const civilIdx = detectColumnIndex(headers, ['civil card', 'civil no', 'id', 'الرقم المدني']);
                const rentIdx = detectColumnIndex(headers, ['rent amount', 'agreement  rent', 'agreement rent', 'monthly rent', 'الإيجار']);
                const agreementRentIdx = detectColumnIndex(headers, ['agreement rent', 'agreement  rent']);
                const startIdx = detectColumnIndex(headers, ['start date', 'from', 'تاريخ البداية', 'يبدأ']);
                const elecIdx = detectColumnIndex(headers, ['electricity account no', 'electricity account', 'electric a/c', 'electricity', 'عداد الكهرباء']);
                const elecReadingIdx = detectColumnIndex(headers, ['electricity reading', 'قراءة الكهرباء']);
                const waterIdx = detectColumnIndex(headers, ['water account no', 'water account', 'water a/c', 'water', 'عداد الماء']);
                const waterReadingIdx = detectColumnIndex(headers, ['water reading', 'قراءة الماء']);
                const floorIdx = detectColumnIndex(headers, ['floor details', 'floor', 'الطابق']);
                const unitDetailsIdx = detectColumnIndex(headers, ['unit details', 'type', 'نوع الوحدة']);
                const remainingIdx = detectColumnIndex(headers, ['remaining days', 'متبقي']);
                const monthsLeftIdx = detectColumnIndex(headers, ['months left', 'الشهور المتبقية']);
                const evacuationIdx = detectColumnIndex(headers, ['evacuation date', 'تاريخ الاخلاء']);
                const remarksIdx = detectColumnIndex(headers, ['remarks', 'ملاحظات']);
                if (unitIdx === -1) continue;

                let emptyStreak = 0;
                let lastDataRow = i;
                for (let r = i + 1; r < rows.length; r++) {
                    const row = rows[r].map(toStr);
                    const rowPropertyIdx = row.findIndex((c) => c.toLowerCase() === 'property:' || c.toLowerCase() === 'property');
                    if (rowPropertyIdx >= 0) break;

                    const possibleHeader = detectColumnIndex(row, ['tenant name', 'status', 'end date', 'اسم المستأجر', 'تاريخ النهاية']) !== -1
                        && detectColumnIndex(row, ['unit', 's.no', 'flat no', 'رقم الشقة']) !== -1;
                    if (possibleHeader) break;

                    const unit = toStr(row[unitIdx]);
                    const tenant = tenantIdx >= 0 ? toStr(row[tenantIdx]) : '';
                    const endDate = endIdx >= 0 ? normalizeDate(row[endIdx]) : '';
                    const startDate = startIdx >= 0 ? normalizeDate(row[startIdx]) : '';
                    const status = statusIdx >= 0 ? toStr(row[statusIdx]) : '';
                    if (!unit && !tenant && !endDate && !startDate) {
                        emptyStreak += 1;
                        if (emptyStreak >= 3) break;
                        continue;
                    }
                    emptyStreak = 0;
                    if (!unit) continue;
                    if (unit.toLowerCase().includes('total') || unit === 'S.No' || unit === 'Sr.') continue;
                    records.push({
                        serialNo: unit,
                        building: currentBuilding,
                        unit,
                        floor: floorIdx >= 0 ? toStr(row[floorIdx]) : '',
                        unitType: unitDetailsIdx >= 0 ? toStr(row[unitDetailsIdx]) : '',
                        status: status || (tenant ? 'Rented' : 'Vacant'),
                        tenant,
                        tenantEn: tenantEnIdx >= 0 ? toStr(row[tenantEnIdx]) : '',
                        civilCard: civilIdx >= 0 ? toStr(row[civilIdx]) : '',
                        contactNo: mobileIdx >= 0 ? toStr(row[mobileIdx]) : '',
                        mobile: mobileIdx >= 0 ? toStr(row[mobileIdx]) : '',
                        agreementNo: '',
                        monthlyRent: rentIdx >= 0 ? (parseFloat(toStr(row[rentIdx]).replace(/[^\d.]/g, '')) || 0) : 0,
                        agreementRent: agreementRentIdx >= 0 ? (parseFloat(toStr(row[agreementRentIdx]).replace(/[^\d.]/g, '')) || 0) : 0,
                        startDate,
                        endDate,
                        remainingDays: remainingIdx >= 0 ? toStr(row[remainingIdx]) : '',
                        monthsLeft: monthsLeftIdx >= 0 ? toStr(row[monthsLeftIdx]) : '',
                        evacuationDate: evacuationIdx >= 0 ? normalizeDate(row[evacuationIdx]) : '',
                        electricity: elecIdx >= 0 ? toStr(row[elecIdx]) : '',
                        electricityReading: elecReadingIdx >= 0 ? toStr(row[elecReadingIdx]) : '',
                        water: waterIdx >= 0 ? toStr(row[waterIdx]) : '',
                        waterReading: waterReadingIdx >= 0 ? toStr(row[waterReadingIdx]) : '',
                        remarks: remarksIdx >= 0 ? toStr(row[remarksIdx]) : ''
                    });
                    lastDataRow = r;
                }
                i = Math.max(i, lastDataRow);
            }
        });

        // إزالة التكرار على مستوى (المبنى + الوحدة) مع تفضيل الصف الأكثر اكتمالاً
        const dedupMap = new Map();
        records.forEach((rec) => {
            const key = `${toStr(rec.building)}::${normalizeUnit(rec.unit)}`;
            const prev = dedupMap.get(key);
            if (!prev) {
                dedupMap.set(key, rec);
                return;
            }
            const score = (x) => [x.tenant, x.startDate, x.endDate, x.electricity, x.water].filter(Boolean).length;
            if (score(rec) >= score(prev)) {
                dedupMap.set(key, rec);
            }
        });
        return [...dedupMap.values()];
    }

    function parseEwtWorkbook(workbook) {
        const map = new Map();
        workbook.SheetNames.forEach((sheetName) => {
            const ws = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            if (!rows.length) return;
            for (let i = 0; i < rows.length; i++) {
                const headers = rows[i].map(toStr);
                const unitIdx = detectColumnIndex(headers, ['unit', 'flat no']);
                const elecIdx = detectColumnIndex(headers, ['electricity', 'electric a/c', 'electric account']);
                const waterIdx = detectColumnIndex(headers, ['water', 'water a/c', 'water account']);
                if (unitIdx === -1 || (elecIdx === -1 && waterIdx === -1)) continue;

                for (let r = i + 1; r < rows.length; r++) {
                    const row = rows[r];
                    const unit = toStr(row[unitIdx]);
                    if (!unit) continue;
                    const key = `${sheetName}::${normalizeUnit(unit)}`;
                    map.set(key, {
                        building: sheetName,
                        unit,
                        electricity: elecIdx >= 0 ? toStr(row[elecIdx]) : '',
                        water: waterIdx >= 0 ? toStr(row[waterIdx]) : ''
                    });
                }
                break;
            }
        });
        return map;
    }

    async function importExcelData() {
        if (typeof XLSX === 'undefined') {
            alert('⚠️ مكتبة Excel غير متاحة حالياً. تأكد من الاتصال بالإنترنت أو أعد تحميل الصفحة.');
            return;
        }
        const tenantInput = document.getElementById('tenantExcelInput');
        const ewtInput = document.getElementById('ewtExcelInput');
        const tenantFile = selectedTenantExcelFile || tenantInput?.files?.item(0) || null;
        const ewtFile = selectedEwtExcelFile || ewtInput?.files?.item(0) || null;
        if (!tenantFile) {
            if (tenantInput) tenantInput.click();
            alert('⚠️ يرجى اختيار ملف Tenant Details.xlsx أولاً (تم فتح نافذة اختيار الملف).');
            return;
        }
        try {
            const tenantWb = await readWorkbook(tenantFile);
            const tenantRecords = parseTenantWorkbook(tenantWb);

            if (ewtFile) {
                const ewtWb = await readWorkbook(ewtFile);
                const ewtMap = parseEwtWorkbook(ewtWb);
                importedUnitsData = tenantRecords.map((rec) => {
                    const keyBySheet = `${rec.building}::${normalizeUnit(rec.unit)}`;
                    const meter = ewtMap.get(keyBySheet);
                    return {
                        ...rec,
                        electricity: rec.electricity || meter?.electricity || '',
                        water: rec.water || meter?.water || ''
                    };
                });
            } else {
                importedUnitsData = tenantRecords;
            }
            renderOperationsTable();
            refreshAddressBookFromSystem(false);
            alert(`✅ تم استيراد بيانات Tenant Details بنجاح. عدد الوحدات المستوردة: ${importedUnitsData.length}${ewtFile ? '' : ' (بدون دمج E.W.T)'}`);
        } catch (err) {
            console.error('Excel import failed:', err);
            alert('❌ فشل في قراءة ملفات Excel. تأكد من اختيار الملفات الصحيحة.');
        }
    }

    function clearImportedData() {
        importedUnitsData = [];
        renderOperationsTable();
        refreshAddressBookFromSystem(false);
        alert('🧹 تم مسح البيانات المستوردة والعودة للبيانات الأساسية.');
    }

    /** صف Excel موحّد للوحدات (نفس أعمدة ملف النظام) / Unified unit row for Excel */
    function buildSystemExcelRowFromUnit(u) {
        return {
            FloorDetail: u.floor || '',
            SerialNo: u.serialNo || '',
            Building: u.building || '',
            OwnerNames: u.ownerNames || formatOwnerNamesForBuilding(u.building) || '',
            Unit: u.unit || '',
            UnitType: u.unitType || '',
            Status: u.status || '',
            Tenant: u.tenant || '',
            TenantEn: u.tenantEn || '',
            CivilCard: u.civilCard || '',
            ContactNo: u.contactNo || u.mobile || '',
            Mobile: u.mobile || '',
            RentAmount: u.monthlyRent || 0,
            AgreementRent: u.agreementRent || u.monthlyRent || 0,
            AgreementNo: u.agreementNo || '',
            MonthlyRent: u.monthlyRent || 0,
            StartDate: u.startDate || '',
            EndDate: u.endDate || '',
            RemainingDays: u.remainingDays || '',
            MonthsLeft: u.monthsLeft || '',
            EvacuationDate: u.evacuationDate || '',
            Electricity: u.electricity || '',
            ElectricityReading: u.electricityReading || '',
            Water: u.water || '',
            WaterReading: u.waterReading || '',
            Remarks: u.remarks || ''
        };
    }

    function excelRowPick(r, shortEn, needles) {
        if (!r || typeof r !== 'object') return '';
        if (r[shortEn] !== undefined && toStr(r[shortEn]) !== '') return r[shortEn];
        const keys = Object.keys(r);
        for (const n of needles) {
            const k = keys.find((x) => x.replace(/\s+/g, ' ').includes(n));
            if (k !== undefined && toStr(r[k]) !== '') return r[k];
        }
        return '';
    }

    function unitRecordFromSystemExcelRow(r) {
        const n = (en, fr) => toStr(excelRowPick(r, en, fr));
        const num = (en, fr) => parseFloat(toStr(excelRowPick(r, en, fr)).replace(/[^\d.]/g, '')) || 0;
        return {
            serialNo: n('SerialNo', ['مسلسل', 'Serial']) || n('S.No', ['S.No']),
            building: n('Building', ['المبنى']),
            unit: n('Unit', ['الوحدة']),
            floor: n('FloorDetail', ['الطابق', 'Floor']) || n('Floor', ['Floor']),
            unitType: n('UnitType', ['نوع الوحدة', 'Unit type']),
            status: n('Status', ['الحالة']) || 'Rented',
            tenant: n('Tenant', ['المستأجر']),
            tenantEn: n('TenantEn', ['Tenant EN', 'إنجليزي']),
            civilCard: n('CivilCard', ['مدنية', 'Civil']) || n('CivilCardId', []),
            contactNo: n('ContactNo', ['جوال', 'Contact']) || n('Mobile', ['موبايل', 'Mobile']),
            mobile: n('Mobile', ['موبايل', 'Mobile']) || n('ContactNo', ['Contact']),
            agreementNo: n('AgreementNo', ['رقم العقد', 'Agreement']),
            rentAmount: num('RentAmount', ['مبلغ الإيجار', 'Rent amount']),
            monthlyRent: num('MonthlyRent', ['الإيجار الشهري', 'Monthly']),
            agreementRent: num('AgreementRent', ['اتفاقية', 'Agreement rent']),
            startDate: normalizeDate(excelRowPick(r, 'StartDate', ['البداية', 'Start date', 'Start'])),
            endDate: normalizeDate(excelRowPick(r, 'EndDate', ['الانتهاء', 'End date', 'End'])),
            remainingDays: n('RemainingDays', ['متبقية', 'Remaining']),
            monthsLeft: n('MonthsLeft', ['أشهر', 'Months']),
            evacuationDate: normalizeDate(excelRowPick(r, 'EvacuationDate', ['إخلاء', 'Evacuation'])),
            electricity: n('Electricity', ['كهرباء']),
            electricityReading: n('ElectricityReading', ['قراءة كهرباء']),
            water: n('Water', ['ماء', 'Water']),
            waterReading: n('WaterReading', ['قراءة ماء']),
            remarks: n('Remarks', ['ملاحظات', 'Remarks'])
        };
    }

    function mergeContractUnitRecordsIntoImported(incoming) {
        const keyOf = (u) => `${toStr(u.building)}\u0001${normalizeUnit(u.unit)}`;
        const map = new Map();
        importedUnitsData.forEach((u) => map.set(keyOf(u), { ...u }));
        incoming.forEach((u) => {
            const k = keyOf(u);
            map.set(k, { ...(map.get(k) || {}), ...u });
        });
        importedUnitsData = [...map.values()];
    }

    function sanitizeBuildingProfileForExport(profile) {
        if (!profile || typeof profile !== 'object') return profile;
        try {
            const p = JSON.parse(JSON.stringify(profile));
            const trimAtt = (a) => {
                if (!a || typeof a !== 'object') return a;
                const o = { ...a };
                if (o.dataUrl && String(o.dataUrl).length > 80) {
                    o.dataUrl = '';
                    o._exportNoteAr = 'تم حذف الملف الثنائي من التصدير — أعد الرفع من شاشة العقار';
                    o._exportNoteEn = 'Binary omitted in export — re-upload from property screen';
                }
                return o;
            };
            p.titleDeedAttachment = trimAtt(p.titleDeedAttachment);
            p.surveySketchAttachment = trimAtt(p.surveySketchAttachment);
            return p;
        } catch (e) {
            return profile;
        }
    }

    function buildingAttachmentExcelName(att) {
        const a = normalizeBuildingAttachment(att);
        return a ? toStr(a.name) : '';
    }

    function buildingProfileToExcelMainRow(buildingKey, profile) {
        const p = profile || {};
        const label = makeBuildingLabel(p) || buildingKey;
        const owners = getOwnerNamesForBuilding(label).join('؛ ');
        return {
            'مفتاح السجل / Record key': buildingKey,
            'اسم العقار / Property name': toStr(p.name || label),
            'نوع المبنى / Building type': toStr(p.buildingType),
            'حالة المبنى / Building status': formatBuildingStatusLabel(p.buildingStatus),
            'رقم المبنى / Building no.': toStr(p.buildingNo),
            'رقم القطعة / Plot no.': toStr(p.plotNo),
            'رقم المجمع / Complex no.': toStr(p.complexNo),
            'نوع استعمال الأرض / Land use': toStr(p.landUse),
            'سند الملكية — اسم الملف / Title deed — file name': buildingAttachmentExcelName(p.titleDeedAttachment),
            'الرسم المساحي — اسم الملف / Survey sketch — file name': buildingAttachmentExcelName(p.surveySketchAttachment),
            'رابط خرائط جوجل / Google Maps URL': toStr(p.googleMapsUrl),
            'عداد الكهرباء / Electricity meter': toStr(p.electricityMeter),
            'عداد الماء / Water meter': toStr(p.waterMeter),
            'رقم الإنترنت / Internet no.': toStr(p.internetNo),
            'عداد ماء الحريق / Fire water meter': toStr(p.fireWaterMeter),
            'عداد كهرباء الحريق / Fire electricity meter': toStr(p.fireElectricityMeter),
            'رقم السكة أو الزقاق / Way no.': toStr(p.wayNo),
            'رقم الرسم المساحي (الكروكي) / Sketch no.': toStr(p.sketchNo),
            'المحافظة / Governorate': toStr(p.governorate),
            'الولاية / Wilayat': toStr(p.wilayat),
            'المنطقة / Area': toStr(p.area),
            'عدد الطوابق / Floor count': p.floorCount != null && p.floorCount !== '' ? p.floorCount : (Array.isArray(p.floors) ? p.floors.length : ''),
            'إيجار الفيلا الشهري (ر.ع) / Villa monthly rent (OMR)': toStr(p.buildingType) === 'فيلا' ? formatRentAmountForInput(p.villaMonthlyRent) : '',
            'ملاك مرتبطون / Linked owners (؛)': owners,
            'أنشئ في / Created at': toStr(p.createdAt),
            'عُدّل في / Updated at': toStr(p.updatedAt),
            'أنشئ بواسطة / Created by': toStr(p.createdBy),
            'عُدّل بواسطة / Updated by': toStr(p.updatedBy)
        };
    }

    function flattenFloorsSheetRows(buildingKey, profile) {
        const floors = Array.isArray(profile.floors) ? profile.floors : [];
        return floors.map((f, idx) => ({
            'مفتاح السجل / Record key': buildingKey,
            'رقم الطابق / Floor # (1…n)': idx + 1,
            'اسم الطابق / Floor name': toStr(f.name),
            'عدد الوحدات / Unit count': f.unitCount != null ? f.unitCount : ((f.unitsDetailed || []).length),
            'أنواع الوحدات (مفصولة بفاصلة) / Unit types (comma)': (Array.isArray(f.selectedTypes) ? f.selectedTypes : []).join(', ')
        }));
    }

    function flattenFloorUnitsSheetRows(buildingKey, profile) {
        const out = [];
        const floors = Array.isArray(profile.floors) ? profile.floors : [];
        floors.forEach((f, fi) => {
            const detailed = Array.isArray(f.unitsDetailed) ? f.unitsDetailed : [];
            detailed.forEach((u) => {
                out.push({
                    'مفتاح السجل / Record key': buildingKey,
                    'رقم الطابق / Floor # (1…n)': fi + 1,
                    'رقم الوحدة / Unit no.': toStr(u.number),
                    'نوع الوحدة / Unit type': toStr(u.type) || 'Flat',
                    'الإيجار الشهري (ر.ع) / Monthly rent (OMR)': formatRentAmountForInput(u.monthlyRent),
                    'عداد كهرباء الوحدة / Unit electricity ID': toStr(u.electricity),
                    'عداد ماء الوحدة / Unit water ID': toStr(u.water)
                });
            });
        });
        return out;
    }

    function excelPickRowField(row, needles) {
        const keys = Object.keys(row || {});
        for (const n of needles) {
            const k = keys.find((x) => x.replace(/\s+/g, ' ').includes(n));
            if (k !== undefined) return row[k];
        }
        return '';
    }

    function parseExcelOwnerList(text) {
        return toStr(text)
            .split(/[؛;,،\n\r]+/)
            .map((x) => toStr(x).trim())
            .filter(Boolean);
    }

    function applyExcelLinkedOwnersForBuilding(buildingName, ownerNames) {
        const b = toStr(buildingName);
        if (!b) return;
        ownerNames.forEach((owner) => {
            if (!ownersList.includes(owner)) ownersList.push(owner);
            if (!ownerBuildingMap[owner]) ownerBuildingMap[owner] = [];
            if (!ownerBuildingMap[owner].includes(b)) ownerBuildingMap[owner].push(b);
        });
    }

    function buildingProfileFromExcelSheets(mainRow, floorRowsByKey, unitRowsByKeyFloor) {
        const rk = toStr(excelPickRowField(mainRow, ['مفتاح السجل', 'Record key']));
        const name = toStr(excelPickRowField(mainRow, ['اسم العقار', 'Property name'])) || rk;
        const prev = buildingProfiles[rk] || buildingProfiles[name] || {};
        const profile = {
            ...getEmptyBuildingProfile(),
            ...prev,
            name,
            buildingType: toStr(excelPickRowField(mainRow, ['نوع المبنى', 'Building type'])) || 'متعدد الطوابق',
            buildingStatus: normalizeBuildingStatus(excelPickRowField(mainRow, ['حالة المبنى', 'Building status'])),
            buildingNo: toStr(excelPickRowField(mainRow, ['رقم المبنى', 'Building no'])),
            plotNo: toStr(excelPickRowField(mainRow, ['رقم القطعة', 'Plot no'])),
            complexNo: toStr(excelPickRowField(mainRow, ['رقم المجمع', 'Complex no'])),
            landUse: toStr(excelPickRowField(mainRow, ['نوع استعمال', 'Land use'])),
            googleMapsUrl: toStr(excelPickRowField(mainRow, ['خرائط جوجل', 'Google Maps', 'maps.google'])),
            electricityMeter: toStr(excelPickRowField(mainRow, ['عداد الكهرباء', 'Electricity meter'])),
            waterMeter: toStr(excelPickRowField(mainRow, ['عداد الماء', 'Water meter'])),
            internetNo: toStr(excelPickRowField(mainRow, ['الإنترنت', 'Internet no'])),
            fireWaterMeter: toStr(excelPickRowField(mainRow, ['ماء الحريق', 'Fire water'])),
            fireElectricityMeter: toStr(excelPickRowField(mainRow, ['كهرباء الحريق', 'Fire electricity'])),
            wayNo: toStr(excelPickRowField(mainRow, ['السكة', 'الزقاق', 'Way no'])),
            sketchNo: toStr(excelPickRowField(mainRow, ['الرسم المساحي', 'Sketch no'])),
            governorate: toStr(excelPickRowField(mainRow, ['المحافظة', 'Governorate'])),
            wilayat: toStr(excelPickRowField(mainRow, ['الولاية', 'Wilayat'])),
            area: toStr(excelPickRowField(mainRow, ['المنطقة', 'Area'])),
            villaMonthlyRent: formatRentAmountForInput(excelPickRowField(mainRow, ['إيجار الفيلا', 'Villa monthly rent', 'Villa rent']))
        };
        const fcStr = toStr(excelPickRowField(mainRow, ['عدد الطوابق', 'Floor count']));
        const fcNum = parseInt(fcStr.replace(/[^\d]/g, ''), 10);
        profile.floorCount = !Number.isNaN(fcNum) && fcStr ? fcNum : 0;

        const fRows = floorRowsByKey[rk] || [];
        const uMap = unitRowsByKeyFloor[rk] || {};
        const maxFloorFromSheets = Math.max(
            0,
            ...fRows.map((r) => parseInt(toStr(excelPickRowField(r, ['رقم الطابق', 'Floor #'])).replace(/[^\d]/g, ''), 10) || 0),
            ...Object.keys(uMap).map((k) => parseInt(k, 10) || 0)
        );
        const floorCount = Math.max(profile.floorCount || 0, maxFloorFromSheets, fRows.length);

        const floors = [];
        for (let i = 0; i < floorCount; i++) {
            const fi = i + 1;
            const fr = fRows.find((r) => {
                const n = parseInt(toStr(excelPickRowField(r, ['رقم الطابق', 'Floor #'])).replace(/[^\d]/g, ''), 10);
                return n === fi;
            }) || {};
            const fname = toStr(excelPickRowField(fr, ['اسم الطابق', 'Floor name'])) || (i === 0 ? 'الطابق الأرضي' : `الطابق ${fi}`);
            const typesStr = toStr(excelPickRowField(fr, ['أنواع الوحدات', 'Unit types']));
            const selectedTypes = typesStr
                ? typesStr.split(/[,،]/).map((x) => toStr(x).trim()).filter(Boolean)
                : ['Flat'];
            const unitLines = uMap[String(fi)] || uMap[fi] || [];
            const unitsDetailed = unitLines.map((ur) => ({
                number: toStr(excelPickRowField(ur, ['رقم الوحدة', 'Unit no'])),
                type: toStr(excelPickRowField(ur, ['نوع الوحدة', 'Unit type'])) || selectedTypes[0] || 'Flat',
                monthlyRent: formatRentAmountForInput(excelPickRowField(ur, ['الإيجار الشهري', 'Monthly rent', 'Rent'])),
                electricity: toStr(excelPickRowField(ur, ['كهرباء الوحدة', 'Unit electricity'])),
                water: toStr(excelPickRowField(ur, ['ماء الوحدة', 'Unit water']))
            })).filter((x) => x.number);
            const uc = parseInt(toStr(excelPickRowField(fr, ['عدد الوحدات', 'Unit count'])), 10);
            floors.push(
                normalizeFloorData(
                    {
                        name: fname,
                        selectedTypes: selectedTypes.length ? selectedTypes : ['Flat'],
                        unitCount: !Number.isNaN(uc) && uc ? uc : unitsDetailed.length,
                        units: unitsDetailed.map((x) => x.number),
                        unitsDetailed
                    },
                    i
                )
            );
        }
        profile.floors = floors;
        profile.floorCount = floors.length;
        const tdName = toStr(excelPickRowField(mainRow, ['سند الملكية', 'Title deed']));
        const svName = toStr(excelPickRowField(mainRow, ['الرسم المساحي', 'Survey sketch']));
        if (tdName && (!profile.titleDeedAttachment || !normalizeBuildingAttachment(profile.titleDeedAttachment).dataUrl)) {
            profile.titleDeedAttachment = { name: tdName, type: '', dataUrl: '' };
        }
        if (svName && (!profile.surveySketchAttachment || !normalizeBuildingAttachment(profile.surveySketchAttachment).dataUrl)) {
            profile.surveySketchAttachment = { name: svName, type: '', dataUrl: '' };
        }
        return { profile, recordKey: rk, displayName: makeBuildingLabel(profile) || name };
    }

    function importBuildingStructuresFromJsonSheet(rows) {
        rows.forEach((row) => {
            const json = toStr(row.ProfileJSON || row.profileJson || excelPickRowField(row, ['ProfileJSON', 'Profile JSON']));
            if (!json) return;
            let profile;
            try {
                profile = JSON.parse(json);
            } catch (e) {
                return;
            }
            profile.floors = Array.isArray(profile.floors) ? profile.floors.map((f, i) => normalizeFloorData(f, i)) : [];
            const name = makeBuildingLabel(profile) || toStr(row.BuildingKey || row.buildingKey || excelPickRowField(row, ['مفتاح السجل', 'Record key']));
            if (!name) return;
            profile.name = profile.name || name;
            const oldKey = toStr(row.BuildingKey || row.buildingKey);
            if (oldKey && oldKey !== name && buildingProfiles[oldKey]) delete buildingProfiles[oldKey];
            buildingProfiles[name] = profile;
            if (!buildingsList.includes(name)) buildingsList.push(name);
            const ownersStr = excelPickRowField(row, ['ملاك مرتبطون', 'Linked owners']);
            if (ownersStr) applyExcelLinkedOwnersForBuilding(name, parseExcelOwnerList(ownersStr));
        });
    }

    function exportBuildingStructuresExcel() {
        if (!assertPermissionOrAlert('import_export', 'لا تملك صلاحية تصدير البيانات.', 'No permission to export data.')) return;
        if (typeof XLSX === 'undefined') {
            alert('⚠️ مكتبة Excel غير متاحة حالياً.\nExcel library is not available.');
            return;
        }
        loadDashboardAux();
        const wb = XLSX.utils.book_new();
        const instructions = [
            {
                'خطوة / Step': '1',
                'وصف عربي / Arabic': 'استخدم ورقة Buildings_Main لحقول العقار الرئيسية (أسماء الأعمدة ثنائية اللغة).',
                'Description English': 'Use Buildings_Main for main property fields (bilingual headers).'
            },
            {
                'خطوة / Step': '2',
                'وصف عربي / Arabic': 'ورقة Floors: طابق واحد لكل سطر مع رقم الطابق واسمه وأنواع الوحدات.',
                'Description English': 'Floors: one row per floor with floor #, name, unit types.'
            },
            {
                'خطوة / Step': '3',
                'وصف عربي / Arabic': 'ورقة FloorUnits: كل وحدة تفصيلية في سطر (رقم الوحدة، النوع، عدادات).',
                'Description English': 'FloorUnits: one row per unit (no., type, meters).'
            },
            {
                'خطوة / Step': '4',
                'وصف عربي / Arabic': 'المرفقات: يُصدَر اسم الملف فقط؛ أعد رفع الملفات من شاشة تعديل العقار بعد الاستيراد.',
                'Description English': 'Attachments: file names only; re-upload from the property editor after import.'
            },
            {
                'خطوة / Step': '5',
                'وصف عربي / Arabic': 'ورقة BuildingProfiles تحتوي JSON كاملاً للنسخ الاحتياطي المتقدم.',
                'Description English': 'BuildingProfiles sheet holds full JSON for advanced backup.'
            }
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(instructions), 'Instructions');

        const keys = Object.keys(buildingProfiles).sort((a, b) => a.localeCompare(b, 'ar'));
        const mainRows = keys.map((k) => buildingProfileToExcelMainRow(k, buildingProfiles[k]));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mainRows.length ? mainRows : [buildingProfileToExcelMainRow('', getEmptyBuildingProfile())]), 'Buildings_Main');

        const floorRows = keys.flatMap((k) => flattenFloorsSheetRows(k, buildingProfiles[k]));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(floorRows.length ? floorRows : [{ 'مفتاح السجل / Record key': '', 'رقم الطابق / Floor # (1…n)': '', 'اسم الطابق / Floor name': '', 'عدد الوحدات / Unit count': '', 'أنواع الوحدات (مفصولة بفاصلة) / Unit types (comma)': '' }]), 'Floors');

        const unitRows = keys.flatMap((k) => flattenFloorUnitsSheetRows(k, buildingProfiles[k]));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(unitRows.length ? unitRows : [{ 'مفتاح السجل / Record key': '', 'رقم الطابق / Floor # (1…n)': '', 'رقم الوحدة / Unit no.': '', 'نوع الوحدة / Unit type': '', 'عداد كهرباء الوحدة / Unit electricity ID': '', 'عداد ماء الوحدة / Unit water ID': '' }]), 'FloorUnits');

        const names = [...new Set([...buildingsList, ...Object.keys(buildingProfiles)])].sort((a, b) => a.localeCompare(b, 'ar'));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(names.map((n) => ({ 'اسم المبنى / Building name': n }))), 'BuildingsList');

        const profRows = keys.map((key) => ({
            'مفتاح السجل / Record key': key,
            ProfileJSON: JSON.stringify(sanitizeBuildingProfileForExport(buildingProfiles[key]))
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(profRows), 'BuildingProfiles');

        XLSX.writeFile(wb, `BHD_Building_Structures_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    function importBuildingStructuresExcel(file) {
        if (!assertPermissionOrAlert('import_export', 'لا تملك صلاحية استيراد البيانات.', 'No permission to import data.')) return;
        if (typeof XLSX === 'undefined') {
            alert('⚠️ مكتبة Excel غير متاحة حالياً.\nExcel library is not available.');
            return;
        }
        readWorkbook(file).then((wb) => {
            loadDashboardAux();
            const mainWs = wb.Sheets['Buildings_Main'];
            const listWs = wb.Sheets['BuildingsList'];
            if (listWs) {
                XLSX.utils.sheet_to_json(listWs, { defval: '' }).forEach((r) => {
                    const n = toStr(r['اسم المبنى / Building name'] || r.BuildingName || r.Name || r.building);
                    if (n && !buildingsList.includes(n)) buildingsList.push(n);
                });
            }

            const floorRowsByKey = {};
            const floWs = wb.Sheets['Floors'];
            if (floWs) {
                XLSX.utils.sheet_to_json(floWs, { defval: '' }).forEach((r) => {
                    const k = toStr(excelPickRowField(r, ['مفتاح السجل', 'Record key']));
                    if (!k) return;
                    if (!floorRowsByKey[k]) floorRowsByKey[k] = [];
                    floorRowsByKey[k].push(r);
                });
            }

            const unitRowsByKeyFloor = {};
            const uWs = wb.Sheets['FloorUnits'];
            if (uWs) {
                XLSX.utils.sheet_to_json(uWs, { defval: '' }).forEach((r) => {
                    const k = toStr(excelPickRowField(r, ['مفتاح السجل', 'Record key']));
                    const fn = parseInt(toStr(excelPickRowField(r, ['رقم الطابق', 'Floor #'])).replace(/[^\d]/g, ''), 10) || 1;
                    if (!k) return;
                    if (!unitRowsByKeyFloor[k]) unitRowsByKeyFloor[k] = {};
                    const key = String(fn);
                    if (!unitRowsByKeyFloor[k][key]) unitRowsByKeyFloor[k][key] = [];
                    unitRowsByKeyFloor[k][key].push(r);
                });
            }

            if (mainWs) {
                const mainRows = XLSX.utils.sheet_to_json(mainWs, { defval: '' });
                const dataRows = mainRows.filter((row) => {
                    const rk = toStr(excelPickRowField(row, ['مفتاح السجل', 'Record key']));
                    const nm = toStr(excelPickRowField(row, ['اسم العقار', 'Property name']));
                    return rk || nm;
                });
                if (dataRows.length) {
                    dataRows.forEach((mainRow) => {
                        const { profile, recordKey, displayName } = buildingProfileFromExcelSheets(mainRow, floorRowsByKey, unitRowsByKeyFloor);
                        const finalName = displayName || recordKey;
                        if (!finalName) return;
                        buildingProfiles[finalName] = profile;
                        if (!buildingsList.includes(finalName)) buildingsList.push(finalName);
                        const ownStr = toStr(excelPickRowField(mainRow, ['ملاك مرتبطون', 'Linked owners']));
                        if (ownStr) applyExcelLinkedOwnersForBuilding(finalName, parseExcelOwnerList(ownStr));
                    });
                    syncManagedUnitsFromProfiles();
                    persistReferenceData(true);
                    alert('✅ تم استيراد العقارات من الأوراق التفصيلية.\nProperties imported from flat sheets.');
                    return;
                }
            }

            const jsonWs = wb.Sheets['BuildingProfiles'];
            if (!jsonWs) {
                alert('❌ يلزم ورقة Buildings_Main أو BuildingProfiles.\nBuildings_Main or BuildingProfiles sheet is required.');
                return;
            }
            const rows = XLSX.utils.sheet_to_json(jsonWs, { defval: '' });
            if (!rows.length) {
                alert('❌ ورقة BuildingProfiles فارغة.\nBuildingProfiles sheet is empty.');
                return;
            }
            importBuildingStructuresFromJsonSheet(rows);
            syncManagedUnitsFromProfiles();
            persistReferenceData(true);
            alert('✅ تم استيراد بنية المباني من JSON.\nBuilding profiles imported from JSON.');
        }).catch((err) => {
            console.error(err);
            alert('❌ فشل قراءة ملف البنية.\nFailed to read structure file.');
        });
    }

    function triggerBuildingStructureImport() {
        const input = document.getElementById('buildingStructureExcelInput');
        if (input) input.click();
    }

