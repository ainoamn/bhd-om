import { getCachedCatalogApps } from '@/lib/bhd/catalog';
import { DEFAULT_IDENTITY_ISSUER } from '@/lib/identity/issuer';
import { captureWindowToken, windowFetchHeaders } from '@/lib/identity/window-session';

export function pageOrigin() {
  return typeof window === 'undefined' ? '' : window.location.origin.replace(/\/$/, '');
}

export function isIdentityOrigin(origin = pageOrigin()) {
  return origin.replace(/\/$/, '') === DEFAULT_IDENTITY_ISSUER.replace(/\/$/, '');
}

export function identityApiUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (isIdentityOrigin()) return normalized;
  return `${DEFAULT_IDENTITY_ISSUER}${normalized}`;
}

export async function identityFetch(path: string, init?: RequestInit) {
  const headers = windowFetchHeaders(init?.headers);
  const response = await fetch(identityApiUrl(path), {
    cache: 'no-store',
    credentials: 'include',
    ...init,
    headers,
  });
  const clone = response.clone();
  void clone
    .json()
    .then((data: { token?: unknown } | null) => {
      if (data && typeof data.token === 'string') captureWindowToken(data.token);
    })
    .catch(() => undefined);
  return response;
}

export function currentReturnPath() {
  if (typeof window === 'undefined') return '/';
  return `${window.location.pathname}${window.location.search || ""}` || '/';
}

export function cacheBustReturnPath(returnTo = '/') {
  const path = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
  try {
    const url = new URL(path, 'https://bhd.local');
    url.searchParams.delete('_bhd');
    url.searchParams.set('_bhd', String(Date.now()));
    return `${url.pathname}${url.search}`;
  } catch {
    return path.includes('?') ? `${path}&_bhd=${Date.now()}` : `${path}?_bhd=${Date.now()}`;
  }
}

export function productStartPath(returnTo = '/') {
  const path = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
  return `/api/auth/bhd/start?returnTo=${encodeURIComponent(path)}`;
}

const REBIND_LOCK = 'bhd_rebind_lock';

export function isAccountRebindPending() {
  if (typeof sessionStorage === 'undefined') return false;
  const raw = sessionStorage.getItem(REBIND_LOCK);
  if (!raw) return false;
  const at = Number(raw);
  return Number.isFinite(at) && Date.now() - at < 15_000;
}

function markIsolationPending() {
  sessionStorage.setItem(REBIND_LOCK, String(Date.now()));
}

function rebindWithWindowToken(token: string, returnTo: string) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = '/api/auth/bhd/rebind';
  form.style.display = 'none';
  const tokenInput = document.createElement('input');
  tokenInput.name = 'token';
  tokenInput.value = token;
  const returnInput = document.createElement('input');
  returnInput.name = 'returnTo';
  returnInput.value = cacheBustReturnPath(returnTo);
  form.append(tokenInput, returnInput);
  document.body.appendChild(form);
  form.submit();
}

export async function applyAccountIsolation(token?: string | null, options?: { force?: boolean }) {
  if (typeof window === 'undefined') return;
  if (!options?.force && isAccountRebindPending()) return;
  const here = currentReturnPath();
  markIsolationPending();
  const windowToken = token || sessionStorage.getItem('bhd_window_token') || '';
  if (windowToken) {
    rebindWithWindowToken(windowToken, here);
    return;
  }
  window.location.assign(`/api/auth/bhd/logout?continue=${encodeURIComponent(productStartPath(cacheBustReturnPath(here)))}`);
}

export function clearAccountRebindLock() {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(REBIND_LOCK);
}

export function allowedBhdUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url.origin)) return '';
    if (getCachedCatalogApps().some((app) => app.origin.replace(/\/$/, '') === url.origin)) return url.toString();
    if (url.hostname === 'bhd-om.com' || url.hostname.endsWith('.bhd-om.com')) return url.toString();
  } catch {
    /* ignore */
  }
  return '';
}
