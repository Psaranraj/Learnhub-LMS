import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Pager } from '../../../components/ui/Pager';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { StatCard, StatGrid } from '../../../components/ui/StatCard';
import { Table, Td } from '../../../components/ui/Table';
import { useApi } from '../../../hooks/useApi';
import { useDebounced } from '../../../hooks/useDebounced';
import { courseService } from '../../../services/courseService';
import { enrollmentService, type ProgressParams } from '../../../services/enrollmentService';
import { field } from '../../../utils/styles';
import { AssignmentBadge } from '../components/AssignmentBadge';

type State = NonNullable<ProgressParams['state']>;

// Instructor / Students and progress (design iStud): every enrollment in the instructor's published courses.
export default function StudentsProgressPage() {
  const navigate = useNavigate();
  const { data: progress, error: progressError, callAPI: getProgressAPI } = useApi(enrollmentService.progress);
  const { data: courses, callAPI: getCoursesAPI } = useApi(courseService.mine);
  const [q, setQ] = useState('');
  const [courseId, setCourseId] = useState('');
  const [state, setState] = useState<State | ''>('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);

  useEffect(() => {
    void getCoursesAPI({ status: 'PUBLISHED', pageSize: 100 });
  }, [getCoursesAPI]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setPage(1);
  }, [search, courseId, state]);
  useEffect(() => {
    void getProgressAPI({
      page,
      ...(search ? { q: search } : {}),
      ...(courseId ? { courseId: Number(courseId) } : {}),
      ...(state ? { state } : {}),
    });
  }, [page, search, courseId, state, getProgressAPI]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = progress?.summary;
  return (
    <div>
      <PageHeader
        eyebrow="Learners"
        title="Students and progress"
        description="Student details, course progress, quiz review and assignment grading."
      />
      <StatGrid>
        <StatCard label="Enrollments" value={s?.enrollments ?? '—'} hint={`${s?.students ?? 0} students`} />
        <StatCard label="Quizzes to review" value={s?.quizzesToReview ?? '—'} hint="Release marks to students" />
        <StatCard label="Assignments to grade" value={s?.toGrade ?? '—'} hint="Submitted PDFs" />
        <StatCard label="Completed" value={s?.completed ?? '—'} hint="Certificate issued" />
      </StatGrid>
      <Card>
        <div className="mb-3 grid gap-2.5 [grid-template-columns:2fr_1fr_1fr] max-md:[grid-template-columns:1fr]">
          <input
            className={field}
            placeholder="Search students"
            aria-label="Search students"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className={field} aria-label="Course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">All courses</option>
            {courses?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <select
            className={field}
            aria-label="Status"
            value={state}
            onChange={(e) => setState(e.target.value as State | '')}
          >
            <option value="">All statuses</option>
            <option value="review">Needs my review</option>
            <option value="prog">In progress</option>
            <option value="done">Completed</option>
          </select>
        </div>
        {progressError && <p className="text-xs font-bold text-r">{progressError}</p>}
        {progress && progress.items.length === 0 && <p className="text-xs text-mu">No students match these filters.</p>}
        {progress && progress.items.length > 0 && (
          <Table head={['Student', 'Course', 'Progress', 'Quizzes', 'Assignment', 'Action']}>
            {progress.items.map((x) => (
              <tr key={`${x.student.id}-${x.course.id}`}>
                <Td>
                  <strong>{x.student.name}</strong>
                  <br />
                  <small className="text-mu">{x.student.email}</small>
                </Td>
                <Td>{x.course.title}</Td>
                <Td>
                  <span className="flex items-center gap-2">
                    <span className="w-24">
                      <ProgressBar percent={x.progress.percent} />
                    </span>
                    {x.progress.percent}%
                  </span>
                </Td>
                <Td>
                  {x.progress.passed} / {x.progress.total} passed
                  {x.toReview > 0 && (
                    <>
                      <br />
                      <Badge tone="o">{`${x.toReview} to review`}</Badge>
                    </>
                  )}
                </Td>
                <Td>
                  <AssignmentBadge state={x.assignment} grade={x.grade} />
                </Td>
                <Td>
                  <Button
                    variant="pri"
                    onClick={() => navigate(`/instructor/students/${x.student.id}?course=${x.course.id}`)}
                  >
                    View details
                  </Button>
                </Td>
              </tr>
            ))}
          </Table>
        )}
        {progress && (
          <Pager page={progress.page} pageSize={progress.pageSize} total={progress.total} onChange={setPage} />
        )}
      </Card>
    </div>
  );
}
