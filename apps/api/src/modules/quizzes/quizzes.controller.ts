import type { Request, Response } from 'express';
import type { AttemptInput, MyQuizzesQuery, PendingAttemptsQuery, QuizSaveInput } from '@learnhub/shared';
import { paramsOf, queryOf } from '../../middleware/validate';
import { quizzesService } from './quizzes.service';
import { quizReview } from './quizzes.review';
import { studentQuizzes } from './quizzes.student';

export const quizzesController = {
  async get(req: Request, res: Response) {
    res.json(await quizzesService.get(req.user!.id, paramsOf(res).id));
  },
  async save(req: Request, res: Response) {
    res.json(
      await quizzesService.save(
        req.user!.id,
        paramsOf(res).id,
        req.body as QuizSaveInput,
        queryOf<{ dryRun: boolean }>(res).dryRun,
      ),
    );
  },
  // ----- student -----
  async mine(req: Request, res: Response) {
    res.json(await studentQuizzes.mine(req.user!.id, queryOf<MyQuizzesQuery>(res)));
  },
  async questions(req: Request, res: Response) {
    res.json(await studentQuizzes.questions(req.user!.id, paramsOf(res).id));
  },
  async submit(req: Request, res: Response) {
    res
      .status(201)
      .json(await studentQuizzes.submit(req.user!.id, paramsOf(res).id, (req.body as AttemptInput).answers));
  },
  /** The student sees their own attempt; the course's instructor sees it with the correct answers (LLD 3). */
  async attempt(req: Request, res: Response) {
    const id = paramsOf(res).id;
    res.json({
      attempt:
        req.user!.role === 'STUDENT'
          ? await studentQuizzes.attempt(req.user!.id, id)
          : await quizReview.view(req.user!.id, id),
    });
  },

  // ----- instructor review -----
  async pending(req: Request, res: Response) {
    res.json(await quizReview.pending(req.user!.id, queryOf<PendingAttemptsQuery>(res)));
  },
  async release(req: Request, res: Response) {
    res.json(await quizReview.release(req.user!.id, paramsOf(res).id));
  },
};
