import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { forgotPasswordLimiter, loginLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import { authController } from './auth.controller';
import { changePasswordSchema, forgotPasswordSchema, loginSchema, registerSchema } from './auth.schema';

export const authRoutes = Router();

// LLD 3, Auth. There is no profile route: name, email and mobile are read-only after registration.
authRoutes.post('/register', validate(registerSchema), authController.register);
authRoutes.post('/login', loginLimiter, validate(loginSchema), authController.login);
authRoutes.post('/logout', authController.logout);
authRoutes.get('/me', authenticate, authController.me);
authRoutes.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
authRoutes.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);
