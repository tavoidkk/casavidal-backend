import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { WorkersService } from '../services/workers.service';
import { successResponse } from '../utils/response';

const createWorkerSchema = z.object({
  body: z.object({
    email: z.string().email('Email invalido'),
    password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
    firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  }),
});

const updateWorkerSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
    isActive: z.boolean().optional(),
  }),
});

export class WorkersController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const workers = await WorkersService.listWorkers();
      return successResponse(res, workers);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = createWorkerSchema.parse(req);
      const worker = await WorkersService.createWorker(validation.body);
      return successResponse(res, worker, 'Trabajador creado', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validation = updateWorkerSchema.parse(req);
      const worker = await WorkersService.updateWorker(id, validation.body);
      return successResponse(res, worker, 'Trabajador actualizado');
    } catch (error) {
      next(error);
    }
  }
}
