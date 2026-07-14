import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment } from './entities/attachment.entity';

@Injectable()
export class AttachmentsService {
  constructor(@InjectRepository(Attachment) private readonly repo: Repository<Attachment>) {}

  findByEntity(entityType: string, entityId: string): Promise<Attachment[]> {
    return this.repo.find({ where: { entityType, entityId }, order: { createdAt: 'ASC' } });
  }

  create(data: Partial<Attachment>): Promise<Attachment> {
    return this.repo.save(this.repo.create(data));
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
