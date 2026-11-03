import { useNavigate } from 'react-router';
import { Button } from '../../../components/ui/Button';
import { Modal, ModalActions } from '../../../components/ui/Modal';

export type QuizStart = {
  lessonId: number;
  topic: string;
  questionCount: number;
  passMark: number;
  step: 'rules' | 'ready';
};

// The design's two steps before an attempt: "Rules and regulations", then "Are you ready to attend?".
export function QuizStartDialogs({
  start,
  onChange,
}: {
  start: QuizStart | null;
  onChange: (s: QuizStart | null) => void;
}) {
  const nav = useNavigate();
  if (!start) return null;
  const pct = Math.round((start.passMark / start.questionCount) * 100);
  return (
    <>
      <Modal open={start.step === 'rules'} title="Rules and regulations" onClose={() => onChange(null)}>
        <p className="mb-2 text-xs text-mu">{start.topic} · read these before you attend the quiz.</p>
        <ul className="mb-2 list-disc space-y-1.5 pl-5 text-xs leading-relaxed">
          <li>The quiz has {start.questionCount} questions on this topic.</li>
          <li>
            You need at least {start.passMark} correct answers ({pct}%) to pass.
          </li>
          <li>You can move between questions and change your answers until you submit.</li>
          <li>Answer every question before you submit. Unanswered questions count as wrong.</li>
          <li>Before you submit, you will see a confirmation and a warning. You can cancel and keep working.</li>
          <li>Do not leave the page during the quiz. Leaving ends the attempt without saving.</li>
          <li>Notes, other people and other tools are not allowed.</li>
          <li>Your marks are not shown at once. You will get them after your instructor reviews your answers.</li>
          <li>If you do not pass after review, you can retake the quiz.</li>
        </ul>
        <ModalActions>
          <Button onClick={() => onChange(null)}>Cancel</Button>
          <Button variant="pri" onClick={() => onChange({ ...start, step: 'ready' })}>
            I have read the rules
          </Button>
        </ModalActions>
      </Modal>
      <Modal open={start.step === 'ready'} title="Are you ready to attend?" onClose={() => onChange(null)}>
        <p className="mb-1 text-xs text-mu">{start.topic}</p>
        <p className="text-xs">
          {start.questionCount} questions · {start.passMark} correct to pass. Once you start, stay on this page.
        </p>
        <ModalActions>
          <Button onClick={() => onChange(null)}>Cancel</Button>
          <Button
            variant="pri"
            onClick={() => {
              onChange(null);
              nav(`/student/quizzes/${start.lessonId}/attempt`);
            }}
          >
            Attend quiz
          </Button>
        </ModalActions>
      </Modal>
    </>
  );
}
