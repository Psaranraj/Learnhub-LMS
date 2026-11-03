import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { averagePercent, summarize } from './reports.rules';

// Design adStats and HLD 6 ("Reports"): the same counting on the dashboard and the Reports page.
describe('platform numbers', () => {
  const rows = [
    { quizStates: ['passed', 'passed', 'passed'], assignment: 'graded', certificate: true },
    { quizStates: ['passed', 'failed', 'review'], assignment: 'locked', certificate: false },
    { quizStates: ['passed', 'passed', 'passed'], assignment: 'submitted', certificate: true },
    { quizStates: ['locked', 'locked', 'locked'], assignment: 'locked', certificate: false },
  ];
  it('counts completion from certificates', () => {
    const s = summarize(rows);
    assert.equal(s.enrollments, 4);
    assert.equal(s.certificates, 2);
    assert.equal(s.completionRate, 50);
  });
  it('counts the pass rate from released marks only', () => {
    const s = summarize(rows);
    assert.equal(s.passed, 7);
    assert.equal(s.failed, 1);
    assert.equal(s.quizPassRate, 88);
  });
  it('counts assignments waiting for grading', () => {
    assert.equal(summarize(rows).waiting, 1);
  });
  it('is zero, not NaN, with nothing to count', () => {
    assert.deepEqual(summarize([]), {
      enrollments: 0,
      certificates: 0,
      waiting: 0,
      passed: 0,
      failed: 0,
      completionRate: 0,
      quizPassRate: 0,
    });
    assert.equal(averagePercent([]), 0);
    assert.equal(averagePercent([100, 33, 0]), 44);
  });
});
