import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@learnhub/shared';
import { ForbiddenError } from '../utils/errors';

/** Use after authenticate. Ownership checks (own course, own student) live in the services. */
export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) throw new ForbiddenError();
    next();
  };
