import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Notification } from './entities/notification.entity'

export interface SendNotificationDto {
  userId: string
  type: string
  title: string
  body: string
  data?: Record<string, unknown>
}

@Injectable()
export class NotificationsService {
  constructor(@InjectRepository(Notification) private readonly repo: Repository<Notification>) {}

  async send(dto: SendNotificationDto): Promise<Notification> {
    const notification = this.repo.create({ ...dto, data: dto.data ?? null })
    // TODO: integrar Expo Push Notifications aqui
    return this.repo.save(notification)
  }

  findByUser(userId: string): Promise<Notification[]> {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' }, take: 50 })
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.repo.update({ id, userId }, { isRead: true })
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repo.update({ userId, isRead: false }, { isRead: true })
  }
}
