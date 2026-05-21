import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CalendarEventsService } from '../services/calendarEvents.service';
import { BookingSettingsService } from '../services/bookingSettings.service';
import { successResponse } from '../utils/response';

const createSchema = z.object({
  body: z.object({
    title: z.string().min(2),
    category: z.enum(['TAREA', 'AGENDA']),
    status: z.enum(['PENDIENTE', 'COMPLETADA', 'CANCELADA']).optional(),
    startDate: z.string(),
    allDay: z.boolean().optional(),
    clientId: z.string().uuid(),
    eventTypeId: z.string().uuid().optional(),
  }),
});

const updateSchema = z.object({
  body: z.object({
    title: z.string().min(2).optional(),
    category: z.enum(['TAREA', 'AGENDA']).optional(),
    status: z.enum(['PENDIENTE', 'COMPLETADA', 'CANCELADA']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    allDay: z.boolean().optional(),
    clientId: z.string().uuid().nullable().optional(),
    eventTypeId: z.string().uuid().nullable().optional(),
  }),
});

export class CalendarEventsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, assignedToId, clientId, eventTypeId } = req.query;
      const events = await CalendarEventsService.list({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        assignedToId: assignedToId as string | undefined,
        clientId: clientId as string | undefined,
        eventTypeId: eventTypeId as string | undefined,
      });
      return successResponse(res, events);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = createSchema.parse(req);
      const payload = validation.body;
      const bookingSettings = await BookingSettingsService.getSettings();
      const defaultMinutes = bookingSettings.intervalMinutes || 30;
      const startDate = new Date(payload.startDate);
      const endDate = new Date(startDate.getTime() + defaultMinutes * 60 * 1000);
      const event = await CalendarEventsService.create({
        title: payload.title,
        category: payload.category,
        status: payload.status,
        startDate,
        endDate,
        allDay: payload.allDay,
        clientId: payload.clientId,
        assignedToId: req.user!.id,
        eventTypeId: payload.eventTypeId,
      });
      return successResponse(res, event, 'Evento creado', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = updateSchema.parse(req);
      const payload = validation.body;
      const event = await CalendarEventsService.update(req.params.id, {
        title: payload.title,
        category: payload.category,
        status: payload.status,
        startDate: payload.startDate ? new Date(payload.startDate) : undefined,
        endDate: payload.endDate ? new Date(payload.endDate) : undefined,
        allDay: payload.allDay,
        clientId: payload.clientId,
        eventTypeId: payload.eventTypeId,
      });
      return successResponse(res, event, 'Evento actualizado');
    } catch (error) {
      next(error);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await CalendarEventsService.remove(req.params.id);
      return successResponse(res, null, 'Evento eliminado');
    } catch (error) {
      next(error);
    }
  }
}
