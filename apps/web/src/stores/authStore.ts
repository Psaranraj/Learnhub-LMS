import { create } from 'zustand';
import type { Role } from '@learnhub/shared';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  mobile: string;
  role: Role;
  mustChangePassword: boolean;
};

type AuthState = { user: AuthUser | null; ready: boolean; setUser: (u: AuthUser | null) => void };

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  ready: false,
  setUser: (user) => set({ user, ready: true }),
}));
