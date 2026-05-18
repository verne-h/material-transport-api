import express from 'express';
import pinoHttp from 'pino-http';
import * as OpenApiValidator from 'express-openapi-validator';
import path from 'path';
import { logger } from './config/logger';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';
import { ticketsRouter } from './resources/tickets/tickets.router';

export function createApp(): express.Application {
    const app = express();

    app.use(express.json());
    app.use(pinoHttp({ logger }));

    app.use(
        OpenApiValidator.middleware({
            apiSpec: path.resolve(__dirname, 'openapi/spec.yaml'),
            validateRequests: true,
            validateResponses: false,
        }),
    );

    app.use('/v1/tickets', ticketsRouter);

    app.use(notFound);
    app.use(errorHandler);

    return app;
}