import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppModule } from '../src/app.module';
import { globalValidationPipe } from '../src/common/pipes/validation.pipe';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

const cookieParser = require('cookie-parser');

/**
 * Teste E2E — Ciclo de vida de Solicitação de Serviço
 *
 * Fluxo testado:
 *   cliente registra → cria solicitação → profissional aceita → conclui → cliente confirma
 *
 * Requer: PostgreSQL DB_NAME=sos_casa_test
 * Rodar: npm run test:e2e
 */
describe('ServiceRequests (E2E)', () => {
  let app: INestApplication;

  const clientUser = {
    name: 'Cliente E2E',
    email: `e2e_client_${Date.now()}@test.com`,
    phone: `119${Math.floor(10000000 + Math.random() * 89999999)}`,
    password: 'Senha@123',
  };

  const professionalUser = {
    name: 'Prof E2E',
    email: `e2e_prof_${Date.now()}@test.com`,
    phone: `119${Math.floor(20000000 + Math.random() * 69999999)}`,
    password: 'Senha@123',
  };

  let clientToken: string;
  let professionalToken: string;
  let addressId: string;
  let requestId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        EventEmitterModule.forRoot(),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(globalValidationPipe);
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Setup: registrar usuários e criar endereço ─────────────────────────────

  describe('Setup', () => {
    it('deve registrar cliente', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(clientUser)
        .expect(201);

      clientToken = res.body.data.accessToken;
      expect(clientToken).toBeDefined();
    });

    it('deve registrar profissional', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...professionalUser, role: 'professional' })
        .expect(201);

      professionalToken = res.body.data.accessToken;
      expect(professionalToken).toBeDefined();
    });

    it('deve criar endereço para o cliente', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          street: 'Rua E2E',
          number: '42',
          neighborhood: 'Centro',
          city: 'Varginha',
          state: 'MG',
          zipCode: '37010-000',
          isDefault: true,
        })
        .expect(201);

      addressId = res.body.data.id;
      expect(addressId).toBeDefined();
    });
  });

  // ── Criação de solicitação ─────────────────────────────────────────────────

  describe('POST /service-requests', () => {
    it('deve criar solicitação com status PENDING', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          addressId,
          description: 'Torneira vazando no banheiro',
          urgency: 'normal',
          materialProvider: 'client',
        })
        .expect(201);

      requestId = res.body.data.id;
      expect(requestId).toBeDefined();
      expect(res.body.data.status).toBe('pending');
    });

    it('deve retornar 401 sem token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/service-requests')
        .send({ addressId, description: 'Test' })
        .expect(401);
    });

    it('deve retornar 400 sem addressId', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ description: 'Test sem endereço' })
        .expect(400);
    });
  });

  // ── Leitura de solicitação ─────────────────────────────────────────────────

  describe('GET /service-requests/:id', () => {
    it('deve retornar solicitação pelo id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/service-requests/${requestId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(requestId);
    });

    it('deve retornar 404 para id inexistente', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/service-requests/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(404);
    });
  });

  // ── Fluxo de status ────────────────────────────────────────────────────────

  describe('Fluxo de status', () => {
    it('profissional deve poder aceitar a solicitação', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/service-requests/${requestId}/accept`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .expect(200);

      expect(res.body.data.status).toBe('accepted');
    });

    it('deve avançar para on_the_way', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/service-requests/${requestId}/on-the-way`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .expect(200);

      expect(res.body.data.status).toBe('on_the_way');
    });

    it('deve registrar chegada', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/service-requests/${requestId}/arrived`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .expect(200);

      expect(res.body.data.status).toBe('arrived');
    });

    it('deve iniciar o serviço', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/service-requests/${requestId}/start`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .expect(200);

      expect(res.body.data.status).toBe('in_progress');
    });

    it('profissional deve concluir o serviço', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/service-requests/${requestId}/complete`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .expect(200);

      expect(res.body.data.status).toBe('completed');
    });

    it('cliente deve confirmar a conclusão', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/service-requests/${requestId}/confirm`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(res.body.data.status).toBe('confirmed');
    });
  });

  // ── Cancelamento ───────────────────────────────────────────────────────────

  describe('DELETE /service-requests/:id (cancelamento)', () => {
    let cancelId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          addressId,
          description: 'Solicitação para cancelar',
          urgency: 'normal',
          materialProvider: 'client',
        });
      cancelId = res.body.data.id;
    });

    it('cliente deve cancelar solicitação PENDING', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/service-requests/${cancelId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ reason: 'Não preciso mais' })
        .expect(200);
    });

    it('não deve cancelar solicitação já concluída', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/service-requests/${requestId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(400);
    });
  });
});
