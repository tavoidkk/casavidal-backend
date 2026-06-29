import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { Decimal } from '@prisma/client/runtime/library';
import { env } from '../config/env';

// Tipos para Settings
export interface UpdateSettingsInput {
  // Información de la empresa
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyLogo?: string;
  
  // Configuración financiera
  currency?: string;
  taxRate?: number;
  
  // Configuración de inventario
  lowStockThreshold?: number;
  
  // Configuración de ventas
  defaultPaymentTerm?: number;
  
  // Configuración de sistema
  enableNotifications?: boolean;
  enableAutoBackup?: boolean;
  
  // Localización
  locale?: string;
  timezone?: string;

  // Tasa de cambio USD -> Bs
  usdToBsRate?: number | null;
}

export class SettingsService {
  /**
   * Obtener configuración actual del sistema
   * Si no existe, crear una con valores por defecto
   */
  static async getSettings() {
    try {
      // Intentar obtener la configuración existente
      let settings = await prisma.settings.findFirst();

      // Si no existe, crear una con valores por defecto
      if (!settings) {
        settings = await prisma.settings.create({
          data: {
            companyName: 'Casa Vidal',
            currency: 'CLP',
            taxRate: new Decimal(19.00),
            lowStockThreshold: 10,
            defaultPaymentTerm: 30,
            enableNotifications: true,
            enableAutoBackup: false,
            locale: 'es-CL',
            timezone: 'America/Santiago',
          },
        });
      }

      return settings;
    } catch (error) {
      console.error('Error al obtener configuración:', error);
      throw new AppError(500, 'Error al obtener la configuración del sistema');
    }
  }

  /**
   * Actualizar configuración del sistema
   */
  static async updateSettings(data: UpdateSettingsInput) {
    try {
      // Validaciones
      if (data.companyName !== undefined && data.companyName.trim() === '') {
        throw new AppError(400, 'El nombre de la empresa no puede estar vacío');
      }

      if (data.companyEmail && !this.isValidEmail(data.companyEmail)) {
        throw new AppError(400, 'El email de la empresa no es válido');
      }

      if (data.taxRate !== undefined && (data.taxRate < 0 || data.taxRate > 100)) {
        throw new AppError(400, 'La tasa de impuesto debe estar entre 0 y 100');
      }

      if (data.lowStockThreshold !== undefined && data.lowStockThreshold < 0) {
        throw new AppError(400, 'El umbral de stock bajo debe ser un número positivo');
      }

      if (data.defaultPaymentTerm !== undefined && data.defaultPaymentTerm < 0) {
        throw new AppError(400, 'El plazo de pago debe ser un número positivo');
      }

      if (data.usdToBsRate !== undefined && data.usdToBsRate < 0) {
        throw new AppError(400, 'La tasa de cambio debe ser un número positivo');
      }

      // Obtener configuración actual o crear si no existe
      let settings = await prisma.settings.findFirst();

      if (!settings) {
        // Si no existe, crear con los datos proporcionados
        settings = await prisma.settings.create({
          data: {
            companyName: data.companyName || 'Casa Vidal',
            companyEmail: data.companyEmail,
            companyPhone: data.companyPhone,
            companyAddress: data.companyAddress,
            companyLogo: data.companyLogo,
            currency: data.currency || 'CLP',
            taxRate: data.taxRate !== undefined ? new Decimal(data.taxRate) : new Decimal(19.00),
            lowStockThreshold: data.lowStockThreshold || 10,
            defaultPaymentTerm: data.defaultPaymentTerm || 30,
            enableNotifications: data.enableNotifications !== undefined ? data.enableNotifications : true,
            enableAutoBackup: data.enableAutoBackup !== undefined ? data.enableAutoBackup : false,
            locale: data.locale || 'es-CL',
            timezone: data.timezone || 'America/Santiago',
            usdToBsRate: data.usdToBsRate !== undefined && data.usdToBsRate !== null ? new Decimal(data.usdToBsRate) : null,
          },
        });
      } else {
        // Actualizar la configuración existente
        const updateData: any = {};

        if (data.companyName !== undefined) updateData.companyName = data.companyName;
        if (data.companyEmail !== undefined) updateData.companyEmail = data.companyEmail;
        if (data.companyPhone !== undefined) updateData.companyPhone = data.companyPhone;
        if (data.companyAddress !== undefined) updateData.companyAddress = data.companyAddress;
        if (data.companyLogo !== undefined) updateData.companyLogo = data.companyLogo;
        if (data.currency !== undefined) updateData.currency = data.currency;
        if (data.taxRate !== undefined) updateData.taxRate = new Decimal(data.taxRate);
        if (data.lowStockThreshold !== undefined) updateData.lowStockThreshold = data.lowStockThreshold;
        if (data.defaultPaymentTerm !== undefined) updateData.defaultPaymentTerm = data.defaultPaymentTerm;
        if (data.enableNotifications !== undefined) updateData.enableNotifications = data.enableNotifications;
        if (data.enableAutoBackup !== undefined) updateData.enableAutoBackup = data.enableAutoBackup;
        if (data.locale !== undefined) updateData.locale = data.locale;
        if (data.timezone !== undefined) updateData.timezone = data.timezone;
        if (data.usdToBsRate !== undefined) {
          updateData.usdToBsRate = data.usdToBsRate !== null ? new Decimal(data.usdToBsRate) : null;
          updateData.usdToBsUpdatedAt = data.usdToBsRate !== null ? new Date() : null;
        }

        settings = await prisma.settings.update({
          where: { id: settings.id },
          data: updateData,
        });
      }

      return settings;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error al actualizar configuración:', error);
      throw new AppError(500, 'Error al actualizar la configuración del sistema');
    }
  }

