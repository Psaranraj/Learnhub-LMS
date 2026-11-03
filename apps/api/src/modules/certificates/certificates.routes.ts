import { Router } from 'express';
import { certificateProgressQuerySchema, certificatesQuerySchema, idParamSchema } from '@learnhub/shared';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import { certificatesController as c } from './certificates.controller';

const id = validate(idParamSchema, 'params');

// /api/certificates (LLD 3). Issued automatically on the first submission; there is no approval (v3, decision 18).
export const certificatesRoutes = Router();
certificatesRoutes.get('/mine', authenticate, requireRole('STUDENT'), c.mine);
certificatesRoutes.get(
  '/progress',
  authenticate,
  requireRole('INSTRUCTOR'),
  validate(certificateProgressQuerySchema, 'query'),
  c.progress,
);
certificatesRoutes.get(
  '/',
  authenticate,
  requireRole('INSTRUCTOR', 'ADMIN'),
  validate(certificatesQuerySchema, 'query'),
  c.list,
);
certificatesRoutes.get('/:id', authenticate, id, c.view);
certificatesRoutes.get('/:id/download', authenticate, id, c.download);
certificatesRoutes.get('/:id/logo', authenticate, id, c.logo);
