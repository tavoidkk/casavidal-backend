import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CategoryService } from '../services/category.service';
import { successResponse } from '../utils/response';

// Esquemas de validación
const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'El nombre es obligatorio').max(100, 'El nombre es muy largo'),
    description: z.string().max(500, 'La descripción es muy larga').optional(),
    icon: z.string().max(50, 'El icono es muy largo').optional(),
  })
});

const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'El nombre es obligatorio').max(100, 'El nombre es muy largo').optional(),
    description: z.string().max(500, 'La descripción es muy larga').optional(),
    icon: z.string().max(50, 'El icono es muy largo').optional(),
    isActive: z.boolean().optional(),
  })
});

export class CategoryController {
  /**
   * GET /api/categories
   * Obtener todas las categorías activas
   */
  static async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await CategoryService.findAll();
      return successResponse(res, categories);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/categories/all (admin only)
   * Obtener todas las categorías incluyendo inactivas
   */
  static async getAllWithInactive(_req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await CategoryService.findAllWithInactive();
      return successResponse(res, categories);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/categories/stats (admin only)
   * Obtener estadísticas de categorías
   */
  static async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await CategoryService.getStats();
      return successResponse(res, stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/categories/:id
   * Obtener categoría por ID
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const category = await CategoryService.findById(id);
      return successResponse(res, category);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/categories (admin only)
   * Crear nueva categoría
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createCategorySchema.parse(req);
      const category = await CategoryService.create(validatedData.body);
      return successResponse(res, category, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/categories/:id (admin only)
   * Actualizar categoría
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validatedData = updateCategorySchema.parse(req);
      const category = await CategoryService.update(id, validatedData.body);
      return successResponse(res, category);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/categories/:id (admin only)
   * Eliminar categoría (soft delete)
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await CategoryService.delete(id);
      return successResponse(res, { message: 'Categoría eliminada correctamente' });
    } catch (error) {
      next(error);
    }
  }
}
