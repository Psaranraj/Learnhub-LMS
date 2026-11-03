import { Suspense, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import type { Role } from '@learnhub/shared';
import { Button } from '../components/ui/Button';
import { Toast } from '../components/ui/Toast';
import { useApi } from '../hooks/useApi';
import { authService } from '../services/authService';
import { useAuthStore } from '../stores/authStore';
import { baseOf } from '../utils/routes';
import AlertsModal from './AlertsModal';

type NavItem = { to: string; icon: string; label: string };

// Menus follow the final UI design (LearnHub_UI_v8) and LLD 5.
export const NAV: Record<Role, NavItem[]> = {
  STUDENT: [
    { to: 'dashboard', icon: '▦', label: 'Dashboard' },
    { to: 'courses', icon: '▤', label: 'My courses' },
    { to: 'quizzes', icon: '☑', label: 'Quizzes' },
    { to: 'assignments', icon: '✎', label: 'Assignments' },
    { to: 'certificates', icon: '▧', label: 'Certificates' },
    { to: 'account', icon: '◐', label: 'Account settings' },
  ],
  INSTRUCTOR: [
    { to: 'dashboard', icon: '▦', label: 'Dashboard' },
    { to: 'courses', icon: '▤', label: 'Courses' },
    { to: 'students', icon: '♙', label: 'Students and progress' },
    { to: 'certificates', icon: '▧', label: 'Certificates' },
    { to: 'account', icon: '◐', label: 'Account settings' },
  ],
  ADMIN: [
    { to: 'dashboard', icon: '▦', label: 'Dashboard' },
    { to: 'courses', icon: '▣', label: 'Courses and approvals' },
    { to: 'users', icon: '♙', label: 'Users and roles' },
    { to: 'certificates', icon: '▧', label: 'Certificates' },
    { to: 'reports', icon: '◔', label: 'Reports' },
    { to: 'settings', icon: '⚙', label: 'Settings' },
    { to: 'permissions', icon: '⚿', label: 'Permissions' },
    { to: 'account', icon: '◐', label: 'Account settings' },
  ],
};

// Pages reached from inside another page rather than from the menu.
const EXTRA_LABELS: Record<string, string> = {
  learn: 'Learning workspace',
  catalog: 'All courses',
  activity: 'Activity log',
};
// Their menu item stays highlighted, as in the design (the workspace and the catalog belong to My courses).
const PARENT: Record<string, string> = { learn: 'courses', catalog: 'courses' };

const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export function RoleLayout() {
  const user = useAuthStore((s) => s.user)!;
  const setUser = useAuthStore((s) => s.setUser);
  const { pathname } = useLocation();
  const { callAPI: logoutAPI } = useApi(authService.logout);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const base = baseOf(user.role);
  const items = NAV[user.role];
  const segment = pathname.slice(base.length).split('/')[1] ?? '';
  const crumb = items.find((i) => i.to === segment)?.label ?? EXTRA_LABELS[segment] ?? 'Dashboard';
  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const signOut = async () => {
    await logoutAPI();
    setUser(null);
  };
  const parent = PARENT[segment];
  const linkFor =
    (i: NavItem) =>
    ({ isActive }: { isActive: boolean }) =>
      link({ isActive: isActive || parent === i.to });
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex w-full items-center gap-2.5 rounded-[9px] px-3 py-[11px] text-left text-xs font-bold ${isActive ? 'bg-lv text-p' : 'text-mu hover:bg-[#f7f6ff] hover:text-p'}`;
  const href = (i: NavItem) => `${base}/${i.to}`;

  return (
    <div>
      <aside className="fixed inset-y-0 left-0 z-[5] hidden w-[232px] flex-col gap-1 overflow-y-auto border-r border-ln bg-white px-3.5 py-[22px] md:flex">
        <div className="flex items-center gap-2.5 px-2 pb-5 text-[19px] font-extrabold tracking-[-0.7px] text-nv">
          <span className="grid h-[34px] w-[34px] place-items-center rounded-[11px] bg-p text-white">L</span>
          LearnHub
        </div>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {items.map((i) => (
            <NavLink key={i.label} to={href(i)} className={linkFor(i)}>
              <span aria-hidden className="w-4 text-center">
                {i.icon}
              </span>
              {i.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-[9px] border-t border-ln pt-3.5">
          <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[11px] bg-[#e8e4ff] font-extrabold text-p">
            {initials}
          </div>
          <div className="min-w-0">
            <strong className="block truncate text-xs">{user.name}</strong>
            <div className="text-xs text-mu">{cap(user.role)}</div>
          </div>
        </div>
      </aside>

      <main className="md:ml-[232px]">
        <header className="sticky top-0 z-[4] flex h-[68px] items-center justify-between gap-3.5 border-b border-ln bg-white px-3.5 md:px-[30px]">
          <span className="truncate text-xs text-mu">
            {cap(user.role)} / {crumb}
          </span>
          <div className="flex shrink-0 items-center gap-2.5">
            <Button onClick={() => setAlertsOpen(true)} aria-label="Alerts">
              Alerts
            </Button>
            <Button onClick={signOut} className="whitespace-nowrap">
              Sign out
            </Button>
          </div>
        </header>

        {/* Mobile menu: the sidebar is hidden below md, so the same items scroll here. */}
        <nav
          aria-label="Main (mobile)"
          className="sticky top-[68px] z-[3] flex gap-1 overflow-x-auto border-b border-ln bg-white px-2 py-1.5 md:hidden"
        >
          {items.map((i) => (
            <NavLink key={i.label} to={href(i)} className={(s) => `${linkFor(i)(s)} !w-auto whitespace-nowrap`}>
              {i.label}
            </NavLink>
          ))}
        </nav>

        <section className="mx-auto max-w-[1400px] px-3.5 pb-11 pt-[18px] md:px-[30px] md:pt-[26px]">
          {user.mustChangePassword && (
            <div role="alert" className="mb-4 rounded-[9px] bg-[#fff2df] p-3 text-xs leading-normal text-[#8a5a10]">
              Your account uses a temporary password.{' '}
              <Link className="font-bold underline" to={`${base}/account`}>
                Change it in Account settings.
              </Link>
            </div>
          )}
          <Suspense fallback={<p className="text-xs text-mu">Loading…</p>}>
            <Outlet />
          </Suspense>
        </section>
      </main>
      <AlertsModal open={alertsOpen} onClose={() => setAlertsOpen(false)} />
      <Toast />
    </div>
  );
}