  /**
   * Obtener la tasa de cambio USD -> Bs desde el API del Banco de Venezuela
   * y persistirla en la configuración del sistema.
   * Endpoint: BDV_API_URL (default https://www.bancodevenezuela.com/files/tasas/tasas2.json)
   * Devuelve la tasa de la sección "mesacambio.bdv.dolares" (string con coma decimal).
   */
  static async refreshRateFromBdv() {
    try {
      const response = await fetch(env.BDV_API_URL, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(env.BDV_API_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new AppError(502, `El API del BDV respondió con estado ${response.status}`);
      }

      const data: any = await response.json();
      const rawRate = data?.mesacambio?.bdv?.dolares;

      if (typeof rawRate !== 'string' && typeof rawRate !== 'number') {
        throw new AppError(502, 'El API del BDV no devolvió la tasa en el formato esperado');
      }

      const normalized = String(rawRate).trim().replace(/\./g, '').replace(',', '.');
      const rate = Number(normalized);

      if (!Number.isFinite(rate) || rate <= 0) {
        throw new AppError(502, `Tasa inválida devuelta por el BDV: "${rawRate}"`);
      }

      const updated = await this.updateSettings({ usdToBsRate: rate });

      return {
        usdToBsRate: Number(updated.usdToBsRate),
        usdToBsUpdatedAt: updated.usdToBsUpdatedAt,
        source: 'bdv',
      };
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
        throw new AppError(504, 'Tiempo de espera agotado al consultar el API del BDV');
      }
      console.error('Error al obtener tasa del BDV:', error);
      throw new AppError(502, 'No se pudo obtener la tasa del Banco de Venezuela');
    }
  }

  /**
   * Restaurar configuración a valores por defecto
   */
  static async resetToDefaults() {
    try {
      // Obtener configuración actual
      const settings = await prisma.settings.findFirst();

      if (!settings) {
        // Si no existe, crear con valores por defecto
        return await this.getSettings();
      }

      // Actualizar con valores por defecto
      const resetSettings = await prisma.settings.update({
        where: { id: settings.id },
        data: {
          companyName: 'Casa Vidal',
          companyEmail: null,
          companyPhone: null,
          companyAddress: null,
          companyLogo: null,
          currency: 'CLP',
          taxRate: new Decimal(19.00),
          lowStockThreshold: 10,
          defaultPaymentTerm: 30,
          enableNotifications: true,
          enableAutoBackup: false,
          locale: 'es-CL',
          timezone: 'America/Santiago',
          usdToBsRate: null,
          usdToBsUpdatedAt: null,
        },
      });

      return resetSettings;
    } catch (error) {
      console.error('Error al resetear configuración:', error);
      throw new AppError(500, 'Error al restaurar la configuración por defecto');
    }
  }

