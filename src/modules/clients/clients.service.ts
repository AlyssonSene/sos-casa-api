import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ClientProfile } from './entities/client-profile.entity'

@Injectable()
export class ClientsService {
  constructor(@InjectRepository(ClientProfile) private readonly repo: Repository<ClientProfile>) {}

  async findByUserId(userId: string): Promise<ClientProfile> {
    const profile = await this.repo.findOne({ where: { userId }, relations: { user: true } })
    if (!profile) throw new NotFoundException(`Client profile for user ${userId} not found`)
    return profile
  }

  async findAll(): Promise<ClientProfile[]> {
    return this.repo.find({ relations: { user: true }, order: { createdAt: 'DESC' } })
  }

  create(userId: string): Promise<ClientProfile> {
    return this.repo.save(this.repo.create({ userId }))
  }
}
