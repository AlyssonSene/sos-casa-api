import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { AttachmentsService } from './attachments.service'
import { Attachment } from './entities/attachment.entity'

const mockAttachment: Attachment = {
  id: 'att-1',
  entityType: 'payment',
  entityId: 'pay-1',
  url: 'https://storage.example.com/att-1.jpg',
  filename: 'comprovante.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 204800,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockRepo = {
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
}

describe('AttachmentsService', () => {
  let service: AttachmentsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentsService,
        { provide: getRepositoryToken(Attachment), useValue: mockRepo },
      ],
    }).compile()

    service = module.get<AttachmentsService>(AttachmentsService)
    jest.clearAllMocks()
  })

  describe('findByEntity', () => {
    it('should return attachments for a given entity', async () => {
      mockRepo.find.mockResolvedValue([mockAttachment])
      const result = await service.findByEntity('payment', 'pay-1')
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { entityType: 'payment', entityId: 'pay-1' } }),
      )
      expect(result).toHaveLength(1)
    })
  })

  describe('create', () => {
    it('should create and save attachment', async () => {
      mockRepo.create.mockReturnValue(mockAttachment)
      mockRepo.save.mockResolvedValue(mockAttachment)
      const result = await service.create({ entityType: 'payment', entityId: 'pay-1' })
      expect(result).toEqual(mockAttachment)
    })
  })

  describe('remove', () => {
    it('should delete attachment by id', async () => {
      mockRepo.delete.mockResolvedValue({ affected: 1 })
      await service.remove('att-1')
      expect(mockRepo.delete).toHaveBeenCalledWith('att-1')
    })
  })
})
