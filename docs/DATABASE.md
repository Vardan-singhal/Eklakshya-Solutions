# Database: MongoDB

The application uses the official MongoDB Node.js driver. PostgreSQL and Drizzle are no
longer runtime dependencies. All website components, content APIs and animations are preserved.

## Configure

Set your own connection string in the ignored root `.env`:

```dotenv
MONGODB_URI=
MONGODB_DB=
```

`MONGODB_URI` accepts Atlas (`mongodb+srv://`) and self-hosted (`mongodb://`) connection
strings. Leave `MONGODB_DB` empty to use the database named in the URI; if neither specifies
a name, the application uses `eklakshya_solutions`. An explicit `MONGODB_DB` takes precedence.
Use a plain database name such as `eklakshya_solutions`, without spaces; do not put a
connection string in `MONGODB_DB`. You may leave that optional setting empty.
All admin, payment and public site settings remain unchanged.

If Atlas SRV lookups fail with `querySrv ECONNREFUSED`, optionally set
`MONGODB_DNS_SERVERS=1.1.1.1,8.8.8.8` in local `.env`. This changes Node's process-wide
DNS resolver for SRV/TXT queries, never OS DNS settings. Leave it unset when system DNS works.
Run `npm run db:check` for a read-only connection/ping check before seeding. Known DNS,
authentication, permission and index failures have safe diagnostic messages without credentials.

Importing the database module never connects. The first database operation connects,
initializes indexes and caches the connection for reuse. Missing configuration produces a
safe 503 response from database-backed APIs. The website retains its bundled-content fallback.

## Source files

- `src/db/index.ts`: lazy, reusable MongoClient, retry after connection failure and CLI cleanup.
- `src/db/schema.ts`: typed collections, indexes and atomic numeric-ID allocation.
- `src/db/seed.ts`: bundled editorial content seeding.
- `src/lib/content.ts`: identical public content API, backed by MongoDB.
- `src/lib/env.server.ts`: private configuration validation.

## Collections

| Collection | Purpose |
| --- | --- |
| `services` | Service descriptions and deliverables |
| `projects` | Case studies with embedded, ordered results |
| `catalogues` | Catalogues with embedded, ordered plates |
| `posts` | Articles with embedded sections |
| `testimonials` | Client quotes |
| `pricing_tiers` | Server-side prices and payment amounts |
| `faqs` | Questions and answers |
| `inquiries` | Private contact submissions |
| `bookings` | Private booking/payment state and snapshots |
| `consultation_slots` | Private date/time reservations |
| `counters` | Atomic numeric IDs, preserving references such as EK-00001 |

Unique indexes protect IDs, editorial slugs, consultation date/time pairs and actual payment
order IDs. The order-ID index excludes missing values so multiple manual bookings are allowed.
MongoDB BSON IDs are not sent to client components. Project results and catalogue plates stay
in their existing array order.

## Seed content

After configuring a development database with a user allowed to create indexes and read/write:

```powershell
npm run db:seed
```

The script only fills empty content collections by default. Visitor records are retained.
`npm run db:seed -- --reset` explicitly clears and reseeds editorial content, retaining
bookings/inquiries/call requests and ID counters. On reset, booking tier references are
detached before pricing tiers are replaced; booking names and payment history remain intact.

No SQL migration or Drizzle command is needed. The existing `drizzle/` SQL files are retained
only as historical reference and are not executed by the MongoDB application. This change does
not transfer records from an existing PostgreSQL database; any such data import is a separate
operation.

See [deployment instructions](DEPLOYMENT.md).
