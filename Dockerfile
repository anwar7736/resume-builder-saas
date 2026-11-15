FROM node:22-bookworm-slim AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder

WORKDIR /app
ARG NEST_API_URL
ARG NEST_API_ALLOW_INTERNAL_HTTP=false
ARG NEXT_OUTPUT_STANDALONE=true
ENV NEST_API_URL=${NEST_API_URL}
ENV NEST_API_ALLOW_INTERNAL_HTTP=${NEST_API_ALLOW_INTERNAL_HTTP}
ENV NEXT_OUTPUT_STANDALONE=${NEXT_OUTPUT_STANDALONE}
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]
