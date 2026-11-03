import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { certificateNumber, certificateProgress, certificateState, dayRange } from './certificates.rules';

// HLD 6, "Certificate" (v3: issued on the first submission) and the instructor tracking in design iCert.
describe('certificate rules', () => {
  it('numbers certificates by year and row id, six digits', () => {
    assert.equal(certificateNumber(123, new Date('2026-10-27T10:00:00Z')), 'LH-2026-000123');
    assert.equal(certificateNumber(1234567, new Date('2027-01-01T00:00:00Z')), 'LH-2027-1234567');
  });
  it('tracks issued, in progress and not started', () => {
    assert.equal(certificateState(true, true), 'issued');
    assert.equal(certificateState(false, true), 'progress');
    assert.equal(certificateState(false, false), 'new');
  });
  it('counts each passed quiz and the submission as one step each', () => {
    assert.equal(certificateProgress(0, 3, false), 0);
    assert.equal(certificateProgress(3, 3, false), 75);
    assert.equal(certificateProgress(3, 3, true), 100);
  });
  it('makes date filters inclusive of whole days', () => {
    const r = dayRange('2026-10-01', '2026-10-31');
    assert.equal(r.gte?.toISOString(), '2026-10-01T00:00:00.000Z');
    assert.equal(r.lte?.toISOString(), '2026-10-31T23:59:59.999Z');
    assert.deepEqual(dayRange(), {});
  });
});
