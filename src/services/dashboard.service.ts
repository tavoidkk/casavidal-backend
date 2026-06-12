import { prisma } from '../config/database';

export class DashboardService {
  static async getStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      salesToday,
      salesMonth,
      totalClients,
      lowStockCount,
      pendingOrders,
    ] = await Promise.all([
      prisma.sale.aggregate({
        _sum: { total: true },
        _count: true,
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.sale.aggregate({
        _sum: { total: true },
        _count: true,
        where: { createdAt: { gte: monthStart } },
      }),
      prisma.client.count({ where: { isActive: true } }),
      prisma.product.count({
        where: {
          isActive: true,
          currentStock: { lte: prisma.product.fields.minStock },
        },
      }),
      prisma.specialOrder.count({
        where: {
          status: { in: ['PENDIENTE', 'ORDEN_GENERADA', 'EN_TRANSITO', 'RECIBIDO'] },
        },
      }),
    ]);

    return {
      salesToday: {
        total: Number(salesToday._sum.total || 0),
        count: salesToday._count,
      },
      salesMonth: {
        total: Number(salesMonth._sum.total || 0),
        count: salesMonth._count,
      },
      totalClients,
      lowStockCount,
      pendingOrders,
    };
  }

  // Ventas de los últimos N días (para gráfica)
  static async getSalesTrend(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'asc' },
    });

    // Agrupar por día
    const byDay: Record<string, { date: string; total: number; count: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      byDay[key] = { date: key, total: 0, count: 0 };
    }

    for (const sale of sales) {
      const key = sale.createdAt.toISOString().slice(0, 10);
      if (byDay[key]) {
        byDay[key].total += Number(sale.total);
        byDay[key].count += 1;
      }
    }

    return Object.values(byDay);
  }

  // Top productos más vendidos
  static async getTopProducts(limit = 5) {
    const items = await prisma.saleItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, subtotal: true },
      _count: true,
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true, category: { select: { name: true } } },
    });

    return items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        productId: item.productId,
        name: product?.name || 'N/A',
        sku: product?.sku || '',
        category: product?.category?.name || '',
        totalQuantity: item._sum.quantity || 0,
        totalRevenue: Number(item._sum.subtotal || 0),
        salesCount: item._count,
      };
    });
  }

  static async getPendingActivities() {
    await prisma.activity.updateMany({
      where: {
        status: 'PENDIENTE',
        dueDate: { lt: new Date() },
      },
      data: {
        status: 'PERDIDA',
      },
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    const [pendingTasks, todayAppointments, allAppointments] = await Promise.all([
      prisma.activity.count({
        where: { status: 'PENDIENTE' },
      }),
      prisma.activity.findMany({
        where: { dueDate: { gte: todayStart, lte: todayEnd } },
        select: {
          id: true,
          subject: true,
          type: true,
          dueDate: true,
          status: true,
          client: { select: { firstName: true, lastName: true, companyName: true, clientType: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      prisma.activity.findMany({
        where: { status: { in: ['PENDIENTE', 'COMPLETADA', 'CANCELADA', 'PERDIDA'] } },
        select: {
          id: true,
          subject: true,
          type: true,
          dueDate: true,
          status: true,
          client: { select: { firstName: true, lastName: true, companyName: true, clientType: true } },
        },
        orderBy: { dueDate: 'desc' },
        take: 20,
      }),
    ]);

    return { pendingTasks, todayAppointments, allAppointments };
  }

  // Top clientes por compras totales
  static async getTopClients(limit = 5) {
    const clients = await prisma.client.findMany({
      where: { isActive: true },
      select: {
        id: true,
        clientType: true,
        firstName: true,
        lastName: true,
        companyName: true,
        totalPurchases: true,
        purchaseCount: true,
        category: true,
        loyaltyPoints: true,
      },
      orderBy: { totalPurchases: 'desc' },
      take: limit,
    });

    return clients.map((c) => ({
      ...c,
      totalPurchases: Number(c.totalPurchases),
      displayName:
        c.clientType === 'JURIDICO'
          ? c.companyName || 'Sin nombre'
          : `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Sin nombre',
    }));
  }
}
