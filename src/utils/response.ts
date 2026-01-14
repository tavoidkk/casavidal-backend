import { Response } from 'express';

export const successResponse = (
  res: Response,
  data: any,
  message?: string,
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const errorResponse = (
  res: Response,
  message: string,
  statusCode = 500,
  details?: any
) => {
  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(details && { details }),
  });
};

export const paginatedResponse = (
  res: Response,
  data: any[],
  page: number,
  limit: number,
  total: number
) => {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
};