import type { Prisma } from '@prisma/client';
import type { CertificateProgressQuery, CertificatesQuery } from '@learnhub/shared';
import { certificatePdf, type CertificateSnapshot } from '../../lib/certificatePdf';
import { storage } from '../../lib/storage';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import { skipTake, toPage } from '../../utils/pagination';
import { prisma } from '../../utils/prisma';
import { studentCourseState } from '../learning/learning.service';
import { settingsService } from '../settings/settings.service';
import { certificateNumber, certificateProgress, certificateState, dayRange } from './certificates.rules';

type User = { id: number; role: string };

const rowSelect = {
  id: true,
  certificateNo: true,
  studentId: true,
  studentName: true,
  courseTitle: true,
  orgName: true,
  title: true,
  intro: true,
  mid: true,
  footer: true,
  logoPath: true,
  issuedAt: true,
  student: { select: { email: true } },
  course: { select: { id: true, instructorId: true, instructor: { select: { name: true } } } },
} satisfies Prisma.CertificateSelect;
type Row = Prisma.CertificateGetPayload<{ select: typeof rowSelect }>;

const toView = (c: Row) => ({
  id: c.id,
  certificateNo: c.certificateNo,
  studentName: c.studentName,
  studentEmail: c.student.email,
  courseId: c.course.id,
  courseTitle: c.courseTitle,
  instructorName: c.course.instructor.name,
  orgName: c.orgName,
  title: c.title,
  intro: c.intro,
  mid: c.mid,
  footer: c.footer,
  hasLogo: !!c.logoPath,
  issuedAt: c.issuedAt,
});

/** The student who owns it, the course's instructor, or an admin. */
function checkAccess(user: User, c: Row) {
  if (user.role === 'ADMIN') return;
  if (user.role === 'STUDENT' && c.studentId === user.id) return;
  if (user.role === 'INSTRUCTOR' && c.course.instructorId === user.id) return;
  throw new ForbiddenError();
}

/**
 * Creates the certificate snapshot inside the first-submission transaction (LLD 6, flow 5). Settings and names are copied
 * now, so later changes never alter an issued certificate (HLD 8, decision 5).
 */
export async function issueCertificate(
  tx: Prisma.TransactionClient,
  studentId: number,
  courseId: number,
  issuedAt: Date,
) {
  const existing = await tx.certificate.findUnique({
    where: { courseId_studentId: { courseId, studentId } },
    select: { id: true },
  });
  if (existing) return existing.id;
  const [student, course, s] = await Promise.all([
    tx.user.findUniqueOrThrow({ where: { id: studentId }, select: { name: true } }),
    tx.course.findUniqueOrThrow({ where: { id: courseId }, select: { title: true } }),
    tx.settings.findUnique({ where: { id: 1 } }),
  ]);
  const created = await tx.certificate.create({
    data: {
      courseId,
      studentId,
      certificateNo: `pending-${courseId}-${studentId}`,
      studentName: student.name,
      courseTitle: course.title,
      orgName: s?.orgName ?? 'LearnHub',
      title: s?.certTitle ?? 'Certificate of completion',
      intro: s?.certIntro ?? 'This certifies that',
      mid: s?.certMid ?? 'has successfully completed',
      footer: s?.certFooter ?? 'Issued by LearnHub',
      logoPath: s?.logoPath ?? null,
      issuedAt,
    },
    select: { id: true },
  });
  await tx.certificate.update({
    where: { id: created.id },
    data: { certificateNo: certificateNumber(created.id, issuedAt) },
  });
  return created.id;
}

