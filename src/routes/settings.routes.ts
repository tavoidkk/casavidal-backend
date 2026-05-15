import { Router } from 'express';
import { SettingsController, settingsSchemas } from '../controllers/settings.controller';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import { validate } from '../middleware/validation.middleware';
import { uploadSettingsLogo } from '../middleware/upload.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * GET /api/settings
 * Obtener configuración actual del sistema
 * Accesible por todos los usuarios autenticados (necesitan ver algunos datos como currency, taxRate)
 */
router.get('/', SettingsController.getSettings);

/**
 * PUT /api/settings
 * Actualizar configuración del sistema
 * Solo ADMIN puede modificar
 */
router.put(
  '/',
  requireRole('ADMIN'),
  validate(settingsSchemas.updateSettings),
  SettingsController.updateSettings
);

/**
 * POST /api/settings/reset
 * Restaurar configuración a valores por defecto
 * Solo ADMIN puede resetear
 */
router.post(
  '/reset',
  requireRole('ADMIN'),
  SettingsController.resetToDefaults
);

/**
 * GET /api/settings/export
 * Exportar todos los datos del sistema
 * Solo ADMIN puede exportar
 */
router.get(
  '/export',
  requireRole('ADMIN'),
  SettingsController.exportData
);

/**
 * POST /api/settings/import
 * Importar datos al sistema desde un backup
 * Solo ADMIN puede importar
 */
router.post(
  '/import',
  requireRole('ADMIN'),
  SettingsController.importData
);

/**
 * POST /api/settings/logo
 * Subir logo de la compañía
 * Solo ADMIN puede subir logo
 */
router.post(
  '/logo',
  requireRole('ADMIN'),
  uploadSettingsLogo.single('logo'),
  SettingsController.uploadLogo
);

export default router;
