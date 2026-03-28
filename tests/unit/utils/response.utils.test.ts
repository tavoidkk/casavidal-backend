import { describe, expect, it, vi } from 'vitest';
import { errorResponse, paginatedResponse, successResponse } from '../../../src/utils/response';

function makeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('utils/response', () => {
  it('successResponse builds success payload with default status', () => {
    const res = makeRes();

    successResponse(res, { id: 1 }, 'ok');

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'ok',
      data: { id: 1 },
    });
  });

  it('successResponse supports custom status', () => {
    const res = makeRes();
    successResponse(res, { created: true }, 'created', 201);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('errorResponse includes details when provided', () => {
    const res = makeRes();
    errorResponse(res, 'boom', 400, { field: 'email' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'boom',
      details: { field: 'email' },
    });
  });

  it('errorResponse omits details when not provided', () => {
    const res = makeRes();
    errorResponse(res, 'boom');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'boom',
    });
  });

  it('paginatedResponse builds pagination metadata', () => {
    const res = makeRes();
    paginatedResponse(res, [{ id: 1 }], 2, 10, 25);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ id: 1 }],
      pagination: {
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      },
    });
  });
});
