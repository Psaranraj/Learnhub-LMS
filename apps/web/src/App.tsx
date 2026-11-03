import { useEffect } from 'react';
import { AppRoutes } from './app/AppRoutes';
import { useApi } from './hooks/useApi';
import { authService } from './services/authService';
import { useAuthStore } from './stores/authStore';

/**
 * Auth bootstrap (LLD 5, "Start-up and redirects"): GET /auth/me runs on every page load before any
 * role guard decides, so a signed-in user is never bounced to the login page.
 */
export default function App() {
  const ready = useAuthStore((s) => s.ready);
  const setUser = useAuthStore((s) => s.setUser);
  const { callAPI: getMeAPI } = useApi(authService.me);

  useEffect(() => {
    void getMeAPI().then((user) => setUser(user));
  }, [getMeAPI, setUser]);

  if (!ready) return <p className="p-6 text-xs text-mu">Loading…</p>;
  return <AppRoutes />;
}
