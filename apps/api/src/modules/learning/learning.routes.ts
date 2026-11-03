import { Router } from 'express';
import { heartbeatSchema, idParamSchema, noteSchema } from '@learnhub/shared';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import { learningController as c } from './learning.controller';

const student = [authenticate, requireRole('STUDENT')];
const id = validate(idParamSchema, 'params');

// /api/learning (LLD 3, learning). Every call checks enrollment, a published course and an open topic.
export const learningRoutes = Router();
learningRoutes.get('/courses/:id', ...student, id, c.course);
learningRoutes.post('/lessons/:id/heartbeat', ...student, id, validate(heartbeatSchema), c.heartbeat);
learningRoutes.put('/lessons/:id/note', ...student, id, validate(noteSchema), c.note);
learningRoutes.get('/lessons/:id/material', ...student, id, c.material);
