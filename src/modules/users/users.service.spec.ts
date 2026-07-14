import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException } from '@nestjs/common'
import { UsersService } from './users.service'
import { User } from './entities/user.entity'
import { Role } from '../../common/enums/role.enum'

const mockUser: User = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  phone: '11999999999',
  passwordHash: 'hash',
  role: Role.CLIENT,
  avatarUrl: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockRepo = {
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
}

describe('UsersService', () => {
  let service: UsersService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: getRepositoryToken(User), useValue: mockRepo }],
    }).compile()

    service = module.get<UsersService>(UsersService)
    jest.clearAllMocks()
  })

  describe('findById', () => {
    it('should return user when found', async () => {
      mockRepo.findOneBy.mockResolvedValue(mockUser)
      const result = await service.findById('user-1')
      expect(result).toEqual(mockUser)
      expect(mockRepo.findOneBy).toHaveBeenCalledWith({ id: 'user-1' })
    })

    it('should throw NotFoundException when not found', async () => {
      mockRepo.findOneBy.mockResolvedValue(null)
      await expect(service.findById('not-found')).rejects.toThrow(NotFoundException)
    })
  })

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      mockRepo.findOneBy.mockResolvedValue(mockUser)
      const result = await service.findByEmail('test@example.com')
      expect(result).toEqual(mockUser)
    })

    it('should return null when not found', async () => {
      mockRepo.findOneBy.mockResolvedValue(null)
      const result = await service.findByEmail('none@example.com')
      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create and save user', async () => {
      mockRepo.create.mockReturnValue(mockUser)
      mockRepo.save.mockResolvedValue(mockUser)
      const result = await service.create({ name: 'Test', email: 'test@example.com' })
      expect(mockRepo.create).toHaveBeenCalledWith({ name: 'Test', email: 'test@example.com' })
      expect(mockRepo.save).toHaveBeenCalledWith(mockUser)
      expect(result).toEqual(mockUser)
    })
  })

  describe('update', () => {
    it('should update and return updated user', async () => {
      const updated = { ...mockUser, name: 'Updated Name' }
      mockRepo.update.mockResolvedValue({ affected: 1 })
      mockRepo.findOneBy.mockResolvedValue(updated)
      const result = await service.update('user-1', { name: 'Updated Name' })
      expect(mockRepo.update).toHaveBeenCalledWith('user-1', { name: 'Updated Name' })
      expect(result.name).toBe('Updated Name')
    })

    it('should throw NotFoundException if user does not exist after update', async () => {
      mockRepo.update.mockResolvedValue({ affected: 0 })
      mockRepo.findOneBy.mockResolvedValue(null)
      await expect(service.update('not-found', { name: 'X' })).rejects.toThrow(NotFoundException)
    })
  })
})
