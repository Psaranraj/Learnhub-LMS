import type { Role } from '@learnhub/shared';

/** Where a signed-in user lands (LLD 5: each role opens its dashboard). */
export const homeOf = (role: Role) => `/${role.toLowerCase()}/dashboard`;

/** Base path of a role's area, for example /admin. */
export const baseOf = (role: Role) => `/${role.toLowerCase()}`;
