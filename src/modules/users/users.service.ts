import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from './entities/user.entity'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOneBy({ id })
    if (!user) throw new NotFoundException(`User ${id} not found`)
    return user
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOneBy({ email })
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepo.create(data)
    return this.userRepo.save(user)
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.userRepo.update(id, data)
    return this.findById(id)
  }
}
