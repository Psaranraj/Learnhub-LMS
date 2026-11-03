import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CourseTileCard } from '../../../components/CourseTileCard';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Pager } from '../../../components/ui/Pager';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { Tabs } from '../../../components/ui/Tabs';
import { useApi } from '../../../hooks/useApi';
import { useDebounced } from '../../../hooks/useDebounced';
import { courseService } from '../../../services/courseService';
import { enrollmentService, type MyCourse } from '../../../services/enrollmentService';
import { field } from '../../../utils/styles';

type Tab = 'my' | 'browse';

// Student / My courses (design pCourses): "My courses" with progress, and "Browse courses" with a few to discover.
export default function MyCoursesPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'browse' ? 'browse' : 'my';
  const {
    data: myCourses,
    loading: myCoursesLoading,
    error: myCoursesError,
    callAPI: getMyCoursesAPI,
  } = useApi(enrollmentService.mine);
  const { data: allCourses, callAPI: getAllCoursesAPI } = useApi(enrollmentService.mine);
  const { data: catalog, loading: catalogLoading, callAPI: getCatalogAPI } = useApi(courseService.catalog);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<MyCourse['status'] | ''>('');
  const [page, setPage] = useState(1);
  const term = useDebounced(q);

  useEffect(() => {
    setPage(1);
  }, [term, status]);
  useEffect(() => {
    if (tab === 'my') void getMyCoursesAPI({ page, ...(term ? { q: term } : {}), ...(status ? { status } : {}) });
  }, [tab, page, term, status, getMyCoursesAPI]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (tab === 'browse') {
      void getAllCoursesAPI({ pageSize: 100 });
      void getCatalogAPI({ pageSize: 50 });
    }
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const enrolled = new Set((allCourses?.items ?? []).map((m) => m.course.id));
  const featured = (catalog?.items ?? []).filter((c) => !enrolled.has(c.id)).slice(0, 3);

  return (
    <div>
      <PageHeader eyebrow="Learning" title="My courses" description="Continue learning or browse new courses." />
      <Tabs<Tab>
        tabs={[
          { id: 'my', label: 'My courses' },
          { id: 'browse', label: 'Browse courses' },
        ]}
        active={tab}
        onChange={(t) => setParams(t === 'browse' ? { tab: 'browse' } : {})}
      />

      {tab === 'my' ? (
        <Card>
          <div className="mb-3 grid gap-2.5 [grid-template-columns:2fr_1fr] max-md:[grid-template-columns:1fr]">
            <input
              className={field}
              placeholder="Search my courses"
              aria-label="Search my courses"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className={field}
              aria-label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as MyCourse['status'] | '')}
            >
              <option value="">All statuses</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
          {myCoursesError && <p className="text-xs font-bold text-r">{myCoursesError}</p>}
          {myCoursesLoading && !myCourses && <p className="text-xs text-mu">Loading…</p>}
          {myCourses &&
            myCourses.items.length === 0 &&
            (term || status ? (
              <p className="text-xs text-mu">No courses match. Try another search or status.</p>
            ) : (
              <EmptyState
                title="No courses yet"
                message="Browse the catalog and enroll for free."
                action={
                  <Link to="/student/catalog">
                    <Button variant="pri">Browse courses</Button>
                  </Link>
                }
              />
            ))}
          {myCourses?.items.map((m) => (
            <div
              key={m.course.id}
              className="flex flex-wrap items-center gap-3 border-t border-ln py-3 text-xs first:border-t-0"
            >
              <span className="min-w-[200px] flex-1">
                <strong>{m.course.title}</strong>
                <br />
                <span className="text-mu">
                  {m.course.instructor.name} · {m.progress.passed} of {m.progress.total} topics passed
                </span>
              </span>
              <span className="w-32">
                <ProgressBar percent={m.progress.percent} />
              </span>
              <span className="text-mu">{m.progress.percent}%</span>
              {m.status === 'COMPLETED' ? <Badge tone="g">Completed</Badge> : <Badge tone="o">In progress</Badge>}
              <Link to={`/student/learn/${m.course.id}`}>
                <Button variant="soft">Continue</Button>
              </Link>
              <Link to={`/student/courses/${m.course.id}`}>
                <Button>Details</Button>
              </Link>
            </div>
          ))}
          {myCourses && (
            <Pager page={myCourses.page} pageSize={myCourses.pageSize} total={myCourses.total} onChange={setPage} />
          )}
        </Card>
      ) : (
        <>
          <Card
            title="Discover courses"
            subtitle="Free to enroll. Each course is learned topic by topic, with a quiz after each topic."
          >
            <Link to="/student/catalog">
              <Button variant="pri">View all courses</Button>
            </Link>
          </Card>
          {catalogLoading && !catalog && <p className="text-xs text-mu">Loading…</p>}
          {catalog && featured.length === 0 && (
            <p className="text-xs text-mu">You are enrolled in every available course.</p>
          )}
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
            {featured.map((c) => (
              <CourseTileCard
                key={c.id}
                c={c}
                footer={
                  <>
                    <span className="text-[11px] text-mu">Free to enroll</span>
                    <Link to={`/student/courses/${c.id}`}>
                      <Button variant="soft">Details</Button>
                    </Link>
                  </>
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
