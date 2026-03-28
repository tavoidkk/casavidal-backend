import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductService } from '../../src/services/product.service';
import { AppError } from '../../src/middleware/errorHandler';

const prismaMock = vi.hoisted(() => ({
  product: {
    fields: { minStock: 'minStockField' },
    findUnique: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  },
  category: {
    findUnique: vi.fn(),
  },
  supplier: {
    findUnique: vi.fn(),
  },
  inventoryMovement: {
    create: vi.fn(),
  },
  productSupplier: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

describe('ProductService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('creates product and inventory movement when currentStock > 0', async () => {
      const input = {
        name: 'Bomba de agua',
        sku: 'SKU-1',
        barcode: 'BAR-1',
        categoryId: 'cat-1',
        costPrice: 10,
        salePrice: 15,
        currentStock: 5,
      } as any;
      const created = { id: 'p1', ...input };

      prismaMock.product.findUnique
        .mockResolvedValueOnce(null) // sku
        .mockResolvedValueOnce(null); // barcode
      prismaMock.category.findUnique.mockResolvedValue({ id: 'cat-1' });
      prismaMock.product.create.mockResolvedValue(created);
      prismaMock.inventoryMovement.create.mockResolvedValue({});

      const result = await ProductService.create(input);

      expect(prismaMock.product.create).toHaveBeenCalled();
      expect(prismaMock.inventoryMovement.create).toHaveBeenCalledWith({
        data: {
          productId: 'p1',
          type: 'ENTRADA',
          quantity: 5,
          stockBefore: 0,
          stockAfter: 5,
          notes: 'Stock inicial',
        },
      });
      expect(result).toEqual(created);
    });

    it('creates product without movement when currentStock is 0 and sets defaults', async () => {
      const input = {
        name: 'Martillo',
        sku: 'SKU-2',
        categoryId: 'cat-1',
        costPrice: 5,
        salePrice: 8,
        currentStock: 0,
      } as any;
      prismaMock.product.findUnique.mockResolvedValue(null);
      prismaMock.category.findUnique.mockResolvedValue({ id: 'cat-1' });
      prismaMock.product.create.mockResolvedValue({ id: 'p2', ...input, minStock: 5, unit: 'unidad' });

      await ProductService.create(input);

      expect(prismaMock.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ minStock: 5, unit: 'unidad' }),
        }),
      );
      expect(prismaMock.inventoryMovement.create).not.toHaveBeenCalled();
    });

    it('throws when SKU already exists', async () => {
      prismaMock.product.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(ProductService.create({ sku: 'SKU-1' } as any)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Ya existe un producto con este SKU',
      });
    });

    it('throws when barcode already exists', async () => {
      prismaMock.product.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'existing-barcode' });
      await expect(ProductService.create({ sku: 'SKU-1', barcode: 'BAR-1' } as any)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Ya existe un producto con este código de barras',
      });
    });

    it('throws when category does not exist', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);
      prismaMock.category.findUnique.mockResolvedValue(null);
      await expect(ProductService.create({ sku: 'SKU-1', categoryId: 'missing' } as any)).rejects.toMatchObject({
        statusCode: 404,
        message: 'Categoría no encontrada',
      });
    });

    it('throws when parent product does not exist', async () => {
      prismaMock.product.findUnique
        .mockResolvedValueOnce(null) // sku
        .mockResolvedValueOnce(null) // parent
      prismaMock.category.findUnique.mockResolvedValue({ id: 'cat-1' });
      await expect(
        ProductService.create({ sku: 'SKU-1', categoryId: 'cat-1', parentProductId: 'missing' } as any),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Producto padre no encontrado',
      });
    });
  });

  describe('findAll', () => {
    it('returns paginated products with filters', async () => {
      prismaMock.product.findMany.mockResolvedValue([{ id: 'p1' }]);
      prismaMock.product.count.mockResolvedValue(1);

      const result = await ProductService.findAll({ search: 'bom', categoryId: 'cat-1', lowStock: true, page: 2, limit: 5 });

      expect(prismaMock.product.findMany).toHaveBeenCalled();
      expect(result.pagination).toEqual({ page: 2, limit: 5, total: 1, totalPages: 1 });
      expect(result.products).toEqual([{ id: 'p1' }]);
    });

    it('returns empty array when no products found', async () => {
      prismaMock.product.findMany.mockResolvedValue([]);
      prismaMock.product.count.mockResolvedValue(0);
      const result = await ProductService.findAll({});
      expect(result.products).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('findById & findByCode', () => {
    it('findById returns product', async () => {
      prismaMock.product.findUnique.mockResolvedValue({ id: 'p1' });
      await expect(ProductService.findById('p1')).resolves.toEqual({ id: 'p1' });
    });

    it('findById throws 404 when not found', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);
      await expect(ProductService.findById('missing')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Producto no encontrado',
      });
    });

    it('findByCode returns product', async () => {
      prismaMock.product.findFirst.mockResolvedValue({ id: 'p1', sku: 'SKU-1' });
      await expect(ProductService.findByCode('SKU-1')).resolves.toEqual({ id: 'p1', sku: 'SKU-1' });
    });

    it('findByCode throws 404 when missing', async () => {
      prismaMock.product.findFirst.mockResolvedValue(null);
      await expect(ProductService.findByCode('NOPE')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Producto no encontrado',
      });
    });
  });

  describe('update & delete', () => {
    it('update succeeds without barcode change', async () => {
      prismaMock.product.findUnique.mockResolvedValue({ id: 'p1' });
      prismaMock.product.update.mockResolvedValue({ id: 'p1', name: 'Nuevo' });
      await expect(ProductService.update('p1', { name: 'Nuevo' } as any)).resolves.toEqual({ id: 'p1', name: 'Nuevo' });
    });

    it('update validates barcode uniqueness', async () => {
      prismaMock.product.findUnique.mockResolvedValue({ id: 'p1' });
      prismaMock.product.findFirst.mockResolvedValue({ id: 'p2' });
      await expect(ProductService.update('p1', { barcode: 'B-NEW' } as any)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Ya existe un producto con este código de barras',
      });
    });

    it('delete performs soft delete', async () => {
      prismaMock.product.findUnique.mockResolvedValue({ id: 'p1' });
      prismaMock.product.update.mockResolvedValue({ id: 'p1', isActive: false });
      await expect(ProductService.delete('p1')).resolves.toEqual({ message: 'Producto desactivado exitosamente' });
    });
  });

  describe('adjustStock', () => {
    it('adjusts stock and creates movement', async () => {
      prismaMock.product.findUnique.mockResolvedValue({ currentStock: 10 });
      prismaMock.product.update.mockResolvedValue({ id: 'p1', currentStock: 15 });
      prismaMock.inventoryMovement.create.mockResolvedValue({});

      const result = await ProductService.adjustStock(
        { productId: 'p1', quantity: 5, type: 'ENTRADA', notes: 'test' } as any,
        'user-1',
      );

      expect(result).toEqual({ id: 'p1', currentStock: 15 });
      expect(prismaMock.inventoryMovement.create).toHaveBeenCalled();
    });

    it('throws when product is missing', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);
      await expect(ProductService.adjustStock({ productId: 'missing', quantity: 1 } as any)).rejects.toMatchObject({
        statusCode: 404,
        message: 'Producto no encontrado',
      });
    });

    it('throws when stock would be negative', async () => {
      prismaMock.product.findUnique.mockResolvedValue({ currentStock: 1 });
      await expect(ProductService.adjustStock({ productId: 'p1', quantity: -5, type: 'SALIDA' } as any)).rejects.toMatchObject({
        statusCode: 400,
        message: 'El stock no puede ser negativo',
      });
    });
  });

  describe('lists, stats, variants and suppliers', () => {
    it('getLowStock returns products (or empty array)', async () => {
      prismaMock.product.findMany.mockResolvedValueOnce([{ id: 'p1' }]).mockResolvedValueOnce([]);
      await expect(ProductService.getLowStock()).resolves.toEqual([{ id: 'p1' }]);
      await expect(ProductService.getOutOfStock()).resolves.toEqual([]);
    });

    it('getStats returns computed values and defaults totalUnits to 0', async () => {
      prismaMock.product.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1);
      prismaMock.product.aggregate.mockResolvedValue({ _sum: { currentStock: null } });
      prismaMock.product.groupBy.mockResolvedValue([{ categoryId: 'c1', _count: 4 }]);

      const result = await ProductService.getStats();
      expect(result).toEqual({
        totalProducts: 10,
        activeProducts: 8,
        lowStockCount: 2,
        outOfStockCount: 1,
        totalUnits: 0,
        byCategory: 1,
      });
    });

    it('findByCategory and getTopSelling return arrays', async () => {
      prismaMock.product.findMany.mockResolvedValueOnce([{ id: 'p1' }]).mockResolvedValueOnce([{ id: 'p2' }]);
      await expect(ProductService.findByCategory('cat-1')).resolves.toEqual([{ id: 'p1' }]);
      await expect(ProductService.getTopSelling(3)).resolves.toEqual([{ id: 'p2' }]);
    });

    it('getVariants throws when product missing', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);
      await expect(ProductService.getVariants('x')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Producto no encontrado',
      });
    });

    it('getVariants returns empty when product has no variants', async () => {
      prismaMock.product.findUnique.mockResolvedValue({ hasVariants: false });
      await expect(ProductService.getVariants('p1')).resolves.toEqual([]);
    });

    it('getVariants returns variants when product has variants', async () => {
      prismaMock.product.findUnique.mockResolvedValue({ hasVariants: true });
      prismaMock.product.findMany.mockResolvedValue([{ id: 'v1' }]);
      await expect(ProductService.getVariants('p1')).resolves.toEqual([{ id: 'v1' }]);
    });

    it('upsertSupplier throws when product not found/inactive', async () => {
      prismaMock.product.findUnique.mockResolvedValue({ isActive: false });
      await expect(
        ProductService.upsertSupplier('p1', { supplierId: 's1', supplierPrice: 10, isPreferred: true }),
      ).rejects.toMatchObject({ statusCode: 404, message: 'Producto no encontrado' });
    });

    it('upsertSupplier throws when supplier not found/inactive', async () => {
      prismaMock.product.findUnique.mockResolvedValue({ id: 'p1', isActive: true });
      prismaMock.supplier.findUnique.mockResolvedValue({ isActive: false });
      await expect(
        ProductService.upsertSupplier('p1', { supplierId: 's1', supplierPrice: 10, isPreferred: true }),
      ).rejects.toMatchObject({ statusCode: 404, message: 'Proveedor no encontrado' });
    });

    it('upsertSupplier updates preferred and upserts relation', async () => {
      prismaMock.product.findUnique.mockResolvedValue({ id: 'p1', isActive: true });
      prismaMock.supplier.findUnique.mockResolvedValue({ id: 's1', isActive: true });
      prismaMock.productSupplier.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.productSupplier.upsert.mockResolvedValue({ productId: 'p1', supplierId: 's1' });

      const result = await ProductService.upsertSupplier('p1', { supplierId: 's1', supplierPrice: 20, isPreferred: true });

      expect(prismaMock.productSupplier.updateMany).toHaveBeenCalled();
      expect(prismaMock.productSupplier.upsert).toHaveBeenCalled();
      expect(result).toEqual({ productId: 'p1', supplierId: 's1' });
    });

    it('removeSupplier throws when relation missing and deletes when exists', async () => {
      prismaMock.productSupplier.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ productId: 'p1', supplierId: 's1' });
      prismaMock.productSupplier.delete.mockResolvedValue({ productId: 'p1', supplierId: 's1' });

      await expect(ProductService.removeSupplier('p1', 's1')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Relación producto-proveedor no encontrada',
      });
      await expect(ProductService.removeSupplier('p1', 's1')).resolves.toEqual({ productId: 'p1', supplierId: 's1' });
    });
  });

  it('propagates generic db error', async () => {
    prismaMock.product.findMany.mockRejectedValue(new Error('db fail'));
    await expect(ProductService.getTopSelling()).rejects.toThrow('db fail');
  });

  it('uses AppError class for branch assertions', () => {
    const err = new AppError(400, 'x');
    expect(err).toBeInstanceOf(AppError);
  });
});
