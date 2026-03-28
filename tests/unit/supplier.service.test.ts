import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupplierService } from '../../src/services/supplier.service';
import { AppError } from '../../src/middleware/errorHandler';

const prismaMock = vi.hoisted(() => ({
  supplier: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

describe('SupplierService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('creates supplier successfully with rif validation', async () => {
      const input = { name: 'Proveedor A', rif: 'J-123', phone: '0412' };
      const created = { id: 'sup-1', ...input, isActive: true };

      prismaMock.supplier.findUnique.mockResolvedValue(null);
      prismaMock.supplier.create.mockResolvedValue(created);

      const result = await SupplierService.create(input);

      expect(prismaMock.supplier.findUnique).toHaveBeenCalledWith({ where: { rif: 'J-123' } });
      expect(prismaMock.supplier.create).toHaveBeenCalledWith({
        data: { ...input, phone: '0412' },
      });
      expect(result).toEqual(created);
    });

    it('creates supplier and defaults phone to empty string', async () => {
      const input = { name: 'Proveedor B' };
      const created = { id: 'sup-2', ...input, phone: '', isActive: true };

      prismaMock.supplier.create.mockResolvedValue(created);

      const result = await SupplierService.create(input);

      expect(prismaMock.supplier.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.supplier.create).toHaveBeenCalledWith({
        data: { ...input, phone: '' },
      });
      expect(result).toEqual(created);
    });

    it('throws AppError(409) when rif already exists', async () => {
      prismaMock.supplier.findUnique.mockResolvedValue({ id: 'existing', rif: 'J-123' });

      await expect(SupplierService.create({ name: 'Proveedor', rif: 'J-123' })).rejects.toThrow(AppError);
      await expect(SupplierService.create({ name: 'Proveedor', rif: 'J-123' })).rejects.toMatchObject({
        statusCode: 409,
        message: 'Ya existe un proveedor con ese RIF',
      });
      expect(prismaMock.supplier.create).not.toHaveBeenCalled();
    });

    it('propagates generic database failures on create', async () => {
      prismaMock.supplier.findUnique.mockResolvedValue(null);
      prismaMock.supplier.create.mockRejectedValue(new Error('DB unavailable'));

      await expect(SupplierService.create({ name: 'Proveedor C', rif: 'J-999' })).rejects.toThrow('DB unavailable');
    });
  });

  describe('findAll', () => {
    it('returns paginated active suppliers with default pagination', async () => {
      const suppliers = [{ id: 's1', name: 'A', isActive: true }];
      prismaMock.supplier.findMany.mockResolvedValue(suppliers);
      prismaMock.supplier.count.mockResolvedValue(1);

      const result = await SupplierService.findAll({});

      expect(prismaMock.supplier.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        skip: 0,
        take: 20,
      });
      expect(prismaMock.supplier.count).toHaveBeenCalledWith({ where: { isActive: true } });
      expect(result).toEqual({
        suppliers,
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
    });

    it('applies search filter and custom pagination', async () => {
      prismaMock.supplier.findMany.mockResolvedValue([]);
      prismaMock.supplier.count.mockResolvedValue(0);

      await SupplierService.findAll({ search: 'ferre', page: 2, limit: 5 });

      expect(prismaMock.supplier.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [
            { name: { contains: 'ferre', mode: 'insensitive' } },
            { rif: { contains: 'ferre', mode: 'insensitive' } },
            { contactName: { contains: 'ferre', mode: 'insensitive' } },
          ],
        },
        orderBy: { name: 'asc' },
        skip: 5,
        take: 5,
      });
    });

    it('propagates generic database failures on list', async () => {
      prismaMock.supplier.findMany.mockRejectedValue(new Error('DB list error'));

      await expect(SupplierService.findAll({})).rejects.toThrow('DB list error');
    });
  });

  describe('findById', () => {
    it('returns supplier with productSuppliers include when active', async () => {
      const supplier = { id: 's1', name: 'Proveedor', isActive: true, productSuppliers: [] };
      prismaMock.supplier.findUnique.mockResolvedValue(supplier);

      const result = await SupplierService.findById('s1');

      expect(prismaMock.supplier.findUnique).toHaveBeenCalledWith({
        where: { id: 's1' },
        include: {
          productSuppliers: {
            include: { product: { select: { id: true, name: true, sku: true } } },
            where: { product: { isActive: true } },
          },
        },
      });
      expect(result).toEqual(supplier);
    });

    it('throws AppError(404) when supplier does not exist', async () => {
      prismaMock.supplier.findUnique.mockResolvedValue(null);

      await expect(SupplierService.findById('missing')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Proveedor no encontrado',
      });
    });

    it('throws AppError(404) when supplier is inactive', async () => {
      prismaMock.supplier.findUnique.mockResolvedValue({ id: 'inactive', isActive: false });

      await expect(SupplierService.findById('inactive')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Proveedor no encontrado',
      });
    });
  });

  describe('update', () => {
    it('updates supplier successfully when active and no rif conflict', async () => {
      const existing = { id: 's1', rif: 'J-111', isActive: true };
      const updated = { id: 's1', name: 'Nuevo Nombre', rif: 'J-111', isActive: true };
      prismaMock.supplier.findUnique.mockResolvedValueOnce(existing);
      prismaMock.supplier.update.mockResolvedValue(updated);

      const result = await SupplierService.update('s1', { name: 'Nuevo Nombre' });

      expect(prismaMock.supplier.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { name: 'Nuevo Nombre' },
      });
      expect(result).toEqual(updated);
    });

    it('checks rif uniqueness when rif changes and updates', async () => {
      const existing = { id: 's1', rif: 'J-111', isActive: true };
      const updated = { id: 's1', rif: 'J-222', isActive: true };
      prismaMock.supplier.findUnique
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null);
      prismaMock.supplier.update.mockResolvedValue(updated);

      const result = await SupplierService.update('s1', { rif: 'J-222' });

      expect(prismaMock.supplier.findUnique).toHaveBeenNthCalledWith(2, { where: { rif: 'J-222' } });
      expect(result).toEqual(updated);
    });

    it('throws AppError(404) when supplier to update is missing', async () => {
      prismaMock.supplier.findUnique.mockResolvedValue(null);

      await expect(SupplierService.update('missing', { name: 'X' })).rejects.toMatchObject({
        statusCode: 404,
        message: 'Proveedor no encontrado',
      });
      expect(prismaMock.supplier.update).not.toHaveBeenCalled();
    });

    it('throws AppError(404) when supplier to update is inactive', async () => {
      prismaMock.supplier.findUnique.mockResolvedValue({ id: 's1', isActive: false });

      await expect(SupplierService.update('s1', { name: 'X' })).rejects.toMatchObject({
        statusCode: 404,
        message: 'Proveedor no encontrado',
      });
    });

    it('throws AppError(409) when new rif already exists', async () => {
      prismaMock.supplier.findUnique
        .mockResolvedValueOnce({ id: 's1', rif: 'J-111', isActive: true })
        .mockResolvedValueOnce({ id: 's2', rif: 'J-222', isActive: true });

      await expect(SupplierService.update('s1', { rif: 'J-222' })).rejects.toMatchObject({
        statusCode: 409,
        message: 'Ya existe un proveedor con ese RIF',
      });
      expect(prismaMock.supplier.update).not.toHaveBeenCalled();
    });

    it('propagates generic database failures on update', async () => {
      prismaMock.supplier.findUnique.mockResolvedValue({ id: 's1', rif: 'J-111', isActive: true });
      prismaMock.supplier.update.mockRejectedValue(new Error('DB update error'));

      await expect(SupplierService.update('s1', { name: 'Err' })).rejects.toThrow('DB update error');
    });
  });

  describe('remove', () => {
    it('soft-deletes supplier successfully', async () => {
      const existing = { id: 's1', isActive: true };
      const removed = { id: 's1', isActive: false };
      prismaMock.supplier.findUnique.mockResolvedValue(existing);
      prismaMock.supplier.update.mockResolvedValue(removed);

      const result = await SupplierService.remove('s1');

      expect(prismaMock.supplier.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { isActive: false },
      });
      expect(result).toEqual(removed);
    });

    it('throws AppError(404) when supplier to remove is missing', async () => {
      prismaMock.supplier.findUnique.mockResolvedValue(null);

      await expect(SupplierService.remove('missing')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Proveedor no encontrado',
      });
    });

    it('throws AppError(404) when supplier to remove is inactive', async () => {
      prismaMock.supplier.findUnique.mockResolvedValue({ id: 's1', isActive: false });

      await expect(SupplierService.remove('s1')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Proveedor no encontrado',
      });
    });

    it('propagates generic database failures on remove', async () => {
      prismaMock.supplier.findUnique.mockResolvedValue({ id: 's1', isActive: true });
      prismaMock.supplier.update.mockRejectedValue(new Error('DB remove error'));

      await expect(SupplierService.remove('s1')).rejects.toThrow('DB remove error');
    });
  });
});
