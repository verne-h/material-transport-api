import db from './client';
import { logger } from '../config/logger';

export function migrate(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sites (
      id          INTEGER PRIMARY KEY,
      name        TEXT    NOT NULL,
      address     TEXT    NOT NULL,
      description TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS materials (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT    NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS trucks (
      id       INTEGER PRIMARY KEY,
      site_id  INTEGER NOT NULL REFERENCES sites(id),
      license  TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number  INTEGER NOT NULL,
      truck_id       INTEGER NOT NULL REFERENCES trucks(id),
      site_id        INTEGER NOT NULL REFERENCES sites(id),
      material_id    INTEGER NOT NULL REFERENCES materials(id),
      dispatched_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      UNIQUE (site_id, ticket_number)
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_truck_id ON tickets(truck_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_site_id  ON tickets(site_id);
    CREATE INDEX IF NOT EXISTS idx_trucks_site_id   ON trucks(site_id);

    -- Enforce no two tickets for the same truck at the exact same dispatch time
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_truck_dispatched_at
      ON tickets(truck_id, dispatched_at);
  `);

  logger.info('Database migration complete');
}

// Allow running directly: npm run db:migrate
if (require.main === module) {
  migrate();
  process.exit(0);
}
