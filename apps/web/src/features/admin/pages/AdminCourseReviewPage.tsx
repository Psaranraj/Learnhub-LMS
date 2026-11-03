import { useCallback, useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { CATEGORY_LABELS, LEVEL_LABELS } from '@learnhub/shared';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StatCard, StatGrid } from '../../../components/ui/StatCard';
import { useApi } from '../../../hooks/useApi';
import { courseService } from '../../../services/courseService';
import { STATUS } from '../../../utils/status';
import { useCourseActions } from '../components/useCourseActions';

export default function AdminCourseReviewPage() {
  const { id } = useParams();
  const { data: course, error: courseError, callAPI: getCourseAPI } = useApi(courseService.manage);

  const load = useCallback(() => {
    void getCourseAPI(Number(id));
  }, [getCourseAPI, id]);
  const actions = useCourseActions(load);
  useEffect(() => {
    load();
  }, [load]);

  if (courseError)
    return (
      <EmptyState
        title="Course not found"
        message={courseError}
        action={
          <Link to="/admin/courses">
            <Button>Back to courses</Button>
          </Link>
        }
      />
    );
  if (!course) return <p className="text-xs text-mu">Loading…</p>;
  const c = course;
  const minutes = c.lessons.reduce((n, l) => n + l.durationMin, 0);
  const quizzes = c.lessons.filter((l) => l.quiz).length;

  return (
    <div>
      <PageHeader eyebrow="Course review" title={c.title} description={`Submitted by ${c.instructor.name}`} />
      <div className="grid items-start gap-4 [grid-template-columns:minmax(0,2fr)_minmax(260px,1fr)] max-md:[grid-template-columns:1fr]">
        <div>
          <StatGrid>
            <StatCard label="Lessons" value={c.lessons.length} hint={`${minutes} minutes of video`} />
            <StatCard
              label="Quizzes"
              value={quizzes}
              hint={
                c.lessons[0]?.quiz
                  ? `${c.lessons[0].quiz.questionCount} questions each, ${c.lessons[0].quiz.passMark} to pass`
                  : 'None yet'
              }
            />
            <StatCard
              label="Assignment"
              value={c.assignment ? 1 : 0}
              hint={c.assignment ? 'PDF submission' : 'Not added yet'}
            />
            <StatCard label="Students" value={c.studentCount} hint="Enrolled or assigned" />
          </StatGrid>
          <Card title="Description">
            <p className="text-xs leading-relaxed">{c.description || 'No description yet.'}</p>
          </Card>
          <Card title="Lessons and quizzes" subtitle="In teaching order">
            {c.lessons.length === 0 && <p className="text-xs text-mu">No lessons added yet.</p>}
            {c.lessons.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between gap-3 border-t border-ln py-2.5 text-xs first:border-t-0"
              >
                <span className="min-w-0">
                  <strong>
                    {l.position}. {l.title}
                  </strong>
                  <br />
                  <span className="break-all text-mu">
                    {l.durationMin} min · {l.materialName ?? 'No material'} · {l.videoUrl}
                  </span>
                </span>
                {l.quiz ? <Badge>{`Quiz · ${l.quiz.questionCount} questions`}</Badge> : <Badge tone="o">No quiz</Badge>}
              </div>
            ))}
          </Card>
          <Card title="Assignment">
            {c.assignment ? (
              <>
                <p className="text-xs font-bold">{c.assignment.title}</p>
                <p className="mb-2 text-xs text-mu">{c.assignment.instructions}</p>
                {c.assignment.todoItems.map((t) => (
                  <p key={t} className="text-xs">
                    ○ {t}
                  </p>
                ))}
                {c.assignment.dueDate && (
                  <p className="mt-2 text-xs text-mu">
                    Due{' '}
                    {new Date(c.assignment.dueDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-mu">No assignment added yet.</p>
            )}
          </Card>
          {c.status === 'PENDING_REVIEW' && (
            <Card title="Submission checklist">
              {c.readiness.items.map((i) => (
                <p key={i.text} className="flex gap-2 py-1 text-xs">
                  <span aria-hidden className={i.ok ? 'font-extrabold text-g' : 'font-extrabold text-o'}>
                    {i.ok ? '✓' : '○'}
                  </span>
                  <span>
                    <span className="sr-only">{i.ok ? 'Done: ' : 'To do: '}</span>
                    {i.text}
                  </span>
                </p>
              ))}
            </Card>
          )}
        </div>

        <Card>
          <p className="mb-1.5 text-xs text-mu">Status</p>
          <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
          <p className="mt-3.5 text-xs text-mu">Instructor</p>
          <p className="text-xs font-bold">{c.instructor.name}</p>
          <p className="mt-2 text-xs text-mu">
            {CATEGORY_LABELS[c.category]} · {LEVEL_LABELS[c.level]} · {c.studentCount} students
          </p>
          <div className="mt-3.5 grid gap-2">
            {c.status === 'PENDING_REVIEW' && (
              <>
                <Button variant="pri" disabled={actions.busy} onClick={() => actions.approve(c.id)}>
                  Approve and publish
                </Button>
                <Button variant="danger" onClick={() => actions.askReject(c.id, c.title)}>
                  Reject with reason
                </Button>
              </>
            )}
            {c.status === 'PUBLISHED' && <Button onClick={() => actions.askUnpublish(c.id, c.title)}>Unpublish</Button>}
            {c.status === 'REJECTED' && (
              <p className="rounded-[9px] bg-[#fff2df] p-3 text-xs leading-normal text-[#8a5a10]">
                <strong>Rejected.</strong> {c.rejectReason}
                <br />
                Waiting for the instructor to fix and submit again.
              </p>
            )}
            {c.status === 'DRAFT' && (
              <p className="text-xs text-mu">
                Not submitted yet. Approval is available after the instructor submits it.
              </p>
            )}
            <Link to="/admin/courses">
              <Button className="w-full">Back to courses</Button>
            </Link>
          </div>
        </Card>
      </div>
      {actions.dialogs}
    </div>
  );
}
