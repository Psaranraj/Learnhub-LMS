import type { ActivityQuery } from '@learnhub/shared';
import type { ActivityType, Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { skipTake, toPage } from '../../utils/pagination';

/**
 * Writes one log line inside the caller's transaction, so an action and its log entry succeed or fail together.
 * v3: actorId is empty when no user did it; actorLabel then names the source ("Self-registration", "Sign-in page").
 */
export type ActivityEntry =
  | { type: ActivityType; text: string; actorId: number }
  | { type: ActivityType; text: string; actorLabel: string };

export async function logActivity(tx: Prisma.TransactionClient, entry: ActivityEntry) {
  if ('actorId' in entry) {
    const actor = await tx.user.findUniqueOrThrow({
      where: { id: entry.actorId },
      select: { name: true },
    });
    await tx.activityLog.create({
      data: { type: entry.type, text: entry.text, actorId: entry.actorId, actorLabel: actor.name },
    });
    return;
  }
  await tx.activityLog.create({
    data: { type: entry.type, text: entry.text, actorId: null, actorLabel: entry.actorLabel },
  });
}

export const activityService = {
  /** Newest first, with a text search and a type filter. */
  async list(query: ActivityQuery) {
    const where: Prisma.ActivityLogWhereInput = {
      ...(query.q ? { text: { contains: query.q } } : {}),
      ...(query.type ? { type: query.type } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...skipTake(query.page, query.pageSize),
        select: { id: true, type: true, text: true, actorLabel: true, createdAt: true },
      }),
      prisma.activityLog.count({ where }),
    ]);
    return toPage(items, total, query.page, query.pageSize);
  },
};
