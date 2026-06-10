import { prisma } from '../config/database';
import { AIService } from './ai.service';

export class SalesAssistantService {

  static async getSuggestions(cartItems: Array<{ productId: string; name: string; category: string }>, clientId?: string) {
    if (!cartItems.length) return { suggestions: [] };

    const productIds = cartItems.map(i => i.productId);

    const complementaryProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        id: { notIn: productIds },
        currentStock: { gt: 0 },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        salePrice: true,
        currentStock: true,
        category: { select: { name: true } },
      },
      take: 20,
    });

    let clientContext = '';
    if (clientId) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: {
          firstName: true, lastName: true, companyName: true, clientType: true,
          category: true, totalPurchases: true, purchaseCount: true,
        },
      });
      if (client) {
        const name = client.clientType === 'JURIDICO' ? client.companyName : `${client.firstName} ${client.lastName}`;
        clientContext = `Cliente: ${name} (${client.category}), ha gastado $${client.totalPurchases} en ${client.purchaseCount} compras.`;
      }
    }

    const productList = cartItems.map(i => `- ${i.name} (${i.category})`).join('\n');
    const catalogList = complementaryProducts.map(p => `- ${p.name} (${p.sku}) — $${p.salePrice} — Stock: ${p.currentStock} — ${p.category?.name || 'Sin categoría'}`).join('\n');

    const prompt = `Eres un asesor de ventas experto en ferretería.

Productos en el carrito del cliente:
${productList}

${clientContext}

Catálogo disponible para sugerir (solo estos productos):
${catalogList}

Sugiere máximo 3 productos complementarios del catálogo disponible que este cliente podría necesitar.
Para cada sugerencia indica:
1. El nombre exacto del producto (del catálogo)
2. Una razón corta y convincente de por qué debería llevarlo (relacionado con los productos en su carrito)
3. El precio

Responde SOLO con un JSON array válido, sin markdown ni explicaciones adicionales:
[{ "productName": "nombre exacto", "reason": "razón", "salePrice": 123.45 }]`;

    const response = await AIService.chat([{ role: 'user', content: prompt }], { temperature: 0.2 });

    try {
      const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const suggestions = JSON.parse(cleaned);
      const enriched = suggestions.map((s: any) => {
        const product = complementaryProducts.find(p => p.name === s.productName);
        return {
          ...s,
          productId: product?.id || null,
          inStock: product ? product.currentStock > 0 : false,
        };
      }).filter((s: any) => s.productId);
      return { suggestions: enriched };
    } catch {
      return { suggestions: [] };
    }
  }
}
