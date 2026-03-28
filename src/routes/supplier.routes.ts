import { Router } from 'express';
import {
  SupplierController,
  createSupplierSchema,
  updateSupplierSchema,
} from '../controllers/supplier.controller';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

router.use(authenticate);

// GET /api/suppliers
router.get('/', SupplierController.getAll);

// GET /api/suppliers/:id
router.get('/:id', SupplierController.getById);

// POST /api/suppliers
router.post(
  '/',
  requireRole('ADMIN', 'VENDEDOR'),
  validate(createSupplierSchema),
  SupplierController.create
);

// PUT /api/suppliers/:id
router.put(
  '/:id',
  requireRole('ADMIN', 'VENDEDOR'),
  validate(updateSupplierSchema),
  SupplierController.update
);

// DELETE /api/suppliers/:id
router.delete('/:id', requireRole('ADMIN'), SupplierController.remove);

export default router;
