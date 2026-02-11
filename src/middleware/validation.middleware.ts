import { NextFunction, Request, Response } from 'express';
import { ZodError, AnyZodObject } from 'zod';

export const validate =
  (schema: AnyZodObject) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        console.error('❌ ZOD ERROR:', JSON.stringify(error.errors, null, 2));
        return res.status(400).json({
          message: 'Validation error',
          errors: error.errors,
        });
      }

      console.error('❌ VALIDATION ERROR:', error);
      return res.status(400).json({ message: 'Validation error' });
    }
  };