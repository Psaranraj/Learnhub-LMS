import { useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { CATEGORY_LABELS, LEVEL_LABELS } from '@learnhub/shared';
import { CourseCover } from '../../../components/CourseCover';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useApi } from '../../../hooks/useApi';
import { courseService } from '../../../services/courseService';
import { enrollmentService } from '../../../services/enrollmentService';
import { learningService } from '../../../services/learningService';
import { useUiStore } from '../../../stores/uiStore';
import { WHAT_YOU_GET } from '../../public/pages/PublicCourseDetailPage';
import { QuizBadge } from '../components/QuizBadge';

// Student / Course detail (design pDetail): the topics with the student's own quiz states, then Enroll or Continue.
// Arriving with ?enroll=1 (after sign-in from the public page) finishes the enrollment.
export default function StudentCourseDetailPage() {
  const id = Number(useParams().id);
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const toast = useUiStore((s) => s.showToast);
  const { data: course, error: courseError, callAPI: getCourseAPI } = useApi(courseService.publicView);
  const {
    data: learning,
    loading: learningLoading,
    error: learningError,
    callAPI: getLearningAPI,
  } = useApi(learningService.course);
  const { loading: enrollLoading, error: enrollError, callAPI: enrollAPI } = useApi(enrollmentService.enroll);
  const autoDone = useRef(false);

  const load = useCallback(() => {
    void getCourseAPI(id);
    void getLearningAPI(id);
  }, [id, getCourseAPI, getLearningAPI]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, [load]);

  const enrolled = !!learning;
  const doEnroll = useCallback(async () => {
    if (await enrollAPI(id)) {
      toast('Enrolled. The course is now in My courses');
      nav(`/student/learn/${id}`);
    }
  }, [enrollAPI, id, nav, toast]); // eslint-disable-line react-hooks/exhaustive-deps

  // Finish the enrollment that started on the public page, once we know the student is not enrolled yet.
  useEffect(() => {
    if (params.get('enroll') !== '1' || autoDone.current || learningLoading || !course) return;
    if (learning || learningError) {
      autoDone.current = true;
      setParams({}, { replace: true });
      if (!learning) void doEnroll();
    }
  }, [params, learningLoading, learning, learningError, course, doEnroll, setParams]);

  if (courseError)
    return (
      <EmptyState
        title="Course not found"
        message={courseError}
        action={
          <Link to="/student/catalog">
            <Button>Back to catalog</Button>
          </Link>
        }
      />
    );
  const c = course;
  if (!c) return <p className="text-xs text-mu">Loading…</p>;
  const topics = learning?.lessons;

  return (
    <div>
      <div className="text-xs text-mu">Courses / {CATEGORY_LABELS[c.category]}</div>
      <div className="mt-2.5 grid items-start gap-4 [grid-template-columns:minmax(0,2fr)_minmax(280px,1fr)] max-md:[grid-template-columns:1fr]">
        <div>
          <div className="mb-2.5 flex gap-1.5">
            <Badge>{CATEGORY_LABELS[c.category]}</Badge>
            <Badge tone="g">{LEVEL_LABELS[c.level]}</Badge>
          </div>
          <h1 className="mb-2.5 text-[30px] font-extrabold tracking-[-1px]">{c.title}</h1>
          <p className="mb-2.5 max-w-[620px] text-xs leading-relaxed">{c.description}</p>
          <p className="mb-4 text-xs">
            <strong>Instructor:</strong> {c.instructor.name} · {c.lessonCount} topics · {c.quizCount} quizzes ·{' '}
            {c.hasAssignment ? '1 assignment' : 'no assignment'}
          </p>
          <Card
            title="Course content"
            subtitle={enrolled ? 'Your progress on each topic' : 'Preview of the topics. Enroll to start learning.'}
          >
            {c.lessons.map((l) => {
              const t = topics?.find((x) => x.id === l.id);
              return (
                <div
                  key={l.id}
                  className="flex items-center justify-between gap-3 border-t border-ln py-2.5 text-xs first:border-t-0"
                >
                  <span>
                    <strong>
                      {l.position}. {l.title}
                    </strong>
                    <br />
                    <span className="text-mu">Video · quiz after this topic</span>
                  </span>
                  {t ? <QuizBadge quiz={t.quiz} /> : <Badge tone="x">Locked</Badge>}
                </div>
              );
            })}
          </Card>
        </div>
        <Card>
          <CourseCover title={c.title} tall />
          <p className="mb-2 text-xs text-mu">What you get</p>
          {WHAT_YOU_GET(c.quizRule?.questionCount ?? 10, c.quizRule?.passMark ?? 8).map((x) => (
            <p key={x} className="py-1 text-xs">
              ✓ {x}
            </p>
          ))}
          <div className="mt-3.5 grid gap-2">
            {enrolled ? (
              <Link to={`/student/learn/${id}`}>
                <Button variant="pri" className="w-full">
                  Continue learning
                </Button>
              </Link>
            ) : (
              <Button variant="pri" disabled={enrollLoading || learningLoading} onClick={doEnroll}>
                Enroll in this course
              </Button>
            )}
            {enrollError && <p className="text-xs font-bold text-r">{enrollError}</p>}
            <Link to="/student/catalog">
              <Button className="w-full">Back to catalog</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
