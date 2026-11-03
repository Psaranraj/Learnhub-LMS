const tones = {
  p: 'bg-lv text-p',
  g: 'bg-[#e4f8f0] text-[#0e6e4e]',
  o: 'bg-[#fff2df] text-[#8a5a10]',
  r: 'bg-[#ffedf0] text-[#b0293d]',
  x: 'bg-[#f1f0f7] text-[#4a4963]',
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({ tone = 'p', children }: { tone?: BadgeTone; children: string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-[7px] px-2 py-1 text-xs font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}
