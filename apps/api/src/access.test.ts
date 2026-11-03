import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import Module from 'node:module';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import jwt from 'jsonwebtoken';

// HLD 7 and LLD 3: who may call every endpoint. This runs the real Express app (routes, authenticate, requireRole,
// validation, error handler) with the database replaced by an empty stub, so no MySQL is needed:
//   - without a cookie, every non-public endpoint answers 401;
//   - a role that is not allowed gets 403;
//   - an allowed role gets past the role check (any other answer, usually 400 or 404 from the empty stub).
// A second test reads the route files and fails if an endpoint exists that this table does not list.
// A third group checks ownership (own course, own submission, own certificate): the stub returns a row that belongs
// to someone else, and the service must answer 403.

type Role = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
type Access = 'public' | 'any' | Role[];
const S: Role = 'STUDENT',
  I: Role = 'INSTRUCTOR',
  A: Role = 'ADMIN';
const ROLES: Role[] = [S, I, A];

/** Method, path (":p" for a parameter) and who may call it, from the LLD 3 endpoint table. */
const MATRIX: [string, string, Access][] = [
  // auth
  ['POST', '/api/auth/register', 'public'],
  ['POST', '/api/auth/login', 'public'],
  ['POST', '/api/auth/logout', 'public'],
  ['GET', '/api/auth/me', 'any'],
  ['POST', '/api/auth/forgot-password', 'public'],
  ['POST', '/api/auth/change-password', 'any'],
  // users (admin) and student search (instructor)
  ['GET', '/api/users/reset-requests', [A]],
  ['GET', '/api/users', [A]],
  ['POST', '/api/users', [A]],
  ['PATCH', '/api/users/:p/status', [A]],
  ['POST', '/api/users/:p/reset-password', [A]],
  ['PATCH', '/api/users/:p', [A]],
  ['GET', '/api/students', [I]],
  ['GET', '/api/students/progress', [I]],
  // courses
  ['GET', '/api/courses', 'public'],
  ['GET', '/api/courses/admin', [A]],
  ['GET', '/api/courses/mine', [I]],
  ['POST', '/api/courses', [I]],
  ['GET', '/api/courses/:p', 'public'],
  ['GET', '/api/courses/:p/manage', [I, A]],
  ['PATCH', '/api/courses/:p', [I]],
  ['POST', '/api/courses/:p/lessons', [I]],
  ['PUT', '/api/courses/:p/lessons/order', [I]],
  ['PUT', '/api/courses/:p/assignment', [I]],
  ['DELETE', '/api/courses/:p/assignment', [I]],
  ['POST', '/api/courses/:p/submit', [I]],
  ['POST', '/api/courses/:p/approve', [A]],
  ['POST', '/api/courses/:p/reject', [A]],
  ['POST', '/api/courses/:p/unpublish', [A]],
  ['PATCH', '/api/courses/:p/instructor', [A]],
  // enrollments
  ['GET', '/api/courses/:p/students', [I, A]],
  ['POST', '/api/courses/:p/students', [I]],
  ['GET', '/api/courses/:p/students/:p', [I, A]],
  ['DELETE', '/api/courses/:p/students/:p', [I]],
  ['POST', '/api/courses/:p/enroll', [S]],
  ['GET', '/api/enrollments/mine', [S]],
  // lessons, material, quizzes
  ['PATCH', '/api/lessons/:p', [I]],
  ['DELETE', '/api/lessons/:p', [I]],
  ['POST', '/api/lessons/:p/material', [I]],
  ['DELETE', '/api/lessons/:p/material', [I]],
  ['GET', '/api/lessons/:p/material/file', [I, A]],
  ['GET', '/api/lessons/:p/quiz', [I]],
  ['PUT', '/api/lessons/:p/quiz', [I]],
  ['GET', '/api/lessons/:p/quiz/questions', [S]],
  ['POST', '/api/lessons/:p/quiz/attempts', [S]],
  ['GET', '/api/quizzes/mine', [S]],
  ['GET', '/api/quiz-attempts', [I]],
  ['GET', '/api/quiz-attempts/:p', [S, I]],
  ['POST', '/api/quiz-attempts/:p/release', [I]],
  // learning
  ['GET', '/api/learning/courses/:p', [S]],
  ['POST', '/api/learning/lessons/:p/heartbeat', [S]],
  ['PUT', '/api/learning/lessons/:p/note', [S]],
  ['GET', '/api/learning/lessons/:p/material', [S]],
  // assignments and submissions
  ['GET', '/api/assignments/mine', [S]],
  ['POST', '/api/courses/:p/submission', [S]],
  ['GET', '/api/submissions', [I]],
  ['GET', '/api/submissions/:p', [I]],
  ['GET', '/api/submissions/:p/file', [S, I]],
  ['POST', '/api/submissions/:p/grade', [I]],
  // certificates (the single ones check the owner, course instructor or admin in the service)
  ['GET', '/api/certificates/mine', [S]],
  ['GET', '/api/certificates/progress', [I]],
  ['GET', '/api/certificates', [I, A]],
  ['GET', '/api/certificates/:p', 'any'],
  ['GET', '/api/certificates/:p/download', 'any'],
  ['GET', '/api/certificates/:p/logo', 'any'],
  // dashboards, alerts, reports, settings, activity
  ['GET', '/api/dashboard', 'any'],
  ['GET', '/api/alerts', 'any'],
  ['GET', '/api/reports/overview', [A]],
  ['GET', '/api/reports/instructors', [A]],
  ['GET', '/api/reports/enrollments', [A]],
  ['GET', '/api/settings/logo', 'public'],
  ['GET', '/api/settings', [A]],
  ['PATCH', '/api/settings', [A]],
  ['GET', '/api/activity', [A]],
];

