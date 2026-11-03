// Platform numbers (design adStats, iDash, pDash). Pure functions over the per-enrollment state the learning module works
// out, so dashboards, reports and the student's own screens always count the same way.

export type EnrollmentFacts = {
  quizStates: string[]; // one per lesson that has a quiz: passed, failed, review, open, locked
  assignment: string; // none, locked, todo, submitted, graded
  certificate: boolean;
};

const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/**
 * Completion rate: enrollments with a certificate. Quiz pass rate: passed out of passed plus not passed (released marks
 * only; attempts waiting for review are not counted). Assignments waiting: submitted and not graded.
 */
export function summarize(rows: EnrollmentFacts[]) {
  let pass = 0,
    fail = 0,
    wait = 0,
    cert = 0;
  for (const r of rows) {
    pass += r.quizStates.filter((s) => s === 'passed').length;
    fail += r.quizStates.filter((s) => s === 'failed').length;
    if (r.assignment === 'submitted') wait++;
    if (r.certificate) cert++;
  }
  return {
    enrollments: rows.length,
    certificates: cert,
    waiting: wait,
    passed: pass,
    failed: fail,
    completionRate: percent(cert, rows.length),
    quizPassRate: percent(pass, pass + fail),
  };
}

/** Average of the per-enrollment progress percentages, rounded. */
export const averagePercent = (values: number[]) =>
  values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;

/** The design caps the alert list at ten items. */
export const ALERT_LIMIT = 10;
