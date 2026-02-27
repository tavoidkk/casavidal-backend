import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

// GET /api/categories
router.get('/', CategoryController.getAll);

export default router;
