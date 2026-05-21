import { prisma } from '../config/database';
import { NotificationType } from '@prisma/client';

export class NotificationService {
  // Crear notificación
  static async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
  }) {
    return await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
        isRead: false,
      },
    });
  }

  // Obtener notificaciones de un usuario
  static async getNotificationsByUser(userId: string, limit = 20, offset = 0) {
    return await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  static async getAllNotifications(userId: string, page = 1, limit = 20, filter?: { type?: string; isRead?: boolean }) {
    const where: any = { userId };
    if (filter?.type) where.type = filter.type;
    if (filter?.isRead !== undefined) where.isRead = filter.isRead;
    const [data, total] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: (page - 1) * limit }),
      prisma.notification.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Contar notificaciones no leídas
  static async getUnreadCount(userId: string) {
    return await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  // Marcar una notificación como leída
  static async markAsRead(notificationId: string, userId: string) {
    return await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId, // Seguridad: solo puede marcar sus propias notificaciones
      },
      data: {
        isRead: true,
      },
    });
  }

  // Marcar todas como leídas
  static async markAllAsRead(userId: string) {
    return await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  // Eliminar una notificación
  static async deleteNotification(notificationId: string, userId: string) {
    return await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId, // Seguridad: solo puede eliminar sus propias notificaciones
      },
    });
  }

  // Eliminar todas las notificaciones leídas de un usuario
  static async deleteAllRead(userId: string) {
    return await prisma.notification.deleteMany({
      where: {
        userId,
        isRead: true,
      },
    });
  }

  // Notificación para stock bajo (llamada desde inventario)
  static async notifyLowStock(productId: string, productName: string, currentStock: number) {
    // Notificar a todos los ADMIN y VENDEDOR
    const users = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'VENDEDOR'] },
      },
      select: { id: true },
    });

    const notifications = users.map((user) =>
      this.createNotification({
        userId: user.id,
        type: 'STOCK_BAJO',
        title: 'Stock Bajo',
        message: `El producto "${productName}" tiene solo ${currentStock} unidades disponibles.`,
        link: `/products?lowStock=true`,
      })
    );

    await Promise.all(notifications);
  }

  // Notificación cuando se crea un pedido especial
  static async notifySpecialOrderCreated(
    orderId: string,
    clientName: string,
    productName: string
  ) {
    const users = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'VENDEDOR'] } },
      select: { id: true },
    });

    const notifications = users.map((user) =>
      this.createNotification({
        userId: user.id,
        type: 'PEDIDO_LISTO',
        title: 'Nuevo Pedido Especial',
        message: `${clientName} ha solicitado el producto "${productName}".`,
        link: `/special-orders/${orderId}`,
      })
    );

    await Promise.all(notifications);
  }

  // Notificación cuando un pedido especial está listo
  static async notifySpecialOrderReady(
    userId: string,
    orderId: string,
    productName: string
  ) {
    return await this.createNotification({
      userId,
      type: 'PEDIDO_LISTO',
      title: 'Pedido Especial Listo',
      message: `Tu pedido del producto "${productName}" está listo para retirar.`,
      link: `/special-orders/${orderId}`,
    });
  }

  // Notificación de venta grande (opcional)
  static async notifyLargeSale(saleId: string, clientName: string, total: number) {
    const users = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    const notifications = users.map((user) =>
      this.createNotification({
        userId: user.id,
        type: 'VENTA_COMPLETADA',
        title: 'Venta Grande',
        message: `Nueva venta de $${total.toLocaleString('es-VE', { minimumFractionDigits: 2 })} a ${clientName}.`,
        link: `/sales/${saleId}`,
      })
    );

    await Promise.all(notifications);
  }
}
