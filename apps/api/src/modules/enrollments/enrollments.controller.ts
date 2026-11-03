import type { Request, Response } from 'express';
import type { AddStudentsInput, CourseStudentsQuery, MyCoursesQuery, StudentsProgressQuery } from '@learnhub/shared';
import { paramsOf, queryOf } from '../../middleware/validate';
import { progressService } from './enrollments.progress';
import { enrollmentsService } from './enrollments.service';

export const enrollmentsController = {
  async students(req: Request, res: Response) {
    res.json(await enrollmentsService.students(req.user!, paramsOf(res).id, queryOf<CourseStudentsQuery>(res)));
  },
  async add(req: Request, res: Response) {
    res.json(await enrollmentsService.add(req.user!.id, paramsOf(res).id, (req.body as AddStudentsInput).studentIds));
  },
  async remove(req: Request, res: Response) {
    const p = paramsOf<{ id: number; studentId: number }>(res);
    res.json(await enrollmentsService.remove(req.user!.id, p.id, p.studentId));
  },
  async enroll(req: Request, res: Response) {
    res.status(201).json(await enrollmentsService.enroll(req.user!.id, paramsOf(res).id));
  },
  async mine(req: Request, res: Response) {
    res.json(await enrollmentsService.mine(req.user!.id, queryOf<MyCoursesQuery>(res)));
  },
  async progress(req: Request, res: Response) {
    res.json(await progressService.list(req.user!.id, queryOf<StudentsProgressQuery>(res)));
  },
  async studentDetail(req: Request, res: Response) {
    const p = paramsOf<{ id: number; studentId: number }>(res);
    res.json(await progressService.detail(req.user!, p.id, p.studentId));
  },
};
