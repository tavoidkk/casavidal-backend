import { Request, Response, NextFunction } from 'express';
import { ClientService } from '../services/client.service';
import { successResponse, paginatedResponse } from '../utils/response';
import { z } from 'zod';

// Schemas de validación
export const createClientSchema = z.object({
  body: z
    .object({
      // tipo de cliente
      clientType: z.enum(['NATURAL', 'JURIDICO']),

      // datos personales / empresa
      firstName: z.string().optional().nullable(),
      lastName: z.string().optional().nullable(),
      companyName: z.string().optional().nullable(), 

      // documento (como lo manda el front)
      docPrefix: z.string().optional().nullable(),
      docNumber: z.string().optional().nullable(),
      docCheck: z.string().optional().nullable(),
      document: z.string().optional().nullable(),
      rif: z.string().optional().nullable(),

      email: z.string().email().optional().nullable().or(z.literal('')),
      phone: z.string().min(7).max(20), // requerido
      address: z.string().min(5).max(200), // requerido

      city: z.string().optional().nullable(),
      state: z.string().optional().nullable(),

      category: z
        .enum(['NUEVO', 'REGULAR', 'VIP', 'MAYORISTA', 'INACTIVO'])
        .optional()
        .nullable(),

      notes: z.string().max(500).optional().nullable(),
    })
    .passthrough()
    .superRefine((data, ctx) => {
      // Validación condicional: companyName obligatorio para JURIDICO
      if (data.clientType === 'JURIDICO') {
        if (!data.companyName || data.companyName.trim().length < 2) {
          ctx.addIssue({
            path: ['companyName'],
            code: 'too_small',
            type: 'string',
            minimum: 2,
            inclusive: true,
            message: 'La razón social es obligatoria para clientes jurídicos',
          });
        }
      }

      // Validación condicional: firstName/lastName obligatorios para NATURAL
      if (data.clientType === 'NATURAL') {
        if (!data.firstName || data.firstName.trim().length < 2) {
          ctx.addIssue({
            path: ['firstName'],
            code: 'too_small',
            type: 'string',
            minimum: 2,
            inclusive: true,
            message: 'El nombre es obligatorio para persona natural',
          });
        }
        if (!data.lastName || data.lastName.trim().length < 2) {
          ctx.addIssue({
            path: ['lastName'],
            code: 'too_small',
            type: 'string',
            minimum: 2,
            inclusive: true,
            message: 'El apellido es obligatorio para persona natural',
          });
        }
      }
    }),
});


export const updateClientSchema = z.object({
  body: z.object({
    clientType: z.enum(['NATURAL', 'JURIDICO']).optional(),

    firstName: z.string().min(2).max(50).optional().nullable(),
    lastName: z.string().min(2).max(50).optional().nullable(),
    companyName: z.string().min(2).max(100).optional().nullable().or(z.literal('')),

    docPrefix: z.string().optional().nullable(),
    docNumber: z.string().optional().nullable(),
    docCheck: z.string().optional().nullable(),
    document: z.string().optional().nullable(),

    rif: z.string().optional().nullable(),

    email: z
      .string()
      .email()
      .optional()
      .nullable()
      .or(z.literal('')),

    phone: z.string().min(7).max(20).optional().nullable(),
    address: z.string().min(5).max(200).optional().nullable(),

    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),

    category: z
      .enum(['NUEVO', 'REGULAR', 'VIP', 'MAYORISTA', 'INACTIVO'])
      .optional()
      .nullable(),

    notes: z.string().max(500).optional().nullable(),
    isActive: z.boolean().optional().nullable(),
  }).passthrough(),
});

export class ClientController {
  // POST /api/clients
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      //console.log('Datos recibidos:', req.body);
      const client = await ClientService.create(req.body);
      return successResponse(
        res,
        client,
        'Cliente creado exitosamente',
        201
      );
    } catch (error) {
      //console.error('ERROR AL CREAR:', error);
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
      //console.log('Datos para actualizar:', req.body);
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
