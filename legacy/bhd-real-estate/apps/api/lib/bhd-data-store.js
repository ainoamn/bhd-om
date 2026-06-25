/**
 * BhdDataStore — مرجع للطبقة الموحّدة (التنفيذ الفعلي داخل bhd-real-estate.html).
 * الواجهة لا تُظهر backend؛ الدوال: probeBhdCloudApi, bhdCloudHydrateProperties, scheduleBhdCloudPropertiesPush.
 */
export function createBhdDataStore(options = {}) {
  const cloudBase = options.cloudApiBase || '/api/v1';
  let cloudToken = options.accessToken || null;

  function backend() {
    if (typeof window !== 'undefined' && window.bhdDesktop) return 'desktop';
    if (cloudToken || (typeof window !== 'undefined' && window.__bhdCloudApiActive)) return 'cloud';
    if (options.kvServerAvailable) return 'kv-server';
    return 'browser';
  }

  return {
    getBackend: () => backend(),
    setCloudSession({ accessToken }) {
      cloudToken = accessToken || null;
    },
    async getJson(key) {
      const b = backend();
      if (b === 'browser') {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      }
      if (b === 'desktop' && window.bhdDesktop?.kvGet) {
        const raw = await window.bhdDesktop.kvGet(key);
        return raw ? JSON.parse(raw) : null;
      }
      if (b === 'cloud') {
        throw new Error('Use domain REST endpoints via bhdCloudFetch in HTML layer');
      }
      const r = await fetch(`/api/kv/${encodeURIComponent(key)}`, { cache: 'no-store' });
      if (!r.ok) return null;
      return r.json();
    },
    async setJson(key, value) {
      const payload = JSON.stringify(value);
      const b = backend();
      if (b === 'browser') {
        localStorage.setItem(key, payload);
        return;
      }
      if (b === 'desktop' && window.bhdDesktop?.kvPut) {
        await window.bhdDesktop.kvPut(key, payload);
        return;
      }
      if (b === 'kv-server') {
        await fetch(`/api/kv/${encodeURIComponent(key)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
      }
    },
  };
}
