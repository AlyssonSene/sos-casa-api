import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException } from '@nestjs/common'
import { ChatService } from './chat.service'
import { ChatRoom } from './entities/chat-room.entity'
import { ChatMessage, MessageType } from './entities/chat-message.entity'

const mockRoom: ChatRoom = {
  id: 'room-1',
  requestId: 'req-1',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockMessage: ChatMessage = {
  id: 'msg-1',
  roomId: 'room-1',
  senderId: 'user-1',
  content: 'Olá!',
  type: MessageType.TEXT,
  isRead: false,
  sender: null as any,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockRoomRepo = {
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
}

const mockMsgRepo = {
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
}

describe('ChatService', () => {
  let service: ChatService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(ChatRoom), useValue: mockRoomRepo },
        { provide: getRepositoryToken(ChatMessage), useValue: mockMsgRepo },
      ],
    }).compile()

    service = module.get<ChatService>(ChatService)
    jest.clearAllMocks()
  })

  describe('findOrCreateRoom', () => {
    it('should return existing room when found', async () => {
      mockRoomRepo.findOneBy.mockResolvedValue(mockRoom)
      const result = await service.findOrCreateRoom('req-1')
      expect(result).toEqual(mockRoom)
      expect(mockRoomRepo.save).not.toHaveBeenCalled()
    })

    it('should create and save room when not found', async () => {
      mockRoomRepo.findOneBy.mockResolvedValue(null)
      mockRoomRepo.create.mockReturnValue(mockRoom)
      mockRoomRepo.save.mockResolvedValue(mockRoom)
      const result = await service.findOrCreateRoom('req-1')
      expect(mockRoomRepo.create).toHaveBeenCalledWith({ requestId: 'req-1' })
      expect(result).toEqual(mockRoom)
    })
  })

  describe('findRoom', () => {
    it('should return room when found', async () => {
      mockRoomRepo.findOneBy.mockResolvedValue(mockRoom)
      const result = await service.findRoom('req-1')
      expect(result).toEqual(mockRoom)
    })

    it('should throw NotFoundException when room not found', async () => {
      mockRoomRepo.findOneBy.mockResolvedValue(null)
      await expect(service.findRoom('not-found')).rejects.toThrow(NotFoundException)
    })
  })

  describe('getMessages', () => {
    it('should return messages for room with default limit', async () => {
      mockMsgRepo.find.mockResolvedValue([mockMessage])
      const result = await service.getMessages('room-1')
      expect(mockMsgRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { roomId: 'room-1' }, take: 50 }),
      )
      expect(result).toHaveLength(1)
    })

    it('should respect custom limit', async () => {
      mockMsgRepo.find.mockResolvedValue([mockMessage])
      await service.getMessages('room-1', 10)
      expect(mockMsgRepo.find).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }))
    })
  })

  describe('saveMessage', () => {
    it('should save message with TEXT type by default', async () => {
      mockMsgRepo.create.mockReturnValue(mockMessage)
      mockMsgRepo.save.mockResolvedValue(mockMessage)
      const result = await service.saveMessage('room-1', 'user-1', 'Olá!')
      expect(mockMsgRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: MessageType.TEXT }),
      )
      expect(result).toEqual(mockMessage)
    })

    it('should save message with custom type', async () => {
      const imageMsg = { ...mockMessage, type: MessageType.IMAGE }
      mockMsgRepo.create.mockReturnValue(imageMsg)
      mockMsgRepo.save.mockResolvedValue(imageMsg)
      const result = await service.saveMessage('room-1', 'user-1', 'url', MessageType.IMAGE)
      expect(result.type).toBe(MessageType.IMAGE)
    })
  })

  describe('markRead', () => {
    it('should mark messages as read via query builder', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 2 }),
      }
      mockMsgRepo.createQueryBuilder.mockReturnValue(qb)
      await service.markRead('room-1', 'user-1')
      expect(qb.set).toHaveBeenCalledWith({ isRead: true })
      expect(qb.execute).toHaveBeenCalled()
    })
  })
})
