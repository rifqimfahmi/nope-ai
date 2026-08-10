# Stage: deps - install dependencies once, shared by the dev and builder stages below.
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Stage: dev - what docker-compose.yml builds (target: dev) for local development.
# Source is bind-mounted in at runtime over this COPY (see ../docker-compose.yml);
# the COPY just makes the image runnable standalone too, e.g. `docker build --target dev`.
FROM deps AS dev
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "pnpm db:migrate && pnpm dev"]

# Stage: builder - production build. No build-time secrets needed: the browser
# never talks to FastAPI or Postgres directly (see src/app/api/), it only ever
# calls this app's own route handlers, which read FASTAPI_URL/DATABASE_URL at
# request time in the runner stage below.
FROM deps AS builder
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# Stage: runner (default target) - minimal production image running the
# Next.js `standalone` output (see `output: "standalone"` in next.config.ts):
#
#   docker build -t nope-ai-frontend .
#   docker run -p 3000:3000 -e FASTAPI_URL=... -e DATABASE_URL=... nope-ai-frontend
#
# Run `pnpm db:migrate` against the target database as a separate deploy step -
# drizzle-kit is a devDependency and isn't present in this stage.
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
