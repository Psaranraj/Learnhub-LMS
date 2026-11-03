import { Button } from './Button';

type Props = { page: number; pageSize: number; total: number; onChange: (page: number) => void };

export function Pager({ page, pageSize, total, onChange }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize)
    return (
      <p className="mt-3 text-xs text-mu">
        {total} {total === 1 ? 'result' : 'results'}
      </p>
    );
  return (
    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-mu">
      <span>
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <span className="flex items-center gap-2">
        <Button disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <span>
          Page {page} of {pages}
        </span>
        <Button disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </Button>
      </span>
    </div>
  );
}
