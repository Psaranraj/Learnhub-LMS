import type { Prisma } from '@prisma/client';
import type {
  AssignInstructorInput,
  AssignmentInput,
  CourseAdminQuery,
  CourseCatalogQuery,
  CourseCreateInput,
  CourseMineQuery,
  CourseUpdateInput,
  LessonCreateInput,
  LessonUpdateInput,
} from '@learnhub/shared';
import { cleanFileName, storage } from '../../lib/storage';
import { AppError, ConflictError, ForbiddenError, NotFoundError } from '../../utils/errors';
import { skipTake, toPage } from '../../utils/pagination';
import { prisma } from '../../utils/prisma';
import { logActivity } from '../activity/activity.service';
import {
  checkApprove,
  checkEditable,
  checkNewInstructor,
  checkOrder,
  checkOwner,
  checkReject,
  checkStructure,
  checkSubmit,
  checkUnpublish,
} from './courses.rules';
import { readiness } from './readiness';

const listSelect = {
  id: true,
  title: true,
  category: true,
  level: true,
  status: true,
  updatedAt: true,
  instructor: { select: { id: true, name: true } },
  lessons: { select: { id: true, quiz: { select: { id: true } } } },
  _count: { select: { enrollments: true } },
} satisfies Prisma.CourseSelect;

async function loadForAction(id: number) {
  const course = await prisma.course.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      instructor: { select: { id: true, name: true } },
    },
  });
  if (!course) throw new NotFoundError('Course not found.');
  return course;
}

const adminCourses = {
  /** All courses, pending review first, then the most recently updated. */
  async listAdmin(q: CourseAdminQuery) {
    const base: Prisma.CourseWhereInput = {
      ...(q.q ? { OR: [{ title: { contains: q.q } }, { instructor: { name: { contains: q.q } } }] } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.category ? { category: q.category } : {}),
      ...(q.instructorId ? { instructorId: q.instructorId } : {}),
    };
    const pendingWhere: Prisma.CourseWhereInput = { AND: [base, { status: 'PENDING_REVIEW' }] };
    const otherWhere: Prisma.CourseWhereInput = {
      AND: [base, { status: { not: 'PENDING_REVIEW' } }],
    };
    const [pendingCount, otherCount] = await Promise.all([
      prisma.course.count({ where: pendingWhere }),
      prisma.course.count({ where: otherWhere }),
    ]);
    const { skip, take } = skipTake(q.page, q.pageSize);
    const rows: Prisma.CourseGetPayload<{ select: typeof listSelect }>[] = [];
    if (skip < pendingCount) {
      rows.push(
        ...(await prisma.course.findMany({
          where: pendingWhere,
          select: listSelect,
          orderBy: { updatedAt: 'desc' },
          skip,
          take: Math.min(take, pendingCount - skip),
        })),
      );
    }
    if (rows.length < take) {
      rows.push(
        ...(await prisma.course.findMany({
          where: otherWhere,
          select: listSelect,
          orderBy: { updatedAt: 'desc' },
          skip: Math.max(0, skip - pendingCount),
          take: take - rows.length,
        })),
      );
    }
    const items = rows.map(({ lessons, _count, ...c }) => ({
      ...c,
      lessonCount: lessons.length,
      quizCount: lessons.filter((l) => l.quiz).length,
      studentCount: _count.enrollments,
    }));
    return toPage(items, pendingCount + otherCount, q.page, q.pageSize);
  },

  /** Full course for the owner or an admin, any status, with the readiness checklist. */
  async manage(user: { id: number; role: string }, id: number) {
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        instructor: { select: { id: true, name: true } },
        lessons: {
          orderBy: { position: 'asc' },
          include: {
            quiz: {
              include: { questions: { orderBy: [{ version: 'asc' }, { position: 'asc' }] } },
            },
          },
        },
        assignment: true,
        _count: { select: { enrollments: true } },
      },
    });
    if (!course) throw new NotFoundError('Course not found.');
    if (user.role === 'INSTRUCTOR' && course.instructorId !== user.id) throw new ForbiddenError();

    const lessons = course.lessons.map((l) => ({
      id: l.id,
      position: l.position,
      title: l.title,
      videoUrl: l.videoUrl,
      durationMin: l.durationMin,
      materialName: l.materialName,
      quiz: l.quiz && {
        id: l.quiz.id,
        title: l.quiz.title,
        version: l.quiz.version,
        questionCount: l.quiz.questionCount,
        passMark: l.quiz.passMark,
        questions: l.quiz.questions
          .filter((q) => q.version === l.quiz!.version)
          .map((q) => ({
            position: q.position,
            text: q.text,
            options: q.options,
            correctIndex: q.correctIndex,
          })),
      },
    }));
    return {
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      level: course.level,
      status: course.status,
      rejectReason: course.rejectReason,
      instructor: course.instructor,
      studentCount: course._count.enrollments,
      lessons,
      assignment: course.assignment && {
        title: course.assignment.title,
        instructions: course.assignment.instructions,
        todoItems: course.assignment.todoItems,
        dueDate: course.assignment.dueDate,
      },
      readiness: readiness({
        title: course.title,
        description: course.description,
        category: course.category,
        level: course.level,
        lessons: course.lessons.map((l) => ({
          title: l.title,
          videoUrl: l.videoUrl,
          durationMin: l.durationMin,
          quiz: l.quiz && {
            version: l.quiz.version,
            questionCount: l.quiz.questionCount,
            questions: l.quiz.questions,
          },
        })),
        assignment: course.assignment,
      }),
    };
  },

  /** Published. Students added earlier get access because access follows the course status. */
  async approve(actorId: number, id: number) {
    const course = await loadForAction(id);
    checkApprove(course.status);
    await prisma.$transaction(async (tx) => {
      await tx.course.update({ where: { id }, data: { status: 'PUBLISHED', rejectReason: null } });
      await logActivity(tx, {
        type: 'APPROVAL',
        text: `Approved course "${course.title}"`,
        actorId,
      });
    });
    return { status: 'PUBLISHED' as const };
  },

  async reject(actorId: number, id: number, reason: string) {
    const course = await loadForAction(id);
    checkReject(course.status);
    await prisma.$transaction(async (tx) => {
      await tx.course.update({ where: { id }, data: { status: 'REJECTED', rejectReason: reason } });
      await logActivity(tx, {
        type: 'APPROVAL',
        text: `Rejected course "${course.title}": ${reason}`,
        actorId,
      });
    });
    return { status: 'REJECTED' as const };
  },

  /** Back to Draft. Enrollments and progress stay; students cannot open it until it is published again. */
  async unpublish(actorId: number, id: number) {
    const course = await loadForAction(id);
    checkUnpublish(course.status);
    await prisma.$transaction(async (tx) => {
      await tx.course.update({ where: { id }, data: { status: 'DRAFT' } });
      await logActivity(tx, {
        type: 'APPROVAL',
        text: `Unpublished course "${course.title}"`,
        actorId,
      });
    });
    return { status: 'DRAFT' as const };
  },

  async changeInstructor(actorId: number, id: number, input: AssignInstructorInput) {
    const course = await loadForAction(id);
    const next = await prisma.user.findUnique({
      where: { id: input.instructorId },
      select: { id: true, name: true, role: true, status: true },
    });
    checkNewInstructor(next);
    if (next!.id === course.instructor.id) return { instructor: course.instructor };
    await prisma.$transaction(async (tx) => {
      await tx.course.update({ where: { id }, data: { instructorId: next!.id } });
      await logActivity(tx, {
        type: 'APPROVAL',
        text: `Changed instructor of "${course.title}" from ${course.instructor.name} to ${next!.name}`,
        actorId,
      });
    });
    return { instructor: { id: next!.id, name: next!.name } };
  },
};

