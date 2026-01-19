import { Router } from 'express';
import { 
  ProductController, 
  createProductSchema, 
  updateProductSchema,
  adjustStockSchema 
} from '../controllers/product.controller';
import { validate } from '../middleware/validation.middleware';
import { authenticate, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

// GET /api/products/stats
router.get('/stats', ProductController.getStats);

// GET /api/products/low-stock
router.get('/low-stock', ProductController.getLowStock);

// GET /api/products/out-of-stock
router.get('/out-of-stock', ProductController.getOutOfStock);

// GET /api/products/top-selling
router.get('/top-selling', ProductController.getTopSelling);

// GET /api/products/code/:code - Buscar por SKU o código de barras
router.get('/code/:code', ProductController.getByCode);

// GET /api/products/category/:categoryId
router.get('/category/:categoryId', ProductController.getByCategory);

// GET /api/products/:id/variants
router.get('/:id/variants', ProductController.getVariants);

// GET /api/products - Listar todos
router.get('/', ProductController.getAll);

// GET /api/products/:id - Obtener uno
router.get('/:id', ProductController.getById);

// POST /api/products - Crear (solo admin y vendedor)
router.post(
  '/',
  requireRole('ADMIN', 'VENDEDOR'),
  validate(createProductSchema),
  ProductController.create
);

// POST /api/products/adjust-stock - Ajustar stock
router.post(
  '/adjust-stock',
  requireRole('ADMIN', 'VENDEDOR'),
  validate(adjustStockSchema),
  ProductController.adjustStock
);

// PUT /api/products/:id - Actualizar (solo admin y vendedor)
router.put(
  '/:id',
  requireRole('ADMIN', 'VENDEDOR'),
  validate(updateProductSchema),
  ProductController.update
);

// DELETE /api/products/:id - Eliminar (solo admin)
router.delete(
  '/:id',
  requireRole('ADMIN'),
  ProductController.delete
);

export default router;