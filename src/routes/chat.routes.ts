import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.post('/message', ChatController.sendMessage);
router.get('/conversations', authenticate, ChatController.getConversations);
router.get('/:conversationId/history', authenticate, ChatController.getHistory);
router.delete('/:conversationId', authenticate, ChatController.deleteConversation);

export default router;
