import db from '../../db/client';
import { TicketView, BulkCreateTicketsInput, TicketFilters } from './tickets.types';
import { NotFoundError, ValidationError, ConflictError } from '../../errors/AppError';
import * as ticketsRepo from './tickets.repository';

function normalizeDispatchedAt(input: string): string {
    // Accepts "YYYY-MM-DD HH:MM:SS" and converts to a full ISO string for storage
    return input.replace(' ', 'T') + '.000Z';
}

function getTruckSiteId(truckId: number): number {
    const row = db
        .prepare('SELECT site_id FROM trucks WHERE id = ?')
        .get(truckId) as { site_id: number } | undefined;
    if (!row) throw new NotFoundError(`Truck ${truckId}`);
    return row.site_id;
}

function assertMaterialExists(materialId: number): void {
    const row = db
        .prepare('SELECT id FROM materials WHERE id = ?')
        .get(materialId) as { id: number } | undefined;
    if (!row) throw new NotFoundError(`Material ${materialId}`);
}

export function getTickets(filters: TicketFilters): TicketView[] {
    return ticketsRepo.findTickets(filters);
}

export function createTicketsBulk(input: BulkCreateTicketsInput): TicketView[] {
    const normalizedInput: BulkCreateTicketsInput = {
        ...input,
        tickets: input.tickets.map((t) => ({
            ...t,
            dispatchedAt: normalizeDispatchedAt(t.dispatchedAt),
        })),
    };

    const siteId = getTruckSiteId(normalizedInput.truckId);

    for (const item of normalizedInput.tickets) {
        assertMaterialExists(item.materialId);
    }

    // Validate no ticket is dispatched at a future time
    const now = new Date();
    for (const item of normalizedInput.tickets) {
        if (new Date(item.dispatchedAt) > now) {
            throw new ValidationError(
                `Dispatch time ${item.dispatchedAt} cannot be in the future`,
            );
        }
    }

    // Validate no duplicate dispatch times within the incoming batch
    const batchTimes = normalizedInput.tickets.map((t) => t.dispatchedAt);
    const seen = new Set<string>();
    for (const t of batchTimes) {
        if (seen.has(t)) {
            throw new ConflictError(
                `Duplicate dispatch time in batch: ${t}`,
            );
        }
        seen.add(t);
    }

    // Validate no conflicts with existing tickets for this truck
    const conflicts = ticketsRepo.findConflictingDispatchTimes(normalizedInput.truckId, batchTimes);
    if (conflicts.length > 0) {
        throw new ConflictError(
            `Dispatch time(s) already exist for truck ${normalizedInput.truckId}: ${conflicts.join(', ')}`,
        );
    }

    return ticketsRepo.insertTicketsBulk(normalizedInput.truckId, siteId, normalizedInput.tickets);
}
