import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BalanceCheckStatus {
  SUFFICIENT = 'SUFFICIENT',
  INSUFFICIENT = 'INSUFFICIENT',
  ERROR = 'ERROR',
}

@Entity('balance_checks')
export class BalanceCheck {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  walletAddress: string;

  @Column({ type: 'varchar', length: 50 })
  chain: string;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  requestedAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  actualBalance: number;

  @Column({ type: 'varchar', enum: BalanceCheckStatus })
  status: BalanceCheckStatus;

  @Column({ type: 'varchar', length: 50 })
  provider: string; // STRIPE, COINBASE, etc.

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'text', nullable: true })
  metadata: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
