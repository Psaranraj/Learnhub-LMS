import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import { uploadOne } from '../../middleware/upload';
import { settingsController as c } from './settings.controller';

// /api/settings (LLD 3). The logo is PNG, JPG or WebP up to 1 MB, checked by its header.
export const settingsRoutes = Router();
settingsRoutes.get('/logo', c.logo);
settingsRoutes.get('/', authenticate, requireRole('ADMIN'), c.get);
settingsRoutes.patch('/', authenticate, requireRole('ADMIN'), uploadOne('image', 1, true), c.update);
