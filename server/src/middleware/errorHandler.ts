// server/src/middleware/errorHandler.ts
// Global error handling middleware for API

import { Request, Response, NextFunction } from 'express';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  // Handle known API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code || 'UNKNOWN_ERROR',
    });
  }

  // Handle constraint violations
  if (err instanceof Error && err.message.includes('Cannot delete')) {
    return res.status(409).json({
      error: err.message,
      code: 'CONSTRAINT_VIOLATION',
    });
  }

  if (err instanceof Error && err.message.includes('Invalid')) {
    return res.status(400).json({
      error: err.message,
      code: 'VALIDATION_ERROR',
    });
  }

  // Handle database errors
  if (err instanceof Error && (err.message.includes('duplicate key') || err.message.includes('UNIQUE'))) {
    return res.status(409).json({
      error: 'Resource already exists',
      code: 'DUPLICATE_RESOURCE',
    });
  }

  if (err instanceof Error && err.message.includes('foreign key')) {
    return res.status(400).json({
      error: 'Invalid reference to related resource',
      code: 'INVALID_REFERENCE',
    });
  }

  // Default error response
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND',
  });
};
