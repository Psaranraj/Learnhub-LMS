import type { ReactNode } from 'react';
import { card } from '../../utils/styles';

type Props = { title?: string; subtitle?: string; className?: string; children: ReactNode };

export function Card({ title, subtitle, className = '', children }: Props) {
  return (
    <section className={`${card} mb-4 min-w-0 ${className}`}>
      {title && <h2 className="mb-1 text-sm font-bold">{title}</h2>}
      {subtitle && <p className="mb-3 text-xs leading-normal text-mu">{subtitle}</p>}
      {children}
    </section>
  );
}
