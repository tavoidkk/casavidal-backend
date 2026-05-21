import { Router } from 'express';
import { CalendarEventsController } from '../controllers/calendarEvents.controller';
import { authenticate, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', CalendarEventsController.list);
router.post('/', requireRole('ADMIN', 'WORKER'), CalendarEventsController.create);
router.put('/:id', requireRole('ADMIN', 'WORKER'), CalendarEventsController.update);
router.delete('/:id', requireRole('ADMIN', 'WORKER'), CalendarEventsController.remove);

export default router;
