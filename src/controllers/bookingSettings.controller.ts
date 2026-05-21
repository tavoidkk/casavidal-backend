import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BookingSettingsService } from '../services/bookingSettings.service';
import { successResponse } from '../utils/response';

const updateSchema = z.object({
  body: z.object({
    workDays: z.array(z.string()).optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    intervalMinutes: z.number().min(5).max(120).optional(),
    timezone: z.string().optional(),
  }),
});

export class BookingSettingsController {
  static async get(_req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await BookingSettingsService.getSettings();
      return successResponse(res, settings);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = updateSchema.parse(req);
      const settings = await BookingSettingsService.updateSettings(validation.body);
      return successResponse(res, settings, 'Configuracion actualizada');
    } catch (error) {
      next(error);
    }
  }
}
