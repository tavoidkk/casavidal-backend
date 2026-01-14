import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.services';
import { successResponse } from '../utils/response';
import { z } from 'zod';

// Schemas de validación
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
    password: z
      .string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres')
      .max(50, 'La contraseña es demasiado larga'),
    firstName: z
      .string()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(50, 'El nombre es demasiado largo'),
    lastName: z
      .string()
      .min(2, 'El apellido debe tener al menos 2 caracteres')
      .max(50, 'El apellido es demasiado largo'),
    role: z.enum(['ADMIN', 'VENDEDOR', 'VISUALIZADOR']).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'La contraseña es requerida'),
  }),
});

export class AuthController {
  // POST /api/auth/register
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.register(req.body);
      return successResponse(
        res,
        result,
        'Usuario registrado exitosamente',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  // POST /api/auth/login
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.login(req.body);
      return successResponse(res, result, 'Login exitoso');
    } catch (error) {
      next(error);
    }
  }

  // GET /api/auth/profile
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'No autenticado' });
      }

      const user = await AuthService.getProfile(req.user.id);
      return successResponse(res, user);
    } catch (error) {
      next(error);
    }
  }
}