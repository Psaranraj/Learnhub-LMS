import { useEffect } from 'react';
import { Button } from '../../../components/ui/Button';
import { Modal, ModalActions } from '../../../components/ui/Modal';
import { Notice } from '../../../components/ui/Notice';
import { useApi } from '../../../hooks/useApi';
import { quizService } from '../../../services/quizService';
import { useUiStore } from '../../../stores/uiStore';

const LETTERS = ['A', 'B', 'C', 'D'];
type Props = { attemptId: number | null; onClose: () => void; onReleased: () => void };

// Instructor / Review quiz (design reviewQuiz): the student's answers against the correct ones, the score worked out
// from them, and "Release marks to student" while it waits for review (LLD 6, flow 4).
export function QuizReviewModal({ attemptId, onClose, onReleased }: Props) {
  const toast = useUiStore((s) => s.showToast);
  const { data: review, error: reviewError, callAPI: getReviewAPI } = useApi(quizService.review);
  const {
    loading: releaseLoading,
    error: releaseError,
    callAPI: releaseQuizAPI,
    clear: clearReleaseError,
  } = useApi(quizService.release);
  useEffect(() => {
    if (attemptId) {
      clearReleaseError();
      void getReviewAPI(attemptId);
    }
  }, [attemptId]); // eslint-disable-line react-hooks/exhaustive-deps

  const a = review && review.id === attemptId ? review : null;
  const pending = a?.status === 'SUBMITTED';
  const doRelease = async () => {
    if (!a) return;
    const r = await releaseQuizAPI(a.id);
    if (!r) return;
    toast(`Marks released: ${r.score} / ${a.quiz.questionCount} ${r.passed ? '(passed)' : '(not passed)'}`);
    onReleased();
    onClose();
  };

  return (
    <Modal
      open={attemptId !== null}
      title={a ? `${a.student.name} · ${a.lesson.title}` : 'Review quiz'}
      onClose={onClose}
      wide
    >
      {reviewError && <p className="text-xs font-bold text-r">{reviewError}</p>}
      {!a && !reviewError && <p className="text-xs text-mu">Loading…</p>}
      {a && (
        <>
          {pending && (
            <Notice tone="warn">
              Score from the answers:{' '}
              <strong>
                {a.computedScore} / {a.quiz.questionCount}
              </strong>{' '}
              · {a.computedScore >= a.quiz.passMark ? 'Pass' : 'Not pass'} ({a.quiz.passMark} needed). Release the marks
              to show the student their result and the correct answers.
            </Notice>
          )}
          {a.status === 'RELEASED' && (
            <Notice tone={a.passed ? 'ok' : 'warn'}>
              Released: {a.score} / {a.quiz.questionCount} · {a.passed ? 'Passed' : 'Not passed'}
            </Notice>
          )}
          {a.status === 'SUPERSEDED' && (
            <Notice tone="warn">
              The quiz was changed after this attempt, so it is not marked. The student takes the new quiz.
            </Notice>
          )}
          {a.questions.map((q, k) => {
            const mine = a.answers[k];
            return (
              <div key={k} className="border-t border-ln py-3 first:border-t-0">
                <p className="mb-2 text-xs font-bold">
                  {k + 1}. {q.text}
                </p>
                {q.options.map((o, j) => {
                  const correct = q.correctIndex === j;
                  const wrong = mine === j && !correct;
                  const tag = correct
                    ? mine === j
                      ? 'Student answer · Correct'
                      : 'Correct answer'
                    : wrong
                      ? 'Student answer · Wrong'
                      : '';
                  return (
                    <div
                      key={j}
                      className={`mb-1.5 flex justify-between gap-2 rounded-[9px] border p-2 text-xs ${correct ? 'border-g bg-[#e4f8f0]' : wrong ? 'border-r bg-[#ffedf0]' : 'border-ln'}`}
                    >
                      <span>
                        {LETTERS[j]}. {o}
                      </span>
                      {tag && <b>{tag}</b>}
                    </div>
                  );
                })}
                {mine === null && <small className="text-xs text-mu">Not answered</small>}
              </div>
            );
          })}
        </>
      )}
      {releaseError && <p className="mt-2 text-xs font-bold text-r">{releaseError}</p>}
      <ModalActions>
        <Button onClick={onClose}>Close</Button>
        {pending && (
          <Button variant="pri" disabled={releaseLoading} onClick={doRelease}>
            Release marks to student
          </Button>
        )}
      </ModalActions>
    </Modal>
  );
}
