import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../../src/middleware/errorHandler';

const jwtFns = vi.hoisted(() => {
  class JsonWebTokenError extends Error {}
  class TokenExpiredError extends Error {}
  return {
    verify: vi.fn(),
    JsonWebTokenError,
    TokenExpiredError,
  };
});

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: jwtFns.verify,
    JsonWebTokenError: jwtFns.JsonWebTokenError,
    TokenExpiredError: jwtFns.TokenExpiredError,
  },
  verify: jwtFns.verify,
  JsonWebTokenError: jwtFns.JsonWebTokenError,
  TokenExpiredError: jwtFns.TokenExpiredError,
}));

vi.mock('../../../src/config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-12345678901234567890123456789012',
  },
}));

vi.mock('../../../src/config/database', () => ({
  prisma: prismaMock,
}));

import { authenticate, requireRole } from '../../../src/middleware/authMiddleware';

describe('middleware/authMiddleware', () => {
  const res = {} as any;
  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('authenticate happy path sets req.user and calls next', async () => {
    const req: any = { headers: { authorization: 'Bearer token' } };
    jwtFns.verify.mockReturnValue({ userId: 'u1', role: 'ADMIN' });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', role: 'ADMIN', isActive: true });

    await authenticate(req, res, next);

    expect(req.user).toEqual({ id: 'u1', role: 'ADMIN' });
    expect(next).toHaveBeenCalledWith();
  });

  it('authenticate fails when token missing', async () => {
    const req: any = { headers: {} };

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Token no proporcionado');
  });

  it('authenticate fails for invalid token', async () => {
    const req: any = { headers: { authorization: 'Bearer bad' } };
    jwtFns.verify.mockImplementation(() => {
      throw new jwtFns.JsonWebTokenError('bad');
    });

    await authenticate(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.message).toBe('Token inválido');
  });

  it('authenticate fails for expired token', async () => {
    const req: any = { headers: { authorization: 'Bearer expired' } };
    jwtFns.verify.mockImplementation(() => {
      throw new jwtFns.TokenExpiredError('expired');
    });

    await authenticate(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.message).toBe('Token expirado');
  });

  it('authenticate fails when user is missing/inactive', async () => {
    const req: any = { headers: { authorization: 'Bearer token' } };
    jwtFns.verify.mockReturnValue({ userId: 'u1', role: 'ADMIN' });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', role: 'ADMIN', isActive: false });

    await authenticate(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Usuario no autorizado');
  });

  it('requireRole fails when req.user missing', () => {
    const req: any = {};
    requireRole('ADMIN')(req, res, next);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
  });

  it('requireRole fails when role not allowed', () => {
    const req: any = { user: { id: 'u1', role: 'VISUALIZADOR' } };
    requireRole('ADMIN', 'VENDEDOR')(req, res, next);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
  });

  it('requireRole passes when role allowed', () => {
    const req: any = { user: { id: 'u1', role: 'ADMIN' } };
    requireRole('ADMIN')(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
