import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SupplierService } from '../services/supplier.service';
import { successResponse, paginatedResponse } from '../utils/response';

export const createSupplierSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(200),
    rif: z.string().max(20).optional(),
    contactName: z.string().max(100).optional(),
    phone: z.string().max(30).optional(),
    email: z.string().email().optional(),
    address: z.string().max(300).optional(),
    notes: z.string().max(500).optional(),
  }),
});

export const updateSupplierSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(200).optional(),
    rif: z.string().max(20).optional(),
    contactName: z.string().max(100).optional(),
    phone: z.string().max(30).optional(),
    email: z.string().email().optional(),
    address: z.string().max(300).optional(),
    notes: z.string().max(500).optional(),
  }),
});

export class SupplierController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, page: qPage, limit: qLimit } = req.query;
      const result = await SupplierService.findAll({
        search: search as string,
        page: qPage ? Number(qPage) : undefined,
        limit: qLimit ? Number(qLimit) : undefined,
      });
      const { page, limit, total } = result.pagination;
      paginatedResponse(res, result.suppliers, page, limit, total);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await SupplierService.findById(req.params.id);
      successResponse(res, supplier);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await SupplierService.create(req.body);
      successResponse(res, supplier, 'Proveedor creado exitosamente', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await SupplierService.update(req.params.id, req.body);
      successResponse(res, supplier, 'Proveedor actualizado exitosamente');
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await SupplierService.remove(req.params.id);
      successResponse(res, null, 'Proveedor eliminado exitosamente');
    } catch (err) {
      next(err);
    }
  }
}
