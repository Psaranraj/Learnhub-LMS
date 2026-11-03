import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { PdfModal } from '../../../components/PdfModal';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Notice } from '../../../components/ui/Notice';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useApi } from '../../../hooks/useApi';
import { assignmentService, type MyAssignment } from '../../../services/assignmentService';
import { useUiStore } from '../../../stores/uiStore';
import { formatDate } from '../../../utils/format';
import { field } from '../../../utils/styles';

const MAX_MB = 10;

function StateBadge({ a }: { a: MyAssignment['assignment'] }) {
  switch (a.state) {
    case 'locked':
      return <Badge tone="x">Locked</Badge>;
    case 'todo':
      return <Badge tone="o">To do</Badge>;
    case 'submitted':
      return <Badge>Waiting for review</Badge>;
    default:
      return <Badge tone="g">{`Graded ${a.submission?.grade ?? ''}/100`}</Badge>;
  }
}

/** The to-do ticks, the PDF picker and Submit. Also used to replace the PDF while it waits for review (HLD 6). */
function SubmitForm({
  item,
  replacing,
  onDone,
  onCancel,
}: {
  item: MyAssignment;
  replacing: boolean;
  onDone: (replaced: boolean) => void;
  onCancel?: () => void;
}) {
  const a = item.assignment;
  const {
    loading: submitLoading,
    error: submitError,
    fieldErrors: submitFieldErrors,
    callAPI: submitAssignmentAPI,
  } = useApi(assignmentService.submit);
  const [checks, setChecks] = useState<[boolean, boolean]>([!!a.submission?.checks[0], !!a.submission?.checks[1]]);
  const [file, setFile] = useState<File | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  const pick = (f: File | undefined) => {
    setPickError(null);
    if (!f) return setFile(null);
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setFile(null);
      return setPickError('Please attach a PDF file.');
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setFile(null);
      return setPickError(`File is larger than ${MAX_MB} MB.`);
    }
    setFile(f);
  };
  const send = async () => {
    if (!file) return;
    const res = await submitAssignmentAPI(item.course.id, file, checks);
    if (res) onDone(res.replaced);
  };

  return (
    <div className="mt-2">
      <p className="mb-1 text-xs text-mu">To-do list</p>
      {a.todoItems.map((t, k) => (
        <label key={k} className="flex items-start gap-2 py-1 text-xs">
          <input
            type="checkbox"
            checked={checks[k]}
            onChange={(e) => setChecks((c) => (k === 0 ? [e.target.checked, c[1]] : [c[0], e.target.checked]))}
          />{' '}
          {t}
        </label>
      ))}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 border-t border-ln pt-2.5 text-xs">
        <span>
          <strong>{replacing ? 'Attach the new PDF' : 'Attach your PDF'}</strong>
          <br />
          <small className="text-mu">{file ? `Attached: ${file.name}` : `PDF only, up to ${MAX_MB} MB`}</small>
        </span>
        <input
          type="file"
          accept="application/pdf"
          aria-label="Attach PDF"
          className="max-w-[260px] text-xs"
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>
      {(pickError || submitError) && (
        <p className="mt-1.5 text-xs font-bold text-r">{pickError ?? submitFieldErrors.file ?? submitError}</p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        {onCancel && <Button onClick={onCancel}>Cancel</Button>}
        <Button variant="pri" disabled={!file || submitLoading} onClick={send}>
          {submitLoading ? 'Uploading…' : replacing ? 'Replace PDF' : 'Submit assignment'}
        </Button>
      </div>
    </div>
  );
}

function AssignmentCard({ item, onChanged }: { item: MyAssignment; onChanged: () => void }) {
  const toast = useUiStore((s) => s.showToast);
  const [viewing, setViewing] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const a = item.assignment;
  const sub = a.submission;

  const done = (replaced: boolean) => {
    setReplacing(false);
    toast(
      replaced
        ? 'PDF replaced. Your instructor will review the new file'
        : 'Assignment submitted. Your certificate is issued and your instructor will review it',
    );
    onChanged();
  };
  const pdfRow = sub && (
    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 border-t border-ln pt-2.5 text-xs">
      <span>
        <strong>Your submitted PDF</strong>
        <br />
        <small className="text-mu">{sub.fileName}</small>
      </span>
      <span className="flex gap-1.5">
        <Button onClick={() => setViewing(true)}>View PDF</Button>
        {a.state === 'submitted' && !replacing && <Button onClick={() => setReplacing(true)}>Replace PDF</Button>}
      </span>
    </div>
  );

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">{item.course.title}</h2>
          <small className="text-xs text-mu">{item.course.instructor.name}</small>
        </div>
        <StateBadge a={a} />
      </div>
      {a.state === 'locked' && (
        <p className="mt-2 text-xs text-mu">
          Unlocks after all topic quizzes are reviewed and passed. Passed {item.progress.passed} of{' '}
          {item.progress.total} so far.
        </p>
      )}
      {a.state !== 'locked' && (
        <>
          <h3 className="mt-2.5 text-[13px] font-bold">{a.title}</h3>
          {a.instructions && (
            <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-mu">{a.instructions}</p>
          )}
          {a.dueDate && <p className="mt-1 text-xs text-mu">Due {formatDate(a.dueDate, true)}</p>}
        </>
      )}
      {a.state === 'todo' && <SubmitForm item={item} replacing={false} onDone={done} />}
      {a.state === 'submitted' && sub && (
        <>
          <Notice className="mt-2.5">
            Submitted on {formatDate(sub.submittedAt)}
            {sub.late ? ' (after the due date)' : ''}. Your certificate has been issued. Your instructor is reviewing
            the work and will return a grade.
          </Notice>
          {pdfRow}
          {replacing && <SubmitForm item={item} replacing onDone={done} onCancel={() => setReplacing(false)} />}
        </>
      )}
      {a.state === 'graded' && sub && (
        <>
          <Notice tone="ok" className="mt-2.5">
            Graded {sub.grade}/100
          </Notice>
          <p className="text-xs">
            <strong>Instructor feedback:</strong> {sub.feedback}
          </p>
          {pdfRow}
        </>
      )}
      {sub && (
        <PdfModal
          open={viewing}
          title={sub.fileName}
          fileName={sub.fileName}
          load={() => assignmentService.file(sub.id)}
          onClose={() => setViewing(false)}
        />
      )}
    </Card>
  );
}

