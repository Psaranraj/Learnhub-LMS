// Recreates the demo data from the final UI design (LearnHub_UI_v8). Development only.
// Run: pnpm --filter @learnhub/api prisma:seed   (it clears the tables first)
import { PrismaClient, type Category, type CourseStatus, type Level, type Role, type UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { certificateNumber } from '../src/modules/certificates/certificates.rules';

const prisma = new PrismaClient();

// One shared demo password. Never used outside local development (LLD 7).
const DEMO_PASSWORD = 'LearnHub@123';
const VIDEO = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ';
const at = (iso: string) => new Date(iso);

/** Seeded submissions need a real file so "View PDF" works: a one-page placeholder in storage/seed. */
async function placeholderPdf(fileName: string, lines: string[]) {
  const bytes = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 60 });
    const chunks: Buffer[] = [];
    doc.on('data', (b: Buffer) => chunks.push(b));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.font('Helvetica-Bold').fontSize(22).text('Assignment submission (demo)');
    doc.moveDown().font('Helvetica').fontSize(13);
    for (const l of lines) doc.text(l).moveDown(0.5);
    doc.end();
  });
  const relative = `seed/${fileName}`;
  const full = path.resolve(process.cwd(), process.env.STORAGE_DIR || 'storage', relative);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, bytes);
  return relative;
}

// ---------- users: 1 admin, 2 instructors, 8 students (Sanjay Das is inactive) ----------
type UserSeed = {
  key: string;
  name: string;
  email: string;
  mobile: string;
  role: Role;
  status?: UserStatus;
};
const USERS: UserSeed[] = [
  {
    key: 'arun',
    name: 'Arun Kumar',
    email: 'arun@learnhub.in',
    mobile: '9000000001',
    role: 'ADMIN',
  },
  {
    key: 'rahul',
    name: 'Rahul Menon',
    email: 'rahul@learnhub.in',
    mobile: '9000000002',
    role: 'INSTRUCTOR',
  },
  {
    key: 'priya',
    name: 'Priya Nair',
    email: 'priya@learnhub.in',
    mobile: '9000000003',
    role: 'INSTRUCTOR',
  },
  {
    key: 'riya',
    name: 'Riya Sharma',
    email: 'riya.s@learnhub.in',
    mobile: '9000000004',
    role: 'STUDENT',
  },
  {
    key: 'arjun',
    name: 'Arjun Patel',
    email: 'arjun.p@learnhub.in',
    mobile: '9000000005',
    role: 'STUDENT',
  },
  {
    key: 'divya',
    name: 'Divya Iyer',
    email: 'divya.i@learnhub.in',
    mobile: '9000000006',
    role: 'STUDENT',
  },
  {
    key: 'kavin',
    name: 'Kavin Kumar',
    email: 'kavin.k@learnhub.in',
    mobile: '9000000007',
    role: 'STUDENT',
  },
  {
    key: 'meena',
    name: 'Meena Rao',
    email: 'meena.r@learnhub.in',
    mobile: '9000000008',
    role: 'STUDENT',
  },
  {
    key: 'naveen',
    name: 'Naveen Raj',
    email: 'naveen.r@learnhub.in',
    mobile: '9000000009',
    role: 'STUDENT',
  },
  {
    key: 'lakshmi',
    name: 'Lakshmi Priya',
    email: 'lakshmi.p@learnhub.in',
    mobile: '9000000010',
    role: 'STUDENT',
  },
  {
    key: 'sanjay',
    name: 'Sanjay Das',
    email: 'sanjay.d@learnhub.in',
    mobile: '9000000011',
    role: 'STUDENT',
    status: 'INACTIVE',
  },
];

