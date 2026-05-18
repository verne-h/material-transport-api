export class AppError extends Error {
    constructor(
        public readonly statusCode: number,
        public readonly code: string,
        message: string,
    ) {
        super(message);
        this.name = 'AppError';
        // Restore the prototype chain so `instanceof AppError` works after transpilation
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string) {
        super(404, 'NOT_FOUND', `${resource} not found`);
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(400, 'VALIDATION_ERROR', message);
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(409, 'CONFLICT', message);
    }
}
