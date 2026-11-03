import { useEffect } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { PageHeader } from '../../../components/ui/PageHeader';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { StatCard, StatGrid } from '../../../components/ui/StatCard';
import { Table, Td } from '../../../components/ui/Table';
import { useApi } from '../../../hooks/useApi';
import { reportService } from '../../../services/reportService';

// Admin / Reports (design adRep): platform numbers, the per-instructor summary and enrollments by course.
export default function ReportsPage() {
  const { data: overview, error: overviewError, callAPI: getOverviewAPI } = useApi(reportService.overview);
  const {
    data: instructorReport,
    error: instructorReportError,
    callAPI: getInstructorReportAPI,
  } = useApi(reportService.instructors);
  const {
    data: enrollmentReport,
    error: enrollmentReportError,
    callAPI: getEnrollmentReportAPI,
  } = useApi(reportService.enrollments);
  useEffect(() => {
    void getOverviewAPI();
    void getInstructorReportAPI();
    void getEnrollmentReportAPI();
  }, [getOverviewAPI, getInstructorReportAPI, getEnrollmentReportAPI]); // eslint-disable-line react-hooks/exhaustive-deps

  const o = overview;
  const most = Math.max(1, ...(enrollmentReport ?? []).map((c) => c.students));
  const error = overviewError ?? instructorReportError ?? enrollmentReportError;
  return (
    <div>
      <PageHeader eyebrow="Reports" title="Reports" description="Platform numbers across published courses." />
      {error && <p className="mb-3 text-xs font-bold text-r">{error}</p>}
      <StatGrid>
        <StatCard
          label="Completion rate"
          value={o ? `${o.completionRate}%` : '—'}
          hint={`${o?.certificates ?? 0} of ${o?.enrollments ?? 0} enrollments`}
        />
        <StatCard
          label="Quiz pass rate"
          value={o ? `${o.quizPassRate}%` : '—'}
          hint={`${o?.passed ?? 0} passed, ${o?.failed ?? 0} not passed`}
        />
        <StatCard label="Assignments waiting for grading" value={o?.waiting ?? '—'} hint="Submitted, not graded" />
        <StatCard
          label="Enrollments"
          value={o?.enrollments ?? '—'}
          hint={`Across ${o?.publishedCourses ?? 0} courses`}
        />
      </StatGrid>
      <Card title="Per-instructor summary" subtitle="Courses, students and results for each instructor">
        {instructorReport && instructorReport.length === 0 && <p className="text-xs text-mu">No instructors yet.</p>}
        {instructorReport && instructorReport.length > 0 && (
          <Table
            head={[
              'Instructor',
              'Published courses',
              'Students',
              'Completion rate',
              'Quiz pass rate',
              'Assignments to grade',
            ]}
          >
            {instructorReport.map((r) => (
              <tr key={r.instructor.id}>
                <Td>
                  <strong>{r.instructor.name}</strong>
                  {!r.instructor.active && (
                    <>
                      <br />
                      <small className="text-mu">Inactive</small>
                    </>
                  )}
                </Td>
                <Td>{r.publishedCourses}</Td>
                <Td>{r.students}</Td>
                <Td>{r.completionRate}%</Td>
                <Td>{r.quizPassRate}%</Td>
                <Td>{r.waiting ? <Badge tone="o">{`${r.waiting} waiting`}</Badge> : <Badge tone="g">None</Badge>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Card title="Enrollments by course">
        {enrollmentReport && enrollmentReport.length === 0 && (
          <p className="text-xs text-mu">No published courses yet.</p>
        )}
        {enrollmentReport?.map((c) => (
          <div
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-3 border-t border-ln py-3 text-xs first:border-t-0"
          >
            <span className="min-w-[180px] flex-1">
              {c.title}
              <br />
              <small className="text-mu">{c.instructor}</small>
            </span>
            <span className="w-1/2 max-md:w-full">
              <ProgressBar percent={Math.round((c.students / most) * 100)} />
            </span>
            <span className="text-mu">{c.students} students</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
