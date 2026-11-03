// Errors follow HLD 7: { code, message, fieldErrors? }.
export type FieldErrors = Record<string, string>;

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors?: FieldErrors,
  ) {
    super(message);
  }
}
export class ValidationError extends AppError {
  constructor(message: string, fieldErrors?: FieldErrors) {
    super(400, 'VALIDATION_ERROR', message, fieldErrors);
  }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'Please sign in.') {
    super(401, 'UNAUTHORIZED', message);
  }
}
export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this.') {
    super(403, 'FORBIDDEN', message);
  }
}
export class NotFoundError extends AppError {
  constructor(message = 'Not found.') {
    super(404, 'NOT_FOUND', message);
  }
}
export class ConflictError extends AppError {
  constructor(message: string, fieldErrors?: FieldErrors) {
    super(409, 'CONFLICT', message, fieldErrors);
  }
}
export class PayloadTooLargeError extends AppError {
  constructor(message = 'The file or request is too large.') {
    super(413, 'FILE_TOO_LARGE', message);
  }
}
export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many attempts. Try again later.') {
    super(429, 'TOO_MANY_REQUESTS', message);
  }
}
