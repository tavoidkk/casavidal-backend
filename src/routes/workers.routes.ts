import { Router } from 'express';
import { WorkersController } from '../controllers/workers.controller';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', WorkersController.list);
router.post('/', requireAdmin, WorkersController.create);
router.put('/:id', requireAdmin, WorkersController.update);

export default router;
