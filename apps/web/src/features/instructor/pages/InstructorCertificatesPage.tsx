import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { CertificateModal } from '../../../components/CertificateModal';
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
import { certificateService, type CertificateProgressParams } from '../../../services/certificateService';
import { courseService } from '../../../services/courseService';
import { formatDate } from '../../../utils/format';
import { field } from '../../../utils/styles';

type State = NonNullable<CertificateProgressParams['state']>;
const ASG = {
  none: 'No assignment',
  locked: 'Locked',
  todo: 'To do',
  submitted: 'Submitted',
  graded: 'Graded',
} as const;

// Instructor / Certificates (design iCert): who has a certificate and how far each student is.
export default function InstructorCertificatesPage() {
  const navigate = useNavigate();
  const { data: progress, error: progressError, callAPI: getProgressAPI } = useApi(certificateService.progress);
  const { data: courses, callAPI: getCoursesAPI } = useApi(courseService.mine);
  const [q, setQ] = useState('');
  const [courseId, setCourseId] = useState('');
  const [state, setState] = useState<State | ''>('');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<number | null>(null);
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
        eyebrow="Certificates"
        title="Certificates"
        description="See who received a certificate and how far each student is. A certificate is issued when the student submits the assignment."
      />
      <StatGrid>
        <StatCard label="Issued" value={s?.issued ?? '—'} hint="Students with a certificate" />
        <StatCard label="In progress" value={s?.progress ?? '—'} hint="Working towards it" />
        <StatCard label="Not started" value={s?.new ?? '—'} hint="No activity yet" />
        <StatCard label="Enrollments" value={s?.enrollments ?? '—'} hint="Across your published courses" />
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
            aria-label="Certificate status"
            value={state}
            onChange={(e) => setState(e.target.value as State | '')}
          >
            <option value="">All statuses</option>
            <option value="issued">Issued</option>
            <option value="progress">In progress</option>
            <option value="new">Not started</option>
          </select>
        </div>
        {progressError && <p className="text-xs font-bold text-r">{progressError}</p>}
        {progress && progress.items.length === 0 && <p className="text-xs text-mu">No students match these filters.</p>}
        {progress && progress.items.length > 0 && (
          <Table
            head={[
              'Student',
              'Course',
              'Progress to certificate',
              'Requirements',
              'Next step',
              'Certificate',
              'Issued on',
              'Action',
            ]}
          >
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
                      <ProgressBar percent={x.percent} />
                    </span>
                    {x.percent}%
                  </span>
                </Td>
                <Td>
                  Quizzes {x.passed}/{x.total}
                  <br />
                  <small className="text-mu">Assignment: {ASG[x.assignment]}</small>
                </Td>
                <Td>{x.next}</Td>
                <Td>
                  {x.state === 'issued' ? (
                    <Badge tone="g">Issued</Badge>
                  ) : x.state === 'progress' ? (
                    <Badge>In progress</Badge>
                  ) : (
                    <Badge tone="x">Not started</Badge>
                  )}
                </Td>
                <Td>{x.certificate ? formatDate(x.certificate.issuedAt) : '—'}</Td>
                <Td>
                  <span className="flex flex-wrap gap-1.5">
                    <Button onClick={() => navigate(`/instructor/students/${x.student.id}?course=${x.course.id}`)}>
                      View progress
                    </Button>
                    {x.certificate && (
                      <Button variant="pri" onClick={() => setViewing(x.certificate!.id)}>
                        View certificate
                      </Button>
                    )}
                  </span>
                </Td>
              </tr>
            ))}
          </Table>
        )}
        {progress && (
          <Pager page={progress.page} pageSize={progress.pageSize} total={progress.total} onChange={setPage} />
        )}
      </Card>
      <CertificateModal certificateId={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
