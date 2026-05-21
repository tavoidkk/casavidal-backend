import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export class CalendarEventsService {
  static async list(filters: {
    startDate?: Date;
    endDate?: Date;
    assignedToId?: string;
    clientId?: string;
    eventTypeId?: string;
  }) {
    const where: any = {};
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.eventTypeId) where.eventTypeId = filters.eventTypeId;
    if (filters.startDate && filters.endDate) {
      where.AND = [
        { startDate: { lte: filters.endDate } },
        { endDate: { gte: filters.startDate } },
      ];
    } else if (filters.startDate) {
      where.endDate = { gte: filters.startDate };
    } else if (filters.endDate) {
      where.startDate = { lte: filters.endDate };
    }

    return prisma.calendarEvent.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            clientType: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        eventType: true,
      },
      orderBy: { startDate: 'asc' },
    });
  }

  static async create(data: {
    title: string;
    description?: string;
    category: 'TAREA' | 'AGENDA';
    status?: 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA';
    source?: 'LOCAL' | 'GOOGLE';
    startDate: Date;
    endDate: Date;
    allDay?: boolean;
    clientId?: string;
    assignedToId: string;
    eventTypeId?: string;
    location?: string;
    googleEventId?: string;
  }) {
    return prisma.calendarEvent.create({
      data,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            clientType: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        eventType: true,
      },
    });
  }

  static async update(id: string, data: {
    title?: string;
    description?: string;
    category?: 'TAREA' | 'AGENDA';
    status?: 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA';
    startDate?: Date;
    endDate?: Date;
    allDay?: boolean;
    clientId?: string | null;
    assignedToId?: string;
    eventTypeId?: string | null;
    location?: string | null;
  }) {
    const existing = await prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'Evento no encontrado');
    }

    return prisma.calendarEvent.update({
      where: { id },
      data,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            clientType: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        eventType: true,
      },
    });
  }

  static async remove(id: string) {
    const existing = await prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'Evento no encontrado');
    }
    await prisma.calendarEvent.delete({ where: { id } });
  }
}