// Student / Assignments (design pAsg). One assignment per course; it unlocks when every topic quiz is passed.
export default function AssignmentsPage() {
  const { data: assignments, error: assignmentsError, callAPI: getAssignmentsAPI } = useApi(assignmentService.mine);
  const [courseId, setCourseId] = useState('');
  useEffect(() => {
    void getAssignmentsAPI();
  }, [getAssignmentsAPI]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = assignments?.items ?? [];
  const shown = items.filter((x) => !courseId || String(x.course.id) === courseId);
  return (
    <div>
      <PageHeader
        eyebrow="Assignment"
        title="Assignments"
        description="Unlocks after your topic quizzes are passed. Complete the to-do list, attach your PDF and submit. Your instructor reviews it."
      />
      <div className="mb-4 max-w-[340px]">
        <select className={field} aria-label="Course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">All courses</option>
          {items.map((x) => (
            <option key={x.course.id} value={x.course.id}>
              {x.course.title}
            </option>
          ))}
        </select>
      </div>
      {assignmentsError && <p className="text-xs font-bold text-r">{assignmentsError}</p>}
      {!assignments && !assignmentsError && <p className="text-xs text-mu">Loading…</p>}
      {assignments && items.length === 0 && (
        <EmptyState
          title="No assignments yet"
          message="Courses you are enrolled in show their assignment here."
          action={
            <Link to="/student/catalog">
              <Button variant="pri">Browse courses</Button>
            </Link>
          }
        />
      )}
      {assignments && items.length > 0 && shown.length === 0 && (
        <p className="text-xs text-mu">No assignments for this filter.</p>
      )}
      {shown.map((x) => (
        <AssignmentCard key={x.course.id} item={x} onChanged={() => void getAssignmentsAPI()} />
      ))}
    </div>
  );
}
