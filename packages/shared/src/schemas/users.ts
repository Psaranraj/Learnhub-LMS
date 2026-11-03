import { z } from 'zod';
import { passwordSchema } from './auth';
import { paginationSchema } from './common';

const roleEnum = z.enum(['ADMIN', 'INSTRUCTOR', 'STUDENT']);
const statusEnum = z.enum(['ACTIVE', 'INACTIVE']);
const name = z.string().trim().min(3, 'Enter the full name.');
const email = z.string().trim().toLowerCase().email('Enter a valid email.');
const mobile = z
  .string()
  .trim()
  .regex(/^\d{10}$/, 'Mobile number must be 10 digits.');

// v3 (HLD 6, "Admin-made accounts"): the admin may create any role. Mobile is optional and only kept for a
// student. The form suggests a temporary password the admin may change; when none is sent, the server makes one.
export const createUserSchema = z
  .object({
    name,
    email,
    role: roleEnum,
    mobile: z.union([mobile, z.literal('')]).optional(),
    temporaryPassword: passwordSchema.optional(),
  })
  .transform((v) => ({ ...v, mobile: v.role === 'STUDENT' && v.mobile ? v.mobile : undefined }));

// Name, email and role only (LLD 3). Status has its own endpoint.
export const updateUserSchema = z
  .object({ name: name.optional(), email: email.optional(), role: roleEnum.optional() })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: 'Nothing to change.' });

export const userStatusSchema = z.object({ status: statusEnum });

/** v3: the admin may type the new temporary password; when the body is empty, the server makes one. */
export const resetPasswordSchema = z
  .object({ temporaryPassword: passwordSchema.optional() })
  .optional()
  .transform((v): { temporaryPassword?: string } => v ?? {});

export const userListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  role: roleEnum.optional(),
  status: statusEnum.optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateUserForm = z.input<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserStatusInput = z.infer<typeof userStatusSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
