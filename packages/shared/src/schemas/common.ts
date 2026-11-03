import { z } from 'zod';

/** Path parameter /:id. Express hands strings, so it is coerced. */
export const idParamSchema = z.object({ id: z.coerce.number().int().positive('Invalid id.') });

/** Every list takes page (default 1) and pageSize (default 20, maximum 100). HLD 6, "Lists". */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };
