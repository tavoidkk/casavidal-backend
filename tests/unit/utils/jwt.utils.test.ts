import { beforeEach, describe, expect, it, vi } from 'vitest';

const jwtFns = vi.hoisted(() => ({
  sign: vi.fn(),
  verify: vi.fn(),
}));

vi.mock('jsonwebtoken', () => ({
  sign: jwtFns.sign,
  verify: jwtFns.verify,
}));

vi.mock('../../../src/config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-12345678901234567890123456789012',
    JWT_EXPIRES_IN: '7d',
  },
}));

import { generateToken, verifyToken } from '../../../src/utils/jwt';

describe('utils/jwt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generateToken signs payload with env secret and expiresIn', () => {
    jwtFns.sign.mockReturnValue('token-value');

    const token = generateToken('user-1', 'ADMIN');

    expect(token).toBe('token-value');
    expect(jwtFns.sign).toHaveBeenCalledWith(
      { userId: 'user-1', role: 'ADMIN' },
      'test-secret-12345678901234567890123456789012',
      { expiresIn: '7d' },
    );
  });

  it('verifyToken returns decoded payload', () => {
    jwtFns.verify.mockReturnValue({ userId: 'u2', role: 'VENDEDOR' });

    const payload = verifyToken('raw-token');

    expect(jwtFns.verify).toHaveBeenCalledWith('raw-token', 'test-secret-12345678901234567890123456789012');
    expect(payload).toEqual({ userId: 'u2', role: 'VENDEDOR' });
  });
});
