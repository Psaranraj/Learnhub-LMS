import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Modal, ModalActions } from '../../../components/ui/Modal';
import { useApi } from '../../../hooks/useApi';
import { useDebounced } from '../../../hooks/useDebounced';
import { enrollmentService } from '../../../services/enrollmentService';
import { userService } from '../../../services/userService';
import { useUiStore } from '../../../stores/uiStore';
import { field } from '../../../utils/styles';

type Props = {
  courseId: number;
  published: boolean;
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
};

// "Add students free of cost" from the design: search, a "Not in any of my courses" filter, tick and add.
export function AddStudentsModal({ courseId, published, open, onClose, onAdded }: Props) {
  const toast = useUiStore((s) => s.showToast);
  const { data: students, loading: studentsLoading, callAPI: searchStudentsAPI } = useApi(userService.searchStudents);
  const {
    loading: addLoading,
    error: addError,
    callAPI: addStudentsAPI,
    clear: clearAddError,
  } = useApi(enrollmentService.addStudents);
  const [q, setQ] = useState('');
  const [onlyNew, setOnlyNew] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const term = useDebounced(q);

  useEffect(() => {
    if (open) {
      setPicked([]);
      setQ('');
      setOnlyNew(false);
      clearAddError();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (open)
      void searchStudentsAPI({
        excludeCourseId: courseId,
        pageSize: 100,
        ...(term ? { q: term } : {}),
        ...(onlyNew ? { onlyNew: true } : {}),
      });
  }, [open, courseId, term, onlyNew, searchStudentsAPI]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  async function submit() {
    const res = await addStudentsAPI(courseId, picked);
    if (res) {
      toast(
        res.published
          ? `${res.added} student(s) added with free access`
          : `${res.added} student(s) added. Access starts when the course is approved`,
      );
      onAdded();
      onClose();
    }
  }
  const items = students?.items ?? [];

  return (
    <Modal open={open} title="Add students free of cost" onClose={onClose}>
      <p className="mb-3 text-xs text-mu">
        {published ? 'They get access right away.' : 'They get access once the course is approved and published.'}
      </p>
      <div className="mb-3 grid gap-2 [grid-template-columns:1fr_auto]">
        <input
          className={field}
          placeholder="Search students"
          aria-label="Search students"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className={field}
          aria-label="Filter"
          value={onlyNew ? 'new' : 'all'}
          onChange={(e) => setOnlyNew(e.target.value === 'new')}
        >
          <option value="all">All students</option>
          <option value="new">Not in any of my courses</option>
        </select>
      </div>
      <div className="max-h-[260px] overflow-auto">
        {studentsLoading && !students && <p className="text-xs text-mu">Loading…</p>}
        {students && items.length === 0 && (
          <p className="text-xs text-mu">No students to add. Everyone who matches is already in this course.</p>
        )}
        {items.map((s) => (
          <label
            key={s.id}
            className="flex cursor-pointer items-center gap-2.5 border-t border-ln px-1.5 py-2 text-xs first:border-t-0"
          >
            <input type="checkbox" checked={picked.includes(s.id)} onChange={() => toggle(s.id)} />
            <span>
              <strong>{s.name}</strong>
              <br />
              <span className="text-mu">{s.email}</span>
            </span>
          </label>
        ))}
      </div>
      {addError && <p className="mt-2 text-xs font-bold text-r">{addError}</p>}
      <ModalActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="pri" disabled={picked.length === 0 || addLoading} onClick={submit}>
          Add selected{picked.length ? ` (${picked.length})` : ''}
        </Button>
      </ModalActions>
    </Modal>
  );
}
