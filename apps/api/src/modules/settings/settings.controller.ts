import type { Request, Response } from 'express';
import { settingsSchema } from '@learnhub/shared';
import { ValidationError } from '../../utils/errors';
import { toFieldErrors } from '../../utils/fieldErrors';
import { settingsService } from './settings.service';

export const settingsController = {
  async get(_req: Request, res: Response) {
    res.json({ settings: await settingsService.get() });
  },
  /** Multipart: the text fields are checked here, after the optional logo is parsed. */
  async update(req: Request, res: Response) {
    const parsed = settingsSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const issues = parsed.error.issues as { path: (string | number)[]; message: string }[];
      throw new ValidationError(issues[0]?.message ?? 'Invalid input.', toFieldErrors(issues));
    }
    res.json({ settings: await settingsService.update(req.user!.id, parsed.data, req.file) });
  },
  async logo(_req: Request, res: Response) {
    const file = await settingsService.logo();
    res.type(file.type).setHeader('Cache-Control', 'no-cache');
    // The web app runs on another port, so the image must be allowed across origins (Helmet blocks it by default).
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(file.bytes);
  },
};
