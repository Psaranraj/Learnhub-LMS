import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkRemovable, progressOf, progressRowState } from './enrollments.rules';

describe('enrollments', () => {
  it('removes only students the instructor added', () => {
    assert.doesNotThrow(() => checkRemovable('ASSIGNED'));
    assert.throws(() => checkRemovable('SELF'), /Self-enrolled/);
  });
  it('works out progress from passed topics', () => {
    assert.deepEqual(progressOf(2, 3, true, false), {
      passed: 2,
      total: 3,
      percent: 67,
      state: 'prog',
    });
    assert.equal(progressOf(0, 3, false, false).state, 'new');
    assert.equal(progressOf(3, 3, true, true).state, 'done');
    assert.equal(progressOf(0, 0, false, false).percent, 0);
  });
});

describe('students and progress row state', () => {
  it('needs review when a quiz waits or a PDF is submitted', () => {
    assert.equal(progressRowState(1, 'locked', false), 'review');
    assert.equal(progressRowState(0, 'submitted', true), 'review');
  });
  it('is completed once graded with a certificate, otherwise in progress', () => {
    assert.equal(progressRowState(0, 'graded', true), 'done');
    assert.equal(progressRowState(0, 'todo', false), 'prog');
  });
});
