import { Request, Response, NextFunction } from 'express';
import { SaleService } from '../services/sale.service';
import { successResponse, paginatedResponse } from '../utils/response';
import { z } from 'zod';

export const createSaleSchema = z.object({
  body: z.object({
    clientId: z.string().uuid('Cliente inválido'),
    items: z
      .array(
        z.object({
          productId: z.string().uuid('Producto inválido'),
          quantity: z.number().int().positive('La cantidad debe ser positiva'),
        })
      )
      .min(1, 'Debe incluir al menos un producto'),
    discount: z.number().min(0).optional(),
    paymentMethod: z.enum([
      'EFECTIVO',
      'TRANSFERENCIA',
      'PUNTO_VENTA',
      'PAGO_MOVIL',
      'ZELLE',
    ]),
    notes: z.string().max(500).optional(),
  }),
});

export class SaleController {
  // POST /api/sales
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const sellerId = req.user!.id;
      const sale = await SaleService.create(req.body, sellerId);
      return successResponse(res, sale, 'Venta registrada exitosamente', 201);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/sales
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        search: req.query.search as string,
        clientId: req.query.clientId as string,
        sellerId: req.query.sellerId as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 15,
      };

      const result = await SaleService.findAll(filters);
      return paginatedResponse(
        res,
        result.sales,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total
      );
    } catch (error) {
      next(error);
    }
  }

  // GET /api/sales/stats
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await SaleService.getStats();
      return successResponse(res, stats);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/sales/:id
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const sale = await SaleService.findById(req.params.id);
      return successResponse(res, sale);
    } catch (error) {
      next(error);
    }
  }
}
