import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Wraps an async route handler so any rejected promise is forwarded to next().
 * Without this, unhandled rejections in async routes silently hang the request.
 */
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
}
