import { Test, TestingModule } from '@nestjs/testing'
import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { AuthService } from './auth.service'
import { UsersService } from '../users/users.service'
import { Role } from '../../common/enums/role.enum'
import { User } from '../users/entities/user.entity'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUser: User = {
  id: 'uuid-1',
  name: 'Test User',
  email: 'test@test.com',
  phone: '11999990000',
  passwordHash: '', // será preenchido nos testes
  role: Role.CLIENT,
  avatarUrl: null,
  isActive: true,
  emailVerified: false,
  phoneVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockUsersService = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
}

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock_token'),
  verify: jest.fn(),
}

const mockConfigService = {
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      'jwt.accessSecret': 'access_secret',
      'jwt.accessExpiresIn': '15m',
      'jwt.refreshSecret': 'refresh_secret',
      'jwt.refreshExpiresIn': '7d',
    }
    return map[key]
  }),
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    jest.clearAllMocks()
  })

  // ── register ────────────────────────────────────────────────────────────────

  describe('register', () => {
    it('deve criar usuário e retornar tokens', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null)
      mockUsersService.create.mockResolvedValue({ ...mockUser, id: 'uuid-new' })

      const result = await service.register({
        name: 'Novo User',
        email: 'novo@test.com',
        phone: '11900000000',
        password: 'Senha@123',
      })

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('novo@test.com')
      expect(mockUsersService.create).toHaveBeenCalled()
      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
    })

    it('deve lançar ConflictException se email já existir', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser)

      await expect(
        service.register({
          name: 'X',
          email: 'test@test.com',
          phone: '11900000000',
          password: '123',
        }),
      ).rejects.toThrow(ConflictException)

      expect(mockUsersService.create).not.toHaveBeenCalled()
    })
  })

  // ── login ───────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('deve retornar tokens com credenciais válidas', async () => {
      const hash = await bcrypt.hash('Senha@123', 10)
      mockUsersService.findByEmail.mockResolvedValue({ ...mockUser, passwordHash: hash })

      const result = await service.login({ email: 'test@test.com', password: 'Senha@123' })

      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
    })

    it('deve lançar UnauthorizedException com senha errada', async () => {
      const hash = await bcrypt.hash('Senha@123', 10)
      mockUsersService.findByEmail.mockResolvedValue({ ...mockUser, passwordHash: hash })

      await expect(
        service.login({ email: 'test@test.com', password: 'SenhaErrada' }),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('deve lançar UnauthorizedException se usuário não existir', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null)

      await expect(service.login({ email: 'naoexiste@test.com', password: '123' })).rejects.toThrow(
        UnauthorizedException,
      )
    })

    it('deve lançar UnauthorizedException se conta estiver inativa', async () => {
      const hash = await bcrypt.hash('Senha@123', 10)
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash: hash,
        isActive: false,
      })

      await expect(
        service.login({ email: 'test@test.com', password: 'Senha@123' }),
      ).rejects.toThrow(UnauthorizedException)
    })
  })

  // ── refresh ─────────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('deve retornar novos tokens com refresh token válido', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'uuid-1',
        email: 'test@test.com',
        role: Role.CLIENT,
      })
      mockUsersService.findById.mockResolvedValue(mockUser)

      const result = await service.refresh('valid_refresh_token')

      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
    })

    it('deve lançar UnauthorizedException com refresh token inválido', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid')
      })

      await expect(service.refresh('invalid_token')).rejects.toThrow(UnauthorizedException)
    })
  })
})
