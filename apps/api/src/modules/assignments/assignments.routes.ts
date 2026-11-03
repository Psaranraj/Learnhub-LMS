import { Router } from 'express';
import { gradeSchema, idParamSchema, submissionsQuerySchema } from '@learnhub/shared';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import { uploadOne } from '../../middleware/upload';
import { validate } from '../../middleware/validate';
import { assignmentsController as c } from './assignments.controller';

const instructor = [authenticate, requireRole('INSTRUCTOR')];
const id = validate(idParamSchema, 'params');

// /api/assignments/mine
export const myAssignmentsRoutes = Router();
myAssignmentsRoutes.get('/mine', authenticate, requireRole('STUDENT'), c.mine);

// /api/courses/:id/submission (student submits or replaces the PDF, 10 MB)
export const courseSubmissionRoutes = Router();
courseSubmissionRoutes.post(
  '/:id/submission',
  authenticate,
  requireRole('STUDENT'),
  id,
  uploadOne('pdf', 10),
  c.submit,
);

// /api/submissions (instructor review and grading; the file is also open to the student who sent it)
export const submissionsRoutes = Router();
submissionsRoutes.get('/', ...instructor, validate(submissionsQuerySchema, 'query'), c.list);
submissionsRoutes.get('/:id', ...instructor, id, c.view);
submissionsRoutes.get('/:id/file', authenticate, requireRole('STUDENT', 'INSTRUCTOR'), id, c.file);
submissionsRoutes.post('/:id/grade', ...instructor, id, validate(gradeSchema), c.grade);
