import { z } from 'zod';
import { paginationSchema } from './common';

/** Instructor adds students free of cost (source ASSIGNED). */
export const addStudentsSchema = z.object({
  studentIds: z
    .array(z.number().int().positive())
    .min(1, 'Select at least one student.')
    .max(100, 'Add up to 100 students at a time.'),
});

/** Students of one course (GET /courses/:id/students). */
export const courseStudentsQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  progress: z.enum(['new', 'prog', 'done']).optional(),
});

/** Student search for the Add students dialog (GET /students). */
export const studentSearchQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  excludeCourseId: z.coerce.number().int().positive().optional(),
  /** Only students who are not in any of the caller's courses (design filter "Not in any of my courses"). */
  onlyNew: z.preprocess((v) => v === true || v === 'true' || v === '1', z.boolean()).default(false),
});

export type AddStudentsInput = z.infer<typeof addStudentsSchema>;
export type CourseStudentsQuery = z.infer<typeof courseStudentsQuerySchema>;
export type StudentSearchQuery = z.infer<typeof studentSearchQuerySchema>;