// ---- the database stub --------------------------------------------------------------------------------------------
const CALLER_ID = 1;
let callerRole: Role = S;
/** Rows the stub returns from findUnique/findFirst, by model name (ownership tests). Empty means "not found". */
let rows: Record<string, unknown> = {};

/** Every model method answers "nothing found", except the signed-in user's own row for authenticate. */
function model(name: string) {
  return new Proxy(
    {},
    {
      get: (_t, method: string) => async (args?: { where?: { id?: number } }) => {
        if (name === 'user' && method === 'findUnique' && args?.where?.id === CALLER_ID) {
          return {
            id: CALLER_ID,
            role: callerRole,
            status: 'ACTIVE',
            tokenVersion: 0,
            name: 'Caller',
          };
        }
        if ((method === 'findUnique' || method === 'findFirst') && rows[name]) return rows[name];
        if (method === 'findMany' || method === 'groupBy') return [];
        if (method === 'count') return 0;
        if (method.endsWith('OrThrow')) throw new Error('stub: no rows');
        if (method.startsWith('find')) return null;
        throw new Error(`stub: ${name}.${method} writes nothing`);
      },
    },
  );
}
const prismaStub: unknown = new Proxy(
  {},
  {
    get: (_t, key: string) => {
      if (key === '$transaction')
        return async (fn: unknown) =>
          typeof fn === 'function' ? fn(prismaStub) : Promise.all(fn as Promise<unknown>[]);
      if (key.startsWith('$')) return async () => undefined;
      return model(key);
    },
  },
);

function stubModule(relative: string, exports: object) {
  const id = require.resolve(relative);
  const m = new Module(id);
  m.exports = exports;
  m.loaded = true;
  require.cache[id] = m;
}

// ---- the app ------------------------------------------------------------------------------------------------------
const SECRET = 'test-secret-that-is-at-least-32-characters';
let base = '';
let close: () => void = () => {};

