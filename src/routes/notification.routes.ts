import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Obtener notificaciones del usuario autenticado
router.get('/', NotificationController.getNotifications);

// Obtener contador de no leídas
router.get('/unread-count', NotificationController.getUnreadCount);

// Marcar una como leída
router.put('/:id/read', NotificationController.markAsRead);

// Marcar todas como leídas
router.put('/read-all', NotificationController.markAllAsRead);

// Eliminar una notificación
router.delete('/:id', NotificationController.deleteNotification);

// Eliminar todas las leídas
router.delete('/read', NotificationController.deleteAllRead);

export default router;
