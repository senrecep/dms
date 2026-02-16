# Stage 1: Install dependencies
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Stage 2: Build the application
FROM oven/bun:1 AS build
WORKDIR /app

# Server-side env vars: dummy values for build, overridden at runtime
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV REDIS_URL="redis://localhost:6379"
ENV BETTER_AUTH_SECRET="build-time-placeholder-minimum-32-characters-long!!"
ENV BETTER_AUTH_URL="http://localhost:3000"

# Client-side env vars: inlined into client bundle at build time
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_APP_NAME=DMS
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Stage 3: Production runner
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "server.js"]

# Stage 4: Worker runner (no build stage dependency — only needs src + deps)
FROM oven/bun:1-slim AS worker
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY tsconfig.json ./
CMD ["bun", "run", "src/worker.ts"]

# Stage 5: Init runner (db:push + db:seed, runs once then exits)
# No build stage dependency — only needs src + deps + drizzle config
FROM oven/bun:1-slim AS init
WORKDIR /app
ENV NODE_ENV=production
# expect: auto-answers drizzle-kit interactive prompts in non-TTY Docker env
RUN apt-get update && apt-get install -y --no-install-recommends expect && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY tsconfig.json ./
COPY drizzle.config.ts ./
COPY docker-entrypoint-init.sh ./
RUN chmod +x docker-entrypoint-init.sh
CMD ["./docker-entrypoint-init.sh"]
