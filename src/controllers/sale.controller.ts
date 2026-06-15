import { Request, Response, NextFunction } from 'express';
import { SaleService } from '../services/sale.service';
import { successResponse, paginatedResponse } from '../utils/response';
import { parseOptionalDate, parsePositiveInt } from '../utils/query';
import { z } from 'zod';

const paymentSplitSchema = z.object({
  paymentMethod: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'PUNTO_VENTA', 'PAGO_MOVIL', 'ZELLE']),
  currency: z.enum(['USD', 'BS']),
  amount: z.number().positive('El monto debe ser positivo'),
  reference: z.string().max(100).optional(),
});

export const createSaleSchema = z.object({
  body: z.object({
    clientId: z.string().uuid('Cliente inválido'),
    items: z
      .array(
        z.object({
          productId: z.string().uuid('Producto inválido'),
          quantity: z.number().int().positive('La cantidad debe ser positiva'),
          unitPrice: z.number().min(0).optional(),
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
    ]).optional(),
    payments: z.array(paymentSplitSchema).min(1).optional(),
    notes: z.string().max(500).optional(),
    additionalCharges: z.number().min(0).optional(),
    currency: z.enum(['USD', 'BS']).optional(),
    paymentReference: z.string().max(100).optional(),
    pointsRedeemed: z.number().int().min(0).optional(),
  }).refine(
    (data) => data.paymentMethod || data.payments,
    { message: 'Debe especificar un método de pago o una lista de pagos', path: ['paymentMethod'] }
  ),
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
        dateFrom: parseOptionalDate(req.query.dateFrom),
        dateTo: parseOptionalDate(req.query.dateTo),
        page: parsePositiveInt(req.query.page, 1, { max: 10000 }),
        limit: parsePositiveInt(req.query.limit, 15, { max: 100 }),
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
