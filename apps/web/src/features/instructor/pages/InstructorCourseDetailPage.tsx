import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { CATEGORY_LABELS, LEVEL_LABELS } from '@learnhub/shared';
import { CourseCover } from '../../../components/CourseCover';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { StatCard, StatGrid } from '../../../components/ui/StatCard';
import { Tabs } from '../../../components/ui/Tabs';
import { useApi } from '../../../hooks/useApi';
import { courseService, type ManagedCourse, type PublicCourse } from '../../../services/courseService';
import { STATUS } from '../../../utils/status';
import { CourseStudentsTab } from '../components/CourseStudentsTab';

type Tab = 'overview' | 'students';
const dueText = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

// Instructor / Course details (design iCDetail). The owner sees every status and a Students tab; another instructor sees a
// published course's public view.
export default function InstructorCourseDetailPage() {
  const id = Number(useParams().id);
  const { data: ownCourse, callAPI: getOwnCourseAPI } = useApi(courseService.manage);
  const { data: otherCourse, error: otherCourseError, callAPI: getOtherCourseAPI } = useApi(courseService.publicView);
  const [tab, setTab] = useState<Tab>('overview');

  const load = useCallback(() => {
    void getOwnCourseAPI(id).then((c) => {
      if (!c) void getOtherCourseAPI(id);
    });
  }, [id, getOwnCourseAPI, getOtherCourseAPI]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, [load]);

  const mine: ManagedCourse | null = ownCourse;
  const pub: PublicCourse | null = mine ? null : otherCourse;
  if (!mine && otherCourseError)
    return (
      <EmptyState
        title="Course not found"
        message={otherCourseError}
        action={
          <Link to="/instructor/courses">
            <Button>Back to courses</Button>
          </Link>
        }
      />
    );
  if (!mine && !pub) return <p className="text-xs text-mu">Loading…</p>;

  const c = (mine ?? pub)!;
  const lessons = mine
    ? mine.lessons.map((l) => ({
        id: l.id,
        position: l.position,
        title: l.title,
        durationMin: l.durationMin,
        material: l.materialName,
        quiz: !!l.quiz,
      }))
    : pub!.lessons.map((l) => ({
        id: l.id,
        position: l.position,
        title: l.title,
        durationMin: l.durationMin,
        material: null,
        quiz: l.hasQuiz,
      }));
  const minutes = lessons.reduce((n, l) => n + l.durationMin, 0);
  const quizzes = lessons.filter((l) => l.quiz).length;
  const firstQuiz = mine?.lessons.find((l) => l.quiz)?.quiz;
  const hasAssignment = mine ? !!mine.assignment : pub!.hasAssignment;
  const pending = mine?.status === 'PENDING_REVIEW';

  return (
    <div>
      <div className="text-xs text-mu">Courses / {CATEGORY_LABELS[c.category]}</div>
      <div className="mt-2.5 grid items-start gap-4 [grid-template-columns:minmax(0,2fr)_minmax(260px,1fr)] max-md:[grid-template-columns:1fr]">
        <div>
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            <Badge>{CATEGORY_LABELS[c.category]}</Badge>
            <Badge tone="g">{LEVEL_LABELS[c.level]}</Badge>
            {mine && <Badge tone={STATUS[mine.status].tone}>{STATUS[mine.status].label}</Badge>}
          </div>
          <h1 className="mb-2.5 text-[28px] font-extrabold tracking-[-1px]">{c.title}</h1>
          <p className="mb-3.5 max-w-[640px] text-xs leading-relaxed">{c.description || 'No description yet.'}</p>
          <StatGrid>
            <StatCard label="Lessons" value={lessons.length} hint={`${minutes} minutes of video`} />
            <StatCard
              label="Quizzes"
              value={quizzes}
              hint={
                firstQuiz
                  ? `${firstQuiz.questionCount} questions each, ${firstQuiz.passMark} to pass`
                  : 'One per lesson'
              }
            />
            <StatCard
              label="Assignment"
              value={hasAssignment ? 1 : 0}
              hint={hasAssignment ? 'PDF submission' : 'Not added yet'}
            />
            <StatCard
              label="Students"
              value={mine ? mine.studentCount : '—'}
              hint={mine ? 'Enrolled or assigned' : 'Shown to the course instructor'}
            />
          </StatGrid>
          {mine && (
            <Tabs<Tab>
              tabs={[
                { id: 'overview', label: 'Overview' },
                { id: 'students', label: `Students (${mine.studentCount})` },
              ]}
              active={tab}
              onChange={setTab}
            />
          )}

          {mine && tab === 'students' ? (
            <CourseStudentsTab
              courseId={mine.id}
              published={mine.status === 'PUBLISHED'}
              locked={pending}
              onChange={load}
            />
          ) : (
            <>
              <Card title="What this course teaches" subtitle="Lessons in teaching order, each with its quiz">
                {lessons.length === 0 && <p className="text-xs text-mu">No lessons added yet.</p>}
                {lessons.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between gap-3 border-t border-ln py-2.5 text-xs first:border-t-0"
                  >
                    <span>
                      <strong>
                        {l.position}. {l.title}
                      </strong>
                      <br />
                      <span className="text-mu">
                        {l.durationMin} min{mine ? ` · ${l.material ?? 'No material'}` : ''}
                      </span>
                    </span>
                    {l.quiz ? (
                      <Badge>{firstQuiz ? `Quiz · ${firstQuiz.questionCount} questions` : 'Quiz'}</Badge>
                    ) : (
                      <Badge tone="x">No quiz</Badge>
                    )}
                  </div>
                ))}
              </Card>
              <Card title="Assignment">
                {mine?.assignment ? (
                  <>
                    <p className="text-xs font-bold">{mine.assignment.title}</p>
                    <p className="mb-2 text-xs text-mu">{mine.assignment.instructions}</p>
                    {mine.assignment.todoItems.map((t) => (
                      <p key={t} className="py-1 text-xs">
                        ○ {t}
                      </p>
                    ))}
                    {mine.assignment.dueDate && (
                      <p className="mt-1 text-xs text-mu">Due {dueText(mine.assignment.dueDate)}</p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-mu">
                    {hasAssignment ? 'One PDF assignment after the lesson quizzes.' : 'No assignment added yet.'}
                  </p>
                )}
              </Card>
            </>
          )}
        </div>

        <Card>
          <CourseCover title={c.title} tall />
          <p className="mb-2 text-xs text-mu">Instructor: {c.instructor.name}</p>
          {mine && <p className="text-xs text-mu">Status: {STATUS[mine.status].label}</p>}
          <div className="mt-3 grid gap-2">
            {mine && (
              <Link to={`/instructor/courses/${mine.id}/build`}>
                <Button variant="pri" className="w-full">
                  {pending ? 'View course builder' : 'Open course builder'}
                </Button>
              </Link>
            )}
            {mine && (
              <Button disabled={pending} onClick={() => setTab('students')}>
                Add students (free)
              </Button>
            )}
            <Link to="/instructor/courses">
              <Button className="w-full">Back to courses</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
