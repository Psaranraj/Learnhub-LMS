import type { Request, Response } from 'express';
import { reportsService } from './reports.service';

export const reportsController = {
  async dashboard(req: Request, res: Response) {
    res.json(await reportsService.dashboard(req.user!));
  },
  async alerts(req: Request, res: Response) {
    res.json(await reportsService.alerts(req.user!));
  },
  async overview(_req: Request, res: Response) {
    res.json(await reportsService.overview());
  },
  async instructors(_req: Request, res: Response) {
    res.json(await reportsService.instructors());
  },
  async enrollments(_req: Request, res: Response) {
    res.json(await reportsService.enrollments());
  },
};
