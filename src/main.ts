import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser') as typeof import('cookie-parser');
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { globalValidationPipe } from './common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Prefixo global ──────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── CORS ────────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true, // necessário para enviar cookies (refreshToken)
  });

  // ── Cookie Parser ───────────────────────────────────────────────────────────
  app.use(cookieParser());

  // ── Pipes globais ───────────────────────────────────────────────────────────
  app.useGlobalPipes(globalValidationPipe);

  // ── Filtros globais ─────────────────────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Interceptors globais ────────────────────────────────────────────────────
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new ResponseInterceptor(),
    new ClassSerializerInterceptor(reflector), // respeita @Exclude() nas entities
  );

  // ── Swagger ─────────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('SOS Casa API')
      .setDescription(
        'API da plataforma de marido de aluguel SOS Casa.\n\n' +
        '**Autenticação:** Use `POST /auth/login` para obter o `accessToken` e clique em **Authorize** (🔒) para aplicá-lo.\n\n' +
        '**Roles:** `client` | `professional` | `admin`\n\n' +
        '**Escrow:** pagamentos ficam retidos 24h após confirmação do cliente, depois são liberados automaticamente ao profissional (15% de comissão da plataforma).',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Access token (15min)' },
        'Bearer',
      )
      .addCookieAuth('refresh_token', { type: 'apiKey', in: 'cookie', description: 'Refresh token (7d, httpOnly)' })
      .addTag('auth', 'Cadastro, login, logout e renovação de token')
      .addTag('addresses', 'Endereços do usuário')
      .addTag('service-requests', 'Ciclo de vida das solicitações de serviço')
      .addTag('payments', 'Pagamentos via Stripe (cartão/PIX) ou PIX manual + controle de escrow')
      .addTag('reviews', 'Avaliações de profissionais')
      .addTag('chat', 'Histórico de mensagens (tempo real via Socket.io)')
      .addTag('professionals', 'Gestão e aprovação de profissionais (admin)')
      .addTag('clients', 'Listagem de clientes (admin)')
      .addTag('categories', 'Categorias de serviço')
      .addTag('services', 'Serviços e ofertas de profissionais')
      .addTag('notifications', 'Notificações do usuário')
      .addTag('users', 'Gerenciamento de usuários (admin)')
      .addTag('admin', 'Operações administrativas')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // ── Start ────────────────────────────────────────────────────────────────────
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 SOS Casa API running on http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger: http://localhost:${port}/api/docs`);
}

bootstrap();
