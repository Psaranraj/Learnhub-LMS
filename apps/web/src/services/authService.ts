import type { ChangePasswordInput, ForgotPasswordInput, LoginInput, RegisterInput } from '@learnhub/shared';
import type { AuthUser } from '../stores/authStore';
import { apiClient } from './apiClient';

// LLD 3, auth. One function per endpoint.
export const authService = {
  me: () => apiClient.get<{ user: AuthUser }>('/auth/me').then((r) => r.data.user),
  login: (input: LoginInput) => apiClient.post<{ user: AuthUser }>('/auth/login', input).then((r) => r.data.user),
  register: (input: RegisterInput) =>
    apiClient.post<{ user: AuthUser }>('/auth/register', input).then((r) => r.data.user),
  logout: () => apiClient.post<{ ok: boolean }>('/auth/logout').then((r) => r.data),
  forgotPassword: (input: ForgotPasswordInput) =>
    apiClient.post<{ ok: boolean }>('/auth/forgot-password', input).then((r) => r.data),
  changePassword: (input: ChangePasswordInput) =>
    apiClient.post<{ ok: boolean }>('/auth/change-password', input).then((r) => r.data),
};
