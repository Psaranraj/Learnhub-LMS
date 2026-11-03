import type { ReactNode } from 'react';
import { CATEGORY_LABELS, LEVEL_LABELS } from '@learnhub/shared';
import type { CourseCard } from '../services/courseService';
import { CourseCover } from './CourseCover';

/** The design's course card (cc): cover, title, "category · level · instructor", lesson count and a footer. */
export function CourseTileCard({ c, footer }: { c: CourseCard; footer: ReactNode }) {
  return (
    <article className="flex flex-col rounded-[13px] border border-ln bg-white p-[18px] shadow-card">
      <CourseCover title={c.title} />
      <h3 className="mb-1 text-sm font-bold">{c.title}</h3>
      <p className="mb-1 text-[11px] text-mu">
        {CATEGORY_LABELS[c.category]} · {LEVEL_LABELS[c.level]} · {c.instructor.name}
      </p>
      <p className="text-[11px] text-mu">{c.lessonCount} lessons</p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">{footer}</div>
    </article>
  );
}
