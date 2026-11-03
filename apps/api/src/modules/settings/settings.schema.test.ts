import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { settingsSchema } from '@learnhub/shared';

// Design adSetSave: every wording line is required; 1 to 50 questions; the pass mark is between 1 and the question count.
const base = {
  orgName: 'LearnHub',
  certTitle: 'Certificate of completion',
  certIntro: 'This certifies that',
  certMid: 'has successfully completed',
  certFooter: 'Issued by LearnHub',
  quizQuestionCount: '10',
  quizPassMark: '8',
};

describe('settings', () => {
  it('accepts the multipart text form and converts the numbers', () => {
    const r = settingsSchema.parse(base);
    assert.equal(r.quizQuestionCount, 10);
    assert.equal(r.quizPassMark, 8);
    assert.equal(r.removeLogo, false);
  });
  it('requires every certificate line', () => {
    assert.equal(settingsSchema.safeParse({ ...base, certFooter: '  ' }).success, false);
  });
  it('keeps the question count between 1 and 50', () => {
    assert.equal(settingsSchema.safeParse({ ...base, quizQuestionCount: '51', quizPassMark: '8' }).success, false);
    assert.equal(settingsSchema.safeParse({ ...base, quizQuestionCount: '0' }).success, false);
  });
  it('refuses a pass mark above the question count', () => {
    const r = settingsSchema.safeParse({ ...base, quizQuestionCount: '5', quizPassMark: '6' });
    assert.equal(r.success, false);
    assert.deepEqual(r.error?.issues[0]?.path, ['quizPassMark']);
  });
  it('reads removeLogo from the form text', () => {
    assert.equal(settingsSchema.parse({ ...base, removeLogo: 'true' }).removeLogo, true);
  });
});
