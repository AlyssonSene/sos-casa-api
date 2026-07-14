import { Test, TestingModule } from '@nestjs/testing'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthModule } from './auth.module'
import { UsersModule } from '../users/users.module'
import { User } from '../users/entities/user.entity'
import { Address } from '../addresses/entities/address.entity'
import appConfig from '../../config/app.config'
import databaseConfig from '../../config/database.config'
import jwtConfig from '../../config/jwt.config'

/**
 * Testes de integração — AuthService + UsersRepository reais
 *
 * Requer: PostgreSQL em DB_NAME=sos_casa_test (configurado em .env.test)
 * Rodar: npx jest --testPathPattern=auth.integration
 */
describe('AuthService (integração)', () => {
  let module: TestingModule
  let service: AuthService

  const uniqueEmail = `integ_${Date.now()}@test.com`
  const uniquePhone = `119${Math.floor(10000000 + Math.random() * 89999999)}`
  const password = 'Senha@123'

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [appConfig, databaseConfig, jwtConfig],
          envFilePath: '.env.test',
        }),
        EventEmitterModule.forRoot(),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (cfg: ConfigService) => ({
            type: 'postgres' as const,
            host: cfg.get<string>('database.host') ?? 'localhost',
            port: cfg.get<number>('database.port') ?? 5432,
            username: cfg.get<string>('database.user') ?? 'postgres',
            password: cfg.get<string>('database.pass') ?? 'postgres',
            database: cfg.get<string>('database.name') ?? 'sos_casa_test',
            entities: [User, Address],
            synchronize: true,
          }),
        }),
        UsersModule,
        AuthModule,
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
  })

  afterAll(async () => {
    await module.close()
  })

  // ── register ───────────────────────────────────────────────────────────────

  describe('register', () => {
    it('deve persistir usuário e retornar tokens', async () => {
      const result = await service.register({
        name: 'Integração User',
        email: uniqueEmail,
        phone: uniquePhone,
        password,
      })

      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
      expect(typeof result.accessToken).toBe('string')
      expect(result.accessToken.length).toBeGreaterThan(20)
    })

    it('deve lançar ConflictException para email duplicado', async () => {
      await expect(
        service.register({
          name: 'Outro User',
          email: uniqueEmail,
          phone: `119${Math.floor(10000000 + Math.random() * 89999999)}`,
          password,
        }),
      ).rejects.toThrow(ConflictException)
    })
  })

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('deve retornar tokens com credenciais corretas', async () => {
      const result = await service.login({ email: uniqueEmail, password })

      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
    })

    it('deve lançar UnauthorizedException com senha errada', async () => {
      await expect(service.login({ email: uniqueEmail, password: 'SenhaErrada' })).rejects.toThrow(
        UnauthorizedException,
      )
    })

    it('deve lançar UnauthorizedException para email inexistente', async () => {
      await expect(service.login({ email: 'naoexiste_integ@test.com', password })).rejects.toThrow(
        UnauthorizedException,
      )
    })
  })

  // ── refresh ────────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('deve emitir novos tokens a partir do refreshToken válido', async () => {
      const loginResult = await service.login({ email: uniqueEmail, password })
      const result = await service.refresh(loginResult.refreshToken)

      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
      expect(result.accessToken).not.toBe(loginResult.accessToken)
    })

    it('deve lançar UnauthorizedException com refreshToken inválido', async () => {
      await expect(service.refresh('token_invalido_xyz')).rejects.toThrow(UnauthorizedException)
    })
  })
})
