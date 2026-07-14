import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessionalProfile, ApprovalStatus } from './entities/professional-profile.entity';

@Injectable()
export class ProfessionalsService {
  constructor(
    @InjectRepository(ProfessionalProfile)
    private readonly repo: Repository<ProfessionalProfile>,
  ) {}

  findAll(status?: ApprovalStatus): Promise<ProfessionalProfile[]> {
    const where = status ? { approvalStatus: status } : {};
    return this.repo.find({ where, relations: { user: true }, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<ProfessionalProfile> {
    const prof = await this.repo.findOne({ where: { id }, relations: { user: true } });
    if (!prof) throw new NotFoundException(`Professional ${id} not found`);
    return prof;
  }

  findByUserId(userId: string): Promise<ProfessionalProfile | null> {
    return this.repo.findOne({ where: { userId }, relations: { user: true } });
  }

  create(data: Partial<ProfessionalProfile>): Promise<ProfessionalProfile> {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<ProfessionalProfile>): Promise<ProfessionalProfile> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async approve(id: string, adminId: string): Promise<ProfessionalProfile> {
    return this.update(id, {
      approvalStatus: ApprovalStatus.APPROVED,
      approvedBy: adminId,
      approvedAt: new Date(),
    });
  }

  async reject(id: string, adminId: string): Promise<ProfessionalProfile> {
    return this.update(id, {
      approvalStatus: ApprovalStatus.REJECTED,
      approvedBy: adminId,
      approvedAt: new Date(),
    });
  }
}
