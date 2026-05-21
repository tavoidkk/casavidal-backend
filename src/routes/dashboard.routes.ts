import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/stats', DashboardController.getStats);
router.get('/sales-trend', DashboardController.getSalesTrend);
router.get('/top-products', DashboardController.getTopProducts);
router.get('/top-clients', DashboardController.getTopClients);
router.get('/pending-activities', DashboardController.getPendingActivities);

export default router;
