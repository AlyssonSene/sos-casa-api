import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { User } from '../../users/entities/user.entity'
import { RequestStatus } from '../../../common/enums/request-status.enum'

@Entity('service_requests')
export class ServiceRequest {
  @PrimaryGeneratedColumn('uuid') id: string
  @ManyToOne(() => User) @JoinColumn({ name: 'client_id' }) client: User
  @Column({ name: 'client_id' }) clientId: string
  @Column({ name: 'address_id' }) addressId: string
  @Column({ name: 'professional_id', type: 'uuid', nullable: true }) professionalId: string | null
  @Column({ type: 'enum', enum: RequestStatus, default: RequestStatus.PENDING })
  status: RequestStatus
  @Column({ default: 'normal', length: 10 }) urgency: string
  @Column({ nullable: true, type: 'text' }) description: string | null
  @Column({ name: 'material_provider', default: 'client', length: 20 }) materialProvider: string
  @Column({ name: 'material_value', type: 'decimal', precision: 10, scale: 2, default: 0 })
  materialValue: number
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) subtotal: number
  @Column({ name: 'travel_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  travelFee: number
  @Column({ name: 'platform_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  platformFee: number
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) total: number
  @Column({ name: 'cancelled_by', type: 'uuid', nullable: true }) cancelledBy: string | null
  @Column({ name: 'cancellation_reason', nullable: true, type: 'text' }) cancellationReason:
    string | null
  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true }) acceptedAt: Date | null
  @Column({ name: 'on_the_way_at', type: 'timestamp', nullable: true }) onTheWayAt: Date | null
  @Column({ name: 'arrived_at', type: 'timestamp', nullable: true }) arrivedAt: Date | null
  @Column({ name: 'started_at', type: 'timestamp', nullable: true }) startedAt: Date | null
  @Column({ name: 'completed_at', type: 'timestamp', nullable: true }) completedAt: Date | null
  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true }) confirmedAt: Date | null
  @Column({ name: 'paid_at', type: 'timestamp', nullable: true }) paidAt: Date | null
  @Column({ name: 'finalized_at', type: 'timestamp', nullable: true }) finalizedAt: Date | null
  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true }) cancelledAt: Date | null
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date
}
