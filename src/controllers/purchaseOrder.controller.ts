import { Request, Response, NextFunction } from 'express';
import { PurchaseOrderService } from '../services/purchaseOrder.service';
import { successResponse, paginatedResponse } from '../utils/response';
import { z } from 'zod';

const poiSchema = z.object({
  productId: z.string().uuid('Producto inválido'),
  productName: z.string().optional(),
  productSku: z.string().optional(),
  quantity: z.number().int().positive('Cantidad debe ser positiva'),
  unitPrice: z.number().min(0, 'Precio no puede ser negativo'),
});

export const createPurchaseOrderSchema = z.object({
  body: z.object({
    supplierId: z.string().uuid('Proveedor inválido'),
    expectedDate: z.string().datetime().optional(),
    notes: z.string().max(500).optional(),
    items: z.array(poiSchema).min(1, 'Debe haber al menos un item'),
  }),
});

export const updatePurchaseOrderSchema = z.object({
  body: z.object({
    expectedDate: z.string().datetime().optional(),
    notes: z.string().max(500).optional(),
    items: z.array(poiSchema).min(1).optional(),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['ENVIADA', 'CONFIRMADA', 'RECIBIDA_PARCIAL', 'RECIBIDA_COMPLETA', 'CANCELADA']),
  }),
});

export const receiveItemsSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          itemId: z.string().uuid('Item inválido'),
          quantityReceived: z.number().int().positive('Cantidad debe ser positiva'),
        })
      )
      .min(1, 'Debe haber al menos un item'),
  }),
});

export class PurchaseOrderController {
  // POST /api/purchase-orders
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const body = {
        ...req.body,
        expectedDate: req.body.expectedDate ? new Date(req.body.expectedDate) : undefined,
      };
      const order = await PurchaseOrderService.create(body, userId);
      return successResponse(res, order, 'Orden de compra creada exitosamente', 201);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/purchase-orders
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        status: req.query.status as string,
        supplierId: req.query.supplierId as string,
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 15,
      };
      const result = await PurchaseOrderService.findAll(filters);
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

  // GET /api/purchase-orders/:id
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await PurchaseOrderService.findById(req.params.id);
      return successResponse(res, order);
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/purchase-orders/:id/status
  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await PurchaseOrderService.updateStatus(req.params.id, req.body.status);
      return successResponse(res, order, 'Estado actualizado exitosamente');
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/purchase-orders/:id
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const body = {
        ...req.body,
        expectedDate: req.body.expectedDate ? new Date(req.body.expectedDate) : undefined,
      };
      const order = await PurchaseOrderService.update(req.params.id, body);
      return successResponse(res, order, 'Orden de compra actualizada exitosamente');
    } catch (error) {
      next(error);
    }
  }

  // POST /api/purchase-orders/:id/receive
  static async receiveItems(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const order = await PurchaseOrderService.receiveItems(req.params.id, req.body.items, userId);
      return successResponse(res, order, 'Items recibidos exitosamente');
    } catch (error) {
      next(error);
    }
  }
}
