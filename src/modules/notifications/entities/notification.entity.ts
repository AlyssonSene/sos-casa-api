import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid') id: string
  @Column({ name: 'user_id' }) userId: string
  @Column({ length: 50 }) type: string
  @Column({ length: 150 }) title: string
  @Column({ type: 'text' }) body: string
  @Column({ type: 'jsonb', nullable: true }) data: Record<string, unknown> | null
  @Column({ name: 'is_read', default: false }) isRead: boolean
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date
}
