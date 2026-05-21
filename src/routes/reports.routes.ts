import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { ReportsController } from '../controllers/reports.controller';

const router = Router();

router.get('/:type', authenticate, ReportsController.getReport);

export default router;
