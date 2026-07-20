import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BlogRevalidateService {
  private readonly logger = new Logger(BlogRevalidateService.name);

  constructor(private readonly config: ConfigService) {}

  async notify(slug: string): Promise<void> {
    const url = this.config.get<string>('BLOG_REVALIDATE_URL');
    if (!url) return;

    const secret = this.config.get<string>('BLOG_REVALIDATE_SECRET');
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(secret ? { authorization: `Bearer ${secret}` } : {}),
          },
          body: JSON.stringify({ slug, languages: ['ru', 'kz'], published: true }),
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return;
      } catch (error) {
        if (attempt === 3) {
          this.logger.warn(
            `Post "${slug}" was published, but revalidation webhook failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        } else {
          await new Promise((resolve) => setTimeout(resolve, attempt * 500));
        }
      }
    }
  }
}
