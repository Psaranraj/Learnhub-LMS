import type {
  AssignmentForm,
  Category,
  CourseCreateInput,
  CourseStatusValue,
  CourseUpdateInput,
  LessonCreateInput,
  LessonUpdateInput,
  Level,
  Page,
} from '@learnhub/shared';
import { apiClient } from './apiClient';

export type AdminCourseRow = {
  id: number;
  title: string;
  category: Category;
  level: Level;
  status: CourseStatusValue;
  instructor: { id: number; name: string };
  lessonCount: number;
  quizCount: number;
  studentCount: number;
};
export type ManagedCourse = {
  id: number;
  title: string;
  description: string;
  category: Category;
  level: Level;
  status: CourseStatusValue;
  rejectReason: string | null;
  instructor: { id: number; name: string };
  studentCount: number;
  lessons: {
    id: number;
    position: number;
    title: string;
    videoUrl: string;
    durationMin: number;
    materialName: string | null;
    quiz: {
      id: number;
      title: string;
      version: number;
      questionCount: number;
      passMark: number;
      questions: { position: number; text: string; options: string[]; correctIndex: number }[];
    } | null;
  }[];
  assignment: {
    title: string;
    instructions: string;
    todoItems: string[];
    dueDate: string | null;
  } | null;
  readiness: { ready: boolean; items: { ok: boolean; text: string }[] };
};
/** A course card: the instructor's own list, or a published course in Browse and the public catalog. */
export type CourseCard = {
  id: number;
  title: string;
  description: string;
  category: Category;
  level: Level;
  status: CourseStatusValue;
  rejectReason?: string | null;
  instructor: { id: number; name: string };
  lessonCount: number;
  quizCount: number;
  minutes: number;
  hasAssignment: boolean;
  studentCount?: number;
};
/** Published course without video links, materials, quiz or assignment text (HLD 7). */
export type PublicCourse = {
  id: number;
  title: string;
  description: string;
  category: Category;
  level: Level;
  instructor: { id: number; name: string };
  lessons: { id: number; position: number; title: string; durationMin: number; hasQuiz: boolean }[];
  lessonCount: number;
  quizCount: number;
  minutes: number;
  hasAssignment: boolean;
  quizRule: { questionCount: number; passMark: number } | null;
};
export type MineParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: CourseStatusValue;
  category?: Category;
};
export type CatalogParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  category?: Category;
  level?: Level;
  instructorId?: number;
};
export type AdminCourseParams = {
  page?: number;
  q?: string;
  status?: CourseStatusValue;
  category?: Category;
  instructorId?: number;
};

// LLD 3, courses. One function per endpoint.
export const courseService = {
  adminList: (params: AdminCourseParams) =>
    apiClient.get<Page<AdminCourseRow>>('/courses/admin', { params }).then((r) => r.data),
  manage: (id: number) => apiClient.get<{ course: ManagedCourse }>(`/courses/${id}/manage`).then((r) => r.data.course),
  approve: (id: number) => apiClient.post(`/courses/${id}/approve`).then((r) => r.data),
  reject: (id: number, reason: string) => apiClient.post(`/courses/${id}/reject`, { reason }).then((r) => r.data),
  unpublish: (id: number) => apiClient.post(`/courses/${id}/unpublish`).then((r) => r.data),
  changeInstructor: (id: number, instructorId: number) =>
    apiClient.patch(`/courses/${id}/instructor`, { instructorId }).then((r) => r.data),

  // Published courses (public catalog, instructor Browse tab)
  catalog: (params: CatalogParams) => apiClient.get<Page<CourseCard>>('/courses', { params }).then((r) => r.data),
  publicView: (id: number) => apiClient.get<{ course: PublicCourse }>(`/courses/${id}`).then((r) => r.data.course),

  // Instructor: own courses and the builder
  mine: (params: MineParams) => apiClient.get<Page<CourseCard>>('/courses/mine', { params }).then((r) => r.data),
  create: (input: CourseCreateInput) => apiClient.post<{ id: number }>('/courses', input).then((r) => r.data),
  update: (id: number, input: CourseUpdateInput) => apiClient.patch(`/courses/${id}`, input).then((r) => r.data),
  addLesson: (courseId: number, input: LessonCreateInput) =>
    apiClient.post<{ id: number }>(`/courses/${courseId}/lessons`, input).then((r) => r.data),
  updateLesson: (lessonId: number, input: LessonUpdateInput) =>
    apiClient.patch(`/lessons/${lessonId}`, input).then((r) => r.data),
  /** Without confirm the server answers 409 CONFIRM_REQUIRED when students have progress on the lesson. */
  deleteLesson: (lessonId: number, confirm = false) =>
    apiClient.delete(`/lessons/${lessonId}`, { params: confirm ? { confirm: true } : {} }).then((r) => r.data),
  reorderLessons: (courseId: number, lessonIds: number[]) =>
    apiClient.put(`/courses/${courseId}/lessons/order`, { lessonIds }).then((r) => r.data),
  uploadMaterial: (lessonId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<{ materialName: string }>(`/lessons/${lessonId}/material`, form).then((r) => r.data);
  },
  deleteMaterial: (lessonId: number) => apiClient.delete(`/lessons/${lessonId}/material`).then((r) => r.data),
  /** Opens the lesson PDF in a new tab (owner or admin). */
  materialUrl: (lessonId: number) => `${apiClient.defaults.baseURL}/lessons/${lessonId}/material/file`,
  saveAssignment: (courseId: number, input: AssignmentForm) =>
    apiClient.put(`/courses/${courseId}/assignment`, input).then((r) => r.data),
  deleteAssignment: (courseId: number) => apiClient.delete(`/courses/${courseId}/assignment`).then((r) => r.data),
  submit: (courseId: number) =>
    apiClient.post<{ status: CourseStatusValue }>(`/courses/${courseId}/submit`).then((r) => r.data),
};
