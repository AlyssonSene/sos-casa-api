import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true, length: 100 }) name: string;
  @Column({ nullable: true, length: 100 }) icon: string | null;
  @Column({ name: 'is_active', default: true }) isActive: boolean;
  @Column({ name: 'sort_order', default: 0 }) sortOrder: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
