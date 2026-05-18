# Material Transport API

Simple local Node.js + TypeScript API for managing material transport tickets.

## Requirements

- Node.js 20+
- npm

## Local Setup

Setup the API locally:

```bash
npm install
npm run db:migrate
npm run db:seed
```

Optional: create a `.env` file to override the default settings.

Default values:

```env
PORT=3000
DATABASE_PATH=./data/app.db
LOG_LEVEL=info
NODE_ENV=development
```

This API uses SQLite for local storage.

By default, the database file is created at:

```text
./data/app.db
```

`npm run db:migrate` creates the tables and indexes used by the API.

`npm run db:seed` loads the provided sites and trucks data.

Notes:

- Seeding is idempotent. If sites already exist, the script skips reseeding.
- The seed also inserts the default material: `Soil`.

## Run Tests

```bash
npm test
```

## Run the API Locally

Start the development server:

```bash
npm run dev
```

The API will be available at:

```text
http://localhost:3000
```

## API Endpoints

### `GET /v1/tickets`

Returns tickets with this response shape:

```json
{
  "data": [
    {
      "id": 1,
      "ticketNumber": 1,
      "dispatchedAt": "2026-01-15T10:00:00.000Z",
      "siteName": "Alpha Site",
      "truckLicense": "ABC-001",
      "materialName": "Soil"
    }
  ]
}
```

Supported query params:

| Param | Type | Default | Description |
|---|---|---|---|
| `siteId` | integer | — | Filter by site. Repeat for multiple: `?siteId=1&siteId=2` |
| `startDate` | `YYYY-MM-DD` | — | Return tickets dispatched on or after this date |
| `endDate` | `YYYY-MM-DD` | — | Return tickets dispatched on or before this date |
| `page` | integer | `1` | Page number (1-indexed) |
| `limit` | integer | `25` | Results per page (max 100) |

Examples:

Get all tickets:

```bash
curl http://localhost:3000/v1/tickets
```

Filter by one site:

```bash
curl "http://localhost:3000/v1/tickets?siteId=1"
```

Filter by multiple sites:

```bash
curl "http://localhost:3000/v1/tickets?siteId=1&siteId=2"
```

Filter by date range:

```bash
curl "http://localhost:3000/v1/tickets?startDate=2026-01-15&endDate=2026-01-20"
```

Paginate results:

```bash
curl "http://localhost:3000/v1/tickets?page=2&limit=10"
```

### `POST /v1/tickets/bulk`

Creates multiple tickets for a single truck.

Request body:

```json
{
  "truckId": 1,
  "tickets": [
    {
      "materialId": 1,
      "dispatchedAt": "2026-01-15 10:00:00"
    },
    {
      "materialId": 1,
      "dispatchedAt": "2026-01-15 11:00:00"
    }
  ]
}
```

Example:

```bash
curl -X POST http://localhost:3000/v1/tickets/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "truckId": 1,
    "tickets": [
      {
        "materialId": 1,
        "dispatchedAt": "2026-01-15 10:00:00"
      },
      {
        "materialId": 1,
        "dispatchedAt": "2026-01-15 11:00:00"
      }
    ]
  }'
```

Successful response:

```json
{
  "data": [
    {
      "id": 1,
      "ticketNumber": 1,
      "dispatchedAt": "2026-01-15T10:00:00.000Z",
      "siteName": "Alpha Site",
      "truckLicense": "ABC-001",
      "materialName": "Soil"
    },
    {
      "id": 2,
      "ticketNumber": 2,
      "dispatchedAt": "2026-01-15T11:00:00.000Z",
      "siteName": "Alpha Site",
      "truckLicense": "ABC-001",
      "materialName": "Soil"
    }
  ]
}
```

Business rules:

- `dispatchedAt` cannot be in the future
- A single truck cannot have two tickets with the same `dispatchedAt`
- Duplicate `dispatchedAt` values in the same request return a conflict
- `truckId` must exist
- `materialId` must exist

Error shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "..."
  }
}
```
