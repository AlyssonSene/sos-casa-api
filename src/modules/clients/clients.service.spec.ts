import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException } from '@nestjs/common'
import { ClientsService } from './clients.service'
import { ClientProfile } from './entities/client-profile.entity'

const mockProfile: ClientProfile = {
  id: 'cli-1',
  userId: 'user-1',
  user: null as any,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
}

describe('ClientsService', () => {
  let service: ClientsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: getRepositoryToken(ClientProfile), useValue: mockRepo },
      ],
    }).compile()

    service = module.get<ClientsService>(ClientsService)
    jest.clearAllMocks()
  })

  describe('findByUserId', () => {
    it('should return profile when found', async () => {
      mockRepo.findOne.mockResolvedValue(mockProfile)
      const result = await service.findByUserId('user-1')
      expect(result).toEqual(mockProfile)
    })

    it('should throw NotFoundException when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      await expect(service.findByUserId('not-found')).rejects.toThrow(NotFoundException)
    })
  })

  describe('findAll', () => {
    it('should return all client profiles', async () => {
      mockRepo.find.mockResolvedValue([mockProfile])
      const result = await service.findAll()
      expect(result).toHaveLength(1)
    })
  })

  describe('create', () => {
    it('should create and save client profile', async () => {
      mockRepo.create.mockReturnValue(mockProfile)
      mockRepo.save.mockResolvedValue(mockProfile)
      const result = await service.create('user-1')
      expect(mockRepo.create).toHaveBeenCalledWith({ userId: 'user-1' })
      expect(result).toEqual(mockProfile)
    })
  })
})
