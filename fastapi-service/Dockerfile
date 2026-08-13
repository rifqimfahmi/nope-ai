# Stage: deps - install dependencies once, shared by the dev and runner stages below.
FROM python:3.13-slim AS deps
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PYTHONUNBUFFERED=1

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project

# Stage: dev - what docker-compose.yml builds (target: dev) for local development.
# Source is bind-mounted in at runtime over this COPY (see ../docker-compose.yml);
# the COPY just makes the image runnable standalone too, e.g. `docker build --target dev`.
FROM deps AS dev
COPY . .
RUN uv sync --frozen
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Stage: runner (production) - same deps, but no --reload and no bind mount
# expected at runtime (see ../docker-compose.prod.yml).
FROM deps AS runner
COPY . .
RUN uv sync --frozen
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
