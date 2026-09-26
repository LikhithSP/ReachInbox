import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AppError, sendError } from '../utils/errors';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const reqId = (req.headers['x-request-id'] as string) || `req_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  res.setHeader('x-request-id', reqId);
  (req as any).requestId = reqId;
  next();
}

export function errorHandlerMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  const reqId = (req as any).requestId;

  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.code, err.message, err.details, reqId);
  }

  // Handle Zod or validation errors if not caught earlier
  if (err.name === 'ZodError') {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Validation failed', { issues: err.issues }, reqId);
  }

  console.error(`[Error] Request ${reqId}:`, err);

  return sendError(
    res,
    500,
    'INTERNAL_SERVER_ERROR',
    'An unexpected error occurred. Please try again later.',
    null,
    reqId
  );
}
