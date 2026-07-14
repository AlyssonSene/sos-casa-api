import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum PaymentMethod { PIX = 'pix', CREDIT_CARD = 'credit_card', DEBIT_CARD = 'debit_card' }
export enum PaymentStatus { PENDING = 'pending', PROCESSING = 'processing', PAID = 'paid', HELD = 'held', RELEASED = 'released', FAILED = 'failed', REFUNDED = 'refunded' }

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'request_id', unique: true }) requestId: string;
  @Column({ default: 'pagarme', length: 20 }) gateway: string;
  @Column({ name: 'pagarme_order_id', nullable: true, length: 100 }) pagarmeOrderId: string | null;
  @Column({ name: 'pagarme_charge_id', nullable: true, length: 100 }) pagarmeChargeId: string | null;
  @Column({ type: 'enum', enum: PaymentMethod }) method: PaymentMethod;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) amount: number;
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING }) status: PaymentStatus;
  @Column({ name: 'pix_code', nullable: true, type: 'text' }) pixCode: string | null;
  @Column({ name: 'pix_qr_code_url', nullable: true, type: 'text' }) pixQrCodeUrl: string | null;
  @Column({ name: 'pix_expires_at', nullable: true }) pixExpiresAt: Date | null;
  @Column({ name: 'paid_at', nullable: true }) paidAt: Date | null;
  @Column({ name: 'held_at', nullable: true }) heldAt: Date | null;
  @Column({ name: 'released_at', nullable: true }) releasedAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
