export function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(query.limit, 10) || 100));
  return { page, limit, skip: (page - 1) * limit };
}

export function paginationMeta(total, page, limit) {
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  return { page, limit, total, totalPages };
}
