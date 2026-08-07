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
- `frontend/` (not yet created) — future home for a Next.js frontend that talks to
  the FastAPI service instead of the old built-in API routes.

See each service's own README for detailed setup/run instructions. Quick version:

```bash
cp .env.example .env   # fill in HF_TOKEN (or switch LLM_PROVIDER + the matching key)

cd fastapi-service && uv run uvicorn app.main:app --reload   # http://localhost:8000
cd streamlit-app && uv run streamlit run app.py              # http://localhost:8501
```

## Running with Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

- FastAPI: http://localhost:8000 (docs at `/docs`)
- Streamlit: http://localhost:8501

## Switching LLM providers

Set in `.env`:

```
LLM_PROVIDER=huggingface   # or anthropic, or openai
```

and fill in the matching `*_API_KEY`/`HF_TOKEN` and `*_MODEL` variable. See
`fastapi-service/app/providers/factory.py`.
