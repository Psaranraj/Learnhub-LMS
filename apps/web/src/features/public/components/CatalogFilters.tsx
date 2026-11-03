import { CATEGORY_LABELS, LEVEL_LABELS, type Category, type Level } from '@learnhub/shared';
import { field } from '../../../utils/styles';

export type Filters = { q: string; category: Category | ''; level: Level | '' };

/** Search, category and level, as in the design's course list. Used by the public home and the student catalog. */
export function CatalogFilters({ value, onChange }: { value: Filters; onChange: (f: Filters) => void }) {
  return (
    <div className="mb-4 grid gap-2.5 [grid-template-columns:2fr_1fr_1fr] max-md:[grid-template-columns:1fr]">
      <input
        className={field}
        placeholder="Search courses or instructors"
        aria-label="Search"
        value={value.q}
        onChange={(e) => onChange({ ...value, q: e.target.value })}
      />
      <select
        className={field}
        aria-label="Category"
        value={value.category}
        onChange={(e) => onChange({ ...value, category: e.target.value as Category | '' })}
      >
        <option value="">All categories</option>
        {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <select
        className={field}
        aria-label="Level"
        value={value.level}
        onChange={(e) => onChange({ ...value, level: e.target.value as Level | '' })}
      >
        <option value="">All levels</option>
        {Object.entries(LEVEL_LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );
}
