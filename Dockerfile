# --- Fase de construcción ---
    FROM node:20-alpine AS builder
    WORKDIR /app
    
    RUN apk add --no-cache libc6-compat
    
    COPY package*.json ./
    RUN npm ci
    
    COPY . .
    
    RUN npx prisma generate
    RUN npm run build
    
    # --- Fase de producción ---
    FROM node:20-alpine AS runner
    WORKDIR /app
    
    ENV NODE_ENV=production
    ENV NEXT_TELEMETRY_DISABLED=1
    
    RUN mkdir -p /app/data
    
    COPY --from=builder /app/public ./public
    COPY --from=builder /app/.next/standalone ./
    COPY --from=builder /app/.next/static ./.next/static
    COPY --from=builder /app/prisma ./prisma
    COPY --from=builder /app/package*.json ./
    
    RUN npm ci --only=production && npx prisma generate
    
    EXPOSE 3000
    ENV PORT=3000
    ENV HOSTNAME="0.0.0.0"
    
    CMD ["sh", "-c", "npx prisma db push && node server.js"]
    