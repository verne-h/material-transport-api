import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../config/logger';

interface ErrorResponse {
    error: {
        code: string;
        message: string;
        stack?: string;
    };
}

// Shape emitted by express-openapi-validator
interface OpenApiValidatorError {
    status: number;
    message: string;
    errors: Array<{ path: string; message: string; errorCode: string }>;
}

function isOpenApiValidatorError(err: unknown): err is OpenApiValidatorError {
    return (
        typeof err === 'object' &&
        err !== null &&
        'status' in err &&
        'errors' in err &&
        Array.isArray((err as OpenApiValidatorError).errors)
    );
}

// Express identifies error middleware by its 4-argument signature
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
    if (isOpenApiValidatorError(err)) {
        const isNotFound = err.status === 404;
        const code = isNotFound ? 'NOT_FOUND' : 'VALIDATION_ERROR';
        const message = isNotFound
            ? err.message
            : err.errors.map((e) => `${e.path} ${e.message}`).join('; ');
        logger.warn({ err, req: { method: req.method, url: req.url } }, message);
        res.status(err.status).json({ error: { code, message } } satisfies ErrorResponse);
        return;
    }

    if (err instanceof AppError) {
        // Known application error — log at warn level (not an unexpected crash)
        logger.warn({ err, req: { method: req.method, url: req.url } }, err.message);
        res.status(err.statusCode).json({ error: { code: err.code, message: err.message } } satisfies ErrorResponse);
        return;
    }

    // Unknown error — log at error level with full details
    logger.error({ err, req: { method: req.method, url: req.url } }, 'Unhandled error');

    const body: ErrorResponse = {
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
            ...(process.env['NODE_ENV'] !== 'production' && {
                stack: err instanceof Error ? err.stack : String(err),
            }),
        },
    };

    res.status(500).json(body);
}
