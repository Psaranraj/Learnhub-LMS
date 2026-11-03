import { Router } from 'express';
import {
  attemptSchema,
  dryRunQuerySchema,
  idParamSchema,
  myQuizzesQuerySchema,
  pendingAttemptsQuerySchema,
  quizSaveSchema,
} from '@learnhub/shared';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import { quizzesController as c } from './quizzes.controller';

const instructor = [authenticate, requireRole('INSTRUCTOR')];
const id = validate(idParamSchema, 'params');

// /api/lessons/:id/quiz... (LLD 3, quizzes).
export const quizzesRoutes = Router();
quizzesRoutes.get('/:id/quiz', ...instructor, id, c.get);
quizzesRoutes.put(
  '/:id/quiz',
  ...instructor,
  id,
  validate(dryRunQuerySchema, 'query'),
  validate(quizSaveSchema),
  c.save,
);

const student = [authenticate, requireRole('STUDENT')];
quizzesRoutes.get('/:id/quiz/questions', ...student, id, c.questions);
quizzesRoutes.post('/:id/quiz/attempts', ...student, id, validate(attemptSchema), c.submit);

// /api/quizzes/mine
export const myQuizzesRoutes = Router();
myQuizzesRoutes.get('/mine', ...student, validate(myQuizzesQuerySchema, 'query'), c.mine);

// /api/quiz-attempts: the instructor's review list, one attempt (student's own or instructor owner) and release.
export const attemptsRoutes = Router();
attemptsRoutes.get('/', ...instructor, validate(pendingAttemptsQuerySchema, 'query'), c.pending);
attemptsRoutes.get('/:id', authenticate, requireRole('STUDENT', 'INSTRUCTOR'), id, c.attempt);
attemptsRoutes.post('/:id/release', ...instructor, id, c.release);
