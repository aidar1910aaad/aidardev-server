import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBlogGenerationKey1721470000000 implements MigrationInterface {
  name = 'AddBlogGenerationKey1721470000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "generation_key" varchar(64)',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_blog_posts_generation_key" ON "blog_posts" ("generation_key") WHERE "generation_key" IS NOT NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_blog_posts_generation_key"');
    await queryRunner.query('ALTER TABLE "blog_posts" DROP COLUMN IF EXISTS "generation_key"');
  }
}
