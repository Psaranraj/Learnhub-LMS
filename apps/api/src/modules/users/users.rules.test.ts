import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkNameChange, checkReset, checkRoleChange, checkStatusChange } from './users.rules';

// HLD 6, "Account safeguards" (v3). Pure functions, so no database is needed.
const ME = 1;
const admin = { id: 2, role: 'ADMIN' as const, status: 'ACTIVE' as const };
const instructor = {
  id: 3,
  role: 'INSTRUCTOR' as const,
  status: 'ACTIVE' as const,
  name: 'Rahul Menon',
};
const student = { id: 4, role: 'STUDENT' as const, status: 'ACTIVE' as const };
const none = { ownedCourses: 0, otherActiveAdmins: 1 };
const owns3 = { ownedCourses: 3, otherActiveAdmins: 1 };

describe('status change', () => {
  it('refuses your own account', () => {
    assert.throws(() => checkStatusChange(ME, { ...admin, id: ME }, 'INACTIVE', none), /your own account/);
  });
  it('v3: allows deactivating an instructor who owns courses', () => {
    assert.doesNotThrow(() => checkStatusChange(ME, instructor, 'INACTIVE', owns3));
  });
  it('keeps at least one active admin', () => {
    assert.throws(
      () => checkStatusChange(ME, admin, 'INACTIVE', { ownedCourses: 0, otherActiveAdmins: 0 }),
      /one active admin/,
    );
  });
  it('allows activating anyone', () => {
    assert.doesNotThrow(() => checkStatusChange(ME, { ...student, status: 'INACTIVE' }, 'ACTIVE', none));
  });
});

describe('role change', () => {
  it('refuses your own role', () => {
    assert.throws(() => checkRoleChange(ME, { ...admin, id: ME }, 'INSTRUCTOR', none), /your own role/);
  });
  it('refuses an instructor who owns courses', () => {
    assert.throws(() => checkRoleChange(ME, instructor, 'ADMIN', owns3), /Reassign/);
  });
  it('allows an instructor with no courses', () => {
    assert.doesNotThrow(() => checkRoleChange(ME, instructor, 'ADMIN', none));
  });
  it('keeps at least one active admin', () => {
    assert.throws(
      () => checkRoleChange(ME, admin, 'INSTRUCTOR', { ownedCourses: 0, otherActiveAdmins: 0 }),
      /one active admin/,
    );
  });
});

describe('name change', () => {
  it('v3: locks the name of an instructor who owns courses', () => {
    assert.throws(() => checkNameChange(instructor, 'New Name', owns3), /locked/);
  });
  it('allows the same name to be sent back', () => {
    assert.doesNotThrow(() => checkNameChange(instructor, 'Rahul Menon', owns3));
  });
  it('allows renaming an instructor with no courses', () => {
    assert.doesNotThrow(() => checkNameChange(instructor, 'New Name', none));
  });
});

describe('reset password', () => {
  it('refuses your own account', () => {
    assert.throws(() => checkReset(ME, { ...admin, id: ME }), /Account settings/);
  });
  it('allows another account', () => {
    assert.doesNotThrow(() => checkReset(ME, student));
  });
});
