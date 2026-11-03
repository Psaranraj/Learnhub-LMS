import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Modal, ModalActions } from '../../../components/ui/Modal';
import { Notice } from '../../../components/ui/Notice';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useApi } from '../../../hooks/useApi';
import { quizService } from '../../../services/quizService';

const LETTERS = ['A', 'B', 'C', 'D'];

// Student / Quiz attempt (design quizAttempt and qzConfirm): one question at a time, a number strip to jump,
// change answers until submit, a confirmation with warnings, then the answers summary. Marks stay hidden.
export default function QuizAttemptPage() {
  const lessonId = Number(useParams().lessonId);
  const navigate = useNavigate();

  // ---------- 1. Data from the server ----------
  const {
    data: paper,
    error: paperError,
    callAPI: getQuestionsAPI,
  } = useApi(quizService.questions);

  const {
    loading: submitLoading,
    error: submitError,
    callAPI: submitQuizAPI,
  } = useApi(quizService.submit);

  // ---------- 2. Page memory ----------
  const [answers, setAnswers] = useState<(number | null)[]>([]); // one answer per question, null = not answered
  const [current, setCurrent] = useState(0); // the question on screen (0 = first)
  const [confirmOpen, setConfirmOpen] = useState(false); // is the "Submit quiz?" box open
  const [submitted, setSubmitted] = useState(false); // has the quiz been sent

  // ---------- 3. When the page opens: get the questions ----------
  useEffect(() => {
    async function loadQuestions() {
      const result = await getQuestionsAPI(lessonId);
      if (result) {
        const emptyAnswers = result.questions.map(() => null); // a blank answer sheet
        setAnswers(emptyAnswers);
      }
    }
    void loadQuestions();
  }, [lessonId, getQuestionsAPI]);

  // ---------- 4. Warn before leaving the page in the middle of the quiz ----------
  // Leaving the page ends the attempt without saving (design rule); the browser asks first.
  useEffect(() => {
    if (!paper || submitted) return;

    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault(); // the browser shows "Leave site?"
    }

    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [paper, submitted]);

  // ---------- 5. Error and loading screens ----------
  if (paperError) {
    return (
      <EmptyState
        title="This quiz is not available"
        message={paperError}
        action={
          <Link to="/student/quizzes">
            <Button>Back to quizzes</Button>
          </Link>
        }
      />
    );
  }

  if (!paper || answers.length === 0) {
    return <p className="text-xs text-mu">Loading…</p>;
  }

  // ---------- 6. Values for the screen ----------
  const totalQuestions = paper.questions.length;
  const question = paper.questions[current];
  const answeredCount = answers.filter((answer) => answer !== null).length;
  const isFirstQuestion = current === 0;
  const isLastQuestion = current === totalQuestions - 1;

  // ---------- 7. Actions ----------
  function chooseOption(optionIndex: number) {
    const newAnswers = [...answers]; // copy the answer sheet
    newAnswers[current] = optionIndex; // change only this question's answer
    setAnswers(newAnswers);
  }

  async function submitQuiz() {
    const result = await submitQuizAPI(lessonId, answers);
    if (result) {
      setSubmitted(true);
      navigate(`/student/quizzes/attempts/${result.attemptId}?fresh=1`, { replace: true });
    }
  }

  // ---------- 8. Styles that change with the state ----------
  function numberButtonClass(index: number) {
    const border = index === current ? 'border-p text-p' : 'border-ln'; // the question on screen
    const background = answers[index] !== null ? 'bg-lv' : 'bg-white'; // an answered question
    return `h-8 w-8 rounded-lg border text-xs font-bold ${border} ${background}`;
  }

  function optionClass(optionIndex: number) {
    const selected = answers[current] === optionIndex ? 'border-p bg-lv' : 'border-ln';
    return `mb-2 flex cursor-pointer items-center gap-2.5 rounded-[9px] border p-2.5 text-xs ${selected}`;
  }

  // ---------- 9. The screen ----------
  return (
    <div>
      <PageHeader
        eyebrow="Quiz"
        title={paper.lesson.title}
        description={`${paper.course.title} · Topic ${paper.lesson.position} of ${paper.lesson.total}`}
      />

      <Card>
        {/* Progress line */}
        <p className="text-xs">
          <strong>
            Question {current + 1} of {totalQuestions}
          </strong>
          <br />
          <span className="text-mu">
            Answered {answeredCount} of {totalQuestions} · {paper.quiz.passMark} correct to pass
          </span>
        </p>

        {/* Number strip: one button per question */}
        <div className="my-3 flex flex-wrap gap-1.5" role="navigation" aria-label="Questions">
          {paper.questions.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Question ${index + 1}`}
              aria-current={index === current}
              onClick={() => setCurrent(index)}
              className={numberButtonClass(index)}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {/* The question and its options */}
        <p className="mb-3 mt-4 text-sm font-bold">{question.text}</p>
        {question.options.map((optionText, optionIndex) => (
          <label key={optionIndex} className={optionClass(optionIndex)}>
            <input
              type="radio"
              name={`q${current}`}
              checked={answers[current] === optionIndex}
              onChange={() => chooseOption(optionIndex)}
            />
            {LETTERS[optionIndex]}. {optionText}
          </label>
        ))}

        {/* Previous, Next and Submit quiz */}
        <div className="mt-3.5 flex flex-wrap justify-end gap-2">
          <Button disabled={isFirstQuestion} onClick={() => setCurrent(current - 1)}>
            ← Previous
          </Button>
          {!isLastQuestion && <Button onClick={() => setCurrent(current + 1)}>Next →</Button>}
          <Button variant="pri" onClick={() => setConfirmOpen(true)}>
            Submit quiz
          </Button>
        </div>
      </Card>

      {/* The "Submit quiz?" box */}
      <Modal open={confirmOpen} title="Submit quiz?" onClose={() => setConfirmOpen(false)}>
        <Notice tone="warn">
          Warning: once you submit, you cannot change your answers. Your marks will be shown only
          after your instructor reviews them.
        </Notice>
        <p className="mb-2 text-xs">
          You have answered {answeredCount} of {totalQuestions} questions.
        </p>
        {answeredCount < totalQuestions && (
          <Notice tone="warn">Unanswered questions will count as wrong.</Notice>
        )}
        {submitError && <p className="text-xs font-bold text-r">{submitError}</p>}
        <ModalActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="pri" disabled={submitLoading} onClick={submitQuiz}>
            Submit
          </Button>
        </ModalActions>
      </Modal>
    </div>
  );
}