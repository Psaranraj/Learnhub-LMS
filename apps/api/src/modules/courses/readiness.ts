import { isAllowedVideoUrl } from '@learnhub/shared';

// "Ready to submit" (HLD 6). One function, used by the submit endpoint and the admin review screen.
export type ReadinessQuestion = {
  version: number;
  position: number;
  text: string;
  options: unknown;
  correctIndex: number;
};
export type ReadinessInput = {
  title: string;
  description: string;
  category: string | null;
  level: string | null;
  lessons: {
    title: string;
    videoUrl: string;
    durationMin: number;
    quiz: { version: number; questionCount: number; questions: ReadinessQuestion[] } | null;
  }[];
  assignment: { title: string; instructions: string; todoItems: unknown } | null;
};
export type ReadinessItem = { ok: boolean; text: string };

const filled = (s: unknown): s is string => typeof s === 'string' && s.trim().length > 0;

/** Every question of the current version is written: text, four options, one correct answer. */
export function isQuizComplete(quiz: NonNullable<ReadinessInput['lessons'][number]['quiz']>): boolean {
  const current = quiz.questions.filter((q) => q.version === quiz.version);
  if (quiz.questionCount < 1 || current.length !== quiz.questionCount) return false;
  const positions = new Set(current.map((q) => q.position));
  if (positions.size !== quiz.questionCount) return false;
  return current.every(
    (q) =>
      filled(q.text) &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      q.options.every(filled) &&
      Number.isInteger(q.correctIndex) &&
      q.correctIndex >= 0 &&
      q.correctIndex <= 3,
  );
}

export function readiness(c: ReadinessInput): {
  ready: boolean;
  items: ReadinessItem[];
  missing: string[];
} {
  const items: ReadinessItem[] = [
    { ok: c.title.trim().length >= 3, text: 'Course title (3 or more characters)' },
    { ok: c.description.trim().length >= 10, text: 'Description (10 or more characters)' },
    { ok: !!c.category && !!c.level, text: 'Category and level' },
    { ok: c.lessons.length >= 1, text: 'At least one lesson' },
  ];
  c.lessons.forEach((l, i) => {
    const n = i + 1;
    items.push({ ok: filled(l.title), text: `Lesson ${n}: title` });
    items.push({
      ok: isAllowedVideoUrl(l.videoUrl),
      text: `Lesson ${n}: video link from YouTube or Vimeo`,
    });
    items.push({
      ok: Number.isInteger(l.durationMin) && l.durationMin >= 1,
      text: `Lesson ${n}: duration of 1 minute or more`,
    });
    items.push({
      ok: !!l.quiz && isQuizComplete(l.quiz),
      text: `Lesson ${n}: quiz with every question written`,
    });
  });
  const todo = c.assignment?.todoItems;
  items.push({
    ok:
      !!c.assignment &&
      filled(c.assignment.title) &&
      filled(c.assignment.instructions) &&
      Array.isArray(todo) &&
      todo.length === 2 &&
      todo.every(filled),
    text: 'Assignment with a title, instructions and two to-do items',
  });
  const missing = items.filter((i) => !i.ok).map((i) => i.text);
  return { ready: missing.length === 0, items, missing };
}
