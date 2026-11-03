import { useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { CATEGORY_LABELS, LEVEL_LABELS } from '@learnhub/shared';
import { CourseCover } from '../../../components/CourseCover';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Notice } from '../../../components/ui/Notice';
import { useApi } from '../../../hooks/useApi';
import { courseService } from '../../../services/courseService';
import { useAuthStore } from '../../../stores/authStore';

export const WHAT_YOU_GET = (questionCount: number, passMark: number) => [
  'Video lessons with notes',
  `A ${questionCount}-question quiz after each topic (${passMark} correct to pass)`,
  'An assignment reviewed by your instructor',
  'A certificate you can view and download',
];

// Public course detail (HLD 7: no video links, materials, quiz or assignment text). Enroll sends a visitor to sign in,
// then back to the course, where the enrollment finishes (LLD 5, "Start-up and redirects").
export default function PublicCourseDetailPage() {
  const id = Number(useParams().id);
  const user = useAuthStore((s) => s.user);
  const nav = useNavigate();
  const { data: course, error: courseError, callAPI: getCourseAPI } = useApi(courseService.publicView);
  useEffect(() => {
    void getCourseAPI(id);
  }, [id, getCourseAPI]); // eslint-disable-line react-hooks/exhaustive-deps

  // A signed-in student sees the same course inside the student area, with progress.
  if (user?.role === 'STUDENT') return <Navigate to={`/student/courses/${id}`} replace />;
  if (courseError)
    return (
      <EmptyState
        title="Course not found"
        message={courseError}
        action={
          <Link to="/">
            <Button>Back to courses</Button>
          </Link>
        }
      />
    );
  const c = course;
  if (!c) return <p className="text-xs text-mu">Loading…</p>;
  const returnTo = `/student/courses/${id}?enroll=1`;

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
          <Card title="Course content" subtitle="Preview of the topics. Enroll to start learning.">
            {c.lessons.map((l) => (
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
                    {l.durationMin} min video{l.hasQuiz ? ' · quiz after this topic' : ''}
                  </span>
                </span>
                <Badge tone="x">Locked</Badge>
              </div>
            ))}
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
            {!user && (
              <Notice>Create an account or sign in. We will bring you back here and finish your enrollment.</Notice>
            )}
            {!user && (
              <Button variant="pri" onClick={() => nav('/login', { state: { returnTo } })}>
                Enroll in this course
              </Button>
            )}
            {!user && <Button onClick={() => nav('/register', { state: { returnTo } })}>Create account</Button>}
            {user && <Notice>Only student accounts can enroll.</Notice>}
            <Link to="/">
              <Button className="w-full">Back to courses</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
