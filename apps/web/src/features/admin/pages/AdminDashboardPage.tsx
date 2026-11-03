import { useEffect } from 'react';
import { Link } from 'react-router';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { PageHeader } from '../../../components/ui/PageHeader';
import { QuickMove } from '../../../components/ui/QuickMove';
import { StatCard, StatGrid } from '../../../components/ui/StatCard';
import { useApi } from '../../../hooks/useApi';
import { reportService } from '../../../services/reportService';
import { formatDateTime } from '../../../utils/format';

const QUICK = [
  { to: '/admin/courses', icon: '▣', label: 'Courses and approvals' },
  { to: '/admin/users', icon: '♙', label: 'Users and roles' },
  { to: '/admin/certificates', icon: '▧', label: 'Certificates' },
  { to: '/admin/reports', icon: '◔', label: 'Reports' },
  { to: '/admin/activity', icon: '⏱', label: 'Activity log' },
];
const row = 'flex flex-wrap items-center justify-between gap-3 border-t border-ln py-3 text-xs first:border-t-0';

// Admin / Platform overview (design adDash): four numbers, quick move, approvals and reset requests, recent activity.
export default function AdminDashboardPage() {
  const { data: dashboard, error: dashboardError, callAPI: getDashboardAPI } = useApi(reportService.adminDashboard);

  useEffect(() => {
    void getDashboardAPI();
  }, [getDashboardAPI]);

  const d = dashboard;
  const s = d?.stats;
  const nothing = d && d.pendingCourses.length === 0 && d.resetRequests.length === 0;
  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Platform overview"
        description="Approvals, accounts and certificates at a glance."
        action={
          <Link to="/admin/users?create=1">
            <Button variant="pri">Create user</Button>
          </Link>
        }
      />
      {dashboardError && <p className="mb-3 text-xs font-bold text-r">{dashboardError}</p>}
      <StatGrid>
        <StatCard label="Users" value={s?.users ?? '—'} hint={`${s?.activeUsers ?? 0} active`} />
        <StatCard
          label="Published courses"
          value={s?.publishedCourses ?? '—'}
          hint={`${s?.pendingCourses ?? 0} waiting for approval`}
        />
        <StatCard label="Enrollments" value={s?.enrollments ?? '—'} hint="Across published courses" />
        <StatCard
          label="Certificates issued"
          value={s?.certificates ?? '—'}
          hint="Issued when students submit the assignment"
        />
      </StatGrid>
      <QuickMove subtitle="Go straight to any part of the platform" items={QUICK} />
      <div className="grid items-start gap-4 [grid-template-columns:1fr_1fr] max-md:[grid-template-columns:1fr]">
        <Card title="Needs your attention" subtitle="Course approvals and password reset requests">
          {nothing && <p className="text-xs text-mu">Nothing is waiting. You are all caught up.</p>}
          {d?.pendingCourses.map((c) => (
            <div key={`c${c.id}`} className={row}>
              <span className="min-w-0 flex-1">
                <strong>{c.title}</strong>
                <br />
                <small className="text-mu">
                  {c.instructor} · {c.lessons} lessons · {c.quizzes} quizzes
                </small>
              </span>
              <Badge tone="o">Pending review</Badge>
              <Link to={`/admin/courses/${c.id}`}>
                <Button variant="pri">Review</Button>
              </Link>
            </div>
          ))}
          {d?.resetRequests.map((r) => (
            <div key={`r${r.id}`} className={row}>
              <span className="min-w-0 flex-1">
                <strong>Password reset requested</strong>
                <br />
                <small className="text-mu">
                  {r.user.name} · {r.user.email}
                </small>
              </span>
              <Badge tone="o">Request</Badge>
              <Link to={`/admin/users?reset=${r.user.id}`}>
                <Button variant="pri">Reset password</Button>
              </Link>
            </div>
          ))}
        </Card>
        <Card title="Recent activity" subtitle="Latest admin actions">
          {d && d.recent.length === 0 && <p className="text-xs text-mu">No activity yet.</p>}
          {d?.recent.map((x) => (
            <div key={x.id} className={row}>
              <span>
                <strong>{x.text}</strong>
                <br />
                <small className="text-mu">
                  {formatDateTime(x.createdAt)} · {x.actorLabel}
                </small>
              </span>
            </div>
          ))}
          <div className="mt-3 flex justify-end">
            <Link to="/admin/activity">
              <Button>View activity log</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
