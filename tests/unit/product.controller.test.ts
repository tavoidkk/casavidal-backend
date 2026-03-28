import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductController } from '../../src/controllers/product.controller';
import { ProductService } from '../../src/services/product.service';
import { paginatedResponse, successResponse } from '../../src/utils/response';

vi.mock('../../src/services/product.service', () => ({
  ProductService: {
    create: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    findByCode: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    adjustStock: vi.fn(),
    getLowStock: vi.fn(),
    getOutOfStock: vi.fn(),
    getStats: vi.fn(),
    findByCategory: vi.fn(),
    getVariants: vi.fn(),
    getTopSelling: vi.fn(),
    upsertSupplier: vi.fn(),
    removeSupplier: vi.fn(),
  },
}));

vi.mock('../../src/utils/response', () => ({
  successResponse: vi.fn(),
  paginatedResponse: vi.fn(),
}));

describe('ProductController', () => {
  const res = {} as any;
  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('create handles success and error', async () => {
    const req = { body: { name: 'P' } } as any;
    (ProductService.create as any).mockResolvedValue({ id: 'p1' });
    await ProductController.create(req, res, next);
    expect(successResponse).toHaveBeenCalledWith(res, { id: 'p1' }, 'Producto creado exitosamente', 201);

    const err = new Error('fail');
    (ProductService.create as any).mockRejectedValue(err);
    await ProductController.create(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('getAll parses filters and returns paginated response', async () => {
    const req = { query: { search: 'abc', categoryId: 'c1', isActive: 'false', lowStock: 'true', page: '2', limit: '5' } } as any;
    (ProductService.findAll as any).mockResolvedValue({
      products: [{ id: 'p1' }],
      pagination: { page: 2, limit: 5, total: 1 },
    });
    await ProductController.getAll(req, res, next);
    expect(ProductService.findAll).toHaveBeenCalledWith({
      search: 'abc',
      categoryId: 'c1',
      isActive: false,
      lowStock: true,
      page: 2,
      limit: 5,
    });
    expect(paginatedResponse).toHaveBeenCalledWith(res, [{ id: 'p1' }], 2, 5, 1);
  });

  it('getById and getByCode call service and successResponse', async () => {
    (ProductService.findById as any).mockResolvedValue({ id: 'p1' });
    (ProductService.findByCode as any).mockResolvedValue({ id: 'p1', sku: 'S' });
    await ProductController.getById({ params: { id: 'p1' } } as any, res, next);
    await ProductController.getByCode({ params: { code: 'S' } } as any, res, next);
    expect(successResponse).toHaveBeenCalledWith(res, { id: 'p1' });
    expect(successResponse).toHaveBeenCalledWith(res, { id: 'p1', sku: 'S' });
  });

  it('update and delete return success response', async () => {
    (ProductService.update as any).mockResolvedValue({ id: 'p1' });
    (ProductService.delete as any).mockResolvedValue({ message: 'ok' });
    await ProductController.update({ params: { id: 'p1' }, body: { name: 'X' } } as any, res, next);
    await ProductController.delete({ params: { id: 'p1' } } as any, res, next);
    expect(successResponse).toHaveBeenCalledWith(res, { id: 'p1' }, 'Producto actualizado exitosamente');
    expect(successResponse).toHaveBeenCalledWith(res, { message: 'ok' });
  });

  it('adjustStock sends req.user id to service', async () => {
    (ProductService.adjustStock as any).mockResolvedValue({ id: 'p1', currentStock: 5 });
    const req = { body: { productId: 'p1', quantity: 1, type: 'ENTRADA' }, user: { id: 'u1' } } as any;
    await ProductController.adjustStock(req, res, next);
    expect(ProductService.adjustStock).toHaveBeenCalledWith(req.body, 'u1');
    expect(successResponse).toHaveBeenCalledWith(res, { id: 'p1', currentStock: 5 }, 'Stock ajustado exitosamente');
  });

  it('list endpoints call service and successResponse', async () => {
    (ProductService.getLowStock as any).mockResolvedValue([{ id: 'p1' }]);
    (ProductService.getOutOfStock as any).mockResolvedValue([]);
    (ProductService.getStats as any).mockResolvedValue({ totalProducts: 1 });
    (ProductService.findByCategory as any).mockResolvedValue([{ id: 'p2' }]);
    (ProductService.getVariants as any).mockResolvedValue([{ id: 'v1' }]);
    (ProductService.getTopSelling as any).mockResolvedValue([{ id: 'p1' }]);

    await ProductController.getLowStock({} as any, res, next);
    await ProductController.getOutOfStock({} as any, res, next);
    await ProductController.getStats({} as any, res, next);
    await ProductController.getByCategory({ params: { categoryId: 'c1' } } as any, res, next);
    await ProductController.getVariants({ params: { id: 'p1' } } as any, res, next);
    await ProductController.getTopSelling({ query: { limit: '3' } } as any, res, next);

    expect(successResponse).toHaveBeenCalled();
    expect(ProductService.getTopSelling).toHaveBeenCalledWith(3);
  });

  it('supplier endpoints call service and response', async () => {
    (ProductService.upsertSupplier as any).mockResolvedValue({ productId: 'p1', supplierId: 's1' });
    (ProductService.removeSupplier as any).mockResolvedValue(undefined);
    await ProductController.upsertSupplier({ params: { id: 'p1' }, body: { supplierId: 's1', supplierPrice: 2 } } as any, res, next);
    await ProductController.removeSupplier({ params: { id: 'p1', supplierId: 's1' } } as any, res, next);
    expect(successResponse).toHaveBeenCalledWith(res, { productId: 'p1', supplierId: 's1' }, 'Proveedor vinculado exitosamente');
    expect(successResponse).toHaveBeenCalledWith(res, null, 'Proveedor desvinculado');
  });

  it('passes errors to next for remaining handlers', async () => {
    const err = new Error('boom');
    (ProductService.findAll as any).mockRejectedValue(err);
    (ProductService.findById as any).mockRejectedValue(err);
    (ProductService.findByCode as any).mockRejectedValue(err);
    (ProductService.update as any).mockRejectedValue(err);
    (ProductService.delete as any).mockRejectedValue(err);
    (ProductService.adjustStock as any).mockRejectedValue(err);
    (ProductService.getLowStock as any).mockRejectedValue(err);
    (ProductService.getOutOfStock as any).mockRejectedValue(err);
    (ProductService.getStats as any).mockRejectedValue(err);
    (ProductService.findByCategory as any).mockRejectedValue(err);
    (ProductService.getVariants as any).mockRejectedValue(err);
    (ProductService.getTopSelling as any).mockRejectedValue(err);
    (ProductService.upsertSupplier as any).mockRejectedValue(err);
    (ProductService.removeSupplier as any).mockRejectedValue(err);

    await ProductController.getAll({ query: {} } as any, res, next);
    await ProductController.getById({ params: { id: 'x' } } as any, res, next);
    await ProductController.getByCode({ params: { code: 'x' } } as any, res, next);
    await ProductController.update({ params: { id: 'x' }, body: {} } as any, res, next);
    await ProductController.delete({ params: { id: 'x' } } as any, res, next);
    await ProductController.adjustStock({ body: {} } as any, res, next);
    await ProductController.getLowStock({} as any, res, next);
    await ProductController.getOutOfStock({} as any, res, next);
    await ProductController.getStats({} as any, res, next);
    await ProductController.getByCategory({ params: { categoryId: 'x' } } as any, res, next);
    await ProductController.getVariants({ params: { id: 'x' } } as any, res, next);
    await ProductController.getTopSelling({ query: {} } as any, res, next);
    await ProductController.upsertSupplier({ params: { id: 'x' }, body: {} } as any, res, next);
    await ProductController.removeSupplier({ params: { id: 'x', supplierId: 'y' } } as any, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});
