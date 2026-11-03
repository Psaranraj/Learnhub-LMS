import type { HeartbeatInput } from '@learnhub/shared';
import { cleanFileName, storage } from '../../lib/storage';
import { ConflictError, ForbiddenError, NotFoundError } from '../../utils/errors';
import { prisma } from '../../utils/prisma';
import {
  assignmentState,
  creditFor,
  isLate,
  quizState,
  reachesUnlock,
  topicOpen,
  watchPercent,
  type AttemptRow,
} from './learning.rules';

/**
 * Everything one student sees of one course: each topic's lock, watch percent and quiz state (LLD 1, derived values).
 * Shared by the learning workspace, My courses and the quiz list, so they cannot disagree.
 */
export async function studentCourseState(studentId: number, courseId: number) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      status: true,
      category: true,
      level: true,
      instructor: { select: { id: true, name: true } },
      lessons: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          position: true,
          title: true,
          durationMin: true,
          videoUrl: true,
          materialName: true,
          materialPath: true,
          quiz: {
            select: { id: true, title: true, version: true, questionCount: true, passMark: true },
          },
        },
      },
      enrollments: { where: { studentId }, select: { id: true, source: true, createdAt: true } },
      certificates: {
        where: { studentId },
        select: { id: true, certificateNo: true, issuedAt: true },
      },
      assignment: {
        select: {
          id: true,
          title: true,
          instructions: true,
          todoItems: true,
          dueDate: true,
          submissions: {
            where: { studentId },
            select: {
              id: true,
              status: true,
              fileName: true,
              checks: true,
              grade: true,
              feedback: true,
              submittedAt: true,
              gradedAt: true,
            },
          },
        },
      },
    },
  });
  if (!course || course.status !== 'PUBLISHED') throw new NotFoundError('Course not found.');
  if (course.enrollments.length === 0) throw new ForbiddenError('Enroll in this course to open its lessons.');

  const lessonIds = course.lessons.map((l) => l.id);
  const quizIds = course.lessons.flatMap((l) => (l.quiz ? [l.quiz.id] : []));
  const [progress, attempts] = await Promise.all([
    prisma.lessonProgress.findMany({ where: { studentId, lessonId: { in: lessonIds } } }),
    prisma.quizAttempt.findMany({
      where: { studentId, quizId: { in: quizIds } },
      select: {
        id: true,
        quizId: true,
        quizVersion: true,
        attemptNo: true,
        status: true,
        score: true,
        passed: true,
      },
    }),
  ]);
  const progressOf = new Map(progress.map((p) => [p.lessonId, p]));

  let previousReached = false;
  const lessons = course.lessons.map((l, i) => {
    const p = progressOf.get(l.id);
    const watched = p?.watchedSeconds ?? 0;
    const reached = !!p?.reachedAt || reachesUnlock(watched, l.durationMin);
    const open = topicOpen(i, previousReached);
    previousReached = reached;
    const mine: AttemptRow[] = attempts.filter((a) => a.quizId === l.quiz?.id);
    const q = quizState(l.quiz, reached, mine);
    return {
      id: l.id,
      position: l.position,
      title: l.title,
      durationMin: l.durationMin,
      open,
      reached,
      watchedPercent: watchPercent(watched, l.durationMin),
      note: p?.note ?? '',
      videoUrl: open ? l.videoUrl : null,
      materialName: open ? l.materialName : null,
      hasMaterialFile: !!l.materialPath,
      quiz: l.quiz && {
        id: l.quiz.id,
        title: l.quiz.title,
        questionCount: l.quiz.questionCount,
        passMark: l.quiz.passMark,
        state: q.state,
        attemptId: q.attempt?.id ?? null,
        // Marks show only after release (HLD 6).
        score: q.attempt && q.attempt.status === 'RELEASED' ? q.attempt.score : null,
      },
    };
  });
  const passed = lessons.filter((l) => l.quiz?.state === 'passed').length;
  const a = course.assignment;
  const sub = a?.submissions[0] ?? null;
  const allPassed = lessons.length > 0 && lessons.every((l) => !l.quiz || l.quiz.state === 'passed');
  return {
    course: {
      id: course.id,
      title: course.title,
      category: course.category,
      level: course.level,
      instructor: course.instructor,
    },
    enrollment: course.enrollments[0],
    certificate: course.certificates[0] ?? null,
    lessons,
    progress: {
      passed,
      total: lessons.length,
      percent: lessons.length ? Math.round((passed / lessons.length) * 100) : 0,
    },
    assignment: a && {
      id: a.id,
      title: a.title,
      instructions: a.instructions,
      todoItems: a.todoItems as string[],
      dueDate: a.dueDate,
      state: assignmentState(true, allPassed, sub),
      submission: sub && {
        id: sub.id,
        status: sub.status,
        fileName: sub.fileName,
        checks: sub.checks as boolean[],
        submittedAt: sub.submittedAt,
        gradedAt: sub.gradedAt,
        grade: sub.grade,
        feedback: sub.feedback,
        late: isLate(a.dueDate, sub.submittedAt),
      },
    },
  };
}

/** The lesson, if it belongs to a published course the student is enrolled in and its topic is open. */
async function openLesson(studentId: number, lessonId: number) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, courseId: true, durationMin: true, materialPath: true, materialName: true },
  });
  if (!lesson) throw new NotFoundError('Lesson not found.');
  const state = await studentCourseState(studentId, lesson.courseId);
  const l = state.lessons.find((x) => x.id === lessonId)!;
  if (!l.open) throw new ConflictError('Watch at least 70% of the previous video to unlock this topic.');
  return { lesson, state, view: l };
}

export const learningService = {
  courseState: studentCourseState,
  openLesson,

  /** Credits real watch time (HLD 6). reachedAt is set once, the first time 70% is reached, and never taken back. */
  async heartbeat(studentId: number, lessonId: number, input: HeartbeatInput) {
    const { lesson } = await openLesson(studentId, lessonId);
    const now = new Date();
    const current = await prisma.lessonProgress.findUnique({
      where: { studentId_lessonId: { studentId, lessonId } },
    });
    const credit = creditFor(input.watchedSec, current?.lastReportAt ?? null, now);
    const cap = lesson.durationMin * 60;
    const watched = Math.min(cap, Math.round((current?.watchedSeconds ?? 0) + credit));
    const justReached = !current?.reachedAt && reachesUnlock(watched, lesson.durationMin);
    const row = await prisma.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId, lessonId } },
      update: {
        watchedSeconds: watched,
        lastReportAt: now,
        ...(justReached ? { reachedAt: now } : {}),
      },
      create: {
        studentId,
        lessonId,
        watchedSeconds: watched,
        lastReportAt: now,
        ...(justReached ? { reachedAt: now } : {}),
      },
    });
    return {
      watchedPercent: watchPercent(row.watchedSeconds, lesson.durationMin),
      reached: !!row.reachedAt,
      justReached,
    };
  },

  async saveNote(studentId: number, lessonId: number, note: string) {
    await openLesson(studentId, lessonId);
    await prisma.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId, lessonId } },
      update: { note },
      create: { studentId, lessonId, note },
    });
    return { ok: true };
  },

  /** The material of an open topic. */
  async material(studentId: number, lessonId: number) {
    const { lesson } = await openLesson(studentId, lessonId);
    if (!lesson.materialPath) throw new NotFoundError('This lesson has no material.');
    return {
      bytes: await storage.read(lesson.materialPath),
      name: cleanFileName(lesson.materialName ?? 'material.pdf'),
    };
  },
};
