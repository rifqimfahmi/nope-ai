# streamlit-app

Throwaway UI for manually testing the contrarian agent without needing the
Next.js frontend. Type a "fact" in, it posts to the FastAPI service's
`/challenge-me` endpoint and streams the reply live.

## Setup

Requires [uv](https://docs.astral.sh/uv/) and the `fastapi-service` running
(see its README) with a valid provider key configured.

```bash
cd streamlit-app
uv sync
```

## Run

```bash
uv run streamlit run app.py
```

- UI: http://localhost:8501
- By default it talks to `http://localhost:8000` (the local `fastapi-service`).
  Override with the `FASTAPI_URL` env var, e.g.:

  ```bash
  FASTAPI_URL=http://localhost:8000 uv run streamlit run app.py
  ```

## Run with Docker

From the repo root (this also starts `fastapi-service`, which `streamlit`
depends on):

```bash
docker compose up --build streamlit
```

Inside Docker Compose, `FASTAPI_URL` is already wired to `http://fastapi:8000`.
