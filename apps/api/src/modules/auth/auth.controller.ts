import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { COOKIE_NAME, SESSION_HOURS } from '../../middleware/authenticate';
import { authService } from './auth.service';
import type { ChangePasswordInput, ForgotPasswordInput, LoginInput, RegisterInput } from './auth.schema';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  maxAge: SESSION_HOURS * 60 * 60 * 1000,
};

export const authController = {
  async register(req: Request, res: Response) {
    const { token, user } = await authService.register(req.body as RegisterInput);
    res.cookie(COOKIE_NAME, token, cookieOptions).status(201).json({ user });
  },
  async login(req: Request, res: Response) {
    const { token, user } = await authService.login(req.body as LoginInput);
    res.cookie(COOKIE_NAME, token, cookieOptions).json({ user });
  },
  logout(_req: Request, res: Response) {
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: undefined }).json({ ok: true });
  },
  async me(req: Request, res: Response) {
    res.json({ user: await authService.me(req.user!.id) });
  },
  async forgotPassword(req: Request, res: Response) {
    await authService.forgotPassword((req.body as ForgotPasswordInput).email);
    res.json({ ok: true });
  },
  async changePassword(req: Request, res: Response) {
    const { token } = await authService.changePassword(req.user!.id, req.body as ChangePasswordInput);
    res.cookie(COOKIE_NAME, token, cookieOptions).json({ ok: true });
  },
};
