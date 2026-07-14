import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm'
import { ProfessionalProfile } from '../../professionals/entities/professional-profile.entity'
import { Service } from './service.entity'

@Entity('professional_services')
@Unique(['professionalId', 'serviceId'])
export class ProfessionalService {
  @PrimaryGeneratedColumn('uuid') id: string
  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional: ProfessionalProfile
  @Column({ name: 'professional_id' }) professionalId: string
  @ManyToOne(() => Service) @JoinColumn({ name: 'service_id' }) service: Service
  @Column({ name: 'service_id' }) serviceId: string
  @Column({ type: 'decimal', precision: 10, scale: 2 }) price: number
  @Column({ name: 'is_active', default: true }) isActive: boolean
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date
}
