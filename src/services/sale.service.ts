import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { CreateSaleInput, SaleFilters } from '../types/sale.types';
import { Prisma } from '@prisma/client';
import { ActivityService } from './activity.service';
import { NotificationService } from './notification.service';

export class SaleService {
  // Genera número de venta: VTA-20250101-00001
  private static async generateSaleNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.sale.count();
    const seq = String(count + 1).padStart(5, '0');
    return `VTA-${dateStr}-${seq}`;
  }

  static async create(data: CreateSaleInput, sellerId: string) {
    // Verificar que el cliente existe y está activo
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
      select: {
        id: true,
        category: true,
        totalPurchases: true,
        purchaseCount: true,
        loyaltyPoints: true,
        isActive: true,
      },
    });
    if (!client || !client.isActive) {
      throw new AppError(404, 'Cliente no encontrado o inactivo');
    }

    // Verificar productos y calcular totales
    const itemsWithProducts = await Promise.all(
      data.items.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            sku: true,
            salePrice: true,
            wholesalePrice: true,
            currentStock: true,
            minStock: true,
            isActive: true,
          },
        });

        if (!product || !product.isActive) {
          throw new AppError(404, `Producto ${item.productId} no encontrado`);
        }
        if (product.currentStock < item.quantity) {
          throw new AppError(
            400,
            `Stock insuficiente para "${product.name}". Disponible: ${product.currentStock}, solicitado: ${item.quantity}`
          );
        }

        // Precio según categoría del cliente
        let unitPrice = Number(product.salePrice);
        if (
          (client.category === 'MAYORISTA' || client.category === 'VIP') &&
          product.wholesalePrice
        ) {
          unitPrice = Number(product.wholesalePrice);
        }

        return {
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice,
          subtotal: unitPrice * item.quantity,
          currentStock: product.currentStock,
          minStock: product.minStock,
        };
      })
    );

    const subtotal = itemsWithProducts.reduce((sum, i) => sum + i.subtotal, 0);
    const discount = data.discount || 0;
    const total = Math.max(0, subtotal - discount);

    const saleNumber = await this.generateSaleNumber();

    // Crear venta en una transacción
    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          saleNumber,
          clientId: data.clientId,
          sellerId,
          subtotal,
          discount,
          tax: 0,
          total,
          paymentMethod: data.paymentMethod,
          notes: data.notes,
          items: {
            create: itemsWithProducts.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
        },
        include: {
          items: { include: { product: { select: { name: true, sku: true } } } },
          client: { select: { firstName: true, lastName: true, companyName: true } },
          seller: { select: { firstName: true, lastName: true } },
        },
      });

      // Descontar stock y crear movimientos de inventario
      const lowStockAlerts: Promise<void>[] = [];
      for (const item of itemsWithProducts) {
        const stockAfter = item.currentStock - item.quantity;
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: stockAfter },
        });
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: 'SALIDA',
            quantity: -item.quantity,
            stockBefore: item.currentStock,
            stockAfter,
            reference: saleNumber,
            notes: `Venta ${saleNumber}`,
            createdBy: sellerId,
          },
        });
        if (stockAfter <= item.minStock) {
          lowStockAlerts.push(NotificationService.notifyLowStock(item.productId, item.productName, stockAfter));
        }
      }
      Promise.all(lowStockAlerts).catch(console.error);

      // Actualizar cliente
      const newTotal = Number(client.totalPurchases) + total;
      const newCount = client.purchaseCount + 1;
      const loyaltyPointsEarned = Math.floor(total / 10); // 1 punto por cada $10
      const newLoyaltyPoints = client.loyaltyPoints + loyaltyPointsEarned;

      // Actualizar categoría automáticamente
      let newCategory = client.category;
      if (newTotal >= 50000 && client.category !== 'MAYORISTA') {
        newCategory = 'VIP';
      } else if (newTotal >= 10000 && client.category === 'NUEVO') {
        newCategory = 'REGULAR';
      }

      const newStage = client.purchaseCount === 0 ? 'GANADO' : undefined;

      await tx.client.update({
        where: { id: data.clientId },
        data: {
          totalPurchases: newTotal,
          purchaseCount: newCount,
          loyaltyPoints: newLoyaltyPoints,
          lastPurchaseAt: new Date(),
          category: newCategory,
          ...(newStage ? { stage: newStage } : {}),
        },
      });

      // Actualizar scoring del cliente
      await tx.clientScoring.upsert({
        where: { clientId: data.clientId },
        update: {
          lifetimeValue: newTotal,
          averageTicket: newTotal / newCount,
          daysSinceLastPurchase: 0,
          purchaseFrequency: newCount,
          score: Math.min(100, Math.floor((newTotal / 1000) * 10 + newCount * 2)),
          churnProbability: 5, // Acaba de comprar, riesgo bajo
        },
        create: {
          clientId: data.clientId,
          lifetimeValue: newTotal,
          averageTicket: total,
          daysSinceLastPurchase: 0,
          purchaseFrequency: 1,
          score: Math.min(100, Math.floor((total / 1000) * 10 + 2)),
          churnProbability: 5,
        },
      });

      return newSale;
    });

    // Actividad automática de seguimiento post-venta
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    await ActivityService.createActivity({
      clientId: data.clientId,
      assignedToId: sellerId,
      type: 'SEGUIMIENTO',
      subject: `Seguimiento post-venta ${sale.saleNumber}`,
      description: 'Contactar al cliente para validar su experiencia con la compra.',
      dueDate,
    });

    const productNames = sale.items.map((item) => item.product.name.toLowerCase());

    // Seguimiento especial para productos de instalación (ej. bombas)
    if (productNames.some((name) => name.includes('bomba'))) {
      const due = new Date();
      due.setDate(due.getDate() + 5);
      await ActivityService.createActivity({
        clientId: data.clientId,
        assignedToId: sellerId,
        type: 'LLAMADA',
        subject: 'Seguimiento de instalación de bomba',
        description: 'Validar instalación, fugas, presión y funcionamiento general con el cliente.',
        dueDate: due,
      });
    }

    // Herramientas eléctricas: revisión rápida de experiencia
    if (productNames.some((name) => ['taladro', 'amoladora', 'esmeril', 'sierra'].some((k) => name.includes(k)))) {
      const due = new Date();
      due.setDate(due.getDate() + 2);
      await ActivityService.createActivity({
        clientId: data.clientId,
        assignedToId: sellerId,
        type: 'SEGUIMIENTO',
        subject: 'Seguimiento de herramienta eléctrica',
        description: 'Consultar desempeño y dudas de uso seguro del equipo.',
        dueDate: due,
      });
    }

    // Pinturas/acabados: oferta de complementarios
    if (productNames.some((name) => ['pintura', 'esmalte', 'barniz'].some((k) => name.includes(k)))) {
      const due = new Date();
      due.setDate(due.getDate() + 4);
      await ActivityService.createActivity({
        clientId: data.clientId,
        assignedToId: sellerId,
        type: 'EMAIL',
        subject: 'Seguimiento de acabados y complementarios',
        description: 'Ofrecer selladores, brochas y repuestos según consumo del cliente.',
        dueDate: due,
      });
    }

    return sale;
  }

  static async findAll(filters: SaleFilters) {
    const { search, clientId, sellerId, dateFrom, dateTo, page = 1, limit = 15 } = filters;

    const where: Prisma.SaleWhereInput = {
      AND: [
        clientId ? { clientId } : {},
        sellerId ? { sellerId } : {},
        dateFrom ? { createdAt: { gte: dateFrom } } : {},
        dateTo ? { createdAt: { lte: dateTo } } : {},
        search
          ? {
              OR: [
                { saleNumber: { contains: search, mode: 'insensitive' } },
                {
                  client: {
                    OR: [
                      { firstName: { contains: search, mode: 'insensitive' } },
                      { lastName: { contains: search, mode: 'insensitive' } },
                      { companyName: { contains: search, mode: 'insensitive' } },
                    ],
                  },
                },
              ],
            }
          : {},
      ],
    };

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              clientType: true,
              firstName: true,
              lastName: true,
              companyName: true,
              phone: true,
            },
          },
          seller: { select: { id: true, firstName: true, lastName: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sale.count({ where }),
    ]);

    return {
      sales,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  static async findById(id: string) {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        client: true,
        seller: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unit: true, image: true },
            },
          },
        },
      },
    });

    if (!sale) throw new AppError(404, 'Venta no encontrada');
    return sale;
  }

  static async getStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todaySales, weekSales, monthSales, totalSales] = await Promise.all([
      prisma.sale.aggregate({
        _sum: { total: true },
        _count: true,
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.sale.aggregate({
        _sum: { total: true },
        _count: true,
        where: { createdAt: { gte: weekStart } },
      }),
      prisma.sale.aggregate({
        _sum: { total: true },
        _count: true,
        where: { createdAt: { gte: monthStart } },
      }),
      prisma.sale.aggregate({
        _sum: { total: true },
        _count: true,
      }),
    ]);

    return {
      today: {
        total: Number(todaySales._sum.total || 0),
        count: todaySales._count,
      },
      week: {
        total: Number(weekSales._sum.total || 0),
        count: weekSales._count,
      },
      month: {
        total: Number(monthSales._sum.total || 0),
        count: monthSales._count,
      },
      allTime: {
        total: Number(totalSales._sum.total || 0),
        count: totalSales._count,
      },
    };
  }
}
