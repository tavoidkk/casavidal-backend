import { Request, Response, NextFunction } from 'express';
import { SpecialOrderService } from '../services/specialOrder.service';
import { successResponse, paginatedResponse } from '../utils/response';
import { z } from 'zod';

export const createSpecialOrderSchema = z.object({
  body: z.object({
    clientId: z.string().uuid('Cliente inválido'),
    productId: z.string().uuid('Producto inválido'),
    quantity: z.number().int().positive('La cantidad debe ser positiva'),
    estimatedDate: z.string().datetime().optional(),
    notes: z.string().max(500).optional(),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      'PENDIENTE',
      'ORDEN_GENERADA',
      'EN_TRANSITO',
      'RECIBIDO',
      'LISTO_CLIENTE',
      'ENTREGADO',
      'CANCELADO',
    ]),
    notes: z.string().max(500).optional(),
    estimatedDate: z.string().datetime().optional(),
  }),
});

export class SpecialOrderController {
  // POST /api/special-orders
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const body = {
        ...req.body,
        estimatedDate: req.body.estimatedDate ? new Date(req.body.estimatedDate) : undefined,
      };
      const order = await SpecialOrderService.create(body, userId);
      return successResponse(res, order, 'Pedido especial creado exitosamente', 201);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/special-orders
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        status: req.query.status as string,
        clientId: req.query.clientId as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 15,
      };
      const result = await SpecialOrderService.findAll(filters);
      return paginatedResponse(
        res,
        result.orders,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total
      );
    } catch (error) {
      next(error);
    }
  }

  // GET /api/special-orders/:id
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await SpecialOrderService.findById(req.params.id);
      return successResponse(res, order);
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/special-orders/:id/status
  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const body = {
        ...req.body,
        estimatedDate: req.body.estimatedDate ? new Date(req.body.estimatedDate) : undefined,
      };
      const order = await SpecialOrderService.updateStatus(req.params.id, body, userId);
      return successResponse(res, order, 'Estado actualizado exitosamente');
    } catch (error) {
      next(error);
    }
  }
}
