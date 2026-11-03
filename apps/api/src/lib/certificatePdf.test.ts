import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { certificatePdf } from './certificatePdf';

const base = {
  certificateNo: 'LH-2026-000001',
  courseTitle: 'Python Basics',
  instructorName: 'Priya Nair',
  orgName: 'LearnHub',
  title: 'Certificate of completion',
  intro: 'This certifies that',
  mid: 'has successfully completed',
  footer: 'Issued by LearnHub',
  issuedAt: new Date('2026-10-27T00:00:00Z'),
  logo: null,
};

// HLD 8, decision 9: the PDF is built on the server from the saved snapshot.
describe('certificate PDF', () => {
  it('builds a PDF for a Latin name', async () => {
    const b = await certificatePdf({ ...base, studentName: 'Riya Sharma' });
    assert.equal(b.subarray(0, 5).toString('latin1'), '%PDF-');
  });
  it('falls back to the default mark when the logo cannot be drawn', async () => {
    const b = await certificatePdf({
      ...base,
      studentName: 'Riya Sharma',
      logo: Buffer.from('RIFF0000WEBPnotreally'),
    });
    assert.equal(b.subarray(0, 5).toString('latin1'), '%PDF-');
  });
});
