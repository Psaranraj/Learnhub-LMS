import type { EnrollmentSource } from '@prisma/client';
import { ConflictError } from '../../utils/errors';

// HLD 6, "Enrollment". Pure functions.

/** Instructors remove only the students they added free (source ASSIGNED). Self-enrolled students stay. */
export function checkRemovable(source: EnrollmentSource) {
  if (source !== 'ASSIGNED')
    throw new ConflictError('Only students you added can be removed. Self-enrolled students stay in the course.');
}

/** Progress of one student in one course: passed topics out of all topics, and where they are. */
export function progressOf(passed: number, total: number, started: boolean, certificate: boolean) {
  const percent = total ? Math.round((passed / total) * 100) : 0;
  const state = certificate ? 'done' : started ? 'prog' : 'new';
  return { passed, total, percent, state } as const;
}

/** Students and progress (design iStud): needs my review (a quiz to release or a PDF to grade), completed, or in progress. */
export function progressRowState(
  quizzesToReview: number,
  assignment: string,
  certificateIssued: boolean,
): 'review' | 'done' | 'prog' {
  if (quizzesToReview > 0 || assignment === 'submitted') return 'review';
  return certificateIssued ? 'done' : 'prog';
}
