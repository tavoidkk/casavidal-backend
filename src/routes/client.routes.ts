import { Router } from 'express';
import { ClientController, createClientSchema, updateClientSchema } from '../controllers/client.controller';
import { validate } from '../middleware/validation.middleware';
import { authenticate, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/clients/stats - Estadísticas
router.get('/stats', ClientController.getStats);

// GET /api/clients/vip - Clientes VIP
router.get('/vip', ClientController.getVIP);

// GET /api/clients/top-scoring - Top scoring
router.get('/top-scoring', ClientController.getTopScoring);

// GET /api/clients/churn-risk - En riesgo
router.get('/churn-risk', ClientController.getChurnRisk);

// GET /api/clients - Listar todos
router.get('/', ClientController.getAll);

// GET /api/clients/:id - Obtener uno
router.get('/:id', ClientController.getById);

// POST /api/clients - Crear (solo admin y vendedor)
router.post(
  '/',
  requireRole('ADMIN', 'VENDEDOR'),
  validate(createClientSchema),
  ClientController.create
);

// PUT /api/clients/:id - Actualizar (solo admin y vendedor)
router.put(
  '/:id',
  requireRole('ADMIN', 'VENDEDOR'),
  validate(updateClientSchema),
  ClientController.update
);

// DELETE /api/clients/:id - Eliminar (solo admin)
router.delete(
  '/:id',
  requireRole('ADMIN'),
  ClientController.delete
);

// POST /api/clients/:id/loyalty-points - Agregar puntos
router.post(
  '/:id/loyalty-points',
  requireRole('ADMIN', 'VENDEDOR'),
  ClientController.addLoyaltyPoints
);

export default router;