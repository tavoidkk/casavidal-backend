import { Router } from 'express';
import {
  SpecialOrderController,
  createSpecialOrderSchema,
  updateStatusSchema,
} from '../controllers/specialOrder.controller';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

router.use(authenticate);

// GET /api/special-orders
router.get('/', SpecialOrderController.getAll);

// GET /api/special-orders/:id
router.get('/:id', SpecialOrderController.getById);

// POST /api/special-orders
router.post(
  '/',
  requireRole('ADMIN', 'VENDEDOR'),
  validate(createSpecialOrderSchema),
  SpecialOrderController.create
);

// PUT /api/special-orders/:id/status
router.put(
  '/:id/status',
  requireRole('ADMIN', 'VENDEDOR'),
  validate(updateStatusSchema),
  SpecialOrderController.updateStatus
);

export default router;
