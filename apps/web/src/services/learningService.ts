import type { Category, HeartbeatInput, Level } from '@learnhub/shared';
import { apiClient } from './apiClient';

export type QuizState = 'none' | 'locked' | 'open' | 'review' | 'passed' | 'failed';
export type TopicView = {
  id: number;
  position: number;
  title: string;
  durationMin: number;
  open: boolean;
  reached: boolean;
  watchedPercent: number;
  note: string;
  videoUrl: string | null;
  materialName: string | null;
  hasMaterialFile: boolean;
  quiz: {
    id: number;
    title: string;
    questionCount: number;
    passMark: number;
    state: QuizState;
    attemptId: number | null;
    score: number | null;
  } | null;
};
export type AssignmentState = 'none' | 'locked' | 'todo' | 'submitted' | 'graded';
export type SubmissionView = {
  id: number;
  status: 'SUBMITTED' | 'GRADED';
  fileName: string;
  checks: boolean[];
  submittedAt: string;
  gradedAt: string | null;
  grade: number | null;
  feedback: string | null;
  late: boolean;
};
export type AssignmentView = {
  id: number;
  title: string;
  instructions: string;
  todoItems: string[];
  dueDate: string | null;
  state: AssignmentState;
  submission: SubmissionView | null;
};
export type CourseState = {
  course: {
    id: number;
    title: string;
    category: Category;
    level: Level;
    instructor: { id: number; name: string };
  };
  enrollment: { id: number; source: 'SELF' | 'ASSIGNED'; createdAt: string };
  certificate: { id: number; certificateNo: string; issuedAt: string } | null;
  lessons: TopicView[];
  progress: { passed: number; total: number; percent: number };
  assignment: AssignmentView | null;
};
export type HeartbeatResult = { watchedPercent: number; reached: boolean; justReached: boolean };

// LLD 3, learning. Every call checks enrollment and the topic lock on the server.
export const learningService = {
  course: (courseId: number) => apiClient.get<CourseState>(`/learning/courses/${courseId}`).then((r) => r.data),
  heartbeat: (lessonId: number, input: HeartbeatInput) =>
    apiClient.post<HeartbeatResult>(`/learning/lessons/${lessonId}/heartbeat`, input).then((r) => r.data),
  saveNote: (lessonId: number, note: string) =>
    apiClient.put(`/learning/lessons/${lessonId}/note`, { note }).then((r) => r.data),
  materialUrl: (lessonId: number) => `${apiClient.defaults.baseURL}/learning/lessons/${lessonId}/material`,
};
