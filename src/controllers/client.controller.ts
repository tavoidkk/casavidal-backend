import { Request, Response, NextFunction } from 'express';
import { ClientService } from '../services/client.service';
import { successResponse, paginatedResponse } from '../utils/response';
import { z } from 'zod';

// Schemas de validación
export const createClientSchema = z.object({
  body: z.object({
    clientType: z.enum(['NATURAL', 'JURIDICO']),
    firstName: z.string().min(2).max(50).optional(),
    lastName: z.string().min(2).max(50).optional(),
    companyName: z.string().min(2).max(100).optional(),
    rif: z.string().regex(/^[JVG]-?\d{8,9}-?\d?$/).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(10).max(20),
    address: z.string().min(5).max(200),
    city: z.string().min(2).max(50).optional(),
    state: z.string().min(2).max(50).optional(),
    category: z.enum(['NUEVO', 'REGULAR', 'VIP', 'MAYORISTA', 'INACTIVO']).optional(),
    notes: z.string().max(500).optional(),
  }),
});

export const updateClientSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).max(50).optional(),
    lastName: z.string().min(2).max(50).optional(),
    companyName: z.string().min(2).max(100).optional(),
    rif: z.string().regex(/^[JVG]-?\d{8,9}-?\d?$/).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(10).max(20).optional(),
    address: z.string().min(5).max(200).optional(),
    city: z.string().min(2).max(50).optional(),
    state: z.string().min(2).max(50).optional(),
    category: z.enum(['NUEVO', 'REGULAR', 'VIP', 'MAYORISTA', 'INACTIVO']).optional(),
    notes: z.string().max(500).optional(),
    isActive: z.boolean().optional(),
  }),
});

export class ClientController {
  // POST /api/clients
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const client = await ClientService.create(req.body);
      return successResponse(
        res,
        client,
        'Cliente creado exitosamente',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  // GET /api/clients
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        search: req.query.search as string,
        category: req.query.category as any,
        clientType: req.query.clientType as any,
         isActive: req.query.isActive !== undefined 
        ? req.query.isActive === 'true' 
        : undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };

      const result = await ClientService.findAll(filters);

      return paginatedResponse(
        res,
        result.clients,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total
      );
    } catch (error) {
      next(error);
    }
  }

  // GET /api/clients/:id
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const client = await ClientService.findById(req.params.id);
      return successResponse(res, client);
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/clients/:id
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const client = await ClientService.update(req.params.id, req.body);
      return successResponse(res, client, 'Cliente actualizado exitosamente');
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/clients/:id
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ClientService.delete(req.params.id);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/clients/vip
  static async getVIP(req: Request, res: Response, next: NextFunction) {
    try {
      const clients = await ClientService.getVIPClients();
      return successResponse(res, clients);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/clients/top-scoring
  static async getTopScoring(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const clients = await ClientService.getTopScoringClients(limit);
      return successResponse(res, clients);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/clients/churn-risk
  static async getChurnRisk(req: Request, res: Response, next: NextFunction) {
    try {
      const clients = await ClientService.getChurnRiskClients();
      return successResponse(res, clients);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/clients/stats
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await ClientService.getStats();
      return successResponse(res, stats);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/clients/:id/loyalty-points
  static async addLoyaltyPoints(req: Request, res: Response, next: NextFunction) {
    try {
      const { points } = req.body;
      const client = await ClientService.updateLoyaltyPoints(
        req.params.id,
        points
      );
      return successResponse(res, client, 'Puntos actualizados exitosamente');
    } catch (error) {
      next(error);
    }
  }
}