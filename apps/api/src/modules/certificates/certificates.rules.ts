// HLD 6, "Certificate" (v3: issued automatically on the first submission, no approval). Pure functions.

/** LH-2026-000123: the year of issue and the row id, six digits. */
export const certificateNumber = (id: number, issuedAt: Date) =>
  `LH-${issuedAt.getUTCFullYear()}-${String(id).padStart(6, '0')}`;

/** Instructor certificate tracking (design iCert): issued, in progress (any watch, attempt or submission), or not started. */
export const certificateState = (issued: boolean, started: boolean) =>
  issued ? 'issued' : started ? 'progress' : 'new';

/** Progress to the certificate: each passed quiz is one step and the submitted assignment is the last one. */
export const certificateProgress = (passed: number, total: number, submitted: boolean) =>
  Math.round(((passed + (submitted ? 1 : 0)) / (total + 1)) * 100);

/** Inclusive date filter on whole days (UTC), for "Issued from" and "to". */
export const dayRange = (from?: string, to?: string) => ({
  ...(from ? { gte: new Date(`${from}T00:00:00Z`) } : {}),
  ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
});
