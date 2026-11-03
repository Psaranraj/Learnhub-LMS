import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Pager } from '../../../components/ui/Pager';
import { Table, Td } from '../../../components/ui/Table';
import { useApi } from '../../../hooks/useApi';
import { enrollmentService } from '../../../services/enrollmentService';
import { quizService, type MyQuizParams } from '../../../services/quizService';
import { field } from '../../../utils/styles';
import { QuizBadge } from '../components/QuizBadge';
import { QuizStartDialogs, type QuizStart } from '../components/QuizStartDialogs';

type State = NonNullable<MyQuizParams['state']>;

// Student / Quizzes (design pQuiz): every topic quiz with its state, score and the next action.
export default function QuizzesPage() {
  const { data: quizzes, error: quizzesError, callAPI: getQuizzesAPI } = useApi(quizService.mine);
  const { data: courses, callAPI: getCoursesAPI } = useApi(enrollmentService.mine);
  const [courseId, setCourseId] = useState('');
  const [state, setState] = useState<State | ''>('');
  const [page, setPage] = useState(1);
  const [start, setStart] = useState<QuizStart | null>(null);

  useEffect(() => {
    void getCoursesAPI({ pageSize: 100 });
  }, [getCoursesAPI]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setPage(1);
  }, [courseId, state]);
  useEffect(() => {
    void getQuizzesAPI({
      page,
      ...(courseId ? { courseId: Number(courseId) } : {}),
      ...(state ? { state } : {}),
    });
  }, [page, courseId, state, getQuizzesAPI]); // eslint-disable-line react-hooks/exhaustive-deps

  const first = quizzes?.items[0]?.quiz;
  return (
    <div>
      <PageHeader
        eyebrow="Assessment"
        title="Quizzes"
        description={`Each topic has a ${first?.questionCount ?? 10}-question quiz, received when you have watched 70% of that topic's video. ${first?.passMark ?? 8} correct to pass. Your marks come after your instructor reviews your answers.`}
      />
      <Card>
        <div className="mb-3 grid gap-2.5 [grid-template-columns:1fr_1fr] max-md:[grid-template-columns:1fr]">
          <select className={field} aria-label="Course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">All courses</option>
            {courses?.items.map((m) => (
              <option key={m.course.id} value={m.course.id}>
                {m.course.title}
              </option>
            ))}
          </select>
          <select
            className={field}
            aria-label="Status"
            value={state}
            onChange={(e) => setState(e.target.value as State | '')}
          >
            <option value="">All statuses</option>
            <option value="open">Received</option>
            <option value="review">Waiting for review</option>
            <option value="passed">Passed</option>
            <option value="failed">Not passed</option>
            <option value="locked">Locked</option>
          </select>
        </div>
        {quizzesError && <p className="text-xs font-bold text-r">{quizzesError}</p>}
        {quizzes && quizzes.items.length === 0 && (
          <EmptyState
            title="No quizzes match these filters"
            message="Enroll in a course and watch a topic video to receive its quiz."
          />
        )}
        {quizzes && quizzes.items.length > 0 && (
          <Table head={['Course', 'Topic', 'Status', 'Score', 'Action']}>
            {quizzes.items.map(({ course, lesson, quiz }) => {
              const attend = () =>
                setStart({
                  lessonId: lesson.id,
                  topic: lesson.title,
                  questionCount: quiz.questionCount,
                  passMark: quiz.passMark,
                  step: 'rules',
                });
              const answers = quiz.attemptId && (
                <Link to={`/student/quizzes/attempts/${quiz.attemptId}`}>
                  <Button>View answers</Button>
                </Link>
              );
              return (
                <tr key={quiz.id}>
                  <Td>{course.title}</Td>
                  <Td>
                    {lesson.position}. {lesson.title}
                  </Td>
                  <Td>
                    <QuizBadge quiz={quiz} />
                  </Td>
                  <Td>
                    {quiz.state === 'review'
                      ? 'Awaiting review'
                      : quiz.score !== null
                        ? `${quiz.score} / ${quiz.questionCount}`
                        : '—'}
                  </Td>
                  <Td>
                    <span className="flex flex-wrap gap-1.5">
                      {(quiz.state === 'open' || quiz.state === 'failed') && lesson.open && (
                        <Button variant="pri" onClick={attend}>
                          {quiz.state === 'failed' ? 'Retake quiz' : 'Start quiz'}
                        </Button>
                      )}
                      {(quiz.state === 'review' || quiz.state === 'passed' || quiz.state === 'failed') && answers}
                      {quiz.state === 'locked' && <span className="text-mu">—</span>}
                    </span>
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
        {quizzes && <Pager page={quizzes.page} pageSize={quizzes.pageSize} total={quizzes.total} onChange={setPage} />}
      </Card>
      <QuizStartDialogs start={start} onChange={setStart} />
    </div>
  );
}
