import type { Request, Response } from 'express';
import type {
  CreateUserInput,
  ResetPasswordInput,
  StudentSearchQuery,
  UpdateUserInput,
  UserListQuery,
  UserStatusInput,
} from '@learnhub/shared';
import { paramsOf, queryOf } from '../../middleware/validate';
import { usersService } from './users.service';

export const usersController = {
  async list(_req: Request, res: Response) {
    res.json(await usersService.list(queryOf<UserListQuery>(res)));
  },
  async create(req: Request, res: Response) {
    res.status(201).json(await usersService.create(req.user!.id, req.body as CreateUserInput));
  },
  async update(req: Request, res: Response) {
    res.json({
      user: await usersService.update(req.user!.id, paramsOf(res).id, req.body as UpdateUserInput),
    });
  },
  async setStatus(req: Request, res: Response) {
    res.json({
      user: await usersService.setStatus(req.user!.id, paramsOf(res).id, (req.body as UserStatusInput).status),
    });
  },
  async resetPassword(req: Request, res: Response) {
    res.json(
      await usersService.resetPassword(
        req.user!.id,
        paramsOf(res).id,
        (req.body as ResetPasswordInput).temporaryPassword,
      ),
    );
  },
  async resetRequests(_req: Request, res: Response) {
    const { page, pageSize } = queryOf<{ page: number; pageSize: number }>(res);
    res.json(await usersService.resetRequests(page, pageSize));
  },
  async searchStudents(req: Request, res: Response) {
    res.json(await usersService.searchStudents(req.user!.id, queryOf<StudentSearchQuery>(res)));
  },
};
