import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import { ChatRoom } from './chat-room.entity'
import { User } from '../../users/entities/user.entity'

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  LOCATION = 'location',
}

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid') id: string
  @ManyToOne(() => ChatRoom, (r) => r.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: ChatRoom
  @Column({ name: 'room_id' }) roomId: string
  @ManyToOne(() => User) @JoinColumn({ name: 'sender_id' }) sender: User
  @Column({ name: 'sender_id' }) senderId: string
  @Column({ type: 'enum', enum: MessageType, default: MessageType.TEXT }) type: MessageType
  @Column({ type: 'text' }) content: string
  @Column({ name: 'is_read', default: false }) isRead: boolean
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date
}
