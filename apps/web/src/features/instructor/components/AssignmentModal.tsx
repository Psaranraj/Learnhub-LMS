import { useEffect, useState } from 'react';
import { assignmentSchema } from '@learnhub/shared';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal, ModalActions } from '../../../components/ui/Modal';
import { Notice } from '../../../components/ui/Notice';
import { useApi } from '../../../hooks/useApi';
import { courseService, type ManagedCourse } from '../../../services/courseService';
import { field } from '../../../utils/styles';

type Props = {
  courseId: number;
  assignment: ManagedCourse['assignment'];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

// The design's assignment form: title, instructions, two to-do items and a due date.
export function AssignmentModal({ courseId, assignment, open, onClose, onSaved }: Props) {
  const {
    loading: saveLoading,
    error: saveError,
    callAPI: saveAssignmentAPI,
    clear: clearSaveError,
  } = useApi(courseService.saveAssignment);
  const [form, setForm] = useState({
    title: '',
    instructions: '',
    todo1: '',
    todo2: '',
    dueDate: '',
  });
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm({
      title: assignment?.title ?? '',
      instructions: assignment?.instructions ?? '',
      todo1: assignment?.todoItems[0] ?? '',
      todo2: assignment?.todoItems[1] ?? '',
      dueDate: assignment?.dueDate?.slice(0, 10) ?? '',
    });
    setErr('');
    clearSaveError();
  }, [open, assignment]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    const body = {
      title: form.title,
      instructions: form.instructions,
      todoItems: [form.todo1, form.todo2] as [string, string],
      dueDate: form.dueDate,
    };
    const parsed = assignmentSchema.safeParse(body);
    if (!parsed.success) return setErr(parsed.error.issues[0]?.message ?? 'Check the assignment.');
    setErr('');
    if (await saveAssignmentAPI(courseId, body)) {
      onSaved();
      onClose();
    }
  }

  return (
    <Modal open={open} title={assignment ? 'Edit assignment' : 'Add assignment'} onClose={onClose}>
      <Input
        label="Assignment title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />
      <label className="mb-3 block text-xs font-bold">
        Instructions
        <textarea
          className={`${field} mt-[5px]`}
          rows={3}
          value={form.instructions}
          onChange={(e) => setForm({ ...form, instructions: e.target.value })}
        />
      </label>
      <Input label="To-do item 1" value={form.todo1} onChange={(e) => setForm({ ...form, todo1: e.target.value })} />
      <Input label="To-do item 2" value={form.todo2} onChange={(e) => setForm({ ...form, todo2: e.target.value })} />
      <Input
        label="Due date (optional)"
        type="date"
        value={form.dueDate}
        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
      />
      <Notice>
        Students receive this after passing every lesson quiz. They attach one PDF and submit it for your review.
      </Notice>
      {(err || saveError) && <p className="mb-2 text-xs font-bold text-r">{err || saveError}</p>}
      <ModalActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="pri" disabled={saveLoading} onClick={submit}>
          Save assignment
        </Button>
      </ModalActions>
    </Modal>
  );
}
