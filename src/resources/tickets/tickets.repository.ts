import db from '../../db/client';
import { TicketView, TicketFilters, BulkCreateTicketItem } from './tickets.types';

interface TicketViewRow {
    id: number;
    ticket_number: number;
    dispatched_at: string;
    site_name: string;
    truck_license: string;
    material_name: string;
}

function toTicketView(row: TicketViewRow): TicketView {
    return {
        id: row.id,
        ticketNumber: row.ticket_number,
        dispatchedAt: row.dispatched_at,
        siteName: row.site_name,
        truckLicense: row.truck_license,
        materialName: row.material_name,
    };
}

const TICKET_VIEW_SELECT = `
    SELECT
        t.id,
        t.ticket_number,
        t.dispatched_at,
        s.name  AS site_name,
        tr.license AS truck_license,
        m.name  AS material_name
    FROM tickets t
    JOIN sites     s  ON t.site_id     = s.id
    JOIN trucks    tr ON t.truck_id    = tr.id
    JOIN materials m  ON t.material_id = m.id
`;

export function findTickets(filters: TicketFilters): TicketView[] {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filters.siteIds && filters.siteIds.length > 0) {
        const placeholders = filters.siteIds.map(() => '?').join(', ');
        conditions.push(`t.site_id IN (${placeholders})`);
        params.push(...filters.siteIds);
    }
    if (filters.startDate) {
        conditions.push('t.dispatched_at >= ?');
        params.push(filters.startDate);
    }
    if (filters.endDate) {
        conditions.push('t.dispatched_at <= ?');
        params.push(filters.endDate);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit ?? 25;
    const offset = ((filters.page ?? 1) - 1) * limit;
    const sql = `${TICKET_VIEW_SELECT} ${where} ORDER BY t.dispatched_at DESC LIMIT ? OFFSET ?`;

    const rows = db.prepare(sql).all(...params, limit, offset) as TicketViewRow[];
    return rows.map(toTicketView);
}

/** Returns the dispatch times that already exist for this truck (for conflict detection). */
export function findConflictingDispatchTimes(truckId: number, dispatchedAts: string[]): string[] {
    if (dispatchedAts.length === 0) return [];
    const placeholders = dispatchedAts.map(() => '?').join(', ');
    const rows = db
        .prepare(
            `SELECT dispatched_at FROM tickets WHERE truck_id = ? AND dispatched_at IN (${placeholders})`,
        )
        .all(truckId, ...dispatchedAts) as { dispatched_at: string }[];
    return rows.map((r) => r.dispatched_at);
}

export function insertTicketsBulk(
    truckId: number,
    siteId: number,
    items: BulkCreateTicketItem[],
): TicketView[] {
    const insertedIds: number[] = [];

    const bulkInsert = db.transaction(() => {
        const { max } = db
            .prepare('SELECT COALESCE(MAX(ticket_number), 0) AS max FROM tickets WHERE site_id = ?')
            .get(siteId) as { max: number };

        const stmt = db.prepare(
            `INSERT INTO tickets (ticket_number, truck_id, site_id, material_id, dispatched_at)
             VALUES (?, ?, ?, ?, ?)`,
        );

        items.forEach((item, i) => {
            const result = stmt.run(max + i + 1, truckId, siteId, item.materialId, item.dispatchedAt);
            insertedIds.push(result.lastInsertRowid as number);
        });
    });

    bulkInsert();

    const placeholders = insertedIds.map(() => '?').join(', ');
    const rows = db
        .prepare(`${TICKET_VIEW_SELECT} WHERE t.id IN (${placeholders}) ORDER BY t.ticket_number ASC`)
        .all(...insertedIds) as TicketViewRow[];

    return rows.map(toTicketView);
}
