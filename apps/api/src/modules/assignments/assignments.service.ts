import type { Prisma } from '@prisma/client';
import type { GradeInput, SubmissionsQuery } from '@learnhub/shared';
import { cleanFileName, storage } from '../../lib/storage';
import { ConflictError, ForbiddenError, NotFoundError } from '../../utils/errors';
import { skipTake, toPage } from '../../utils/pagination';
import { prisma } from '../../utils/prisma';
import { issueCertificate } from '../certificates/certificates.service';
import { isLate } from '../learning/learning.rules';
import { studentCourseState } from '../learning/learning.service';

type User = { id: number; role: string };

const submissionSelect = {
  id: true,
  studentId: true,
  fileName: true,
  filePath: true,
  checks: true,
  status: true,
  grade: true,
  feedback: true,
  submittedAt: true,
  gradedAt: true,
  student: { select: { id: true, name: true, email: true } },
  assignment: {
    select: {
      id: true,
      title: true,
      instructions: true,
      todoItems: true,
      dueDate: true,
      course: { select: { id: true, title: true, instructorId: true } },
    },
  },
} satisfies Prisma.SubmissionSelect;
type Row = Prisma.SubmissionGetPayload<{ select: typeof submissionSelect }>;

const toView = (s: Row) => ({
  id: s.id,
  status: s.status,
  fileName: s.fileName,
  checks: s.checks as boolean[],
  grade: s.grade,
  feedback: s.feedback,
  submittedAt: s.submittedAt,
  gradedAt: s.gradedAt,
  late: isLate(s.assignment.dueDate, s.submittedAt),
  student: s.student,
  course: { id: s.assignment.course.id, title: s.assignment.course.title },
  assignment: {
    id: s.assignment.id,
    title: s.assignment.title,
    instructions: s.assignment.instructions,
    todoItems: s.assignment.todoItems as string[],
    dueDate: s.assignment.dueDate,
  },
});

async function loadOwned(instructorId: number, id: number) {
  const s = await prisma.submission.findUnique({ where: { id }, select: submissionSelect });
  if (!s) throw new NotFoundError('Submission not found.');
  if (s.assignment.course.instructorId !== instructorId) throw new ForbiddenError();
  return s;
}

export const assignmentsService = {
  /** One row per enrolled course that has an assignment, with its state (design pAsg). */
  async mine(studentId: number) {
    const rows = await prisma.enrollment.findMany({
      where: { studentId, course: { status: 'PUBLISHED', assignment: { isNot: null } } },
      orderBy: { createdAt: 'desc' },
      select: { courseId: true },
    });
    const states = await Promise.all(rows.map((r) => studentCourseState(studentId, r.courseId)));
    return {
      items: states.map((s) => ({
        course: s.course,
        progress: s.progress,
        assignment: s.assignment!,
        certificate: s.certificate && {
          id: s.certificate.id,
          certificateNo: s.certificate.certificateNo,
        },
      })),
    };
  },

  /**
   * LLD 6, flow 5. Allowed when every topic quiz is passed. The first submission creates the certificate snapshot in the
   * same transaction (v3: no approval). While SUBMITTED the PDF can be replaced; once GRADED it is final.
   */
  async submit(
    studentId: number,
    courseId: number,
    file: { buffer: Buffer; originalname: string },
    checks: [boolean, boolean],
  ) {
    const state = await studentCourseState(studentId, courseId);
    const a = state.assignment;
    if (!a) throw new NotFoundError('This course has no assignment.');
    if (a.state === 'locked') throw new ConflictError('Pass all topic quizzes to unlock the assignment.');
    if (a.state === 'graded') throw new ConflictError('Your assignment has been graded and can no longer be replaced.');

    const filePath = await storage.save('submissions', file.buffer, 'pdf');
    const fileName = cleanFileName(file.originalname);
    const now = new Date();
    let oldPath: string | null = null;
    try {
      await prisma.$transaction(async (tx) => {
        const existing = await tx.submission.findUnique({
          where: { assignmentId_studentId: { assignmentId: a.id, studentId } },
          select: { id: true, status: true, filePath: true },
        });
        if (existing?.status === 'GRADED')
          throw new ConflictError('Your assignment has been graded and can no longer be replaced.');
        if (existing) {
          oldPath = existing.filePath;
          await tx.submission.update({
            where: { id: existing.id },
            data: { filePath, fileName, checks, submittedAt: now },
          });
        } else {
          await tx.submission.create({
            data: { assignmentId: a.id, studentId, filePath, fileName, checks, submittedAt: now },
          });
        }
        await issueCertificate(tx, studentId, courseId, now);
      });
    } catch (e) {
      await storage.remove(filePath);
      throw e;
    }
    await storage.remove(oldPath);
    return {
      replaced: !!oldPath,
      state: await studentCourseState(studentId, courseId).then((s) => s.assignment),
    };
  },

  /** Submissions in the instructor's courses, newest first, with the late flag. */
  async list(instructorId: number, q: SubmissionsQuery) {
    const where: Prisma.SubmissionWhereInput = {
      assignment: { course: { instructorId, ...(q.courseId ? { id: q.courseId } : {}) } },
      ...(q.status ? { status: q.status } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        select: submissionSelect,
        orderBy: { submittedAt: 'desc' },
        ...skipTake(q.page, q.pageSize),
      }),
      prisma.submission.count({ where }),
    ]);
    return toPage(rows.map(toView), total, q.page, q.pageSize);
  },

  async view(instructorId: number, id: number) {
    return toView(await loadOwned(instructorId, id));
  },

  /** The student who sent it, or the course's instructor. */
  async file(user: User, id: number) {
    const s = await prisma.submission.findUnique({ where: { id }, select: submissionSelect });
    if (!s) throw new NotFoundError('Submission not found.');
    const allowed =
      (user.role === 'STUDENT' && s.studentId === user.id) ||
      (user.role === 'INSTRUCTOR' && s.assignment.course.instructorId === user.id);
    if (!allowed) throw new ForbiddenError();
    return { bytes: await storage.read(s.filePath), name: s.fileName };
  },

  /** Grade 0 to 100 with feedback. Grading again updates the grade (the student sees the latest). */
  async grade(instructorId: number, id: number, input: GradeInput) {
    await loadOwned(instructorId, id);
    await prisma.submission.update({
      where: { id },
      data: {
        status: 'GRADED',
        grade: input.grade,
        feedback: input.feedback,
        gradedAt: new Date(),
      },
    });
    return toView(await loadOwned(instructorId, id));
  },
};
