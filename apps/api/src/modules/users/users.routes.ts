import { Router } from 'express';
import {
  createUserSchema,
  idParamSchema,
  paginationSchema,
  resetPasswordSchema,
  studentSearchQuerySchema,
  updateUserSchema,
  userListQuerySchema,
  userStatusSchema,
} from '@learnhub/shared';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import { usersController as c } from './users.controller';

export const usersRoutes = Router();
const admin = [authenticate, requireRole('ADMIN')];

// Static routes before /:id (LLD 3).
usersRoutes.get('/reset-requests', ...admin, validate(paginationSchema, 'query'), c.resetRequests);
usersRoutes.get('/', ...admin, validate(userListQuerySchema, 'query'), c.list);
usersRoutes.post('/', ...admin, validate(createUserSchema), c.create);
usersRoutes.patch('/:id/status', ...admin, validate(idParamSchema, 'params'), validate(userStatusSchema), c.setStatus);
usersRoutes.post(
  '/:id/reset-password',
  ...admin,
  validate(idParamSchema, 'params'),
  validate(resetPasswordSchema),
  c.resetPassword,
);
usersRoutes.patch('/:id', ...admin, validate(idParamSchema, 'params'), validate(updateUserSchema), c.update);

// /api/students: active students for the instructor's Add students dialog (LLD 3, users).
export const studentsRoutes = Router();
studentsRoutes.get(
  '/',
  authenticate,
  requireRole('INSTRUCTOR'),
  validate(studentSearchQuerySchema, 'query'),
  c.searchStudents,
);
