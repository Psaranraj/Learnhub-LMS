/** The design's course cover: the first letters of the first two words on a lavender block. */
export function CourseCover({ title, tall = false }: { title: string; tall?: boolean }) {
  const initials =
    title
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'NC';
  return (
    <div
      aria-hidden
      className={`mb-3 grid place-items-center rounded-[10px] bg-lv text-[26px] font-extrabold text-p ${tall ? 'h-[150px]' : 'h-[110px]'}`}
    >
      {initials}
    </div>
  );
}
