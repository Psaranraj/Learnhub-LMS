import type { Role, UserStatus } from '@prisma/client';
import { ConflictError } from '../../utils/errors';

// Account safeguards from HLD 6. Pure functions: the service loads the facts, these decide.
export type Target = { id: number; role: Role; status: UserStatus };
export type Facts = { ownedCourses: number; otherActiveAdmins: number };

const courses = (n: number) => `${n} course${n === 1 ? '' : 's'}`;

export function checkRoleChange(actorId: number, target: Target, newRole: Role, facts: Facts) {
  if (newRole === target.role) return;
  if (target.id === actorId) throw new ConflictError('You cannot change your own role.');
  if (target.role === 'INSTRUCTOR' && facts.ownedCourses > 0) {
    throw new ConflictError(`Reassign this instructor's ${courses(facts.ownedCourses)} first.`);
  }
  if (target.role === 'ADMIN' && target.status === 'ACTIVE' && facts.otherActiveAdmins < 1) {
    throw new ConflictError('At least one active admin must remain.');
  }
}

export function checkStatusChange(actorId: number, target: Target, newStatus: UserStatus, facts: Facts) {
  if (newStatus === target.status) return;
  if (target.id === actorId) throw new ConflictError('You cannot deactivate your own account.');
  if (newStatus !== 'INACTIVE') return;
  // v3 (design): an instructor who owns courses CAN be deactivated. The screen warns first; the courses stay
  // and the admin can assign another instructor from Courses and approvals.
  if (target.role === 'ADMIN' && facts.otherActiveAdmins < 1)
    throw new ConflictError('At least one active admin must remain.');
}

/** v3 (design): the name of an instructor who owns courses is locked, because courses and records show it. */
export function checkNameChange(target: Target & { name: string }, newName: string | undefined, facts: Facts) {
  if (newName === undefined || newName === target.name) return;
  if (target.role === 'INSTRUCTOR' && facts.ownedCourses > 0) {
    throw new ConflictError(`The name is locked while this instructor owns ${courses(facts.ownedCourses)}.`, {
      name: 'Locked while the instructor owns courses.',
    });
  }
}

export function checkReset(actorId: number, target: Target) {
  if (target.id === actorId) throw new ConflictError('You cannot reset your own password here. Use Account settings.');
}
