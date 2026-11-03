import type { Role } from '@learnhub/shared';

type DbUser = {
  id: number;
  name: string;
  email: string;
  mobile: string;
  role: Role;
  mustChangePassword: boolean;
};

export type PublicUser = DbUser;

export const toPublicUser = (u: DbUser): PublicUser => ({
  id: u.id,
  name: u.name,
  email: u.email,
  mobile: u.mobile,
  role: u.role,
  mustChangePassword: u.mustChangePassword,
});
