# LearnHub: port to UI v8 + HLD/LLD v3

## Done (this drop, web app only)

- Shared components (LLD 5): Card, StatCard/StatGrid, PageHeader, Modal, Table/Td, Tabs, EmptyState, QuickMove. Badge gets a neutral tone and darker green/red text for contrast.
- Base styles: 14px body, visible keyboard focus ring, reduced-motion support.
- Layout shell: v8 menus per role, breadcrumb, Alerts button + modal (GET /alerts), temporary-password banner (non-blocking, links to Account settings), mobile menu strip.
- Account settings (`/<role>/account`): details read-only, password change only (HLD 6). Replaces the old Profile page.
- Placeholder screens: Instructor Certificates, Admin Settings.

## Done (phase 2: database)

- `apps/api/prisma/schema.prisma`: the 14 tables of LLD 1 (users with tokenVersion, courses with category/level enums, lessons, quizzes with version, quiz_questions, quiz_attempts with SUPERSEDED, assignments, submissions, enrollments, lesson_progress with reachedAt, certificates snapshot, password_reset_requests, activity_logs, settings).
- `apps/api/prisma/seed.ts`: recreates the v8 demo data. Checked against v8: 11 users (10 active), 7 courses (5 published, 2 pending), 14 enrollments, 21 quizzes x 10 questions, 5 certificates, 2 assignments to grade, 1 quiz to review. Quiz questions are placeholders.
- `packages/shared/src/constants.ts`: enum values for both apps.

Setup after this change: the schema is new, so reset the database (`prisma migrate reset`) or create an empty one, then `prisma migrate dev --name init` and `prisma:seed`.

## Done (phase 3: auth)

- Sessions: JWT in an httpOnly cookie for 12 hours, no refresh. The token holds only the user id and `tokenVersion`; every request loads the user, so a token stops working when the account is inactive or the password changed/was reset. The role comes from the database.
- Endpoints (LLD 3): register, login, logout, me, forgot-password (one open reset request per user, same answer for any email), change-password (new must differ from current; raises tokenVersion; fresh cookie). `PATCH /auth/profile` is removed.
- Limits: login 10 failed tries / 15 min per address and email; forgot-password 5 / hour per address; state-changing routes accept only JSON or multipart.
- Errors now follow HLD 7: `{ code, message, fieldErrors? }` (web `useApi` updated). Added 413 and 429 errors.
- `lib/password.ts`: hash/verify, 12-character temporary password, constant-time login for unknown emails.
- Old modules moved to `apps/api/legacy/` (not compiled). `app.ts` mounts health + auth only, so the API now compiles and runs; every other screen's data call returns 404 until its phase.
- Admin account safeguards (cannot deactivate or demote yourself) belong to the users module, so they come in phase 4.

## Done (phase 4: admin)

API (all admin-only unless noted; lists take page and pageSize and return items, total, page, pageSize):

- Users: `GET /users` (search, role, status), `POST /users` (server-made 12-character temporary password, returned once), `PATCH /users/:id` (name, email, role), `PATCH /users/:id/status`, `POST /users/:id/reset-password` (raises tokenVersion, closes open reset requests), `GET /users/reset-requests`.
- Safeguards (pure functions, tested): no self role change, deactivate or reset; an instructor who owns courses cannot be deactivated or change role; at least one active admin always remains.
- Courses: `GET /courses/admin` (pending first), `GET /courses/:id/manage` (admin or owner; full course plus readiness checklist), `POST /courses/:id/approve | reject | unpublish`, `PATCH /courses/:id/instructor`. Each change and its log entry run in one transaction.
- Activity: `GET /activity` (search, type). Log lines match the design ("Approved course ...", "Created instructor account: ...").
- `validate` now checks params and query too (parsed values are in `res.locals`). `readiness.ts` is the single "ready to submit" rule (phase 5 reuses it). Video links must be https YouTube or Vimeo.
  Web: Users and roles (create, edit, reset, deactivate, temporary-password dialog, open reset requests), Courses and approvals (filters, instructor select, approve, reject with reason, unpublish), Course review page, Activity log. Added Pager, ConfirmModal, danger button.
