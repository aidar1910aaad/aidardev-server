import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AddBlogGenerationKey1721470000000 } from './migrations/1721470000000-AddBlogGenerationKey';

const url =
  process.env.DATABASE_URL ||
  process.env.DATABASE_PUBLIC_URL ||
  process.env.POSTGRES_URL;

if (!url) throw new Error('DATABASE_URL is required to run migrations');

export default new DataSource({
  type: 'postgres',
  url,
  ssl: { rejectUnauthorized: false },
  migrations: [AddBlogGenerationKey1721470000000],
});
