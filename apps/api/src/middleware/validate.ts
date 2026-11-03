import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { ValidationError } from '../utils/errors';
import { toFieldErrors } from '../utils/fieldErrors';

type Source = 'body' | 'query' | 'params';

/**
 * Checks the body, query or params with a shared schema (HLD 7: all of them are validated).
 * The first message is the headline and every field is listed. The parsed body replaces req.body;
 * parsed query and params are placed in res.locals.query and res.locals.params (Express 5 makes req.query read-only).
 */
export const validate =
  (schema: ZodTypeAny, source: Source = 'body') =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const issues = result.error.issues as { path: (string | number)[]; message: string }[];
      throw new ValidationError(issues[0]?.message ?? 'Invalid input.', toFieldErrors(issues));
    }
    if (source === 'body') req.body = result.data;
    else res.locals[source] = result.data;
    next();
  };

export const paramsOf = <T = { id: number }>(res: Response) => res.locals.params as T;
export const queryOf = <T>(res: Response) => res.locals.query as T;
