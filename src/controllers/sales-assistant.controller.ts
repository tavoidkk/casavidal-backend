import { Request, Response } from 'express';
import { SalesAssistantService } from '../services/sales-assistant.service';

export class SalesAssistantController {
  static async getSuggestions(req: Request, res: Response) {
    try {
      const { cartItems, clientId } = req.body;
      if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        return res.json({ suggestions: [] });
      }
      const result = await SalesAssistantService.getSuggestions(cartItems, clientId);
      res.json(result);
    } catch (error) {
      console.error('Error en asistente de ventas:', error);
      res.status(500).json({ error: 'Error al generar sugerencias' });
    }
  }
}
