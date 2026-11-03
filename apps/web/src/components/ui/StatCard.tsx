import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { card } from '../../utils/styles';

type Props = { label: string; value: ReactNode; hint?: string; to?: string };

export function StatCard({ label, value, hint, to }: Props) {
  const body = (
    <>
      <span className="text-xs font-bold text-mu">{label}</span>
      <b className="text-[26px] tracking-[-0.8px]">{value}</b>
      {hint && <small className="text-xs text-mu">{hint}</small>}
    </>
  );
  const cls = `${card} grid gap-1`;
  return to ? (
    <Link to={to} className={`${cls} hover:-translate-y-px`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="mb-4 grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">{children}</div>;
}
