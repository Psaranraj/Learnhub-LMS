import type { GradeInput, Page } from '@learnhub/shared';
import type { AssignmentView, CourseState } from './learningService';
import { apiClient } from './apiClient';

export type MyAssignment = {
  course: CourseState['course'];
  progress: CourseState['progress'];
  assignment: AssignmentView;
  certificate: { id: number; certificateNo: string } | null;
};
export type Submission = {
  id: number;
  status: 'SUBMITTED' | 'GRADED';
  fileName: string;
  checks: boolean[];
  grade: number | null;
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
  late: boolean;
  student: { id: number; name: string; email: string };
  course: { id: number; title: string };
  assignment: {
    id: number;
    title: string;
    instructions: string;
    todoItems: string[];
    dueDate: string | null;
  };
};

// LLD 3, assignments and submissions.
export const assignmentService = {
  mine: () => apiClient.get<{ items: MyAssignment[] }>('/assignments/mine').then((r) => r.data),
  /** Multipart: the PDF and the two to-do ticks. The first submission issues the certificate. */
  submit: (courseId: number, file: File, checks: [boolean, boolean]) => {
    const form = new FormData();
    form.append('file', file);
    form.append('checks', JSON.stringify(checks));
    return apiClient
      .post<{
        replaced: boolean;
        state: AssignmentView;
      }>(`/courses/${courseId}/submission`, form, { timeout: 60000 })
      .then((r) => r.data);
  },
  list: (params: { page?: number; pageSize?: number; courseId?: number; status?: 'SUBMITTED' | 'GRADED' }) =>
    apiClient.get<Page<Submission>>('/submissions', { params }).then((r) => r.data),
  view: (id: number) => apiClient.get<{ submission: Submission }>(`/submissions/${id}`).then((r) => r.data.submission),
  file: (id: number) =>
    apiClient.get<Blob>(`/submissions/${id}/file`, { responseType: 'blob', timeout: 60000 }).then((r) => r.data),
  grade: (id: number, input: GradeInput) =>
    apiClient.post<{ submission: Submission }>(`/submissions/${id}/grade`, input).then((r) => r.data.submission),
};
