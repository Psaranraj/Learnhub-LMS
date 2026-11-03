import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Modal, ModalActions } from '../../../components/ui/Modal';
import { useApi } from '../../../hooks/useApi';
import { assignmentService } from '../../../services/assignmentService';
import { useUiStore } from '../../../stores/uiStore';
import { field } from '../../../utils/styles';

type Target = {
  submissionId: number;
  studentName: string;
  courseTitle: string;
  fileName: string;
  grade: number | null;
  feedback: string | null;
};
type Props = {
  target: Target | null;
  onClose: () => void;
  onViewPdf: () => void;
  onGraded: () => void;
};

// Instructor / Review and grade (design openGrade): a whole-number grade 0 to 100 and feedback. Also "Edit grade".
export function GradeModal({ target, onClose, onViewPdf, onGraded }: Props) {
  const toast = useUiStore((s) => s.showToast);
  const {
    loading: gradeLoading,
    error: gradeError,
    fieldErrors: gradeFieldErrors,
    callAPI: saveGradeAPI,
    clear: clearGradeError,
  } = useApi(assignmentService.grade);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [local, setLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    clearGradeError();
    setLocal(null);
    setGrade(target.grade === null ? '' : String(target.grade));
    setFeedback(target.feedback ?? '');
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!target) return;
    const g = grade.trim();
    if (g === '' || !/^\d+$/.test(g) || Number(g) > 100) return setLocal('Enter a whole-number grade from 0 to 100.');
    if (feedback.trim().length < 3) return setLocal('Add feedback for the student (3 or more characters).');
    setLocal(null);
    if (await saveGradeAPI(target.submissionId, { grade: Number(g), feedback: feedback.trim() })) {
      toast('Grade returned to the student');
      onGraded();
      onClose();
    }
  };

  return (
    <Modal open={target !== null} title="Review and grade" onClose={onClose}>
      {target && (
        <>
          <p className="mb-2 text-xs">
            <strong>{target.studentName}</strong>
            <br />
            <small className="text-mu">
              {target.courseTitle} · {target.fileName}
            </small>
          </p>
          <div className="mb-3">
            <Button onClick={onViewPdf}>View PDF</Button>
          </div>
          <label className="mb-3 block text-xs font-bold">
            Grade (0 to 100)
            <input
              className={`${field} mt-1`}
              type="number"
              min={0}
              max={100}
              step={1}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            />
            {gradeFieldErrors.grade && <span className="font-bold text-r">{gradeFieldErrors.grade}</span>}
          </label>
          <label className="block text-xs font-bold">
            Feedback for student
            <textarea
              className={`${field} mt-1`}
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            {gradeFieldErrors.feedback && <span className="font-bold text-r">{gradeFieldErrors.feedback}</span>}
          </label>
          {(local || (gradeError && !Object.keys(gradeFieldErrors).length)) && (
            <p className="mt-2 text-xs font-bold text-r">{local ?? gradeError}</p>
          )}
        </>
      )}
      <ModalActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="pri" disabled={gradeLoading} onClick={submit}>
          Return grade
        </Button>
      </ModalActions>
    </Modal>
  );
}
