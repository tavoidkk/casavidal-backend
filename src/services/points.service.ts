import { prisma } from '../config/database';

const POINT_VALUE_USD = 0.10;
const MAX_REDEMPTION_PERCENT = 0.15;

export class PointsService {
  static async getHistory(clientId: string) {
    return prisma.pointsTransaction.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async redeem(clientId: string, pointsToRedeem: number, saleId?: string) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { loyaltyPoints: true },
    });

    if (!client) throw new Error('Cliente no encontrado');
    if (pointsToRedeem <= 0) throw new Error('Los puntos a canjear deben ser mayores a 0');
    if (pointsToRedeem > client.loyaltyPoints) throw new Error('Puntos insuficientes');

    if (saleId) {
      const sale = await prisma.sale.findUnique({
        where: { id: saleId },
        select: { subtotal: true },
      });
      if (!sale) throw new Error('Venta no encontrada');

      const maxPointsForSale = Math.floor(Number(sale.subtotal) * MAX_REDEMPTION_PERCENT / POINT_VALUE_USD);
      if (pointsToRedeem > maxPointsForSale) {
        throw new Error(`Máximo ${maxPointsForSale} puntos canjeables en esta venta (15% del subtotal)`);
      }
    }

    const discountAmount = pointsToRedeem * POINT_VALUE_USD;
    const previousPoints = client.loyaltyPoints;

    const [transaction] = await prisma.$transaction([
      prisma.pointsTransaction.create({
        data: {
          clientId,
          type: 'REDEEMED',
          points: pointsToRedeem,
          runningBalance: previousPoints - pointsToRedeem,
          description: `Canje de ${pointsToRedeem} puntos — Descuento de $${discountAmount.toFixed(2)}`,
          saleId,
        },
      }),
      prisma.client.update({
        where: { id: clientId },
        data: {
          loyaltyPoints: { decrement: pointsToRedeem },
        },
      }),
    ]);

    return transaction;
  }

  static async recordEarned(clientId: string, points: number, saleId: string, description: string) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { loyaltyPoints: true },
    });
    if (!client) throw new Error('Cliente no encontrado');

    return prisma.pointsTransaction.create({
      data: {
        clientId,
        type: 'EARNED',
        points,
        runningBalance: client.loyaltyPoints,
        description,
        saleId,
      },
    });
  }

  static validateRedemption(pointsToRedeem: number, subtotal: number) {
    const discountAmount = pointsToRedeem * POINT_VALUE_USD;
    const maxDiscount = subtotal * MAX_REDEMPTION_PERCENT;
    return {
      isValid: discountAmount <= maxDiscount,
      discountAmount,
      maxDiscount,
      maxPoints: Math.floor(maxDiscount / POINT_VALUE_USD),
    };
  }
}
