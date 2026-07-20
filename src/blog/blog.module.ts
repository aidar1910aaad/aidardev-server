import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { BlogPost } from '../entities/blog-post.entity';
import { OpenAiBlogService } from './openai-blog.service';
import { TopicPlannerService } from './topic-planner.service';
import { BlogQualityService } from './blog-quality.service';
import { BlogApiSecretGuard } from './blog-api-secret.guard';
import { GenerationLimiterService } from './generation-limiter.service';
import { BlogRevalidateService } from './blog-revalidate.service';
import { BlogGenerationService } from './blog-generation.service';

@Module({
  imports: [TypeOrmModule.forFeature([BlogPost])],
  controllers: [BlogController],
  providers: [
    BlogService,
    OpenAiBlogService,
    TopicPlannerService,
    BlogQualityService,
    BlogApiSecretGuard,
    GenerationLimiterService,
    BlogRevalidateService,
    BlogGenerationService,
  ],
  exports: [BlogService],
})
export class BlogModule {}

