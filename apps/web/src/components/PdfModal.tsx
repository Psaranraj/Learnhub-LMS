import { useEffect, useState } from 'react';
import { saveBlob } from '../utils/download';
import { toApiError } from '../services/apiClient';
import { Button } from './ui/Button';
import { Modal, ModalActions } from './ui/Modal';

type Props = {
  open: boolean;
  title: string;
  fileName: string;
  load: () => Promise<Blob>;
  onClose: () => void;
};

/** The design's "View PDF" (bigModal with an iframe): the file is fetched with the session cookie and shown in the page. */
export function PdfModal({ open, title, fileName, load, onClose }: Props) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let made: string | null = null;
    setBlob(null);
    setUrl(null);
    setError(null);
    load()
      .then((b) => {
        if (cancelled) return;
        made = URL.createObjectURL(b);
        setBlob(b);
        setUrl(made);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(toApiError(e).message);
      });
    return () => {
      cancelled = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal open={open} title={title} onClose={onClose} wide>
      {error && <p className="text-xs font-bold text-r">{error}</p>}
      {!error && !url && <p className="text-xs text-mu">Loading the PDF…</p>}
      {url && <iframe title={title} src={url} className="h-[70vh] w-full rounded-lg border-0" />}
      <ModalActions>
        <Button onClick={onClose}>Close</Button>
        <Button disabled={!blob} onClick={() => blob && saveBlob(blob, fileName)}>
          Download
        </Button>
      </ModalActions>
    </Modal>
  );
}
