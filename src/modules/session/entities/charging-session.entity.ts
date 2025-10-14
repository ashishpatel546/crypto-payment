import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PaymentLink } from './payment-link.entity';

export enum ChargingSessionStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('charging_sessions')
export class ChargingSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  chargerId: string;

  @Column({ type: 'varchar', enum: ChargingSessionStatus })
  status: ChargingSessionStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  finalCost: number;

  @Column({ type: 'text', nullable: true })
  metadata: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => PaymentLink, (paymentLink) => paymentLink.session)
  paymentLinks: PaymentLink[];
}
