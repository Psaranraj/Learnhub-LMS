import type { MyQuizzesQuery } from '@learnhub/shared';
import { ConflictError, ForbiddenError, NotFoundError } from '../../utils/errors';
import { toPage } from '../../utils/pagination';
import { prisma } from '../../utils/prisma';
import { canAttempt, type QuizState } from '../learning/learning.rules';
import { learningService } from '../learning/learning.service';
import { checkAnswerCount } from './quizzes.rules';

// Student side of the quizzes module (LLD 3; LLD 6, flow 4 steps 1, 2 and 5). Review and release are in quizzes.review.ts.

const why: Partial<Record<QuizState, string>> = {
  locked: 'Watch at least 70% of the topic video to receive this quiz.',
  review: 'Your last attempt is waiting for your instructor to review it.',
  passed: 'You have already passed this quiz.',
  none: 'This topic has no quiz.',
};

async function attemptable(studentId: number, lessonId: number) {
  const { state, view } = await learningService.openLesson(studentId, lessonId);
  const s = view.quiz?.state ?? 'none';
  if (!view.quiz || !canAttempt(view.open, s)) throw new ConflictError(why[s] ?? 'This quiz is not available.');
  return { state, view, quizId: view.quiz.id };
}

export const studentQuizzes = {
  /** Every topic quiz of the student's published courses, with its state and released score. */
  async mine(studentId: number, q: MyQuizzesQuery) {
    const rows = await prisma.enrollment.findMany({
      where: {
        studentId,
        course: { status: 'PUBLISHED' },
        ...(q.courseId ? { courseId: q.courseId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: { courseId: true },
    });
    const states = await Promise.all(rows.map((r) => learningService.courseState(studentId, r.courseId)));
    const items = states
      .flatMap((s) =>
        s.lessons.flatMap((l) =>
          l.quiz
            ? [
                {
                  course: { id: s.course.id, title: s.course.title },
                  lesson: { id: l.id, position: l.position, title: l.title, open: l.open },
                  quiz: l.quiz,
                },
              ]
            : [],
        ),
      )
      .filter((x) => !q.state || x.quiz.state === q.state);
    const start = (q.page - 1) * q.pageSize;
    return toPage(items.slice(start, start + q.pageSize), items.length, q.page, q.pageSize);
  },

  /** Questions of the current version without the correct answers (HLD 7, "Quiz secrecy"). */
  async questions(studentId: number, lessonId: number) {
    const { state, view, quizId } = await attemptable(studentId, lessonId);
    const quiz = await prisma.quiz.findUniqueOrThrow({
      where: { id: quizId },
      select: { title: true, version: true, questionCount: true, passMark: true },
    });
    const questions = await prisma.quizQuestion.findMany({
      where: { quizId, version: quiz.version },
      orderBy: { position: 'asc' },
      select: { text: true, options: true },
    });
    return {
      course: { id: state.course.id, title: state.course.title },
      lesson: {
        id: view.id,
        position: view.position,
        title: view.title,
        total: state.lessons.length,
      },
      quiz: { title: quiz.title, questionCount: quiz.questionCount, passMark: quiz.passMark },
      questions: questions.map((x) => ({ text: x.text, options: x.options as string[] })),
    };
  },

  /** Saves the answers as SUBMITTED. No marks come back until the instructor releases them. */
  async submit(studentId: number, lessonId: number, answers: (number | null)[]) {
    const { quizId } = await attemptable(studentId, lessonId);
    const quiz = await prisma.quiz.findUniqueOrThrow({
      where: { id: quizId },
      select: { version: true, questionCount: true },
    });
    checkAnswerCount(answers.length, quiz.questionCount);
    const attempt = await prisma.$transaction(async (tx) => {
      // Checked again inside the transaction, so a double click cannot leave two attempts waiting.
      const waiting = await tx.quizAttempt.count({
        where: { quizId, studentId, quizVersion: quiz.version, status: 'SUBMITTED' },
      });
      if (waiting) throw new ConflictError(why.review!);
      const last = await tx.quizAttempt.findFirst({
        where: { quizId, studentId },
        orderBy: { attemptNo: 'desc' },
        select: { attemptNo: true },
      });
      return tx.quizAttempt.create({
        data: {
          quizId,
          studentId,
          quizVersion: quiz.version,
          attemptNo: (last?.attemptNo ?? 0) + 1,
          answers,
          status: 'SUBMITTED',
        },
        select: { id: true },
      });
    });
    return { attemptId: attempt.id };
  },

  /** The student's own attempt. Score, pass and correct answers only after release. */
  async attempt(studentId: number, attemptId: number) {
    const a = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        studentId: true,
        quizVersion: true,
        attemptNo: true,
        status: true,
        score: true,
        passed: true,
        answers: true,
        submittedAt: true,
        releasedAt: true,
        quiz: {
          select: {
            id: true,
            title: true,
            questionCount: true,
            passMark: true,
            lesson: {
              select: {
                id: true,
                position: true,
                title: true,
                course: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
    });
    if (!a) throw new NotFoundError('Attempt not found.');
    if (a.studentId !== studentId) throw new ForbiddenError();
    const released = a.status === 'RELEASED';
    const questions = await prisma.quizQuestion.findMany({
      where: { quizId: a.quiz.id, version: a.quizVersion },
      orderBy: { position: 'asc' },
      select: { text: true, options: true, correctIndex: true },
    });
    return {
      id: a.id,
      attemptNo: a.attemptNo,
      status: a.status,
      submittedAt: a.submittedAt,
      releasedAt: a.releasedAt,
      score: released ? a.score : null,
      passed: released ? a.passed : null,
      answers: a.answers as (number | null)[],
      course: a.quiz.lesson.course,
      lesson: {
        id: a.quiz.lesson.id,
        position: a.quiz.lesson.position,
        title: a.quiz.lesson.title,
      },
      quiz: { title: a.quiz.title, questionCount: a.quiz.questionCount, passMark: a.quiz.passMark },
      questions: questions.map((x) => ({
        text: x.text,
        options: x.options as string[],
        correctIndex: released ? x.correctIndex : null,
      })),
    };
  },
};
