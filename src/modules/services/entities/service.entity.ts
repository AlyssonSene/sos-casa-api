import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Category } from '../../categories/entities/category.entity'

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn('uuid') id: string
  @ManyToOne(() => Category) @JoinColumn({ name: 'category_id' }) category: Category
  @Column({ name: 'category_id' }) categoryId: string
  @Column({ length: 150 }) name: string
  @Column({ nullable: true, type: 'text' }) description: string | null
  @Column({ name: 'is_price_variable', default: false }) isPriceVariable: boolean
  @Column({ name: 'estimated_duration_minutes', type: 'smallint', nullable: true })
  estimatedDurationMinutes: number | null
  @Column({ name: 'is_active', default: true }) isActive: boolean
  @Column({ name: 'sort_order', default: 0 }) sortOrder: number
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date
}
