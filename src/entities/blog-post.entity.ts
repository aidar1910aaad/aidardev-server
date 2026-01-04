import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Entity для блог-постов
 * Поддерживает мультиязычность (ru, en, kz)
 */
@Entity('blog_posts')
export class BlogPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  slug: string;

  // Мультиязычные поля - храним как JSON
  @Column({ type: 'jsonb' })
  title: {
    ru: string;
    en: string;
    kz: string;
  };

  @Column({ type: 'jsonb' })
  description: {
    ru: string;
    en: string;
    kz: string;
  };

  @Column({ type: 'jsonb' })
  excerpt: {
    ru: string;
    en: string;
    kz: string;
  };

  @Column({ type: 'jsonb' })
  category: {
    ru: string;
    en: string;
    kz: string;
  };

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'jsonb', nullable: true })
  keywords: {
    ru: string[];
    en: string[];
    kz: string[];
  } | null;

  @Column({ type: 'integer', default: 5 })
  readingTime: number;

  @Column({ type: 'boolean', default: false })
  @Index()
  published: boolean;

  // Полный контент (HTML) - опционально, можно загружать отдельно
  @Column({ type: 'jsonb', nullable: true })
  content: {
    ru: string;
    en: string;
    kz: string;
  } | null;
}

