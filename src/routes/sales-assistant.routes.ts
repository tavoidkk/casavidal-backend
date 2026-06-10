import { Router } from 'express';
import { SalesAssistantController } from '../controllers/sales-assistant.controller';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.post('/suggest', authenticate, SalesAssistantController.getSuggestions);

export default router;
