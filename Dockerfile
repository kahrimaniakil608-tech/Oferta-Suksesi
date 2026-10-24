FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app

# ── Install dependencies ──
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/image-service/package.json apps/image-service/package.json
COPY apps/notification-service/package.json apps/notification-service/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/email-templates/package.json packages/email-templates/package.json
RUN pnpm install --frozen-lockfile

# ── Build everything ──
FROM base AS builder
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ARG NEXT_PUBLIC_IMAGE_URL=http://localhost:4001
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_SITE_URL=https://ofertasuksesi.com
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_IMAGE_URL=$NEXT_PUBLIC_IMAGE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/apps/image-service/node_modules ./apps/image-service/node_modules
COPY --from=deps /app/apps/notification-service/node_modules ./apps/notification-service/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
COPY --from=deps /app/packages/email-templates/node_modules ./packages/email-templates/node_modules
COPY . .
RUN npx prisma generate
RUN pnpm run build

# ── API runner ──
FROM base AS api
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
EXPOSE 3001
CMD ["node", "apps/api/dist/main"]

# ── Web runner ──
FROM base AS web
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

# ── Image service runner ──
FROM base AS image-service
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/image-service/node_modules ./apps/image-service/node_modules
COPY --from=builder /app/apps/image-service/dist ./apps/image-service/dist
COPY --from=builder /app/apps/image-service/assets ./apps/image-service/assets
COPY --from=builder /app/apps/image-service/package.json ./apps/image-service/package.json
COPY --from=builder /app/package.json ./package.json
EXPOSE 4001
CMD ["node", "apps/image-service/dist/main"]

# ── Notification service runner ──
FROM base AS notification-service
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/notification-service/node_modules ./apps/notification-service/node_modules
COPY --from=builder /app/apps/notification-service/dist ./apps/notification-service/dist
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/apps/notification-service/package.json ./apps/notification-service/package.json
COPY --from=builder /app/package.json ./package.json
EXPOSE 3003
CMD ["node", "apps/notification-service/dist/main"]
