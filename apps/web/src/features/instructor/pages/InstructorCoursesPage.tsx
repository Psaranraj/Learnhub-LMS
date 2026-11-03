import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  CATEGORY_LABELS,
  LEVEL_LABELS,
  courseCreateSchema,
  type Category,
  type CourseStatusValue,
  type Level,
} from '@learnhub/shared';
import { CourseCover } from '../../../components/CourseCover';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Input } from '../../../components/ui/Input';
import { Modal, ModalActions } from '../../../components/ui/Modal';
import { Pager } from '../../../components/ui/Pager';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Tabs } from '../../../components/ui/Tabs';
import { useApi } from '../../../hooks/useApi';
import { useDebounced } from '../../../hooks/useDebounced';
import { courseService, type CourseCard } from '../../../services/courseService';
import { useAuthStore } from '../../../stores/authStore';
import { STATUS } from '../../../utils/status';
import { field } from '../../../utils/styles';

type Tab = 'my' | 'browse';

function CourseTile({ c, footer, own }: { c: CourseCard; footer: ReactNode; own: boolean }) {
  return (
    <article className="flex flex-col rounded-[13px] border border-ln bg-white p-[18px] shadow-card">
      <CourseCover title={c.title} />
      <h3 className="mb-1 text-sm font-bold">{c.title}</h3>
      <p className="mb-1 text-[11px] text-mu">
        {CATEGORY_LABELS[c.category]} · {LEVEL_LABELS[c.level]} · {c.instructor.name}
      </p>
      <p className="text-[11px] text-mu">
        {c.lessonCount} lessons · {c.quizCount} quizzes · {c.hasAssignment ? '1 assignment' : 'no assignment'}
        {own ? ` · ${c.studentCount ?? 0} students` : ''}
      </p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">{footer}</div>
    </article>
  );
}

