export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-lv">
      <i className="block h-full rounded-full bg-p" style={{ width: `${percent}%` }} />
    </div>
  );
}