// ---------- courses: 3 topics each; 5 published, 2 waiting for approval ----------
type CourseSeed = {
  key: string;
  title: string;
  description: string;
  category: Category;
  level: Level;
  instructor: string;
  status: CourseStatus;
  lessons: string[];
  assignment: { title: string; instructions: string; due: string };
};
const COURSES: CourseSeed[] = [
  {
    key: 'uiux',
    title: 'UI/UX Design Masterclass',
    category: 'DESIGN',
    level: 'BEGINNER',
    instructor: 'rahul',
    status: 'PUBLISHED',
    description: 'Learn research, wireframing and prototyping through three topics, a quiz for each and an assignment.',
    lessons: ['Design principles', 'Wireframing basics', 'Prototyping and flows'],
    assignment: {
      title: 'Wireframe Design Task',
      instructions: 'Design a three-screen wireframe for a habit tracker and export it as one PDF.',
      due: '2026-10-28',
    },
  },
  {
    key: 'da',
    title: 'Data Analytics with Python',
    category: 'DATA_SCIENCE',
    level: 'INTERMEDIATE',
    instructor: 'rahul',
    status: 'PUBLISHED',
    description: 'Load, clean and chart real data with Python, then explain what it shows.',
    lessons: ['Loading data with Python', 'Cleaning and transforming data', 'Charts and insights'],
    assignment: {
      title: 'Python Data Analysis Report',
      instructions: 'Analyse the provided dataset and submit a short report as one PDF.',
      due: '2026-10-20',
    },
  },
  {
    key: 'dm',
    title: 'Digital Marketing Essentials',
    category: 'MARKETING',
    level: 'BEGINNER',
    instructor: 'rahul',
    status: 'PUBLISHED',
    description: 'The basics of channels, campaigns and measuring results.',
    lessons: ['Marketing fundamentals', 'Social media campaigns', 'Measuring results'],
    assignment: {
      title: 'Campaign Plan',
      instructions: 'Plan a one-month campaign for a local business and submit it as one PDF.',
      due: '2026-11-15',
    },
  },
  {
    key: 'java',
    title: 'Advanced Java Programming',
    category: 'DEVELOPMENT',
    level: 'ADVANCED',
    instructor: 'rahul',
    status: 'PENDING_REVIEW',
    description: 'Object-oriented design, collections and file handling in Java.',
    lessons: ['Object-oriented design', 'Collections and generics', 'Exceptions and files'],
    assignment: {
      title: 'Library Management Project',
      instructions: 'Build a small console library system and submit the report as one PDF.',
      due: '2026-11-20',
    },
  },
  {
    key: 'fs',
    title: 'Full Stack Web Development',
    category: 'DEVELOPMENT',
    level: 'ADVANCED',
    instructor: 'priya',
    status: 'PUBLISHED',
    description: 'Build a responsive site, then connect it to an API.',
    lessons: ['HTML and CSS essentials', 'JavaScript fundamentals', 'REST APIs'],
    assignment: {
      title: 'Build a Responsive Website',
      instructions: 'Build a responsive portfolio page and submit the write-up as one PDF.',
      due: '2026-10-30',
    },
  },
  {
    key: 'cloud',
    title: 'Cloud & DevOps Foundations',
    category: 'DEVELOPMENT',
    level: 'BEGINNER',
    instructor: 'priya',
    status: 'PUBLISHED',
    description: 'Cloud basics, containers and delivery pipelines.',
    lessons: ['Cloud basics', 'Containers with Docker', 'Pipelines and delivery'],
    assignment: {
      title: 'Deploy a Container',
      instructions: 'Describe how you deployed a small app in a container, as one PDF.',
      due: '2026-11-10',
    },
  },
  {
    key: 'pyb',
    title: 'Python for Beginners',
    category: 'DEVELOPMENT',
    level: 'BEGINNER',
    instructor: 'priya',
    status: 'PENDING_REVIEW',
    description: 'Variables, control flow and functions, step by step.',
    lessons: ['Variables and types', 'Control flow', 'Functions'],
    assignment: {
      title: 'Number Games',
      instructions: 'Write three small programs and submit the code and notes as one PDF.',
      due: '2026-11-25',
    },
  },
];
const DURATIONS = [14, 18, 16];

// ---------- per student and course: how far they are ----------
// passed: topics passed (released and at or above the pass mark)
// review: the next topic's quiz is waiting for the instructor
// failed: the next topic's quiz was released below the pass mark
type Plan = {
  student: string;
  course: string;
  source?: 'SELF' | 'ASSIGNED';
  passed: number;
  review?: boolean;
  failed?: boolean;
  submission?: {
    status: 'SUBMITTED' | 'GRADED';
    grade?: number;
    file: string;
    on: string;
    feedback?: string;
  };
  certificateOn?: string;
};
const PLANS: Plan[] = [
  // UI/UX: 3 students
  { student: 'riya', course: 'uiux', passed: 1 },
  { student: 'arjun', course: 'uiux', passed: 2, review: true },
  {
    student: 'divya',
    course: 'uiux',
    passed: 3,
    submission: { status: 'SUBMITTED', file: 'Wireframes.pdf', on: '2026-10-24' },
    certificateOn: '2026-10-24',
  },
  // Data Analytics: 3 students
  {
    student: 'riya',
    course: 'da',
    passed: 3,
    certificateOn: '2026-10-02',
    submission: {
      status: 'GRADED',
      grade: 88,
      file: 'Python_Report.pdf',
      on: '2026-10-02',
      feedback: 'Clear analysis and a well structured report.',
    },
  },
  {
    student: 'kavin',
    course: 'da',
    passed: 3,
    certificateOn: '2026-10-07',
    source: 'ASSIGNED',
    submission: {
      status: 'GRADED',
      grade: 90,
      file: 'Kavin_Report.pdf',
      on: '2026-10-07',
      feedback: 'Excellent charts and a clear conclusion.',
    },
  },
  { student: 'divya', course: 'da', passed: 1 },
  // Digital Marketing: 1 student, added by the instructor
  { student: 'meena', course: 'dm', passed: 0, source: 'ASSIGNED' },
  // Full Stack: 4 students
  { student: 'riya', course: 'fs', passed: 2 },
  {
    student: 'arjun',
    course: 'fs',
    passed: 3,
    certificateOn: '2026-10-12',
    submission: {
      status: 'GRADED',
      grade: 82,
      file: 'Portfolio.pdf',
      on: '2026-10-12',
      feedback: 'Good layout. Test the small-screen menu.',
    },
  },
  {
    student: 'lakshmi',
    course: 'fs',
    passed: 3,
    certificateOn: '2026-10-25',
    submission: { status: 'SUBMITTED', file: 'Responsive_Site.pdf', on: '2026-10-25' },
  },
  { student: 'naveen', course: 'fs', passed: 1, failed: true },
  // Cloud & DevOps: 3 students
  { student: 'riya', course: 'cloud', passed: 0 },
  { student: 'meena', course: 'cloud', passed: 1 },
  { student: 'naveen', course: 'cloud', passed: 0, source: 'ASSIGNED' },
];