- Removed: admin Enrollments and Certificate approvals pages. Admin Certificates is a placeholder until phase 7.
- The Activity log link sits on the Users page until the admin dashboard (phase 8) gets its "View activity log" button.
- (Superseded by phase 4.1: the temporary password is editable, mobile is optional for students only, and the instructor name is locked.)

## Done (phase 4.1: aligned with HLD/LLD v3)

Backend

- `ActivityLog.actorId` is optional (schema change: run `prisma migrate dev --name v3-activity-actor`). Registration logs
  "New student registered: name" (Self-registration) and a new forgot-password request logs "Password reset requested by name" (Sign-in page).
- `POST /users` and `POST /users/:id/reset-password` accept an optional `temporaryPassword`; without it the server makes one.
- Admin may create a Student; mobile is optional and kept only for students.
- An instructor who owns courses can be deactivated (the screen warns, courses stay). Role change is still blocked, and the name is locked.
- Rule tests: `pnpm test` (13 tests on account safeguards).

Web

- `services/` (apiClient, authService, userService, courseService, reportService). `useApi(serviceFn)` returns
  data, loading, error, fieldErrors and `run`. No page imports Axios.
- Folders as in HLD 3: `app/` (routes, role guard, layout, alerts), `features/{public,auth,admin}`, `utils/`. `App.tsx` runs the
  `/auth/me` bootstrap.
- Routes: `/<role>/dashboard` is the landing page; `/<role>/account` for every role. Screens of later phases show "Coming in phase N".
- Users and roles: Student in the create form, editable temporary password with Generate (create and reset), deactivation warning with
  the course count, name lock, field errors.
- Permissions page shows the design's role matrix (read-only).
- Unbuilt screens moved to `apps/web/legacy` (not compiled). Removed: doubts, bookmarks, material list, certificate approval
  and the old permissions list from `packages/shared`.
- Root scripts: `pnpm dev`, `pnpm dev:api`, `pnpm dev:web`, `pnpm typecheck`, `pnpm test`.

## Done (phase 5: instructor)

API (owner checks in the service; HLD 6 rules in courses.rules.ts, quizzes.rules.ts, enrollments.rules.ts)

- Courses: `GET /courses` (published, public), `GET /courses/:id` (public view: no video links, materials, quiz or assignment text),
  `GET /courses/mine`, `POST /courses` (Draft), `PATCH /courses/:id` (locked while Pending review), `POST /courses/:id/submit`
  (readiness check, then Pending review; clears the reject reason).
- Lessons: `POST /courses/:id/lessons`, `PATCH /lessons/:id`, `DELETE /lessons/:id` (409 CONFIRM_REQUIRED with the student count when
  students have progress; `?confirm=true` deletes), `PUT /courses/:id/lessons/order` (renumbers in one transaction).
  Add, delete and reorder only in Draft or Rejected; a published course keeps its structure (HLD 6).
- Material: `POST /lessons/:id/material` (multipart field "file", PDF checked by its header, 20 MB), `DELETE /lessons/:id/material`,
  `GET /lessons/:id/material/file` (owner or admin). Files are stored by `lib/storage.ts` under `apps/api/storage` (STORAGE_DIR).
- Assignment: `PUT /courses/:id/assignment` (title, instructions, two to-do items, optional due date), `DELETE /courses/:id/assignment`
  (Draft or Rejected, and not after a student submitted).
- Quiz editor: `GET /lessons/:id/quiz`, `PUT /lessons/:id/quiz` (`?dryRun=true` returns the affected students). A new quiz copies the
  count and pass mark from settings. With attempts on the current version a new version is made and waiting attempts become SUPERSEDED.
- Students: `GET /students` (active students; excludeCourseId, onlyNew), `GET /courses/:id/students` (progress and certificate),
  `POST /courses/:id/students` (ASSIGNED), `DELETE /courses/:id/students/:studentId` (ASSIGNED only).
- Tests: 31 rule tests (`pnpm test`).

Web

- Courses (My courses and Browse tabs, Create course), Course details (Overview and Students tabs), Course builder (details, students,
  lessons with order and material, quiz editor, assignment, readiness checklist, Save draft, Submit for approval, reject reason).