export const certificatesService = {
  /** Every enrolled course: the certificate when issued, otherwise why not yet (design pCert). */
  async mine(studentId: number) {
    const rows = await prisma.enrollment.findMany({
      where: { studentId, course: { status: 'PUBLISHED' } },
      orderBy: { createdAt: 'desc' },
      select: { courseId: true },
    });
    const states = await Promise.all(rows.map((r) => studentCourseState(studentId, r.courseId)));
    return {
      items: states.map((s) => ({
        course: s.course,
        certificate: s.certificate && {
          id: s.certificate.id,
          certificateNo: s.certificate.certificateNo,
          issuedAt: s.certificate.issuedAt,
        },
        reason: s.certificate
          ? null
          : s.assignment?.state === 'todo'
            ? 'Issued when you submit your assignment'
            : 'Unlocks after your topic quizzes are passed',
      })),
    };
  },

  /** Issued certificates: the instructor's own courses, or all for an admin; search, course and date range. */
  async list(user: User, q: CertificatesQuery) {
    const where: Prisma.CertificateWhereInput = {
      ...(user.role === 'INSTRUCTOR' ? { course: { instructorId: user.id } } : {}),
      ...(q.courseId ? { courseId: q.courseId } : {}),
      ...(q.q ? { OR: [{ studentName: { contains: q.q } }, { student: { email: { contains: q.q } } }] } : {}),
      ...(q.from || q.to ? { issuedAt: dayRange(q.from, q.to) } : {}),
    };
    const [rows, total, students, courses] = await Promise.all([
      prisma.certificate.findMany({
        where,
        select: rowSelect,
        orderBy: { issuedAt: 'desc' },
        ...skipTake(q.page, q.pageSize),
      }),
      prisma.certificate.count({ where }),
      prisma.certificate.findMany({ where, select: { studentId: true }, distinct: ['studentId'] }),
      prisma.certificate.findMany({ where, select: { courseId: true }, distinct: ['courseId'] }),
    ]);
    return {
      ...toPage(rows.map(toView), total, q.page, q.pageSize),
      summary: { issued: total, students: students.length, courses: courses.length },
    };
  },

  /** Instructor tracking per student and course (design iCert): progress to the certificate, requirements, next step. */
  async progress(instructorId: number, q: CertificateProgressQuery) {
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
        const waiting = s.lessons.filter((l) => l.quiz?.state === 'review').length;
        const submitted = s.assignment?.state === 'submitted' || s.assignment?.state === 'graded';
        const started =
          s.lessons.some(
            (l) => l.watchedPercent > 0 || (l.quiz && l.quiz.state !== 'locked' && l.quiz.state !== 'open'),
          ) || !!s.assignment?.submission;
        const state = certificateState(!!s.certificate, started);
        const next = s.certificate
          ? 'Certificate issued'
          : waiting
            ? `Review ${waiting} quiz${waiting === 1 ? '' : 'zes'}`
            : s.assignment?.state === 'todo'
              ? 'Waiting for student to submit assignment'
              : `Passing lesson quizzes (${s.progress.passed}/${s.progress.total})`;
        return {
          student: r.student,
          course: { id: s.course.id, title: s.course.title },
          percent: certificateProgress(s.progress.passed, s.progress.total, submitted),
          passed: s.progress.passed,
          total: s.progress.total,
          assignment: s.assignment?.state ?? 'none',
          next,
          state,
          certificate: s.certificate && { id: s.certificate.id, issuedAt: s.certificate.issuedAt },
        };
      }),
    );
    const filtered = items.filter((x) => !q.state || x.state === q.state);
    const count = (k: string) => items.filter((x) => x.state === k).length;
    const start = (q.page - 1) * q.pageSize;
    return {
      ...toPage(filtered.slice(start, start + q.pageSize), filtered.length, q.page, q.pageSize),
      summary: {
        issued: count('issued'),
        progress: count('progress'),
        new: count('new'),
        enrollments: items.length,
      },
    };
  },

  async view(user: User, id: number) {
    const c = await prisma.certificate.findUnique({ where: { id }, select: rowSelect });
    if (!c) throw new NotFoundError('Certificate not found.');
    checkAccess(user, c);
    return toView(c);
  },

  /** The logo saved with this certificate (it may differ from today's logo). */
  async logo(user: User, id: number) {
    const c = await prisma.certificate.findUnique({ where: { id }, select: rowSelect });
    if (!c) throw new NotFoundError('Certificate not found.');
    checkAccess(user, c);
    if (!c.logoPath) throw new NotFoundError('This certificate uses the default mark.');
    return { bytes: await storage.read(c.logoPath), type: settingsService.typeOf(c.logoPath) };
  },

  /** The PDF, built from the saved snapshot. */
  async pdf(user: User, id: number) {
    const c = await prisma.certificate.findUnique({ where: { id }, select: rowSelect });
    if (!c) throw new NotFoundError('Certificate not found.');
    checkAccess(user, c);
    const logo = c.logoPath ? await storage.read(c.logoPath).catch(() => null) : null;
    const snapshot: CertificateSnapshot = { ...toView(c), logo };
    const name = `certificate-${`${c.studentName} ${c.courseTitle}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}.pdf`;
    return { bytes: await certificatePdf(snapshot), name };
  },
};
