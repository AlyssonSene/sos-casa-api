import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Service } from './entities/service.entity'
import { ProfessionalService } from './entities/professional-service.entity'
import { CreateServiceDto, UpsertProfessionalServiceDto } from './dto/create-service.dto'

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service) private readonly serviceRepo: Repository<Service>,
    @InjectRepository(ProfessionalService)
    private readonly proServiceRepo: Repository<ProfessionalService>,
  ) {}

  findAll(categoryId?: string): Promise<Service[]> {
    const where = categoryId ? { categoryId, isActive: true } : { isActive: true }
    return this.serviceRepo.find({
      where,
      relations: { category: true },
      order: { sortOrder: 'ASC' },
    })
  }

  async findById(id: string): Promise<Service> {
    const svc = await this.serviceRepo.findOne({ where: { id }, relations: { category: true } })
    if (!svc) throw new NotFoundException(`Service ${id} not found`)
    return svc
  }

  create(dto: CreateServiceDto): Promise<Service> {
    return this.serviceRepo.save(this.serviceRepo.create(dto))
  }

  async update(id: string, dto: Partial<CreateServiceDto>): Promise<Service> {
    await this.serviceRepo.update(id, dto)
    return this.findById(id)
  }

  findProfessionalServices(professionalId: string): Promise<ProfessionalService[]> {
    return this.proServiceRepo.find({
      where: { professionalId, isActive: true },
      relations: { service: true },
    })
  }

  async upsertProfessionalService(
    professionalId: string,
    dto: UpsertProfessionalServiceDto,
  ): Promise<ProfessionalService> {
    const existing = await this.proServiceRepo.findOneBy({
      professionalId,
      serviceId: dto.serviceId,
    })
    if (existing) {
      existing.price = dto.price
      existing.isActive = true
      return this.proServiceRepo.save(existing)
    }
    return this.proServiceRepo.save(
      this.proServiceRepo.create({ professionalId, serviceId: dto.serviceId, price: dto.price }),
    )
  }

  async removeProfessionalService(professionalId: string, serviceId: string): Promise<void> {
    await this.proServiceRepo.update({ professionalId, serviceId }, { isActive: false })
  }
}
