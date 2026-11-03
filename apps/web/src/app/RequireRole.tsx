import { Navigate, Outlet, useLocation } from 'react-router';
import type { Role } from '@learnhub/shared';
import { useAuthStore } from '../stores/authStore';
import { homeOf } from '../utils/routes';

/** Role guard (LLD 5): signed out goes to /login, a wrong role goes to its own dashboard. */
export function RequireRole({ role }: { role: Role }) {
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ returnTo: pathname }} />;
  if (user.role !== role) return <Navigate to={homeOf(user.role)} replace />;
  return <Outlet />;
}
