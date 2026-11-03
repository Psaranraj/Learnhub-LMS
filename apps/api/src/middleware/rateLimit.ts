import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { TooManyRequestsError } from '../utils/errors';

const tooMany = (message: string) => (_req: Request, _res: Response, next: NextFunction) =>
  next(new TooManyRequestsError(message));

/** One bucket per address and email, so one person cannot lock out everyone behind the same address. */
export const loginKey = (ip: string | undefined, email: unknown) =>
  `${ip ?? ''}|${typeof email === 'string' ? email.trim().toLowerCase() : ''}`;

/** Login: 10 failed tries per 15 minutes per address and email. Successful sign-ins are not counted. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => loginKey(req.ip, (req.body as { email?: unknown } | undefined)?.email),
  handler: tooMany('Too many sign-in attempts. Try again in 15 minutes.'),
});

/** Forgot password: 5 requests per hour per address. */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany('Too many requests. Try again in an hour.'),
});
