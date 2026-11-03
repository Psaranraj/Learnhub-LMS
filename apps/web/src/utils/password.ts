// Suggested temporary password for the admin forms (HLD 6, "Admin-made accounts"). The admin may change it;
// the server checks the same rule as any password. Same alphabet as the server: no I, l, O, o, 0 or 1.
const LETTERS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
const DIGITS = '23456789';

const pick = (set: string) => set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length];

export function suggestPassword(length = 12): string {
  const all = LETTERS + DIGITS;
  const chars = [pick(LETTERS), pick(DIGITS), ...Array.from({ length: length - 2 }, () => pick(all))];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
