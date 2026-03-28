import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { successResponse } from '../utils/response';

export class NotificationController {
  // GET /api/notifications
  static async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const limit = parseInt(req.query.limit as string) || 20;

      const notifications = await NotificationService.getNotificationsByUser(userId, limit);
      return successResponse(res, notifications);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/notifications/unread-count
  static async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const count = await NotificationService.getUnreadCount(userId);
      return successResponse(res, { count });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/notifications/:id/read
  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      await NotificationService.markAsRead(id, userId);
      return successResponse(res, { message: 'Notificación marcada como leída' });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/notifications/read-all
  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const result = await NotificationService.markAllAsRead(userId);
      return successResponse(res, {
        message: `${result.count} notificaciones marcadas como leídas`,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/notifications/:id
  static async deleteNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      await NotificationService.deleteNotification(id, userId);
      return successResponse(res, { message: 'Notificación eliminada' });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/notifications/read
  static async deleteAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const result = await NotificationService.deleteAllRead(userId);
      return successResponse(res, {
        message: `${result.count} notificaciones eliminadas`,
      });
    } catch (error) {
      next(error);
    }
  }
}
