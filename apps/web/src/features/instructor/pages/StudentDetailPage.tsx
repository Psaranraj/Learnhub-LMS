import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { PdfModal } from '../../../components/PdfModal';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Notice } from '../../../components/ui/Notice';
import { PageHeader } from '../../../components/ui/PageHeader';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { StatCard, StatGrid } from '../../../components/ui/StatCard';
import { Table, Td } from '../../../components/ui/Table';
import { Tabs } from '../../../components/ui/Tabs';
import { useApi } from '../../../hooks/useApi';
import { assignmentService } from '../../../services/assignmentService';
import { enrollmentService, type StudentDetail } from '../../../services/enrollmentService';
import { saveBlob } from '../../../utils/download';
import { formatDate } from '../../../utils/format';
import { field } from '../../../utils/styles';
import { GradeModal } from '../components/GradeModal';
import { QuizReviewModal } from '../components/QuizReviewModal';

type Tab = 'quiz' | 'asg';
type QuizFilter = '' | 'pending' | 'passed' | 'failed' | 'received' | 'notyet';
type Lesson = StudentDetail['lessons'][number];

// The design's per-lesson quiz states (qStat) from the server's quiz state.
const quizFilterOf = (l: Lesson): QuizFilter | 'none' => {
  switch (l.quiz?.state) {
    case 'passed':
      return 'passed';
    case 'review':
      return 'pending';
    case 'failed':
      return 'failed';
    case 'open':
      return 'received';
    case 'locked':
      return 'notyet';
    default:
      return 'none';
  }
};

function LessonQuizBadge({ l }: { l: Lesson }) {
  const q = l.quiz;
  if (!q) return <Badge tone="x">No quiz</Badge>;
  switch (q.state) {
    case 'passed':
      return <Badge tone="g">{`Passed ${q.score ?? ''}/${q.questionCount}`}</Badge>;
    case 'review':
      return <Badge tone="o">Waiting for review</Badge>;
    case 'failed':
      return <Badge tone="r">{`Not passed ${q.score ?? ''}/${q.questionCount}`}</Badge>;
    case 'open':
      return <Badge>Received, not attempted</Badge>;
    default:
      return <Badge tone="x">Not received yet</Badge>;
  }
}