// Instructor / Courses: tabs "My courses" and "Browse courses", and Create course (design iCourses).
export default function InstructorCoursesPage() {
  const me = useAuthStore((s) => s.user)!;
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'browse' ? 'browse' : 'my';
  const {
    data: myCourses,
    loading: myCoursesLoading,
    error: myCoursesError,
    callAPI: getMyCoursesAPI,
  } = useApi(courseService.mine);

  const {
    data: catalog,
    loading: catalogLoading,
    error: catalogError,
    callAPI: getCatalogAPI,
  } = useApi(courseService.catalog);

  const { data: instructorCourses, callAPI: getInstructorCoursesAPI } = useApi(courseService.catalog);

  const { loading: createLoading, error: createError, callAPI: createCourseAPI } = useApi(courseService.create);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<CourseStatusValue | ''>('');
  const [category, setCategory] = useState<Category | ''>('');
  const [level, setLevel] = useState<Level | ''>('');
  const [instructorId, setInstructorId] = useState('');
  const [page, setPage] = useState(1);
  const term = useDebounced(q);
  const [form, setForm] = useState<{ title: string; category: Category; level: Level } | null>(null);
  const [err, setErr] = useState('');

  // The dashboard's "Create course" opens this page with ?create=1.
  useEffect(() => {
    if (params.get('create') !== '1') return;
    setErr('');
    setForm({ title: '', category: 'DESIGN', level: 'BEGINNER' });
    setParams(
      (p) => {
        p.delete('create');
        return p;
      },
      { replace: true },
    );
  }, [params, setParams]);
  useEffect(() => {
    setPage(1);
  }, [tab, term, status, category, level, instructorId]);
  useEffect(() => {
    const common = { page, ...(term ? { q: term } : {}), ...(category ? { category } : {}) };
    if (tab === 'my') void getMyCoursesAPI({ ...common, ...(status ? { status } : {}) });
    else
      void getCatalogAPI({
        ...common,
        ...(level ? { level } : {}),
        ...(instructorId ? { instructorId: Number(instructorId) } : {}),
      });
  }, [tab, page, term, status, category, level, instructorId, getMyCoursesAPI, getCatalogAPI]);
  // The instructor filter lists everyone who teaches a published course.
  useEffect(() => {
    if (tab === 'browse' && !instructorCourses) void getInstructorCoursesAPI({ pageSize: 100 });
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  const teachers = [...new Map((instructorCourses?.items ?? []).map((c) => [c.instructor.id, c.instructor])).values()];

  async function submitCreate() {
    if (!form) return;
    const parsed = courseCreateSchema.safeParse(form);
    if (!parsed.success) return setErr(parsed.error.issues[0]?.message ?? 'Check the course.');
    setErr('');
    const res = await createCourseAPI(parsed.data);
    if (res) nav(`/instructor/courses/${res.id}/build`);
  }

  // The open tab decides which list is shown.
  const courses = tab === 'my' ? myCourses : catalog;
  const coursesLoading = tab === 'my' ? myCoursesLoading : catalogLoading;
  const coursesError = tab === 'my' ? myCoursesError : catalogError;
  const items = courses?.items ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Courses"
        title="Courses"
        description="Browse every course on LearnHub or manage the courses you teach."
        action={
          <Button
            variant="pri"
            onClick={() => {
              setErr('');
              setForm({ title: '', category: 'DESIGN', level: 'BEGINNER' });
            }}
          >
            Create course
          </Button>
        }
      />
      <Tabs<Tab>
        tabs={[
          { id: 'my', label: 'My courses' },
          { id: 'browse', label: 'Browse courses' },
        ]}
        active={tab}
        onChange={(t) => setParams(t === 'browse' ? { tab: 'browse' } : {})}
      />

      <Card>
        <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
          <input
            className={field}
            placeholder={tab === 'my' ? 'Search my courses' : 'Search courses or instructors'}
            aria-label="Search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {tab === 'my' && (
            <select
              className={field}
              aria-label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as CourseStatusValue | '')}
            >
              <option value="">All statuses</option>
              {(['PUBLISHED', 'PENDING_REVIEW', 'DRAFT', 'REJECTED'] as const).map((s) => (
                <option key={s} value={s}>
                  {STATUS[s].label}
                </option>
              ))}
            </select>
          )}
          <select
            className={field}
            aria-label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category | '')}
          >
            <option value="">All categories</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          {tab === 'browse' && (
            <>
              <select
                className={field}
                aria-label="Level"
                value={level}
                onChange={(e) => setLevel(e.target.value as Level | '')}
              >
                <option value="">All levels</option>
                {Object.entries(LEVEL_LABELS).map(([k, v]) => (
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
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </Card>

      {coursesError && <p className="text-xs font-bold text-r">{coursesError}</p>}
      {coursesLoading && !courses && <p className="text-xs text-mu">Loading…</p>}
      {courses &&
        items.length === 0 &&
        (tab === 'my' && !term && !status && !category ? (
          <EmptyState
            title="No courses yet"
            message="Create your first course. Add lessons, a quiz for each lesson and an assignment, then submit it for admin approval."
          />
        ) : (
          <EmptyState title="No courses match these filters" message="Try a different search or filter." />
        ))}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
        {items.map((c) => {
          const own = c.instructor.id === me.id;
          return tab === 'my' ? (
            <CourseTile
              key={c.id}
              c={c}
              own
              footer={
                <>
                  <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
                  <span className="flex gap-1.5">
                    <Link to={`/instructor/courses/${c.id}`}>
                      <Button variant="soft">Course details</Button>
                    </Link>
                    <Link to={`/instructor/courses/${c.id}/build`}>
                      <Button>{c.status === 'PENDING_REVIEW' ? 'View builder' : 'Course builder'}</Button>
                    </Link>
                  </span>
                </>
              }
            />
          ) : (
            <CourseTile
              key={c.id}
              c={c}
              own={own}
              footer={
                <>
                  <span className="text-[11px] text-mu">
                    {own ? 'You teach this' : `Taught by ${c.instructor.name}`}
                  </span>
                  <Link to={`/instructor/courses/${c.id}`}>
                    <Button variant="soft">Course details</Button>
                  </Link>
                </>
              }
            />
          );
        })}
      </div>
      {courses && <Pager page={courses.page} pageSize={courses.pageSize} total={courses.total} onChange={setPage} />}

      <Modal open={!!form} title="Create course" onClose={() => setForm(null)}>
        {form && (
          <>
            <Input
              label="Course title"
              placeholder="e.g. Python for Beginners"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <div className="grid gap-2.5 [grid-template-columns:1fr_1fr]">
              <label className="mb-3 block text-xs font-bold">
                Category
                <select
                  className={`${field} mt-[5px]`}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mb-3 block text-xs font-bold">
                Level
                <select
                  className={`${field} mt-[5px]`}
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value as Level })}
                >
                  {Object.entries(LEVEL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mb-2 text-xs text-mu">
              The course starts as a draft. Add the description, lessons, quizzes and the assignment in the course
              builder.
            </p>
            {(err || createError) && <p className="mb-2 text-xs font-bold text-r">{err || createError}</p>}
            <ModalActions>
              <Button onClick={() => setForm(null)}>Cancel</Button>
              <Button variant="pri" disabled={createLoading} onClick={submitCreate}>
                Create and open builder
              </Button>
            </ModalActions>
          </>
        )}
      </Modal>
    </div>
  );
}
