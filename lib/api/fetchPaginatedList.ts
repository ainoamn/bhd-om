/** جلب قائمة paginated من API مع قراءة headers العد */
export type PaginatedListQuery = {
  limit?: number;
  offset?: number;
  propertyId?: number | string;
  status?: string;
  type?: string;
  cache?: RequestCache;
};

export async function fetchPaginatedList<T>(
  path: string,
  opts?: PaginatedListQuery
): Promise<{ items: T[]; total: number; limit: number; offset: number }> {
  const qs = new URLSearchParams();
  if (opts?.limit != null) qs.set('limit', String(opts.limit));
  if (opts?.offset != null) qs.set('offset', String(opts.offset));
  if (opts?.propertyId != null && opts.propertyId !== '' && opts.propertyId !== 'all') {
    qs.set('propertyId', String(opts.propertyId));
  }
  if (opts?.status) qs.set('status', opts.status);
  if (opts?.type && opts.type !== 'ALL') qs.set('type', opts.type);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const res = await fetch(`${path}${suffix}`, {
    credentials: 'include',
    cache: opts?.cache ?? 'no-store',
  });
  const items = res.ok ? ((await res.json()) as T[]) : [];
  const list = Array.isArray(items) ? items : [];
  const total = Number(res.headers.get('X-Total-Count') || list.length);
  const limit = Number(res.headers.get('X-Limit') || list.length);
  const offset = Number(res.headers.get('X-Offset') || 0);
  return { items: list, total, limit, offset };
}
