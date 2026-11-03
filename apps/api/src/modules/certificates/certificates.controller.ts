import type { Request, Response } from 'express';
import type { CertificateProgressQuery, CertificatesQuery } from '@learnhub/shared';
import { paramsOf, queryOf } from '../../middleware/validate';
import { certificatesService } from './certificates.service';

export const certificatesController = {
  async mine(req: Request, res: Response) {
    res.json(await certificatesService.mine(req.user!.id));
  },
  async list(req: Request, res: Response) {
    res.json(await certificatesService.list(req.user!, queryOf<CertificatesQuery>(res)));
  },
  async progress(req: Request, res: Response) {
    res.json(await certificatesService.progress(req.user!.id, queryOf<CertificateProgressQuery>(res)));
  },
  async view(req: Request, res: Response) {
    res.json({ certificate: await certificatesService.view(req.user!, paramsOf(res).id) });
  },
  async logo(req: Request, res: Response) {
    const file = await certificatesService.logo(req.user!, paramsOf(res).id);
    res.type(file.type).setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(file.bytes);
  },
  async download(req: Request, res: Response) {
    const file = await certificatesService.pdf(req.user!, paramsOf(res).id);
    res.type('application/pdf').setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.send(file.bytes);
  },
};
