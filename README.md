# SOS Casa — API

Backend da plataforma SOS Casa: API REST + WebSocket responsável pela regra de negócio, autenticação, solicitações de serviço, chat, pagamentos e notificações que conectam clientes a profissionais autônomos de reparos residenciais.

Este é o backend do ecossistema SOS Casa, composto por três aplicações: esta API (NestJS), o Admin Web (React, painel operacional da equipe interna) e o app mobile (Expo, cliente e profissional).

---

## Stack

| Tecnologia | Uso |
|---|---|
| NestJS | Framework principal (modular, TypeScript) |
| TypeORM | ORM com suporte a PostgreSQL |
| PostgreSQL | Banco de dados principal |
| Socket.io | WebSockets para chat em tempo real |
| JWT + Passport | Autenticação stateless |
| class-validator | Validação de DTOs |
| Stripe SDK (Node.js) | Gateway de pagamentos (cartão + PIX via Stripe + split automático via Connect) |
| S3 / MinIO | Storage de fotos e documentos (a definir) |

---

## Estrutura de pastas

```
src/
├── main.ts
├── app.module.ts
├── config/          # database.config.ts, jwt.config.ts, app.config.ts
├── common/          # decorators, guards, filters, interceptors, pipes, enums
└── modules/         # um módulo por domínio (auth, users, service-requests, ...)
```

Cada módulo segue o padrão Nest: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`.

---

## Pré-requisitos

- **Node.js 20+** — para rodar a API localmente em modo de desenvolvimento
- **Docker Engine 24+ + Compose V2** — para banco de dados e ambiente de produção
- **GNU Make** — para usar os atalhos do `Makefile` na raiz do projeto

---

## Quick Start (desenvolvimento)

O banco de dados é orquestrado pelo repo **`sos-casa-infra`** (clone como irmão deste):

```bash
# 1. Sobe banco de dev + pgAdmin (no repo sos-casa-infra)
cd ../sos-casa-infra && make dev

# 2. Neste diretório
cp .env.example .env        # configure STRIPE_SECRET_KEY etc.
npm install
npm run start:dev

# API:     http://localhost:3000/api/v1
# Swagger: http://localhost:3000/api/docs
# pgAdmin: http://localhost:5050
```

> Ver `../sos-casa-infra/README.md` ou `../docs/infra.md` para guia completo.

---

## Configuração de ambiente

```bash
cp .env.example .env
```

Preencha as variáveis em `.env`:

| Variável | Descrição |
|---|---|
| `NODE_ENV`, `PORT` | Ambiente e porta da aplicação |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` | Conexão com PostgreSQL |
| `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN` | Access token (padrão 15min) |
| `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN` | Refresh token (padrão 7 dias) |
| `STRIPE_SECRET_KEY` | Chave secreta da conta Stripe (sk_live_... ou sk_test_...) |
| `STRIPE_WEBHOOK_SECRET` | Segredo para validar eventos recebidos pelo webhook Stripe |
| `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` | Storage de anexos (S3/MinIO — v2) |
| `APP_URL` | URL pública da API (usada como base para callbacks e webhooks) |
| `CORS_ORIGIN` | Origem liberada para o Admin Web |

`.env.test` já vem preenchido com valores padrão para rodar os testes de integração e E2E contra o banco de teste Docker (`DB_PORT=5433`).

---

## Instalação e execução

```bash
# instalar dependências
npm install

# desenvolvimento (watch mode)
npm run start:dev

# produção
npm run build
npm run start:prod
```

## Testes

```bash
# Pela raiz do projeto (recomendado — sobe banco automaticamente):
make test

# Ou manualmente:
make test-db                  # sobe banco de teste na porta 5433
npm run test                  # unitários
npm run test:cov              # cobertura
npm run test:integration      # requer banco de teste rodando
npm run test:e2e              # requer banco de teste rodando
make test-db-down             # derruba banco de teste
```

## Lint e formatação

```bash
npm run lint
npm run format
```

---

## Módulos principais

| Módulo | Responsabilidade |
|---|---|
| `AuthModule` | Cadastro, login, refresh token, guards de roles (`CLIENT`, `PROFESSIONAL`, `ADMIN`) |
| `UsersModule` | Perfil base compartilhado, upload de foto |
| `ClientsModule` | Perfil, histórico e endereços do cliente |
| `ProfessionalsModule` | Cadastro, aprovação, catálogo de serviços, raio de atendimento |
| `CategoriesModule` / `ServicesModule` | Catálogo padronizado de categorias e serviços |
| `ServiceRequestsModule` | Fluxo central da solicitação de serviço (criação → conclusão) |
| `ChatModule` | Mensagens em tempo real via Socket.io por solicitação |
| `PaymentsModule` | Integração Stripe (cartão + PIX automático), PIX manual, escrow e repasse via Stripe Connect |
| `ReviewsModule` | Avaliações e atualização de rating do profissional |
| `AttachmentsModule` | Upload de fotos, documentos e notas fiscais |
| `NotificationsModule` | Push notifications (Expo) |
| `AdminModule` | Endpoints administrativos (aprovação, catálogo, comissão) |

### Fluxo principal — solicitação de serviço

```
1. Cliente cria solicitação (endereço, serviços, descrição, material)
2. API notifica profissionais na cidade via Socket.io
3. Profissional aceita → solicitação vai para ACCEPTED
4. Chat liberado entre as partes
5. Profissional atualiza status: ON_THE_WAY → ARRIVED → IN_PROGRESS
6. Profissional marca como COMPLETED
7. Cliente confirma → CONFIRMED
8a. [Stripe] Cliente paga via cartão ou PIX Stripe → PaymentIntent confirmado → HELD (escrow)
8b. [PIX manual] Cliente copia a chave PIX do profissional → paga no próprio banco → envia comprovante → HELD
9a. [Stripe] Após 24h sem disputa → admin libera escrow → transferência via Stripe Connect (15% comissão) → RELEASED
9b. [PIX manual] Profissional confirma recebimento no app → RELEASED (sem comissão automática)
10. Cliente avalia profissional
```

---

## Documentação da API

Endpoints documentados via Swagger (`@nestjs/swagger`), disponível em `/api` (ou conforme configurado em `main.ts`) quando a aplicação está rodando.
