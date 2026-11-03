import type { Request, Response } from 'express';
import type { GradeInput, SubmissionsQuery } from '@learnhub/shared';
import { submissionFormSchema } from '@learnhub/shared';
import { paramsOf, queryOf } from '../../middleware/validate';
import { ValidationError } from '../../utils/errors';
import { assignmentsService } from './assignments.service';

export const assignmentsController = {
  async mine(req: Request, res: Response) {
    res.json(await assignmentsService.mine(req.user!.id));
  },
  /** Multipart: the PDF in "file" and the ticks in "checks". The text fields are checked after the upload is parsed. */
  async submit(req: Request, res: Response) {
    const form = submissionFormSchema.safeParse(req.body ?? {});
    if (!form.success)
      throw new ValidationError('Send the two to-do ticks as true or false.', {
        checks: 'Invalid ticks.',
      });
    res.json(await assignmentsService.submit(req.user!.id, paramsOf(res).id, req.file!, form.data.checks));
  },
  async list(req: Request, res: Response) {
    res.json(await assignmentsService.list(req.user!.id, queryOf<SubmissionsQuery>(res)));
  },
  async view(req: Request, res: Response) {
    res.json({ submission: await assignmentsService.view(req.user!.id, paramsOf(res).id) });
  },
  async file(req: Request, res: Response) {
    const f = await assignmentsService.file(req.user!, paramsOf(res).id);
    res.type('application/pdf').setHeader('Content-Disposition', `attachment; filename="${f.name}"`);
    res.send(f.bytes);
  },
  async grade(req: Request, res: Response) {
    res.json({
      submission: await assignmentsService.grade(req.user!.id, paramsOf(res).id, req.body as GradeInput),
    });
  },
};
