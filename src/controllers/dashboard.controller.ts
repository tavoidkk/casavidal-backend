import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { successResponse } from '../utils/response';

export class DashboardController {
  // GET /api/dashboard/stats
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await DashboardService.getStats();
      return successResponse(res, stats);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/dashboard/sales-trend
  static async getSalesTrend(req: Request, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const trend = await DashboardService.getSalesTrend(days);
      return successResponse(res, trend);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/dashboard/top-products
  static async getTopProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const products = await DashboardService.getTopProducts(limit);
      return successResponse(res, products);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/dashboard/top-clients
  static async getTopClients(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const clients = await DashboardService.getTopClients(limit);
      return successResponse(res, clients);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/dashboard/pending-activities
  static async getPendingActivities(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await DashboardService.getPendingActivities();
      return successResponse(res, data);
    } catch (error) {
      next(error);
    }
  }
}
