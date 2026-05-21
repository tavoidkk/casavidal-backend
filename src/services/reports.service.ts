import { prisma } from '../config/database';

export class ReportsService {

  // 1. Reporte de Ventas
  static async ventas(filters: { dateFrom?: Date; dateTo?: Date; sellerId?: string; paymentMethod?: string }) {
    const where: any = {};
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }
    if (filters.sellerId) where.sellerId = filters.sellerId;
    if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;

    const sales = await prisma.sale.findMany({ where, include: { seller: { select: { firstName: true, lastName: true } }, client: { select: { firstName: true, lastName: true, companyName: true, clientType: true } } }, orderBy: { createdAt: 'desc' } });

    const totalRevenue = sales.reduce((s, v) => s + Number(v.total), 0);
    const totalDiscount = sales.reduce((s, v) => s + Number(v.discount), 0);
    const totalTax = sales.reduce((s, v) => s + Number(v.tax), 0);
    const avgTicket = sales.length ? totalRevenue / sales.length : 0;

    const byPaymentMethod: Record<string, number> = {};
    const byDay: Record<string, { count: number; total: number }> = {};
    for (const sale of sales) {
      byPaymentMethod[sale.paymentMethod] = (byPaymentMethod[sale.paymentMethod] || 0) + Number(sale.total);
      const day = sale.createdAt.toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = { count: 0, total: 0 };
      byDay[day].count++;
      byDay[day].total += Number(sale.total);
    }

