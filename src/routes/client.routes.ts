import { Router } from 'express';
import {
  ClientController,
  createClientSchema,
  updateClientSchema,
} from '../controllers/client.controller';
import { authenticate } from '../middleware/authMiddleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

router.use(authenticate);

router.post('/', validate(createClientSchema), ClientController.create);
router.get('/', ClientController.getAll);
router.get('/stats', ClientController.getStats);
router.get('/vip', ClientController.getVIP);
router.get('/top-scoring', ClientController.getTopScoring);
router.get('/churn-risk', ClientController.getChurnRisk);
router.get('/:id', ClientController.getById);
router.put('/:id', validate(updateClientSchema), ClientController.update);
router.delete('/:id', ClientController.delete);
router.post('/:id/loyalty-points', ClientController.addLoyaltyPoints);

export default router;