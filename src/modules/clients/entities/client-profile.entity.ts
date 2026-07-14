import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import { User } from '../../users/entities/user.entity'

@Entity('client_profiles')
export class ClientProfile {
  @PrimaryGeneratedColumn('uuid') id: string
  @OneToOne(() => User) @JoinColumn({ name: 'user_id' }) user: User
  @Column({ name: 'user_id', unique: true }) userId: string
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date
}
