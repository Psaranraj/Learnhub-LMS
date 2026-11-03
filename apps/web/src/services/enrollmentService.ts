import type { Category, Level, Page } from '@learnhub/shared';
import type { AssignmentState, AssignmentView, TopicView } from './learningService';
import { apiClient } from './apiClient';

export type CourseStudent = {
  student: { id: number; name: string; email: string; active: boolean };
  source: 'SELF' | 'ASSIGNED';
  enrolledAt: string;
  certificate: boolean;
  passed: number;
  total: number;
  percent: number;
  state: 'new' | 'prog' | 'done';
};
export type MyCourse = {
  course: {
    id: number;
    title: string;
    category: Category;
    level: Level;
    instructor: { id: number; name: string };
  };
  source: 'SELF' | 'ASSIGNED';
  progress: { passed: number; total: number; percent: number };
  status: 'IN_PROGRESS' | 'COMPLETED';
  next: { id: number; position: number; title: string } | null;
};
export type MyCoursesParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: MyCourse['status'];
};
export type CourseStudentParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  progress?: CourseStudent['state'];
};

export type ProgressRow = {
  student: { id: number; name: string; email: string };
  course: { id: number; title: string };
  progress: { passed: number; total: number; percent: number };
  toReview: number;
  assignment: AssignmentState;
  grade: number | null;
  certificateIssued: boolean;
  state: 'review' | 'prog' | 'done';
};
export type ProgressParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  courseId?: number;
  state?: ProgressRow['state'];
};
export type ProgressPage = Page<ProgressRow> & {
  summary: {
    enrollments: number;
    students: number;
    quizzesToReview: number;
    toGrade: number;
    completed: number;
  };
};
export type StudentDetail = {
  student: { id: number; name: string; email: string; mobile: string };
  courses: { id: number; title: string }[];
  course: { id: number; title: string };
  progress: { passed: number; total: number; percent: number };
  videosReached: number;
  lessons: {
    id: number;
    position: number;
    title: string;
    watchedPercent: number;
    quiz: TopicView['quiz'];
  }[];
  assignment: AssignmentView | null;
  certificate: { id: number; certificateNo: string; issuedAt: string } | null;
};

// LLD 3, enrollments (and the instructor's progress views built on them).
export const enrollmentService = {
  courseStudents: (courseId: number, params: CourseStudentParams) =>
    apiClient.get<Page<CourseStudent>>(`/courses/${courseId}/students`, { params }).then((r) => r.data),
  addStudents: (courseId: number, studentIds: number[]) =>
    apiClient
      .post<{
        added: number;
        skipped: number;
        published: boolean;
      }>(`/courses/${courseId}/students`, { studentIds })
      .then((r) => r.data),
  removeStudent: (courseId: number, studentId: number) =>
    apiClient.delete(`/courses/${courseId}/students/${studentId}`).then((r) => r.data),
  enroll: (courseId: number) => apiClient.post(`/courses/${courseId}/enroll`).then((r) => r.data),
  mine: (params: MyCoursesParams) => apiClient.get<Page<MyCourse>>('/enrollments/mine', { params }).then((r) => r.data),
  progress: (params: ProgressParams) =>
    apiClient.get<ProgressPage>('/students/progress', { params }).then((r) => r.data),
  studentDetail: (courseId: number, studentId: number) =>
    apiClient.get<StudentDetail>(`/courses/${courseId}/students/${studentId}`).then((r) => r.data),
};
