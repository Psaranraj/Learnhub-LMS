import type { PendingAttemptsQuery } from '@learnhub/shared';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import { skipTake, toPage } from '../../utils/pagination';
import { prisma } from '../../utils/prisma';
import { checkReleasable, releaseResult, scoreOf } from './quizzes.rules';

// Instructor side of quiz review (LLD 6, flow 4 steps 3 and 4).

const attemptSelect = {
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
  student: { select: { id: true, name: true, email: true } },
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
          course: { select: { id: true, title: true, instructorId: true } },
        },
      },
    },
  },
} as const;

async function loadOwned(instructorId: number, attemptId: number) {
  const a = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    select: attemptSelect,
  });
  if (!a) throw new NotFoundError('Attempt not found.');
  if (a.quiz.lesson.course.instructorId !== instructorId) throw new ForbiddenError();
  return a;
}

const questionsOf = (quizId: number, version: number) =>
  prisma.quizQuestion.findMany({
    where: { quizId, version },
    orderBy: { position: 'asc' },
    select: { text: true, options: true, correctIndex: true },
  });

export const quizReview = {
  /** Attempts waiting for review in the instructor's courses, oldest first. */
  async pending(instructorId: number, q: PendingAttemptsQuery) {
    const where = {
      status: 'SUBMITTED' as const,
      quiz: { lesson: { course: { instructorId, ...(q.courseId ? { id: q.courseId } : {}) } } },
    };
    const [rows, total] = await Promise.all([
      prisma.quizAttempt.findMany({
        where,
        orderBy: { submittedAt: 'asc' },
        select: attemptSelect,
        ...skipTake(q.page, q.pageSize),
      }),
      prisma.quizAttempt.count({ where }),
    ]);
    const items = rows.map((a) => ({
      id: a.id,
      attemptNo: a.attemptNo,
      submittedAt: a.submittedAt,
      student: a.student,
      course: { id: a.quiz.lesson.course.id, title: a.quiz.lesson.course.title },
      lesson: {
        id: a.quiz.lesson.id,
        position: a.quiz.lesson.position,
        title: a.quiz.lesson.title,
      },
    }));
    return toPage(items, total, q.page, q.pageSize);
  },

  /** The instructor always sees the correct answers and the score worked out from the answers. */
  async view(instructorId: number, attemptId: number) {
    const a = await loadOwned(instructorId, attemptId);
    const questions = await questionsOf(a.quiz.id, a.quizVersion);
    const answers = a.answers as (number | null)[];
    return {
      id: a.id,
      attemptNo: a.attemptNo,
      status: a.status,
      submittedAt: a.submittedAt,
      releasedAt: a.releasedAt,
      score: a.status === 'RELEASED' ? a.score : null,
      passed: a.status === 'RELEASED' ? a.passed : null,
      computedScore: scoreOf(
        answers,
        questions.map((x) => x.correctIndex),
      ),
      answers,
      student: a.student,
      course: { id: a.quiz.lesson.course.id, title: a.quiz.lesson.course.title },
      lesson: {
        id: a.quiz.lesson.id,
        position: a.quiz.lesson.position,
        title: a.quiz.lesson.title,
      },
      quiz: { title: a.quiz.title, questionCount: a.quiz.questionCount, passMark: a.quiz.passMark },
      questions: questions.map((x) => ({
        text: x.text,
        options: x.options as string[],
        correctIndex: x.correctIndex,
      })),
    };
  },

  /** Sets score and passed and makes the attempt RELEASED, in one transaction. 409 when superseded or already released. */
  async release(instructorId: number, attemptId: number) {
    const a = await loadOwned(instructorId, attemptId);
    checkReleasable(a.status);
    const questions = await questionsOf(a.quiz.id, a.quizVersion);
    const result = releaseResult(
      a.answers as (number | null)[],
      questions.map((x) => x.correctIndex),
      a.quiz.passMark,
    );
    await prisma.$transaction(async (tx) => {
      // Re-read inside the transaction: the quiz may have been edited (superseding this attempt) a moment ago.
      const fresh = await tx.quizAttempt.findUniqueOrThrow({
        where: { id: attemptId },
        select: { status: true },
      });
      checkReleasable(fresh.status);
      await tx.quizAttempt.update({
        where: { id: attemptId },
        data: {
          status: 'RELEASED',
          score: result.score,
          passed: result.passed,
          releasedAt: new Date(),
          releasedById: instructorId,
        },
      });
    });
    return result;
  },
};
