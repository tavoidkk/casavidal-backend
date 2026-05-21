import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { hashPassword } from '../utils/password';

export class WorkersService {
  static async listWorkers() {
    return prisma.user.findMany({
      where: { role: 'WORKER', isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
      },
      orderBy: { firstName: 'asc' },
    });
  }

  static async createWorker(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError(409, 'El email ya está registrado');
    }

    const hashedPassword = await hashPassword(data.password);

    return prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'WORKER',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
      },
    });
  }

  static async updateWorker(id: string, data: { firstName?: string; lastName?: string; isActive?: boolean }) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError(404, 'Trabajador no encontrado');
    }
    if (user.role !== 'WORKER') {
      throw new AppError(400, 'El usuario no es un trabajador');
    }

    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
      },
    });
  }
}
