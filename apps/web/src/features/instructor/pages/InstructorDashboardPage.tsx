import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { PageHeader } from '../../../components/ui/PageHeader';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { QuickMove } from '../../../components/ui/QuickMove';
import { StatCard, StatGrid } from '../../../components/ui/StatCard';
import { useApi } from '../../../hooks/useApi';
import { reportService } from '../../../services/reportService';
import { useAuthStore } from '../../../stores/authStore';
import { STATUS } from '../../../utils/status';
import { QuizReviewModal } from '../components/QuizReviewModal';

const QUICK = [
  { to: '/instructor/courses', icon: '▤', label: 'My courses' },
  { to: '/instructor/courses?tab=browse', icon: '⌕', label: 'Browse courses' },
  { to: '/instructor/courses?create=1', icon: '✚', label: 'Create course' },
  { to: '/instructor/students', icon: '♙', label: 'Students and progress' },
  { to: '/instructor/certificates', icon: '▧', label: 'Certificates' },
];
const row = 'flex flex-wrap items-center justify-between gap-3 border-t border-ln py-3 text-xs first:border-t-0';
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

// Instructor / Dashboard (design iDash): four numbers, quick move, what needs attention and progress per course.
export default function InstructorDashboardPage() {
  const me = useAuthStore((s) => s.user)!;
  const navigate = useNavigate();
  const {
    data: dashboard,
    error: dashboardError,
    callAPI: getDashboardAPI,
  } = useApi(reportService.instructorDashboard);
  const [reviewing, setReviewing] = useState<number | null>(null);
  useEffect(() => {
    void getDashboardAPI();
  }, [getDashboardAPI]); // eslint-disable-line react-hooks/exhaustive-deps

  const d = dashboard;
  const s = d?.stats;
  return (
    <div>
      <PageHeader
        eyebrow="Instructor"
        title={`${greeting()}, ${me.name.split(' ')[0]}`}
        description="Your courses, students and what needs your attention."
        action={
          <Link to="/instructor/courses?create=1">
            <Button variant="pri">Create course</Button>
          </Link>
        }
      />
      {dashboardError && <p className="mb-3 text-xs font-bold text-r">{dashboardError}</p>}
      <StatGrid>
        <StatCard label="My courses" value={s?.courses ?? '—'} hint={`${s?.pending ?? 0} pending admin approval`} />
        <StatCard label="Students" value={s?.students ?? '—'} hint="Across your published courses" />
        <StatCard
          label="To review"
          value={s ? s.quizzesToReview + s.assignmentsToGrade : '—'}
          hint={`${s?.quizzesToReview ?? 0} quizzes · ${s?.assignmentsToGrade ?? 0} assignments`}
        />
        <StatCard
          label="Certificates issued"
          value={s?.certificates ?? '—'}
          hint={`Of ${s?.enrollments ?? 0} enrollments`}
        />
      </StatGrid>
      <QuickMove subtitle="Go straight to any part of your teaching" items={QUICK} />
      <div className="grid items-start gap-4 [grid-template-columns:1fr_1fr] max-md:[grid-template-columns:1fr]">
        <Card title="Needs your attention" subtitle="Quizzes and assignments waiting for you">
          {d && d.attention.length === 0 && <p className="text-xs text-mu">You are all caught up.</p>}
          {d?.attention.map((a, i) => (
            <div key={i} className={row}>
              <span className="min-w-0 flex-1">
                <strong>{a.title}</strong>
                <br />
                <small className="text-mu">
                  {a.student.name} · {a.course.title}
                </small>
              </span>
              {a.kind === 'quiz' && a.attemptId ? (
                <Button variant="pri" onClick={() => setReviewing(a.attemptId!)}>
                  Review
                </Button>
              ) : (
                <Button
                  variant="pri"
                  onClick={() => navigate(`/instructor/students/${a.student.id}?course=${a.course.id}&tab=asg`)}
                >
                  Grade
                </Button>
              )}
            </div>
          ))}
        </Card>
        <Card title="Course progress" subtitle="Average student progress per course">
          {d && d.courses.length === 0 && <p className="text-xs text-mu">No courses yet. Create your first course.</p>}
          {d?.courses.map((c) => (
            <div key={c.id} className={row}>
              <span className="min-w-0 flex-1">
                <strong>{c.title || 'Untitled course'}</strong>
                <br />
                <small className="text-mu">
                  {c.students} students · {c.lessons} lessons
                </small>
              </span>
              <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
              <span className="flex w-[150px] items-center gap-2">
                <span className="flex-1">
                  <ProgressBar percent={c.averageProgress} />
                </span>
                <span className="text-mu">{c.averageProgress}%</span>
              </span>
              <Link to={`/instructor/courses/${c.id}`}>
                <Button>Details</Button>
              </Link>
            </div>
          ))}
        </Card>
      </div>
      <QuizReviewModal
        attemptId={reviewing}
        onClose={() => setReviewing(null)}
        onReleased={() => void getDashboardAPI()}
      />
    </div>
  );
}
