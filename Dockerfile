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
    COPY --from=builder /app/lib ./lib
    COPY --from=builder /app/package*.json ./
    
    RUN npm ci --only=production && npx prisma generate
    
    EXPOSE 3000
    ENV PORT=3000
    ENV HOSTNAME="0.0.0.0"
        # DB en el volumen persistente /app/data (montar disco en Render apuntando a /app/data).
    # Se puede sobreescribir con la variable de entorno DATABASE_URL del proveedor.
    ENV DATABASE_URL="file:/app/data/proagenda.db"
    # Migraciones al arrancar (persistente, NO borra datos). Seed solo si DB vacía.
    CMD ["sh", "-c", "npx prisma db push --skip-generate && node prisma/seed.js 2>/dev/null || npx tsx prisma/seed.ts; node server.js"]
    