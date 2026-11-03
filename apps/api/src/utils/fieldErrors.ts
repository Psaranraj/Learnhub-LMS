import type { FieldErrors } from './errors';

type Issue = { path: (string | number)[]; message: string };

/** Turns validation issues into { field: message }, keeping the first message per field. */
export function toFieldErrors(issues: Issue[]): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path.join('.') || '_';
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
