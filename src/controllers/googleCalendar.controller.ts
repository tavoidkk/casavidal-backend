import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { GoogleCalendarService } from '../services/googleCalendar.service';
import { env } from '../config/env';
import { successResponse } from '../utils/response';

const oauthCallbackSchema = z.object({
  query: z.object({
    code: z.string().min(1),
    state: z.string().min(1),
  }),
});

const importSchema = z.object({
  query: z.object({
    calendarId: z.string().optional(),
    timeMin: z.string().optional(),
    timeMax: z.string().optional(),
  }),
});

export class GoogleCalendarController {
  static async connect(req: Request, res: Response, next: NextFunction) {
    try {
      const url = GoogleCalendarService.getAuthUrl(req.user!.id);
      return successResponse(res, { url }, 'URL generada');
    } catch (error) {
      next(error);
    }
  }

  static async disconnect(req: Request, res: Response, next: NextFunction) {
    try {
      await GoogleCalendarService.disconnect(req.user!.id);
      return successResponse(res, null, 'Conexion eliminada');
    } catch (error) {
      next(error);
    }
  }

  static async status(req: Request, res: Response, next: NextFunction) {
    try {
      const token = await GoogleCalendarService.getToken(req.user!.id);
      return successResponse(res, { connected: Boolean(token) });
    } catch (error) {
      next(error);
    }
  }

  static async oauthCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = oauthCallbackSchema.parse(req);
      const { code, state } = validation.query;
      const { userId } = GoogleCalendarService.verifyStateToken(state);
      const token = await GoogleCalendarService.exchangeCodeForToken(code);
      const expiryDate = token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null;

      await GoogleCalendarService.storeToken(userId, {
        accessToken: token.access_token,
        refreshToken: token.refresh_token || '',
        scope: token.scope,
        tokenType: token.token_type,
        expiryDate,
        calendarId: null,
      });

      return res.redirect(`${env.FRONTEND_URL || 'http://localhost:5173'}/calendar?google=connected`);
    } catch (error) {
      next(error);
    }
  }

  static async importEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = importSchema.parse(req);
      const { calendarId, timeMin, timeMax } = validation.query;
      const result = await GoogleCalendarService.importFromGoogle(req.user!.id, { calendarId, timeMin, timeMax });
      return successResponse(res, result, 'Eventos importados');
    } catch (error) {
      next(error);
    }
  }
}
