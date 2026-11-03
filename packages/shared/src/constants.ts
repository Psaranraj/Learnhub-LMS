// Defaults for new quizzes (HLD 6). The live values come from platform settings and are copied onto each quiz.
export const PASS_MARK = 8;
export const QUESTIONS_PER_QUIZ = 10;
export const VIDEO_UNLOCK_PERCENT = 70;

export const ROLES = { ADMIN: 'ADMIN', INSTRUCTOR: 'INSTRUCTOR', STUDENT: 'STUDENT' } as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

// Fixed role matrix shown read-only on the admin Permissions page. Wording from the design (LearnHub_UI_v8, adRoles).
// The server enforces these rules; this table only describes them.
export const ROLE_PERMISSIONS: {
  area: string;
  student: string;
  instructor: string;
  admin: string;
}[] = [
  {
    area: 'Courses',
    student: 'Browse, enroll free, learn',
    instructor: 'Build own courses, submit for approval, fix after a rejection',
    admin: 'Approve or reject with a reason, unpublish, assign instructor',
  },
  {
    area: 'Quizzes',
    student: 'Attempt after watching 70% of the video',
    instructor: 'Add per lesson, review answers, release marks',
    admin: 'Set defaults in Settings, see pass rates in Reports',
  },
  {
    area: 'Assignments',
    student: 'Submit one PDF after passing all quizzes',
    instructor: 'Grade the PDFs of own courses',
    admin: 'See how many are waiting in Reports',
  },
  {
    area: 'Users',
    student: 'Register, change own password in Account settings',
    instructor: 'View own students, add students free',
    admin:
      'Create student, instructor and admin accounts with a temporary password, reset passwords, activate or deactivate',
  },
  {
    area: 'Enrollments',
    student: 'Self-enroll in published courses',
    instructor: 'Assign students free to own courses',
    admin: 'View in course details',
  },
  {
    area: 'Certificates',
    student: 'Issued when the assignment is submitted, view and download own',
    instructor: 'Track own students',
    admin: 'Read-only list, view and download PDF',
  },
  {
    area: 'Reports',
    student: 'Own progress',
    instructor: 'Own courses and students',
    admin: 'Platform-wide and per instructor',
  },
];

// Values shared by web and API (HLD 3: "role, course status, attempt status, category and level").
export const USER_STATUS = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE' } as const;
export const COURSE_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  PUBLISHED: 'PUBLISHED',
  REJECTED: 'REJECTED',
} as const;
export const ATTEMPT_STATUS = {
  SUBMITTED: 'SUBMITTED',
  RELEASED: 'RELEASED',
  SUPERSEDED: 'SUPERSEDED',
} as const;
export const SUBMISSION_STATUS = { SUBMITTED: 'SUBMITTED', GRADED: 'GRADED' } as const;
export const ENROLLMENT_SOURCE = { SELF: 'SELF', ASSIGNED: 'ASSIGNED' } as const;
export const ACTIVITY_TYPE = {
  APPROVAL: 'APPROVAL',
  USERS: 'USERS',
  SETTINGS: 'SETTINGS',
} as const;
export const CATEGORY_LABELS = {
  DESIGN: 'Design',
  DEVELOPMENT: 'Development',
  DATA_SCIENCE: 'Data Science',
  MARKETING: 'Marketing',
} as const;
export const LEVEL_LABELS = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
} as const;
export type Category = keyof typeof CATEGORY_LABELS;
export type Level = keyof typeof LEVEL_LABELS;
export type CourseStatusValue = keyof typeof COURSE_STATUS;
export type AttemptStatusValue = keyof typeof ATTEMPT_STATUS;
