import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Notice } from '../../../components/ui/Notice';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useApi } from '../../../hooks/useApi';
import { quizService } from '../../../services/quizService';

const LETTERS = ['A', 'B', 'C', 'D'];

// Student / Quiz answers (design quizSummary). Before release: only the student's own choices. After release: score,
// pass or not, and green for the correct answer, red for a wrong choice.
export default function QuizResultPage() {
  const id = Number(useParams().attemptId);
  const fresh = useSearchParams()[0].get('fresh') === '1';
  const { data: attempt, error: attemptError, callAPI: getAttemptAPI } = useApi(quizService.attempt);
  useEffect(() => {
    void getAttemptAPI(id);
  }, [id, getAttemptAPI]); // eslint-disable-line react-hooks/exhaustive-deps

  if (attemptError)
    return (
      <EmptyState
        title="Attempt not found"
        message={attemptError}
        action={
          <Link to="/student/quizzes">
            <Button>Back to quizzes</Button>
          </Link>
        }
      />
    );
  const a = attempt;
  if (!a) return <p className="text-xs text-mu">Loading…</p>;
  const released = a.status === 'RELEASED';

  return (
    <div>
      <PageHeader
        eyebrow="Quiz"
        title={a.lesson.title}
        description={`${a.course.title} · Topic ${a.lesson.position}`}
      />
      <Card>
        {a.status === 'SUBMITTED' && (
          <Notice>
            {fresh && <strong>Quiz submitted. </strong>}Your marks and the correct answers will be shown after your
            instructor reviews your answers.
          </Notice>
        )}
        {a.status === 'SUPERSEDED' && (
          <Notice tone="warn">
            Your instructor changed this quiz, so this attempt will not be marked. Take the new quiz from Quizzes.
          </Notice>
        )}
        {released && a.passed && (
          <Notice tone="ok">
            Reviewed by your instructor: {a.score} / {a.quiz.questionCount}. Quiz passed. Green is the correct answer,
            red is your wrong answer.
          </Notice>
        )}
        {released && !a.passed && (
          <Notice tone="warn">
            Reviewed by your instructor: {a.score} / {a.quiz.questionCount}. Not passed, you can retake the quiz. Green
            is the correct answer, red is your wrong answer.
          </Notice>
        )}
        <h2 className="mb-1 text-sm font-bold">
          {released ? 'Your answers and the correct answers' : 'Final check: your answers'}
        </h2>
        <p className="mb-3 text-xs text-mu">
          {released
            ? 'Review each question below.'
            : `These are the options you selected for all ${a.questions.length} questions.`}
        </p>
        {a.questions.map((q, k) => {
          const mine = a.answers[k];
          return (
            <div key={k} className="border-t border-ln py-3 first:border-t-0">
              <p className="mb-2 text-xs font-bold">
                {k + 1}. {q.text}
              </p>
              {q.options.map((o, j) => {
                const correct = released && q.correctIndex === j;
                const wrong = released && mine === j && q.correctIndex !== j;
                const tone = correct
                  ? 'border-g bg-[#e4f8f0]'
                  : wrong
                    ? 'border-r bg-[#ffedf0]'
                    : !released && mine === j
                      ? 'border-p bg-lv'
                      : 'border-ln';
                const tag = correct
                  ? mine === j
                    ? 'Your answer · Correct'
                    : 'Correct answer'
                  : wrong
                    ? 'Your answer · Wrong'
                    : !released && mine === j
                      ? 'Your answer'
                      : '';
                return (
                  <div key={j} className={`mb-1.5 flex justify-between gap-2 rounded-[9px] border p-2 text-xs ${tone}`}>
                    <span>
                      {LETTERS[j]}. {o}
                    </span>
                    {tag && <b>{tag}</b>}
                  </div>
                );
              })}
              {mine === null && <p className="text-xs text-mu">Not answered{released ? ' (counted as wrong)' : ''}</p>}
            </div>
          );
        })}
        <div className="mt-3 flex justify-end">
          <Link to="/student/quizzes">
            <Button variant="pri">Back to quizzes</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
