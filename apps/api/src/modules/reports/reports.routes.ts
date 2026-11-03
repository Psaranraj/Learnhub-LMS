import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import { reportsController as c } from './reports.controller';

const admin = [authenticate, requireRole('ADMIN')];

// /api/dashboard and /api/alerts: every role gets its own content.
export const dashboardRoutes = Router();
dashboardRoutes.get('/', authenticate, c.dashboard);
export const alertsRoutes = Router();
alertsRoutes.get('/', authenticate, c.alerts);

// /api/reports (admin)
export const reportsRoutes = Router();
reportsRoutes.get('/overview', ...admin, c.overview);
reportsRoutes.get('/instructors', ...admin, c.instructors);
reportsRoutes.get('/enrollments', ...admin, c.enrollments);
