import type { StudentsProgressQuery } from '@learnhub/shared';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import { toPage } from '../../utils/pagination';
import { prisma } from '../../utils/prisma';
import { studentCourseState } from '../learning/learning.service';
import { progressRowState } from './enrollments.rules';

type User = { id: number; role: string };

// Instructor "Students and progress" and "Student detail" (designs iStud and iSDetail). Every number comes from the same
// studentCourseState the student sees, so both sides always agree.
export const progressService = {
  async list(instructorId: number, q: StudentsProgressQuery) {
    const rows = await prisma.enrollment.findMany({
      where: {
        course: { instructorId, status: 'PUBLISHED', ...(q.courseId ? { id: q.courseId } : {}) },
        ...(q.q ? { student: { OR: [{ name: { contains: q.q } }, { email: { contains: q.q } }] } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      select: { courseId: true, student: { select: { id: true, name: true, email: true } } },
    });
    const items = await Promise.all(
      rows.map(async (r) => {
        const s = await studentCourseState(r.student.id, r.courseId);
        const toReview = s.lessons.filter((l) => l.quiz?.state === 'review').length;
        const assignment = s.assignment?.state ?? 'none';
        return {
          student: r.student,
          course: { id: s.course.id, title: s.course.title },
          progress: s.progress,
          toReview,
          assignment,
          grade: s.assignment?.submission?.grade ?? null,
          certificateIssued: !!s.certificate,
          state: progressRowState(toReview, assignment, !!s.certificate),
        };
      }),
    );
    const filtered = items.filter((x) => !q.state || x.state === q.state);
    const start = (q.page - 1) * q.pageSize;
    return {
      ...toPage(filtered.slice(start, start + q.pageSize), filtered.length, q.page, q.pageSize),
      summary: {
        enrollments: items.length,
        students: new Set(items.map((x) => x.student.id)).size,
        quizzesToReview: items.reduce((n, x) => n + x.toReview, 0),
        toGrade: items.filter((x) => x.assignment === 'submitted').length,
        completed: items.filter((x) => x.certificateIssued).length,
      },
    };
  },

  /** One student in one course, plus the other published courses of this instructor the student is in (the course picker). */
  async detail(user: User, courseId: number, studentId: number) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true, status: true },
    });
    if (!course || course.status !== 'PUBLISHED') throw new NotFoundError('Course not found.');
    if (user.role === 'INSTRUCTOR' && course.instructorId !== user.id) throw new ForbiddenError();
    const [student, enrolled] = await Promise.all([
      prisma.user.findUnique({
        where: { id: studentId },
        select: { id: true, name: true, email: true, mobile: true, role: true },
      }),
      prisma.enrollment.findMany({
        where: {
          studentId,
          course: {
            status: 'PUBLISHED',
            ...(user.role === 'INSTRUCTOR' ? { instructorId: user.id } : {}),
          },
        },
        orderBy: { createdAt: 'asc' },
        select: { course: { select: { id: true, title: true } } },
      }),
    ]);
    if (!student || student.role !== 'STUDENT') throw new NotFoundError('Student not found.');
    if (!enrolled.some((e) => e.course.id === courseId))
      throw new NotFoundError('This student is not enrolled in this course.');
    const s = await studentCourseState(studentId, courseId);
    return {
      student: { id: student.id, name: student.name, email: student.email, mobile: student.mobile },
      courses: enrolled.map((e) => e.course),
      course: { id: s.course.id, title: s.course.title },
      progress: s.progress,
      videosReached: s.lessons.filter((l) => l.reached).length,
      lessons: s.lessons.map((l) => ({
        id: l.id,
        position: l.position,
        title: l.title,
        watchedPercent: l.watchedPercent,
        quiz: l.quiz,
      })),
      assignment: s.assignment,
      certificate: s.certificate,
    };
  },
};
