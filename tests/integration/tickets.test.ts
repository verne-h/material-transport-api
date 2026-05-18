import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { useTestDb } from '../helpers/db';

useTestDb();

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createApp } = require('../../src/app');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { migrate } = require('../../src/db/migrate');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const db = require('../../src/db/client').default;

const app = (() => {
    migrate();
    return createApp();
})();

function seedTestData() {
    // Clear tables in FK-safe order so re-runs start clean
    db.prepare('DELETE FROM tickets').run();
    db.prepare('DELETE FROM trucks').run();
    db.prepare('DELETE FROM sites').run();
    db.prepare('DELETE FROM materials').run();

    db.prepare("INSERT INTO sites (id, name, address, description) VALUES (1, 'Alpha Site', '1 Main St', 'desc')").run();
    db.prepare("INSERT INTO sites (id, name, address, description) VALUES (2, 'Beta Site', '2 Second St', 'desc')").run();
    db.prepare("INSERT INTO materials (id, name) VALUES (1, 'Soil')").run();
    db.prepare("INSERT INTO trucks (id, site_id, license) VALUES (1, 1, 'ABC-001')").run();
    db.prepare("INSERT INTO trucks (id, site_id, license) VALUES (2, 2, 'XYZ-002')").run();
}

beforeAll(() => seedTestData());
afterEach(() => db.prepare('DELETE FROM tickets').run());
afterAll(() => {
    const dbPath = path.resolve(process.env['DATABASE_PATH'] ?? './data/test.db');
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
});

// Input format sent in request bodies
const PAST = '2026-01-14 10:00:00';
const PAST2 = '2026-01-15 10:00:00';
const PAST3 = '2026-01-15 11:00:00';
const FUTURE = '2099-12-31 23:59:59';

// Normalized ISO values returned in responses
const PAST_ISO = '2026-01-14T10:00:00.000Z';
const PAST2_ISO = '2026-01-15T10:00:00.000Z';

function bulkBody(truckId: number, times: string[]) {
    return {
        truckId,
        tickets: times.map((dispatchedAt) => ({ materialId: 1, dispatchedAt })),
    };
}

// ─── GET /v1/tickets ─────────────────────────────────────────────────────────

describe('GET /v1/tickets', () => {
    it('returns empty array when no tickets exist', async () => {
        const res = await request(app).get('/v1/tickets');
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
    });

    it('returns tickets with joined view fields', async () => {
        await request(app).post('/v1/tickets/bulk').send(bulkBody(1, [PAST]));

        const res = await request(app).get('/v1/tickets');
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0]).toMatchObject({
            ticketNumber: 1,
            dispatchedAt: PAST_ISO,
            siteName: 'Alpha Site',
            truckLicense: 'ABC-001',
            materialName: 'Soil',
        });
    });

    it('filters by siteId', async () => {
        await request(app).post('/v1/tickets/bulk').send(bulkBody(1, [PAST]));
        await request(app).post('/v1/tickets/bulk').send(bulkBody(2, [PAST]));

        const res = await request(app).get('/v1/tickets?siteId=1');
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].siteName).toBe('Alpha Site');
    });

    it('filters by multiple siteIds', async () => {
        await request(app).post('/v1/tickets/bulk').send(bulkBody(1, [PAST]));
        await request(app).post('/v1/tickets/bulk').send(bulkBody(2, [PAST]));

        const res = await request(app).get('/v1/tickets?siteId=1&siteId=2');
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(2);
    });

    it('filters by startDate', async () => {
        await request(app).post('/v1/tickets/bulk').send(bulkBody(1, [PAST, PAST2]));

        const res = await request(app).get('/v1/tickets?startDate=2026-01-15');
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].dispatchedAt).toBe(PAST2_ISO);
    });

    it('filters by endDate', async () => {
        await request(app).post('/v1/tickets/bulk').send(bulkBody(1, [PAST, PAST2]));

        const res = await request(app).get('/v1/tickets?endDate=2026-01-14');
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].dispatchedAt).toBe(PAST_ISO);
    });

    it('paginates results with default limit of 25', async () => {
        await request(app).post('/v1/tickets/bulk').send(bulkBody(1, [PAST]));
        await request(app).post('/v1/tickets/bulk').send(bulkBody(1, [PAST2]));

        const res = await request(app).get('/v1/tickets?limit=1&page=1');
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
    });

    it('returns second page when paginating', async () => {
        await request(app).post('/v1/tickets/bulk').send(bulkBody(1, [PAST]));
        await request(app).post('/v1/tickets/bulk').send(bulkBody(1, [PAST2]));

        const res = await request(app).get('/v1/tickets?limit=1&page=2');
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
    });
});

// ─── POST /v1/tickets/bulk ───────────────────────────────────────────────────

describe('POST /v1/tickets/bulk', () => {
    it('creates multiple tickets and returns 201 with view shape', async () => {
        const res = await request(app)
            .post('/v1/tickets/bulk')
            .send(bulkBody(1, [PAST, PAST2]));

        expect(res.status).toBe(201);
        expect(res.body.data).toHaveLength(2);
        expect(res.body.data[0]).toMatchObject({
            ticketNumber: 1,
            siteName: 'Alpha Site',
            truckLicense: 'ABC-001',
            materialName: 'Soil',
        });
        expect(res.body.data[1].ticketNumber).toBe(2);
    });

    it('ticket numbers increment per site across calls', async () => {
        await request(app).post('/v1/tickets/bulk').send(bulkBody(1, [PAST]));
        const res = await request(app).post('/v1/tickets/bulk').send(bulkBody(1, [PAST2]));

        expect(res.body.data[0].ticketNumber).toBe(2);
    });

    it('returns 400 when a ticket is dispatched in the future', async () => {
        const res = await request(app)
            .post('/v1/tickets/bulk')
            .send(bulkBody(1, [FUTURE]));

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 409 when two tickets in the batch share a dispatch time', async () => {
        const res = await request(app)
            .post('/v1/tickets/bulk')
            .send(bulkBody(1, [PAST, PAST]));

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('CONFLICT');
    });

    it('returns 409 when dispatch time conflicts with an existing ticket for the same truck', async () => {
        await request(app).post('/v1/tickets/bulk').send(bulkBody(1, [PAST]));

        const res = await request(app)
            .post('/v1/tickets/bulk')
            .send(bulkBody(1, [PAST, PAST3]));

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('CONFLICT');
    });

    it('allows the same dispatch time for different trucks', async () => {
        await request(app).post('/v1/tickets/bulk').send(bulkBody(1, [PAST]));

        const res = await request(app)
            .post('/v1/tickets/bulk')
            .send(bulkBody(2, [PAST]));

        expect(res.status).toBe(201);
    });

    it('returns 404 when truck does not exist', async () => {
        const res = await request(app)
            .post('/v1/tickets/bulk')
            .send(bulkBody(9999, [PAST]));

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 400 when tickets array is missing', async () => {
        const res = await request(app)
            .post('/v1/tickets/bulk')
            .send({ truckId: 1 });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when tickets array is empty', async () => {
        const res = await request(app)
            .post('/v1/tickets/bulk')
            .send({ truckId: 1, tickets: [] });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
});