// Instructor / Student detail (design iSDetail): course picker, four numbers, lessons and quizzes (Review quiz,
// Release marks) and the assignment (View PDF, Review and grade).
export default function StudentDetailPage() {
  const studentId = Number(useParams().studentId);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const courseId = Number(params.get('course'));
  const { data: detail, error: detailError, callAPI: getStudentDetailAPI } = useApi(enrollmentService.studentDetail);
  const { loading: fileLoading, error: fileError, callAPI: getFileAPI } = useApi(assignmentService.file);
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) === 'asg' ? 'asg' : 'quiz');
  const [quizFilter, setQuizFilter] = useState<QuizFilter>('');
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [grading, setGrading] = useState(false);
  const [viewingPdf, setViewingPdf] = useState(false);

  const load = useCallback(() => getStudentDetailAPI(courseId, studentId), [courseId, studentId, getStudentDetailAPI]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (courseId) void load();
  }, [load, courseId]);

  if (!courseId) return <Navigate to="/instructor/students" replace />;
  const back = <Button onClick={() => navigate('/instructor/students')}>Back to students</Button>;
  if (detailError) return <EmptyState title="Student" message={detailError} action={back} />;
  const d = detail && detail.course.id === courseId && detail.student.id === studentId ? detail : null;
  if (!d) return <p className="text-xs text-mu">Loading…</p>;

  const n = d.lessons.length;
  const waiting = d.lessons.filter((l) => l.quiz?.state === 'review').length;
  const rows = d.lessons.filter((l) => !quizFilter || quizFilterOf(l) === quizFilter);
  const a = d.assignment;
  const sub = a?.submission ?? null;
  const download = async () => {
    if (sub) {
      const b = await getFileAPI(sub.id);
      if (b) saveBlob(b, sub.fileName);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Student"
        title={d.student.name}
        description={`${d.student.email} · ${d.student.mobile}`}
        action={back}
      />
      <div className="mb-4 max-w-[340px]">
        <select
          className={field}
          aria-label="Course"
          value={courseId}
          onChange={(e) => setParams({ course: e.target.value })}
        >
          {d.courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>
      <StatGrid>
        <StatCard
          label="Progress"
          value={`${d.progress.percent}%`}
          hint={`${d.progress.passed} of ${n} lessons passed`}
        />
        <StatCard label="Videos watched" value={`${d.videosReached} / ${n}`} hint="70% or more watched" />
        <StatCard label="Quizzes passed" value={`${d.progress.passed} / ${n}`} hint={`${waiting} waiting for review`} />
        <StatCard
          label="Certificate"
          value={d.certificate ? 'Issued' : 'Not yet'}
          hint="Issued when the assignment is submitted"
        />
      </StatGrid>
      <Tabs<Tab>
        tabs={[
          { id: 'quiz', label: 'Lessons and quizzes' },
          { id: 'asg', label: 'Assignment' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'quiz' && (
        <Card>
          <div className="mb-3 max-w-[260px]">
            <select
              className={field}
              aria-label="Quiz status"
              value={quizFilter}
              onChange={(e) => setQuizFilter(e.target.value as QuizFilter)}
            >
              <option value="">All quiz statuses</option>
              <option value="pending">Waiting for review</option>
              <option value="passed">Passed</option>
              <option value="failed">Not passed</option>
              <option value="received">Received, not attempted</option>
              <option value="notyet">Not received yet</option>
            </select>
          </div>
          {rows.length === 0 ? (
            <p className="text-xs text-mu">No lessons match this filter.</p>
          ) : (
            <Table head={['Lesson', 'Video watched', 'Quiz', 'Marks', 'Action']}>
              {rows.map((l) => {
                const q = l.quiz;
                return (
                  <tr key={l.id}>
                    <Td>
                      <strong>
                        {l.position}. {l.title}
                      </strong>
                    </Td>
                    <Td>
                      <span className="flex items-center gap-2">
                        <span className="w-24">
                          <ProgressBar percent={Math.min(100, l.watchedPercent)} />
                        </span>
                        {l.watchedPercent}%
                      </span>
                    </Td>
                    <Td>
                      <LessonQuizBadge l={l} />
                    </Td>
                    <Td>{q && q.score !== null && q.state !== 'review' ? `${q.score} / ${q.questionCount}` : '—'}</Td>
                    <Td>
                      {q?.attemptId && q.state === 'review' && (
                        <Button variant="pri" onClick={() => setReviewing(q.attemptId)}>
                          Review quiz
                        </Button>
                      )}
                      {q?.attemptId && (q.state === 'passed' || q.state === 'failed') && (
                        <Button onClick={() => setReviewing(q.attemptId)}>View answers</Button>
                      )}
                      {!(q?.attemptId && ['review', 'passed', 'failed'].includes(q.state)) && (
                        <span className="text-mu">—</span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </Table>
          )}
        </Card>
      )}

      {tab === 'asg' && !a && (
        <Card>
          <p className="text-xs text-mu">This course has no assignment.</p>
        </Card>
      )}
      {tab === 'asg' && a && (
        <>
          <Card title={a.title}>
            {a.instructions && (
              <p className="mb-2 whitespace-pre-line text-xs leading-relaxed text-mu">{a.instructions}</p>
            )}
            {a.todoItems.map((t, k) => (
              <div key={k} className="py-1 text-xs">
                {sub?.checks[k] ? <span className="font-bold text-g">✓</span> : <span className="text-mu">○</span>} {t}
              </div>
            ))}
            {a.dueDate && <p className="mt-1 text-xs text-mu">Due {formatDate(a.dueDate, true)}</p>}
          </Card>
          <Card title="Submission">
            {a.state === 'locked' && (
              <p className="text-xs text-mu">
                Locked. It opens after all lesson quizzes are passed ({d.progress.passed} of {n} so far).
              </p>
            )}
            {a.state === 'todo' && (
              <>
                <p className="mb-2 text-xs text-mu">{d.student.name} has not submitted the assignment yet.</p>
                <Badge tone="o">To do</Badge>
              </>
            )}
            {sub && (
              <>
                {a.state === 'submitted' && (
                  <p className="mb-2 text-xs text-mu">Review the PDF, then give a grade and feedback.</p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ln py-2.5 text-xs">
                  <span>
                    <strong>{sub.fileName}</strong>
                    <br />
                    <small className="text-mu">
                      Submitted {formatDate(sub.submittedAt)}
                      {sub.late ? ' · Late' : ''}
                    </small>
                  </span>
                  <span className="flex gap-1.5">
                    <Button onClick={() => setViewingPdf(true)}>View PDF</Button>
                    <Button disabled={fileLoading} onClick={download}>
                      Download
                    </Button>
                  </span>
                </div>
                {fileError && <p className="text-xs font-bold text-r">{fileError}</p>}
                {a.state === 'graded' && (
                  <>
                    <Notice tone="ok">Graded {sub.grade} / 100</Notice>
                    <p className="text-xs">
                      <strong>Your feedback:</strong> {sub.feedback}
                    </p>
                  </>
                )}
                <div className="mt-3 flex justify-end">
                  <Button variant={a.state === 'submitted' ? 'pri' : 'default'} onClick={() => setGrading(true)}>
                    {a.state === 'submitted' ? 'Review and grade' : 'Edit grade'}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </>
      )}

      <QuizReviewModal attemptId={reviewing} onClose={() => setReviewing(null)} onReleased={() => void load()} />
      {sub && (
        <>
          <GradeModal
            target={
              grading
                ? {
                    submissionId: sub.id,
                    studentName: d.student.name,
                    courseTitle: d.course.title,
                    fileName: sub.fileName,
                    grade: sub.grade,
                    feedback: sub.feedback,
                  }
                : null
            }
            onClose={() => setGrading(false)}
            onViewPdf={() => setViewingPdf(true)}
            onGraded={() => void load()}
          />
          <PdfModal
            open={viewingPdf}
            title={sub.fileName}
            fileName={sub.fileName}
            load={() => assignmentService.file(sub.id)}
            onClose={() => setViewingPdf(false)}
          />
        </>
      )}
    </div>
  );
}