// ---------- Instructor: courses, lessons, material, assignment, submit ----------

const cardSelect = {
  id: true,
  title: true,
  description: true,
  category: true,
  level: true,
  status: true,
  rejectReason: true,
  updatedAt: true,
  instructor: { select: { id: true, name: true } },
  lessons: { select: { durationMin: true, quiz: { select: { id: true } } } },
  assignment: { select: { id: true } },
  _count: { select: { enrollments: true } },
} satisfies Prisma.CourseSelect;
type CardRow = Prisma.CourseGetPayload<{ select: typeof cardSelect }>;

const toCard = ({ lessons, assignment, _count, ...c }: CardRow) => ({
  ...c,
  lessonCount: lessons.length,
  quizCount: lessons.filter((l) => l.quiz).length,
  minutes: lessons.reduce((n, l) => n + l.durationMin, 0),
  hasAssignment: !!assignment,
  studentCount: _count.enrollments,
});

async function loadOwned(userId: number, id: number) {
  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, title: true, status: true, instructorId: true },
  });
  if (!course) throw new NotFoundError('Course not found.');
  checkOwner(course.instructorId, userId);
  return course;
}

async function loadOwnedLesson(userId: number, lessonId: number) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      courseId: true,
      title: true,
      materialPath: true,
      materialName: true,
      course: { select: { status: true, instructorId: true } },
    },
  });
  if (!lesson) throw new NotFoundError('Lesson not found.');
  checkOwner(lesson.course.instructorId, userId);
  return lesson;
}

