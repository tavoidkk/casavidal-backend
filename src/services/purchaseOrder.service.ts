import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import {
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  ReceiveItemInput,
  PurchaseOrderFilters,
} from '../types/purchaseOrder.types';
import { Prisma } from '@prisma/client';
import type { PurchaseOrderStatus } from '@prisma/client';

const VALID_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  BORRADOR: ['ENVIADA', 'CANCELADA'],
  ENVIADA: ['CONFIRMADA', 'CANCELADA'],
  CONFIRMADA: ['RECIBIDA_PARCIAL', 'RECIBIDA_COMPLETA', 'CANCELADA'],
  RECIBIDA_PARCIAL: ['RECIBIDA_COMPLETA', 'CANCELADA'],
  RECIBIDA_COMPLETA: [],
  CANCELADA: [],
};

export class PurchaseOrderService {
  private static async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.purchaseOrder.count();
    const seq = String(count + 1).padStart(5, '0');
    return `OC-${dateStr}-${seq}`;
  }

  static async create(data: CreatePurchaseOrderInput, _createdBy: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: data.supplierId },
    });
    if (!supplier || !supplier.isActive) {
      throw new AppError(404, 'Proveedor no encontrado o inactivo');
    }

    let subtotal = 0;
    const itemsData = data.items.map((item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      subtotal += itemSubtotal;
      return {
        productId: item.productId,
        productName: item.productName || '',
        productSku: item.productSku || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: itemSubtotal,
      };
    });

    const tax = 0;
    const total = subtotal + tax;
    const orderNumber = await this.generateOrderNumber();

    const order = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: data.supplierId,
        status: 'BORRADOR',
        subtotal,
        tax,
        total,
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
        notes: data.notes,
        items: {
          create: itemsData,
        },
      },
      include: {
        supplier: {
          select: { id: true, name: true, phone: true, rif: true },
        },
        items: true,
      },
    });

    return order;
  }

  static async findAll(filters: PurchaseOrderFilters) {
    const { status, supplierId, search, page = 1, limit = 15 } = filters;

    const where: Prisma.PurchaseOrderWhereInput = {
      AND: [
        status ? { status: status as PurchaseOrderStatus } : {},
        supplierId ? { supplierId } : {},
      ],
    };

    if (search) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { orderNumber: { contains: search, mode: 'insensitive' } },
            { supplier: { name: { contains: search, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: {
            select: { id: true, name: true, phone: true, rif: true },
          },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return {
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  static async findById(id: string) {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: true,
        specialOrders: {
          select: { id: true, orderNumber: true, status: true },
        },
      },
    });

    if (!order) throw new AppError(404, 'Orden de compra no encontrada');
    return order;
  }

  static async updateStatus(id: string, newStatus: PurchaseOrderStatus) {
    const order = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) throw new AppError(404, 'Orden de compra no encontrada');

    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new AppError(400, `No se puede cambiar de ${order.status} a ${newStatus}`);
    }

    const updateData: Prisma.PurchaseOrderUpdateInput = { status: newStatus };
    if (newStatus === 'RECIBIDA_COMPLETA') {
      updateData.receivedDate = new Date();
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        supplier: {
          select: { id: true, name: true, phone: true, rif: true },
        },
        items: true,
      },
    });

    return updated;
  }

  static async update(id: string, data: UpdatePurchaseOrderInput) {
    const order = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) throw new AppError(404, 'Orden de compra no encontrada');
    if (order.status !== 'BORRADOR') {
      throw new AppError(400, 'Solo se puede editar órdenes en estado BORRADOR');
    }

    const updateData: Prisma.PurchaseOrderUpdateInput = {};

    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.expectedDate !== undefined) {
      updateData.expectedDate = new Date(data.expectedDate);
    }

    if (data.items) {
      let subtotal = 0;
      const itemsData = data.items.map((item) => {
        const itemSubtotal = item.quantity * item.unitPrice;
        subtotal += itemSubtotal;
        return {
          productId: item.productId,
          productName: item.productName || '',
          productSku: item.productSku || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: itemSubtotal,
        };
      });

      updateData.items = {
        deleteMany: {},
        create: itemsData,
      };
      updateData.subtotal = subtotal;
      updateData.tax = 0;
      updateData.total = subtotal;
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        supplier: {
          select: { id: true, name: true, phone: true, rif: true },
        },
        items: true,
      },
    });

    return updated;
  }

  static async receiveItems(id: string, items: ReceiveItemInput[], userId: string) {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new AppError(404, 'Orden de compra no encontrada');

    const receivableStatuses: PurchaseOrderStatus[] = ['CONFIRMADA', 'RECIBIDA_PARCIAL'];
    if (!receivableStatuses.includes(order.status)) {
      throw new AppError(400, 'No se pueden recibir items en este estado');
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const receiveItem of items) {
        const dbItem = order.items.find((i) => i.id === receiveItem.itemId);
        if (!dbItem) {
          throw new AppError(404, `Item ${receiveItem.itemId} no encontrado`);
        }

        const newReceived = dbItem.quantityReceived + receiveItem.quantityReceived;
        if (newReceived > dbItem.quantity) {
          throw new AppError(400, `Cantidad recibida excede lo ordenado para ${dbItem.productName}`);
        }

        await tx.purchaseOrderItem.update({
          where: { id: receiveItem.itemId },
          data: { quantityReceived: newReceived },
        });

        if (receiveItem.quantityReceived > 0) {
          const product = await tx.product.findUnique({
            where: { id: dbItem.productId },
            select: { currentStock: true },
          });

          if (product) {
            const stockAfter = product.currentStock + receiveItem.quantityReceived;
            await tx.product.update({
              where: { id: dbItem.productId },
              data: { currentStock: stockAfter },
            });

            await tx.inventoryMovement.create({
              data: {
                productId: dbItem.productId,
                type: 'ENTRADA',
                quantity: receiveItem.quantityReceived,
                stockBefore: product.currentStock,
                stockAfter,
                reference: order.orderNumber,
                notes: `Recepción OC ${order.orderNumber} - ${dbItem.productName}`,
                createdBy: userId,
              },
            });
          }
        }
      }

      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
      });

      const allReceived = updatedItems.every((i) => i.quantityReceived >= i.quantity);
      const anyReceived = updatedItems.some((i) => i.quantityReceived > 0);

      let newStatus: PurchaseOrderStatus;
      if (allReceived) {
        newStatus = 'RECIBIDA_COMPLETA';
      } else if (anyReceived) {
        newStatus = 'RECIBIDA_PARCIAL';
      } else {
        newStatus = order.status;
      }

      const updateData: Prisma.PurchaseOrderUpdateInput = { status: newStatus };
      if (newStatus === 'RECIBIDA_COMPLETA') {
        updateData.receivedDate = new Date();
      }

      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: updateData,
        include: {
          supplier: {
            select: { id: true, name: true, phone: true, rif: true },
          },
          items: true,
        },
      });

      return updated;
    });

    return result;
  }
}
