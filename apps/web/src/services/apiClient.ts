import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

/**
 * The only Axios instance (HLD 3, LLD 5). Services use it; pages and components never import Axios.
 * The session is an httpOnly cookie, so every request sends credentials.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
  withCredentials: true,
  timeout: 15000,
});

// A 401 on any call except the auth ones means the session ended: clear the user, the route guard opens /login.
apiClient.interceptors.response.use(
  (r) => r,
  async (err: unknown) => {
    if (axios.isAxiosError(err) && err.response?.status === 401 && !err.config?.url?.startsWith('/auth/')) {
      useAuthStore.getState().setUser(null);
    }
    // File downloads ask for a Blob, so an error body arrives as a Blob too: read it back into { code, message }.
    if (axios.isAxiosError(err) && err.response?.data instanceof Blob && err.response.data.type.includes('json')) {
      try {
        err.response.data = JSON.parse(await  err.response.data.text());
      } catch {
        /* keep the generic message */
      }
    }
    return Promise.reject(err);
  },
);

export type ApiError = {
  status: number;
  code: string;
  message: string;
  fieldErrors: Record<string, string>;
};

/** Turns any failure into the API error shape (HLD 7: { code, message, fieldErrors? }). */
export function toApiError(e: unknown): ApiError {
  if (axios.isAxiosError(e)) {
    const body = e.response?.data as Partial<ApiError> | undefined;
    if (body?.message) {
      return {
        status: e.response?.status ?? 0,
        code: body.code ?? 'ERROR',
        message: body.message,
        fieldErrors: body.fieldErrors ?? {},
      };
    }
    if (!e.response)
      return {
        status: 0,
        code: 'NETWORK',
        message: 'Cannot reach the server. Check your connection and try again.',
        fieldErrors: {},
      };
  }
  return { status: 0, code: 'ERROR', message: 'Something went wrong. Try again.', fieldErrors: {} };
}
