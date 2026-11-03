import { Router } from 'express';
import { z } from 'zod';
import {
  addStudentsSchema,
  courseStudentsQuerySchema,
  idParamSchema,
  myCoursesQuerySchema,
  studentsProgressQuerySchema,
} from '@learnhub/shared';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import { enrollmentsController as c } from './enrollments.controller';

const instructor = [authenticate, requireRole('INSTRUCTOR')];
const id = validate(idParamSchema, 'params');
const idAndStudent = validate(
  z.object({
    id: z.coerce.number().int().positive(),
    studentId: z.coerce.number().int().positive(),
  }),
  'params',
);

// /api/courses/:id/students and /api/courses/:id/enroll (LLD 3, enrollments).
export const enrollmentsRoutes = Router();
enrollmentsRoutes.get(
  '/:id/students',
  authenticate,
  requireRole('INSTRUCTOR', 'ADMIN'),
  id,
  validate(courseStudentsQuerySchema, 'query'),
  c.students,
);
enrollmentsRoutes.post('/:id/students', ...instructor, id, validate(addStudentsSchema), c.add);
enrollmentsRoutes.get(
  '/:id/students/:studentId',
  authenticate,
  requireRole('INSTRUCTOR', 'ADMIN'),
  idAndStudent,
  c.studentDetail,
);
enrollmentsRoutes.delete('/:id/students/:studentId', ...instructor, idAndStudent, c.remove);
enrollmentsRoutes.post('/:id/enroll', authenticate, requireRole('STUDENT'), id, c.enroll);

// /api/enrollments/mine
export const myEnrollmentsRoutes = Router();
myEnrollmentsRoutes.get('/mine', authenticate, requireRole('STUDENT'), validate(myCoursesQuerySchema, 'query'), c.mine);

// /api/students/progress (instructor, design iStud)
export const studentsProgressRoutes = Router();
studentsProgressRoutes.get('/progress', ...instructor, validate(studentsProgressQuerySchema, 'query'), c.progress);
