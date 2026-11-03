import PDFDocument from 'pdfkit';

// LLD 4, lib/certificatePdf: builds the certificate PDF from a certificates row (the snapshot), so the same certificate
// prints the same way every time (HLD 8, decision 9). Landscape A4, the design's wording order.
export type CertificateSnapshot = {
  certificateNo: string;
  studentName: string;
  courseTitle: string;
  instructorName: string;
  orgName: string;
  title: string;
  intro: string;
  mid: string;
  footer: string;
  issuedAt: Date;
  logo: Buffer | null;
};

const INK = '#24233d';
const MUTED = '#6b6a85';
const PURPLE = '#5b4bff';

export const issuedOn = (d: Date) =>
  d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

export function certificatePdf(c: CertificateSnapshot): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 0,
      info: { Title: `${c.title} - ${c.studentName}`, Author: c.orgName },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (b: Buffer) => chunks.push(b));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const H = doc.page.height;
    doc
      .rect(24, 24, W - 48, H - 48)
      .lineWidth(2)
      .strokeColor(PURPLE)
      .stroke();
    doc
      .rect(32, 32, W - 64, H - 64)
      .lineWidth(0.5)
      .strokeColor('#e9e8f3')
      .stroke();

    let y = 70;
    // PDFKit draws PNG and JPG. A WebP logo (allowed for the screens) falls back to the default mark in the PDF.
    let drawn = false;
    if (c.logo) {
      try {
        doc.image(c.logo, W / 2 - 22, y, { fit: [44, 44] });
        drawn = true;
      } catch {
        /* not PNG or JPG */
      }
    }
    if (!drawn) {
      doc.roundedRect(W / 2 - 20, y, 40, 40, 11).fill(PURPLE);
      doc
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(22)
        .text('L', W / 2 - 20, y + 10, { width: 40, align: 'center' });
    }
    y += 58;
    const line = (text: string, size: number, font: string, color: string, gap: number) => {
      doc
        .fillColor(color)
        .font(font)
        .fontSize(size)
        .text(text, 60, y, { width: W - 120, align: 'center' });
      y += gap;
    };
    line(c.orgName.toUpperCase(), 11, 'Helvetica-Bold', MUTED, 26);
    line(c.title, 30, 'Helvetica-Bold', INK, 52);
    line(c.intro, 13, 'Helvetica', MUTED, 30);
    line(c.studentName, 32, 'Helvetica-Bold', PURPLE, 52);
    line(c.mid, 13, 'Helvetica', MUTED, 30);
    line(c.courseTitle, 22, 'Helvetica-Bold', INK, 44);
    line(`Instructor: ${c.instructorName} · Issued ${issuedOn(c.issuedAt)}`, 11, 'Helvetica', MUTED, 22);
    line(c.footer, 11, 'Helvetica', MUTED, 22);
    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(9)
      .text(`Certificate number ${c.certificateNo}`, 60, H - 62, {
        width: W - 120,
        align: 'center',
      });
    doc.end();
  });
}
