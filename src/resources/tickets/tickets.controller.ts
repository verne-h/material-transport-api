import { Request, Response } from 'express';
import * as ticketsService from './tickets.service';
import { TicketFilters } from './tickets.types';

export async function getTickets(req: Request, res: Response): Promise<void> {
    const raw = req.query['siteId'];
    const siteIds = raw
        ? (Array.isArray(raw) ? (raw as string[]) : [raw as string])
            .map((s) => parseInt(s, 10))
            .filter((n) => !isNaN(n))
        : undefined;

    const startDateRaw = req.query['startDate'] as string | undefined;
    const endDateRaw = req.query['endDate'] as string | undefined;

    const page = parseInt((req.query['page'] as string) ?? '1', 10) || 1;
    const limit = parseInt((req.query['limit'] as string) ?? '25', 10) || 25;

    const filters: TicketFilters = {
        siteIds: siteIds && siteIds.length > 0 ? siteIds : undefined,
        startDate: startDateRaw ? `${startDateRaw}T00:00:00.000Z` : undefined,
        endDate: endDateRaw ? `${endDateRaw}T23:59:59.999Z` : undefined,
        page,
        limit,
    };

    const tickets = ticketsService.getTickets(filters);
    res.json({ data: tickets });
}

export async function createTicketsBulk(req: Request, res: Response): Promise<void> {
    const tickets = ticketsService.createTicketsBulk(req.body);
    res.status(201).json({ data: tickets });
}
