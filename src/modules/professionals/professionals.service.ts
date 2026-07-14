import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProfessionalProfile, ApprovalStatus } from './entities/professional-profile.entity'
import { UpdatePixKeyDto } from './dto/update-pix-key.dto'

@Injectable()
export class ProfessionalsService {
  constructor(
    @InjectRepository(ProfessionalProfile)
    private readonly repo: Repository<ProfessionalProfile>,
  ) {}

  findAll(status?: ApprovalStatus): Promise<ProfessionalProfile[]> {
    const where = status ? { approvalStatus: status } : {}
    return this.repo.find({ where, relations: { user: true }, order: { createdAt: 'DESC' } })
  }

  async findById(id: string): Promise<ProfessionalProfile> {
    const prof = await this.repo.findOne({ where: { id }, relations: { user: true } })
    if (!prof) throw new NotFoundException(`Professional ${id} not found`)
    return prof
  }

  findByUserId(userId: string): Promise<ProfessionalProfile | null> {
    return this.repo.findOne({ where: { userId }, relations: { user: true } })
  }

  /**
   * Busca o perfil do profissional vinculado a uma solicitação de serviço.
   * Usado pelo PaymentsService para recuperar a chave PIX no momento do pagamento.
   */
  async findByRequestId(requestId: string): Promise<ProfessionalProfile | null> {
    // A solicitação tem um professionalId — join via sub-query
    return this.repo
      .createQueryBuilder('p')
      .innerJoin('service_requests', 'sr', 'sr.professional_id = p.user_id')
      .where('sr.id = :requestId', { requestId })
      .getOne()
  }

  create(data: Partial<ProfessionalProfile>): Promise<ProfessionalProfile> {
    return this.repo.save(this.repo.create(data))
  }

  async update(id: string, data: Partial<ProfessionalProfile>): Promise<ProfessionalProfile> {
    await this.repo.update(id, data)
    return this.findById(id)
  }

  async approve(id: string, adminId: string): Promise<ProfessionalProfile> {
    return this.update(id, {
      approvalStatus: ApprovalStatus.APPROVED,
      approvedBy: adminId,
      approvedAt: new Date(),
    })
  }

  async reject(id: string, adminId: string): Promise<ProfessionalProfile> {
    return this.update(id, {
      approvalStatus: ApprovalStatus.REJECTED,
      approvedBy: adminId,
      approvedAt: new Date(),
    })
  }

  // ── PIX key ────────────────────────────────────────────────────────────────

  async updatePixKey(userId: string, dto: UpdatePixKeyDto): Promise<ProfessionalProfile> {
    const profile = await this.repo.findOneBy({ userId })
    if (!profile) throw new NotFoundException('Perfil profissional não encontrado')

    profile.pixKey = dto.pixKey
    profile.pixKeyType = dto.pixKeyType
    return this.repo.save(profile)
  }

  async removePixKey(userId: string): Promise<ProfessionalProfile> {
    const profile = await this.repo.findOneBy({ userId })
    if (!profile) throw new NotFoundException('Perfil profissional não encontrado')

    profile.pixKey = null
    profile.pixKeyType = null
    return this.repo.save(profile)
  }
}
