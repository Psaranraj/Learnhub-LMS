import type { Request, Response } from 'express';
import type { ActivityQuery } from '@learnhub/shared';
import { queryOf } from '../../middleware/validate';
import { activityService } from './activity.service';

export const activityController = {
  async list(_req: Request, res: Response) {
    res.json(await activityService.list(queryOf<ActivityQuery>(res)));
  },
};
