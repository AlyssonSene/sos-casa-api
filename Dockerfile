# =============================================================================
# SOS Casa API — Dockerfile multi-stage
# =============================================================================
# Stage 1: builder  — compila TypeScript e poda devDependencies
# Stage 2: runner   — imagem final mínima (~120-150 MB)
# =============================================================================

# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

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
# Distroless: sem shell, sem apk, sem busybox → zero CVEs conhecidas
# Já roda como nonroot (uid 65532) — sem necessidade de adduser
FROM gcr.io/distroless/nodejs22-debian12 AS runner

WORKDIR /app

# Copia apenas artefatos do builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Porta que a API escuta (deve coincidir com PORT no .env)
EXPOSE 3000

# Health check via Node.js puro — sem wget/curl (distroless não tem shell)
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", \
    "require('http').get('http://localhost:3000/api/v1/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"]

# distroless/nodejs entrypoint já é `node` — CMD recebe apenas o script
CMD ["dist/main"]
