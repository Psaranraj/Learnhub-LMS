import type { Request, Response } from 'express';
import type {
  AssignInstructorInput,
  AssignmentInput,
  CourseAdminQuery,
  CourseCatalogQuery,
  CourseCreateInput,
  CourseMineQuery,
  CourseUpdateInput,
  LessonCreateInput,
  LessonOrderInput,
  LessonUpdateInput,
  RejectInput,
} from '@learnhub/shared';
import { paramsOf, queryOf } from '../../middleware/validate';
import { coursesService } from './courses.service';

const id = (res: Response) => paramsOf(res).id;

export const coursesController = {
  // ----- admin -----
  async listAdmin(_req: Request, res: Response) {
    res.json(await coursesService.listAdmin(queryOf<CourseAdminQuery>(res)));
  },
  async manage(req: Request, res: Response) {
    res.json({ course: await coursesService.manage(req.user!, id(res)) });
  },
  async approve(req: Request, res: Response) {
    res.json(await coursesService.approve(req.user!.id, id(res)));
  },
  async reject(req: Request, res: Response) {
    res.json(await coursesService.reject(req.user!.id, id(res), (req.body as RejectInput).reason));
  },
  async unpublish(req: Request, res: Response) {
    res.json(await coursesService.unpublish(req.user!.id, id(res)));
  },
  async changeInstructor(req: Request, res: Response) {
    res.json(await coursesService.changeInstructor(req.user!.id, id(res), req.body as AssignInstructorInput));
  },

  // ----- public -----
  async catalog(_req: Request, res: Response) {
    res.json(await coursesService.catalog(queryOf<CourseCatalogQuery>(res)));
  },
  async publicView(_req: Request, res: Response) {
    res.json({ course: await coursesService.publicView(id(res)) });
  },

  // ----- instructor -----
  async mine(req: Request, res: Response) {
    res.json(await coursesService.mine(req.user!.id, queryOf<CourseMineQuery>(res)));
  },
  async create(req: Request, res: Response) {
    res.status(201).json(await coursesService.create(req.user!.id, req.body as CourseCreateInput));
  },
  async update(req: Request, res: Response) {
    res.json(await coursesService.update(req.user!.id, id(res), req.body as CourseUpdateInput));
  },
  async addLesson(req: Request, res: Response) {
    res.status(201).json(await coursesService.addLesson(req.user!.id, id(res), req.body as LessonCreateInput));
  },
  async reorderLessons(req: Request, res: Response) {
    res.json(await coursesService.reorderLessons(req.user!.id, id(res), (req.body as LessonOrderInput).lessonIds));
  },
  async saveAssignment(req: Request, res: Response) {
    res.json(await coursesService.saveAssignment(req.user!.id, id(res), req.body as AssignmentInput));
  },
  async deleteAssignment(req: Request, res: Response) {
    res.json(await coursesService.deleteAssignment(req.user!.id, id(res)));
  },
  async submit(req: Request, res: Response) {
    res.json(await coursesService.submit(req.user!.id, id(res)));
  },

  // ----- lessons (/lessons/:id) -----
  async updateLesson(req: Request, res: Response) {
    res.json(await coursesService.updateLesson(req.user!.id, id(res), req.body as LessonUpdateInput));
  },
  async deleteLesson(req: Request, res: Response) {
    res.json(await coursesService.deleteLesson(req.user!.id, id(res), queryOf<{ confirm: boolean }>(res).confirm));
  },
  async uploadMaterial(req: Request, res: Response) {
    res.json(await coursesService.uploadMaterial(req.user!.id, id(res), req.file!));
  },
  async deleteMaterial(req: Request, res: Response) {
    res.json(await coursesService.deleteMaterial(req.user!.id, id(res)));
  },
  async material(req: Request, res: Response) {
    const file = await coursesService.materialFile(req.user!, id(res));
    res.type('application/pdf').setHeader('Content-Disposition', `inline; filename="${file.name.replace(/"/g, '')}"`);
    res.send(file.bytes);
  },
};
