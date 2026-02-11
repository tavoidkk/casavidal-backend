import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service';
import { successResponse, paginatedResponse } from '../utils/response';
import { z } from 'zod';

// Schemas de validación
export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(200),
    description: z.string().max(1000).optional(),
    sku: z.string().min(1).max(50),
    barcode: z.string().max(50).optional(),
    categoryId: z.string().uuid(),
    costPrice: z.number().positive(),
    salePrice: z.number().positive(),
    wholesalePrice: z.number().positive().optional(),
    currentStock: z.number().int().min(0),
    minStock: z.number().int().min(0).optional(),
    maxStock: z.number().int().min(0).optional(),
    hasVariants: z.boolean().optional(),
    parentProductId: z.string().uuid().optional(),
    variantInfo: z.string().max(100).optional(),
    image: z.string().url().optional(),
    unit: z.string().max(20).optional(),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(200).optional(),
    description: z.string().max(1000).optional(),
    barcode: z.string().max(50).optional(),
    categoryId: z.string().uuid().optional(),
    costPrice: z.number().positive().optional(),
    salePrice: z.number().positive().optional(),
    wholesalePrice: z.number().positive().optional(),
    currentStock: z.number().int().min(0).optional(),
    minStock: z.number().int().min(0).optional(),
    maxStock: z.number().int().min(0).optional(),
    variantInfo: z.string().max(100).optional(),
    image: z.string().url().optional(),
    unit: z.string().max(20).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const adjustStockSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    quantity: z.number().int(),
    type: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'DEVOLUCION']),
    reference: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
  }),
});

export class ProductController {
  // POST /api/products
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.create(req.body);
      return successResponse(
        res,
        product,
        'Producto creado exitosamente',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  // GET /api/products
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        search: req.query.search as string,
        categoryId: req.query.categoryId as string,
        isActive: req.query.isActive !== 'false',
        lowStock: req.query.lowStock === 'true',
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };

      const result = await ProductService.findAll(filters);

      return paginatedResponse(
        res,
        result.products,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total
      );
    } catch (error) {
      next(error);
    }
  }

  // GET /api/products/:id
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.findById(req.params.id);
      return successResponse(res, product);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/products/code/:code
  static async getByCode(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.findByCode(req.params.code);
      return successResponse(res, product);
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/products/:id
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.update(req.params.id, req.body);
      return successResponse(res, product, 'Producto actualizado exitosamente');
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/products/:id
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProductService.delete(req.params.id);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/products/adjust-stock
  static async adjustStock(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const product = await ProductService.adjustStock(req.body, userId);
      return successResponse(
        res,
        product,
        'Stock ajustado exitosamente'
      );
    } catch (error) {
      next(error);
    }
  }

  // GET /api/products/low-stock
  static async getLowStock(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await ProductService.getLowStock();
      return successResponse(res, products);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/products/out-of-stock
  static async getOutOfStock(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await ProductService.getOutOfStock();
      return successResponse(res, products);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/products/stats
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await ProductService.getStats();
      return successResponse(res, stats);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/products/category/:categoryId
  static async getByCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await ProductService.findByCategory(req.params.categoryId);
      return successResponse(res, products);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/products/:id/variants
  static async getVariants(req: Request, res: Response, next: NextFunction) {
    try {
      const variants = await ProductService.getVariants(req.params.id);
      return successResponse(res, variants);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/products/top-selling
  static async getTopSelling(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const products = await ProductService.getTopSelling(limit);
      return successResponse(res, products);
    } catch (error) {
      next(error);
    }
  }
}