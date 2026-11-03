import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CourseTileCard } from '../../../components/CourseTileCard';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Pager } from '../../../components/ui/Pager';
import { useApi } from '../../../hooks/useApi';
import { useDebounced } from '../../../hooks/useDebounced';
import { courseService } from '../../../services/courseService';
import { useAuthStore } from '../../../stores/authStore';
import { homeOf } from '../../../utils/routes';
import { CatalogFilters, type Filters } from '../components/CatalogFilters';

// Public home (design R.Public.home): hero, filters and the published courses.
export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const {
    data: courses,
    loading: coursesLoading,
    error: coursesError,
    callAPI: getCoursesAPI,
  } = useApi(courseService.catalog);
  const [f, setF] = useState<Filters>({ q: '', category: '', level: '' });
  const [page, setPage] = useState(1);
  const q = useDebounced(f.q);

  useEffect(() => {
    setPage(1);
  }, [q, f.category, f.level]);
  useEffect(() => {
    void getCoursesAPI({
      page,
      pageSize: 12,
      ...(q ? { q } : {}),
      ...(f.category ? { category: f.category } : {}),
      ...(f.level ? { level: f.level } : {}),
    });
  }, [page, q, f.category, f.level, getCoursesAPI]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <section className="mb-5 rounded-[18px] bg-nv px-7 py-9 text-white">
        <h1 className="mb-2 text-[28px] font-extrabold tracking-[-1px]">Learn skills that move your career</h1>
        <p className="text-sm text-[#c9c8e0]">
          Browse free courses, learn at your pace, take quizzes and earn certificates.
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          {user ? (
            <Link to={homeOf(user.role)}>
              <Button variant="pri">Go to my dashboard</Button>
            </Link>
          ) : (
            <>
              <Link to="/register">
                <Button variant="pri">Create free account</Button>
              </Link>
              <Link to="/login">
                <Button>Sign in</Button>
              </Link>
            </>
          )}
        </div>
      </section>
      <CatalogFilters value={f} onChange={setF} />
      {coursesError && <p className="text-xs font-bold text-r">{coursesError}</p>}
      {coursesLoading && !courses && <p className="text-xs text-mu">Loading…</p>}
      {courses && courses.items.length === 0 && (
        <EmptyState title="No courses match" message="Try a different search or filter." />
      )}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
        {courses?.items.map((c) => (
          <CourseTileCard
            key={c.id}
            c={c}
            footer={
              <>
                <span className="text-[11px] text-mu">Free to enroll</span>
                <Link to={`/courses/${c.id}`}>
                  <Button variant="soft">View course</Button>
                </Link>
              </>
            }
          />
        ))}
      </div>
      {courses && <Pager page={courses.page} pageSize={courses.pageSize} total={courses.total} onChange={setPage} />}
    </div>
  );
}
