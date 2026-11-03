import type { ReactNode } from 'react';

// The design's three message boxes: note (purple), warn (amber) and ok (green).
const tones = {
  note: 'bg-lv text-[#3b2fc4]',
  warn: 'bg-[#fff2df] text-[#8a5a10]',
  ok: 'bg-[#e4f8f0] text-[#13845f]',
} as const;

export function Notice({
  tone = 'note',
  children,
  className = '',
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === 'warn' ? 'alert' : undefined}
      className={`mb-3.5 rounded-[9px] p-3 text-xs leading-normal ${tones[tone]} ${className}`}
    >
      {children}
    </div>
  );
}
