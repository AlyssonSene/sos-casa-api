import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RequestStatus } from '../../../common/enums/request-status.enum';

@Entity('service_requests')
export class ServiceRequest {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => User) @JoinColumn({ name: 'client_id' }) client: User;
  @Column({ name: 'client_id' }) clientId: string;
  @Column({ name: 'address_id' }) addressId: string;
  @Column({ name: 'professional_id', nullable: true }) professionalId: string | null;
  @Column({ type: 'enum', enum: RequestStatus, default: RequestStatus.PENDING }) status: RequestStatus;
  @Column({ default: 'normal', length: 10 }) urgency: string;
  @Column({ nullable: true, type: 'text' }) description: string | null;
  @Column({ name: 'material_provider', default: 'client', length: 20 }) materialProvider: string;
  @Column({ name: 'material_value', type: 'decimal', precision: 10, scale: 2, default: 0 }) materialValue: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) subtotal: number;
  @Column({ name: 'travel_fee', type: 'decimal', precision: 10, scale: 2, default: 0 }) travelFee: number;
  @Column({ name: 'platform_fee', type: 'decimal', precision: 10, scale: 2, default: 0 }) platformFee: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) total: number;
  @Column({ name: 'cancelled_by', nullable: true }) cancelledBy: string | null;
  @Column({ name: 'cancellation_reason', nullable: true, type: 'text' }) cancellationReason: string | null;
  @Column({ name: 'accepted_at', nullable: true }) acceptedAt: Date | null;
  @Column({ name: 'on_the_way_at', nullable: true }) onTheWayAt: Date | null;
  @Column({ name: 'arrived_at', nullable: true }) arrivedAt: Date | null;
  @Column({ name: 'started_at', nullable: true }) startedAt: Date | null;
  @Column({ name: 'completed_at', nullable: true }) completedAt: Date | null;
  @Column({ name: 'confirmed_at', nullable: true }) confirmedAt: Date | null;
  @Column({ name: 'paid_at', nullable: true }) paidAt: Date | null;
  @Column({ name: 'finalized_at', nullable: true }) finalizedAt: Date | null;
  @Column({ name: 'cancelled_at', nullable: true }) cancelledAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
