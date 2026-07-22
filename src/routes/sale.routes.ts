import { Router } from 'express';
import { SaleController, createSaleSchema } from '../controllers/sale.controller';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

router.use(authenticate);

// GET /api/sales/stats  (antes del /:id para no conflicto)
router.get('/stats', SaleController.getStats);

// GET /api/sales
router.get('/', SaleController.getAll);

// GET /api/sales/:id
router.get('/:id', SaleController.getById);

// GET /api/sales/:id/invoice
router.get('/:id/invoice', SaleController.downloadInvoice);

// POST /api/sales
router.post(
  '/',
  requireRole('ADMIN', 'VENDEDOR'),
  validate(createSaleSchema),
  SaleController.create
);

export default router;
