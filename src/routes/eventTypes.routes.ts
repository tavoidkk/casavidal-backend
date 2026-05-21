import { Router } from 'express';
import { EventTypesController } from '../controllers/eventTypes.controller';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', EventTypesController.list);
router.post('/', requireAdmin, EventTypesController.create);
router.put('/:id', requireAdmin, EventTypesController.update);
router.delete('/:id', requireAdmin, EventTypesController.remove);

export default router;
