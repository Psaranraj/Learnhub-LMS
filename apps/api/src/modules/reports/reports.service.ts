import type { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { studentCourseState } from '../learning/learning.service';
import { ALERT_LIMIT, averagePercent, summarize, type EnrollmentFacts } from './reports.rules';

// LLD 3, reports: GET /dashboard, GET /alerts and the admin reports. Nothing is stored; every number is worked out on
// demand from studentCourseState (HLD 8, decision 8), one enrollment at a time. That is fine at institute scale; a
// summary table would be the next step if enrollments grow into the tens of thousands.

type User = { id: number; role: string; name?: string };
type State = Awaited<ReturnType<typeof studentCourseState>>;
type Alert = { id: string; title: string; detail: string; to?: string };

/** The state of every enrollment that matches, in published courses only. */
async function states(where: Prisma.EnrollmentWhereInput) {
  const rows = await prisma.enrollment.findMany({
    where: { ...where, course: { ...(where.course as object), status: 'PUBLISHED' } },
    orderBy: { createdAt: 'asc' },
    select: {
      studentId: true,
      courseId: true,
      student: { select: { id: true, name: true, email: true } },
    },
  });
  return Promise.all(
    rows.map(async (r) => ({
      student: r.student,
      state: await studentCourseState(r.studentId, r.courseId),
    })),
  );
}

const facts = (s: State): EnrollmentFacts => ({
  quizStates: s.lessons.flatMap((l) => (l.quiz ? [l.quiz.state] : [])),
  assignment: s.assignment?.state ?? 'none',
  certificate: !!s.certificate,
});

/** The next topic to study: the first open topic whose quiz is not passed (same rule as the learning workspace). */
const nextTopic = (s: State) => s.lessons.find((l) => l.open && l.quiz?.state !== 'passed') ?? null;

async function studentDashboard(studentId: number) {
  const mine = await states({ studentId });
  const all = mine.map((m) => m.state);
  const inProgress = all.filter((s) => !s.certificate);
  const todo: {
    kind: 'review' | 'quiz' | 'assignment' | 'certificate';
    title: string;
    detail: string;
    courseId: number;
    lessonId?: number;
    attemptId?: number | null;
    retake?: boolean;
    questionCount?: number;
    passMark?: number;
  }[] = [];
  for (const s of all) {
    for (const l of s.lessons) {
      const q = l.quiz;
      if (q?.state === 'review')
        todo.push({
          kind: 'review',
          title: `Quiz: ${l.title}`,
          detail: `${s.course.title} · Submitted, waiting for instructor review`,
          courseId: s.course.id,
          lessonId: l.id,
          attemptId: q.attemptId,
        });
      if (q && (q.state === 'open' || q.state === 'failed') && l.open) {
        todo.push({
          kind: 'quiz',
          title: `Quiz: ${l.title}`,
          detail: `${s.course.title} · ${q.questionCount} questions, ${q.passMark} to pass`,
          courseId: s.course.id,
          lessonId: l.id,
          retake: q.state === 'failed',
          questionCount: q.questionCount,
          passMark: q.passMark,
        });
      }
    }
    if (s.assignment?.state === 'todo')
      todo.push({
        kind: 'assignment',
        title: 'Assignment to submit',
        detail: s.course.title,
        courseId: s.course.id,
      });
    if (s.certificate)
      todo.push({
        kind: 'certificate',
        title: 'Certificate issued',
        detail: s.course.title,
        courseId: s.course.id,
      });
  }
  return {
    role: 'STUDENT' as const,
    stats: {
      enrolled: all.length,
      inProgress: inProgress.length,
      averageProgress: averagePercent(all.map((s) => s.progress.percent)),
      topicsPassed: all.reduce((n, s) => n + s.progress.passed, 0),
      certificates: all.filter((s) => s.certificate).length,
    },
    continue: inProgress.map((s) => {
      const next = nextTopic(s);
      return {
        course: { id: s.course.id, title: s.course.title },
        progress: s.progress,
        next: next && { id: next.id, position: next.position, title: next.title },
      };
    }),
    todo,
  };
}

async function instructorDashboard(instructorId: number) {
  const [courses, enrolled] = await Promise.all([
    prisma.course.findMany({
      where: { instructorId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        _count: { select: { lessons: true, enrollments: true } },
      },
    }),
    states({ course: { instructorId } }),
  ]);
  const attention: {
    kind: 'quiz' | 'assignment';
    title: string;
    student: { id: number; name: string };
    course: { id: number; title: string };
    attemptId?: number | null;
  }[] = [];
  for (const { student, state: s } of enrolled) {
    for (const l of s.lessons) {
      if (l.quiz?.state === 'review')
        attention.push({
          kind: 'quiz',
          title: `Quiz to review: ${l.title}`,
          student,
          course: { id: s.course.id, title: s.course.title },
          attemptId: l.quiz.attemptId,
        });
    }
    if (s.assignment?.state === 'submitted')
      attention.push({
        kind: 'assignment',
        title: 'Assignment to grade',
        student,
        course: { id: s.course.id, title: s.course.title },
      });
  }
  const quizzes = attention.filter((a) => a.kind === 'quiz').length;
  return {
    role: 'INSTRUCTOR' as const,
    stats: {
      courses: courses.length,
      pending: courses.filter((c) => c.status === 'PENDING_REVIEW').length,
      students: new Set(enrolled.map((e) => e.student.id)).size,
      quizzesToReview: quizzes,
      assignmentsToGrade: attention.length - quizzes,
      certificates: enrolled.filter((e) => e.state.certificate).length,
      enrollments: enrolled.length,
    },
    attention,
    courses: courses.map((c) => {
      const mine = enrolled.filter((e) => e.state.course.id === c.id);
      return {
        id: c.id,
        title: c.title,
        status: c.status,
        lessons: c._count.lessons,
        students: c._count.enrollments,
        averageProgress: c.status === 'PUBLISHED' ? averagePercent(mine.map((e) => e.state.progress.percent)) : 0,
      };
    }),
  };
}

async function adminDashboard() {
  const [users, active, published, pending, enrollments, certificates, resets, recent] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.course.count({ where: { status: 'PUBLISHED' } }),
    prisma.course.findMany({
      where: { status: 'PENDING_REVIEW' },
      orderBy: { updatedAt: 'asc' },
      select: {
        id: true,
        title: true,
        instructor: { select: { name: true } },
        _count: { select: { lessons: true } },
        lessons: { select: { quiz: { select: { id: true } } } },
      },
    }),
    prisma.enrollment.count({ where: { course: { status: 'PUBLISHED' } } }),
    prisma.certificate.count({ where: { course: { status: 'PUBLISHED' } } }),
    prisma.passwordResetRequest.findMany({
      where: { resolvedAt: null },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.activityLog.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 4,
      select: { id: true, text: true, actorLabel: true, createdAt: true },
    }),
  ]);
  return {
    role: 'ADMIN' as const,
    stats: {
      users,
      activeUsers: active,
      publishedCourses: published,
      pendingCourses: pending.length,
      enrollments,
      certificates,
    },
    pendingCourses: pending.map((c) => ({
      id: c.id,
      title: c.title,
      instructor: c.instructor.name,
      lessons: c._count.lessons,
      quizzes: c.lessons.filter((l) => l.quiz).length,
    })),
    resetRequests: resets,
    recent,
  };
}

