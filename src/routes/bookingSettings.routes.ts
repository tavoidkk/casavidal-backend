import { Router } from 'express';
import { BookingSettingsController } from '../controllers/bookingSettings.controller';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', BookingSettingsController.get);
router.put('/', requireAdmin, BookingSettingsController.update);

export default router;
