import { useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { certificateService } from '../services/certificateService';
import { settingsService } from '../services/settingsService';
import { saveBlob } from '../utils/download';
import { formatLongDate } from '../utils/format';
import { Button } from './ui/Button';
import { Modal, ModalActions } from './ui/Modal';

type Props = { certificateId: number | null; onClose: () => void };

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** The design's certificate view (viewCert / viewCertI): the saved snapshot, with Download PDF. Used by all three roles. */
export function CertificateModal({ certificateId, onClose }: Props) {
  const { data: certificate, error: certificateError, callAPI: getCertificateAPI } = useApi(certificateService.view);

  const {
    loading: pdfLoading,
    error: pdfError,
    callAPI: downloadPdfAPI,
    clear: clearPdfError,
  } = useApi(certificateService.pdf);

  useEffect(() => {
    if (certificateId) {
      clearPdfError();
      void getCertificateAPI(certificateId);
    }
  }, [certificateId, clearPdfError, getCertificateAPI]);

  const c = certificate && certificate.id === certificateId ? certificate : null;
  const download = async () => {
    if (!c) return;
    const b = await downloadPdfAPI(c.id);
    if (b) saveBlob(b, `certificate-${slug(`${c.studentName} ${c.courseTitle}`)}.pdf`);
  };

  return (
    <Modal open={certificateId !== null} title="Certificate" onClose={onClose}>
      {certificateError && <p className="text-xs font-bold text-r">{certificateError}</p>}
      {!c && !certificateError && <p className="text-xs text-mu">Loading…</p>}
      {c && (
        <div className="rounded-[12px] border-2 border-p p-6 text-center">
          {c.hasLogo ? (
            <img
              src={settingsService.certificateLogoUrl(c.id)}
              alt=""
              className="mx-auto mb-1.5 h-[34px] w-[34px] rounded-[11px] object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="mx-auto mb-1.5 grid h-[34px] w-[34px] place-items-center rounded-[11px] bg-p font-extrabold text-white"
            >
              L
            </div>
          )}
          <small className="text-xs font-extrabold tracking-[1.5px] text-mu">{c.orgName.toUpperCase()}</small>
          <h3 className="my-2 text-xl font-extrabold">{c.title}</h3>
          <p className="text-xs text-mu">{c.intro}</p>
          <div className="my-2 text-2xl font-extrabold text-p">{c.studentName}</div>
          <p className="text-xs text-mu">{c.mid}</p>
          <h3 className="my-2 text-lg font-extrabold">{c.courseTitle}</h3>
          <p className="text-xs text-mu">
            Instructor: {c.instructorName} · Issued {formatLongDate(c.issuedAt)}
          </p>
          <p className="mt-1 text-xs text-mu">{c.footer}</p>
          <p className="mt-3 text-[11px] text-mu">Certificate number {c.certificateNo}</p>
        </div>
      )}
      {pdfError && <p className="mt-2 text-xs font-bold text-r">{pdfError}</p>}
      <ModalActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="pri" disabled={!c || pdfLoading} onClick={download}>
          {pdfLoading ? 'Preparing…' : 'Download PDF'}
        </Button>
      </ModalActions>
    </Modal>
  );
}