export const reportsService = {
  dashboard(user: User) {
    if (user.role === 'STUDENT') return studentDashboard(user.id);
    if (user.role === 'INSTRUCTOR') return instructorDashboard(user.id);
    return adminDashboard();
  },

  /** What is waiting for the caller right now (design "Alerts (live, per role)"). Nothing is stored or marked as read. */
  async alerts(user: User): Promise<{ items: Alert[] }> {
    const items: Alert[] = [];
    if (user.role === 'STUDENT') {
      for (const { state: s } of await states({ studentId: user.id })) {
        const cn = s.course.title;
        for (const l of s.lessons) {
          const q = l.quiz;
          if (q?.state === 'review')
            items.push({
              id: `qr-${l.id}`,
              title: 'Quiz waiting for review',
              detail: `${l.title} · ${cn}`,
              to: '/student/quizzes',
            });
          else if (q?.state === 'failed')
            items.push({
              id: `qf-${l.id}`,
              title: 'Quiz not passed, you can retake',
              detail: `${l.title}: ${q.score}/${q.questionCount}`,
              to: '/student/quizzes',
            });
          else if (q?.state === 'open')
            items.push({
              id: `qo-${l.id}`,
              title: 'Quiz received',
              detail: `${l.title} · ${cn}`,
              to: '/student/quizzes',
            });
        }
        const a = s.assignment;
        if (a?.state === 'todo')
          items.push({
            id: `at-${s.course.id}`,
            title: 'Assignment unlocked',
            detail: cn,
            to: '/student/assignments',
          });
        if (a?.state === 'submitted')
          items.push({
            id: `as-${s.course.id}`,
            title: 'Assignment waiting for review',
            detail: cn,
            to: '/student/assignments',
          });
        if (a?.state === 'graded')
          items.push({
            id: `ag-${s.course.id}`,
            title: 'Assignment graded',
            detail: `${cn}: ${a.submission?.grade}/100`,
            to: '/student/assignments',
          });
        if (s.certificate)
          items.push({
            id: `c-${s.course.id}`,
            title: 'Certificate issued',
            detail: cn,
            to: '/student/certificates',
          });
      }
    } else if (user.role === 'INSTRUCTOR') {
      for (const { student, state: s } of await states({ course: { instructorId: user.id } })) {
        const to = `/instructor/students/${student.id}?course=${s.course.id}`;
        for (const l of s.lessons)
          if (l.quiz?.state === 'review')
            items.push({
              id: `qr-${l.id}-${student.id}`,
              title: 'Quiz to review',
              detail: `${student.name} · ${l.title}`,
              to,
            });
        if (s.assignment?.state === 'submitted')
          items.push({
            id: `ag-${s.course.id}-${student.id}`,
            title: 'Assignment to grade',
            detail: `${student.name} · ${s.course.title}`,
            to: `${to}&tab=asg`,
          });
      }
      const pending = await prisma.course.findMany({
        where: { instructorId: user.id, status: 'PENDING_REVIEW' },
        select: { id: true, title: true },
      });
      for (const c of pending)
        items.push({
          id: `cp-${c.id}`,
          title: 'Course waiting for admin approval',
          detail: c.title,
          to: `/instructor/courses/${c.id}`,
        });
    } else {
      const pending = await prisma.course.findMany({
        where: { status: 'PENDING_REVIEW' },
        orderBy: { updatedAt: 'asc' },
        select: { id: true, title: true, instructor: { select: { name: true } } },
      });
      for (const c of pending)
        items.push({
          id: `cp-${c.id}`,
          title: 'Course waiting for approval',
          detail: `${c.title} · ${c.instructor.name}`,
          to: `/admin/courses/${c.id}`,
        });
    }
    return { items: items.slice(0, ALERT_LIMIT) };
  },

  /** Admin Reports, top row (design adRep). */
  async overview() {
    const [all, courses] = await Promise.all([states({}), prisma.course.count({ where: { status: 'PUBLISHED' } })]);
    return { ...summarize(all.map((e) => facts(e.state))), publishedCourses: courses };
  },

  /** Per-instructor summary: published courses, distinct students, completion and pass rates, assignments waiting. */
  async instructors() {
    const [instructors, all] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'INSTRUCTOR' },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          status: true,
          _count: { select: { taught: { where: { status: 'PUBLISHED' } } } },
        },
      }),
      states({}),
    ]);
    return {
      items: instructors.map((u) => {
        const mine = all.filter((e) => e.state.course.instructor.id === u.id);
        const s = summarize(mine.map((e) => facts(e.state)));
        return {
          instructor: { id: u.id, name: u.name, active: u.status === 'ACTIVE' },
          publishedCourses: u._count.taught,
          students: new Set(mine.map((e) => e.student.id)).size,
          completionRate: s.completionRate,
          quizPassRate: s.quizPassRate,
          waiting: s.waiting,
        };
      }),
    };
  },

  /** Enrollments by published course, most first. */
  async enrollments() {
    const rows = await prisma.course.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        title: true,
        instructor: { select: { name: true } },
        _count: { select: { enrollments: true } },
      },
    });
    return {
      items: rows
        .map((c) => ({
          id: c.id,
          title: c.title,
          instructor: c.instructor.name,
          students: c._count.enrollments,
        }))
        .sort((a, b) => b.students - a.students || a.title.localeCompare(b.title)),
    };
  },
};
