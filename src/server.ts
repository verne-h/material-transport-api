import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { migrate } from './db/migrate';

// Run migrations on every startup so deployments are self-healing
migrate();

const app = createApp();

const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server started');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received — shutting down');
    server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
    logger.info('SIGINT received — shutting down');
    server.close(() => process.exit(0));
});
