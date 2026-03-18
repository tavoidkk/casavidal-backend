import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';

export interface CreateSupplierInput {
  name: string;
  rif?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface SupplierFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export class SupplierService {
  static async create(data: CreateSupplierInput) {
    if (data.rif) {
      const existing = await prisma.supplier.findUnique({ where: { rif: data.rif } });
      if (existing) throw new AppError(409, 'Ya existe un proveedor con ese RIF');
    }
    return prisma.supplier.create({
      data: { ...data, phone: data.phone ?? '' },
    });
  }

  static async findAll(filters: SupplierFilters) {
    const { search, page = 1, limit = 20 } = filters;

    const where: Prisma.SupplierWhereInput = {
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { rif: { contains: search, mode: 'insensitive' } },
          { contactName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supplier.count({ where }),
    ]);

    return { suppliers, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async findById(id: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        productSuppliers: {
          include: { product: { select: { id: true, name: true, sku: true } } },
          where: { product: { isActive: true } },
        },
      },
    });
    if (!supplier || !supplier.isActive) throw new AppError(404, 'Proveedor no encontrado');
    return supplier;
  }

  static async update(id: string, data: Partial<CreateSupplierInput>) {
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier || !supplier.isActive) throw new AppError(404, 'Proveedor no encontrado');

    if (data.rif && data.rif !== supplier.rif) {
      const existing = await prisma.supplier.findUnique({ where: { rif: data.rif } });
      if (existing) throw new AppError(409, 'Ya existe un proveedor con ese RIF');
    }

    return prisma.supplier.update({ where: { id }, data });
  }

  static async remove(id: string) {
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier || !supplier.isActive) throw new AppError(404, 'Proveedor no encontrado');
    return prisma.supplier.update({ where: { id }, data: { isActive: false } });
  }
}
