import { Test, TestingModule } from '@nestjs/testing'
import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtStrategy, JwtPayload } from './jwt.strategy'
import { UsersService } from '../../users/users.service'
import { Role } from '../../../common/enums/role.enum'
import { User } from '../../users/entities/user.entity'

const mockUser: User = {
  id: 'user-1',
  name: 'Test',
  email: 'test@example.com',
  phone: '11999999999',
  passwordHash: 'hash',
  role: Role.CLIENT,
  avatarUrl: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockConfig = { get: jest.fn().mockReturnValue('test-secret') }
const mockUsersService = { findById: jest.fn() }

describe('JwtStrategy', () => {
  let strategy: JwtStrategy

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: mockConfig },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile()

    strategy = module.get<JwtStrategy>(JwtStrategy)
    jest.clearAllMocks()
  })

  const payload: JwtPayload = { sub: 'user-1', email: 'test@example.com', role: Role.CLIENT }

  it('should return user when found and active', async () => {
    mockUsersService.findById.mockResolvedValue(mockUser)
    const result = await strategy.validate(payload)
    expect(result).toEqual(mockUser)
  })

  it('should throw UnauthorizedException when user not found', async () => {
    mockUsersService.findById.mockResolvedValue(null)
    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException)
  })

  it('should throw UnauthorizedException when user is inactive', async () => {
    mockUsersService.findById.mockResolvedValue({ ...mockUser, isActive: false })
    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException)
  })
})
