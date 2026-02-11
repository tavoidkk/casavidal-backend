import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => { 
  console.error('Error:', err);

  // Errores de Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Registro duplicado
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Ya existe un registro con estos datos',
        field: err.meta?.target,
      });
    }
    
    // Registro no encontrado
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Registro no encontrado',
      });
    }

    // Foreign key constraint
    if (err.code === 'P2003') {
      return res.status(400).json({
        success: false,
        error: 'Referencia inválida a otro registro',
      });
    }
  }

  // Errores de validación con Zod
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Error de validación',
      details: err.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Errores operacionales personalizados
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  // Error genérico
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { details: err.message }),
  });
};

// Middleware para rutas no encontradas
export const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
};