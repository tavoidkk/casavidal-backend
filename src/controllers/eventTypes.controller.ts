import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { EventTypesService } from '../services/eventTypes.service';
import { successResponse } from '../utils/response';

const createSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'El nombre es requerido'),
    color: z.string().optional(),
    defaultDurationMinutes: z.number().min(5).max(240).optional(),
  }),
});

const updateSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    color: z.string().optional(),
    defaultDurationMinutes: z.number().min(5).max(240).optional(),
    isActive: z.boolean().optional(),
  }),
});

export class EventTypesController {
  static async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const types = await EventTypesService.list();
      return successResponse(res, types);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = createSchema.parse(req);
      const type = await EventTypesService.create(validation.body);
      return successResponse(res, type, 'Tipo de evento creado', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = updateSchema.parse(req);
      const type = await EventTypesService.update(req.params.id, validation.body);
      return successResponse(res, type, 'Tipo de evento actualizado');
    } catch (error) {
      next(error);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await EventTypesService.remove(req.params.id);
      return successResponse(res, null, 'Tipo de evento eliminado');
    } catch (error) {
      next(error);
    }
  }
}
