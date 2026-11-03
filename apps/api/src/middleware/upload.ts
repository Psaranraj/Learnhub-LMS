import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { PayloadTooLargeError, ValidationError } from '../utils/errors';

// HLD 7, "File uploads": size limit per route, then the real file header is checked (not the name or the type
// the browser reports). One file per request, in the form field "file".
const isPng = (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
const isJpg = (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
const isWebp = (b: Buffer) =>
  b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP';

const KINDS = {
  pdf: {
    test: (b: Buffer) => b.subarray(0, 5).toString('latin1') === '%PDF-',
    message: 'Upload a PDF file.',
  },
  image: {
    test: (b: Buffer) => isPng(b) || isJpg(b) || isWebp(b),
    message: 'Upload a PNG, JPG or WebP image.',
  },
} as const;

/** The stored extension for an image upload, from its header. */
export const imageExtension = (b: Buffer) => (isPng(b) ? 'png' : isJpg(b) ? 'jpg' : 'webp');

/** maxMb may be fractional (the logo is 1 MB). optional: the request may have no file (Settings without a new logo). */
export function uploadOne(kind: keyof typeof KINDS, maxMb: number, optional = false) {
  const parse = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: Math.round(maxMb * 1024 * 1024), files: 1 },
  }).single('file');
  return (req: Request, res: Response, next: NextFunction) => {
    parse(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE')
        return next(new PayloadTooLargeError(`The file is larger than ${maxMb} MB.`));
      if (err) return next(new ValidationError('The upload could not be read. Send one file in the field "file".'));
      if (!req.file || req.file.size === 0) {
        if (optional) {
          req.file = undefined;
          return next();
        }
        return next(new ValidationError('Choose a file to upload.', { file: 'Choose a file.' }));
      }
      if (!KINDS[kind].test(req.file.buffer))
        return next(new ValidationError(KINDS[kind].message, { file: KINDS[kind].message }));
      next();
    });
  };
}
