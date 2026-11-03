import { z } from 'zod';

const line = (label: string) =>
  z.string().trim().min(1, `Enter the ${label}.`).max(120, `The ${label} must be 120 characters or fewer.`);
const whole = (msg: string) => z.coerce.number({ invalid_type_error: msg }).int(msg);

/**
 * Admin Settings (design adSet): certificate wording and the quiz defaults for new quizzes. Sent as multipart (the logo
 * is optional), so the numbers arrive as text and are coerced. The pass mark cannot be more than the question count.
 */
export const settingsSchema = z
  .object({
    orgName: line('organisation name'),
    certTitle: line('certificate title'),
    certIntro: line('opening line'),
    certMid: line('completion line'),
    certFooter: line('footer line'),
    quizQuestionCount: whole('Questions per quiz must be a whole number from 1 to 50.')
      .min(1, 'Questions per quiz must be 1 to 50.')
      .max(50, 'Questions per quiz must be 1 to 50.'),
    quizPassMark: whole('The pass mark must be a whole number.').min(1, 'The pass mark must be at least 1.'),
    /** "true" removes the uploaded logo and goes back to the default LearnHub mark. */
    removeLogo: z.preprocess((v) => v === 'true' || v === true, z.boolean()).default(false),
  })
  .refine((s) => s.quizPassMark <= s.quizQuestionCount, {
    path: ['quizPassMark'],
    message: 'The pass mark must be between 1 and the number of questions.',
  });

export type SettingsInput = z.infer<typeof settingsSchema>;
