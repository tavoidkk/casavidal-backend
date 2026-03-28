import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupplierController } from '../../src/controllers/supplier.controller';
import { SupplierService } from '../../src/services/supplier.service';
import { paginatedResponse, successResponse } from '../../src/utils/response';

vi.mock('../../src/services/supplier.service', () => ({
  SupplierService: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../../src/utils/response', () => ({
  successResponse: vi.fn(),
  paginatedResponse: vi.fn(),
}));

describe('SupplierController', () => {
  const res = {} as any;
  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll should call service and paginatedResponse', async () => {
    const req = { query: { search: 'abc', page: '2', limit: '5' } } as any;
    (SupplierService.findAll as any).mockResolvedValue({
      suppliers: [{ id: 's1' }],
      pagination: { page: 2, limit: 5, total: 1, totalPages: 1 },
    });

    await SupplierController.getAll(req, res, next);

    expect(SupplierService.findAll).toHaveBeenCalledWith({ search: 'abc', page: 2, limit: 5 });
    expect(paginatedResponse).toHaveBeenCalledWith(res, [{ id: 's1' }], 2, 5, 1);
    expect(next).not.toHaveBeenCalled();
  });

  it('getAll should pass error to next', async () => {
    const req = { query: {} } as any;
    const error = new Error('list failed');
    (SupplierService.findAll as any).mockRejectedValue(error);

    await SupplierController.getAll(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('getById should call service and successResponse', async () => {
    const req = { params: { id: 's1' } } as any;
    const supplier = { id: 's1', name: 'Proveedor' };
    (SupplierService.findById as any).mockResolvedValue(supplier);

    await SupplierController.getById(req, res, next);

    expect(SupplierService.findById).toHaveBeenCalledWith('s1');
    expect(successResponse).toHaveBeenCalledWith(res, supplier);
  });

  it('create should call service and successResponse with 201', async () => {
    const req = { body: { name: 'Nuevo' } } as any;
    const created = { id: 's2', name: 'Nuevo' };
    (SupplierService.create as any).mockResolvedValue(created);

    await SupplierController.create(req, res, next);

    expect(SupplierService.create).toHaveBeenCalledWith({ name: 'Nuevo' });
    expect(successResponse).toHaveBeenCalledWith(res, created, 'Proveedor creado exitosamente', 201);
  });

  it('update should call service and successResponse', async () => {
    const req = { params: { id: 's1' }, body: { name: 'Editado' } } as any;
    const updated = { id: 's1', name: 'Editado' };
    (SupplierService.update as any).mockResolvedValue(updated);

    await SupplierController.update(req, res, next);

    expect(SupplierService.update).toHaveBeenCalledWith('s1', { name: 'Editado' });
    expect(successResponse).toHaveBeenCalledWith(res, updated, 'Proveedor actualizado exitosamente');
  });

  it('remove should call service and successResponse', async () => {
    const req = { params: { id: 's1' } } as any;
    (SupplierService.remove as any).mockResolvedValue(undefined);

    await SupplierController.remove(req, res, next);

    expect(SupplierService.remove).toHaveBeenCalledWith('s1');
    expect(successResponse).toHaveBeenCalledWith(res, null, 'Proveedor eliminado exitosamente');
  });

  it('controller methods should pass service errors to next', async () => {
    const error = new Error('boom');
    (SupplierService.findById as any).mockRejectedValue(error);
    (SupplierService.create as any).mockRejectedValue(error);
    (SupplierService.update as any).mockRejectedValue(error);
    (SupplierService.remove as any).mockRejectedValue(error);

    await SupplierController.getById({ params: { id: 'x' } } as any, res, next);
    await SupplierController.create({ body: {} } as any, res, next);
    await SupplierController.update({ params: { id: 'x' }, body: {} } as any, res, next);
    await SupplierController.remove({ params: { id: 'x' } } as any, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
