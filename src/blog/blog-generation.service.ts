import {
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlogService } from './blog.service';
import { BlogQualityService } from './blog-quality.service';
import { BlogRevalidateService } from './blog-revalidate.service';
import { GenerationLimiterService } from './generation-limiter.service';
import { OpenAiBlogService } from './openai-blog.service';
import { TopicPlannerService } from './topic-planner.service';
import { GeneratedBlogPost } from './blog-generation.types';

@Injectable()
export class BlogGenerationService {
  constructor(
    private readonly blogService: BlogService,
    private readonly openAi: OpenAiBlogService,
    private readonly planner: TopicPlannerService,
    private readonly quality: BlogQualityService,
    private readonly limiter: GenerationLimiterService,
    private readonly revalidate: BlogRevalidateService,
    private readonly config: ConfigService,
  ) {}

  async generate(options: {
    topic?: string;
    save?: boolean;
    generationKey?: string;
    seed?: string;
  }) {
    return this.limiter.run(async () => {
      const existingPosts = await this.blogService.getExistingPostsList('ru');
      const cluster = this.planner.plan(existingPosts, options.seed);
      const maximumAttempts = this.getAttempts();
      let errors: string[] = [];
      let generated: GeneratedBlogPost | undefined;

      for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
        try {
          generated = this.quality.normalize(
            await this.openAi.generate(
              cluster,
              existingPosts.map((post) => post.slug),
              options.topic,
              errors,
            ),
            cluster,
          );
          const report = this.quality.validate(generated, cluster, existingPosts);
          if (report.passed) break;
          errors = report.errors;
          generated = undefined;
        } catch (error) {
          errors = [
            `generation attempt ${attempt} failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ];
          generated = undefined;
        }
      }

      if (!generated) {
        throw new UnprocessableEntityException({
          message: 'Generated post failed the quality gate and was not saved',
          errors,
        });
      }

      if (!options.save) {
        return { post: generated, cluster: cluster.id, qualityGate: 'passed', saved: false };
      }

      generated.published = true;
      const saved = await this.blogService.createPost(generated, options.generationKey);
      await this.revalidate.notify(saved.slug);
      return { post: saved, cluster: cluster.id, qualityGate: 'passed', saved: true };
    });
  }

  async generateCron(slot: number) {
    if (!Number.isInteger(slot) || slot < 1 || slot > 3) {
      throw new UnprocessableEntityException('slot must be an integer from 1 to 3');
    }
    const date = new Date().toISOString().slice(0, 10);
    const generationKey = `${date}:slot-${slot}`;
    const existing = await this.blogService.getPostByGenerationKey(generationKey);
    if (existing) {
      return { post: existing, generationKey, idempotent: true, qualityGate: 'passed', saved: true };
    }
    try {
      const result = await this.generate({
        save: true,
        generationKey,
        seed: generationKey,
      });
      return { ...result, generationKey, idempotent: false };
    } catch (error) {
      // The unique generation key is the cross-instance race barrier.
      const racedPost = await this.blogService.getPostByGenerationKey(generationKey);
      if (racedPost) {
        return {
          post: racedPost,
          generationKey,
          idempotent: true,
          qualityGate: 'passed',
          saved: true,
        };
      }
      throw error;
    }
  }

  private getAttempts(): number {
    const configured = Number(this.config.get<string>('BLOG_GENERATE_RETRIES'));
    return Number.isInteger(configured) && configured >= 1 && configured <= 5 ? configured : 3;
  }
}
