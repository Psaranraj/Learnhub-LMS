import { useEffect } from 'react';
import { Link } from 'react-router';
import { Button } from '../components/ui/Button';
import { Modal, ModalActions } from '../components/ui/Modal';
import { useApi } from '../hooks/useApi';
import { reportService } from '../services/reportService';

// GET /alerts is computed on demand for the signed-in role (HLD 8, decision 8): nothing is stored or marked as read.
export default function AlertsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    data: alerts,
    loading: alertsLoading,
    error: alertsError,
    callAPI: getAlertsAPI,
  } = useApi(reportService.alerts);

  useEffect(() => {
    if (open) void getAlertsAPI();
  }, [open, getAlertsAPI]);

  return (
    <Modal open={open} title="Notifications" onClose={onClose}>
      {alertsLoading && <p className="text-xs text-mu">Loading…</p>}
      {alertsError && <p className="text-xs font-bold text-r">{alertsError}</p>}
      {alerts?.length === 0 && <p className="text-xs text-mu">No new alerts.</p>}
      {alerts?.map((a) => (
        <div key={a.id} className="border-t border-ln py-3 text-xs first:border-t-0">
          <strong>
            {a.to ? (
              <Link to={a.to} onClick={onClose} className="text-p">
                {a.title}
              </Link>
            ) : (
              a.title
            )}
          </strong>
          <p className="text-mu">{a.detail}</p>
        </div>
      ))}
      <ModalActions>
        <Button onClick={onClose}>Close</Button>
      </ModalActions>
    </Modal>
  );
}
