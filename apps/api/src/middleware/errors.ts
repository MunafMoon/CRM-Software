import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    res
      .status(400)
      .json({ error: 'Please check the form fields', details: err.flatten() });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const status =
      err.code === 'P2002'
        ? 409
        : err.code === 'P2025'
          ? 404
          : err.code === 'P2003'
            ? 409
            : 500;
    res.status(status).json({
      error:
        status === 409
          ? 'This record conflicts with an existing record or has linked clients.'
          : status === 404
            ? 'Record not found'
            : 'Database request failed',
    });
    return;
  }
  if (err instanceof SyntaxError) {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'An unexpected server error occurred' });
}
