# frontend

The real UI for the Contrarian Agent. The browser only ever talks to this
app's own origin — `src/app/api/challenge-me/route.ts` proxies server-side to
[`fastapi-service`](../fastapi-service) for the challenge SSE stream, and
`src/app/api/history/` handlers own the Postgres-backed challenge history
directly (via Drizzle). FastAPI is an internal upstream, never exposed to
the client.

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
  (`src/lib/api/http.ts`) — the challenge stream itself is consumed with a
  raw `fetch` + `ReadableStream` reader instead, since axios doesn't stream
  well in the browser (`src/lib/api/challenge.ts`)
- **Drizzle ORM** + `drizzle-kit`, backed by Postgres, for challenge history
  (`src/db/`)

## Running locally

```bash
cp .env.example .env.local   # set FASTAPI_URL and DATABASE_URL
pnpm install

# needs a reachable Postgres — from the repo root:
#   docker compose up -d postgres
pnpm db:migrate

pnpm dev   # http://localhost:3000
```

The FastAPI service must also be running (see [`../fastapi-service`](../fastapi-service))
and reachable at `FASTAPI_URL` for the challenge form to actually stream a
reply — the browser never talks to it directly, only this app's server does
(`src/app/api/challenge-me/route.ts`).

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

- `dev` — what the root `docker-compose.yml` (the default dev/local stack)
  builds: bind-mounted source, `pnpm db:migrate && pnpm dev`
- `builder` — runs `next build`. No build-time secrets needed: `FASTAPI_URL`/
  `DATABASE_URL` are read server-side at request time, not baked into
  anything (nothing here is exposed to the browser)
- `runner` (default target) — what `../docker-compose.prod.yml` builds: a
  minimal production image running the Next.js `standalone` output. No
  `drizzle-kit`, so it never runs migrations itself — apply those separately
  (see [Database](#database)) before pointing traffic at it.

Building/running standalone, without compose:

```bash
docker build -t nope-ai-frontend .
docker run -p 3000:3000 -e FASTAPI_URL=http://fastapi:8000 -e DATABASE_URL=postgres://... nope-ai-frontend
```

## Notes on the SSE client

`fastapi-service` streams via `sse_starlette`, which terminates each line with
`\r\n`, not `\n`. `src/lib/api/challenge.ts` normalizes that before splitting
on the `\n\n` event boundary — worth knowing if you touch the parsing there.
The proxy route (`src/app/api/challenge-me/route.ts`) passes the upstream
response body straight through unmodified, so this normalization only needs
to happen once, client-side.
