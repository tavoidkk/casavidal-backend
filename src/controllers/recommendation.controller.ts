import { Request, Response, NextFunction } from 'express';
import { RecommendationService } from '../services/recommendation.service';
import { successResponse } from '../utils/response';

export class RecommendationController {
  /**
   * GET /api/recommendations/product/:productId
   * Obtener recomendaciones para un producto específico
   */
  static async getProductRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId } = req.params;
      const limit = parseInt(req.query.limit as string) || 6;

      const recommendations = await RecommendationService.getRecommendationsForProduct(productId, limit);

      return successResponse(res, recommendations);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/recommendations/cart
   * Obtener recomendaciones para un carrito de compras
   */
  static async getCartRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const { productIds } = req.body;
      const limit = parseInt(req.query.limit as string) || 6;

      if (!Array.isArray(productIds)) {
        return res.status(400).json({ message: 'productIds debe ser un array' });
      }

      const recommendations = await RecommendationService.getRecommendationsForCart(productIds, limit);

      return successResponse(res, recommendations);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/recommendations/trending
   * Obtener productos trending (más vendidos recientes)
   */
  static async getTrendingProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const days = parseInt(req.query.days as string) || 30;

      const trending = await RecommendationService.getTrendingProducts(limit, days);

      return successResponse(res, trending);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/recommendations/ai/:productId
   * Obtener recomendaciones mejoradas con IA
   */
  static async getAIRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId } = req.params;
      const limit = parseInt(req.query.limit as string) || 6;
      const recommendations = await RecommendationService.getAIEnhancedRecommendations(productId, limit);
      return successResponse(res, recommendations);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/recommendations/client/:clientId
   * Obtener recomendaciones personalizadas para un cliente
   */
  static async getClientRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const { clientId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const recommendations = await RecommendationService.getClientRecommendations(clientId, limit);
      return successResponse(res, recommendations);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/recommendations/clear-cache
   * Limpiar cache de recomendaciones
   * Solo ADMIN
   */
  static async clearCache(_req: Request, res: Response, next: NextFunction) {
    try {
      RecommendationService.clearCache();

      return successResponse(res, { cleared: true }, 'Cache limpiado exitosamente');
    } catch (error) {
      next(error);
    }
  }
}