/** Positions stay unique per course: move everything out of the way first, then number 1..n in the given order. */
async function renumber(tx: Prisma.TransactionClient, courseId: number, orderedIds?: number[]) {
  const ids =
    orderedIds ??
    (
      await tx.lesson.findMany({
        where: { courseId },
        orderBy: { position: 'asc' },
        select: { id: true },
      })
    ).map((l) => l.id);
  for (const [i, id] of ids.entries()) await tx.lesson.update({ where: { id }, data: { position: 100000 + i } });
  for (const [i, id] of ids.entries()) await tx.lesson.update({ where: { id }, data: { position: i + 1 } });
}

/** Students with progress or quiz attempts on a lesson (counted before a delete). */
async function studentsTouching(lessonId: number) {
  const [progress, attempts] = await Promise.all([
    prisma.lessonProgress.findMany({ where: { lessonId }, select: { studentId: true } }),
    prisma.quizAttempt.findMany({ where: { quiz: { lessonId } }, select: { studentId: true } }),
  ]);
  return new Set([...progress, ...attempts].map((r) => r.studentId)).size;
}

const instructorCourses = {
  async mine(userId: number, q: CourseMineQuery) {
    const where: Prisma.CourseWhereInput = {
      instructorId: userId,
      ...(q.q ? { title: { contains: q.q } } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.category ? { category: q.category } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.course.findMany({
        where,
        select: cardSelect,
        orderBy: { updatedAt: 'desc' },
        ...skipTake(q.page, q.pageSize),
      }),
      prisma.course.count({ where }),
    ]);
    return toPage(rows.map(toCard), total, q.page, q.pageSize);
  },

  /** A new course starts as Draft. */
  async create(userId: number, input: CourseCreateInput) {
    const course = await prisma.course.create({
      data: { ...input, instructorId: userId, status: 'DRAFT' },
      select: { id: true },
    });
    return { id: course.id };
  },

  async update(userId: number, id: number, input: CourseUpdateInput) {
    const course = await loadOwned(userId, id);
    checkEditable(course.status);
    await prisma.course.update({ where: { id }, data: input });
    return { ok: true };
  },

  async addLesson(userId: number, courseId: number, input: LessonCreateInput) {
    const course = await loadOwned(userId, courseId);
    checkStructure(course.status);
    const last = await prisma.lesson.findFirst({
      where: { courseId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const lesson = await prisma.lesson.create({
      data: { ...input, courseId, position: (last?.position ?? 0) + 1 },
      select: { id: true },
    });
    return { id: lesson.id };
  },

  /** Title, video link and duration can change in a published course too (HLD 6). */
  async updateLesson(userId: number, lessonId: number, input: LessonUpdateInput) {
    const lesson = await loadOwnedLesson(userId, lessonId);
    checkEditable(lesson.course.status);
    await prisma.lesson.update({ where: { id: lessonId }, data: input });
    return { ok: true };
  },

  /** Draft or Rejected only. With student progress the caller must confirm (the reply says how many students). */
  async deleteLesson(userId: number, lessonId: number, confirm: boolean) {
    const lesson = await loadOwnedLesson(userId, lessonId);
    checkStructure(lesson.course.status);
    const affected = await studentsTouching(lessonId);
    if (affected > 0 && !confirm) {
      throw new AppError(
        409,
        'CONFIRM_REQUIRED',
        `${affected} student${affected === 1 ? ' has' : 's have'} progress on this lesson. Deleting it also removes their progress and quiz attempts for it.`,
      );
    }
    await prisma.$transaction(async (tx) => {
      await tx.lesson.delete({ where: { id: lessonId } }); // the quiz, its questions, attempts and progress go with it
      await renumber(tx, lesson.courseId);
    });
    await storage.remove(lesson.materialPath);
    return { ok: true };
  },

  async reorderLessons(userId: number, courseId: number, lessonIds: number[]) {
    const course = await loadOwned(userId, courseId);
    checkStructure(course.status);
    const current = (await prisma.lesson.findMany({ where: { courseId }, select: { id: true } })).map((l) => l.id);
    checkOrder(current, lessonIds);
    await prisma.$transaction((tx) => renumber(tx, courseId, lessonIds));
    return { ok: true };
  },

  /** One PDF per lesson; a new upload replaces the old file. */
  async uploadMaterial(userId: number, lessonId: number, file: { buffer: Buffer; originalname: string }) {
    const lesson = await loadOwnedLesson(userId, lessonId);
    checkEditable(lesson.course.status);
    const path = await storage.save('materials', file.buffer, 'pdf');
    await prisma.lesson.update({
      where: { id: lessonId },
      data: { materialPath: path, materialName: cleanFileName(file.originalname) },
    });
    await storage.remove(lesson.materialPath);
    return { materialName: cleanFileName(file.originalname) };
  },

  async deleteMaterial(userId: number, lessonId: number) {
    const lesson = await loadOwnedLesson(userId, lessonId);
    checkEditable(lesson.course.status);
    await prisma.lesson.update({
      where: { id: lessonId },
      data: { materialPath: null, materialName: null },
    });
    await storage.remove(lesson.materialPath);
    return { ok: true };
  },

  /** The owner or an admin can open the material. Students get it through the learning module. */
  async materialFile(user: { id: number; role: string }, lessonId: number) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        materialPath: true,
        materialName: true,
        course: { select: { instructorId: true } },
      },
    });
    if (!lesson) throw new NotFoundError('Lesson not found.');
    if (user.role !== 'ADMIN') checkOwner(lesson.course.instructorId, user.id);
    if (!lesson.materialPath) throw new NotFoundError('This lesson has no material.');
    return {
      bytes: await storage.read(lesson.materialPath),
      name: lesson.materialName ?? 'material.pdf',
    };
  },

  async saveAssignment(userId: number, courseId: number, input: AssignmentInput) {
    const course = await loadOwned(userId, courseId);
    checkEditable(course.status);
    const data = {
      title: input.title,
      instructions: input.instructions,
      todoItems: input.todoItems,
      dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00Z`) : null,
    };
    await prisma.assignment.upsert({
      where: { courseId },
      update: data,
      create: { ...data, courseId },
    });
    return { ok: true };
  },

  async deleteAssignment(userId: number, courseId: number) {
    const course = await loadOwned(userId, courseId);
    checkStructure(course.status);
    const a = await prisma.assignment.findUnique({
      where: { courseId },
      select: { id: true, _count: { select: { submissions: true } } },
    });
    if (!a) return { ok: true };
    if (a._count.submissions > 0)
      throw new ConflictError(
        'Students have already submitted this assignment, so it cannot be removed. Edit it instead.',
      );
    await prisma.assignment.delete({ where: { id: a.id } });
    return { ok: true };
  },

  /** Runs the readiness check (the same one the admin review shows) and moves the course to Pending review. */
  async submit(userId: number, courseId: number) {
    const course = await loadOwned(userId, courseId);
    const full = await adminCourses.manage({ id: userId, role: 'INSTRUCTOR' }, courseId);
    checkSubmit(
      course.status,
      full.readiness.items.filter((i) => !i.ok).map((i) => i.text),
    );
    await prisma.course.update({
      where: { id: courseId },
      data: { status: 'PENDING_REVIEW', rejectReason: null },
    });
    return { status: 'PENDING_REVIEW' as const };
  },
};

// ---------- Published courses: public catalog and the instructor's Browse tab ----------

const catalogCourses = {
  async catalog(q: CourseCatalogQuery) {
    const where: Prisma.CourseWhereInput = {
      status: 'PUBLISHED',
      ...(q.q ? { OR: [{ title: { contains: q.q } }, { instructor: { name: { contains: q.q } } }] } : {}),
      ...(q.category ? { category: q.category } : {}),
      ...(q.level ? { level: q.level } : {}),
      ...(q.instructorId ? { instructorId: q.instructorId } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.course.findMany({
        where,
        select: cardSelect,
        orderBy: { title: 'asc' },
        ...skipTake(q.page, q.pageSize),
      }),
      prisma.course.count({ where }),
    ]);
    // Public cards leave out the reject reason and the student count.
    const items = rows.map(toCard).map(({ rejectReason: _reason, studentCount: _students, ...card }) => card);
    return toPage(items, total, q.page, q.pageSize);
  },

  /** HLD 7, "Public course data": published only, and never video links, materials, quiz or assignment text. */
  async publicView(id: number) {
    const c = await prisma.course.findFirst({
      where: { id, status: 'PUBLISHED' },
      select: {
        id: true,
        title: true,
        description: true,
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
            quiz: { select: { id: true, questionCount: true, passMark: true } },
          },
        },
        assignment: { select: { id: true } },
      },
    });
    if (!c) throw new NotFoundError('Course not found.');
    const firstQuiz = c.lessons.find((l) => l.quiz)?.quiz;
    return {
      ...c,
      lessons: c.lessons.map(({ quiz, ...l }) => ({ ...l, hasQuiz: !!quiz })),
      assignment: undefined,
      hasAssignment: !!c.assignment,
      lessonCount: c.lessons.length,
      quizCount: c.lessons.filter((l) => l.quiz).length,
      minutes: c.lessons.reduce((n, l) => n + l.durationMin, 0),
      // Question count and pass mark of the quizzes, for "What you get" (they are set per quiz, from settings).
      quizRule: firstQuiz ? { questionCount: firstQuiz.questionCount, passMark: firstQuiz.passMark } : null,
    };
  },
};

export const coursesService = { ...adminCourses, ...instructorCourses, ...catalogCourses };
