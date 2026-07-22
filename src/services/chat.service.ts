import { prisma } from '../config/database';
import { AIService } from './ai.service';
import { Prisma } from '@prisma/client';

const SYSTEM_PROMPT = `Eres "Asistente CasaVidal", un experto en ferretería, construcción y operaciones del sistema de gestión.

REGLAS IMPORTANTES SOBRE CONSULTAS A LA BASE DE DATOS:
- SIEMPRE que el usuario pregunte por productos, clientes, ventas, stock o cualquier dato del sistema, DEBES usar las herramientas disponibles. NO respondas con información inventada.
- Si una herramienta devuelve resultados (count > 0), USA esa información. NO digas que no encontraste datos.
- Si una herramienta devuelve count = 0, dilo honestamente pero ofrece alternativas (ej: "¿puedes darme más detalles?").

CUANDO BUSCAR PRODUCTOS:
- Si preguntan "qué bombillos tienes" o "tienes bombillas disponibles", USA la herramienta search_products con el término relevante (ej: "bombillo").
- Si preguntan por un producto específico (ej: "Bombillo LED 9W"), búscalo por nombre.
- La herramienta ya hace búsqueda case-insensitive y por palabras parciales.

CUANDO BUSCAR CLIENTES:
- Si preguntan por un cliente, USA search_clients con el nombre o apellido.
- Si preguntan "cuántas compras ha hecho María González", PRIMERO busca al cliente con search_clients, LUEGO usa get_client_info con su ID.
- La herramienta busca por nombre, apellido, email, teléfono o documento.

ESTADÍSTICAS Y REPORTES:
- Para "cuántos clientes tenemos" → get_system_stats
- Para ventas de hoy/esta semana → get_sales_stats con days=1 o 7
- Para stock bajo → get_low_stock_products

ESTILO:
- Siempre responde en español, amable y profesional
- Sé conciso pero informativo
- Cuando listes productos, incluye nombre, SKU, precio y stock
- Si encuentras datos, preséntalos de forma clara y útil`;

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
        const lowStockResult = await prisma.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(*)::int as count
          FROM "Product"
          WHERE "isActive" = true AND "currentStock" <= "minStock"
        `;
        const [clients, products, sales, pendingOrders] = await Promise.all([
          prisma.client.count({ where: { isActive: true } }),
          prisma.product.count({ where: { isActive: true } }),
          prisma.sale.count({
            where: { createdAt: { gte: new Date(Date.now() - 86400000) } },
          }),
          prisma.specialOrder.count({ where: { status: { notIn: ['ENTREGADO', 'CANCELADO'] } } }),
        ]);
        const lowStock = Number(lowStockResult[0]?.count || 0);
        return JSON.stringify({ activeClients: clients, totalProducts: products, salesToday: sales, lowStockProducts: lowStock, pendingOrders });
      }

      case 'search_clients': {
        const { query } = args;
        const normalizedQuery = query.trim();
        if (!normalizedQuery) {
          return JSON.stringify({ count: 0, clients: [], message: 'Proporciona un término de búsqueda válido' });
        }
        const searchTerms = normalizedQuery.split(/\s+/).filter(t => t.length > 0);
        const orConditions: any[] = [];
        for (const term of searchTerms) {
          orConditions.push(
            { firstName: { contains: term, mode: 'insensitive' } },
            { lastName: { contains: term, mode: 'insensitive' } },
            { companyName: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
            { phone: { contains: term, mode: 'insensitive' } },
            { document: { contains: term, mode: 'insensitive' } }
          );
        }
        const clients = await prisma.client.findMany({
          where: {
            isActive: true,
            OR: orConditions,
          },
          select: { id: true, firstName: true, lastName: true, companyName: true, clientType: true, email: true, phone: true, category: true, stage: true, document: true },
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
        const normalizedQuery = query.trim();
        if (!normalizedQuery) {
          return JSON.stringify({ count: 0, products: [], message: 'Proporciona un término de búsqueda válido' });
        }
        const searchTerms = normalizedQuery.split(/\s+/).filter(t => t.length > 0);
        const orConditions: any[] = [];
        for (const term of searchTerms) {
          orConditions.push(
            { name: { contains: term, mode: 'insensitive' } },
            { sku: { contains: term, mode: 'insensitive' } },
            { barcode: { contains: term, mode: 'insensitive' } }
          );
        }
        const products = await prisma.product.findMany({
          where: {
            isActive: true,
            OR: orConditions,
          },
          select: { id: true, name: true, sku: true, salePrice: true, currentStock: true, minStock: true, category: { select: { name: true } } },
          orderBy: { name: 'asc' },
          take: 15,
        });
        return JSON.stringify({ count: products.length, products });
      }

      case 'get_low_stock_products': {
        const { onlyOutOfStock } = args || {};
        const products = await prisma.$queryRaw<Array<any>>`
          SELECT p.id, p.name, p.sku, p."currentStock", p."minStock", c.name as "categoryName"
          FROM "Product" p
          LEFT JOIN "Category" c ON c.id = p."categoryId"
          WHERE p."isActive" = true
            ${onlyOutOfStock ? Prisma.sql`AND p."currentStock" = 0` : Prisma.sql`AND (p."currentStock" = 0 OR p."currentStock" <= p."minStock")`}
          ORDER BY p."currentStock" ASC
          LIMIT 20
        `;
        return JSON.stringify({ count: products.length, products: products.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          currentStock: p.currentStock,
          minStock: p.minStock,
          category: { name: p.categoryName },
        })) });
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
