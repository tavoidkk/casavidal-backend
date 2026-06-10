import { Router } from 'express';
import {
  PurchaseOrderController,
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  updateStatusSchema,
  receiveItemsSchema,
} from '../controllers/purchaseOrder.controller';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

router.use(authenticate);

// GET /api/purchase-orders
router.get('/', PurchaseOrderController.getAll);

// GET /api/purchase-orders/:id
router.get('/:id', PurchaseOrderController.getById);

// POST /api/purchase-orders
router.post(
  '/',
  requireRole('ADMIN', 'VENDEDOR'),
  validate(createPurchaseOrderSchema),
  PurchaseOrderController.create
);

// PUT /api/purchase-orders/:id
router.put(
  '/:id',
  requireRole('ADMIN', 'VENDEDOR'),
  validate(updatePurchaseOrderSchema),
  PurchaseOrderController.update
);

// PUT /api/purchase-orders/:id/status
router.put(
  '/:id/status',
  requireRole('ADMIN', 'VENDEDOR'),
  validate(updateStatusSchema),
  PurchaseOrderController.updateStatus
);

// POST /api/purchase-orders/:id/receive
router.post(
  '/:id/receive',
  requireRole('ADMIN', 'VENDEDOR'),
  validate(receiveItemsSchema),
  PurchaseOrderController.receiveItems
);

export default router;
