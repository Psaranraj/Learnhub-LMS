import type { Request, Response } from 'express';
import type { HeartbeatInput, NoteInput } from '@learnhub/shared';
import { paramsOf } from '../../middleware/validate';
import { learningService } from './learning.service';

export const learningController = {
  async course(req: Request, res: Response) {
    res.json(await learningService.courseState(req.user!.id, paramsOf(res).id));
  },
  async heartbeat(req: Request, res: Response) {
    res.json(await learningService.heartbeat(req.user!.id, paramsOf(res).id, req.body as HeartbeatInput));
  },
  async note(req: Request, res: Response) {
    res.json(await learningService.saveNote(req.user!.id, paramsOf(res).id, (req.body as NoteInput).note));
  },
  async material(req: Request, res: Response) {
    const file = await learningService.material(req.user!.id, paramsOf(res).id);
    res
      .type('application/pdf')
      .setHeader('Content-Disposition', `attachment; filename="${file.name.replace(/"/g, '')}"`);
    res.send(file.bytes);
  },
};
