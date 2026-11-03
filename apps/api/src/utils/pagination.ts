import type { Page } from '@learnhub/shared';

export const skipTake = (page: number, pageSize: number) => ({
  skip: (page - 1) * pageSize,
  take: pageSize,
});
export const toPage = <T>(items: T[], total: number, page: number, pageSize: number): Page<T> => ({
  items,
  total,
  page,
  pageSize,
});
