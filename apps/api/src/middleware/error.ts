import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ code: 'NOT_FOUND', message: 'Route not found.' });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({
      code: err.code,
      message: err.message,
      ...(err.fieldErrors ? { fieldErrors: err.fieldErrors } : {}),
    });
    return;
  }
  // Errors raised by the JSON body parser.
  const type = (err as { type?: string } | null)?.type;
  if (type === 'entity.parse.failed') {
    res.status(400).json({ code: 'VALIDATION_ERROR', message: 'The request body is not valid JSON.' });
    return;
  }
  if (type === 'entity.too.large') {
    res.status(413).json({ code: 'FILE_TOO_LARGE', message: 'The request is too large.' });
    return;
  }
  // Anything else: log the detail, tell the client nothing about it.
  logger.error('Unhandled error', err);
  res.status(500).json({ code: 'INTERNAL', message: 'Something went wrong.' });
}
