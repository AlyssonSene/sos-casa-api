import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Category } from './entities/category.entity'

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  findAll(): Promise<Category[]> {
    return this.repo.find({ where: { isActive: true }, order: { sortOrder: 'ASC' } })
  }

  async findById(id: string): Promise<Category> {
    const cat = await this.repo.findOneBy({ id })
    if (!cat) throw new NotFoundException(`Category ${id} not found`)
    return cat
  }

  create(data: Partial<Category>): Promise<Category> {
    return this.repo.save(this.repo.create(data))
  }

  async update(id: string, data: Partial<Category>): Promise<Category> {
    await this.repo.update(id, data)
    return this.findById(id)
  }

  async remove(id: string): Promise<void> {
    await this.repo.update(id, { isActive: false })
  }
}
