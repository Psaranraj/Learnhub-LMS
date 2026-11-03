import { Link } from 'react-router';
import { Card } from './Card';

export type QuickMoveItem = { to: string; label: string; icon: string };

export function QuickMove({ subtitle, items }: { subtitle: string; items: QuickMoveItem[] }) {
  return (
    <Card title="Quick move" subtitle={subtitle}>
      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(170px,1fr))]">
        {items.map((i) => (
          <Link
            key={i.to}
            to={i.to}
            className="flex items-center gap-2.5 rounded-[11px] border border-ln bg-white p-3.5 text-xs font-bold hover:border-p hover:text-p"
          >
            <span aria-hidden className="text-base text-p">
              {i.icon}
            </span>
            {i.label}
          </Link>
        ))}
      </div>
    </Card>
  );
}
