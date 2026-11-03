import { useEffect, useState } from 'react';
import { CertificateModal } from '../../../components/CertificateModal';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Pager } from '../../../components/ui/Pager';
import { StatCard, StatGrid } from '../../../components/ui/StatCard';
import { Table, Td } from '../../../components/ui/Table';
import { useApi } from '../../../hooks/useApi';
import { useDebounced } from '../../../hooks/useDebounced';
import { certificateService } from '../../../services/certificateService';
import { courseService } from '../../../services/courseService';
import { saveBlob } from '../../../utils/download';
import { formatDate } from '../../../utils/format';
import { field } from '../../../utils/styles';

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// Admin / Certificates (design adCert): issued certificates, read only. Nothing needs approval.
export default function AdminCertificatesPage() {
  const { data: certificates, error: certificatesError, callAPI: getCertificatesAPI } = useApi(certificateService.list);

  const { loading: pdfLoading, error: pdfError, callAPI: downloadPdfAPI } = useApi(certificateService.pdf);

  const { data: courses, callAPI: getCoursesAPI } = useApi(courseService.catalog);
  const [q, setQ] = useState('');
  const [courseId, setCourseId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<number | null>(null);
  const search = useDebounced(q);

  useEffect(() => {
    void getCoursesAPI({ pageSize: 100 });
  }, [getCoursesAPI]);
  useEffect(() => {
    setPage(1);
  }, [search, courseId, from, to]);
  useEffect(() => {
    void getCertificatesAPI({
      page,
      ...(search ? { q: search } : {}),
      ...(courseId ? { courseId: Number(courseId) } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });
  }, [page, search, courseId, from, to, getCertificatesAPI]);

  const download = async (id: number, name: string, course: string) => {
    const b = await downloadPdfAPI(id);
    if (b) saveBlob(b, `certificate-${slug(`${name} ${course}`)}.pdf`);
  };
  const s = certificates?.summary;
  return (
    <div>
      <PageHeader
        eyebrow="Certificates"
        title="Certificates"
        description="Issued certificates, read only. Students get a certificate as soon as they submit the assignment, so nothing needs approval."
      />
      <StatGrid>
        <StatCard label="Issued" value={s?.issued ?? '—'} hint="Certificates so far" />
        <StatCard label="Students certified" value={s?.students ?? '—'} hint="Different students" />
        <StatCard label="Courses" value={s?.courses ?? '—'} hint="With at least one certificate" />
      </StatGrid>
      <Card>
        <div className="mb-3 grid items-center gap-2.5 [grid-template-columns:2fr_1.4fr_1fr_1fr] max-md:[grid-template-columns:1fr]">
          <input
            className={field}
            placeholder="Search students"
            aria-label="Search students"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className={field} aria-label="Course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">All courses</option>
            {courses?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-mu">
            From{' '}
            <input
              className={field}
              type="date"
              aria-label="From date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-mu">
            To{' '}
            <input
              className={field}
              type="date"
              aria-label="To date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
        {(certificatesError || pdfError) && (
          <p className="mb-2 text-xs font-bold text-r">{certificatesError ?? pdfError}</p>
        )}
        {certificates && certificates.items.length === 0 && (
          <p className="text-xs text-mu">No certificates match these filters.</p>
        )}
        {certificates && certificates.items.length > 0 && (
          <Table head={['Student', 'Course', 'Instructor', 'Issued on', 'Action']}>
            {certificates.items.map((c) => (
              <tr key={c.id}>
                <Td>
                  <strong>{c.studentName}</strong>
                  <br />
                  <small className="text-mu">{c.studentEmail}</small>
                </Td>
                <Td>{c.courseTitle}</Td>
                <Td>{c.instructorName}</Td>
                <Td>
                  {formatDate(c.issuedAt)}
                  <br />
                  <small className="text-mu">{c.certificateNo}</small>
                </Td>
                <Td>
                  <span className="flex flex-wrap gap-1.5">
                    <Button onClick={() => setViewing(c.id)}>View</Button>
                    <Button
                      variant="soft"
                      disabled={pdfLoading}
                      onClick={() => download(c.id, c.studentName, c.courseTitle)}
                    >
                      Download PDF
                    </Button>
                  </span>
                </Td>
              </tr>
            ))}
          </Table>
        )}
        {certificates && (
          <Pager
            page={certificates.page}
            pageSize={certificates.pageSize}
            total={certificates.total}
            onChange={setPage}
          />
        )}
      </Card>
      <CertificateModal certificateId={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
