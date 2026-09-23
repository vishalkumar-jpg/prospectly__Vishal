# ==========================================================
# Stage 1: Build frontend (client bundle + SSR entry)
# ==========================================================

FROM oven/bun:1.3.8 AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# client/.env often sets NODE_ENV=development — force production SSR/client bundles
ENV NODE_ENV=production
RUN bun run build


# ==========================================================
# Stage 2: Run SSR server (Express + static assets)
# ==========================================================

FROM oven/bun:1.3.8 AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=80
# Server-side job fetches on the Docker compose network (override per environment)
ENV SSR_API_URL=http://prospectly:5001/api

COPY package.json bun.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

EXPOSE 80

CMD ["bun", "run", "server/index.ts"]