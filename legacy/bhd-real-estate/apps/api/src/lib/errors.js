export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function assertFound(row, message = 'Not found') {
  if (!row) throw new ApiError(404, 'not_found', message);
  return row;
}
