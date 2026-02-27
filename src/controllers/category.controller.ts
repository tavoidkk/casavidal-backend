import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { successResponse } from '../utils/response';

export class CategoryController {
  // GET /api/categories
  static async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await prisma.category.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
      return successResponse(res, categories);
    } catch (error) {
      next(error);
    }
  }
}
