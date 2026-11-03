import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { PageHeader } from '../../../components/ui/PageHeader';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { QuickMove } from '../../../components/ui/QuickMove';
import { StatCard, StatGrid } from '../../../components/ui/StatCard';
import { useApi } from '../../../hooks/useApi';
import { reportService } from '../../../services/reportService';
import { useAuthStore } from '../../../stores/authStore';
import { QuizStartDialogs, type QuizStart } from '../components/QuizStartDialogs';

const QUICK = [
  { to: '/student/courses', icon: '▤', label: 'My courses' },
  { to: '/student/catalog', icon: '⌕', label: 'Browse all courses' },
  { to: '/student/quizzes', icon: '☑', label: 'Quizzes' },
  { to: '/student/assignments', icon: '✎', label: 'Assignments' },
  { to: '/student/certificates', icon: '▧', label: 'Certificates' },
  { to: '/student/account', icon: '◐', label: 'Account settings' },
];
const row = 'flex flex-wrap items-center justify-between gap-3 border-t border-ln py-3 text-xs first:border-t-0';

// Student / Dashboard (design pDash): four numbers, quick move, continue learning and the to-do list.
export default function StudentDashboardPage() {
  const me = useAuthStore((s) => s.user)!;
  const { data: dashboard, error: dashboardError, callAPI: getDashboardAPI } = useApi(reportService.studentDashboard);
  const [start, setStart] = useState<QuizStart | null>(null);
  useEffect(() => {
    void getDashboardAPI();
  }, [getDashboardAPI]); // eslint-disable-line react-hooks/exhaustive-deps

  const d = dashboard;
  return (
    <div>
      <PageHeader
        eyebrow="Student"
        title={`Welcome back, ${me.name.split(' ')[0]}`}
        description="Your progress, next steps and quick links."
        action={
          <Link to="/student/catalog">
            <Button variant="pri">Browse courses</Button>
          </Link>
        }
      />
      {dashboardError && <p className="mb-3 text-xs font-bold text-r">{dashboardError}</p>}
      <StatGrid>
        <StatCard
          label="Enrolled courses"
          value={d?.stats.enrolled ?? '—'}
          hint={`${d?.stats.inProgress ?? 0} in progress`}
        />
        <StatCard
          label="Average progress"
          value={d ? `${d.stats.averageProgress}%` : '—'}
          hint="Across enrolled courses"
        />
        <StatCard label="Topics passed" value={d?.stats.topicsPassed ?? '—'} hint="Quizzes passed so far" />
        <StatCard label="Certificates" value={d?.stats.certificates ?? '—'} hint="Issued to you" />
      </StatGrid>
      <QuickMove subtitle="Go straight to any part of your learning" items={QUICK} />
      <div className="grid items-start gap-4 [grid-template-columns:1fr_1fr] max-md:[grid-template-columns:1fr]">
        <Card title="Continue learning" subtitle="Courses in progress">
          {d && d.continue.length === 0 && (
            <p className="text-xs text-mu">No course in progress. Browse courses to start.</p>
          )}
          {d?.continue.map((c) => (
            <div key={c.course.id} className={row}>
              <span className="min-w-0 flex-1">
                <strong>{c.course.title}</strong>
                <br />
                <small className="text-mu">
                  {c.next ? `Next: ${c.next.title} · ` : ''}
                  {c.progress.passed} of {c.progress.total} topics passed
                </small>
              </span>
              <span className="w-[120px]">
                <ProgressBar percent={c.progress.percent} />
              </span>
              <Link to={`/student/learn/${c.course.id}${c.next ? `?lesson=${c.next.id}` : ''}`}>
                <Button variant="soft">Continue</Button>
              </Link>
            </div>
          ))}
        </Card>
        <Card title="To do" subtitle="Quizzes, assignments and certificates">
          {d && d.todo.length === 0 && <p className="text-xs text-mu">You are all caught up.</p>}
          {d?.todo.map((t, i) => (
            <div key={i} className={row}>
              <span className="min-w-0 flex-1">
                <strong>{t.title}</strong>
                <br />
                <small className="text-mu">{t.detail}</small>
              </span>
              {t.kind === 'review' && t.attemptId && (
                <Link to={`/student/quizzes/attempts/${t.attemptId}`}>
                  <Button>View answers</Button>
                </Link>
              )}
              {t.kind === 'quiz' && (
                <Button
                  variant="pri"
                  onClick={() =>
                    setStart({
                      lessonId: t.lessonId!,
                      topic: t.title.replace(/^Quiz: /, ''),
                      questionCount: t.questionCount!,
                      passMark: t.passMark!,
                      step: 'rules',
                    })
                  }
                >
                  {t.retake ? 'Retake quiz' : 'Start quiz'}
                </Button>
              )}
              {t.kind === 'assignment' && (
                <Link to="/student/assignments">
                  <Button>Open</Button>
                </Link>
              )}
              {t.kind === 'certificate' && (
                <Link to="/student/certificates">
                  <Button>View</Button>
                </Link>
              )}
            </div>
          ))}
        </Card>
      </div>
      <QuizStartDialogs start={start} onChange={setStart} />
    </div>
  );
}
