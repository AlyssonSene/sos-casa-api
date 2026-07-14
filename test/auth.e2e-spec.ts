import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';
import appConfig from '../src/config/app.config';
import databaseConfig from '../src/config/database.config';
import jwtConfig from '../src/config/jwt.config';
import { globalValidationPipe } from '../src/common/pipes/validation.pipe';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

/**
 * Teste E2E de autenticação.
 *
 * Para rodar: é necessário um banco PostgreSQL de teste.
 * Configure as variáveis de ambiente no .env.test:
 *   DB_NAME=sos_casa_test
 *
 * Comando: npm run test:e2e
 */
describe('Auth (E2E)', () => {
  let app: INestApplication;
  const testUser = {
    name: 'E2E User',
    email: `e2e_${Date.now()}@test.com`,
    phone: `119${Math.floor(10000000 + Math.random() * 89999999)}`,
    password: 'Senha@123',
  };
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [appConfig, databaseConfig, jwtConfig],
          envFilePath: '.env.test',
        }),
        EventEmitterModule.forRoot(),
        TypeOrmModule.forRootAsync({
          useFactory: () => ({
            type: 'postgres' as const,
            host: process.env.DB_HOST ?? 'localhost',
            port: parseInt(process.env.DB_PORT ?? '5432'),
            username: process.env.DB_USER ?? 'postgres',
            password: process.env.DB_PASS ?? 'postgres',
            database: process.env.DB_NAME ?? 'sos_casa_test',
            entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
            synchronize: true,
            dropSchema: false,
          }),
        }),
        AuthModule,
        UsersModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(globalValidationPipe);
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── POST /auth/register ────────────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    it('deve registrar novo usuário e retornar accessToken', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('deve retornar 409 ao registrar email duplicado', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('deve retornar 400 com email inválido', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...testUser, email: 'nao_e_email' })
        .expect(400);
    });

    it('deve retornar 400 com senha muito curta', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...testUser, email: 'outro@test.com', password: '123' })
        .expect(400);
    });
  });

  // ── POST /auth/login ───────────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    it('deve fazer login e retornar accessToken', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(res.body.data).toHaveProperty('accessToken');
      accessToken = res.body.data.accessToken;
    });

    it('deve retornar 401 com senha errada', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'SenhaErrada' })
        .expect(401);
    });

    it('deve retornar 401 com email não cadastrado', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nao@existe.com', password: 'Senha@123' })
        .expect(401);
    });
  });

  // ── GET /auth/me ───────────────────────────────────────────────────────────

  describe('GET /api/v1/auth/me', () => {
    it('deve retornar usuário autenticado', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.email).toBe(testUser.email);
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });

    it('deve retornar 401 sem token', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('deve retornar 401 com token inválido', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer token_invalido')
        .expect(401);
    });
  });

  // ── POST /auth/logout ──────────────────────────────────────────────────────

  describe('POST /api/v1/auth/logout', () => {
    it('deve limpar cookie de refresh e retornar 204', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/logout').expect(204);
    });
  });
});
