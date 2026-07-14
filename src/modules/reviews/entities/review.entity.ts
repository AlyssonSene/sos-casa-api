import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid') id: string
  @Column({ name: 'request_id', unique: true }) requestId: string
  @Column({ name: 'client_id' }) clientId: string
  @Column({ name: 'professional_id' }) professionalId: string
  @Column({ type: 'smallint' }) rating: number
  @Column({ nullable: true, type: 'text' }) comment: string | null
  @Column({ type: 'simple-array', nullable: true }) tags: string[] | null
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date
}
