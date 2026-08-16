# nope-ai-2

[![Live](https://img.shields.io/badge/live-nopeai.rifqimfahmi.dev-blue)](https://nopeai.rifqimfahmi.dev)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

Contrarian agent, split out of the Next.js `nope-ai-contrarian-ai` app so the
AI/implementation side lives in Python (FastAPI) instead of the Next.js API route.

Repo: [github.com/rifqimfahmi/nope-ai](https://github.com/rifqimfahmi/nope-ai)

## How the agent works

`/challenge-me` isn't a single LLM call — it's a two-agent
[LangGraph](https://github.com/langchain-ai/langgraph) loop
(`fastapi-service/app/agents/challenge_graph.py`):

```
START → generate → review ─┬─ approved / max loops hit → END
             ↑              │
             └── retry ─────┘
```

- **`generate`** drafts a contrarian reply to the user's claim, folding in
  feedback from previous rejected drafts (bounded by `HISTORY_WINDOW`).
- **`review`** grades that draft against a system prompt + few-shot examples
  and returns either `LGTM` or concrete feedback (a cheap deterministic check
  for banned em dashes short-circuits a full model call).
- If rejected, the graph routes back to `generate` with the reviewer's
  feedback attached; this repeats until approval or `max_review_loops` is hit.
- Both nodes stream token-by-token (`stream_mode=["messages", "updates"]`),
  so the frontend can show which agent is "talking" in real time, and
  per-call token cost is tracked and summed into the final SSE `complete`
  event.

## Layout

- [`fastapi-service/`](fastapi-service/README.md) — FastAPI service exposing `POST
  /challenge-me`, an SSE stream that mirrors `app/api/challange-me/route.ts` from
  the Next.js app (same system prompt / few-shot examples, ported to
  `app/prompts.py`). The LLM backend is pluggable (`app/providers/`) —
  HuggingFace, Anthropic, or OpenAI, selected via `LLM_PROVIDER` in `.env`.
- [`streamlit-app/`](streamlit-app/README.md) — throwaway UI for manually testing
  the agent without a frontend.
- [`frontend/`](frontend/README.md) — the real Next.js frontend. The browser
  only ever talks to this app's own origin: `/api/challenge-me` proxies
  server-side to FastAPI for the challenge stream (FastAPI is never exposed to
  the client), and `/api/nope` owns Drizzle/Postgres-backed challenge
  history directly.

See each service's own README for detailed setup/run instructions. Quick version:

```bash
cp .env.example .env   # fill in HF_TOKEN (or switch LLM_PROVIDER + the matching key)

cd fastapi-service && uv run uvicorn app.main:app --reload   # http://localhost:8000
cd streamlit-app && uv run streamlit run app.py              # http://localhost:8501

cd frontend
cp .env.example .env.local   # points FASTAPI_URL + DATABASE_URL at your local services
pnpm install
pnpm db:migrate                # apply the challenges table schema
pnpm dev                       # http://localhost:3000
```

The frontend needs a Postgres database reachable at `DATABASE_URL`. The easiest
way to get one locally is `docker compose up -d postgres` (see below).

## Running with Docker Compose

`docker-compose.yml` on its own is the local/dev stack — every service runs in
dev mode (hot reload, bind-mounted source). This is what plain `docker compose
up` gives you:

```bash
cp .env.example .env
docker compose up --build -d
```

- FastAPI: http://localhost:8000 (docs at `/docs`)
- Streamlit: http://localhost:8501
- Frontend: http://localhost:3000 (`pnpm dev` inside the container; migrations
  run automatically on container start)
- Postgres: localhost:5433 (mapped to avoid clashing with a local Postgres on
  the default 5432)

`docker-compose.prod.yml` is a production overlay layered on top of the base
file with `-f` — it only touches `frontend` for now (`fastapi`/`streamlit`
don't have production targets yet):

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build frontend
```

This builds `frontend`'s `runner` stage (see [`frontend/README.md`](frontend/README.md#docker))
instead of `dev` — no bind mount, no `next dev`, just the compiled standalone
server. No extra env vars needed: `FASTAPI_URL`/`DATABASE_URL` from the base
file are already correct (frontend, fastapi and postgres share one Docker
network either way), and neither is a build-time secret — the browser never
talks to FastAPI or Postgres directly, only this app's own route handlers do,
server-side, at request time. The `runner` stage deliberately excludes
`drizzle-kit`, so migrations are **not** applied automatically; run them once
against the target database before (or right after) deploying:

```bash
cd frontend
DATABASE_URL=postgres://postgres:postgres@localhost:5433/nope_ai pnpm db:migrate
```

## Switching LLM providers

Set in `.env`:

```
LLM_PROVIDER=huggingface   # or anthropic, or openai
```

and fill in the matching `*_API_KEY`/`HF_TOKEN` and `*_MODEL` variable. See
`fastapi-service/app/providers/factory.py`.
