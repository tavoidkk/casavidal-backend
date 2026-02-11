import { Router } from 'express';
import { AuthController, registerSchema, loginSchema } from '../controllers/auth.controllers';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// POST /api/auth/register - Registro
router.post(
  '/register',
  validate(registerSchema),
  AuthController.register
);

// POST /api/auth/login - Login
router.post(
  '/login',
  validate(loginSchema),
  AuthController.login
);

// GET /api/auth/profile - Perfil (requiere autenticación)
router.get(
  '/profile',
  authenticate,
  AuthController.getProfile
);

export default router;