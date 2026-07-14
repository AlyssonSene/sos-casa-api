# =============================================================================
# SOS Casa API — Dockerfile multi-stage
# =============================================================================
# Stage 1: builder  — compila TypeScript e poda devDependencies
# Stage 2: runner   — imagem final mínima (~120-150 MB)
# =============================================================================

# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências (aproveita cache do layer se package*.json não mudou)
COPY package*.json ./
RUN npm ci

# Copia código-fonte e compila
COPY tsconfig*.json ./
COPY src/ ./src/
RUN npm run build

# Remove devDependencies — só o necessário vai para o runner
RUN npm prune --production

# ── Stage 2: runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Roda como usuário não-root por segurança
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copia apenas artefatos do builder
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./package.json

# Porta que a API escuta (deve coincidir com PORT no .env)
EXPOSE 3000

# Health check (requer curl na imagem; adicionado abaixo)
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/main"]
