import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authenticate, requireRole } from '../middleware/authMiddleware';
//import { validate } from '../middleware/validation.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas solo para administradores (PRIMERO - más específicas)
router.get('/admin/all', requireRole('ADMIN'), CategoryController.getAllWithInactive);
router.get('/admin/stats', requireRole('ADMIN'), CategoryController.getStats);
router.post('/', requireRole('ADMIN'), CategoryController.create);
router.put('/:id', requireRole('ADMIN'), CategoryController.update);
router.delete('/:id', requireRole('ADMIN'), CategoryController.delete);

// Rutas públicas (cualquier usuario autenticado)
router.get('/', CategoryController.getAll);
router.get('/:id', CategoryController.getById);

export default router;