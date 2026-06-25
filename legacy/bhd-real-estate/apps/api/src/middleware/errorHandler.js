import { ApiError } from '../lib/errors.js';

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ ok: false, error: err.code, message: err.message });
  }
  if (err?.name === 'ZodError') {
    return res.status(400).json({
      ok: false,
      error: 'validation_error',
      message: 'Invalid request',
      details: err.errors,
    });
  }
  console.error(err);
  return res.status(500).json({ ok: false, error: 'internal_error', message: 'Internal server error' });
}
