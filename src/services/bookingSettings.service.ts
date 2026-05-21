import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export class BookingSettingsService {
  static async getSettings() {
    let settings = await prisma.bookingSettings.findFirst();
    if (!settings) {
      settings = await prisma.bookingSettings.create({
        data: {
          workDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
          startTime: '09:00',
          endTime: '18:00',
          intervalMinutes: 30,
          timezone: 'America/Caracas',
        },
      });
    }
    return settings;
  }

  static async updateSettings(data: {
    workDays?: string[];
    startTime?: string;
    endTime?: string;
    intervalMinutes?: number;
    timezone?: string;
  }) {
    if (data.intervalMinutes !== undefined && data.intervalMinutes < 5) {
      throw new AppError(400, 'El intervalo debe ser de al menos 5 minutos');
    }

    let settings = await prisma.bookingSettings.findFirst();
    if (!settings) {
      settings = await prisma.bookingSettings.create({
        data: {
          workDays: data.workDays || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
          startTime: data.startTime || '09:00',
          endTime: data.endTime || '18:00',
          intervalMinutes: data.intervalMinutes ?? 30,
          timezone: data.timezone || 'America/Caracas',
        },
      });
      return settings;
    }

    return prisma.bookingSettings.update({
      where: { id: settings.id },
      data,
    });
  }
}
