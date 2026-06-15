import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { CreateSaleInput, SaleFilters } from '../types/sale.types';
import { Prisma } from '@prisma/client';
import { ActivityService } from './activity.service';
import { NotificationService } from './notification.service';
import { SettingsService } from './settings.service';
import { PointsService } from './points.service';

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
    const additionalCharges = Number(data.additionalCharges ?? 0);
    if (additionalCharges < 0 || Number.isNaN(additionalCharges)) {
      throw new AppError(400, 'Cargos adicionales inválidos');
    }

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
        let unitPrice = item.unitPrice ?? Number(product.salePrice);
        if (
          (client.category === 'MAYORISTA' || client.category === 'VIP') &&
          product.wholesalePrice
        ) {
          unitPrice = item.unitPrice ?? Number(product.wholesalePrice);
        }

        if (unitPrice <= 0 || Number.isNaN(unitPrice)) {
          throw new AppError(400, `Precio inválido para el producto ${product.name}`);
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
    const pointsRedeemed = data.pointsRedeemed || 0;
    let pointsDiscount = 0;

    if (pointsRedeemed > 0) {
      const validation = PointsService.validateRedemption(pointsRedeemed, subtotal);
      if (!validation.isValid) {
        throw new AppError(400, `El descuento máximo por puntos es $${validation.maxDiscount.toFixed(2)} (${validation.maxPoints} pts)`);
      }
      if (pointsRedeemed > client.loyaltyPoints) {
        throw new AppError(400, `Puntos insuficientes. Disponibles: ${client.loyaltyPoints}`);
      }
      pointsDiscount = validation.discountAmount;
    }

    const baseTotal = Math.max(0, subtotal - discount - pointsDiscount + additionalCharges);

    const saleNumber = await this.generateSaleNumber();

    // Determinar moneda y obtener tasa si aplica
    const currency = data.currency || 'USD';
    const settings = await SettingsService.getSettings();
    const hasBsPayment = data.payments?.some(p => p.currency === 'BS');
    let usdToBsRateAtSale: number | null = null;
    if (currency === 'BS' || hasBsPayment) {
      const raw = settings.usdToBsRate;
      usdToBsRateAtSale = raw !== null && raw !== undefined ? Number(raw) : null;
      if (!usdToBsRateAtSale || usdToBsRateAtSale <= 0) {
        throw new AppError(400, 'Debe configurar la tasa de cambio USD → Bs en Ajustes antes de realizar ventas en bolívares');
      }
    }

    const taxRate = settings.taxRate ? Number(settings.taxRate) : 0;
    const taxAmount = taxRate > 0 ? Number((baseTotal * (taxRate / 100)).toFixed(2)) : 0;
    const total = baseTotal + taxAmount;

    // Preparar datos de pago
    let paymentData: Array<{
      paymentMethod: string;
      currency: string;
      amount: Prisma.Decimal;
      amountUsd: Prisma.Decimal;
      reference?: string;
    }>;

    if (data.payments && data.payments.length > 0) {
      const rate = usdToBsRateAtSale ?? 1;
      paymentData = data.payments.map((p) => {
        const amountUsd = p.currency === 'USD' ? p.amount : p.amount / rate;
        return {
          paymentMethod: p.paymentMethod,
          currency: p.currency,
          amount: new Prisma.Decimal(p.amount),
          amountUsd: new Prisma.Decimal(amountUsd),
          reference: p.reference,
        };
      });
      const totalUsdPaid = paymentData.reduce((sum, p) => sum + Number(p.amountUsd), 0);
      const delta = totalUsdPaid - total;
      if (delta < -0.01) {
        const breakdown = paymentData.map(p =>
          `${p.paymentMethod} ${p.currency} ${p.amount} → $${Number(p.amountUsd).toFixed(2)}`
        ).join('; ');
        throw new AppError(
          400,
          `Pagos incompletos: faltan $${Math.abs(delta).toFixed(2)} (total pendiente $${total.toFixed(2)}). Desglose: ${breakdown}`
        );
      }
    } else {
      const amountUsd = currency === 'USD' ? total : total / usdToBsRateAtSale!;
      paymentData = [{
        paymentMethod: data.paymentMethod!,
        currency,
        amount: new Prisma.Decimal(total),
        amountUsd: new Prisma.Decimal(amountUsd),
        reference: data.paymentReference,
      }];
    }

    // Crear venta en una transacción
    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          saleNumber,
          clientId: data.clientId,
          sellerId,
          subtotal,
          discount,
          pointsRedeemed,
          pointsDiscount,
          tax: taxAmount,
          total,
          paymentMethod: data.paymentMethod || paymentData[0].paymentMethod as any,
          currency,
          paymentReference: data.paymentReference,
          usdToBsRateAtSale: usdToBsRateAtSale !== null ? new Prisma.Decimal(usdToBsRateAtSale) : null,
          notes: data.notes,
          payments: {
            create: paymentData.map((p) => ({
              paymentMethod: p.paymentMethod as any,
              currency: p.currency as any,
              amount: p.amount,
              amountUsd: p.amountUsd,
              reference: p.reference,
            })),
          },
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
        const updated = await tx.product.updateMany({
          where: {
            id: item.productId,
            isActive: true,
            currentStock: { gte: item.quantity },
          },
          data: {
            currentStock: { decrement: item.quantity },
          },
        });

        if (updated.count === 0) {
          throw new AppError(
            400,
            `Stock insuficiente para "${item.productName}". La disponibilidad cambió, actualiza la venta e intenta nuevamente.`
          );
        }

        const updatedProduct = await tx.product.findUniqueOrThrow({
          where: { id: item.productId },
          select: { currentStock: true, minStock: true },
        });
        const stockAfter = updatedProduct.currentStock;
        const stockBefore = stockAfter + item.quantity;

        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: 'SALIDA',
            quantity: -item.quantity,
            stockBefore,
            stockAfter,
            reference: saleNumber,
            notes: `Venta ${saleNumber}`,
            createdBy: sellerId,
          },
        });
        if (stockAfter <= updatedProduct.minStock) {
          lowStockAlerts.push(NotificationService.notifyLowStock(item.productId, item.productName, stockAfter));
        }
      }
      Promise.all(lowStockAlerts).catch(console.error);

      // Actualizar cliente
      const newTotal = Number(client.totalPurchases) + total;
      const newCount = client.purchaseCount + 1;
      const pointsEarnedFromPurchase = Math.floor(total / 10); // 1 punto por cada $10

      let newLoyaltyPoints = client.loyaltyPoints + pointsEarnedFromPurchase;
      if (pointsRedeemed > 0) {
        newLoyaltyPoints -= pointsRedeemed;
      }

      // Actualizar categoría automáticamente
      let newCategory = client.category;
      if (client.purchaseCount === 0) {
        newCategory = 'REGULAR';
      }
      if (newTotal > 200 && client.category !== 'MAYORISTA') {
        newCategory = 'VIP';
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

      // Registrar transacción de puntos ganados
      await tx.pointsTransaction.create({
        data: {
          clientId: data.clientId,
          type: 'EARNED',
          points: pointsEarnedFromPurchase,
          runningBalance: newLoyaltyPoints,
          description: `Compra ${saleNumber} — ${pointsEarnedFromPurchase} pts por $${total.toFixed(2)}`,
          saleId: newSale.id,
        },
      });

      // Registrar canje de puntos si aplica
      if (pointsRedeemed > 0) {
        await tx.pointsTransaction.create({
          data: {
            clientId: data.clientId,
            type: 'REDEEMED',
            points: pointsRedeemed,
            runningBalance: newLoyaltyPoints,
            description: `Canje en ${saleNumber} — ${pointsRedeemed} pts por $${pointsDiscount.toFixed(2)} de descuento`,
            saleId: newSale.id,
          },
        });
      }

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
          payments: {
            select: { id: true, paymentMethod: true, currency: true, amount: true, amountUsd: true, reference: true },
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
        payments: {
          select: { id: true, paymentMethod: true, currency: true, amount: true, amountUsd: true, reference: true },
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
