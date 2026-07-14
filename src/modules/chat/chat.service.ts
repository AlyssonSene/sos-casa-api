import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatMessage, MessageType } from './entities/chat-message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatRoom) private readonly roomRepo: Repository<ChatRoom>,
    @InjectRepository(ChatMessage) private readonly msgRepo: Repository<ChatMessage>,
  ) {}

  async findOrCreateRoom(requestId: string): Promise<ChatRoom> {
    let room = await this.roomRepo.findOneBy({ requestId });
    if (!room) room = await this.roomRepo.save(this.roomRepo.create({ requestId }));
    return room;
  }

  async findRoom(requestId: string): Promise<ChatRoom> {
    const room = await this.roomRepo.findOneBy({ requestId });
    if (!room) throw new NotFoundException(`Chat room for request ${requestId} not found`);
    return room;
  }

  getMessages(roomId: string, limit = 50): Promise<ChatMessage[]> {
    return this.msgRepo.find({
      where: { roomId },
      relations: { sender: true },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async saveMessage(roomId: string, senderId: string, content: string, type: MessageType = MessageType.TEXT): Promise<ChatMessage> {
    const msg = this.msgRepo.create({ roomId, senderId, content, type });
    return this.msgRepo.save(msg);
  }

  async markRead(roomId: string, userId: string): Promise<void> {
    await this.msgRepo
      .createQueryBuilder()
      .update(ChatMessage)
      .set({ isRead: true })
      .where('room_id = :roomId AND sender_id != :userId AND is_read = false', { roomId, userId })
      .execute();
  }
}
