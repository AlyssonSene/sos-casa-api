import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import { User } from '../../users/entities/user.entity'

@Entity('addresses')
export class Address {
  @PrimaryGeneratedColumn('uuid') id: string
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'user_id' }) user: User
  @Column({ name: 'user_id' }) userId: string
  @Column({ type: 'varchar', nullable: true, length: 50 }) label: string | null
  @Column({ length: 255 }) street: string
  @Column({ length: 20 }) number: string
  @Column({ type: 'varchar', nullable: true, length: 100 }) complement: string | null
  @Column({ length: 100 }) neighborhood: string
  @Column({ length: 100 }) city: string
  @Column({ type: 'char', length: 2 }) state: string
  @Column({ name: 'zip_code', length: 10 }) zipCode: string
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true }) latitude: number | null
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true }) longitude: number | null
  @Column({ name: 'is_default', default: false }) isDefault: boolean
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date
}
