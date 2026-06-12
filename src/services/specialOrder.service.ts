import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import {
  CreateSpecialOrderInput,
  UpdateSpecialOrderStatusInput,
  SpecialOrderFilters,
} from '../types/specialOrder.types';
import { Prisma } from '@prisma/client';
import { SaleService } from './sale.service';

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
    const shippingCost = Number(data.shippingCost ?? 0);
    if (Number.isNaN(shippingCost) || shippingCost < 0) {
      throw new AppError(400, 'Costo de envío inválido');
    }

    // Verificar cliente
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
      select: { id: true, isActive: true },
    });
    if (!client || !client.isActive) {
      throw new AppError(404, 'Cliente no encontrado o inactivo');
    }

    // Verificar proveedor
    const supplier = await prisma.supplier.findUnique({
      where: { id: data.supplierId },
      select: { id: true, isActive: true, name: true },
    });
    if (!supplier || !supplier.isActive) {
      throw new AppError(404, 'Proveedor no encontrado o inactivo');
    }

    // Verificar producto
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      select: {
        id: true,
        name: true,
        sku: true,
        isActive: true,
      },
    });
    if (!product || !product.isActive) {
      throw new AppError(404, 'Producto no encontrado o inactivo');
    }

    const purchasePrice = Number(data.purchasePrice);
    const salePrice = Number(data.salePrice);

    if (Number.isNaN(purchasePrice) || purchasePrice <= 0) {
      throw new AppError(400, 'Precio de compra inválido');
    }
    if (Number.isNaN(salePrice) || salePrice <= 0) {
      throw new AppError(400, 'Precio de venta inválido');
    }

    const orderNumber = await this.generateOrderNumber();

    const specialOrder = await prisma.$transaction(async (tx) => {
      const poNumber = await this.generatePurchaseOrderNumber();
      const subtotal = purchasePrice * data.quantity;
      const total = subtotal + shippingCost;

      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          orderNumber: poNumber,
          supplierId: data.supplierId,
          status: 'ENVIADA',
          subtotal,
          tax: 0,
          total,
          shippingCost,
          expectedDate: data.estimatedDate,
          paymentTerms: data.supplierPaymentMethod,
          notes: `Pedido especial ${orderNumber} · Cliente ${data.clientId}`,
          items: {
            create: {
              productId: product.id,
              productName: product.name,
              productSku: product.sku,
              quantity: data.quantity,
              unitPrice: purchasePrice,
              subtotal,
            },
          },
        },
      });

      const order = await tx.specialOrder.create({
        data: {
          orderNumber,
          clientId: data.clientId,
          supplierId: data.supplierId,
          productId: data.productId,
          quantity: data.quantity,
          status: 'ORDEN_GENERADA',
          estimatedDate: data.estimatedDate,
          notes: data.notes,
          purchaseOrderId: purchaseOrder.id,
          purchasePrice,
          salePrice,
          shippingCost,
          paymentMethod: data.paymentMethod,
          supplierPaymentMethod: data.supplierPaymentMethod,
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
          supplier: { select: { id: true, name: true, phone: true } },
          purchaseOrder: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              shippingCost: true,
              total: true,
            },
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
    if (data.status === 'ENTREGADO' && !order.saleId) {
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

    if (data.status === 'RECIBIDO' && !order.saleId) {
      const paymentMethod = order.paymentMethod ?? 'TRANSFERENCIA';
      const sale = await SaleService.create(
        {
          clientId: order.clientId,
          paymentMethod,
          notes: `Factura generada automáticamente para pedido especial ${order.orderNumber}`,
          additionalCharges: Number(order.shippingCost ?? 0),
          items: [
            {
              productId: order.productId,
              quantity: order.quantity,
              unitPrice: Number(order.salePrice),
            },
          ],
        },
        userId
      );

      updateData.sale = { connect: { id: sale.id } };
      updateData.status = 'LISTO_CLIENTE';
      updateData.notifiedAt = new Date();
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
        supplier: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        purchaseOrder: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            shippingCost: true,
            total: true,
          },
        },
        sale: {
          select: {
            id: true,
            saleNumber: true,
            total: true,
            paymentMethod: true,
            createdAt: true,
          },
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
          supplier: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          purchaseOrder: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              shippingCost: true,
              total: true,
            },
          },
          sale: {
            select: {
              id: true,
              saleNumber: true,
              total: true,
              createdAt: true,
            },
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
        supplier: true,
        purchaseOrder: {
          include: { items: true, supplier: true },
        },
        sale: {
          include: {
            items: {
              include: {
                product: {
                  select: { id: true, name: true, sku: true, unit: true },
                },
              },
            },
          },
        },
      },
    });

    if (!order) throw new AppError(404, 'Pedido especial no encontrado');
    return order;
  }
}
