# SOS Casa — API

Backend da plataforma SOS Casa: API REST + WebSocket responsável pela regra de negócio, autenticação, solicitações de serviço, chat, pagamentos e notificações que conectam clientes a profissionais autônomos de reparos residenciais.

Ver documentação completa do produto e dos três repositórios em [`../README.md`](../README.md).

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
| Pagar.me SDK (Node.js) | Gateway de pagamentos (PIX + cartão + split marketplace) |
| S3 / MinIO | Storage de fotos e documentos (a definir) |

Detalhes de módulos e fluxos: [`../docs/api-plan.md`](../docs/api-plan.md). Estrutura de pastas: [`../docs/estrutura-modulos.md`](../docs/estrutura-modulos.md).

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
| `PAGARME_API_KEY`, `PAGARME_ENCRYPTION_KEY` | Credenciais do gateway de pagamento |
| `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` | Storage de anexos (S3/MinIO — v2) |
| `APP_URL` | URL pública, usada nos webhooks do Pagar.me |
| `CORS_ORIGIN` | Origem liberada para o Admin Web |

`.env.test` já vem preenchido com valores padrão para rodar os testes de integração e E2E localmente (requer um PostgreSQL rodando).

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
npm run test           # unitários
npm run test:cov       # cobertura
npm run test:integration
npm run test:e2e
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
| `PaymentsModule` | Integração Pagar.me, escrow e repasse ao profissional |
| `ReviewsModule` | Avaliações e atualização de rating do profissional |
| `AttachmentsModule` | Upload de fotos, documentos e notas fiscais |
| `NotificationsModule` | Push notifications (Expo) |
| `AdminModule` | Endpoints administrativos (aprovação, catálogo, comissão) |

Fluxo completo da solicitação de serviço documentado em [`../docs/api-plan.md`](../docs/api-plan.md#fluxo-principal--solicitação-de-serviço).

---

## Documentação da API

Endpoints documentados via Swagger (`@nestjs/swagger`), disponível em `/api` (ou conforme configurado em `main.ts`) quando a aplicação está rodando.
