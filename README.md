# nope-ai-2

Contrarian agent, split out of the Next.js `nope-ai-contrarian-ai` app so the
AI/implementation side lives in Python (FastAPI) instead of the Next.js API route.

## Layout

- [`fastapi-service/`](fastapi-service/README.md) — FastAPI service exposing `POST
  /challenge-me`, an SSE stream that mirrors `app/api/challange-me/route.ts` from
  the Next.js app (same system prompt / few-shot examples, ported to
  `app/prompts.py`). The LLM backend is pluggable (`app/providers/`) —
  HuggingFace, Anthropic, or OpenAI, selected via `LLM_PROVIDER` in `.env`.
- [`streamlit-app/`](streamlit-app/README.md) — throwaway UI for manually testing
  the agent without a frontend.
- [`frontend/`](frontend/README.md) — the real Next.js frontend. Talks to the
  FastAPI service directly (client-side SSE) for the challenge stream, and to its
  own Drizzle/Postgres-backed `/api/history` route handlers to persist past
  challenges.

See each service's own README for detailed setup/run instructions. Quick version:

```bash
cp .env.example .env   # fill in HF_TOKEN (or switch LLM_PROVIDER + the matching key)

cd fastapi-service && uv run uvicorn app.main:app --reload   # http://localhost:8000
cd streamlit-app && uv run streamlit run app.py              # http://localhost:8501

cd frontend
cp .env.example .env.local   # points at FastAPI + your Postgres
pnpm install
pnpm db:migrate                # apply the challenges table schema
pnpm dev                       # http://localhost:3000
```

The frontend needs a Postgres database reachable at `DATABASE_URL`. The easiest
way to get one locally is `docker compose up -d postgres` (see below).

## Running with Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

- FastAPI: http://localhost:8000 (docs at `/docs`)
- Streamlit: http://localhost:8501
- Frontend: http://localhost:3000
- Postgres: localhost:5433 (mapped to avoid clashing with a local Postgres on
  the default 5432)

`frontend` builds and runs the production image (`target: runner` in
`frontend/Dockerfile`), so it does **not** apply migrations itself — that image
deliberately excludes `drizzle-kit` (a devDependency) to stay small. Apply the
schema once, from your host, before the challenge history endpoints will work:

```bash
cd frontend
DATABASE_URL=postgres://postgres:postgres@localhost:5433/nope_ai pnpm db:migrate
```

(For local iteration on the frontend itself, running it outside Docker via
`pnpm dev` — see the quick-start above — is generally easier than rebuilding
the production image on every change.)

## Switching LLM providers

Set in `.env`:

```
LLM_PROVIDER=huggingface   # or anthropic, or openai
```

and fill in the matching `*_API_KEY`/`HF_TOKEN` and `*_MODEL` variable. See
`fastapi-service/app/providers/factory.py`.
