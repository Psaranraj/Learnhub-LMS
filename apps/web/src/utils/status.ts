export const STATUS: Record<string, { label: string; tone: 'p' | 'g' | 'o' | 'r' | 'x' }> = {
  DRAFT: { label: 'Draft', tone: 'x' },
  PENDING_REVIEW: { label: 'Pending review', tone: 'o' },
  PUBLISHED: { label: 'Published', tone: 'g' },
  REJECTED: { label: 'Rejected', tone: 'r' },
};
