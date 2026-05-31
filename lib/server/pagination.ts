/** معاملات pagination موحّدة لمسارات API */
export type PaginationParams = {
  limit: number;
  offset: number;
  unlimited: boolean;
};

export function parsePaginationParams(
  url: URL,
  opts?: { defaultLimit?: number; maxLimit?: number }
): PaginationParams {
  const defaultLimit = opts?.defaultLimit ?? 0;
  const maxLimit = opts?.maxLimit ?? 500;
  const limitParam = Number(url.searchParams.get('limit') ?? defaultLimit);
  const offsetParam = Number(url.searchParams.get('offset') || 0);
  const limit =
    Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.floor(limitParam), maxLimit) : 0;
  const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? Math.floor(offsetParam) : 0;
  return { limit, offset, unlimited: limit <= 0 };
}

export function paginationResponseHeaders(
  total: number,
  params: PaginationParams
): Record<string, string> {
  return {
    'X-Total-Count': String(total),
    'X-Limit': String(params.unlimited ? total : params.limit),
    'X-Offset': String(params.offset),
  };
}

export function slicePage<T>(items: T[], params: PaginationParams): T[] {
  if (params.unlimited) return items;
  return items.slice(params.offset, params.offset + params.limit);
}
