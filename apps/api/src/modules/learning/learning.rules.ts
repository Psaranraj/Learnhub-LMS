import { HEARTBEAT_SECONDS, VIDEO_UNLOCK_PERCENT } from '@learnhub/shared';

// HLD 6 ("Topic unlock and watch tracking", "Quiz", "Retake") and LLD 1 ("Derived, not stored").
// Pure functions: the services load the rows, these decide. Tested in learning.rules.test.ts.

/**
 * Seconds of video to credit for one heartbeat. The server trusts the clock, not the browser: at most twice the real
 * time since the last heartbeat (2x playback), and a long gap (pause, closed tab) counts as one interval at most.
 */
export function creditFor(watchedSec: number, lastReportAt: Date | null, now: Date): number {
  const gap = lastReportAt ? (now.getTime() - lastReportAt.getTime()) / 1000 : Infinity;
  const elapsed = gap > 60 || gap < 0 ? HEARTBEAT_SECONDS : Math.min(gap, HEARTBEAT_SECONDS * 1.5);
  return Math.max(0, Math.min(watchedSec, elapsed * 2));
}

export const durationSec = (durationMin: number) => Math.max(1, durationMin * 60);
export const watchPercent = (watchedSeconds: number, durationMin: number) =>
  Math.min(100, Math.floor((watchedSeconds / durationSec(durationMin)) * 100));
export const reachesUnlock = (watchedSeconds: number, durationMin: number) =>
  watchedSeconds >= (VIDEO_UNLOCK_PERCENT / 100) * durationSec(durationMin);

export type AttemptRow = {
  id: number;
  quizVersion: number;
  attemptNo: number;
  status: 'SUBMITTED' | 'RELEASED' | 'SUPERSEDED';
  score: number | null;
  passed: boolean | null;
};
export type QuizState = 'none' | 'locked' | 'open' | 'review' | 'passed' | 'failed';

/**
 * Quiz state of one topic for one student (LLD 1): Passed if any released attempt passed (any version); else In review
 * if an attempt waits on the current version; else Locked without 70%; else Not passed if the latest released attempt
 * on the current version failed; else Received (open).
 */
export function quizState(
  quiz: { version: number } | null,
  reached: boolean,
  attempts: AttemptRow[],
): { state: QuizState; attempt: AttemptRow | null } {
  if (!quiz) return { state: 'none', attempt: null };
  const passed = attempts
    .filter((a) => a.status === 'RELEASED' && a.passed)
    .sort((a, b) => b.attemptNo - a.attemptNo)[0];
  if (passed) return { state: 'passed', attempt: passed };
  const current = attempts.filter((a) => a.quizVersion === quiz.version).sort((a, b) => b.attemptNo - a.attemptNo);
  const waiting = current.find((a) => a.status === 'SUBMITTED');
  if (waiting) return { state: 'review', attempt: waiting };
  if (!reached) return { state: 'locked', attempt: null };
  const released = current.find((a) => a.status === 'RELEASED');
  if (released && released.passed === false) return { state: 'failed', attempt: released };
  return { state: 'open', attempt: null };
}

/** A new attempt: topic open, 70% reached, not passed, nothing waiting for review (HLD 6, "Retake"). */
export const canAttempt = (topicOpen: boolean, state: QuizState) =>
  topicOpen && (state === 'open' || state === 'failed');

/** Topic 1 is open; every other topic opens when the previous video reached 70%. */
export const topicOpen = (index: number, previousReached: boolean) => index === 0 || previousReached;

export type AssignmentState = 'none' | 'locked' | 'todo' | 'submitted' | 'graded';

/** HLD 6, "Assignment": locked until every topic quiz is passed, then To do, Submitted or Graded. */
export function assignmentState(
  hasAssignment: boolean,
  allQuizzesPassed: boolean,
  submission: { status: 'SUBMITTED' | 'GRADED' } | null,
): AssignmentState {
  if (!hasAssignment) return 'none';
  if (submission) return submission.status === 'GRADED' ? 'graded' : 'submitted';
  return allQuizzesPassed ? 'todo' : 'locked';
}

/** The due date is a guide: a late submission is accepted and only flagged (HLD 8, decision 14). Due dates are whole days (UTC). */
export const isLate = (dueDate: Date | null, submittedAt: Date) =>
  !!dueDate && submittedAt.getTime() > dueDate.getTime() + 24 * 60 * 60 * 1000 - 1;
