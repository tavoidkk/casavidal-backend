import { beforeEach, describe, expect, it, vi } from 'vitest';

const bcryptFns = vi.hoisted(() => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: bcryptFns.hash,
    compare: bcryptFns.compare,
  },
}));

import { hashPassword, comparePassword } from '../../../src/utils/password';

describe('utils/password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hashPassword hashes using SALT_ROUNDS=10', async () => {
    bcryptFns.hash.mockResolvedValue('hashed-pass');

    const hashed = await hashPassword('plain');

    expect(hashed).toBe('hashed-pass');
    expect(bcryptFns.hash).toHaveBeenCalledWith('plain', 10);
  });

  it('comparePassword returns bcrypt compare result true', async () => {
    bcryptFns.compare.mockResolvedValue(true);

    const ok = await comparePassword('plain', 'hashed');

    expect(ok).toBe(true);
    expect(bcryptFns.compare).toHaveBeenCalledWith('plain', 'hashed');
  });

  it('comparePassword returns bcrypt compare result false', async () => {
    bcryptFns.compare.mockResolvedValue(false);

    const ok = await comparePassword('wrong', 'hashed');

    expect(ok).toBe(false);
    expect(bcryptFns.compare).toHaveBeenCalledWith('wrong', 'hashed');
  });
});
