import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/** State-changing routes accept only JSON or file uploads (HLD 7). A cross-site HTML form cannot send either. */
export function requireJsonOrMultipart(req: Request, _res: Response, next: NextFunction) {
  if (SAFE.has(req.method)) return next();
  const hasBody = Number(req.headers['content-length'] ?? 0) > 0 || req.headers['transfer-encoding'] !== undefined;
  if (!hasBody) return next();
  const type = String(req.headers['content-type'] ?? '').toLowerCase();
  if (type.startsWith('application/json') || type.startsWith('multipart/form-data')) return next();
  throw new AppError(400, 'UNSUPPORTED_CONTENT_TYPE', 'Send JSON or a file upload.');
}
