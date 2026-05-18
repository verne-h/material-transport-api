import path from 'path';

const TEST_DB_PATH = path.resolve('./data/test.db');

/**
 * Call this at the top of each integration test suite.
 * Points the app at a dedicated test database file.
 * Must be called before any src/ module is imported.
 */
export function useTestDb(): void {
    process.env['DATABASE_PATH'] = TEST_DB_PATH;
    process.env['NODE_ENV'] = 'test';
    process.env['LOG_LEVEL'] = 'silent';
}
