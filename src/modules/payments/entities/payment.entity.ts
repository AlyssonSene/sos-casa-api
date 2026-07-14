import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum PaymentMethod {
  STRIPE_CARD  = 'stripe_card',
  STRIPE_PIX   = 'stripe_pix',
  MANUAL_PIX   = 'manual_pix',
}

export enum PaymentStatus {
  PENDING              = 'pending',
  PROCESSING           = 'processing',
  HELD                 = 'held',              // Stripe: em escrow | Manual PIX: comprovante enviado, aguardando profissional
  RELEASED             = 'released',          // Stripe: escrow liberado | Manual PIX: profissional confirmou
  FAILED               = 'failed',
  REFUNDED             = 'refunded',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'request_id', unique: true }) requestId: string;

  // ── Método e status ────────────────────────────────────────────────────────
  @Column({ type: 'enum', enum: PaymentMethod }) method: PaymentMethod;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) amount: number;
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING }) status: PaymentStatus;

  // ── Stripe (stripe_card / stripe_pix) ─────────────────────────────────────
  @Column({ name: 'stripe_payment_intent_id', type: 'varchar', nullable: true, length: 100 }) stripePaymentIntentId: string | null;
  @Column({ name: 'stripe_client_secret', nullable: true, type: 'text' }) stripeClientSecret: string | null;
  @Column({ name: 'stripe_charge_id', type: 'varchar', nullable: true, length: 100 }) stripeChargeId: string | null;

  // ── PIX manual ────────────────────────────────────────────────────────────
  /** Snapshot da chave PIX do profissional no momento do pagamento */
  @Column({ name: 'manual_pix_key', type: 'varchar', nullable: true, length: 255 }) manualPixKey: string | null;
  @Column({ name: 'manual_pix_key_type', type: 'varchar', nullable: true, length: 20 }) manualPixKeyType: string | null;
  /** UUID do attachment com o comprovante enviado pelo cliente */
  @Column({ name: 'receipt_attachment_id', type: 'uuid', nullable: true }) receiptAttachmentId: string | null;
  /** Quando o profissional confirmou o recebimento */
  @Column({ name: 'professional_confirmed_at', type: 'timestamp', nullable: true }) professionalConfirmedAt: Date | null;

  // ── Timestamps financeiros ─────────────────────────────────────────────────
  @Column({ name: 'paid_at', type: 'timestamp', nullable: true }) paidAt: Date | null;
  @Column({ name: 'held_at', type: 'timestamp', nullable: true }) heldAt: Date | null;
  @Column({ name: 'released_at', type: 'timestamp', nullable: true }) releasedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
