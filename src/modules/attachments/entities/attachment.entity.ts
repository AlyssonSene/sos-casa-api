import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'uploaded_by' }) uploadedBy: string;
  @Column({ name: 'entity_type', length: 30 }) entityType: string;
  @Column({ name: 'entity_id' }) entityId: string;
  @Column({ length: 30 }) type: string;
  @Column({ type: 'text' }) url: string;
  @Column({ nullable: true, length: 255 }) filename: string | null;
  @Column({ name: 'size_bytes', nullable: true }) sizeBytes: number | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
