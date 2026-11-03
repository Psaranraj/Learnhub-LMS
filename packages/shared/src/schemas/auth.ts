import { z } from 'zod';

const PW_MSG = 'Password needs at least 8 characters, with a letter and a number.';
/** Password rule (HLD 6): 8+ characters with a letter and a number. Also used for admin-set temporary passwords. */
export const passwordSchema = z
  .string()
  .min(8, PW_MSG)
  .regex(/[A-Za-z]/, PW_MSG)
  .regex(/\d/, PW_MSG);

export const registerSchema = z
  .object({
    name: z.string().trim().min(3, 'Enter your full name.'),
    mobile: z
      .string()
      .trim()
      .regex(/^\d{10}$/, 'Enter a 10-digit mobile number.'),
    email: z.string().trim().toLowerCase().email('Enter a valid email.'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Password and confirm password do not match.',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email.'),
  password: z.string().min(1, 'Enter your password.'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Password and confirm password do not match.',
    path: ['confirmPassword'],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: 'New password must be different from your current password.',
    path: ['newPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email.'),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
