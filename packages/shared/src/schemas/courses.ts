import { z } from 'zod';
import { isAllowedVideoUrl } from '../video';
import { paginationSchema } from './common';

const categoryEnum = z.enum(['DESIGN', 'DEVELOPMENT', 'DATA_SCIENCE', 'MARKETING']);
const levelEnum = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);
const statusEnum = z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED']);
/** Query flags arrive as text: "true" or "1" mean yes. */
const flag = z.preprocess((v) => v === true || v === 'true' || v === '1', z.boolean()).default(false);

// ---------- Course details (HLD 6: title 3+, description 10+ for submit, fixed category and level) ----------
const title = z
  .string()
  .trim()
  .min(3, 'Enter a course title (3 or more characters).')
  .max(150, 'Keep the title under 150 characters.');
const description = z.string().trim().max(5000, 'Keep the description under 5000 characters.');

export const courseCreateSchema = z.object({
  title,
  category: categoryEnum,
  level: levelEnum,
  description: description.default(''),
});
export const courseUpdateSchema = z
  .object({
    title: title.optional(),
    category: categoryEnum.optional(),
    level: levelEnum.optional(),
    description: description.optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: 'Nothing to change.' });

// ---------- Lessons (design: title 3+, a video link, duration 1+ minute; HLD 7: YouTube or Vimeo only) ----------
const videoUrl = z.string().trim().refine(isAllowedVideoUrl, 'Use an https link from YouTube or Vimeo.');
const durationMin = z.coerce
  .number()
  .int('Enter whole minutes.')
  .min(1, 'Enter the duration in minutes.')
  .max(600, 'Keep a lesson under 600 minutes.');
const lessonTitle = z.string().trim().min(3, 'Enter a lesson title (3 or more characters).').max(150);

export const lessonCreateSchema = z.object({ title: lessonTitle, videoUrl, durationMin });
export const lessonUpdateSchema = z
  .object({
    title: lessonTitle.optional(),
    videoUrl: videoUrl.optional(),
    durationMin: durationMin.optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: 'Nothing to change.' });
export const lessonOrderSchema = z.object({
  lessonIds: z.array(z.number().int().positive()).min(1, 'Send the lessons in their new order.'),
});
export const confirmQuerySchema = z.object({ confirm: flag });

// ---------- Assignment (design: title 3+, instructions, two to-do items, optional due date) ----------
const todo = z.string().trim().min(1, 'Add both to-do items.').max(200);
export const assignmentSchema = z.object({
  title: z.string().trim().min(3, 'Enter an assignment title (3 or more characters).').max(150),
  instructions: z.string().trim().min(1, 'Write the instructions.').max(5000),
  todoItems: z.tuple([todo, todo]),
  dueDate: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-11-30.'), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v ? v : null)),
});

// ---------- Quiz (HLD 6: the instructor writes every question; 4 different options, 1 correct) ----------
const option = z.string().trim().min(1, 'Fill in all four options.').max(300);
export const quizQuestionSchema = z
  .object({
    text: z.string().trim().min(3, 'Write the question (3 or more characters).').max(1000),
    options: z.tuple([option, option, option, option]),
    correctIndex: z.number().int().min(0).max(3, 'Choose the correct answer.'),
  })
  .refine((q) => new Set(q.options.map((o) => o.toLowerCase())).size === 4, {
    message: 'The four options must be different.',
    path: ['options'],
  });
/** The count is checked on the server against the quiz's questionCount (copied from settings). */
export const quizSaveSchema = z.object({
  title: z.string().trim().max(150).optional(),
  questions: z.array(quizQuestionSchema).min(1, 'Write the questions.').max(50),
});
export const dryRunQuerySchema = z.object({ dryRun: flag });

// ---------- Admin actions ----------
export const rejectSchema = z.object({
  reason: z.string().trim().min(5, 'Write a reason of at least 5 characters.'),
});
export const assignInstructorSchema = z.object({ instructorId: z.number().int().positive() });

// ---------- Lists ----------
/** Admin course list (GET /courses/admin). Pending courses come first. */
export const courseAdminQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: statusEnum.optional(),
  category: categoryEnum.optional(),
  instructorId: z.coerce.number().int().positive().optional(),
});
/** The instructor's own courses (GET /courses/mine). */
export const courseMineQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: statusEnum.optional(),
  category: categoryEnum.optional(),
});
/** Published courses (GET /courses): public catalog and the instructor's Browse tab. */
export const courseCatalogQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  category: categoryEnum.optional(),
  level: levelEnum.optional(),
  instructorId: z.coerce.number().int().positive().optional(),
});

export type CourseCreateInput = z.infer<typeof courseCreateSchema>;
export type CourseUpdateInput = z.infer<typeof courseUpdateSchema>;
export type LessonCreateInput = z.infer<typeof lessonCreateSchema>;
export type LessonUpdateInput = z.infer<typeof lessonUpdateSchema>;
export type LessonOrderInput = z.infer<typeof lessonOrderSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type AssignmentForm = z.input<typeof assignmentSchema>;
export type QuizQuestionInput = z.infer<typeof quizQuestionSchema>;
export type QuizSaveInput = z.infer<typeof quizSaveSchema>;
export type CourseAdminQuery = z.infer<typeof courseAdminQuerySchema>;
export type CourseMineQuery = z.infer<typeof courseMineQuerySchema>;
export type CourseCatalogQuery = z.infer<typeof courseCatalogQuerySchema>;
export type RejectInput = z.infer<typeof rejectSchema>;
export type AssignInstructorInput = z.infer<typeof assignInstructorSchema>;
