# LearnHub

Free LMS for students, instructors and admins. Built from the final layer of the `LearnHub_UI_v8_Admin` design and
`LearnHub_LMS_HLD_and_LLD_v3`. Progress by phase is in `PORT_STATUS.md`.

Stack: Nx + pnpm, React + Vite + TypeScript + Tailwind, React Router, Zustand, Axios, Express 5 + TypeScript, Zod, MySQL + Prisma.

## Setup (Windows PowerShell)

1. `pnpm install`
2. `Copy-Item apps\api\.env.example apps\api\.env`, then set `DATABASE_URL`, `JWT_SECRET` (32+ characters) and `CLIENT_URL`
3. In MySQL: `CREATE DATABASE learnhub;`
4. `pnpm --filter @learnhub/api exec prisma migrate dev --name init`
   (an older database: `pnpm --filter @learnhub/api exec prisma migrate reset` first)
5. `pnpm --filter @learnhub/api prisma:seed`
6. Optional: `Copy-Item apps\web\.env.example apps\web\.env`

## Run

| Command             | What it does                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| `pnpm dev`          | API and web together                                                                                   |
| `pnpm dev:api`      | API only, http://localhost:4000/api/health                                                             |
| `pnpm dev:web`      | Web only, http://localhost:5173                                                                        |
| `pnpm typecheck`    | TypeScript check of every package                                                                      |
| `pnpm test`         | Rule tests, plus an access test of every endpoint (sign-in, role and ownership) that needs no database |
| `pnpm format`       | Formats every file with Prettier (settings in `.prettierrc.json`)                                      |
| `pnpm format:check` | Lists files that are not formatted, changes nothing                                                    |

## Demo logins (seed, development only)

Every account uses `LearnHub@123`.

| Role                                 | Email                                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Admin (Arun Kumar)                   | arun@learnhub.in                                                                                 |
| Instructor (Rahul Menon, Priya Nair) | rahul@learnhub.in, priya@learnhub.in                                                             |
| Student (Riya Sharma)                | riya.s@learnhub.in                                                                               |
| Other students                       | arjun.p@, divya.i@, kavin.k@, meena.r@, naveen.r@, lakshmi.p@learnhub.in (sanjay.d@ is inactive) |

## What works now (phases 1 to 9)

Sign in, register, forgot password, change password, temporary-password banner; admin Users and roles, Courses and
approvals, Course review, Activity log and Permissions; instructor Courses (My courses, Browse), Course details and the
Course builder with lessons, material upload, quiz editor (with versions), assignment, free students and Submit for approval;
public home and course detail; student My courses, All courses, Course detail, Learning workspace (video heartbeats, notes,
material), Quizzes (attempt and answers), Assignments (submit and replace PDF) and Certificates (view, PDF); instructor
Students and progress, Student detail (review quiz and release marks, view PDF, grade) and Certificates; admin Certificates.
Dashboards for every role, live alerts, admin Reports and Settings (certificate wording, logo, quiz defaults).
Every screen of the design is built.

## Folders

```
apps/web/src     app/ (routes, guard, layout)  components/  features/{public,auth,student,instructor,admin}  hooks/useApi.ts
                 services/ (apiClient + one service per feature)  stores/  utils/
apps/api/src     config/  lib/  middleware/  modules/{auth,users,courses,learning,quizzes,enrollments,assignments,certificates,reports,settings,activity}  utils/  app.ts  main.ts
apps/api/storage uploaded files (git-ignored); the seed writes demo PDFs to storage/seed
apps/api/prisma  schema.prisma (14 tables), seed.ts
packages/shared  Zod schemas and constants used by both apps
```