const LOGS = [
  {
    type: 'APPROVAL',
    text: 'Approved course "Cloud & DevOps Foundations"',
    on: '2026-10-22T11:20:00',
  },
  { type: 'USERS', text: 'Deactivated student account: Sanjay Das', on: '2026-10-21T16:05:00' },
  { type: 'USERS', text: 'Created instructor account: Priya Nair', on: '2026-10-12T10:05:00' },
  {
    type: 'APPROVAL',
    text: 'Approved course "Data Analytics with Python"',
    on: '2026-09-29T12:40:00',
  },
] as const;

// Seeded quizzes are complete (10 questions each) so every screen has data. These are
// placeholders for development, not real content: the instructor writes real questions.
const sampleQuestions = (topic: string) =>
  Array.from({ length: 10 }, (_, i) => ({
    position: i + 1,
    text: `Sample question ${i + 1} on "${topic}"`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctIndex: i % 4,
  }));

// Answers that earn exactly `score` correct out of 10.
const answersFor = (score: number) => Array.from({ length: 10 }, (_, i) => (i < score ? i % 4 : (i + 1) % 4));

async function wipe() {
  await prisma.activityLog.deleteMany();
  await prisma.passwordResetRequest.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
  await prisma.settings.deleteMany();
}

async function main() {
  if (process.env.NODE_ENV === 'production')
    throw new Error('The seed clears all tables. It must not run in production.');
  await wipe();

  // Settings: certificate wording and the quiz defaults (10 questions, 8 to pass).
  const settings = await prisma.settings.create({
    data: {
      id: 1,
      orgName: 'LearnHub',
      certTitle: 'Certificate of completion',
      certIntro: 'This certifies that',
      certMid: 'has successfully completed',
      certFooter: 'Issued by LearnHub',
      quizQuestionCount: 10,
      quizPassMark: 8,
    },
  });

  // Users
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user: Record<string, { id: number; name: string }> = {};
  for (const u of USERS) {
    const row = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        mobile: u.mobile,
        role: u.role,
        status: u.status ?? 'ACTIVE',
        passwordHash,
      },
    });
    user[u.key] = { id: row.id, name: row.name };
  }

  // Courses, lessons, quizzes (version 1), assignment
  const lessonIds: Record<string, number[]> = {};
  const quizIds: Record<string, number[]> = {};
  const assignmentId: Record<string, number> = {};
  const courseId: Record<string, number> = {};
  const courseTitle: Record<string, string> = {};
  for (const c of COURSES) {
    const course = await prisma.course.create({
      data: {
        title: c.title,
        description: c.description,
        category: c.category,
        level: c.level,
        instructorId: user[c.instructor].id,
        status: c.status,
      },
    });
    courseId[c.key] = course.id;
    courseTitle[c.key] = c.title;
    lessonIds[c.key] = [];
    quizIds[c.key] = [];
    for (const [i, title] of c.lessons.entries()) {
      const lesson = await prisma.lesson.create({
        data: {
          courseId: course.id,
          position: i + 1,
          title,
          videoUrl: VIDEO,
          durationMin: DURATIONS[i],
        },
      });
      const quiz = await prisma.quiz.create({
        data: {
          lessonId: lesson.id,
          title: `${title} quiz`,
          questionCount: settings.quizQuestionCount,
          passMark: settings.quizPassMark,
          version: 1,
        },
      });
      await prisma.quizQuestion.createMany({
        data: sampleQuestions(title).map((q) => ({ quizId: quiz.id, version: 1, ...q })),
      });
      lessonIds[c.key].push(lesson.id);
      quizIds[c.key].push(quiz.id);
    }
    const asg = await prisma.assignment.create({
      data: {
        courseId: course.id,
        title: c.assignment.title,
        instructions: c.assignment.instructions,
        todoItems: ['I followed the instructions', 'My PDF is my own work'],
        dueDate: at(`${c.assignment.due}T23:59:00`),
      },
    });
    assignmentId[c.key] = asg.id;
  }

  // Enrollments, progress, quiz attempts, submissions
  const certificates: { plan: Plan; on: string }[] = [];
  for (const p of PLANS) {
    const studentId = user[p.student].id;
    await prisma.enrollment.create({
      data: { courseId: courseId[p.course], studentId, source: p.source ?? 'SELF' },
    });

    const reached = async (index: number) => {
      const seconds = Math.ceil(DURATIONS[index] * 60 * 0.7) + 20;
      await prisma.lessonProgress.create({
        data: {
          studentId,
          lessonId: lessonIds[p.course][index],
          watchedSeconds: seconds,
          lastReportAt: at('2026-10-20T10:00:00'),
          reachedAt: at('2026-10-20T10:00:00'),
        },
      });
    };
    const attempt = (index: number, status: 'SUBMITTED' | 'RELEASED', score: number) =>
      prisma.quizAttempt.create({
        data: {
          quizId: quizIds[p.course][index],
          quizVersion: 1,
          attemptNo: 1,
          studentId,
          answers: answersFor(score),
          status,
          score: status === 'RELEASED' ? score : null,
          passed: status === 'RELEASED' ? score >= settings.quizPassMark : null,
          submittedAt: at('2026-10-21T09:00:00'),
          releasedAt: status === 'RELEASED' ? at('2026-10-21T15:00:00') : null,
          releasedById: status === 'RELEASED' ? user[COURSES.find((c) => c.key === p.course)!.instructor].id : null,
        },
      });

    for (let i = 0; i < p.passed; i++) {
      await reached(i);
      await attempt(i, 'RELEASED', 8 + (i % 3)); // 8, 9 or 10 out of 10
    }
    if (p.review) {
      await reached(p.passed);
      await attempt(p.passed, 'SUBMITTED', 9);
    }
    if (p.failed) {
      await reached(p.passed);
      await attempt(p.passed, 'RELEASED', 6);
    }

    if (p.submission) {
      const s = p.submission;
      const filePath = await placeholderPdf(s.file, [user[p.student].name, courseTitle[p.course], s.file]);
      await prisma.submission.create({
        data: {
          assignmentId: assignmentId[p.course],
          studentId,
          filePath,
          fileName: s.file,
          checks: [true, true],
          status: s.status,
          grade: s.grade ?? null,
          feedback: s.feedback ?? null,
          submittedAt: at(`${s.on}T12:00:00`),
          gradedAt: s.status === 'GRADED' ? at(`${s.on}T18:00:00`) : null,
        },
      });
    }
    if (p.certificateOn) certificates.push({ plan: p, on: p.certificateOn });
  }

  // Certificates: a snapshot taken when the assignment was first submitted, created in date order and numbered from
  // the row id like the API does (LH-<year>-<id>).
  certificates.sort((a, b) => a.on.localeCompare(b.on));
  for (const { plan, on } of certificates) {
    const created = await prisma.certificate.create({
      data: {
        courseId: courseId[plan.course],
        studentId: user[plan.student].id,
        certificateNo: `seed-${plan.course}-${plan.student}`,
        studentName: user[plan.student].name,
        courseTitle: courseTitle[plan.course],
        orgName: settings.orgName,
        title: settings.certTitle,
        intro: settings.certIntro,
        mid: settings.certMid,
        footer: settings.certFooter,
        logoPath: settings.logoPath,
        issuedAt: at(`${on}T12:00:00`),
      },
    });
    await prisma.certificate.update({
      where: { id: created.id },
      data: { certificateNo: certificateNumber(created.id, created.issuedAt) },
    });
  }

  // Activity log (written by the admin)
  for (const l of LOGS) {
    await prisma.activityLog.create({
      data: {
        type: l.type,
        text: l.text,
        actorId: user.arun.id,
        actorLabel: user.arun.name,
        createdAt: at(l.on),
      },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    courses: await prisma.course.count(),
    enrollments: await prisma.enrollment.count(),
    quizzes: await prisma.quiz.count(),
    questions: await prisma.quizQuestion.count(),
    certificates: await prisma.certificate.count(),
  };
  console.log('Seeded:', counts, `\nDemo password for every account: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
