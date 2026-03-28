import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './errorHandler';
import { prisma } from '../config/database';

interface JwtPayload {
  userId: string;
  role: string;
}

// Extender el tipo Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Obtener token del header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'Token no proporcionado');
    }

    const token = authHeader.split(' ')[1];

    // Verificar token
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Verificar que el usuario existe y está activo
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'Usuario no autorizado');
    }

    // Agregar usuario al request
    req.user = {
      id: user.id,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError(401, 'Token inválido'));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError(401, 'Token expirado'));
    }
    next(error);
  }
};

// Middleware para verificar roles
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'No autenticado'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'No tienes permisos para esta acción'));
    }

    next();
  };
};