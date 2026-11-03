import type { SettingsInput } from '@learnhub/shared';
import { storage } from '../../lib/storage';
import { imageExtension } from '../../middleware/upload';
import { NotFoundError } from '../../utils/errors';
import { prisma } from '../../utils/prisma';
import { logActivity } from '../activity/activity.service';

const DEFAULTS = {
  orgName: 'LearnHub',
  certTitle: 'Certificate of completion',
  certIntro: 'This certifies that',
  certMid: 'has successfully completed',
  certFooter: 'Issued by LearnHub',
  quizQuestionCount: 10,
  quizPassMark: 8,
};

/** The single settings row (id 1). Created with the design's defaults if the seed was not run. */
const load = () => prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, ...DEFAULTS } });

const toView = (s: Awaited<ReturnType<typeof load>>) => ({
  orgName: s.orgName,
  certTitle: s.certTitle,
  certIntro: s.certIntro,
  certMid: s.certMid,
  certFooter: s.certFooter,
  quizQuestionCount: s.quizQuestionCount,
  quizPassMark: s.quizPassMark,
  hasLogo: !!s.logoPath,
  updatedAt: s.updatedAt,
});

const typeOf = (path: string) =>
  path.endsWith('.png') ? 'image/png' : path.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

export const settingsService = {
  async get() {
    return toView(await load());
  },

  /**
   * Saves the wording and quiz defaults, and the logo when one is sent (HLD 6, "Settings"). Issued certificates keep their
   * own copy of the wording and logo path, so an old logo file is kept on disk rather than deleted. Logged as SETTINGS.
   */
  async update(adminId: number, input: SettingsInput, logo?: { buffer: Buffer }) {
    const current = await load();
    const logoPath = logo
      ? await storage.save('logos', logo.buffer, imageExtension(logo.buffer))
      : input.removeLogo
        ? null
        : current.logoPath;
    const { removeLogo: _removeLogo, ...fields } = input;
    const changed = [
      (['orgName', 'certTitle', 'certIntro', 'certMid', 'certFooter'] as const).some((k) => fields[k] !== current[k]) ||
      logoPath !== current.logoPath
        ? 'certificate wording'
        : null,
      fields.quizQuestionCount !== current.quizQuestionCount || fields.quizPassMark !== current.quizPassMark
        ? 'quiz defaults'
        : null,
    ].filter(Boolean);
    const saved = await prisma.$transaction(async (tx) => {
      const s = await tx.settings.update({ where: { id: 1 }, data: { ...fields, logoPath } });
      if (changed.length)
        await logActivity(tx, {
          type: 'SETTINGS',
          text: `Updated ${changed.join(' and ')}`,
          actorId: adminId,
        });
      return s;
    });
    return toView(saved);
  },

  /** The current logo: the only public file (HLD 7), shown on the sign-in pages and certificate previews. */
  async logo() {
    const s = await load();
    if (!s.logoPath) throw new NotFoundError('No logo has been uploaded.');
    return { bytes: await storage.read(s.logoPath), type: typeOf(s.logoPath) };
  },

  typeOf,
};
