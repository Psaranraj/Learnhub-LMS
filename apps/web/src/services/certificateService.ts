import type { Page } from '@learnhub/shared';
import type { AssignmentState, CourseState } from './learningService';
import { apiClient } from './apiClient';

/** The saved snapshot (HLD 8): the wording and names as they were when it was issued. The instructor is the current one. */
export type Certificate = {
  id: number;
  certificateNo: string;
  studentName: string;
  studentEmail: string;
  courseId: number;
  courseTitle: string;
  instructorName: string;
  orgName: string;
  title: string;
  intro: string;
  mid: string;
  footer: string;
  hasLogo: boolean;
  issuedAt: string;
};
export type MyCertificate = {
  course: CourseState['course'];
  certificate: { id: number; certificateNo: string; issuedAt: string } | null;
  reason: string | null;
};
export type CertificateParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  courseId?: number;
  from?: string;
  to?: string;
};
export type CertificatePage = Page<Certificate> & {
  summary: { issued: number; students: number; courses: number };
};
export type CertificateProgress = {
  student: { id: number; name: string; email: string };
  course: { id: number; title: string };
  percent: number;
  passed: number;
  total: number;
  assignment: AssignmentState;
  next: string;
  state: 'issued' | 'progress' | 'new';
  certificate: { id: number; issuedAt: string } | null;
};
export type CertificateProgressParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  courseId?: number;
  state?: CertificateProgress['state'];
};
export type CertificateProgressPage = Page<CertificateProgress> & {
  summary: { issued: number; progress: number; new: number; enrollments: number };
};

// LLD 3, certificates. Issued automatically on the first assignment submission.
export const certificateService = {
  mine: () => apiClient.get<{ items: MyCertificate[] }>('/certificates/mine').then((r) => r.data),
  list: (params: CertificateParams) => apiClient.get<CertificatePage>('/certificates', { params }).then((r) => r.data),
  progress: (params: CertificateProgressParams) =>
    apiClient.get<CertificateProgressPage>('/certificates/progress', { params }).then((r) => r.data),
  view: (id: number) =>
    apiClient.get<{ certificate: Certificate }>(`/certificates/${id}`).then((r) => r.data.certificate),
  pdf: (id: number) =>
    apiClient.get<Blob>(`/certificates/${id}/download`, { responseType: 'blob', timeout: 60000 }).then((r) => r.data),
};
