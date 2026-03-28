import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export interface CreateCategoryInput {
  name: string;
  description?: string;
  icon?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
}

export class CategoryService {
  /**
   * Obtener todas las categorías activas
   */
  static async findAll() {
    return await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Obtener todas las categorías (incluye inactivas) - Solo para admin
   */
  static async findAllWithInactive() {
    return await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });
  }

  /**
   * Obtener categoría por ID
   */
  static async findById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) {
      throw new AppError(404, 'Categoría no encontrada');
    }

    return category;
  }

  /**
   * Crear nueva categoría
   */
  static async create(data: CreateCategoryInput) {
    // Verificar que el nombre no exista
    const existing = await prisma.category.findFirst({
      where: { 
        name: {
          equals: data.name,
          mode: 'insensitive'
        }
      }
    });

    if (existing) {
      throw new AppError(400, 'Ya existe una categoría con ese nombre');
    }

    return await prisma.category.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        icon: data.icon?.trim() || null,
        isActive: true,
      }
    });
  }

  /**
   * Actualizar categoría
   */
  static async update(id: string, data: UpdateCategoryInput) {
    // Verificar que la categoría existe
    const category = await prisma.category.findUnique({
      where: { id }
    });

    if (!category) {
      throw new AppError(404, 'Categoría no encontrada');
    }

    // Si se actualiza el nombre, verificar que no exista otro con ese nombre
    if (data.name) {
      const existing = await prisma.category.findFirst({
        where: { 
          name: {
            equals: data.name,
            mode: 'insensitive'
          },
          NOT: { id }
        }
      });

      if (existing) {
        throw new AppError(400, 'Ya existe una categoría con ese nombre');
      }
    }

    return await prisma.category.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
        ...(data.icon !== undefined && { icon: data.icon?.trim() || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      }
    });
  }

  /**
   * Eliminar categoría (soft delete)
   */
  static async delete(id: string) {
    // Verificar que la categoría existe
    const category = await this.findById(id);

    // Verificar que no tenga productos asociados
    const productCount = await prisma.product.count({
      where: { 
        categoryId: id,
        isActive: true
      }
    });

    if (productCount > 0) {
      throw new AppError(400, `No se puede eliminar la categoría porque tiene ${productCount} producto(s) asociado(s)`);
    }

    // Soft delete
    return await prisma.category.update({
      where: { id },
      data: { isActive: false }
    });
  }

  /**
   * Obtener estadísticas de categorías
   */
  static async getStats() {
    const [total, active, withProducts] = await Promise.all([
      prisma.category.count(),
      prisma.category.count({ where: { isActive: true } }),
      prisma.category.count({
        where: {
          isActive: true,
          products: {
            some: {
              isActive: true
            }
          }
        }
      })
    ]);

    return {
      total,
      active,
      inactive: total - active,
      withProducts,
      empty: active - withProducts
    };
  }
}