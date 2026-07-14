import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException } from '@nestjs/common'
import { ServicesService } from './services.service'
import { Service } from './entities/service.entity'
import { ProfessionalService } from './entities/professional-service.entity'

const mockService: Service = {
  id: 'svc-1',
  name: 'Instalação Elétrica',
  description: 'Instala tomadas e interruptores',
  categoryId: 'cat-1',
  category: null as any,
  isPriceVariable: false,
  estimatedDurationMinutes: 60,
  isActive: true,
  sortOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockProfService: ProfessionalService = {
  id: 'ps-1',
  professionalId: 'prof-1',
  professional: null as any,
  serviceId: 'svc-1',
  service: null as any,
  price: 150,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockServiceRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
}

const mockProServiceRepo = {
  find: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
}

describe('ServicesService', () => {
  let service: ServicesService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: getRepositoryToken(Service), useValue: mockServiceRepo },
        { provide: getRepositoryToken(ProfessionalService), useValue: mockProServiceRepo },
      ],
    }).compile()

    service = module.get<ServicesService>(ServicesService)
    jest.clearAllMocks()
  })

  describe('findAll', () => {
    it('should return all active services without filter', async () => {
      mockServiceRepo.find.mockResolvedValue([mockService])
      const result = await service.findAll()
      expect(mockServiceRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      )
      expect(result).toHaveLength(1)
    })

    it('should filter by categoryId when provided', async () => {
      mockServiceRepo.find.mockResolvedValue([mockService])
      await service.findAll('cat-1')
      expect(mockServiceRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { categoryId: 'cat-1', isActive: true } }),
      )
    })
  })

  describe('findById', () => {
    it('should return service when found', async () => {
      mockServiceRepo.findOne.mockResolvedValue(mockService)
      const result = await service.findById('svc-1')
      expect(result).toEqual(mockService)
    })

    it('should throw NotFoundException when not found', async () => {
      mockServiceRepo.findOne.mockResolvedValue(null)
      await expect(service.findById('not-found')).rejects.toThrow(NotFoundException)
    })
  })

  describe('create', () => {
    it('should create and save service', async () => {
      mockServiceRepo.create.mockReturnValue(mockService)
      mockServiceRepo.save.mockResolvedValue(mockService)
      const result = await service.create({ name: 'Instalação Elétrica', categoryId: 'cat-1' })
      expect(result).toEqual(mockService)
    })
  })

  describe('update', () => {
    it('should update and return service', async () => {
      const updated = { ...mockService, name: 'Atualizado' }
      mockServiceRepo.update.mockResolvedValue({ affected: 1 })
      mockServiceRepo.findOne.mockResolvedValue(updated)
      const result = await service.update('svc-1', { name: 'Atualizado' })
      expect(result.name).toBe('Atualizado')
    })
  })

  describe('findProfessionalServices', () => {
    it('should return active services for a professional', async () => {
      mockProServiceRepo.find.mockResolvedValue([mockProfService])
      const result = await service.findProfessionalServices('prof-1')
      expect(mockProServiceRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { professionalId: 'prof-1', isActive: true } }),
      )
      expect(result).toHaveLength(1)
    })
  })

  describe('upsertProfessionalService', () => {
    it('should update price if service already exists', async () => {
      const existing = { ...mockProfService }
      mockProServiceRepo.findOneBy.mockResolvedValue(existing)
      mockProServiceRepo.save.mockResolvedValue({ ...existing, price: 200 })
      const result = await service.upsertProfessionalService('prof-1', {
        serviceId: 'svc-1',
        price: 200,
      })
      expect(result.price).toBe(200)
      expect(mockProServiceRepo.create).not.toHaveBeenCalled()
    })

    it('should create new entry if service does not exist', async () => {
      mockProServiceRepo.findOneBy.mockResolvedValue(null)
      mockProServiceRepo.create.mockReturnValue(mockProfService)
      mockProServiceRepo.save.mockResolvedValue(mockProfService)
      const result = await service.upsertProfessionalService('prof-1', {
        serviceId: 'svc-1',
        price: 150,
      })
      expect(mockProServiceRepo.create).toHaveBeenCalled()
      expect(result).toEqual(mockProfService)
    })
  })

  describe('removeProfessionalService', () => {
    it('should soft-delete by setting isActive to false', async () => {
      mockProServiceRepo.update.mockResolvedValue({ affected: 1 })
      await service.removeProfessionalService('prof-1', 'svc-1')
      expect(mockProServiceRepo.update).toHaveBeenCalledWith(
        { professionalId: 'prof-1', serviceId: 'svc-1' },
        { isActive: false },
      )
    })
  })
})
