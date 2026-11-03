import type { ReactNode } from 'react';

type Props = { eyebrow: string; title: string; description?: string; action?: ReactNode };

export function PageHeader({ eyebrow, title, description, action }: Props) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="mb-1.5 text-xs font-extrabold tracking-[1.7px] text-p">{eyebrow.toUpperCase()}</div>
        <h1 className="mb-1.5 text-2xl font-extrabold tracking-[-0.8px]">{title}</h1>
        {description && <p className="text-xs leading-relaxed text-mu">{description}</p>}
      </div>
      {action}
    </div>
  );
}