before(async () => {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    CLIENT_URL: 'http://localhost:5173',
    DATABASE_URL: 'mysql://stub',
    JWT_SECRET: SECRET,
  });
  stubModule('./utils/prisma', { prisma: prismaStub });
  stubModule('./utils/logger', { logger: { info() {}, warn() {}, error() {} } });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { app } = require('./app') as { app: import('express').Express };
  await new Promise<void>((resolve) => {
    const server = app.listen(0, () => {
      base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      close = () => server.close();
      resolve();
    });
  });
});
after(() => close());

const cookie = jwt.sign({ sub: String(CALLER_ID), tv: 0 }, SECRET);

async function call(method: string, p: string, signedIn: boolean, body: object = {}) {
  const url = base + p.replaceAll(':p', '99');
  const headers: Record<string, string> = signedIn ? { cookie: `token=${cookie}` } : {};
  const init: RequestInit = { method, headers };
  if (method !== 'GET') {
    headers['content-type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  await res.arrayBuffer();
  return res.status;
}

describe('access to every endpoint', () => {
  for (const [method, p, access] of MATRIX) {
    it(`${method} ${p}`, async () => {
      const anonymous = await call(method, p, false);
      if (access === 'public') assert.notEqual(anonymous, 401, 'public endpoint asked for a sign-in');
      else assert.equal(anonymous, 401, 'answered without a sign-in');
      for (const role of ROLES) {
        callerRole = role;
        const status = await call(method, p, true);
        const allowed = access === 'public' || access === 'any' || access.includes(role);
        if (allowed)
          assert.ok(status !== 401 && status !== 403, `${role} should get past the role check, got ${status}`);
        else assert.equal(status, 403, `${role} should be refused, got ${status}`);
      }
    });
  }
});

describe('the table covers every route', () => {
  it('lists each mounted endpoint exactly once', () => {
    const src = path.resolve(__dirname);
    const mounts = new Map<string, string[]>();
    // \s* allows Prettier to split a long call over several lines.
    for (const m of readFileSync(path.join(src, 'app.ts'), 'utf8').matchAll(
      /app\.use\(\s*'([^']+)',\s*(\w+),?\s*\)/g,
    )) {
      mounts.set(m[2], [...(mounts.get(m[2]) ?? []), m[1]]);
    }
    const found: string[] = [];
    for (const dir of readdirSync(path.join(src, 'modules'))) {
      for (const file of readdirSync(path.join(src, 'modules', dir)).filter((f) => f.endsWith('.routes.ts'))) {
        const text = readFileSync(path.join(src, 'modules', dir, file), 'utf8');
        for (const m of text.matchAll(/^(\w+)\.(get|post|put|patch|delete)\(\s*'([^']*)'/gm)) {
          const at = mounts.get(m[1]);
          assert.ok(at, `${m[1]} in ${file} is not mounted in app.ts`);
          for (const mount of at)
            found.push(`${m[2].toUpperCase()} ${(mount + (m[3] === '/' ? '' : m[3])).replace(/:\w+/g, ':p')}`);
        }
      }
    }
    const listed = MATRIX.map(([method, p]) => `${method} ${p}`);
    assert.deepEqual([...found].sort(), [...listed].sort());
  });
});

// ---- ownership ----------------------------------------------------------------------------------------------------
const OTHER = 2; // another instructor or student; the caller is user 1
const course = (instructorId: number) => ({
  id: 5,
  title: 'Course',
  status: 'PUBLISHED',
  instructorId,
  instructor: { id: instructorId, name: 'Owner' },
  lessons: [],
  enrollments: [],
  certificates: [],
  assignment: null,
  _count: { enrollments: 0 },
});
const lesson = (instructorId: number) => ({
  id: 5,
  courseId: 5,
  title: 'Lesson',
  materialPath: 'm.pdf',
  materialName: 'm.pdf',
  quiz: null,
  course: { status: 'DRAFT', instructorId },
});
const attempt = {
  id: 5,
  studentId: OTHER,
  status: 'SUBMITTED',
  quizVersion: 1,
  attemptNo: 1,
  answers: [],
  student: { id: OTHER, name: 'S', email: 's@x.in' },
  quiz: {
    id: 1,
    title: 'Quiz',
    questionCount: 10,
    passMark: 8,
    lesson: {
      id: 5,
      position: 1,
      title: 'Lesson',
      course: { id: 5, title: 'Course', instructorId: OTHER },
    },
  },
};
const submission = {
  id: 5,
  studentId: OTHER,
  filePath: 'x.pdf',
  fileName: 'x.pdf',
  checks: [true, true],
  status: 'SUBMITTED',
  submittedAt: new Date(),
  student: { id: OTHER, name: 'S', email: 's@x.in' },
  assignment: {
    id: 1,
    title: 'A',
    instructions: '',
    todoItems: [],
    dueDate: null,
    course: { id: 5, title: 'Course', instructorId: OTHER },
  },
};
const certificate = {
  id: 5,
  certificateNo: 'LH-2026-000005',
  studentId: OTHER,
  studentName: 'S',
  courseTitle: 'Course',
  orgName: 'LearnHub',
  title: 'T',
  intro: 'I',
  mid: 'M',
  footer: 'F',
  logoPath: null,
  issuedAt: new Date(),
  student: { email: 's@x.in' },
  course: { id: 5, instructorId: OTHER, instructor: { name: 'Owner' } },
};

/** [who calls, method, path, body, rows the stub returns, refused?]. A row's owner is OTHER unless it says CALLER_ID. */
const OWNERSHIP: [Role, string, string, object, Record<string, unknown>, boolean][] = [
  [I, 'DELETE', '/api/courses/5/assignment', {}, { course: course(OTHER) }, true],
  [I, 'DELETE', '/api/courses/5/assignment', {}, { course: course(CALLER_ID) }, false],
  [I, 'GET', '/api/courses/5/manage', {}, { course: course(OTHER) }, true],
  [A, 'GET', '/api/courses/5/manage', {}, { course: course(OTHER) }, false],
  [I, 'GET', '/api/courses/5/students', {}, { course: course(OTHER) }, true],
  [I, 'GET', '/api/courses/5/students/7', {}, { course: course(OTHER) }, true],
  [I, 'GET', '/api/lessons/5/quiz', {}, { lesson: lesson(OTHER) }, true],
  [I, 'GET', '/api/lessons/5/material/file', {}, { lesson: lesson(OTHER) }, true],
  [I, 'POST', '/api/quiz-attempts/5/release', {}, { quizAttempt: attempt }, true],
  [I, 'GET', '/api/quiz-attempts/5', {}, { quizAttempt: attempt }, true],
  [S, 'GET', '/api/quiz-attempts/5', {}, { quizAttempt: attempt }, true],
  [I, 'POST', '/api/submissions/5/grade', { grade: 80, feedback: 'Good work' }, { submission }, true],
  [I, 'GET', '/api/submissions/5/file', {}, { submission }, true],
  [S, 'GET', '/api/submissions/5/file', {}, { submission }, true],
  [S, 'GET', '/api/certificates/5', {}, { certificate }, true],
  [I, 'GET', '/api/certificates/5/download', {}, { certificate }, true],
  [A, 'GET', '/api/certificates/5', {}, { certificate }, false],
  [S, 'GET', '/api/learning/courses/5', {}, { course: course(OTHER) }, true],
];

describe('ownership', () => {
  for (const [role, method, p, body, data, refused] of OWNERSHIP) {
    it(`${role} ${method} ${p}: ${refused ? 'refused' : 'allowed'}`, async () => {
      callerRole = role;
      rows = data;
      try {
        const status = await call(method, p, true, body);
        if (refused) assert.equal(status, 403, `expected 403, got ${status}`);
        else assert.ok(status !== 401 && status !== 403, `expected to get through, got ${status}`);
      } finally {
        rows = {};
      }
    });
  }
});
