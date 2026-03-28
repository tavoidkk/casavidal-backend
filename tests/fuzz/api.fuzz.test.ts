import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { app } from '../../src/app';

function randomString(size = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-={}[]|:;"<>,.?/~`';
  let out = '';
  for (let i = 0; i < size; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function randomPayload() {
  const variants: unknown[] = [
    null,
    true,
    false,
    Math.random() * 10000,
    randomString(128),
    [],
    [randomString(8), Math.random()],
    { a: randomString(8), b: Math.random(), c: { nested: randomString(64) } },
    { email: randomString(20), password: '' },
    { email: `${randomString(20)}@`, password: randomString(2) },
    { email: `${randomString(8)}@example.com`, password: randomString(3000) },
  ];
  return variants[Math.floor(Math.random() * variants.length)];
}

function toJsonBody(payload: unknown): string {
  if (typeof payload === 'string') return payload;
  return JSON.stringify(payload);
}

function randomInvalidLoginObject() {
  const variants = [
    {},
    { email: randomString(5), password: '' },
    { email: `${randomString(12)}@`, password: randomString(2) },
    { email: 1234, password: true },
    { foo: randomString(10), bar: Math.random() },
    { email: null, password: null },
  ];
  return variants[Math.floor(Math.random() * variants.length)];
}

describe('API Fuzz Testing', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should keep /health stable under random query noise', async () => {
    for (let i = 0; i < 50; i++) {
      const res = await request(app)
        .get(`/health?noise=${encodeURIComponent(randomString(64))}&n=${Math.random()}`);
      expect(res.status).toBe(200);
      expect(res.body?.success).toBe(true);
    }
  });

  it('should return controlled errors (never 5xx) for random unknown API routes', async () => {
    for (let i = 0; i < 80; i++) {
      const payload = { noise: randomPayload(), tag: randomString(8) };
      const res = await request(app)
        .post(`/api/${randomString(10)}/${randomString(6)}`)
        .set('Content-Type', 'application/json')
        .send(toJsonBody(payload));
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    }
  });

  it('should reject malformed login payloads without crashing', async () => {
    for (let i = 0; i < 40; i++) {
      const payload = randomInvalidLoginObject();
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send(toJsonBody(payload));

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    }
  });
});
