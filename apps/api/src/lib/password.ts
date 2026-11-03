import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';

const ROUNDS = 10;
const LETTERS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ'; // no I, l, O, o: easy to misread
const DIGITS = '23456789'; // no 0 or 1
const pick = (set: string) => set[randomInt(set.length)];

export const hashPassword = (plain: string) => bcrypt.hash(plain, ROUNDS);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

/** A hash to compare against when the email is unknown, so timing does not reveal which emails exist. */
let dummy: Promise<string> | undefined;
export const dummyHash = () => (dummy ??= bcrypt.hash('not-a-real-password', ROUNDS));

/** Random temporary password (12 characters by default) with at least one letter and one number. */
export function generateTempPassword(length = 12): string {
  const all = LETTERS + DIGITS;
  const chars = [pick(LETTERS), pick(DIGITS), ...Array.from({ length: length - 2 }, () => pick(all))];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
