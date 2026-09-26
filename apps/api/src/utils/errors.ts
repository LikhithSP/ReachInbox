import { Response } from 'express';

export interface AppErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
  requestId?: string;
}

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: Record<string, unknown> | null;

  constructor(statusCode: number, code: string, message: string, details?: Record<string, unknown> | null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function sendError(res: Response, statusCode: number, code: string, message: string, details?: Record<string, unknown> | null, requestId?: string) {
  return res.status(statusCode).json({
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(requestId ? { requestId } : {}),
    }
  });
}
