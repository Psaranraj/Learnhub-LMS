import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env';
import { NotFoundError } from '../utils/errors';

// The only code that touches the storage folder (HLD 2, LLD 4). Moving to S3-compatible storage later means
// changing this file only. Paths stored in the database are relative, for example "materials/3f2a....pdf".
const ROOT = path.resolve(process.cwd(), env.STORAGE_DIR);

function resolveSafe(relative: string) {
  const full = path.resolve(ROOT, relative);
  if (!full.startsWith(ROOT + path.sep)) throw new Error('Invalid storage path.');
  return full;
}

export const storage = {
  /** Saves bytes under a generated name and returns the relative path to store in the database. */
  async save(folder: 'materials' | 'submissions' | 'logos', bytes: Buffer, extension: string): Promise<string> {
    const relative = `${folder}/${randomUUID()}.${extension}`;
    const full = resolveSafe(relative);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, bytes);
    return relative;
  },
  /** A file missing from the folder is a 404, not a server error. */
  async read(relative: string) {
    try {
      return await readFile(resolveSafe(relative));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') throw new NotFoundError('The file is no longer available.');
      throw e;
    }
  },
  /** Deleting a file that is already gone is not an error. */
  async remove(relative: string | null | undefined) {
    if (relative) await rm(resolveSafe(relative), { force: true });
  },
};

/** Keeps a readable original name for display: letters, digits, spaces, dot, dash and underscore. */
export const cleanFileName = (name: string) =>
  (
    name
      .normalize('NFKD')
      .replace(/[^\w.\- ]+/g, '')
      .replace(/\s+/g, ' ')
      .trim() || 'file'
  ).slice(0, 120);
