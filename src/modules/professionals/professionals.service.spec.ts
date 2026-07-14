import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException } from '@nestjs/common'
import { ProfessionalsService } from './professionals.service'
import {
  ProfessionalProfile,
  ApprovalStatus,
  PixKeyType,
} from './entities/professional-profile.entity'

const mockProfile: ProfessionalProfile = {
  id: 'prof-1',
  userId: 'user-1',
  bio: 'Eletricista experiente',
  cpf: '000.000.000-00',
  cnpj: null,
  approvalStatus: ApprovalStatus.PENDING,
  approvedBy: null,
  approvedAt: null,
  stripeAccountId: null,
  pixKey: null,
  pixKeyType: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: null as any,
}

const mockRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
}

describe('ProfessionalsService', () => {
  let service: ProfessionalsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfessionalsService,
        { provide: getRepositoryToken(ProfessionalProfile), useValue: mockRepo },
      ],
    }).compile()

    service = module.get<ProfessionalsService>(ProfessionalsService)
    jest.clearAllMocks()
  })

  describe('findAll', () => {
    it('should return all profiles when no status filter', async () => {
      mockRepo.find.mockResolvedValue([mockProfile])
      const result = await service.findAll()
      expect(mockRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: {} }))
      expect(result).toHaveLength(1)
    })

    it('should filter by status when provided', async () => {
      mockRepo.find.mockResolvedValue([mockProfile])
      await service.findAll(ApprovalStatus.PENDING)
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { approvalStatus: ApprovalStatus.PENDING } }),
      )
    })
  })

  describe('findById', () => {
    it('should return profile when found', async () => {
      mockRepo.findOne.mockResolvedValue(mockProfile)
      const result = await service.findById('prof-1')
      expect(result).toEqual(mockProfile)
    })

    it('should throw NotFoundException when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      await expect(service.findById('not-found')).rejects.toThrow(NotFoundException)
    })
  })

  describe('findByUserId', () => {
    it('should return profile by userId', async () => {
      mockRepo.findOne.mockResolvedValue(mockProfile)
      const result = await service.findByUserId('user-1')
      expect(result).toEqual(mockProfile)
    })

    it('should return null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      const result = await service.findByUserId('not-found')
      expect(result).toBeNull()
    })
  })

  describe('findByRequestId', () => {
    it('should query by requestId via query builder', async () => {
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockProfile),
      }
      mockRepo.createQueryBuilder.mockReturnValue(qb)
      const result = await service.findByRequestId('req-1')
      expect(qb.where).toHaveBeenCalledWith('sr.id = :requestId', { requestId: 'req-1' })
      expect(result).toEqual(mockProfile)
    })
  })

  describe('create', () => {
    it('should create and save profile', async () => {
      mockRepo.create.mockReturnValue(mockProfile)
      mockRepo.save.mockResolvedValue(mockProfile)
      const result = await service.create({ userId: 'user-1', bio: 'Bio' })
      expect(result).toEqual(mockProfile)
    })
  })

  describe('approve', () => {
    it('should set status to APPROVED', async () => {
      const approved = { ...mockProfile, approvalStatus: ApprovalStatus.APPROVED }
      mockRepo.update.mockResolvedValue({ affected: 1 })
      mockRepo.findOne.mockResolvedValue(approved)
      const result = await service.approve('prof-1', 'admin-1')
      expect(result.approvalStatus).toBe(ApprovalStatus.APPROVED)
    })
  })

  describe('reject', () => {
    it('should set status to REJECTED', async () => {
      const rejected = { ...mockProfile, approvalStatus: ApprovalStatus.REJECTED }
      mockRepo.update.mockResolvedValue({ affected: 1 })
      mockRepo.findOne.mockResolvedValue(rejected)
      const result = await service.reject('prof-1', 'admin-1')
      expect(result.approvalStatus).toBe(ApprovalStatus.REJECTED)
    })
  })

  describe('updatePixKey', () => {
    it('should update pix key on existing profile', async () => {
      const profile = { ...mockProfile }
      mockRepo.findOneBy.mockResolvedValue(profile)
      mockRepo.save.mockResolvedValue({
        ...profile,
        pixKey: 'email@test.com',
        pixKeyType: PixKeyType.EMAIL,
      })
      const result = await service.updatePixKey('user-1', {
        pixKey: 'email@test.com',
        pixKeyType: PixKeyType.EMAIL,
      })
      expect(mockRepo.save).toHaveBeenCalled()
      expect(result.pixKey).toBe('email@test.com')
    })

    it('should throw NotFoundException when profile not found', async () => {
      mockRepo.findOneBy.mockResolvedValue(null)
      await expect(
        service.updatePixKey('not-found', { pixKey: 'k', pixKeyType: PixKeyType.CPF }),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('removePixKey', () => {
    it('should clear pix key', async () => {
      const profile = { ...mockProfile, pixKey: 'email@test.com', pixKeyType: PixKeyType.EMAIL }
      mockRepo.findOneBy.mockResolvedValue(profile)
      mockRepo.save.mockResolvedValue({ ...profile, pixKey: null, pixKeyType: null })
      const result = await service.removePixKey('user-1')
      expect(result.pixKey).toBeNull()
    })

    it('should throw NotFoundException when profile not found', async () => {
      mockRepo.findOneBy.mockResolvedValue(null)
      await expect(service.removePixKey('not-found')).rejects.toThrow(NotFoundException)
    })
  })
})
