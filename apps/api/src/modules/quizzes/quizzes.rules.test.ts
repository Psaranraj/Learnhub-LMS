import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  affectedByEdit,
  checkAnswerCount,
  checkQuestionCount,
  checkReleasable,
  needsNewVersion,
  releaseResult,
  scoreOf,
  type AttemptFact,
} from './quizzes.rules';

// HLD 6, "Quiz edited", and LLD 6, flow 7.
const a = (
  studentId: number,
  attemptNo: number,
  status: AttemptFact['status'],
  passed: boolean | null,
  quizVersion = 1,
): AttemptFact => ({
  studentId,
  attemptNo,
  status,
  passed,
  quizVersion,
});

describe('quiz edit', () => {
  it('counts students waiting for review and students who failed', () => {
    const attempts = [a(1, 1, 'SUBMITTED', null), a(2, 1, 'RELEASED', false), a(3, 1, 'RELEASED', true)];
    assert.equal(affectedByEdit(attempts, 1), 2);
  });
  it('does not count a student who passed, even after a later attempt', () => {
    assert.equal(affectedByEdit([a(1, 1, 'RELEASED', true), a(1, 2, 'RELEASED', false)], 1), 0);
  });
  it('uses the latest released attempt', () => {
    assert.equal(affectedByEdit([a(1, 1, 'RELEASED', false), a(1, 2, 'RELEASED', true)], 1), 0);
  });
  it('ignores attempts on older versions and superseded ones', () => {
    assert.equal(affectedByEdit([a(1, 1, 'SUBMITTED', null, 1), a(2, 1, 'SUPERSEDED', null, 2)], 2), 0);
  });
  it('makes a new version only when attempts exist on the current one', () => {
    assert.equal(needsNewVersion([], 1), false);
    assert.equal(needsNewVersion([a(1, 1, 'RELEASED', true, 1)], 2), false);
    assert.equal(needsNewVersion([a(1, 1, 'SUBMITTED', null, 2)], 2), true);
  });
  it('needs exactly the quiz question count', () => {
    assert.doesNotThrow(() => checkQuestionCount(10, 10));
    assert.throws(() => checkQuestionCount(9, 10), /exactly 10/);
  });
});

describe('answers', () => {
  it('needs one answer per question, blanks allowed', () => {
    assert.doesNotThrow(() => checkAnswerCount(10, 10));
    assert.throws(() => checkAnswerCount(9, 10), /each of the 10/);
  });
  it('counts correct answers; a blank is wrong', () => {
    assert.equal(scoreOf([0, 1, null, 3], [0, 1, 2, 2]), 2);
  });
});

describe('releasing marks', () => {
  it('scores the answers against the pass mark', () => {
    assert.deepEqual(releaseResult([0, 1, 2, null], [0, 1, 2, 3], 3), { score: 3, passed: true });
    assert.deepEqual(releaseResult([0, 0, 0, 0], [0, 1, 2, 3], 3), { score: 1, passed: false });
  });
  it('releases only attempts waiting for review', () => {
    assert.doesNotThrow(() => checkReleasable('SUBMITTED'));
    assert.throws(() => checkReleasable('RELEASED'), { status: 409 });
    assert.throws(() => checkReleasable('SUPERSEDED'), { status: 409 });
  });
});
