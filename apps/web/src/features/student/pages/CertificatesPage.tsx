import { useEffect, useState } from 'react';
import { CertificateModal } from '../../../components/CertificateModal';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useApi } from '../../../hooks/useApi';
import { certificateService } from '../../../services/certificateService';
import { saveBlob } from '../../../utils/download';
import { formatDate } from '../../../utils/format';
import { field } from '../../../utils/styles';

type Filter = '' | 'issued' | 'pending';
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// Student / Certificates (design pCert): every enrolled course, issued or why not yet.
export default function CertificatesPage() {
  const { data: certificates, error: certificatesError, callAPI: getCertificatesAPI } = useApi(certificateService.mine);
  const { loading: pdfLoading, error: pdfError, callAPI: downloadPdfAPI } = useApi(certificateService.pdf);
  const [filter, setFilter] = useState<Filter>('');
  const [viewing, setViewing] = useState<number | null>(null);
  useEffect(() => {
    void getCertificatesAPI();
  }, [getCertificatesAPI]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = (certificates?.items ?? []).filter((x) => !filter || (filter === 'issued') === !!x.certificate);
  const download = async (id: number, course: string) => {
    const b = await downloadPdfAPI(id);
    if (b) saveBlob(b, `certificate-${slug(course)}.pdf`);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Certificates"
        title="Certificates"
        description="Issued when your assignment is submitted. Your name on the certificate comes from your registration."
      />
      <div className="mb-4 max-w-[340px]">
        <select
          className={field}
          aria-label="Filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
        >
          <option value="">All certificates</option>
          <option value="issued">Issued</option>
          <option value="pending">Not issued yet</option>
        </select>
      </div>
      {(certificatesError || pdfError) && (
        <p className="mb-3 text-xs font-bold text-r">{certificatesError ?? pdfError}</p>
      )}
      {!certificates && !certificatesError && <p className="text-xs text-mu">Loading…</p>}
      {certificates && certificates.items.length === 0 && (
        <EmptyState
          title="No certificates yet"
          message="Enroll in a course, pass its quizzes and submit the assignment to receive a certificate."
        />
      )}
      {certificates && certificates.items.length > 0 && items.length === 0 && (
        <p className="text-xs text-mu">No certificates for this filter.</p>
      )}
      {items.map((x) => (
        <Card key={x.course.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">{x.course.title}</h2>
              <small className="text-xs text-mu">
                {x.certificate
                  ? `Issued ${formatDate(x.certificate.issuedAt)} · ${x.course.instructor.name}`
                  : x.reason}
              </small>
            </div>
            {x.certificate ? (
              <span className="flex flex-wrap items-center gap-1.5">
                <Badge tone="g">Issued</Badge>
                <Button onClick={() => setViewing(x.certificate!.id)}>View</Button>
                <Button
                  variant="soft"
                  disabled={pdfLoading}
                  onClick={() => download(x.certificate!.id, x.course.title)}
                >
                  Download PDF
                </Button>
              </span>
            ) : (
              <Badge tone="x">Not issued</Badge>
            )}
          </div>
        </Card>
      ))}
      <CertificateModal certificateId={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
