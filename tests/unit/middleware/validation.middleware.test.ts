import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { validate } from '../../../src/middleware/validation.middleware';

function makeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('middleware/validation.middleware', () => {
  const next = vi.fn();
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('passes valid request (happy path)', () => {
    const schema = z.object({
      body: z.object({ name: z.string().min(2) }),
    });
    const middleware = validate(schema as any);
    const req: any = { body: { name: 'CasaVidal' }, query: {}, params: {} };
    const res = makeRes();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 with zod errors for invalid payload', () => {
    const schema = z.object({
      body: z.object({ name: z.string().min(2) }),
    });
    const middleware = validate(schema as any);
    const req: any = { body: { name: '' }, query: {}, params: {} };
    const res = makeRes();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Validation error',
        errors: expect.any(Array),
      }),
    );
  });

  it('returns 400 generic validation error for non-zod throws', () => {
    const middleware = validate({ parse: () => { throw new Error('unexpected'); } } as any);
    const req: any = { body: {}, query: {}, params: {} };
    const res = makeRes();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Validation error' });
  });

  it('restores console spy', () => {
    consoleSpy.mockRestore();
    expect(true).toBe(true);
  });
});
