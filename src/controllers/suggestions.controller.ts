import { Request, Response, NextFunction } from 'express';
import { ClientSuggestionsService } from '../services/client-suggestions.service';
import { successResponse } from '../utils/response';

export class SuggestionsController {
  static async getSuggestions(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user!.id;
      const suggestions = await ClientSuggestionsService.getSuggestions(userId);
      successResponse(res, suggestions);
    } catch (error) {
      next(error);
    }
  }

  static async applySuggestion(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user!.id;
      const { id } = req.params;
      const activity = await ClientSuggestionsService.applySuggestion(userId, id);
      successResponse(res, activity, 'Actividad creada desde sugerencia');
    } catch (error) {
      next(error);
    }
  }

  static async dismissSuggestion(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user!.id;
      const { id } = req.params;
      await ClientSuggestionsService.dismissSuggestion(userId, id);
      successResponse(res, null, 'Sugerencia descartada');
    } catch (error) {
      next(error);
    }
  }

  static async getSuggestionCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user!.id;
      const count = await ClientSuggestionsService.getSuggestionCount(userId);
      successResponse(res, { count });
    } catch (error) {
      next(error);
    }
  }
}
