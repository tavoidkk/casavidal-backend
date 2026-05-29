import { prisma } from '../config/database';
import { ActivityType } from '@prisma/client';

export class ActivityService {
  // Crear actividad
  static async createActivity(data: {
    clientId: string;
    assignedToId: string;
    type: ActivityType;
    subject: string;
    description?: string;
    dueDate?: Date;
  }) {
    return await prisma.activity.create({
      data: {
        clientId: data.clientId,
        assignedToId: data.assignedToId,
        type: data.type,
        subject: data.subject,
        description: data.description,
        dueDate: data.dueDate,
      },
      include: {
        assignedTo: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        client: {
          select: {
            firstName: true,
            lastName: true,
            companyName: true,
            clientType: true,
          },
        },
      },
    });
  }

  // Obtener actividades de un cliente (Timeline)
  static async getActivitiesByClient(clientId: string) {
    await this.markOverdueAsLost();
    return await prisma.activity.findMany({
      where: { clientId },
      include: {
        assignedTo: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Obtener actividades de un usuario
  static async getActivitiesByUser(assignedToId: string, limit = 50) {
    await this.markOverdueAsLost();
    return await prisma.activity.findMany({
      where: { assignedToId },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            companyName: true,
            clientType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // Obtener todas las actividades con filtros
  static async getAllActivities(filters?: {
    type?: ActivityType;
    clientId?: string;
    assignedToId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    await this.markOverdueAsLost();
    const where: any = {};

    if (filters?.type) where.type = filters.type;
    if (filters?.clientId) where.clientId = filters.clientId;
    if (filters?.assignedToId) where.assignedToId = filters.assignedToId;
    
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    return await prisma.activity.findMany({
      where,
      include: {
        assignedTo: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        client: {
          select: {
            firstName: true,
            lastName: true,
            companyName: true,
            clientType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Obtener una actividad por ID
  static async getActivityById(id: string) {
    await this.markOverdueAsLost();
    return await prisma.activity.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        client: {
          select: {
            firstName: true,
            lastName: true,
            companyName: true,
            clientType: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }

  // Actualizar actividad
  static async updateActivity(
    id: string,
    data: {
      subject?: string;
      description?: string;
      type?: ActivityType;
      dueDate?: Date;
      status?: 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA' | 'PERDIDA';
      completedAt?: Date | null;
    }
  ) {
    return await prisma.activity.update({
      where: { id },
      data,
      include: {
        assignedTo: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        client: {
          select: {
            firstName: true,
            lastName: true,
            companyName: true,
            clientType: true,
          },
        },
      },
    });
  }

  // Marcar actividades vencidas como perdidas
  static async markOverdueAsLost(referenceDate: Date = new Date()) {
    return await prisma.activity.updateMany({
      where: {
        status: 'PENDIENTE',
        dueDate: { lt: referenceDate },
      },
      data: {
        status: 'PERDIDA',
      },
    });
  }

  // Eliminar actividad
  static async deleteActivity(id: string) {
    return await prisma.activity.delete({
      where: { id },
    });
  }

  // Auto-crear actividad al realizar una venta
  static async createSaleActivity(saleId: string, clientId: string, assignedToId: string, total: number) {
    return await this.createActivity({
      clientId,
      assignedToId,
      type: 'SEGUIMIENTO',
      subject: 'Seguimiento post-venta',
      description: `Venta ${saleId} completada por $${total.toLocaleString('es-VE', { minimumFractionDigits: 2 })}. Contactar para validar satisfacción.`,
    });
  }

  // Auto-crear actividad al crear pedido especial
  static async createSpecialOrderActivity(
    clientId: string,
    assignedToId: string,
    productName: string
  ) {
    return await this.createActivity({
      clientId,
      assignedToId,
      type: 'SEGUIMIENTO',
      subject: 'Seguimiento de pedido especial',
      description: `Solicitud de pedido especial para: ${productName}`,
    });
  }

  // Obtener estadísticas de actividades
  static async getActivityStats(clientId?: string) {
    await this.markOverdueAsLost();
    const where = clientId ? { clientId } : {};

    const [total, byType] = await Promise.all([
      prisma.activity.count({ where }),
      prisma.activity.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count,
      })),
    };
  }
}
