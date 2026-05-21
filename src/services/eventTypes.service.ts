import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export class EventTypesService {
  static async list() {
    return prisma.eventType.findMany({
      orderBy: { name: 'asc' },
    });
  }

  static async create(data: { name: string; color?: string; defaultDurationMinutes?: number }) {
    return prisma.eventType.create({
      data: {
        name: data.name,
        color: data.color || '#2563eb',
        defaultDurationMinutes: data.defaultDurationMinutes ?? 30,
      },
    });
  }

  static async update(id: string, data: { name?: string; color?: string; defaultDurationMinutes?: number; isActive?: boolean }) {
    const existing = await prisma.eventType.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'Tipo de evento no encontrado');
    }

    return prisma.eventType.update({
      where: { id },
      data,
    });
  }

  static async remove(id: string) {
    const existing = await prisma.eventType.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'Tipo de evento no encontrado');
    }
    await prisma.eventType.delete({ where: { id } });
  }
}
