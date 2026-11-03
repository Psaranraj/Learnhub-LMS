import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Pager } from '../../../components/ui/Pager';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { Table, Td } from '../../../components/ui/Table';
import { useApi } from '../../../hooks/useApi';
import { useDebounced } from '../../../hooks/useDebounced';
import { enrollmentService, type CourseStudent } from '../../../services/enrollmentService';
import { useUiStore } from '../../../stores/uiStore';
import { field } from '../../../utils/styles';
import { AddStudentsModal } from './AddStudentsModal';

type Props = { courseId: number; published: boolean; locked: boolean; onChange?: () => void };

// Course details / Students tab (design iStuTab): source, progress, certificate; add students free, remove the ones you added.
export function CourseStudentsTab({ courseId, published, locked, onChange }: Props) {
  const toast = useUiStore((s) => s.showToast);
  const { data: students, error: studentsError, callAPI: getStudentsAPI } = useApi(enrollmentService.courseStudents);
  const { loading: removeLoading, callAPI: removeStudentAPI } = useApi(enrollmentService.removeStudent);
  const [q, setQ] = useState('');
  const [progress, setProgress] = useState<CourseStudent['state'] | ''>('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<CourseStudent | null>(null);
  const term = useDebounced(q);

  const load = useCallback(() => {
    void getStudentsAPI(courseId, {
      page,
      ...(term ? { q: term } : {}),
      ...(progress ? { progress } : {}),
    });
  }, [getStudentsAPI, courseId, page, term, progress]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setPage(1);
  }, [term, progress]);
  useEffect(() => {
    load();
  }, [load]);

  async function confirmRemove() {
    if (!removing) return;
    if (await removeStudentAPI(courseId, removing.student.id)) {
      setRemoving(null);
      toast('Student removed');
      load();
      onChange?.();
    }
  }
  const items = students?.items ?? [];

  return (
    <Card>
      <div className="mb-3 grid gap-2.5 [grid-template-columns:2fr_1fr_auto] max-md:[grid-template-columns:1fr]">
        <input
          className={field}
          placeholder="Search students"
          aria-label="Search students"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className={field}
          aria-label="Progress"
          value={progress}
          onChange={(e) => setProgress(e.target.value as CourseStudent['state'] | '')}
        >
          <option value="">All progress</option>
          <option value="new">Not started</option>
          <option value="prog">In progress</option>
          <option value="done">Completed</option>
        </select>
        <Button variant="pri" disabled={locked} onClick={() => setAdding(true)}>
          + Add students
        </Button>
      </div>
      {studentsError && <p className="text-xs font-bold text-r">{studentsError}</p>}
      {students && items.length === 0 && (
        <EmptyState title="No students match" message="Use Add students to give free access." />
      )}
      {items.length > 0 && (
        <Table head={['Student', 'Source', 'Progress', 'Certificate', 'Action']}>
          {items.map((s) => (
            <tr key={s.student.id}>
              <Td>
                <strong>{s.student.name}</strong>
                {!s.student.active && <span className="text-mu"> (inactive)</span>}
                <br />
                <span className="text-mu">{s.student.email}</span>
              </Td>
              <Td>{s.source === 'ASSIGNED' ? <Badge>Assigned free</Badge> : <Badge tone="x">Self-enrolled</Badge>}</Td>
              <Td>
                {published ? (
                  <span className="flex items-center gap-2">
                    <span className="w-20">
                      <ProgressBar percent={s.percent} />
                    </span>
                    {s.percent}%
                  </span>
                ) : (
                  <Badge tone="o">Starts after approval</Badge>
                )}
              </Td>
              <Td>
                {published ? s.certificate ? <Badge tone="g">Issued</Badge> : <Badge tone="x">Not yet</Badge> : '—'}
              </Td>
              <Td>
                {s.source === 'ASSIGNED' ? (
                  <Button variant="danger" disabled={locked} onClick={() => setRemoving(s)}>
                    Remove
                  </Button>
                ) : (
                  <span className="text-mu">—</span>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}
      {students && (
        <Pager page={students.page} pageSize={students.pageSize} total={students.total} onChange={setPage} />
      )}

      <AddStudentsModal
        courseId={courseId}
        published={published}
        open={adding}
        onClose={() => setAdding(false)}
        onAdded={() => {
          load();
          onChange?.();
        }}
      />
      <ConfirmModal
        open={!!removing}
        title="Remove student?"
        confirmLabel="Remove"
        danger
        busy={removeLoading}
        message={`Remove ${removing?.student.name ?? ''} from this course? They lose access.`}
        onCancel={() => setRemoving(null)}
        onConfirm={confirmRemove}
      />
    </Card>
  );
}
