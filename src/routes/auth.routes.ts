import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController, registerSchema, loginSchema } from '../controllers/auth.controllers';
import { validate } from '../middleware/validation.middleware';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// Strict rate limiter solo en login (contra fuerza bruta)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Demasiados intentos de inicio de sesión, intenta más tarde' },
  standardHeaders: true,
});

// POST /api/auth/register - Registro
router.post(
  '/register',
  authenticate,
  requireAdmin,
  validate(registerSchema),
  AuthController.register
);

// POST /api/auth/login - Login
router.post(
  '/login',
  loginLimiter,
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
