import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@learnhub/shared';
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/errors';
import { prisma } from '../utils/prisma';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: number; role: Role };
    }
  }
}

/** Sessions last 12 hours and are not refreshed (HLD 7). */
export const SESSION_HOURS = 12;
export const COOKIE_NAME = 'token';

type Claims = { sub: string; tv: number };

function readClaims(req: Request): Claims {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) throw new UnauthorizedError();
  try {
    const c = jwt.verify(token, env.JWT_SECRET) as unknown as Partial<Claims>;
    if (typeof c.sub !== 'string' || typeof c.tv !== 'number') throw new Error('bad claims');
    return c as Claims;
  } catch {
    throw new UnauthorizedError();
  }
}

/**
 * Loads the user on every request. A token stops working when the account is inactive, the user is gone,
 * or tokenVersion has moved on (password change or admin reset). The role always comes from the database.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const claims = readClaims(req);
  const id = Number(claims.sub);
  if (!Number.isInteger(id)) throw new UnauthorizedError();
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, status: true, tokenVersion: true },
  });
  if (!user || user.status !== 'ACTIVE' || user.tokenVersion !== claims.tv) throw new UnauthorizedError();
  req.user = { id: user.id, role: user.role };
  next();
}
