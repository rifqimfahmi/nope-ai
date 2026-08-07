# fastapi-service

FastAPI service exposing the contrarian agent as `POST /challenge-me`, an SSE
stream that mirrors the Next.js app's `app/api/challange-me/route.ts` (same
system prompt / few-shot examples, see `app/prompts.py`). The LLM backend is
pluggable — see `app/providers/factory.py`.

## Setup

Requires [uv](https://docs.astral.sh/uv/).

```bash
cd fastapi-service
cp ../.env.example ../.env   # if you haven't already, from the repo root
uv sync
```

Fill in `../.env` at minimum:

```
LLM_PROVIDER=huggingface
HF_TOKEN=hf_...
```

(or set `LLM_PROVIDER=anthropic` / `openai` and the matching key instead).

## Run

```bash
uv run uvicorn app.main:app --reload
```

- API: http://localhost:8000
- Interactive docs: http://localhost:8000/docs
- Health check: `curl http://localhost:8000/health`

## Try it

```bash
curl -N -X POST http://localhost:8000/challenge-me \
  -H "Content-Type: application/json" \
  -d '{"fact": "Water is wet."}'
```

You should see a stream of `data: {...}` SSE events with `type` of `chunk`,
then a final `complete` (or `error` if the provider isn't configured).

## Run with Docker

From the repo root:

```bash
docker compose up --build fastapi
```
