import { Router } from 'express';
import { activityQuerySchema } from '@learnhub/shared';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import { activityController } from './activity.controller';

export const activityRoutes = Router();
activityRoutes.get(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validate(activityQuerySchema, 'query'),
  activityController.list,
);
