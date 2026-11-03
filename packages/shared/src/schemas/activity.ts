import { z } from 'zod';
import { paginationSchema } from './common';

// Admin activity log (GET /activity).
export const activityQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  type: z.enum(['APPROVAL', 'USERS', 'SETTINGS']).optional(),
});
export type ActivityQuery = z.infer<typeof activityQuerySchema>;
