import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AIService } from './ai.service';

/**
 * Cache simple en memoria para recomendaciones
 * TTL: 1 hora
 */
class RecommendationCache {
  private cache = new Map<string, { data: any; expiry: number }>();
  private ttl = 60 * 60 * 1000; // 1 hora en ms

  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  set(key: string, data: any) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.ttl,
    });
  }

  clear() {
    this.cache.clear();
  }

  clearPattern(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

const cache = new RecommendationCache();

/**
 * Reglas de categorías complementarias
 * Define qué categorías de productos suelen comprarse juntas
 */
const CATEGORY_RULES: Record<string, string[]> = {
  'Pinturas': ['Herramientas', 'Brochas', 'Rodillos'],
  'Electricidad': ['Herramientas', 'Cables'],
  'Plomería': ['Herramientas', 'Tubos'],
  'Herramientas': ['Ferretería'],
  'Ferretería': ['Herramientas'],
};

interface RecommendationItem {
  id: string;
  name: string;
  sku: string;
  salePrice: number;
  currentStock: number;
  category?: {
    name: string;
  };
  reason: string; // 'frequently_bought_together' | 'similar' | 'category_based' | 'trending'
  score: number; // 0-100
}

export class RecommendationService {
  /**
   * Obtener productos frecuentemente comprados juntos
   * Basado en el historial de ventas
   */
  static async getFrequentlyBoughtTogether(productId: string, limit = 5): Promise<RecommendationItem[]> {
    const cacheKey = `fbt:${productId}:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Query para encontrar productos que se compraron en las mismas ventas
      const result = await prisma.$queryRaw<any[]>`
        SELECT 
          p.id,
          p.name,
          p.sku,
          p."salePrice",
          p."currentStock",
          COUNT(*) as frequency
        FROM sale_items si1
        JOIN sale_items si2 ON si1."saleId" = si2."saleId"
        JOIN products p ON si2."productId" = p.id
        WHERE si1."productId" = ${productId}
          AND si2."productId" != ${productId}
          AND p."isActive" = true
          AND p."currentStock" > 0
        GROUP BY p.id, p.name, p.sku, p."salePrice", p."currentStock"
        ORDER BY frequency DESC
        LIMIT ${limit}
      `;

      const recommendations: RecommendationItem[] = result.map((item: any) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        salePrice: Number(item.salePrice),
        currentStock: item.currentStock,
        reason: 'frequently_bought_together',
        score: Math.min(100, Number(item.frequency) * 10), // Score basado en frecuencia
      }));

      cache.set(cacheKey, recommendations);
      return recommendations;
    } catch (error) {
      console.error('Error en getFrequentlyBoughtTogether:', error);
      return [];
    }
  }

  /**
   * Obtener productos similares
   * Basado en misma categoría y rango de precio similar
   */
  static async getSimilarProducts(productId: string, limit = 5): Promise<RecommendationItem[]> {
    const cacheKey = `similar:${productId}:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          categoryId: true,
          salePrice: true,
        },
      });

      if (!product) return [];

      const priceMin = Number(product.salePrice) * 0.7; // -30%
      const priceMax = Number(product.salePrice) * 1.3; // +30%

      const similar = await prisma.product.findMany({
        where: {
          categoryId: product.categoryId,
          id: { not: productId },
          isActive: true,
          currentStock: { gt: 0 },
          salePrice: {
            gte: priceMin,
            lte: priceMax,
          },
        },
        select: {
          id: true,
          name: true,
          sku: true,
          salePrice: true,
          currentStock: true,
          category: {
            select: {
              name: true,
            },
          },
        },
        take: limit,
        orderBy: {
          currentStock: 'desc', // Priorizar productos con más stock
        },
      });

      const recommendations: RecommendationItem[] = similar.map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        salePrice: Number(item.salePrice),
        currentStock: item.currentStock,
        category: item.category,
        reason: 'similar',
        score: 75, // Score fijo para productos similares
      }));

      cache.set(cacheKey, recommendations);
      return recommendations;
    } catch (error) {
      console.error('Error en getSimilarProducts:', error);
      return [];
    }
  }

  /**
   * Obtener recomendaciones basadas en categorías complementarias
   */
  static async getCategoryBasedSuggestions(productId: string, limit = 5): Promise<RecommendationItem[]> {
    const cacheKey = `category:${productId}:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          category: true,
        },
      });

      if (!product || !product.category) return [];

      // Obtener categorías complementarias según las reglas
      const complementaryCategories = CATEGORY_RULES[product.category.name] || [];
      
      if (complementaryCategories.length === 0) return [];

      // Buscar productos en categorías complementarias
      const suggestions = await prisma.product.findMany({
        where: {
          category: {
            name: { in: complementaryCategories },
          },
          isActive: true,
          currentStock: { gt: 0 },
        },
        select: {
          id: true,
          name: true,
          sku: true,
          salePrice: true,
          currentStock: true,
          category: {
            select: {
              name: true,
            },
          },
        },
        take: limit,
        orderBy: [
          { currentStock: 'desc' }, // Productos con stock
          { salePrice: 'asc' },      // Más baratos primero
        ],
      });

      const recommendations: RecommendationItem[] = suggestions.map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        salePrice: Number(item.salePrice),
        currentStock: item.currentStock,
        category: item.category,
        reason: 'category_based',
        score: 70,
      }));

      cache.set(cacheKey, recommendations);
      return recommendations;
    } catch (error) {
      console.error('Error en getCategoryBasedSuggestions:', error);
      return [];
    }
  }

  /**
   * Obtener productos trending (más vendidos recientes)
   */
  static async getTrendingProducts(limit = 10, days = 30): Promise<RecommendationItem[]> {
    const cacheKey = `trending:${limit}:${days}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const result = await prisma.$queryRaw<any[]>`
        SELECT 
          p.id,
          p.name,
          p.sku,
          p."salePrice",
          p."currentStock",
          COUNT(*) as sales_count
        FROM sale_items si
        JOIN sales s ON si."saleId" = s.id
        JOIN products p ON si."productId" = p.id
        WHERE s."createdAt" > NOW() - INTERVAL '${days} days'
          AND p."isActive" = true
          AND p."currentStock" > 0
        GROUP BY p.id, p.name, p.sku, p."salePrice", p."currentStock"
        ORDER BY sales_count DESC
        LIMIT ${limit}
      `;

      const recommendations: RecommendationItem[] = result.map((item: any) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        salePrice: Number(item.salePrice),
        currentStock: item.currentStock,
        reason: 'trending',
        score: Math.min(100, Number(item.sales_count) * 5),
      }));

      cache.set(cacheKey, recommendations);
      return recommendations;
    } catch (error) {
      console.error('Error en getTrendingProducts:', error);
      return [];
    }
  }

  /**
   * Obtener recomendaciones mejoradas con IA
   * Usa LLM para analizar y rankear productos similares con razones contextuales
   */
  static async getAIEnhancedRecommendations(productId: string, limit = 6): Promise<RecommendationItem[]> {
    const cacheKey = `ai:${productId}:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const [sqlResults, product] = await Promise.all([
        this.getRecommendationsForProduct(productId, limit * 2),
        prisma.product.findUnique({
          where: { id: productId },
          select: { name: true, description: true, category: { select: { name: true } } },
        }),
      ]);

      if (!product || sqlResults.length === 0) return sqlResults;

      const candidates = await prisma.product.findMany({
        where: {
          id: { in: sqlResults.map(r => r.id) },
          isActive: true,
        },
        select: {
          id: true, name: true, description: true, salePrice: true,
          category: { select: { name: true } },
        },
      });

      const productDesc = product.description || product.name;
      const candidatesList = candidates.map(p =>
        `- ${p.name} (${p.category?.name || 'Sin categoría'}): ${p.description || 'Sin descripción'} — $${p.salePrice}`
      ).join('\n');

      const prompt = `Eres un experto en ferretería recomendando productos complementarios o similares.

Producto actual: "${product.name}" — ${productDesc}

Productos candidatos para recomendar:
${candidatesList}

Analiza cuáles de estos productos son más relevantes para recomendar junto con "${product.name}". Para cada uno, da una razón corta y práctica (para qué sirve, por qué complementa, cuándo se usa junto).

Responde SOLO con un JSON array válido, sin markdown:
[{ "id": "id-del-producto", "reason": "razón de recomendación", "score": 85 }]

Donde score es 0-100 según qué tan relevante es la recomendación. No incluyas productos que no tengan relación útil. Máximo ${limit} productos.`;

      const response = await AIService.chat([{ role: 'user', content: prompt }], { temperature: 0.2 });

      let aiRanked: Array<{ id: string; reason: string; score: number }> = [];
      try {
        const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
        aiRanked = JSON.parse(cleaned);
      } catch { /* fallback: keep SQL results */ }

      if (aiRanked.length === 0) {
        cache.set(cacheKey, sqlResults);
        return sqlResults;
      }

      const sqlMap = new Map(sqlResults.map(r => [r.id, r]));
      const enhanced = aiRanked
        .map(ai => {
          const sql = sqlMap.get(ai.id);
          if (!sql) return null;
          return {
            ...sql,
            reason: 'ai_assisted' as const,
            score: Math.round((ai.score + sql.score) / 2),
          };
        })
        .filter((r): r is RecommendationItem & { reason: 'ai_assisted' } => r !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      if (enhanced.length === 0) {
        cache.set(cacheKey, sqlResults);
        return sqlResults;
      }

      cache.set(cacheKey, enhanced);
      return enhanced;
    } catch (error) {
      console.error('Error en getAIEnhancedRecommendations:', error);
      return this.getRecommendationsForProduct(productId, limit);
    }
  }

  /**
   * Recomendaciones personalizadas para un cliente
   * Basado en su historial de compras + IA
   */
  static async getClientRecommendations(clientId: string, limit = 10): Promise<RecommendationItem[]> {
    const cacheKey = `client:${clientId}:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: {
          firstName: true, lastName: true, companyName: true, clientType: true,
          category: true, totalPurchases: true, purchaseCount: true,
        },
      });
      if (!client) return [];

      const recentSales = await prisma.sale.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          items: {
            include: { product: { select: { name: true, category: { select: { name: true } } } } },
          },
        },
      });

      const purchasedProductIds = new Set(recentSales.flatMap(s => s.items.map(i => i.productId)));
      const purchasedContext = recentSales.flatMap(s =>
        s.items.map(i => `- ${i.product.name} (${i.product.category?.name || ''}) x${i.quantity}`)
      ).join('\n');

      const candidates = await prisma.product.findMany({
        where: {
          isActive: true,
          currentStock: { gt: 0 },
          id: { notIn: Array.from(purchasedProductIds) },
        },
        select: {
          id: true, name: true, sku: true, salePrice: true, currentStock: true,
          description: true,
          category: { select: { name: true } },
        },
        take: 30,
        orderBy: { salePrice: 'asc' },
      });

      if (candidates.length === 0) return [];

      const name = client.clientType === 'JURIDICO' ? client.companyName : `${client.firstName} ${client.lastName}`;
      const candidatesList = candidates.map(p =>
        `- ${p.name} (${p.category?.name || ''}) — $${p.salePrice} — ${p.description || ''}`
      ).join('\n');

      const prompt = `Eres un asesor de ventas de ferretería recomendando productos para un cliente específico.

Cliente: ${name}
Categoría: ${client.category}
Ha gastado: $${client.totalPurchases} en ${client.purchaseCount} compras

Productos que ya compró antes:
${purchasedContext || '(cliente nuevo, sin compras previas)'}

Catálogo disponible para recomendar:
${candidatesList}

Selecciona hasta ${limit} productos del catálogo que este cliente probablemente necesitaría, basado en:
1. Su historial de compras (productos relacionados, consumibles, complementos)
2. Su categoría (cliente frecuente, VIP, mayorista, etc.)
3. Productos que suelen comprar clientes similares

Para cada producto indica una razón personalizada.

Responde SOLO con un JSON array válido, sin markdown:
[{ "id": "id-del-producto", "reason": "razón personalizada", "score": 85 }]

Score 0-100 según relevancia para ESTE cliente específico.`;

      const response = await AIService.chat([{ role: 'user', content: prompt }], { temperature: 0.3 });

      let aiRanked: Array<{ id: string; reason: string; score: number }> = [];
      try {
        const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
        aiRanked = JSON.parse(cleaned);
      } catch { return []; }

      const productMap = new Map(candidates.map(p => [p.id, p]));
      const recommendations: RecommendationItem[] = aiRanked
        .map(ai => {
          const product = productMap.get(ai.id);
          if (!product) return null;
          return {
            id: product.id,
            name: product.name,
            sku: product.sku,
            salePrice: Number(product.salePrice),
            currentStock: product.currentStock,
            category: product.category,
            reason: 'ai_assisted' as const,
            score: Math.min(100, ai.score),
          };
        })
        .filter((r): r is RecommendationItem => r !== null)
        .slice(0, limit);

      cache.set(cacheKey, recommendations);
      return recommendations;
    } catch (error) {
      console.error('Error en getClientRecommendations:', error);
      return [];
    }
  }

  /**
   * Obtener todas las recomendaciones para un producto
   * Combina SQL + IA y retorna los mejores
   */
  static async getRecommendationsForProduct(productId: string, limit = 6): Promise<RecommendationItem[]> {
    try {
      // Ejecutar todos los algoritmos en paralelo
      const [frequentlyBought, similar, categoryBased] = await Promise.all([
        this.getFrequentlyBoughtTogether(productId, 3),
        this.getSimilarProducts(productId, 3),
        this.getCategoryBasedSuggestions(productId, 3),
      ]);

      // Combinar todas las recomendaciones
      const allRecommendations = [...frequentlyBought, ...similar, ...categoryBased];

      // Eliminar duplicados (mismo ID)
      const uniqueMap = new Map<string, RecommendationItem>();
      for (const rec of allRecommendations) {
        if (!uniqueMap.has(rec.id) || uniqueMap.get(rec.id)!.score < rec.score) {
          uniqueMap.set(rec.id, rec);
        }
      }

      // Ordenar por score y tomar los mejores
      const recommendations = Array.from(uniqueMap.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return recommendations;
    } catch (error) {
      console.error('Error en getRecommendationsForProduct:', error);
      throw new AppError(500, 'Error al obtener recomendaciones');
    }
  }

  /**
   * Obtener recomendaciones para un carrito de compras
   * Basado en los productos ya agregados
   */
  static async getRecommendationsForCart(productIds: string[], limit = 6): Promise<RecommendationItem[]> {
    try {
      if (productIds.length === 0) {
        // Si el carrito está vacío, retornar trending products
        return this.getTrendingProducts(limit);
      }

      // Obtener recomendaciones para cada producto del carrito
      const allRecommendations = await Promise.all(
        productIds.map((id) => this.getFrequentlyBoughtTogether(id, 2))
      );

      // Flatten y eliminar duplicados
      const flatRecommendations = allRecommendations.flat();
      const uniqueMap = new Map<string, RecommendationItem>();
      
      for (const rec of flatRecommendations) {
        // No recomendar productos que ya están en el carrito
        if (productIds.includes(rec.id)) continue;

        if (!uniqueMap.has(rec.id)) {
          uniqueMap.set(rec.id, rec);
        } else {
          // Si ya existe, incrementar el score
          const existing = uniqueMap.get(rec.id)!;
          existing.score = Math.min(100, existing.score + rec.score);
        }
      }

      // Ordenar por score y limitar
      return Array.from(uniqueMap.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      console.error('Error en getRecommendationsForCart:', error);
      throw new AppError(500, 'Error al obtener recomendaciones del carrito');
    }
  }

  /**
   * Limpiar cache de recomendaciones
   * Llamar cuando se actualicen productos o ventas
   */
  static clearCache() {
    cache.clear();
  }

  /**
   * Limpiar cache de un producto específico
   */
  static clearProductCache(productId: string) {
    cache.clearPattern(productId);
  }
}
