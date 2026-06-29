import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SettingsService } from '../services/settings.service';
import { successResponse } from '../utils/response';
import fs from 'fs';
import path from 'path';

// Esquema de validación para actualizar configuración
const updateSettingsSchema = z.object({
  body: z.object({
    // Información de la empresa
    companyName: z.string().min(1, 'El nombre de la empresa es obligatorio').max(200, 'El nombre es muy largo').optional(),
    companyEmail: z.string().email('Email inválido').optional().nullable(),
    companyPhone: z.string().max(20, 'El teléfono es muy largo').optional().nullable(),
    companyAddress: z.string().max(500, 'La dirección es muy larga').optional().nullable(),
    companyLogo: z.string().optional().nullable(),
    
    // Configuración financiera
    currency: z.enum(['CLP', 'USD', 'EUR', 'ARS', 'MXN', 'COP', 'PEN', 'BRL'], {
      errorMap: () => ({ message: 'Moneda no válida' })
    }).optional(),
    taxRate: z.preprocess(
      (value) => (typeof value === 'string' && value !== '' ? Number(value) : value),
      z.number().min(0, 'La tasa de impuesto no puede ser negativa').max(100, 'La tasa de impuesto no puede exceder 100%')
    ).optional(),
    
    // Configuración de inventario
    lowStockThreshold: z.preprocess(
      (value) => (typeof value === 'string' && value !== '' ? Number(value) : value),
      z.number().int().min(0, 'El umbral de stock debe ser un número positivo')
    ).optional(),
    
    // Configuración de ventas
    defaultPaymentTerm: z.preprocess(
      (value) => (typeof value === 'string' && value !== '' ? Number(value) : value),
      z.number().int().min(0, 'El plazo de pago debe ser un número positivo')
    ).optional(),
    
    // Configuración de sistema
    enableNotifications: z.boolean().optional(),
    enableAutoBackup: z.boolean().optional(),
    
    // Localización
    locale: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/, 'Formato de locale inválido (ej: es-CL)').optional(),
    timezone: z.string().min(1, 'La zona horaria es obligatoria').optional(),

    // Tasa de cambio USD -> Bs
    usdToBsRate: z.preprocess(
      (value) => (typeof value === 'string' && value !== '' ? Number(value) : value),
      z.number().min(0, 'La tasa de cambio debe ser un número positivo').optional().nullable()
    ).optional(),
  })
});

export class SettingsController {
  /**
   * GET /api/settings
   * Obtener la configuración actual del sistema
   */
  static async getSettings(_req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await SettingsService.getSettings();
      return successResponse(res, settings);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/settings
   * Actualizar la configuración del sistema
   * Solo accesible por ADMIN
   */
  static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await SettingsService.updateSettings(req.body);
      return successResponse(res, settings, 'Configuración actualizada exitosamente');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/settings/reset
   * Restaurar configuración a valores por defecto
   * Solo accesible por ADMIN
   */
  static async resetToDefaults(_req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await SettingsService.resetToDefaults();
      return successResponse(res, settings, 'Configuración restaurada a valores por defecto');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/settings/export
   * Exportar todos los datos del sistema
   * Solo accesible por ADMIN
   */
  static async exportData(_req: Request, res: Response, next: NextFunction) {
    try {
      const exportData = await SettingsService.exportData();
      
      // Configurar headers para descargar como archivo JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="casavidal-backup-${new Date().toISOString().split('T')[0]}.json"`);
      
      return res.json(exportData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/settings/import
   * Importar datos al sistema desde un backup
   * Solo accesible por ADMIN
   */
  static async importData(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SettingsService.importData(req.body);
      return successResponse(res, result, 'Datos importados exitosamente');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/settings/logo
   * Subir logo de la compañía
   * Solo accesible por ADMIN
   */
  static async uploadLogo(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, error: 'No se proporcionó ningún archivo' });
      }

      const logoUrl = `/uploads/settings/${file.filename}`;
      return successResponse(res, { url: logoUrl }, 'Logo subido exitosamente');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/settings/rate
   * Obtener la tasa de cambio USD -> Bs (público, sin auth)
   */
  static async getRate(_req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await SettingsService.getSettings();
      return successResponse(res, {
        usdToBsRate: settings.usdToBsRate ? Number(settings.usdToBsRate) : null,
        usdToBsUpdatedAt: settings.usdToBsUpdatedAt,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/settings/rate/refresh
   * Consultar el API del Banco de Venezuela, obtener la tasa USD->Bs
   * y persistirla en la configuración del sistema.
   * Solo accesible por ADMIN.
   */
  static async refreshRate(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SettingsService.refreshRateFromBdv();
      return successResponse(res, result, 'Tasa actualizada desde el Banco de Venezuela');
    } catch (error) {
      next(error);
    }
  }
}

// Exportar esquemas para usar en las rutas
export const settingsSchemas = {
  updateSettings: updateSettingsSchema,
};
