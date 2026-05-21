import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { successResponse } from '../utils/response';

export class NotificationController {
  // GET /api/notifications
  static async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 20;
      const page = parseInt(req.query.page as string) || 1;
      const type = req.query.type as string;
      const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;

      if (page > 1 || type || isRead !== undefined) {
        const result = await NotificationService.getAllNotifications(userId, page, limit, { type, isRead });
        return successResponse(res, result);
      }

      const notifications = await NotificationService.getNotificationsByUser(userId, limit);
      return successResponse(res, { data: notifications, total: notifications.length, page: 1, limit, totalPages: 1 });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/notifications/unread-count
  static async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
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
      const userId = req.user!.id;

      await NotificationService.markAsRead(id, userId);
      return successResponse(res, { message: 'Notificación marcada como leída' });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/notifications/read-all
  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
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
      const userId = req.user!.id;

      await NotificationService.deleteNotification(id, userId);
      return successResponse(res, { message: 'Notificación eliminada' });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/notifications/read
  static async deleteAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const result = await NotificationService.deleteAllRead(userId);
      return successResponse(res, {
        message: `${result.count} notificaciones eliminadas`,
      });
    } catch (error) {
      next(error);
    }
  }
}