- Quiz editor: the instructor writes every question; the design's "Fill sample questions" button is left out (HLD 8, decision 6).
  Saving an existing quiz first asks how many students are affected and shows the design's warning.
- Instructor "Students and progress" and "Certificates" stay placeholders until phase 7 (they need quiz review and submissions).

Setup after this change: `pnpm install` (adds multer), then `prisma migrate dev` if the phase 4.1 migration was not run yet.

## Done (phase 6: student)

API

- `POST /courses/:id/enroll` (published only; 409 when already enrolled), `GET /enrollments/mine` (progress, next topic,
  Completed when a certificate exists).
- Learning: `GET /learning/courses/:id` (topic lock, watch percent, quiz state, note; video link and material only for open
  topics), `POST /learning/lessons/:id/heartbeat`, `PUT /learning/lessons/:id/note`, `GET /learning/lessons/:id/material`.
- Heartbeat (HLD 6): body `{ positionSec, watchedSec }`, sent every 10 s while playing and on pause. The server credits at most
  twice the real time since the last heartbeat (a long gap counts as one interval) and sets `reachedAt` once at 70%.
  Note: v3 names only `positionSec`; `watchedSec` (real playback the player counted) is added so the server can refuse
  seeking forward without a new column.
- Quizzes: `GET /quizzes/mine`, `GET /lessons/:id/quiz/questions` (no correct answers; refused when locked, passed or waiting),
  `POST /lessons/:id/quiz/attempts` (SUBMITTED, next attemptNo; checked again inside a transaction), `GET /quiz-attempts/:id`
  (the student's own; score and correct answers only after release).
- One function works out every topic's state (`studentCourseState` in learning.service.ts), used by the workspace, My courses
  and the quiz list. Rules in learning.rules.ts; 47 rule tests in total.

Web

- Public home (hero, filters, cards) and course detail. Enroll sends a visitor to sign in or register and back to
  `/student/courses/:id?enroll=1`, which finishes the enrollment.
- Student: My courses (My courses and Browse tabs), All courses, Course detail with topic states, Learning workspace
  (YouTube or Vimeo player with heartbeats, previous and next topic, quiz box, topic list, notes, material download),
  Quizzes, quiz rules and ready dialogs, attempt (number strip, confirm with warnings, leave-page warning) and the answers page.

## Done (phase 7: review, assignments, certificates)

API

- Quiz review: `GET /quiz-attempts` (instructor: attempts waiting in own courses), `GET /quiz-attempts/:id` (the instructor sees the
  correct answers and the score worked out from the answers), `POST /quiz-attempts/:id/release` (sets score, passed and RELEASED in one
  transaction; 409 when already released or superseded by a quiz edit).
- Assignments: `GET /assignments/mine`, `POST /courses/:id/submission` (multipart "file" PDF up to 10 MB plus "checks"; only when every
  topic quiz is passed). The first submission creates the submission and the certificate snapshot in one transaction (v3: no approval).
  While SUBMITTED the PDF can be replaced (the old file is deleted); once GRADED it is final (409).
- Submissions: `GET /submissions` (instructor, with the Late flag), `GET /submissions/:id`, `GET /submissions/:id/file` (the student who
  sent it or the course instructor), `POST /submissions/:id/grade` (whole number 0 to 100 and feedback; grading again edits the grade).
- Certificates: `GET /certificates/mine`, `GET /certificates` (instructor: own courses; admin: all; search, course, from and to dates),
  `GET /certificates/progress` (instructor tracking), `GET /certificates/:id`, `GET /certificates/:id/download` (PDF from the snapshot,
  `lib/certificatePdf.ts`, PDFKit, landscape A4). Numbers are `LH-<year>-<id, 6 digits>`.
- Progress: `GET /students/progress` (instructor: every enrollment in own published courses, with counts) and
  `GET /courses/:id/students/:studentId` (instructor owner or admin). Both reuse `studentCourseState`, so student and instructor
  always see the same numbers.
- A file missing from storage now returns 404, not 500. The seed writes placeholder PDFs to `storage/seed` for its submissions
  and numbers seeded certificates from the row id like the API.
- Tests: 61 rule tests (`pnpm test`): assignment state, late flag, release, certificate number and progress, progress row state.

Web

- Student: Assignments (to-do ticks, attach PDF, submit, replace while waiting for review, graded view with feedback, View PDF) and
  Certificates (filter, View, Download PDF).
- Instructor: Students and progress (counts, search, course and status filters), Student detail (course picker, four numbers,
  Lessons and quizzes with Review quiz and Release marks, Assignment with View PDF, Download, Review and grade, Edit grade) and
  Certificates (progress to certificate, next step, View certificate).
- Admin: Certificates (read only; search, course and date range; View and Download PDF).
- New: `services/assignmentService.ts`, `services/certificateService.ts`, review calls in `quizService`, progress calls in
  `enrollmentService`; `components/PdfModal.tsx` and `components/CertificateModal.tsx` (shared by all roles).

Notes

- The certificate shows the course's current instructor; the snapshot keeps the student name, course title and wording (LLD 1
  has no instructor column on certificates).
