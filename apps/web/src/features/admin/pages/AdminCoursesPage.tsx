import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CATEGORY_LABELS, LEVEL_LABELS, type Category, type CourseStatusValue } from '@learnhub/shared';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Pager } from '../../../components/ui/Pager';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Table, Td } from '../../../components/ui/Table';
import { useApi } from '../../../hooks/useApi';
import { courseService } from '../../../services/courseService';
import { userService } from '../../../services/userService';
import { useDebounced } from '../../../hooks/useDebounced';
import { STATUS } from '../../../utils/status';
import { field } from '../../../utils/styles';
import { useUiStore } from '../../../stores/uiStore';
import { useCourseActions } from '../components/useCourseActions';

export default function AdminCoursesPage() {
  const toast = useUiStore((s) => s.showToast);
  const {
    data: courses,
    loading: coursesLoading,
    error: coursesError,
    callAPI: getCoursesAPI,
  } = useApi(courseService.adminList);
  const { data: instructors, callAPI: getInstructorsAPI } = useApi(userService.list);
  const { error: assignError, callAPI: changeInstructorAPI } = useApi(courseService.changeInstructor);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);

  const load = useCallback(() => {
    void getCoursesAPI({
      page,
      ...(search ? { q: search } : {}),
      ...(status ? { status: status as CourseStatusValue } : {}),
      ...(category ? { category: category as Category } : {}),
      ...(instructorId ? { instructorId: Number(instructorId) } : {}),
    });
  }, [getCoursesAPI, page, search, status, category, instructorId]); // eslint-disable-line react-hooks/exhaustive-deps
  const actions = useCourseActions(load);

  useEffect(() => {
    setPage(1);
  }, [search, status, category, instructorId]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    void getInstructorsAPI({ role: 'INSTRUCTOR', status: 'ACTIVE', pageSize: 100 });
  }, [getInstructorsAPI]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (assignError) toast(assignError);
  }, [assignError, toast]);

  async function changeInstructor(courseId: number, id: string) {
    if (await changeInstructorAPI(courseId, Number(id))) {
      toast('Instructor changed');
      load();
    }
  }
  const people = instructors?.items ?? [];
  const items = courses?.items ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Courses and approvals"
        description="Instructors submit courses here. Approve to publish, or reject with a reason."
      />
      <Card>
        <div className="mb-3.5 grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
          <input
            className={field}
            placeholder="Search courses"
            aria-label="Search courses"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className={field} aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <select
            className={field}
            aria-label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            className={field}
            aria-label="Instructor"
            value={instructorId}
            onChange={(e) => setInstructorId(e.target.value)}
          >
            <option value="">All instructors</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {coursesError && <p className="text-xs font-bold text-r">{coursesError}</p>}
        {courses && items.length === 0 && (
          <EmptyState title="No courses match" message="Try a different search or filter." />
        )}
        {items.length > 0 && (
          <Table head={['Course', 'Instructor', 'Category and level', 'Status', 'Action']}>
            {items.map((c) => (
              <tr key={c.id}>
                <Td>
                  <Link className="font-bold hover:text-p" to={`/admin/courses/${c.id}`}>
                    {c.title}
                  </Link>
                  <br />
                  <span className="text-mu">
                    {c.lessonCount} lessons · {c.quizCount} quizzes · {c.studentCount} students
                  </span>
                </Td>
                <Td>
                  <select
                    className={`${field} min-w-[130px]`}
                    aria-label={`Instructor for ${c.title}`}
                    value={c.instructor.id}
                    onChange={(e) => changeInstructor(c.id, e.target.value)}
                  >
                    {!people.some((p) => p.id === c.instructor.id) && (
                      <option value={c.instructor.id}>{c.instructor.name}</option>
                    )}
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Td>
                <Td>
                  {CATEGORY_LABELS[c.category]} · {LEVEL_LABELS[c.level]}
                </Td>
                <Td>
                  <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
                </Td>
                <Td>
                  <span className="flex flex-wrap gap-1.5">
                    <Link to={`/admin/courses/${c.id}`}>
                      <Button>Open</Button>
                    </Link>
                    {c.status === 'PENDING_REVIEW' && (
                      <Button variant="pri" disabled={actions.busy} onClick={() => actions.approve(c.id)}>
                        Approve
                      </Button>
                    )}
                    {c.status === 'PENDING_REVIEW' && (
                      <Button variant="danger" onClick={() => actions.askReject(c.id, c.title)}>
                        Reject
                      </Button>
                    )}
                    {c.status === 'PUBLISHED' && (
                      <Button onClick={() => actions.askUnpublish(c.id, c.title)}>Unpublish</Button>
                    )}
                  </span>
                </Td>
              </tr>
            ))}
          </Table>
        )}
        {coursesLoading && !courses && <p className="text-xs text-mu">Loading…</p>}
        {courses && <Pager page={courses.page} pageSize={courses.pageSize} total={courses.total} onChange={setPage} />}
      </Card>
      {actions.dialogs}
    </div>
  );
}
