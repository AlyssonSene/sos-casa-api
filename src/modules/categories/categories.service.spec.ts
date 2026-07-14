import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException } from '@nestjs/common'
import { CategoriesService } from './categories.service'
import { Category } from './entities/category.entity'

const mockCategory: Category = {
  id: 'cat-1',
  name: 'Elétrica',
  description: 'Serviços elétricos',
  icon: 'bolt',
  isActive: true,
  sortOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockRepo = {
  find: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
}

describe('CategoriesService', () => {
  let service: CategoriesService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoriesService, { provide: getRepositoryToken(Category), useValue: mockRepo }],
    }).compile()

    service = module.get<CategoriesService>(CategoriesService)
    jest.clearAllMocks()
  })

  describe('findAll', () => {
    it('should return active categories ordered by sortOrder', async () => {
      mockRepo.find.mockResolvedValue([mockCategory])
      const result = await service.findAll()
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      )
      expect(result).toHaveLength(1)
    })
  })

  describe('findById', () => {
    it('should return category when found', async () => {
      mockRepo.findOneBy.mockResolvedValue(mockCategory)
      const result = await service.findById('cat-1')
      expect(result).toEqual(mockCategory)
    })

    it('should throw NotFoundException when not found', async () => {
      mockRepo.findOneBy.mockResolvedValue(null)
      await expect(service.findById('not-found')).rejects.toThrow(NotFoundException)
    })
  })

  describe('create', () => {
    it('should create and save category', async () => {
      mockRepo.create.mockReturnValue(mockCategory)
      mockRepo.save.mockResolvedValue(mockCategory)
      const result = await service.create({ name: 'Elétrica' })
      expect(result).toEqual(mockCategory)
    })
  })

  describe('update', () => {
    it('should update and return category', async () => {
      const updated = { ...mockCategory, name: 'Hidráulica' }
      mockRepo.update.mockResolvedValue({ affected: 1 })
      mockRepo.findOneBy.mockResolvedValue(updated)
      const result = await service.update('cat-1', { name: 'Hidráulica' })
      expect(result.name).toBe('Hidráulica')
    })
  })

  describe('remove', () => {
    it('should soft-delete by setting isActive to false', async () => {
      mockRepo.update.mockResolvedValue({ affected: 1 })
      await service.remove('cat-1')
      expect(mockRepo.update).toHaveBeenCalledWith('cat-1', { isActive: false })
    })
  })
})
