import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum TransactionStatus { PENDING = 'pending', PROCESSING = 'processing', TRANSFERRED = 'transferred', FAILED = 'failed' }

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'payment_id', unique: true }) paymentId: string;
  @Column({ name: 'professional_id' }) professionalId: string;
  @Column({ name: 'gross_amount', type: 'decimal', precision: 10, scale: 2 }) grossAmount: number;
  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 2 }) commissionRate: number;
  @Column({ name: 'commission_amount', type: 'decimal', precision: 10, scale: 2 }) commissionAmount: number;
  @Column({ name: 'net_amount', type: 'decimal', precision: 10, scale: 2 }) netAmount: number;
  @Column({ name: 'pagarme_transfer_id', nullable: true, length: 100 }) pagarmeTransferId: string | null;
  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING }) status: TransactionStatus;
  @Column({ name: 'transferred_at', nullable: true }) transferredAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
