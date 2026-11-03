import type { ReactNode } from 'react';

type Props = { title: string; message: string; action?: ReactNode };

export function EmptyState({ title, message, action }: Props) {
  return (
    <div className="rounded-[13px] border border-dashed border-[#d9d8e8] bg-white px-6 py-10 text-center">
      <p className="mb-1 text-sm font-bold">{title}</p>
      <p className="mx-auto mb-4 max-w-md text-xs leading-relaxed text-mu">{message}</p>
      {action}
    </div>
  );
}
