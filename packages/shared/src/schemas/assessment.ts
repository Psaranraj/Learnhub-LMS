import { z } from 'zod';
import { paginationSchema } from './common';

/** One answer per question, in order: the chosen option (0 to 3) or null when left blank (counts as wrong). */
export const attemptSchema = z.object({
  answers: z.array(z.number().int().min(0).max(3).nullable()).min(1).max(50),
});

/** The student's quiz list (GET /quizzes/mine). */
export const myQuizzesQuerySchema = paginationSchema.extend({
  courseId: z.coerce.number().int().positive().optional(),
  state: z.enum(['open', 'review', 'passed', 'failed', 'locked']).optional(),
});

export type AttemptInput = z.infer<typeof attemptSchema>;
export type MyQuizzesQuery = z.infer<typeof myQuizzesQuerySchema>;

/** Instructor: attempts waiting for review in own courses (GET /quiz-attempts). */
export const pendingAttemptsQuerySchema = paginationSchema.extend({
  courseId: z.coerce.number().int().positive().optional(),
});

/** Grade a submission: whole number 0 to 100 and feedback of 3+ characters (HLD 6, "Assignment"). */
export const gradeSchema = z.object({
  grade: z
    .number({ invalid_type_error: 'Enter a whole-number grade from 0 to 100.' })
    .int('Enter a whole-number grade from 0 to 100.')
    .min(0, 'Enter a whole-number grade from 0 to 100.')
    .max(100, 'Enter a whole-number grade from 0 to 100.'),
  feedback: z.string().trim().min(3, 'Add feedback for the student (3 or more characters).').max(3000),
});

/**
 * The two to-do ticks sent with the PDF. Multipart sends text, so "true"/"false" (or a JSON array) are accepted.
 * The design does not block submitting when a tick is missing; the ticks are kept for the instructor.
 */
export const submissionFormSchema = z.object({
  checks: z
    .preprocess(
      (v) => {
        if (typeof v !== 'string') return v;
        try {
          return JSON.parse(v);
        } catch {
          return v;
        }
      },
      z.tuple([z.boolean(), z.boolean()]),
    )
    .default([false, false]),
});

/** Instructor: submissions in own courses (GET /submissions). */
export const submissionsQuerySchema = paginationSchema.extend({
  courseId: z.coerce.number().int().positive().optional(),
  status: z.enum(['SUBMITTED', 'GRADED']).optional(),
});

/** Instructor: students and progress across own published courses (GET /students/progress). */
export const studentsProgressQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  courseId: z.coerce.number().int().positive().optional(),
  state: z.enum(['review', 'prog', 'done']).optional(),
});

/** Issued certificates for instructors (own courses) and admins (all): search, course and a date range. */
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-10-27.');
export const certificatesQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  courseId: z.coerce.number().int().positive().optional(),
  from: day.optional(),
  to: day.optional(),
});

/** Instructor: certificate progress per student and course (GET /certificates/progress). */
export const certificateProgressQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  courseId: z.coerce.number().int().positive().optional(),
  state: z.enum(['issued', 'progress', 'new']).optional(),
});

export type GradeInput = z.infer<typeof gradeSchema>;
export type PendingAttemptsQuery = z.infer<typeof pendingAttemptsQuerySchema>;
export type SubmissionsQuery = z.infer<typeof submissionsQuerySchema>;
export type StudentsProgressQuery = z.infer<typeof studentsProgressQuerySchema>;
export type CertificatesQuery = z.infer<typeof certificatesQuerySchema>;
export type CertificateProgressQuery = z.infer<typeof certificateProgressQuerySchema>;
