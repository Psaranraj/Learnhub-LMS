type Props<T extends string> = {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
};

export function Tabs<T extends string>({ tabs, active, onChange }: Props<T>) {
  return (
    <div role="tablist" className="mb-3 flex gap-5 border-b border-ln">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={t.id === active}
          onClick={() => onChange(t.id)}
          className={`-mb-px border-b-2 py-2.5 text-xs font-bold ${t.id === active ? 'border-p text-p' : 'border-transparent text-mu'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
