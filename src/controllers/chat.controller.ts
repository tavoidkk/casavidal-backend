import { Request, Response } from 'express';
import { ChatService } from '../services/chat.service';

export class ChatController {

  static async sendMessage(req: Request, res: Response) {
    try {
      const { conversationId, message } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'El mensaje es requerido' });
      }
      const userId = (req as any).user?.id;
      const result = await ChatService.sendMessage(conversationId || null, message, userId);
      res.json(result);
    } catch (error) {
      console.error('Error en chat:', error);
      res.status(500).json({ error: 'Error al procesar el mensaje' });
    }
  }

  static async getHistory(req: Request, res: Response) {
    try {
      const { conversationId } = req.params;
      const messages = await ChatService.getHistory(conversationId);
      res.json({ messages });
    } catch (error) {
      console.error('Error al obtener historial:', error);
      res.status(500).json({ error: 'Error al obtener historial' });
    }
  }

  static async getConversations(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const conversations = await ChatService.getConversations(userId);
      res.json({ conversations });
    } catch (error) {
      console.error('Error al obtener conversaciones:', error);
      res.status(500).json({ error: 'Error al obtener conversaciones' });
    }
  }

  static async deleteConversation(req: Request, res: Response) {
    try {
      const { conversationId } = req.params;
      await ChatService.deleteConversation(conversationId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error al eliminar conversación:', error);
      res.status(500).json({ error: 'Error al eliminar conversación' });
    }
  }
}
