import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Review } from './entities/review.entity'
import { CreateReviewDto } from './dto/create-review.dto'

@Injectable()
export class ReviewsService {
  constructor(@InjectRepository(Review) private readonly repo: Repository<Review>) {}

  async create(clientId: string, dto: CreateReviewDto): Promise<Review> {
    const existing = await this.repo.findOneBy({ requestId: dto.requestId })
    if (existing) throw new ConflictException('Review already exists for this request')
    const review = this.repo.create({ ...dto, clientId })
    return this.repo.save(review)
  }

  findByProfessional(professionalId: string): Promise<Review[]> {
    return this.repo.find({ where: { professionalId }, order: { createdAt: 'DESC' } })
  }

  findAll(): Promise<Review[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } })
  }

  async remove(id: string): Promise<void> {
    const review = await this.repo.findOneBy({ id })
    if (!review) throw new NotFoundException(`Review ${id} not found`)
    await this.repo.delete(id)
  }
}
