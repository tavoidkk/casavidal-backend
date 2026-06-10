import { prisma } from '../config/database';
import { AIService } from './ai.service';

const SYSTEM_PROMPT = `Eres "Asistente CasaVidal", un experto en ferretería, construcción y operaciones del sistema de gestión.

PUEDES consultar datos reales del sistema usando las herramientas disponibles. Cuando un usuario pregunte por:
- Cantidad de clientes, productos, ventas → usa las herramientas stats
- Información de un cliente específico → usa search_clients o get_client_info
- Productos, stock, precios → usa search_products
- Ventas, ingresos → usa get_sales_stats
- Pedidos pendientes → usa get_pending_orders
- Actividades de un cliente → usa get_client_activities
- Productos con stock bajo → usa get_low_stock

Importante:
- Siempre responde en español, amable y profesional
- Si no encuentras datos con las herramientas, dilo honestamente
- Para crear o modificar datos, confirma siempre con el usuario antes
- No inventes información que no puedas verificar con las herramientas`;

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_system_stats',
      description: 'Obtener estadísticas generales del sistema: total de clientes, productos, ventas hoy, pedidos pendientes, stock bajo',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_clients',
      description: 'Buscar clientes por nombre, email o teléfono',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Término de búsqueda (nombre, email o teléfono)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_client_info',
      description: 'Obtener información detallada de un cliente por su ID',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string', description: 'ID del cliente' },
        },
        required: ['clientId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_products',
      description: 'Buscar productos por nombre o SKU',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Término de búsqueda (nombre o SKU)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_low_stock_products',
      description: 'Obtener productos con stock bajo o agotado',
      parameters: {
        type: 'object',
        properties: {
          onlyOutOfStock: { type: 'boolean', description: 'Si es true, solo muestra productos sin stock' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_sales_stats',
      description: 'Obtener estadísticas de ventas en un rango de fechas',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'integer', description: 'Número de días hacia atrás (ej: 1 = hoy, 7 = última semana, 30 = último mes)' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_client_activities',
      description: 'Obtener el timeline de actividades de un cliente',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string', description: 'ID del cliente' },
          limit: { type: 'integer', description: 'Cantidad máxima de actividades (default 10)' },
        },
        required: ['clientId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_pending_orders',
      description: 'Obtener pedidos especiales pendientes de entrega',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];

async function executeTool(name: string, args: any): Promise<string> {
  try {
    switch (name) {
      case 'get_system_stats': {
        const [clients, products, sales, lowStock, pendingOrders] = await Promise.all([
          prisma.client.count({ where: { isActive: true } }),
          prisma.product.count({ where: { isActive: true } }),
          prisma.sale.count({
            where: { createdAt: { gte: new Date(Date.now() - 86400000) } },
          }),
          prisma.product.count({ where: { isActive: true, currentStock: { lte: prisma.product.fields.minStock } } }),
          prisma.specialOrder.count({ where: { status: { notIn: ['ENTREGADO', 'CANCELADO'] } } }),
        ]);
        return JSON.stringify({ activeClients: clients, totalProducts: products, salesToday: sales, lowStockProducts: lowStock, pendingOrders });
      }

      case 'search_clients': {
        const { query } = args;
        const clients = await prisma.client.findMany({
          where: {
            isActive: true,
            OR: [
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } },
              { companyName: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
              { phone: { contains: query, mode: 'insensitive' } },
              { document: { contains: query, mode: 'insensitive' } },
            ],
          },
          select: { id: true, firstName: true, lastName: true, companyName: true, clientType: true, email: true, phone: true, category: true, stage: true },
          take: 10,
        });
        return JSON.stringify({ count: clients.length, clients });
      }

      case 'get_client_info': {
        const { clientId } = args;
        const client = await prisma.client.findUnique({
          where: { id: clientId },
          include: {
            scoring: true,
            _count: { select: { sales: true, activities: true } },
          },
        });
        if (!client) return JSON.stringify({ error: 'Cliente no encontrado' });
        return JSON.stringify({
          id: client.id,
          name: client.clientType === 'JURIDICO' ? client.companyName : `${client.firstName} ${client.lastName}`,
          email: client.email,
          phone: client.phone,
          category: client.category,
          stage: client.stage,
          totalPurchases: client.totalPurchases,
          purchaseCount: client.purchaseCount,
          scoring: client.scoring ? { score: client.scoring.score, churnProbability: client.scoring.churnProbability } : null,
          salesCount: client._count.sales,
          activitiesCount: client._count.activities,
        });
      }

      case 'search_products': {
        const { query } = args;
        const products = await prisma.product.findMany({
          where: {
            isActive: true,
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { sku: { contains: query, mode: 'insensitive' } },
              { barcode: { contains: query, mode: 'insensitive' } },
            ],
          },
          select: { id: true, name: true, sku: true, salePrice: true, currentStock: true, minStock: true, category: { select: { name: true } } },
          take: 10,
        });
        return JSON.stringify({ count: products.length, products });
      }

      case 'get_low_stock_products': {
        const { onlyOutOfStock } = args || {};
        const where: any = { isActive: true };
        if (onlyOutOfStock) {
          where.currentStock = 0;
        } else {
          where.currentStock = { lte: prisma.product.fields.minStock };
        }
        const products = await prisma.product.findMany({
          where,
          select: { id: true, name: true, sku: true, currentStock: true, minStock: true, category: { select: { name: true } } },
          orderBy: { currentStock: 'asc' },
          take: 20,
        });
        return JSON.stringify({ count: products.length, products });
      }

      case 'get_sales_stats': {
        const { days = 1 } = args || {};
        const since = new Date(Date.now() - days * 86400000);
        const [sales, totalRevenue] = await Promise.all([
          prisma.sale.count({ where: { createdAt: { gte: since } } }),
          prisma.sale.aggregate({ where: { createdAt: { gte: since } }, _sum: { total: true } }),
        ]);
        return JSON.stringify({ days, salesCount: sales, totalRevenue: Number(totalRevenue._sum.total || 0) });
      }

      case 'get_client_activities': {
        const { clientId, limit = 10 } = args;
        const activities = await prisma.activity.findMany({
          where: { clientId },
          select: { id: true, type: true, status: true, subject: true, dueDate: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });
        return JSON.stringify({ count: activities.length, activities });
      }

      case 'get_pending_orders': {
        const orders = await prisma.specialOrder.findMany({
          where: { status: { notIn: ['ENTREGADO', 'CANCELADO'] } },
          select: { id: true, status: true, quantity: true, createdAt: true, client: { select: { firstName: true, lastName: true, companyName: true } }, product: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });
        return JSON.stringify({ count: orders.length, orders });
      }

      default:
        return JSON.stringify({ error: `Herramienta '${name}' no encontrada` });
    }
  } catch (err) {
    return JSON.stringify({ error: `Error al ejecutar ${name}: ${(err as Error).message}` });
  }
}

export class ChatService {

  static async sendMessage(conversationId: string | null, content: string, userId?: string) {
    let conversation = conversationId
      ? await prisma.chatConversation.findUnique({ where: { id: conversationId } })
      : null;

    if (!conversation) {
      conversation = await prisma.chatConversation.create({
        data: { userId: userId || null, title: content.slice(0, 80) },
      });
    }

    await prisma.chatMessage.create({
      data: { conversationId: conversation.id, role: 'USER', content },
    });

    const history = await prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 30,
    });

    const aiMessages: any[] = history.map(m => ({
      role: m.role.toLowerCase(),
      content: m.content,
    }));

    let maxTurns = 5;
    let finalContent = '';

    while (maxTurns > 0) {
      maxTurns--;
      const response = await AIService.chatWithTools(aiMessages, TOOLS, {
        systemPrompt: SYSTEM_PROMPT,
      });

      if (!response) break;
      aiMessages.push(response);

      if (!response.tool_calls || response.tool_calls.length === 0) {
        finalContent = response.content || '';
        break;
      }

      for (const toolCall of response.tool_calls) {
        if (toolCall.type !== 'function') continue;
        const { name, arguments: rawArgs } = toolCall.function;
        const args = JSON.parse(rawArgs || '{}');
        const result = await executeTool(name, args);
        aiMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        });
      }
    }

    if (!finalContent) {
      finalContent = 'Lo siento, no pude procesar tu solicitud. Intenta de nuevo.';
    }

    await prisma.chatMessage.create({
      data: { conversationId: conversation.id, role: 'ASSISTANT', content: finalContent },
    });

    return {
      conversationId: conversation.id,
      message: { role: 'assistant', content: finalContent, createdAt: new Date() },
    };
  }

  static async getHistory(conversationId: string) {
    return prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async getConversations(userId?: string) {
    const where = userId ? { userId } : {};
    return prisma.chatConversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });
  }

  static async deleteConversation(conversationId: string) {
    await prisma.chatConversation.delete({ where: { id: conversationId } });
  }
}
