import 'dotenv/config';

function required(key: string): string {
    const value = process.env[key];
    if (!value) throw new Error(`Missing required environment variable: ${key}`);
    return value;
}

function optional(key: string, fallback: string): string {
    return process.env[key] ?? fallback;
}

export const env = {
    NODE_ENV: optional('NODE_ENV', 'development'),
    PORT: parseInt(optional('PORT', '3000'), 10),
    DATABASE_PATH: optional('DATABASE_PATH', './data/app.db'),
    LOG_LEVEL: optional('LOG_LEVEL', 'info'),
} as const;

export type Env = typeof env;
