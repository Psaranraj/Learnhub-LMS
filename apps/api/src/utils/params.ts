import type { Request } from 'express';
import { ValidationError } from './errors';

export function intParam(req: Request, key: string): number {
  const n = Number(req.params[key]);
  if (!Number.isInteger(n) || n < 1) throw new ValidationError('Invalid id.');
  return n;
}