- The PDF uses the built-in Helvetica font, which covers Latin letters only.
- Setup after this change: `pnpm install` (adds pdfkit), then `pnpm --filter @learnhub/api prisma:seed` to get the placeholder PDFs.

## Done (phase 8: dashboards, reports, alerts, settings)

API

- `GET /dashboard` (every role gets its own content): student numbers, Continue learning and To do; instructor numbers,
  Needs your attention (quizzes to review, assignments to grade) and Course progress; admin numbers, pending approvals,
  open password reset requests and the last four activity lines.
- `GET /alerts`: what is waiting for the caller, worked out on demand (HLD 8, decision 8), at most ten, each with a link.
  Nothing is stored, so there is no "mark as read".
- `GET /reports/overview`, `/reports/instructors`, `/reports/enrollments` (admin): completion rate, quiz pass rate (released
  marks only), assignments waiting, per-instructor summary, enrollments by course. Counting rules in `reports.rules.ts`.
- `GET /settings`, `PATCH /settings` (admin, multipart: wording, quiz defaults, optional logo PNG/JPG/WebP up to 1 MB checked by
  its header, or removeLogo), logged as SETTINGS. `GET /settings/logo` is the only public file. Old logo files are kept because
  issued certificates point to them; `GET /certificates/:id/logo` returns the logo saved with a certificate.
- Every number comes from `studentCourseState`, one enrollment at a time. Fine at institute scale; a summary table is the
  next step if enrollments reach tens of thousands.
- Tests: 70 rule tests (`pnpm test`), adding platform numbers and the settings form.

Web

- Dashboards for student, instructor and admin with the design's numbers, Quick move and two lists. The instructor can review
  a quiz from the dashboard; "Grade" opens the student's Assignment tab.
- Admin Reports and Settings (certificate wording, logo with "go back to the default mark", preview, quiz defaults).
- Alerts open live from the header. Certificates show the uploaded logo.
- Links from dashboards: `/admin/users?create=1`, `/admin/users?reset=<user id>`, `/instructor/courses?create=1`. The Activity
  log button moved from Users and roles to the admin dashboard, as in the design.
- Removed: the "Coming in phase N" placeholder and both `legacy` folders. Every screen of the design is built.

## Done (phase 9: access checks, certificate font, polish)

- `apps/api/src/access.test.ts` runs the real Express app with the database replaced by an empty stub (no MySQL needed):
  - every endpoint without a cookie answers 401 (public ones excepted), every role that is not allowed gets 403, and every
    allowed role gets past the role check (75 endpoints, from the LLD 3 table);
  - it reads the route files and fails if an endpoint exists that the table does not list, so a new route cannot skip it;
  - ownership: 18 cases where the stub returns a course, lesson, attempt, submission or certificate that belongs to someone
    else (403 expected), plus controls where the caller owns it or is the admin.
    Checked by breaking a role and an ownership check on purpose: the test failed both times.
- Certificate PDF uses the built-in Helvetica font (Latin letters).
- Removed stale "phase N" notes from the code.
- Tests: 167 in total (`pnpm test`).

## Next

All nine phases of the HLD build order are done. Before going live: run the API against MySQL (`prisma migrate dev`, seed,
`pnpm dev`) and click through each role, since the API was never run against a database in this build environment.

## To remove (not in the final design)

Nothing left: the legacy reference copies were deleted in phase 8.
