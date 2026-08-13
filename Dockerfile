# --- Frontend build ---
FROM node:20-alpine AS web-builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npx prisma generate && npm run build

# --- Frontend runtime (standalone) ---
FROM node:20-alpine AS web
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=web-builder /app/.next/standalone ./
COPY --from=web-builder /app/.next/static ./.next/static
COPY --from=web-builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]

# --- API runtime ---
FROM node:20-alpine AS api
WORKDIR /app
ENV NODE_ENV=production
COPY --from=web-builder /app/package.json ./
COPY --from=web-builder /app/node_modules ./node_modules
COPY --from=web-builder /app/prisma ./prisma
COPY --from=web-builder /app/server ./server
EXPOSE 4000
CMD ["node", "--experimental-strip-types", "server/index.ts"]
