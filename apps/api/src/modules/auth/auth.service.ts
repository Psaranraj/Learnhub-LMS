import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { SESSION_HOURS } from '../../middleware/authenticate';
import { dummyHash, hashPassword, verifyPassword } from '../../lib/password';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../../utils/errors';
import { prisma } from '../../utils/prisma';
import { logActivity } from '../activity/activity.service';
import { toPublicUser } from './auth.model';
import type { ChangePasswordInput, LoginInput, RegisterInput } from './auth.schema';

/** The token carries only the user id and tokenVersion. The role is read from the database on each request. */
const sign = (user: { id: number; tokenVersion: number }) =>
  jwt.sign({ tv: user.tokenVersion }, env.JWT_SECRET, {
    subject: String(user.id),
    expiresIn: SESSION_HOURS * 60 * 60,
  });

export const authService = {
  /** Students register themselves. Instructors and admins are created by the admin. */
  async register(input: RegisterInput) {
    const taken = () =>
      new ConflictError('This email already has an account. Sign in instead.', {
        email: 'This email already has an account.',
      });
    if (await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } })) throw taken();
    try {
      const passwordHash = await hashPassword(input.password);
      // v3: logged as in the design ("New student registered: name", done by Self-registration).
      const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            name: input.name,
            email: input.email,
            mobile: input.mobile,
            passwordHash,
            role: 'STUDENT',
          },
        });
        await logActivity(tx, {
          type: 'USERS',
          text: `New student registered: ${created.name}`,
          actorLabel: 'Self-registration',
        });
        return created;
      });
      return { token: sign(user), user: toPublicUser(user) };
    } catch (e) {
      // Two sign-ups with the same email at the same moment: the database unique rule decides.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw taken();
      throw e;
    }
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    console.log('User found in DB?:', Boolean(user));
    const ok = await verifyPassword(input.password, user ? user.passwordHash : await dummyHash());
    console.log('User found dummyhash?:', Boolean(ok));
    if (!user || !ok) throw new UnauthorizedError('Incorrect email or password.');
    if (user.status !== 'ACTIVE') throw new UnauthorizedError('This account is inactive. Contact the admin.');
    return { token: sign(user), user: toPublicUser(user) };
  },

  async me(userId: number) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'ACTIVE') throw new NotFoundError('Account not found.');
    return toPublicUser(user);
  },

  /** Always answers the same way. Active users get one open request for the admin (shown on the admin dashboard). */
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, status: true },
    });
    if (!user || user.status !== 'ACTIVE') return;
    const open = await prisma.passwordResetRequest.findFirst({
      where: { userId: user.id, resolvedAt: null },
      select: { id: true },
    });
    if (open) return;
    // v3: logged as in the design ("Password reset requested by name", done by Sign-in page).
    await prisma.$transaction(async (tx) => {
      await tx.passwordResetRequest.create({ data: { userId: user.id } });
      await logActivity(tx, {
        type: 'USERS',
        text: `Password reset requested by ${user.name}`,
        actorLabel: 'Sign-in page',
      });
    });
  },

  /** Raising tokenVersion signs out every other session. The caller gets a fresh cookie. */
  async changePassword(userId: number, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('Account not found.');
    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw new ValidationError('Current password is incorrect.', {
        currentPassword: 'Current password is incorrect.',
      });
    }
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(input.newPassword),
        mustChangePassword: false,
        tokenVersion: { increment: 1 },
      },
    });
    return { token: sign(updated) };
  },
};
