# frontend

The real UI for the Contrarian Agent. Next.js (App Router) talking to the
[`fastapi-service`](../fastapi-service) for the `/challenge-me` SSE stream, and
to its own Postgres database (via Drizzle) for challenge history.

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript
- **Tailwind CSS v4** (CSS-first config, no `tailwind.config.js`) + **daisyUI**
  for the component classes
- **SCSS Modules** per component — utility classes are composed with `@apply`
  inside each `*.module.scss` (see `src/components/*/*.module.scss`); each
  module needs `@reference "<path>/app/globals.css";` at the top since
  Tailwind v4 processes every CSS file independently
- **Zod** for request/response validation (`src/lib/schemas.ts`)
- **TanStack Query** for the history list/mutations (`src/hooks/useHistory.ts`)
- **Axios** for calls to this app's own `/api/history` route handlers
  (`src/lib/api/http.ts`) — the FastAPI SSE stream itself is consumed with a
  raw `fetch` + `ReadableStream` reader instead, since axios doesn't stream
  well in the browser (`src/lib/api/challenge.ts`)
- **Drizzle ORM** + `drizzle-kit`, backed by Postgres, for challenge history
  (`src/db/`)

## Running locally

```bash
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL and DATABASE_URL
pnpm install

# needs a reachable Postgres — from the repo root:
#   docker compose up -d postgres
pnpm db:migrate

pnpm dev   # http://localhost:3000
```

The FastAPI service must also be running (see [`../fastapi-service`](../fastapi-service))
for the challenge form to actually stream a reply.

## Database

Schema lives in `src/db/schema.ts` (currently one table: `challenges`). After
changing it:

```bash
pnpm db:generate   # writes a new SQL migration into drizzle/
pnpm db:migrate    # applies pending migrations
pnpm db:studio     # browse the data
```

## Docker

`Dockerfile` is multi-stage with three targets:

- `dev` — used by the root `docker-compose.yml` for local development
  (bind-mounted source, `pnpm dev`)
- `builder` — runs `next build` (needs `NEXT_PUBLIC_API_URL` as a build arg,
  since it's baked into the client bundle; does **not** need `DATABASE_URL`,
  since Postgres is only connected to lazily at request time)
- `runner` (default target) — minimal production image running the Next.js
  `standalone` output. No `drizzle-kit`, so it never runs migrations itself —
  apply those separately (see [Database](#database)) before pointing traffic
  at it.

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com -t nope-ai-frontend .
docker run -p 3000:3000 -e DATABASE_URL=postgres://... nope-ai-frontend
```

## Notes on the SSE client

`fastapi-service` streams via `sse_starlette`, which terminates each line with
`\r\n`, not `\n`. `src/lib/api/challenge.ts` normalizes that before splitting
on the `\n\n` event boundary — worth knowing if you touch the parsing there.
