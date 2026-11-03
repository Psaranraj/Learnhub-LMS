import { Router } from 'express';
import {
  assignInstructorSchema,
  assignmentSchema,
  confirmQuerySchema,
  courseAdminQuerySchema,
  courseCatalogQuerySchema,
  courseCreateSchema,
  courseMineQuerySchema,
  courseUpdateSchema,
  idParamSchema,
  lessonCreateSchema,
  lessonOrderSchema,
  lessonUpdateSchema,
  rejectSchema,
} from '@learnhub/shared';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import { uploadOne } from '../../middleware/upload';
import { validate } from '../../middleware/validate';
import { coursesController as c } from './courses.controller';

const admin = [authenticate, requireRole('ADMIN')];
const instructor = [authenticate, requireRole('INSTRUCTOR')];
const id = validate(idParamSchema, 'params');

// /api/courses. Static routes come before /:id (LLD 3).
export const coursesRoutes = Router();
coursesRoutes.get('/', validate(courseCatalogQuerySchema, 'query'), c.catalog);
coursesRoutes.get('/admin', ...admin, validate(courseAdminQuerySchema, 'query'), c.listAdmin);
coursesRoutes.get('/mine', ...instructor, validate(courseMineQuerySchema, 'query'), c.mine);
coursesRoutes.post('/', ...instructor, validate(courseCreateSchema), c.create);
coursesRoutes.get('/:id', id, c.publicView);
coursesRoutes.get('/:id/manage', authenticate, requireRole('INSTRUCTOR', 'ADMIN'), id, c.manage);
coursesRoutes.patch('/:id', ...instructor, id, validate(courseUpdateSchema), c.update);
coursesRoutes.post('/:id/lessons', ...instructor, id, validate(lessonCreateSchema), c.addLesson);
coursesRoutes.put('/:id/lessons/order', ...instructor, id, validate(lessonOrderSchema), c.reorderLessons);
coursesRoutes.put('/:id/assignment', ...instructor, id, validate(assignmentSchema), c.saveAssignment);
coursesRoutes.delete('/:id/assignment', ...instructor, id, c.deleteAssignment);
coursesRoutes.post('/:id/submit', ...instructor, id, c.submit);
coursesRoutes.post('/:id/approve', ...admin, id, c.approve);
coursesRoutes.post('/:id/reject', ...admin, id, validate(rejectSchema), c.reject);
coursesRoutes.post('/:id/unpublish', ...admin, id, c.unpublish);
coursesRoutes.patch('/:id/instructor', ...admin, id, validate(assignInstructorSchema), c.changeInstructor);

// /api/lessons. Lessons and their material belong to the courses module (HLD 3). The quiz routes are in the quizzes module.
export const lessonsRoutes = Router();
lessonsRoutes.patch('/:id', ...instructor, id, validate(lessonUpdateSchema), c.updateLesson);
lessonsRoutes.delete('/:id', ...instructor, id, validate(confirmQuerySchema, 'query'), c.deleteLesson);
lessonsRoutes.post('/:id/material', ...instructor, id, uploadOne('pdf', 20), c.uploadMaterial);
lessonsRoutes.delete('/:id/material', ...instructor, id, c.deleteMaterial);
lessonsRoutes.get('/:id/material/file', authenticate, requireRole('INSTRUCTOR', 'ADMIN'), id, c.material);
