import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ApprovalStatus {
  PENDING  = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum PixKeyType {
  CPF    = 'cpf',
  CNPJ   = 'cnpj',
  EMAIL  = 'email',
  PHONE  = 'phone',
  RANDOM = 'random',
}

@Entity('professional_profiles')
export class ProfessionalProfile {
  @PrimaryGeneratedColumn('uuid') id: string;

  @OneToOne(() => User) @JoinColumn({ name: 'user_id' }) user: User;
  @Column({ name: 'user_id' }) userId: string;

  // ── Documentos ─────────────────────────────────────────────────────────────
  @Column({ nullable: true, length: 14 }) cpf: string | null;
  @Column({ nullable: true, length: 18 }) cnpj: string | null;

  // ── Perfil ─────────────────────────────────────────────────────────────────
  @Column({ nullable: true, type: 'text' }) description: string | null;
  @Column({ name: 'years_of_experience', type: 'smallint', default: 0 }) yearsOfExperience: number;
  @Column({ name: 'service_radius_km', type: 'smallint', default: 10 }) serviceRadiusKm: number;
  @Column({ length: 100 }) city: string;
  @Column({ type: 'char', length: 2 }) state: string;
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true }) latitude: number | null;
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true }) longitude: number | null;

  // ── Aprovação ──────────────────────────────────────────────────────────────
  @Column({ name: 'approval_status', type: 'enum', enum: ApprovalStatus, default: ApprovalStatus.PENDING }) approvalStatus: ApprovalStatus;
  @Column({ name: 'approved_at', nullable: true }) approvedAt: Date | null;
  @Column({ name: 'approved_by', nullable: true }) approvedBy: string | null;

  // ── Avaliações ─────────────────────────────────────────────────────────────
  @Column({ name: 'avg_rating', type: 'decimal', precision: 3, scale: 2, default: 0 }) avgRating: number;
  @Column({ name: 'total_services', default: 0 }) totalServices: number;

  // ── Stripe Connect (para split automático via Stripe) ──────────────────────
  /** ID da conta conectada no Stripe — preenchida após onboarding do profissional */
  @Column({ name: 'stripe_account_id', nullable: true, length: 100 }) stripeAccountId: string | null;

  // ── PIX manual ─────────────────────────────────────────────────────────────
  /** Chave PIX do profissional para recebimento direto */
  @Column({ name: 'pix_key', nullable: true, length: 255 }) pixKey: string | null;
  @Column({ name: 'pix_key_type', type: 'enum', enum: PixKeyType, nullable: true }) pixKeyType: PixKeyType | null;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
