import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotificationsService } from './notifications.service'
import { Notification } from './entities/notification.entity'

const mockNotification: Notification = {
  id: 'notif-1',
  userId: 'user-1',
  type: 'service_request.accepted',
  title: 'Solicitação aceita',
  body: 'Seu profissional está a caminho',
  data: null,
  isRead: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockRepo = {
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
}

describe('NotificationsService', () => {
  let service: NotificationsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: mockRepo },
      ],
    }).compile()

    service = module.get<NotificationsService>(NotificationsService)
    jest.clearAllMocks()
  })

  describe('send', () => {
    it('should create and save notification without data', async () => {
      mockRepo.create.mockReturnValue(mockNotification)
      mockRepo.save.mockResolvedValue(mockNotification)
      const result = await service.send({
        userId: 'user-1',
        type: 'service_request.accepted',
        title: 'Solicitação aceita',
        body: 'A caminho',
      })
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ data: null }))
      expect(result).toEqual(mockNotification)
    })

    it('should pass data payload when provided', async () => {
      const withData = { ...mockNotification, data: { requestId: 'req-1' } }
      mockRepo.create.mockReturnValue(withData)
      mockRepo.save.mockResolvedValue(withData)
      const result = await service.send({
        userId: 'user-1',
        type: 'test',
        title: 'T',
        body: 'B',
        data: { requestId: 'req-1' },
      })
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { requestId: 'req-1' } }),
      )
      expect(result.data).toEqual({ requestId: 'req-1' })
    })
  })

  describe('findByUser', () => {
    it('should return notifications for user', async () => {
      mockRepo.find.mockResolvedValue([mockNotification])
      const result = await service.findByUser('user-1')
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      )
      expect(result).toHaveLength(1)
    })
  })

  describe('markRead', () => {
    it('should mark single notification as read', async () => {
      mockRepo.update.mockResolvedValue({ affected: 1 })
      await service.markRead('notif-1', 'user-1')
      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'notif-1', userId: 'user-1' },
        { isRead: true },
      )
    })
  })

  describe('markAllRead', () => {
    it('should mark all unread notifications as read', async () => {
      mockRepo.update.mockResolvedValue({ affected: 3 })
      await service.markAllRead('user-1')
      expect(mockRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', isRead: false },
        { isRead: true },
      )
    })
  })
})
