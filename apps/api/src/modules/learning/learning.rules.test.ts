import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assignmentState,
  canAttempt,
  creditFor,
  isLate,
  quizState,
  reachesUnlock,
  topicOpen,
  watchPercent,
  type AttemptRow,
} from './learning.rules';

// HLD 6 ("Topic unlock and watch tracking", "Quiz", "Retake") and LLD 1 (derived quiz state).
const t0 = new Date('2026-10-27T10:00:00Z');
const after = (s: number) => new Date(t0.getTime() + s * 1000);

describe('watch credit', () => {
  it('credits real playback at normal speed', () => {
    assert.equal(creditFor(10, t0, after(10)), 10);
  });
  it('allows up to 2x speed', () => {
    assert.equal(creditFor(20, t0, after(10)), 20);
  });
  it('never credits more than twice the real time (a forged number gains nothing)', () => {
    assert.equal(creditFor(600, t0, after(10)), 20);
  });
  it('treats the first heartbeat or a long pause as one interval', () => {
    assert.equal(creditFor(600, null, t0), 20);
    assert.equal(creditFor(600, t0, after(3600)), 20);
  });
  it('caps a slow heartbeat at one and a half intervals', () => {
    assert.equal(creditFor(600, t0, after(40)), 30);
  });
});

describe('unlock', () => {
  it('unlocks at 70% of the duration', () => {
    assert.equal(reachesUnlock(419, 10), false);
    assert.equal(reachesUnlock(420, 10), true);
    assert.equal(watchPercent(420, 10), 70);
    assert.equal(watchPercent(9999, 10), 100);
  });
  it('opens topic 1, and the next topic only after the previous one reached 70%', () => {
    assert.equal(topicOpen(0, false), true);
    assert.equal(topicOpen(1, false), false);
    assert.equal(topicOpen(1, true), true);
  });
});

const at = (
  id: number,
  attemptNo: number,
  status: AttemptRow['status'],
  passed: boolean | null,
  quizVersion = 1,
  score: number | null = null,
): AttemptRow => ({ id, attemptNo, status, passed, quizVersion, score });

describe('quiz state', () => {
  const quiz = { version: 1 };
  it('is locked before 70%, open after', () => {
    assert.equal(quizState(quiz, false, []).state, 'locked');
    assert.equal(quizState(quiz, true, []).state, 'open');
  });
  it('waits for review after a submit', () => {
    assert.equal(quizState(quiz, true, [at(1, 1, 'SUBMITTED', null)]).state, 'review');
  });
  it('is not passed after a failed release, and can be retaken', () => {
    const s = quizState(quiz, true, [at(1, 1, 'RELEASED', false, 1, 5)]);
    assert.equal(s.state, 'failed');
    assert.equal(canAttempt(true, s.state), true);
  });
  it('stays passed after any passed release, even on an older version', () => {
    assert.equal(quizState({ version: 2 }, true, [at(1, 1, 'RELEASED', true, 1, 9)]).state, 'passed');
  });
  it('a failed attempt on an old version does not count on the new one', () => {
    assert.equal(quizState({ version: 2 }, true, [at(1, 1, 'RELEASED', false, 1)]).state, 'open');
  });
  it('a superseded attempt is ignored', () => {
    assert.equal(quizState({ version: 2 }, true, [at(1, 1, 'SUPERSEDED', null, 1)]).state, 'open');
  });
  it('no new attempt while one waits, after a pass, or on a locked topic', () => {
    assert.equal(canAttempt(true, 'review'), false);
    assert.equal(canAttempt(true, 'passed'), false);
    assert.equal(canAttempt(false, 'open'), false);
  });
});

describe('assignment state', () => {
  it('is locked until every topic quiz is passed', () => {
    assert.equal(assignmentState(true, false, null), 'locked');
    assert.equal(assignmentState(true, true, null), 'todo');
  });
  it('follows the submission', () => {
    assert.equal(assignmentState(true, true, { status: 'SUBMITTED' }), 'submitted');
    assert.equal(assignmentState(true, true, { status: 'GRADED' }), 'graded');
  });
  it('is none when the course has no assignment', () => {
    assert.equal(assignmentState(false, true, null), 'none');
  });
});

describe('late submissions', () => {
  const due = new Date('2026-10-20T00:00:00Z');
  it('is on time any time on the due date', () => {
    assert.equal(isLate(due, new Date('2026-10-20T23:59:59Z')), false);
  });
  it('is late from the next day', () => {
    assert.equal(isLate(due, new Date('2026-10-21T00:00:00Z')), true);
  });
  it('is never late without a due date', () => {
    assert.equal(isLate(null, new Date('2030-01-01T00:00:00Z')), false);
  });
});
