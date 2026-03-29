import { Router } from 'express';
import multer from 'multer';
import { ExcelController } from '../controllers/excel.controller';
import { authenticate, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Configurar multer para manejar archivos en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
    }
  },
});

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * GET /api/excel/export/products
 * Exportar productos a Excel
 * Accesible por ADMIN y VENDEDOR
 */
router.get('/export/products', requireRole('ADMIN', 'VENDEDOR'), ExcelController.exportProducts);

/**
 * GET /api/excel/export/clients
 * Exportar clientes a Excel
 * Accesible por ADMIN y VENDEDOR
 */
router.get('/export/clients', requireRole('ADMIN', 'VENDEDOR'), ExcelController.exportClients);

/**
 * GET /api/excel/export/suppliers
 * Exportar proveedores a Excel
 * Accesible por ADMIN y VENDEDOR
 */
router.get('/export/suppliers', requireRole('ADMIN', 'VENDEDOR'), ExcelController.exportSuppliers);

/**
 * POST /api/excel/import/products
 * Importar productos desde Excel
 * Solo ADMIN puede importar
 */
router.post(
  '/import/products',
  requireRole('ADMIN'),
  upload.single('file'),
  ExcelController.importProducts
);

/**
 * POST /api/excel/import/clients
 * Importar clientes desde Excel
 * Solo ADMIN puede importar
 */
router.post(
  '/import/clients',
  requireRole('ADMIN'),
  upload.single('file'),
  ExcelController.importClients
);

/**
 * POST /api/excel/import/suppliers
 * Importar proveedores desde Excel
 * Solo ADMIN puede importar
 */
router.post(
  '/import/suppliers',
  requireRole('ADMIN'),
  upload.single('file'),
  ExcelController.importSuppliers
);

export default router;
