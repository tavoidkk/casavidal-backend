import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../src/middleware/authMiddleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'u1', role: 'ADMIN' };
    next();
  },
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../src/services/product.service', () => ({
  ProductService: {
    create: vi.fn(),
  },
}));

import productRoutes from '../../src/routes/product.routes';
import { ProductService } from '../../src/services/product.service';

describe('integration/product.routes create pipeline', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/products', productRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when validation fails before controller', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ name: 'x' }); // invalid payload

    expect(res.status).toBe(400);
    expect(ProductService.create).not.toHaveBeenCalled();
  });

  it('returns 201 when request is valid and service resolves', async () => {
    (ProductService.create as any).mockResolvedValue({ id: 'p1', name: 'Producto válido' });

    const res = await request(app)
      .post('/api/products')
      .send({
        name: 'Producto válido',
        sku: 'SKU-INT-1',
        categoryId: '11111111-1111-1111-1111-111111111111',
        costPrice: 10,
        salePrice: 15,
        currentStock: 3,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(ProductService.create).toHaveBeenCalledTimes(1);
  });
});
