import type { CourseStatus, Role, UserStatus } from '@prisma/client';
import { ConflictError, ForbiddenError, ValidationError } from '../../utils/errors';

// Course status machine (LLD 2). Admin moves: Pending review -> Published or Rejected; Published -> Draft.
export const checkApprove = (status: CourseStatus) => {
  if (status !== 'PENDING_REVIEW') throw new ConflictError('Only a course waiting for review can be approved.');
};
export const checkReject = (status: CourseStatus) => {
  if (status !== 'PENDING_REVIEW') throw new ConflictError('Only a course waiting for review can be rejected.');
};
export const checkUnpublish = (status: CourseStatus) => {
  if (status !== 'PUBLISHED') throw new ConflictError('Only a published course can be unpublished.');
};
/** The new instructor must be an active instructor account. */
export const checkNewInstructor = (user: { role: Role; status: UserStatus } | null) => {
  if (!user || user.role !== 'INSTRUCTOR') throw new ConflictError('Choose an instructor.');
  if (user.status !== 'ACTIVE') throw new ConflictError('This instructor account is inactive.');
};

// ---------- Instructor moves (HLD 6, "Course status" and "Editing a Published course") ----------

/** Only the course's own instructor may change it. */
export const checkOwner = (instructorId: number, userId: number) => {
  if (instructorId !== userId) throw new ForbiddenError('Only the instructor of this course can change it.');
};

/** While Pending review the builder is locked. Details, lesson content, material, quiz and assignment text can change otherwise. */
export const checkEditable = (status: CourseStatus) => {
  if (status === 'PENDING_REVIEW')
    throw new ConflictError('This course is waiting for admin approval, so editing is locked.');
};

/** Adding, deleting or reordering lessons and removing the assignment: Draft or Rejected only. */
export const checkStructure = (status: CourseStatus) => {
  checkEditable(status);
  if (status === 'PUBLISHED') {
    throw new ConflictError(
      'A published course keeps its lessons and assignment. Ask the admin to unpublish it to change the structure.',
    );
  }
};

/** Submit for approval: Draft or Rejected, and every readiness item done. */
export const checkSubmit = (status: CourseStatus, missing: string[]) => {
  if (status === 'PENDING_REVIEW') throw new ConflictError('This course is already waiting for approval.');
  if (status === 'PUBLISHED') throw new ConflictError('This course is already published.');
  if (missing.length) throw new ConflictError(`Finish these first: ${missing.join('; ')}.`);
};

/** The new order must name every lesson of the course exactly once. */
export const checkOrder = (current: number[], next: number[]) => {
  const same =
    current.length === next.length && new Set(next).size === next.length && next.every((id) => current.includes(id));
  if (!same) throw new ValidationError('Send every lesson of this course exactly once.');
};