    return { totalSales: sales.length, totalRevenue, totalDiscount, totalTax, avgTicket, byPaymentMethod, byDay: Object.entries(byDay).map(([date, v]) => ({ date, ...v })), sales };
  }

  // 2. Reporte de Inventario / Stock
  static async inventario(filters: { categoryId?: string; lowStockOnly?: boolean }) {
    const where: any = { isActive: true };
    if (filters.categoryId) where.categoryId = filters.categoryId;

    const products = await prisma.product.findMany({ where, include: { category: { select: { name: true } } }, orderBy: { currentStock: 'asc' } });

    const data = filters.lowStockOnly ? products.filter((p: any) => p.currentStock <= p.minStock) : products;

    const totalProducts = data.length;
    const totalStockValue = data.reduce((s, p) => s + Number(p.costPrice) * p.currentStock, 0);
    const lowStock = data.filter((p) => p.currentStock <= p.minStock);
    const outOfStock = data.filter((p) => p.currentStock === 0);

    const byCategory: Record<string, { count: number; stockValue: number }> = {};
    for (const p of data) {
      const cat = p.category?.name || 'Sin categoria';
      if (!byCategory[cat]) byCategory[cat] = { count: 0, stockValue: 0 };
      byCategory[cat].count++;
      byCategory[cat].stockValue += Number(p.costPrice) * p.currentStock;
    }

    return { totalProducts, totalStockValue, lowStockCount: lowStock.length, outOfStockCount: outOfStock.length, byCategory: Object.entries(byCategory).map(([name, v]) => ({ name, ...v })), lowStockProducts: lowStock.map((p) => ({ id: p.id, name: p.name, sku: p.sku, currentStock: p.currentStock, minStock: p.minStock, category: p.category?.name })) };
  }

  // 3. Reporte de Clientes
  static async clientes(filters: { dateFrom?: Date; dateTo?: Date; category?: string; stage?: string }) {
    const where: any = {};
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }
    if (filters.category) where.category = filters.category;
    if (filters.stage) where.stage = filters.stage;

    const clients = await prisma.client.findMany({ where, include: { scoring: true }, orderBy: { createdAt: 'desc' } });

    const totalClients = clients.length;
    const byCategory: Record<string, number> = {};
    const byStage: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    for (const c of clients) {
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;
      byStage[c.stage] = (byStage[c.stage] || 0) + 1;
      if (c.source) bySource[c.source] = (bySource[c.source] || 0) + 1;
    }

    const avgLifetimeValue = clients.length ? clients.reduce((s, c) => s + Number(c.totalPurchases), 0) / clients.length : 0;
    const highChurnClients = clients.filter((c) => c.scoring && Number(c.scoring.churnProbability) > 70).length;

    return { totalClients, avgLifetimeValue, highChurnClients, byCategory: Object.entries(byCategory).map(([name, count]) => ({ name, count })), byStage: Object.entries(byStage).map(([name, count]) => ({ name, count })), bySource: Object.entries(bySource).map(([name, count]) => ({ name, count })) };
  }

  // 4. Reporte de Actividad CRM
  static async actividades(filters: { dateFrom?: Date; dateTo?: Date; type?: string; userId?: string }) {
    const where: any = {};
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }
    if (filters.type) where.type = filters.type;
    if (filters.userId) where.assignedToId = filters.userId;

    const activities = await prisma.activity.findMany({ where, include: { assignedTo: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' } });

    const total = activities.length;
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byUser: Record<string, { count: number; completed: number }> = {};

    for (const a of activities) {
      byType[a.type] = (byType[a.type] || 0) + 1;
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
      const name = `${a.assignedTo.firstName} ${a.assignedTo.lastName}`;
      if (!byUser[name]) byUser[name] = { count: 0, completed: 0 };
      byUser[name].count++;
      if (a.status === 'COMPLETADA') byUser[name].completed++;
    }

    const overdue = activities.filter((a) => a.dueDate && a.dueDate < new Date() && a.status === 'PENDIENTE').length;

    return { total, overdue, byType: Object.entries(byType).map(([name, count]) => ({ name, count })), byStatus: Object.entries(byStatus).map(([name, count]) => ({ name, count })), byUser: Object.entries(byUser).map(([name, v]) => ({ name, ...v })) };
  }

  // 5. Top Productos mas vendidos
  static async topProductos(filters: { dateFrom?: Date; dateTo?: Date; categoryId?: string; limit?: number }) {
    const limit = filters.limit || 20;
    const whereSale: any = {};
    if (filters.dateFrom || filters.dateTo) {
      whereSale.createdAt = {};
      if (filters.dateFrom) whereSale.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) whereSale.createdAt.lte = filters.dateTo;
    }

    const items = await prisma.saleItem.findMany({
      where: { sale: whereSale, product: { ...(filters.categoryId ? { categoryId: filters.categoryId } : {}) } },
      include: { product: { select: { name: true, sku: true, salePrice: true, costPrice: true, category: { select: { name: true } } } } },
    });

    const grouped: Record<string, { name: string; sku: string; category: string; quantity: number; revenue: number; cost: number; salesCount: number }> = {};
    for (const item of items) {
      const pid = item.productId;
      if (!grouped[pid]) {
        grouped[pid] = { name: item.product.name, sku: item.product.sku, category: item.product.category?.name || '', quantity: 0, revenue: 0, cost: 0, salesCount: 0 };
      }
      grouped[pid].quantity += item.quantity;
      grouped[pid].revenue += Number(item.subtotal);
      grouped[pid].cost += Number(item.product.costPrice) * item.quantity;
      grouped[pid].salesCount++;
    }

    const sorted = Object.values(grouped).sort((a, b) => b.revenue - a.revenue).slice(0, limit);
    return { products: sorted.map((p) => ({ ...p, margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue * 100).toFixed(1) : '0' })) };
  }

  // 6. Rentabilidad
  static async rentabilidad(filters: { categoryId?: string }) {
    const where: any = { isActive: true };
    if (filters.categoryId) where.categoryId = filters.categoryId;

    const products = await prisma.product.findMany({ where, include: { category: { select: { name: true } } }, orderBy: { name: 'asc' } });

    const byCategory: Record<string, { count: number; totalCost: number; totalSale: number; totalMargin: number }> = {};
    const productList = products.map((p) => {
      const cost = Number(p.costPrice);
      const sale = Number(p.salePrice);
      const margin = sale > 0 ? (sale - cost) / sale * 100 : 0;
      const cat = p.category?.name || 'Sin categoria';
      if (!byCategory[cat]) byCategory[cat] = { count: 0, totalCost: 0, totalSale: 0, totalMargin: 0 };
      byCategory[cat].count++;
      byCategory[cat].totalCost += cost * p.currentStock;
      byCategory[cat].totalSale += sale * p.currentStock;
      byCategory[cat].totalMargin += margin;
      return { id: p.id, name: p.name, sku: p.sku, costPrice: cost, salePrice: sale, margin: Number(margin.toFixed(1)), category: cat, stock: p.currentStock };
    });

    return { products: productList, byCategory: Object.entries(byCategory).map(([name, v]) => ({ name, ...v, avgMargin: v.count ? Number((v.totalMargin / v.count).toFixed(1)) : 0 })) };
  }

  // 7. Proveedores
  static async proveedores() {
    const suppliers = await prisma.supplier.findMany({
      include: {
        _count: { select: { productSuppliers: true, purchaseOrders: true } },
        purchaseOrders: { select: { status: true, total: true, orderDate: true, expectedDate: true, receivedDate: true } },
      },
      orderBy: { name: 'asc' },
    });

    const total = suppliers.length;
    const byRating: Record<string, number> = {};
    let totalPOSpent = 0;
    let onTimePOs = 0;
    let totalPOs = 0;

    const list = suppliers.map((s) => {
      const rating = s.rating ? Number(s.rating) : null;
      if (rating !== null) {
        const key = rating >= 4 ? '4-5' : rating >= 3 ? '3-4' : '1-3';
        byRating[key] = (byRating[key] || 0) + 1;
      }
      const pos = s.purchaseOrders;
      for (const po of pos) {
        totalPOSpent += Number(po.total);
        totalPOs++;
        if (po.expectedDate && po.receivedDate && po.receivedDate <= po.expectedDate) onTimePOs++;
      }
      return { id: s.id, name: s.name, rating, email: s.email, phone: s.phone, productCount: s._count.productSuppliers, poCount: s._count.purchaseOrders, city: s.city };
    });

    return { totalSuppliers: total, totalPOSpent, onTimeRate: totalPOs ? Number((onTimePOs / totalPOs * 100).toFixed(1)) : 0, byRating: Object.entries(byRating).map(([name, count]) => ({ name, count })), suppliers: list };
  }

  // 8. Pedidos Especiales
  static async pedidosEspeciales(filters: { dateFrom?: Date; dateTo?: Date; status?: string }) {
    const where: any = {};
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }
    if (filters.status) where.status = filters.status;

    const orders = await prisma.specialOrder.findMany({ where, include: { client: { select: { firstName: true, lastName: true, companyName: true, clientType: true } }, product: { select: { name: true, sku: true } } }, orderBy: { createdAt: 'desc' } });

    const total = orders.length;
    const byStatus: Record<string, number> = {};
    let totalLifecycleDays = 0;
    let completedCount = 0;

    for (const o of orders) {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
      if (o.receivedDate && o.createdAt) {
        totalLifecycleDays += Math.ceil((o.receivedDate.getTime() - o.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        completedCount++;
      }
    }

    return { totalOrders: total, avgLifecycleDays: completedCount ? Math.round(totalLifecycleDays / completedCount) : 0, byStatus: Object.entries(byStatus).map(([name, count]) => ({ name, count })) };
  }

  // 9. Campañas
  static async campanas(filters: { dateFrom?: Date; dateTo?: Date; type?: string }) {
    const where: any = {};
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }
    if (filters.type) where.type = filters.type;

    const campaigns = await prisma.campaign.findMany({ where, orderBy: { createdAt: 'desc' } });

    const total = campaigns.length;
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalSent = 0;
    let totalOpens = 0;
    let totalClicks = 0;

    for (const c of campaigns) {
      byType[c.type] = (byType[c.type] || 0) + 1;
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      totalSent += c.sentCount;
      totalOpens += c.openCount;
      totalClicks += c.clickCount;
    }

    return { totalCampaigns: total, totalSent, totalOpens, totalClicks, avgOpenRate: totalSent ? Number((totalOpens / totalSent * 100).toFixed(1)) : 0, avgClickRate: totalSent ? Number((totalClicks / totalSent * 100).toFixed(1)) : 0, byType: Object.entries(byType).map(([name, count]) => ({ name, count })), byStatus: Object.entries(byStatus).map(([name, count]) => ({ name, count })) };
  }

  // 10. Productividad del equipo
  static async productividad(filters: { dateFrom?: Date; dateTo?: Date; userId?: string }) {
    const userWhere: any = { isActive: true };
    if (filters.userId) userWhere.id = filters.userId;

    const users = await prisma.user.findMany({ where: userWhere, select: { id: true, firstName: true, lastName: true, role: true } });
    const dateFilter: any = {};
    if (filters.dateFrom || filters.dateTo) {
      dateFilter.createdAt = {};
      if (filters.dateFrom) dateFilter.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) dateFilter.createdAt.lte = filters.dateTo;
    }

    const result = [];
    for (const user of users) {
      const activities = await prisma.activity.count({ where: { assignedToId: user.id, ...dateFilter } });
      const completedActivities = await prisma.activity.count({ where: { assignedToId: user.id, status: 'COMPLETADA', ...dateFilter } });
      const sales = await prisma.sale.count({ where: { sellerId: user.id, ...dateFilter } });
      const salesTotal = await prisma.sale.aggregate({ where: { sellerId: user.id, ...dateFilter }, _sum: { total: true } });
      const events = await prisma.calendarEvent.count({ where: { assignedToId: user.id, ...dateFilter } });

      result.push({ id: user.id, name: `${user.firstName} ${user.lastName}`, role: user.role, activities, completedActivities, completionRate: activities ? Number((completedActivities / activities * 100).toFixed(1)) : 0, sales, salesTotal: Number(salesTotal._sum.total || 0), events });
    }

    return { users: result };
  }

  // 11. Dashboard Ejecutivo
  static async dashboardEjecutivo(filters: { dateFrom?: Date; dateTo?: Date }) {
    const dateFilter: any = {};
    if (filters.dateFrom || filters.dateTo) {
      dateFilter.createdAt = {};
      if (filters.dateFrom) dateFilter.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) dateFilter.createdAt.lte = filters.dateTo;
    }

    const salesAgg = await prisma.sale.aggregate({ where: dateFilter, _sum: { total: true }, _count: true });
    const salesCount = salesAgg._count;
    const salesTotal = Number(salesAgg._sum.total || 0);

    const activeClients = await prisma.client.count({ where: { isActive: true } });
    const newClients = filters.dateFrom || filters.dateTo ? await prisma.client.count({ where: dateFilter }) : await prisma.client.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } });
    const allProducts = await prisma.product.findMany({ where: { isActive: true }, select: { currentStock: true, minStock: true } });
    const lowStock = allProducts.filter((p) => p.currentStock <= p.minStock).length;
    const pendingOrders = await prisma.specialOrder.count({ where: { status: { notIn: ['ENTREGADO', 'CANCELADO'] } } });
    const pendingActivities = await prisma.activity.count({ where: { status: 'PENDIENTE' } });
    const overdueActs = await prisma.activity.count({ where: { status: 'PENDIENTE', dueDate: { lte: new Date() } } });

    const byPaymentMethod = await prisma.sale.groupBy({ by: ['paymentMethod'], where: dateFilter, _sum: { total: true } });

    return { salesTotal, salesCount, avgTicket: salesCount ? salesTotal / salesCount : 0, activeClients, newClients, lowStock, pendingOrders, pendingActivities, overdueActivities: overdueActs, byPaymentMethod: byPaymentMethod.map((p) => ({ method: p.paymentMethod, total: Number(p._sum.total || 0) })) };
  }
}
