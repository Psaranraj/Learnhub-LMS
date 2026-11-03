import { Prisma } from '@prisma/client';
import type { CreateUserInput, StudentSearchQuery, UpdateUserInput, UserListQuery } from '@learnhub/shared';
import { generateTempPassword, hashPassword } from '../../lib/password';
import { ConflictError, NotFoundError } from '../../utils/errors';
import { skipTake, toPage } from '../../utils/pagination';
import { prisma } from '../../utils/prisma';
import { logActivity } from '../activity/activity.service';
import { checkNameChange, checkReset, checkRoleChange, checkStatusChange } from './users.rules';

const select = {
  id: true,
  name: true,
  email: true,
  mobile: true,
  role: true,
  status: true,
  mustChangePassword: true,
  createdAt: true,
  _count: { select: { taught: true } },
  resetRequests: { where: { resolvedAt: null }, select: { id: true }, take: 1 },
} satisfies Prisma.UserSelect;
type Row = Prisma.UserGetPayload<{ select: typeof select }>;

const toAdminUser = ({ _count, resetRequests, ...u }: Row) => ({
  ...u,
  courseCount: _count.taught,
  resetRequested: resetRequests.length > 0,
});
const word = (s: string) => s.charAt(0) + s.slice(1).toLowerCase(); // INSTRUCTOR -> Instructor
const emailTaken = () => new ConflictError('This email is already used.', { email: 'This email is already used.' });
const isUnique = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

async function load(id: number) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
  if (!user) throw new NotFoundError('User not found.');
  return user;
}
async function facts(userId: number) {
  const [ownedCourses, otherActiveAdmins] = await Promise.all([
    prisma.course.count({ where: { instructorId: userId } }),
    prisma.user.count({ where: { role: 'ADMIN', status: 'ACTIVE', id: { not: userId } } }),
  ]);
  return { ownedCourses, otherActiveAdmins };
}

export const usersService = {
  async list(q: UserListQuery) {
    const where: Prisma.UserWhereInput = {
      ...(q.q ? { OR: [{ name: { contains: q.q } }, { email: { contains: q.q } }] } : {}),
      ...(q.role ? { role: q.role } : {}),
      ...(q.status ? { status: q.status } : {}),
    };
    // Role descending puts admins first, then instructors, then students (enum order).
    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select,
        orderBy: [{ role: 'desc' }, { name: 'asc' }],
        ...skipTake(q.page, q.pageSize),
      }),
      prisma.user.count({ where }),
    ]);
    return toPage(rows.map(toAdminUser), total, q.page, q.pageSize);
  },

  /**
   * The temporary password is returned once and never stored in clear. The person must change it (banner).
   * v3: the admin may send their own (the form suggests one); otherwise the server makes one.
   */
  async create(actorId: number, input: CreateUserInput) {
    const temporaryPassword = input.temporaryPassword ?? generateTempPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    try {
      const row = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            name: input.name,
            email: input.email,
            mobile: input.mobile ?? '',
            role: input.role,
            passwordHash,
            mustChangePassword: true,
          },
          select,
        });
        await logActivity(tx, {
          type: 'USERS',
          text: `Created ${input.role.toLowerCase()} account: ${created.name}`,
          actorId,
        });
        return created;
      });
      return { user: toAdminUser(row), temporaryPassword };
    } catch (e) {
      if (isUnique(e)) throw emailTaken();
      throw e;
    }
  },

  async update(actorId: number, id: number, input: UpdateUserInput) {
    const target = await load(id);
    const f = await facts(id);
    if (input.role) checkRoleChange(actorId, target, input.role, f);
    checkNameChange(target, input.name, f);
    try {
      const row = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id },
          data: { name: input.name, email: input.email, role: input.role },
          select,
        });
        if (input.role && input.role !== target.role) {
          await logActivity(tx, {
            type: 'USERS',
            text: `Changed role of ${updated.name} from ${word(target.role)} to ${word(input.role)}`,
            actorId,
          });
        }
        if (
          (input.name !== undefined && input.name !== target.name) ||
          (input.email !== undefined && input.email !== target.email)
        ) {
          await logActivity(tx, {
            type: 'USERS',
            text: `Updated account details: ${updated.name}`,
            actorId,
          });
        }
        return updated;
      });
      return toAdminUser(row);
    } catch (e) {
      if (isUnique(e)) throw emailTaken();
      throw e;
    }
  },

  async setStatus(actorId: number, id: number, status: 'ACTIVE' | 'INACTIVE') {
    const target = await load(id);
    checkStatusChange(actorId, target, status, await facts(id));
    return prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id }, data: { status }, select });
      if (status !== target.status) {
        await logActivity(tx, {
          type: 'USERS',
          text: `${status === 'INACTIVE' ? 'Deactivated' : 'Activated'} ${target.role.toLowerCase()} account: ${target.name}`,
          actorId,
        });
      }
      return toAdminUser(updated);
    });
  },

  /** New temporary password, shown once. Raising tokenVersion signs the person out everywhere. Closes open requests. */
  async resetPassword(actorId: number, id: number, typed?: string) {
    const target = await load(id);
    checkReset(actorId, target);
    const temporaryPassword = typed ?? generateTempPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { passwordHash, mustChangePassword: true, tokenVersion: { increment: 1 } },
      });
      await tx.passwordResetRequest.updateMany({
        where: { userId: id, resolvedAt: null },
        data: { resolvedAt: new Date(), resolvedById: actorId },
      });
      await logActivity(tx, { type: 'USERS', text: `Reset password for ${target.name}`, actorId });
    });
    const user = await prisma.user.findUniqueOrThrow({
      where: { id },
      select: { id: true, name: true, email: true },
    });
    return { user, temporaryPassword };
  },

  /** Open forgot-password requests, oldest first, for the admin dashboard and Users page. */
  async resetRequests(page: number, pageSize: number) {
    const where = { resolvedAt: null };
    const [rows, total] = await Promise.all([
      prisma.passwordResetRequest.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        ...skipTake(page, pageSize),
        select: {
          id: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      prisma.passwordResetRequest.count({ where }),
    ]);
    return toPage(rows, total, page, pageSize);
  },

  /**
   * Active students for the instructor's Add students dialog (GET /students). excludeCourseId leaves out students already
   * in that course; onlyNew keeps students who are in none of the caller's courses.
   */
  async searchStudents(instructorId: number, q: StudentSearchQuery) {
    const where: Prisma.UserWhereInput = {
      role: 'STUDENT',
      status: 'ACTIVE',
      ...(q.q ? { OR: [{ name: { contains: q.q } }, { email: { contains: q.q } }] } : {}),
      AND: [
        ...(q.excludeCourseId ? [{ enrollments: { none: { courseId: q.excludeCourseId } } }] : []),
        ...(q.onlyNew ? [{ enrollments: { none: { course: { instructorId } } } }] : []),
      ],
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
        ...skipTake(q.page, q.pageSize),
      }),
      prisma.user.count({ where }),
    ]);
    return toPage(items, total, q.page, q.pageSize);
  },
};
