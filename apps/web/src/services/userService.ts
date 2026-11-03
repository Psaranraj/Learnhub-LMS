import type { CreateUserForm, Page, Role, UpdateUserInput } from '@learnhub/shared';
import { apiClient } from './apiClient';

export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type AdminUser = {
  id: number;
  name: string;
  email: string;
  mobile: string;
  role: Role;
  status: UserStatus;
  mustChangePassword: boolean;
  courseCount: number;
  resetRequested: boolean;
};
export type ResetRequest = {
  id: number;
  createdAt: string;
  user: { id: number; name: string; email: string; role: Role };
};
export type Credentials = {
  user: { id: number; name: string; email: string };
  temporaryPassword: string;
};
export type StudentPick = { id: number; name: string; email: string };
export type StudentSearchParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  excludeCourseId?: number;
  onlyNew?: boolean;
};
export type UserListParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  role?: Role;
  status?: UserStatus;
};

// LLD 3, users. All admin-only except searchStudents (instructor).
export const userService = {
  list: (params: UserListParams) => apiClient.get<Page<AdminUser>>('/users', { params }).then((r) => r.data),
  create: (input: CreateUserForm) =>
    apiClient.post<{ user: AdminUser; temporaryPassword: string }>('/users', input).then((r) => r.data),
  update: (id: number, input: UpdateUserInput) =>
    apiClient.patch<{ user: AdminUser }>(`/users/${id}`, input).then((r) => r.data.user),
  setStatus: (id: number, status: UserStatus) =>
    apiClient.patch<{ user: AdminUser }>(`/users/${id}/status`, { status }).then((r) => r.data.user),
  /** Leave temporaryPassword empty to let the server make one. */
  resetPassword: (id: number, temporaryPassword?: string) =>
    apiClient
      .post<Credentials>(`/users/${id}/reset-password`, temporaryPassword ? { temporaryPassword } : {})
      .then((r) => r.data),
  resetRequests: (params: { page?: number; pageSize?: number } = {}) =>
    apiClient.get<Page<ResetRequest>>('/users/reset-requests', { params }).then((r) => r.data),
  /** Active students for the instructor's Add students dialog. */
  searchStudents: (params: StudentSearchParams) =>
    apiClient.get<Page<StudentPick>>('/students', { params }).then((r) => r.data),
};