  /**
   * Exportar datos del sistema
   * Genera un backup completo en formato JSON
   */
  static async exportData() {
    try {
      // Exportar cada entidad por separado para manejar errores individuales
      const exportData: any = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        data: {},
      };

      // Settings
      try {
        exportData.data.settings = await prisma.settings.findFirst();
      } catch (error) {
        console.error('Error exportando settings:', error);
        exportData.data.settings = null;
      }

      // Users (sin contraseñas)
      try {
        exportData.data.users = await prisma.user.findMany({
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            avatar: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      } catch (error) {
        console.error('Error exportando users:', error);
        exportData.data.users = [];
      }

      // Clients
      try {
        exportData.data.clients = await prisma.client.findMany();
      } catch (error) {
        console.error('Error exportando clients:', error);
        exportData.data.clients = [];
      }

      // Categories
      try {
        exportData.data.categories = await prisma.category.findMany();
      } catch (error) {
        console.error('Error exportando categories:', error);
        exportData.data.categories = [];
      }

      // Products
      try {
        exportData.data.products = await prisma.product.findMany();
      } catch (error) {
        console.error('Error exportando products:', error);
        exportData.data.products = [];
      }

      // Suppliers
      try {
        exportData.data.suppliers = await prisma.supplier.findMany();
      } catch (error) {
        console.error('Error exportando suppliers:', error);
        exportData.data.suppliers = [];
      }

      // Sales
      try {
        exportData.data.sales = await prisma.sale.findMany({
          include: {
            items: true,
          },
        });
      } catch (error) {
        console.error('Error exportando sales:', error);
        exportData.data.sales = [];
      }

      // Campaigns
      try {
        exportData.data.campaigns = await prisma.campaign.findMany({
          include: {
            segments: true,
          },
        });
      } catch (error) {
        console.error('Error exportando campaigns:', error);
        exportData.data.campaigns = [];
      }

      return exportData;
    } catch (error) {
      console.error('Error al exportar datos:', error);
      throw new AppError(500, 'Error al exportar los datos del sistema');
    }
  }

  /**
   * Importar datos al sistema
   * Restaura un backup previamente exportado
   */
  static async importData(importData: any) {
    try {
      // Validar estructura básica
      if (!importData.version || !importData.data) {
        throw new AppError(400, 'Formato de importación inválido');
      }

      const { data } = importData;
      const results: any = {
        settings: 0,
        users: 0,
        clients: 0,
        categories: 0,
        products: 0,
        suppliers: 0,
        sales: 0,
        campaigns: 0,
        errors: [],
      };

      // Importar configuración
      if (data.settings) {
        try {
          const existingSettings = await prisma.settings.findFirst();
          if (existingSettings) {
            await prisma.settings.update({
              where: { id: existingSettings.id },
              data: {
                companyName: data.settings.companyName,
                companyEmail: data.settings.companyEmail,
                companyPhone: data.settings.companyPhone,
                companyAddress: data.settings.companyAddress,
                companyLogo: data.settings.companyLogo,
                currency: data.settings.currency,
                taxRate: data.settings.taxRate,
                lowStockThreshold: data.settings.lowStockThreshold,
                defaultPaymentTerm: data.settings.defaultPaymentTerm,
                enableNotifications: data.settings.enableNotifications,
                enableAutoBackup: data.settings.enableAutoBackup,
                locale: data.settings.locale,
                timezone: data.settings.timezone,
                usdToBsRate: data.settings.usdToBsRate,
                usdToBsUpdatedAt: data.settings.usdToBsUpdatedAt,
              },
            });
          } else {
            await prisma.settings.create({ data: data.settings });
          }
          results.settings = 1;
        } catch (error: any) {
          results.errors.push(`Settings: ${error.message}`);
        }
      }

      // Importar categorías
      if (data.categories && Array.isArray(data.categories)) {
        for (const category of data.categories) {
          try {
            await prisma.category.upsert({
              where: { id: category.id },
              update: { name: category.name, icon: category.icon },
              create: category,
            });
            results.categories++;
          } catch (error: any) {
            results.errors.push(`Category ${category.name}: ${error.message}`);
          }
        }
      }

      // Importar clientes
      if (data.clients && Array.isArray(data.clients)) {
        for (const client of data.clients) {
          try {
            await prisma.client.upsert({
              where: { id: client.id },
              update: client,
              create: client,
            });
            results.clients++;
          } catch (error: any) {
            results.errors.push(`Client ${client.email || client.id}: ${error.message}`);
          }
        }
      }

      // Importar proveedores
      if (data.suppliers && Array.isArray(data.suppliers)) {
        for (const supplier of data.suppliers) {
          try {
            await prisma.supplier.upsert({
              where: { id: supplier.id },
              update: supplier,
              create: supplier,
            });
            results.suppliers++;
          } catch (error: any) {
            results.errors.push(`Supplier ${supplier.name}: ${error.message}`);
          }
        }
      }

      // Importar productos
      if (data.products && Array.isArray(data.products)) {
        for (const product of data.products) {
          try {
            await prisma.product.upsert({
              where: { id: product.id },
              update: product,
              create: product,
            });
            results.products++;
          } catch (error: any) {
            results.errors.push(`Product ${product.name}: ${error.message}`);
          }
        }
      }

      return {
        success: true,
        message: 'Importación completada',
        results,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error al importar datos:', error);
      throw new AppError(500, 'Error al importar los datos del sistema');
    }
  }

  /**
   * Validar formato de email
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
