import type { CourseStatusValue, Page } from '@learnhub/shared';
import { apiClient } from './apiClient';

export type ActivityType = 'APPROVAL' | 'USERS' | 'SETTINGS';
export type ActivityEntry = {
  id: number;
  type: ActivityType;
  text: string;
  actorLabel: string;
  createdAt: string;
};
export type AlertItem = { id: string; title: string; detail: string; to?: string };

type Progress = { passed: number; total: number; percent: number };
export type StudentDashboard = {
  role: 'STUDENT';
  stats: {
    enrolled: number;
    inProgress: number;
    averageProgress: number;
    topicsPassed: number;
    certificates: number;
  };
  continue: {
    course: { id: number; title: string };
    progress: Progress;
    next: { id: number; position: number; title: string } | null;
  }[];
  todo: {
    kind: 'review' | 'quiz' | 'assignment' | 'certificate';
    title: string;
    detail: string;
    courseId: number;
    lessonId?: number;
    attemptId?: number | null;
    retake?: boolean;
    questionCount?: number;
    passMark?: number;
  }[];
};
export type InstructorDashboard = {
  role: 'INSTRUCTOR';
  stats: {
    courses: number;
    pending: number;
    students: number;
    quizzesToReview: number;
    assignmentsToGrade: number;
    certificates: number;
    enrollments: number;
  };
  attention: {
    kind: 'quiz' | 'assignment';
    title: string;
    student: { id: number; name: string };
    course: { id: number; title: string };
    attemptId?: number | null;
  }[];
  courses: {
    id: number;
    title: string;
    status: CourseStatusValue;
    lessons: number;
    students: number;
    averageProgress: number;
  }[];
};
export type AdminDashboard = {
  role: 'ADMIN';
  stats: {
    users: number;
    activeUsers: number;
    publishedCourses: number;
    pendingCourses: number;
    enrollments: number;
    certificates: number;
  };
  pendingCourses: {
    id: number;
    title: string;
    instructor: string;
    lessons: number;
    quizzes: number;
  }[];
  resetRequests: {
    id: number;
    createdAt: string;
    user: { id: number; name: string; email: string };
  }[];
  recent: { id: number; text: string; actorLabel: string; createdAt: string }[];
};
export type ReportOverview = {
  enrollments: number;
  certificates: number;
  waiting: number;
  passed: number;
  failed: number;
  completionRate: number;
  quizPassRate: number;
  publishedCourses: number;
};
export type InstructorReport = {
  instructor: { id: number; name: string; active: boolean };
  publishedCourses: number;
  students: number;
  completionRate: number;
  quizPassRate: number;
  waiting: number;
};
export type CourseEnrollments = { id: number; title: string; instructor: string; students: number };

// LLD 3, reports and activity. Dashboards and alerts are worked out on demand for the signed-in role.
export const reportService = {
  activity: (params: { page?: number; q?: string; type?: ActivityType }) =>
    apiClient.get<Page<ActivityEntry>>('/activity', { params }).then((r) => r.data),
  alerts: () => apiClient.get<{ items: AlertItem[] }>('/alerts').then((r) => r.data.items),
  studentDashboard: () => apiClient.get<StudentDashboard>('/dashboard').then((r) => r.data),
  instructorDashboard: () => apiClient.get<InstructorDashboard>('/dashboard').then((r) => r.data),
  adminDashboard: () => apiClient.get<AdminDashboard>('/dashboard').then((r) => r.data),
  overview: () => apiClient.get<ReportOverview>('/reports/overview').then((r) => r.data),
  instructors: () => apiClient.get<{ items: InstructorReport[] }>('/reports/instructors').then((r) => r.data.items),
  enrollments: () => apiClient.get<{ items: CourseEnrollments[] }>('/reports/enrollments').then((r) => r.data.items),
};
