import { ConflictError, ValidationError } from '../../utils/errors';

// HLD 6, "Quiz edited" (LLD 6, flow 7). Pure functions, so they can be tested without a database.
export type AttemptFact = {
  studentId: number;
  quizVersion: number;
  attemptNo: number;
  status: 'SUBMITTED' | 'RELEASED' | 'SUPERSEDED';
  passed: boolean | null;
};

/**
 * Students a new version affects: those waiting for review on the current version, and those whose latest
 * released attempt on the current version failed. A student who ever passed keeps the pass and is not counted.
 */
export function affectedByEdit(attempts: AttemptFact[], currentVersion: number): number {
  const passedEver = new Set(attempts.filter((a) => a.status === 'RELEASED' && a.passed).map((a) => a.studentId));
  const affected = new Set<number>();
  const latestReleased = new Map<number, AttemptFact>();
  for (const a of attempts) {
    if (a.quizVersion !== currentVersion || passedEver.has(a.studentId)) continue;
    if (a.status === 'SUBMITTED') affected.add(a.studentId);
    if (a.status === 'RELEASED') {
      const seen = latestReleased.get(a.studentId);
      if (!seen || a.attemptNo > seen.attemptNo) latestReleased.set(a.studentId, a);
    }
  }
  for (const [studentId, a] of latestReleased) if (a.passed === false) affected.add(studentId);
  return affected.size;
}

/** A new version is needed only when attempts exist on the current one; otherwise questions are replaced in place. */
export const needsNewVersion = (attempts: AttemptFact[], currentVersion: number) =>
  attempts.some((a) => a.quizVersion === currentVersion);

/** Exactly questionCount questions (copied from settings when the quiz was made). */
export function checkQuestionCount(sent: number, expected: number) {
  if (sent !== expected)
    throw new ValidationError(`A quiz needs exactly ${expected} questions. You sent ${sent}.`, {
      questions: `Write all ${expected} questions.`,
    });
}

/** One answer per question; blanks are allowed and count as wrong (HLD 6, "Quiz"). */
export function checkAnswerCount(sent: number, expected: number) {
  if (sent !== expected)
    throw new ValidationError(`Send one answer for each of the ${expected} questions (blank answers are allowed).`);
}

/** Correct answers in an attempt. Used when the instructor reviews and releases marks. */
export const scoreOf = (answers: (number | null)[], correct: number[]) =>
  correct.reduce((n, c, i) => n + (answers[i] === c ? 1 : 0), 0);

/** Release (HLD 6, "Quiz review"): the score is the count of correct answers, passed when it reaches the quiz's pass mark. */
export function releaseResult(answers: (number | null)[], correct: number[], passMark: number) {
  const score = scoreOf(answers, correct);
  return { score, passed: score >= passMark };
}

/** Only an attempt waiting for review can be released. A superseded one belongs to an older version of the quiz. */
export function checkReleasable(status: 'SUBMITTED' | 'RELEASED' | 'SUPERSEDED') {
  if (status === 'SUPERSEDED')
    throw new ConflictError(
      'The quiz was changed after this attempt, so it cannot be released. The student takes the new quiz.',
    );
  if (status === 'RELEASED') throw new ConflictError('Marks for this attempt are already released.');
}
