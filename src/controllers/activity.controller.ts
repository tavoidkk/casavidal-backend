import { Request, Response, NextFunction } from 'express';
import { ActivityService } from '../services/activity.service';
import { successResponse } from '../utils/response';
import { z } from 'zod';

// Schema de validación
const createActivitySchema = z.object({
  body: z
    .object({
      clientId: z.string().uuid('ID de cliente inválido'),
      type: z.enum(['LLAMADA', 'EMAIL', 'REUNION', 'NOTA', 'TAREA', 'SEGUIMIENTO']),
      title: z.string().min(1, 'El título es requerido').max(200).optional(),
      subject: z.string().min(1, 'El título es requerido').max(200).optional(),
      description: z.string().optional(),
      scheduledFor: z.string().optional(),
    })
    .refine((data) => Boolean(data.title || data.subject), {
      message: 'El título es requerido',
      path: ['title'],
    }),
});

const updateActivitySchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    subject: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    type: z.enum(['LLAMADA', 'EMAIL', 'REUNION', 'NOTA', 'TAREA', 'SEGUIMIENTO']).optional(),
    scheduledFor: z.string().optional(),
    status: z.enum(['PENDIENTE', 'COMPLETADA', 'CANCELADA']).optional(),
  }),
});

export class ActivityController {
  // POST /api/activities
  static async createActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = createActivitySchema.safeParse({ body: req.body });
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: validation.error.issues[0].message,
        });
      }

      const { clientId, type, title, subject, description, scheduledFor } = req.body;
      const assignedToId = req.user!.id;
      const dueDate = scheduledFor ? new Date(scheduledFor) : undefined;

      const activity = await ActivityService.createActivity({
        clientId,
        assignedToId,
        type,
        subject: subject || title,
        description,
        dueDate,
      });

      return successResponse(res, activity, 'Actividad creada exitosamente', 201);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/activities/client/:clientId
  static async getActivitiesByClient(req: Request, res: Response, next: NextFunction) {
    try {
      const { clientId } = req.params;
      const activities = await ActivityService.getActivitiesByClient(clientId);
      return successResponse(res, activities);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/activities/user (mis actividades)
  static async getMyActivities(req: Request, res: Response, next: NextFunction) {
    try {
      const assignedToId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const activities = await ActivityService.getActivitiesByUser(assignedToId, limit);
      return successResponse(res, activities);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/activities
  static async getAllActivities(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, clientId, userId, startDate, endDate } = req.query;

      const filters: any = {};
      if (type) filters.type = type;
      if (clientId) filters.clientId = clientId as string;
      if (userId) filters.assignedToId = userId as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const activities = await ActivityService.getAllActivities(filters);
      return successResponse(res, activities);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/activities/:id
  static async getActivityById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const activity = await ActivityService.getActivityById(id);

      if (!activity) {
        return res.status(404).json({
          success: false,
          error: 'Actividad no encontrada',
        });
      }

      return successResponse(res, activity);
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/activities/:id
  static async updateActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = updateActivitySchema.safeParse({ body: req.body });
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: validation.error.issues[0].message,
        });
      }

      const { id } = req.params;
      const { title, subject, description, type, scheduledFor, status } = req.body;
      const dueDate = scheduledFor ? new Date(scheduledFor) : undefined;
      const completedAt = status === 'COMPLETADA' ? new Date() : undefined;

      const activity = await ActivityService.updateActivity(id, {
        subject: subject || title,
        description,
        type,
        dueDate,
        status,
        completedAt,
      });

      return successResponse(res, activity, 'Actividad actualizada exitosamente');
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/activities/:id
  static async deleteActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await ActivityService.deleteActivity(id);
      return successResponse(res, null, 'Actividad eliminada exitosamente');
    } catch (error) {
      next(error);
    }
  }

  // GET /api/activities/stats
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { clientId } = req.query;
      const stats = await ActivityService.getActivityStats(clientId as string);
      return successResponse(res, stats);
    } catch (error) {
      next(error);
    }
  }
}
