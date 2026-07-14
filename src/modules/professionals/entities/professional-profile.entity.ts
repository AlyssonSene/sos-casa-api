import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ApprovalStatus { PENDING = 'pending', APPROVED = 'approved', REJECTED = 'rejected' }

@Entity('professional_profiles')
export class ProfessionalProfile {
  @PrimaryGeneratedColumn('uuid') id: string;
  @OneToOne(() => User) @JoinColumn({ name: 'user_id' }) user: User;
  @Column({ name: 'user_id' }) userId: string;
  @Column({ nullable: true, length: 14 }) cpf: string | null;
  @Column({ nullable: true, length: 18 }) cnpj: string | null;
  @Column({ nullable: true, type: 'text' }) description: string | null;
  @Column({ name: 'years_of_experience', type: 'smallint', default: 0 }) yearsOfExperience: number;
  @Column({ name: 'service_radius_km', type: 'smallint', default: 10 }) serviceRadiusKm: number;
  @Column({ length: 100 }) city: string;
  @Column({ type: 'char', length: 2 }) state: string;
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true }) latitude: number | null;
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true }) longitude: number | null;
  @Column({ name: 'approval_status', type: 'enum', enum: ApprovalStatus, default: ApprovalStatus.PENDING }) approvalStatus: ApprovalStatus;
  @Column({ name: 'approved_at', nullable: true }) approvedAt: Date | null;
  @Column({ name: 'approved_by', nullable: true }) approvedBy: string | null;
  @Column({ name: 'avg_rating', type: 'decimal', precision: 3, scale: 2, default: 0 }) avgRating: number;
  @Column({ name: 'total_services', default: 0 }) totalServices: number;
  @Column({ name: 'pix_key', nullable: true, length: 255 }) pixKey: string | null;
  @Column({ name: 'pix_key_type', nullable: true, length: 20 }) pixKeyType: string | null;
  @Column({ name: 'pagarme_recipient_id', nullable: true, length: 100 }) pagarmeRecipientId: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
