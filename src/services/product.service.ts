import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { 
  CreateProductInput, 
  UpdateProductInput, 
  ProductFilters,
  AdjustStockInput 
} from '../types/poducts.types';
import { Prisma } from '@prisma/client';

export class ProductService {
  // Crear producto
  static async create(data: CreateProductInput) {
    // Verificar SKU único
    const existingSKU = await prisma.product.findUnique({
      where: { sku: data.sku },
    });
    if (existingSKU) {
      throw new AppError(409, 'Ya existe un producto con este SKU');
    }

    // Verificar código de barras único (si se proporciona)
    if (data.barcode) {
      const existingBarcode = await prisma.product.findUnique({
        where: { barcode: data.barcode },
      });
      if (existingBarcode) {
        throw new AppError(409, 'Ya existe un producto con este código de barras');
      }
    }

    // Verificar que la categoría existe
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      throw new AppError(404, 'Categoría no encontrada');
    }

    // Si es variante, verificar que el producto padre existe
    if (data.parentProductId) {
      const parent = await prisma.product.findUnique({
        where: { id: data.parentProductId },
      });
      if (!parent) {
        throw new AppError(404, 'Producto padre no encontrado');
      }
      data.hasVariants = false; // Las variantes no pueden tener variantes
    }

    // Crear producto
    const product = await prisma.product.create({
      data: {
        ...data,
        minStock: data.minStock || 5,
        unit: data.unit || 'unidad',
      },
      include: {
        category: true,
        parentProduct: true,
      },
    });

    // Crear movimiento de inventario inicial
    if (data.currentStock > 0) {
      await prisma.inventoryMovement.create({
        data: {
          productId: product.id,
          type: 'ENTRADA',
          quantity: data.currentStock,
          stockBefore: 0,
          stockAfter: data.currentStock,
          notes: 'Stock inicial',
        },
      });
    }

    return product;
  }

  // Listar productos con filtros
  static async findAll(filters: ProductFilters) {
    const {
      search,
      categoryId,
      isActive = true,
      lowStock = false,
      page = 1,
      limit = 10,
    } = filters;

    // Construir condiciones
    const where: Prisma.ProductWhereInput = {
      AND: [
        { isActive },
        categoryId ? { categoryId } : {},
        lowStock ? { currentStock: { lte: prisma.product.fields.minStock } } : {},
        search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
      ],
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          parentProduct: {
            select: { name: true },
          },
          variants: {
            select: {
              id: true,
              name: true,
              variantInfo: true,
              currentStock: true,
              salePrice: true,
            },
          },
        },
        orderBy: [
          { currentStock: 'asc' }, // Productos con menos stock primero
          { name: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Obtener producto por ID
  static async findById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        parentProduct: true,
        variants: true,
        productSuppliers: {
          include: {
            supplier: true,
          },
          orderBy: {
            isPreferred: 'desc',
          },
        },
        inventoryMovements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!product) {
      throw new AppError(404, 'Producto no encontrado');
    }

    return product;
  }

  // Obtener producto por SKU o código de barras
  static async findByCode(code: string) {
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { sku: code },
          { barcode: code },
        ],
      },
      include: {
        category: true,
        variants: true,
      },
    });

    if (!product) {
      throw new AppError(404, 'Producto no encontrado');
    }

    return product;
  }

  // Actualizar producto
  static async update(id: string, data: UpdateProductInput) {
    await this.findById(id);

    // Verificar código de barras único si se está actualizando
    if (data.barcode) {
      const existing = await prisma.product.findFirst({
        where: {
          barcode: data.barcode,
          NOT: { id },
        },
      });
      if (existing) {
        throw new AppError(409, 'Ya existe un producto con este código de barras');
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data,
      include: {
        category: true,
        variants: true,
      },
    });

    return product;
  }

  // Eliminar (soft delete)
  static async delete(id: string) {
    await this.findById(id);

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Producto desactivado exitosamente' };
  }

  // Ajustar stock (entrada/salida manual)
  static async adjustStock(data: AdjustStockInput, userId?: string) {
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      select: { currentStock: true },
    });

    if (!product) {
      throw new AppError(404, 'Producto no encontrado');
    }

    const stockBefore = product.currentStock;
    const stockAfter = stockBefore + data.quantity;

    if (stockAfter < 0) {
      throw new AppError(400, 'El stock no puede ser negativo');
    }

    // Actualizar stock del producto
    const updatedProduct = await prisma.product.update({
      where: { id: data.productId },
      data: { currentStock: stockAfter },
    });

    // Crear movimiento de inventario
    await prisma.inventoryMovement.create({
      data: {
        productId: data.productId,
        type: data.type,
        quantity: data.quantity,
        stockBefore,
        stockAfter,
        reference: data.reference,
        notes: data.notes,
        createdBy: userId,
      },
    });

    return updatedProduct;
  }

  // Obtener productos con stock bajo
  static async getLowStock() {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        currentStock: {
          lte: prisma.product.fields.minStock,
        },
      },
      include: {
        category: true,
        productSuppliers: {
          where: { isPreferred: true },
          include: { supplier: true },
          take: 1,
        },
      },
      orderBy: {
        currentStock: 'asc',
      },
    });

    return products;
  }

  // Obtener productos sin stock
  static async getOutOfStock() {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        currentStock: 0,
      },
      include: {
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return products;
  }

  // Estadísticas de inventario
  static async getStats() {
    const [
      totalProducts,
      activeProducts,
      lowStockCount,
      outOfStockCount,
      totalValue,
      byCategory,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({
        where: {
          isActive: true,
          currentStock: { lte: prisma.product.fields.minStock },
        },
      }),
      prisma.product.count({
        where: {
          isActive: true,
          currentStock: 0,
        },
      }),
      prisma.product.aggregate({
        _sum: {
          currentStock: true,
        },
        where: { isActive: true },
      }),
      prisma.product.groupBy({
        by: ['categoryId'],
        _count: true,
        where: { isActive: true },
      }),
    ]);

    return {
      totalProducts,
      activeProducts,
      lowStockCount,
      outOfStockCount,
      totalUnits: totalValue._sum.currentStock || 0,
      byCategory: byCategory.length,
    };
  }

  // Buscar productos por categoría
  static async findByCategory(categoryId: string) {
    const products = await prisma.product.findMany({
      where: {
        categoryId,
        isActive: true,
      },
      include: {
        category: true,
        variants: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return products;
  }

  // Obtener variantes de un producto
  static async getVariants(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { hasVariants: true },
    });

    if (!product) {
      throw new AppError(404, 'Producto no encontrado');
    }

    if (!product.hasVariants) {
      return [];
    }

    const variants = await prisma.product.findMany({
      where: {
        parentProductId: productId,
        isActive: true,
      },
      include: {
        category: true,
      },
    });

    return variants;
  }

  // Productos más vendidos (preparado para cuando tengamos ventas)
  static async getTopSelling(limit = 10) {
    // Por ahora retorna productos ordenados por nombre
    // Cuando tengamos módulo de ventas, ordenaremos por cantidad vendida
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
      },
      take: limit,
      orderBy: {
        name: 'asc',
      },
    });

    return products;
  }
}