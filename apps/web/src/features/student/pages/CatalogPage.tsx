import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CourseTileCard } from '../../../components/CourseTileCard';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Pager } from '../../../components/ui/Pager';
import { useApi } from '../../../hooks/useApi';
import { useDebounced } from '../../../hooks/useDebounced';
import { courseService } from '../../../services/courseService';
import { enrollmentService } from '../../../services/enrollmentService';
import { CatalogFilters, type Filters } from '../../public/components/CatalogFilters';

// Student / All courses (design pCatalog): every published course, with search, category and level.
export default function CatalogPage() {
  const { data: courses, error: coursesError, callAPI: getCoursesAPI } = useApi(courseService.catalog);
  const { data: myCourses, callAPI: getMyCoursesAPI } = useApi(enrollmentService.mine);
  const [f, setF] = useState<Filters>({ q: '', category: '', level: '' });
  const [page, setPage] = useState(1);
  const q = useDebounced(f.q);

  useEffect(() => {
    void getMyCoursesAPI({ pageSize: 100 });
  }, [getMyCoursesAPI]); // eslint-disable-line react-hooks/exhaustive-deps
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
  const enrolled = new Set((myCourses?.items ?? []).map((m) => m.course.id));

  return (
    <div>
      <PageHeader
        eyebrow="Catalog"
        title="All courses"
        description="Browse every published course."
        action={
          <Link to="/student/courses">
            <Button>Back to my courses</Button>
          </Link>
        }
      />
      <CatalogFilters value={f} onChange={setF} />
      {coursesError && <p className="text-xs font-bold text-r">{coursesError}</p>}
      {courses && courses.items.length === 0 && (
        <EmptyState title="No courses match these filters" message="Try a different search or filter." />
      )}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
        {courses?.items.map((c) => (
          <CourseTileCard
            key={c.id}
            c={c}
            footer={
              <>
                <span className="text-[11px] text-mu">{enrolled.has(c.id) ? 'Enrolled' : 'Free to enroll'}</span>
                <Link to={`/student/courses/${c.id}`}>
                  <Button variant="soft">Details</Button>
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
