/** What the API returns — joined across tickets, trucks, sites, materials */
export interface TicketView {
    id: number;
    ticketNumber: number;
    dispatchedAt: string;
    siteName: string;
    truckLicense: string;
    materialName: string;
}

/** One item in a bulk-create request */
export interface BulkCreateTicketItem {
    materialId: number;
    dispatchedAt: string;
}

/** Body for POST /tickets/bulk */
export interface BulkCreateTicketsInput {
    truckId: number;
    tickets: BulkCreateTicketItem[];
}

/** Query params for GET /tickets */
export interface TicketFilters {
    siteIds?: number[];
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}
