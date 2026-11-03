import type { QuizSaveInput } from '@learnhub/shared';
import { PASS_MARK, QUESTIONS_PER_QUIZ } from '@learnhub/shared';
import { NotFoundError } from '../../utils/errors';
import { prisma } from '../../utils/prisma';
import { checkEditable, checkOwner } from '../courses/courses.rules';
import { affectedByEdit, checkQuestionCount, needsNewVersion, type AttemptFact } from './quizzes.rules';

async function loadOwnedLesson(userId: number, lessonId: number) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      course: { select: { status: true, instructorId: true } },
      quiz: { include: { questions: { orderBy: { position: 'asc' } } } },
    },
  });
  if (!lesson) throw new NotFoundError('Lesson not found.');
  checkOwner(lesson.course.instructorId, userId);
  return lesson;
}

/** New quizzes copy the count and pass mark from platform settings (HLD 8, decision 4). */
async function defaults() {
  const s = await prisma.settings.findUnique({
    where: { id: 1 },
    select: { quizQuestionCount: true, quizPassMark: true },
  });
  return {
    questionCount: s?.quizQuestionCount ?? QUESTIONS_PER_QUIZ,
    passMark: s?.quizPassMark ?? PASS_MARK,
  };
}

const attemptFacts = (quizId: number): Promise<AttemptFact[]> =>
  prisma.quizAttempt.findMany({
    where: { quizId },
    select: { studentId: true, quizVersion: true, attemptNo: true, status: true, passed: true },
  });

export const quizzesService = {
  /** The current questions with their correct answers, for the owner's editor. */
  async get(userId: number, lessonId: number) {
    const lesson = await loadOwnedLesson(userId, lessonId);
    const q = lesson.quiz;
    return {
      lesson: { id: lesson.id, title: lesson.title },
      defaults: await defaults(),
      quiz: q && {
        id: q.id,
        title: q.title,
        version: q.version,
        questionCount: q.questionCount,
        passMark: q.passMark,
        questions: q.questions
          .filter((x) => x.version === q.version)
          .map((x) => ({
            text: x.text,
            options: x.options as string[],
            correctIndex: x.correctIndex,
          })),
      },
    };
  },

  /**
   * Saves the questions (LLD 3, PUT /lessons/:id/quiz). With dryRun only the number of affected students comes back.
   * When attempts exist on the current version, a new version is made and waiting attempts become SUPERSEDED, in one transaction.
   */
  async save(userId: number, lessonId: number, input: QuizSaveInput, dryRun: boolean) {
    const lesson = await loadOwnedLesson(userId, lessonId);
    checkEditable(lesson.course.status);
    const quiz = lesson.quiz;
    const d = await defaults();
    checkQuestionCount(input.questions.length, quiz?.questionCount ?? d.questionCount);

    const facts = quiz ? await attemptFacts(quiz.id) : [];
    const affected = quiz ? affectedByEdit(facts, quiz.version) : 0;
    if (dryRun) return { affected };

    const title = input.title?.trim() || quiz?.title || `Quiz: ${lesson.title}`;
    const rows = (quizId: number, version: number) =>
      input.questions.map((q, i) => ({
        quizId,
        version,
        position: i + 1,
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
      }));

    const version = await prisma.$transaction(async (tx) => {
      if (!quiz) {
        const created = await tx.quiz.create({
          data: {
            lessonId,
            title,
            questionCount: d.questionCount,
            passMark: d.passMark,
            version: 1,
          },
        });
        await tx.quizQuestion.createMany({ data: rows(created.id, 1) });
        return 1;
      }
      if (needsNewVersion(facts, quiz.version)) {
        const next = quiz.version + 1;
        await tx.quiz.update({ where: { id: quiz.id }, data: { title, version: next } });
        await tx.quizQuestion.createMany({ data: rows(quiz.id, next) });
        await tx.quizAttempt.updateMany({
          where: { quizId: quiz.id, quizVersion: quiz.version, status: 'SUBMITTED' },
          data: { status: 'SUPERSEDED' },
        });
        return next;
      }
      await tx.quizQuestion.deleteMany({ where: { quizId: quiz.id, version: quiz.version } });
      await tx.quizQuestion.createMany({ data: rows(quiz.id, quiz.version) });
      await tx.quiz.update({ where: { id: quiz.id }, data: { title } });
      return quiz.version;
    });
    return { affected, version };
  },
};
