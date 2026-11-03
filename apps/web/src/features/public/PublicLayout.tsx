import { Link, Outlet } from 'react-router';
import { useAuthStore } from '../../stores/authStore';
import { homeOf } from '../../utils/routes';

export default function PublicLayout() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between bg-nv px-5 py-3 text-xs font-bold text-white">
        <Link to="/" className="text-sm font-extrabold">
          LearnHub
        </Link>
        <nav className="flex gap-4">
          <Link to="/">Courses</Link>
          {user ? (
            <Link to={homeOf(user.role)}>My dashboard</Link>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link to="/register">Create account</Link>
            </>
          )}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl p-5">
        <Outlet />
      </main>
    </div>
  );
}
