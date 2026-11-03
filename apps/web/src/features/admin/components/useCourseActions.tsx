import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { Modal, ModalActions } from '../../../components/ui/Modal';
import { useApi } from '../../../hooks/useApi';
import { courseService } from '../../../services/courseService';
import { useUiStore } from '../../../stores/uiStore';
import { field } from '../../../utils/styles';

type Ask = { kind: 'reject' | 'unpublish'; id: number; title: string } | null;

/** Approve, reject (with reason) and unpublish. Shared by the course list and the course review page. */
export function useCourseActions(onDone: () => void) {
  const toast = useUiStore((s) => s.showToast);
  const { loading: approveLoading, error: approveError, callAPI: approveCourseAPI } = useApi(courseService.approve);

  const { loading: rejectLoading, error: rejectError, callAPI: rejectCourseAPI } = useApi(courseService.reject);

  const {
    loading: unpublishLoading,
    error: unpublishError,
    callAPI: unpublishCourseAPI,
  } = useApi(courseService.unpublish);

  const busy = approveLoading || rejectLoading || unpublishLoading;
  const error = approveError || rejectError || unpublishError;
  const [ask, setAsk] = useState<Ask>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (error) toast(error);
  }, [error, toast]);

  const done = (ok: unknown, message: string) => {
    if (ok === null) return;
    setAsk(null);
    setReason('');
    toast(message);
    onDone();
  };
  const tooShort = reason.trim().length < 5;

  const dialogs = (
    <>
      <Modal open={ask?.kind === 'reject'} title="Reject course" onClose={() => setAsk(null)}>
        <p className="mb-3 text-xs text-mu">{ask?.title}</p>
        <p className="mb-3 rounded-[9px] bg-lv p-3 text-xs text-p">
          The instructor will see this reason in the course builder, fix the course and submit it again.
        </p>
        <label className="block text-xs font-bold">
          Reason for rejection
          <textarea
            className={`${field} mt-[5px]`}
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What should the instructor fix?"
          />
        </label>
        {reason.length > 0 && tooShort && (
          <p className="mt-1 text-xs font-bold text-r">Write a reason of at least 5 characters.</p>
        )}
        <ModalActions>
          <Button onClick={() => setAsk(null)}>Cancel</Button>
          <Button
            variant="danger"
            disabled={tooShort || busy}
            onClick={async () =>
              ask &&
              done(await rejectCourseAPI(ask.id, reason.trim()), 'Course rejected. The instructor can see the reason')
            }
          >
            Reject course
          </Button>
        </ModalActions>
      </Modal>
      <ConfirmModal
        open={ask?.kind === 'unpublish'}
        title="Unpublish course?"
        confirmLabel="Unpublish"
        busy={busy}
        message={`"${ask?.title ?? ''}" will be hidden from students until it is published again. Enrollments and progress are kept.`}
        onCancel={() => setAsk(null)}
        onConfirm={async () => ask && done(await unpublishCourseAPI(ask.id), 'Course unpublished')}
      />
    </>
  );

  return {
    busy,
    approve: async (id: number) => done(await approveCourseAPI(id), 'Course approved and published'),
    askReject: (id: number, title: string) => {
      setReason('');
      setAsk({ kind: 'reject', id, title });
    },
    askUnpublish: (id: number, title: string) => setAsk({ kind: 'unpublish', id, title }),
    dialogs,
  };
}
