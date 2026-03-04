import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import {
  CreateSpecialOrderInput,
  UpdateSpecialOrderStatusInput,
  SpecialOrderFilters,
} from '../types/specialOrder.types';
import { Prisma } from '@prisma/client';

export class SpecialOrderService {
  private static async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.specialOrder.count();
    const seq = String(count + 1).padStart(5, '0');
    return `PED-${dateStr}-${seq}`;
  }

  private static async generatePurchaseOrderNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.purchaseOrder.count();
    const seq = String(count + 1).padStart(5, '0');
    return `OC-${dateStr}-${seq}`;
  }

  static async create(data: CreateSpecialOrderInput, _createdById: string) {
    // Verificar cliente
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
      select: { id: true, isActive: true },
    });
    if (!client || !client.isActive) {
      throw new AppError(404, 'Cliente no encontrado o inactivo');
    }

    // Verificar producto
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      include: {
        productSuppliers: {
          where: { isPreferred: true },
          include: { supplier: true },
          take: 1,
        },
      },
    });
    if (!product || !product.isActive) {
      throw new AppError(404, 'Producto no encontrado o inactivo');
    }

    const orderNumber = await this.generateOrderNumber();
    const preferredSupplier = product.productSuppliers[0];

    const specialOrder = await prisma.$transaction(async (tx) => {
      let purchaseOrderId: string | undefined;

      // Auto-generar OC si hay proveedor preferido
      if (preferredSupplier) {
        const poNumber = await this.generatePurchaseOrderNumber();
        const unitPrice = Number(preferredSupplier.supplierPrice);
        const subtotal = unitPrice * data.quantity;

        const po = await tx.purchaseOrder.create({
          data: {
            orderNumber: poNumber,
            supplierId: preferredSupplier.supplierId,
            status: 'ENVIADA',
            subtotal,
            tax: 0,
            total: subtotal,
            expectedDate: data.estimatedDate,
            notes: `Generada automáticamente para pedido especial ${orderNumber}`,
            items: {
              create: {
                productId: product.id,
                productName: product.name,
                productSku: product.sku,
                quantity: data.quantity,
                unitPrice,
                subtotal,
              },
            },
          },
        });
        purchaseOrderId = po.id;
      }

      const order = await tx.specialOrder.create({
        data: {
          orderNumber,
          clientId: data.clientId,
          productId: data.productId,
          quantity: data.quantity,
          status: purchaseOrderId ? 'ORDEN_GENERADA' : 'PENDIENTE',
          estimatedDate: data.estimatedDate,
          notes: data.notes,
          purchaseOrderId,
        },
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
          product: { select: { id: true, name: true, sku: true } },
          purchaseOrder: {
            select: { id: true, orderNumber: true, status: true },
          },
        },
      });

      return order;
    });

    return specialOrder;
  }

  static async updateStatus(
    id: string,
    data: UpdateSpecialOrderStatusInput,
    userId: string
  ) {
    const order = await prisma.specialOrder.findUnique({ where: { id } });
    if (!order) throw new AppError(404, 'Pedido especial no encontrado');

    const updateData: Prisma.SpecialOrderUpdateInput = {
      status: data.status,
    };

    if (data.notes) updateData.notes = data.notes;
    if (data.estimatedDate) updateData.estimatedDate = data.estimatedDate;
    if (data.status === 'RECIBIDO') updateData.receivedDate = new Date();
    if (data.status === 'LISTO_CLIENTE') updateData.notifiedAt = new Date();

    // Si el producto llega (RECIBIDO), aumentar stock
    if (data.status === 'RECIBIDO') {
      const product = await prisma.product.findUnique({
        where: { id: order.productId },
        select: { currentStock: true },
      });
      if (product) {
        const stockAfter = product.currentStock + order.quantity;
        await prisma.product.update({
          where: { id: order.productId },
          data: { currentStock: stockAfter },
        });
        await prisma.inventoryMovement.create({
          data: {
            productId: order.productId,
            type: 'ENTRADA',
            quantity: order.quantity,
            stockBefore: product.currentStock,
            stockAfter,
            reference: order.orderNumber,
            notes: `Recepción de pedido especial ${order.orderNumber}`,
            createdBy: userId,
          },
        });
      }
    }

    // Si se entrega al cliente (ENTREGADO), descontar del stock reservado
    if (data.status === 'ENTREGADO') {
      const product = await prisma.product.findUnique({
        where: { id: order.productId },
        select: { currentStock: true },
      });
      if (product) {
        const stockAfter = Math.max(0, product.currentStock - order.quantity);
        await prisma.product.update({
          where: { id: order.productId },
          data: { currentStock: stockAfter },
        });
        await prisma.inventoryMovement.create({
          data: {
            productId: order.productId,
            type: 'SALIDA',
            quantity: -order.quantity,
            stockBefore: product.currentStock,
            stockAfter,
            reference: order.orderNumber,
            notes: `Entrega pedido especial ${order.orderNumber}`,
            createdBy: userId,
          },
        });
      }
    }

    const updated = await prisma.specialOrder.update({
      where: { id },
      data: updateData,
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
        product: { select: { id: true, name: true, sku: true } },
        purchaseOrder: {
          select: { id: true, orderNumber: true, status: true },
        },
      },
    });

    return updated;
  }

  static async findAll(filters: SpecialOrderFilters) {
    const { status, clientId, page = 1, limit = 15 } = filters;

    const where: Prisma.SpecialOrderWhereInput = {
      AND: [
        status ? { status: status as any } : {},
        clientId ? { clientId } : {},
      ],
    };

    const [orders, total] = await Promise.all([
      prisma.specialOrder.findMany({
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
          product: { select: { id: true, name: true, sku: true, unit: true } },
          purchaseOrder: {
            select: { id: true, orderNumber: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.specialOrder.count({ where }),
    ]);

    return {
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  static async findById(id: string) {
    const order = await prisma.specialOrder.findUnique({
      where: { id },
      include: {
        client: true,
        product: {
          include: {
            category: true,
            productSuppliers: {
              where: { isPreferred: true },
              include: { supplier: true },
              take: 1,
            },
          },
        },
        purchaseOrder: {
          include: { items: true, supplier: true },
        },
      },
    });

    if (!order) throw new AppError(404, 'Pedido especial no encontrado');
    return order;
  }
}
