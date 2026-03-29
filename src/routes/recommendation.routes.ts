import { Router } from 'express';
import { RecommendationController } from '../controllers/recommendation.controller';
import { authenticate, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * GET /api/recommendations/product/:productId
 * Obtener recomendaciones para un producto
 * Accesible por todos los usuarios autenticados
 */
router.get('/product/:productId', RecommendationController.getProductRecommendations);

/**
 * POST /api/recommendations/cart
 * Obtener recomendaciones para un carrito
 * Body: { productIds: string[] }
 * Accesible por todos los usuarios autenticados
 */
router.post('/cart', RecommendationController.getCartRecommendations);

/**
 * GET /api/recommendations/trending
 * Obtener productos trending
 * Query params: ?limit=10&days=30
 * Accesible por todos los usuarios autenticados
 */
router.get('/trending', RecommendationController.getTrendingProducts);

/**
 * POST /api/recommendations/clear-cache
 * Limpiar cache de recomendaciones
 * Solo ADMIN puede limpiar cache
 */
router.post('/clear-cache', requireRole('ADMIN'), RecommendationController.clearCache);

export default router;
