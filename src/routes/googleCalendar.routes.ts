import { Router } from 'express';
import { GoogleCalendarController } from '../controllers/googleCalendar.controller';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get('/callback', GoogleCalendarController.oauthCallback);

router.use(authenticate);

router.get('/status', GoogleCalendarController.status);
router.post('/connect', requireAdmin, GoogleCalendarController.connect);
router.get('/import', requireAdmin, GoogleCalendarController.importEvents);
router.delete('/disconnect', requireAdmin, GoogleCalendarController.disconnect);

export default router;
