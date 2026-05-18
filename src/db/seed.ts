import path from 'path';
import fs from 'fs';
import db from './client';
import { migrate } from './migrate';
import { logger } from '../config/logger';

interface SiteRecord {
    id: number;
    name: string;
    address: string;
    description: string;
}

interface TruckRecord {
    id: number;
    siteId: number;
    license: string;
}

function loadJson<T>(filename: string): T[] {
    const filePath = path.resolve(__dirname, '../../data', filename);
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T[];
}

function seed(): void {
    migrate();

    const existingSites = (db.prepare('SELECT COUNT(*) as count FROM sites').get() as { count: number }).count;
    if (existingSites > 0) {
        logger.info('Seed data already present — skipping');
        return;
    }

    const sites = loadJson<SiteRecord>('SitesJSONData.json');
    const trucks = loadJson<TruckRecord>('TrucksJSONData.json');

    logger.info({ sites: sites.length, trucks: trucks.length }, 'Seeding database');

    // Wrap all inserts in a single transaction — orders of magnitude faster than
    // individual inserts for large datasets
    const insertAll = db.transaction(() => {
        const insertSite = db.prepare(
            'INSERT OR IGNORE INTO sites (id, name, address, description) VALUES (?, ?, ?, ?)',
        );
        for (const s of sites) {
            insertSite.run(s.id, s.name, s.address, s.description);
        }

        const insertTruck = db.prepare(
            'INSERT OR IGNORE INTO trucks (id, site_id, license) VALUES (?, ?, ?)',
        );
        for (const t of trucks) {
            insertTruck.run(t.id, t.siteId, t.license);
        }

        // Seed the only material defined so far
        db.prepare("INSERT OR IGNORE INTO materials (name) VALUES ('Soil')").run();
    });

    insertAll();

    logger.info('Seed complete');
}

// Allow running directly: npm run db:seed
if (require.main === module) {
    seed();
    process.exit(0);
}

export { seed };
