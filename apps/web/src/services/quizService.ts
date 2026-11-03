import type { Page, QuizSaveInput } from '@learnhub/shared';
import type { TopicView } from './learningService';
import { apiClient } from './apiClient';

export type QuizQuestion = { text: string; options: string[]; correctIndex: number };
export type EditorQuiz = {
  lesson: { id: number; title: string };
  defaults: { questionCount: number; passMark: number };
  quiz: {
    id: number;
    title: string;
    version: number;
    questionCount: number;
    passMark: number;
    questions: QuizQuestion[];
  } | null;
};

export type MyQuiz = {
  course: { id: number; title: string };
  lesson: { id: number; position: number; title: string; open: boolean };
  quiz: NonNullable<TopicView['quiz']>;
};
export type MyQuizParams = {
  page?: number;
  pageSize?: number;
  courseId?: number;
  state?: 'open' | 'review' | 'passed' | 'failed' | 'locked';
};
export type QuizPaper = {
  course: { id: number; title: string };
  lesson: { id: number; position: number; title: string; total: number };
  quiz: { title: string; questionCount: number; passMark: number };
  questions: { text: string; options: string[] }[];
};
export type AttemptView = {
  id: number;
  attemptNo: number;
  status: 'SUBMITTED' | 'RELEASED' | 'SUPERSEDED';
  submittedAt: string;
  releasedAt: string | null;
  score: number | null;
  passed: boolean | null;
  answers: (number | null)[];
  course: { id: number; title: string };
  lesson: { id: number; position: number; title: string };
  quiz: { title: string; questionCount: number; passMark: number };
  questions: { text: string; options: string[]; correctIndex: number | null }[];
};

export type PendingAttempt = {
  id: number;
  attemptNo: number;
  submittedAt: string;
  student: { id: number; name: string; email: string };
  course: { id: number; title: string };
  lesson: { id: number; position: number; title: string };
};
/** The instructor's view of an attempt: always with the correct answers and the score worked out from the answers. */
export type ReviewView = Omit<AttemptView, 'questions'> & {
  computedScore: number;
  student: { id: number; name: string; email: string };
  questions: { text: string; options: string[]; correctIndex: number }[];
};

// LLD 3, quizzes.
export const quizService = {
  forEditor: (lessonId: number) => apiClient.get<EditorQuiz>(`/lessons/${lessonId}/quiz`).then((r) => r.data),
  /** dryRun only counts the students a new version would affect (LLD 6, flow 7). */
  save: (lessonId: number, input: QuizSaveInput, dryRun = false) =>
    apiClient
      .put<{
        affected: number;
        version?: number;
      }>(`/lessons/${lessonId}/quiz`, input, { params: dryRun ? { dryRun: true } : {} })
      .then((r) => r.data),

  // Student
  mine: (params: MyQuizParams) => apiClient.get<Page<MyQuiz>>('/quizzes/mine', { params }).then((r) => r.data),
  questions: (lessonId: number) => apiClient.get<QuizPaper>(`/lessons/${lessonId}/quiz/questions`).then((r) => r.data),
  submit: (lessonId: number, answers: (number | null)[]) =>
    apiClient.post<{ attemptId: number }>(`/lessons/${lessonId}/quiz/attempts`, { answers }).then((r) => r.data),
  attempt: (attemptId: number) =>
    apiClient.get<{ attempt: AttemptView }>(`/quiz-attempts/${attemptId}`).then((r) => r.data.attempt),

  // Instructor review
  pending: (params: { page?: number; pageSize?: number; courseId?: number }) =>
    apiClient.get<Page<PendingAttempt>>('/quiz-attempts', { params }).then((r) => r.data),
  review: (attemptId: number) =>
    apiClient.get<{ attempt: ReviewView }>(`/quiz-attempts/${attemptId}`).then((r) => r.data.attempt),
  release: (attemptId: number) =>
    apiClient.post<{ score: number; passed: boolean }>(`/quiz-attempts/${attemptId}/release`).then((r) => r.data),
};
