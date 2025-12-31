import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ChatMessage } from './chat-message.entity';

export enum ChatStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

@Entity('chats')
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  projectType?: string;

  @Column({ type: 'varchar', length: 10, default: 'ru' })
  language: string;

  @Column({ type: 'integer', default: 0 })
  messageCount: number;

  @Column({ type: 'boolean', default: false })
  hasPriceObjection: boolean;

  @Column({ type: 'boolean', default: false })
  hasNegativeResponse: boolean;

  @Column({ type: 'boolean', default: false })
  hasName: boolean;

  @Column({ type: 'boolean', default: false })
  askedForContact: boolean;

  @Column({ type: 'boolean', default: false })
  hasUncertainty: boolean;

  @Column({ type: 'integer', default: 0 })
  uncertaintyCount: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: ChatStatus.NEW,
  })
  status: ChatStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @OneToMany(() => ChatMessage, (message) => message.chat, {
    cascade: true,
    eager: false,
  })
  messages: ChatMessage[];
}

