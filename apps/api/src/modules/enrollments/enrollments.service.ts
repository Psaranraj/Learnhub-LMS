import type { Prisma } from '@prisma/client';
import type { CourseStudentsQuery, MyCoursesQuery } from '@learnhub/shared';
import { ConflictError, NotFoundError } from '../../utils/errors';
import { toPage } from '../../utils/pagination';
import { prisma } from '../../utils/prisma';
import { checkEditable, checkOwner } from '../courses/courses.rules';
import { studentCourseState } from '../learning/learning.service';
import { checkRemovable, progressOf } from './enrollments.rules';

async function loadCourse(user: { id: number; role: string }, courseId: number) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      status: true,
      instructorId: true,
      lessons: { select: { id: true, quiz: { select: { id: true } } } },
    },
  });
  if (!course) throw new NotFoundError('Course not found.');
  if (user.role !== 'ADMIN') checkOwner(course.instructorId, user.id);
  return course;
}

export const enrollmentsService = {
  /** Students of one course with progress (passed topics) and certificate, for the owner or an admin. */
  async students(user: { id: number; role: string }, courseId: number, q: CourseStudentsQuery) {
    const course = await loadCourse(user, courseId);
    const where: Prisma.EnrollmentWhereInput = {
      courseId,
      ...(q.q ? { student: { OR: [{ name: { contains: q.q } }, { email: { contains: q.q } }] } } : {}),
    };
    const rows = await prisma.enrollment.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        source: true,
        createdAt: true,
        student: { select: { id: true, name: true, email: true, status: true } },
      },
    });
    const ids = rows.map((r) => r.student.id);
    const quizIds = course.lessons.flatMap((l) => (l.quiz ? [l.quiz.id] : []));
    const [passed, progress, attempts, certificates] = await Promise.all([
      prisma.quizAttempt.findMany({
        where: {
          studentId: { in: ids },
          quizId: { in: quizIds },
          status: 'RELEASED',
          passed: true,
        },
        select: { studentId: true, quizId: true },
        distinct: ['studentId', 'quizId'],
      }),
      prisma.lessonProgress.findMany({
        where: { studentId: { in: ids }, lesson: { courseId }, watchedSeconds: { gt: 0 } },
        select: { studentId: true },
      }),
      prisma.quizAttempt.findMany({
        where: { studentId: { in: ids }, quizId: { in: quizIds } },
        select: { studentId: true },
      }),
      prisma.certificate.findMany({
        where: { courseId, studentId: { in: ids } },
        select: { studentId: true },
      }),
    ]);
    const passedBy = new Map<number, number>();
    passed.forEach((p) => passedBy.set(p.studentId, (passedBy.get(p.studentId) ?? 0) + 1));
    const started = new Set([...progress, ...attempts].map((r) => r.studentId));
    const certified = new Set(certificates.map((c) => c.studentId));

    const items = rows
      .map((r) => ({
        student: {
          id: r.student.id,
          name: r.student.name,
          email: r.student.email,
          active: r.student.status === 'ACTIVE',
        },
        source: r.source,
        enrolledAt: r.createdAt,
        certificate: certified.has(r.student.id),
        ...progressOf(
          passedBy.get(r.student.id) ?? 0,
          course.lessons.length,
          started.has(r.student.id),
          certified.has(r.student.id),
        ),
      }))
      .filter((r) => !q.progress || r.state === q.progress);
    const start = (q.page - 1) * q.pageSize;
    return toPage(items.slice(start, start + q.pageSize), items.length, q.page, q.pageSize);
  },

  /** Free access (source ASSIGNED). Students added before approval get access when the course is published. */
  async add(userId: number, courseId: number, studentIds: number[]) {
    const course = await loadCourse({ id: userId, role: 'INSTRUCTOR' }, courseId);
    checkEditable(course.status);
    const students = await prisma.user.findMany({
      where: { id: { in: studentIds }, role: 'STUDENT', status: 'ACTIVE' },
      select: { id: true },
    });
    const result = await prisma.enrollment.createMany({
      data: students.map((s) => ({ courseId, studentId: s.id, source: 'ASSIGNED' as const })),
      skipDuplicates: true,
    });
    return {
      added: result.count,
      skipped: studentIds.length - result.count,
      published: course.status === 'PUBLISHED',
    };
  },

  async remove(userId: number, courseId: number, studentId: number) {
    const course = await loadCourse({ id: userId, role: 'INSTRUCTOR' }, courseId);
    checkEditable(course.status);
    const e = await prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId } },
      select: { id: true, source: true },
    });
    if (!e) throw new NotFoundError('This student is not in the course.');
    checkRemovable(e.source);
    await prisma.enrollment.delete({ where: { id: e.id } });
    return { ok: true };
  },

  /** Self-enroll in a published course (source SELF). 409 when already enrolled (LLD 6, flow 2). */
  async enroll(studentId: number, courseId: number) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { status: true },
    });
    if (!course || course.status !== 'PUBLISHED') throw new NotFoundError('Course not found.');
    const existing = await prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId } },
      select: { id: true },
    });
    if (existing) throw new ConflictError('You are already enrolled in this course.');
    await prisma.enrollment.create({ data: { courseId, studentId, source: 'SELF' } });
    return { ok: true };
  },

  /**
   * The student's courses (published only), with progress, the next topic and Completed when a certificate exists.
   * The state comes from the learning module so My courses, the workspace and the quiz list agree.
   */
  async mine(studentId: number, q: MyCoursesQuery) {
    const rows = await prisma.enrollment.findMany({
      where: {
        studentId,
        course: {
          status: 'PUBLISHED',
          ...(q.q ? { OR: [{ title: { contains: q.q } }, { instructor: { name: { contains: q.q } } }] } : {}),
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { courseId: true },
    });
    const states = await Promise.all(rows.map((r) => studentCourseState(studentId, r.courseId)));
    const items = states
      .map((s) => {
        const next = s.lessons.find((l) => l.quiz?.state !== 'passed') ?? null;
        return {
          course: s.course,
          source: s.enrollment.source,
          progress: s.progress,
          status: s.certificate ? ('COMPLETED' as const) : ('IN_PROGRESS' as const),
          next: next && { id: next.id, position: next.position, title: next.title },
        };
      })
      .filter((x) => !q.status || x.status === q.status);
    const start = (q.page - 1) * q.pageSize;
    return toPage(items.slice(start, start + q.pageSize), items.length, q.page, q.pageSize);
  },
};
